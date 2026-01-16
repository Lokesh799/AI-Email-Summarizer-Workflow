import OpenAI from 'openai';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
// pdf-parse v2.x uses PDFParse class
let PDFParseClass: any;

try {
  const pdfParseModule = require('pdf-parse');
  
  // pdf-parse v2.x exports PDFParse as a class
  if (pdfParseModule.PDFParse) {
    PDFParseClass = pdfParseModule.PDFParse;
  } else {
    throw new Error('PDFParse class not found in pdf-parse module');
  }
} catch (error) {
  console.error('[PDF]  Failed to load pdf-parse module:', error);
  throw new Error(`Failed to load pdf-parse: ${error instanceof Error ? error.message : 'Unknown error'}`);
}

if (!process.env.OPENAI_API_KEY) {
  throw new Error('OPENAI_API_KEY environment variable is not set');
}

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export interface InvoiceItem {
  item: string;
  price: number;
  quantity?: number;
  total?: number;
}

export interface InvoiceData {
  items: InvoiceItem[];
  total: number;
  currency: string;
}

const FINANCIAL_DOCUMENT_KEYWORDS = [
  'invoice',
  'payment',
  'amount',
  'total',
  'due',
  'bill',
  '$',
  'USD',
  'EUR',
  'RS.',
  'INR',
  'item',
  'quantity',
  'price',
  'earnings',
  'deductions',
  'salary',
  'payslip',
  'basic',
  'hra',
  'allowance',
  'tax',
  'net',
  'payable',
  'gross',
];

const MAX_CONTENT_LENGTH = 8000; // Increased for complex documents like payslips

/**
 * Service for extracting invoice data from emails and PDFs
 */
export class PDFService {
  /**
   * Extracts invoice data from email body text or PDF buffer
   */
  async extractInvoiceData(emailBody: string, pdfBuffer?: Buffer): Promise<InvoiceData | null> {
    try {
      let contentToExtract = emailBody;
      let sourceType = 'email body';

      // If PDF buffer is provided, extract text from PDF
      if (pdfBuffer) {
        try {
          const extractedText = await this.extractTextFromPDF(pdfBuffer);
          contentToExtract = extractedText;
          sourceType = 'PDF attachment';
        } catch (error) {
          // Fall back to email body if PDF extraction fails
          console.error('[PDF] Failed to extract text from PDF:', error);
          // Continue with email body
        }
      }

      // If PDF was provided and we successfully extracted text, ALWAYS proceed with extraction
      // Don't check keywords - the PDF content is what matters
      if (pdfBuffer && sourceType === 'PDF attachment') {
        if (contentToExtract.length < 50) {
          console.error('[PDF] PDF text extraction returned very little content. PDF might be image-based, corrupted, or empty.');
          return null;
        }
        // Proceed directly to extraction - don't check keywords for PDFs
      } else {
        // For email body only (no PDF), check for financial keywords
        const hasFinancialContent = FINANCIAL_DOCUMENT_KEYWORDS.some((keyword) =>
          contentToExtract.toLowerCase().includes(keyword.toLowerCase())
        );
        
        if (!hasFinancialContent) {
          return null;
        }
      }

      // Detect document type for better extraction
      const contentLower = contentToExtract.toLowerCase();
      const isPayslip = contentLower.includes('payslip') || contentLower.includes('salary') || 
                       contentLower.includes('earnings') || contentLower.includes('deductions') ||
                       contentLower.includes('basic') || contentLower.includes('hra');
      
      const prompt = `You are extracting financial data from a ${isPayslip ? 'PAYSLIP' : 'financial document'}. 
${isPayslip ? 'This is a PAYSLIP with Earnings and Deductions sections.' : 'This could be an invoice, bill, receipt, or financial document.'}

CRITICAL: Extract EVERY financial item and amount you can find. Be thorough and accurate.

Return a JSON object with this EXACT structure:
{
  "items": [
    {"item": "item name", "price": 100.00, "quantity": 1, "total": 100.00}
  ],
  "total": 100.00,
  "currency": "USD"
}

${isPayslip ? `
FOR PAYSLIPS - Extract the following:
1. EARNINGS SECTION - Extract ALL items you see:
   - Basic (or Basic Salary) - extract the exact amount
   - HRA (House Rent Allowance) - extract the exact amount
   - Special Allowance - extract the exact amount
   - Other Allowance - extract the exact amount
   - Any other earnings, allowances, or income items
   Each earnings item should be a separate entry in the "items" array

2. DEDUCTIONS SECTION - Extract ALL items you see:
   - Professional Tax - extract the exact amount
   - PF (Provident Fund) or P.F. - extract the exact amount
   - Leave deductions - extract the exact amount
   - Any other deductions, taxes, or deductions
   Each deduction item should be a separate entry in the "items" array

3. FINAL AMOUNTS - Look for these labels:
   - "Gross Earnings" or "Total Earnings" - this is the sum of all earnings
   - "Gross Deductions" or "Total Deductions" - this is the sum of all deductions
   - "Net Payable" or "Take Home Salary" or "Net Pay" - THIS is the final "total" value to return

CRITICAL INSTRUCTIONS for payslips:
- Extract EVERY item from BOTH Earnings AND Deductions sections
- For each item: "item" = the label (e.g., "Basic", "HRA", "Professional Tax")
- For each item: "price" = the amount shown (remove commas: 29,167 → 29167)
- For each item: "total" = same as price (since payslips don't have quantities)
- For each item: "quantity" = 1
- The final "total" in your response = "Net Payable" or "Take Home Salary" amount
- Currency: If you see "RS." or "INR" anywhere, use "INR", otherwise use "USD"
- Extract numbers EXACTLY - if document shows "58,333" extract as 58333 (remove comma)
- DO NOT skip any items - extract ALL earnings and ALL deductions
` : `
FOR INVOICES/BILLS - Extract:
- All line items with descriptions
- Quantities (if mentioned)
- Unit prices
- Line totals
- Grand total
- Currency
`}

GENERAL RULES:
- Extract ALL items from ALL sections (Earnings, Deductions, Items, etc.)
- Use EXACT numeric values - remove commas when converting (58,333 → 58333)
- For each item: "price" = unit price, "total" = line total (may be same)
- "quantity" = 1 if not specified
- "total" in response = final amount (Net Payable for payslips, Grand Total for invoices)
- Currency: Look for RS., INR, USD, EUR, GBP, $, €, £ symbols

${sourceType === 'PDF attachment' ? 'PDF Document Content:' : 'Email Body Content:'}
${contentToExtract.substring(0, MAX_CONTENT_LENGTH)}

CRITICAL: Extract EVERY financial detail. If you see multiple sections, extract from ALL of them.
Return valid JSON only, no markdown, no explanations.`;

      const completion = await openai.chat.completions.create({
        model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content:
              'You are a financial document extraction assistant. Extract all financial items, amounts, and totals from invoices, payslips, bills, receipts, or any financial documents. Be thorough and extract every financial detail you can find. Return valid JSON only.',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        response_format: { type: 'json_object' },
        temperature: 0.0, // Zero temperature for maximum accuracy
        max_tokens: 2000, // Increased tokens for complex documents like payslips with many items
      });

      const content = completion.choices[0]?.message?.content;
      if (!content) {
        console.error('[PDF] No content returned from OpenAI');
        return null;
      }

      let parsed: unknown;
      try {
        parsed = JSON.parse(content);
      } catch (parseError) {
        console.error('[PDF] Failed to parse OpenAI response as JSON:', parseError);
        console.error('[PDF] Response content:', content);
        return null;
      }

      // Validate structure
      if (
        parsed === null ||
        typeof parsed !== 'object' ||
        !('items' in parsed) ||
        !Array.isArray((parsed as { items: unknown }).items)
      ) {
        return null;
      }

      const invoiceData = parsed as { items: InvoiceItem[]; total: number; currency: string };

      // Helper function to parse numeric values (handles strings with commas)
      const parseAmount = (value: number | string | undefined): number => {
        if (typeof value === 'number') return value;
        if (typeof value === 'string') {
          // Remove commas and parse
          const cleaned = value.replace(/,/g, '').trim();
          const parsed = parseFloat(cleaned);
          return isNaN(parsed) ? 0 : parsed;
        }
        return 0;
      };

      // Validate and clean the extracted data
      const cleanedItems = (invoiceData.items || []).filter((item) => {
        // Ensure item has at least a name and some amount
        return item.item && item.item.trim() && (item.price || item.total);
      }).map((item) => {
        const price = parseAmount(item.price || item.total);
        const total = parseAmount(item.total) || price * (item.quantity || 1);
        
        return {
          item: item.item.trim(),
          price: price,
          quantity: item.quantity || 1,
          total: total,
        };
      });

      // Calculate total - for payslips, it's Earnings - Deductions, not sum of all items
      let finalTotal = parseAmount(invoiceData.total);
      
      if (finalTotal === 0 && cleanedItems.length > 0) {
        // Check if this is a payslip by looking for earnings/deductions keywords
        const itemNames = cleanedItems.map(i => i.item.toLowerCase()).join(' ');
        const isPayslip = itemNames.includes('basic') || itemNames.includes('hra') || 
                         itemNames.includes('earnings') || itemNames.includes('deductions') ||
                         itemNames.includes('allowance') || itemNames.includes('professional tax') ||
                         itemNames.includes('pf') || itemNames.includes('provident fund');
        
        if (isPayslip) {
          // For payslips: Net Payable = Earnings - Deductions
          // Identify deductions (usually: tax, pf, deductions, etc.)
          const deductionKeywords = ['tax', 'pf', 'deduction', 'professional', 'provident', 'leave'];
          const earnings = cleanedItems
            .filter(item => !deductionKeywords.some(keyword => item.item.toLowerCase().includes(keyword)))
            .reduce((sum, item) => sum + (item.total || 0), 0);
          const deductions = cleanedItems
            .filter(item => deductionKeywords.some(keyword => item.item.toLowerCase().includes(keyword)))
            .reduce((sum, item) => sum + (item.total || 0), 0);
          
          finalTotal = earnings - deductions;
        } else {
          // For invoices/bills: sum all item totals
          finalTotal = cleanedItems.reduce((sum, item) => sum + (item.total || 0), 0);
        }
      } else if (finalTotal > 0) {
        // Validate the provided total makes sense
        const sumOfItems = cleanedItems.reduce((sum, item) => sum + (item.total || 0), 0);
        const itemNames = cleanedItems.map(i => i.item.toLowerCase()).join(' ');
        const isPayslip = itemNames.includes('basic') || itemNames.includes('hra');
        
        if (isPayslip) {
          // For payslips, check if total is approximately earnings - deductions
          const deductionKeywords = ['tax', 'pf', 'deduction', 'professional', 'provident'];
          const earnings = cleanedItems
            .filter(item => !deductionKeywords.some(keyword => item.item.toLowerCase().includes(keyword)))
            .reduce((sum, item) => sum + (item.total || 0), 0);
          const deductions = cleanedItems
            .filter(item => deductionKeywords.some(keyword => item.item.toLowerCase().includes(keyword)))
            .reduce((sum, item) => sum + (item.total || 0), 0);
          const expectedTotal = earnings - deductions;
          
          // If provided total is way off, recalculate
          if (Math.abs(finalTotal - expectedTotal) > 100) {
            finalTotal = expectedTotal;
          }
        } else {
          // For invoices, check if total matches sum of items (within 1% tolerance)
          const tolerance = sumOfItems * 0.01;
          if (Math.abs(finalTotal - sumOfItems) > tolerance && sumOfItems > 0) {
            finalTotal = sumOfItems;
          }
        }
      }

      // Detect currency from content if not provided
      let currency = invoiceData.currency || 'USD';
      if (!currency || currency === 'USD') {
        const contentUpper = contentToExtract.toUpperCase();
        if (contentUpper.includes('RS.') || contentUpper.includes('INR') || contentUpper.includes('RUPEES')) {
          currency = 'INR';
        } else if (contentUpper.includes('EUR') || contentUpper.includes('€')) {
          currency = 'EUR';
        } else if (contentUpper.includes('GBP') || contentUpper.includes('£')) {
          currency = 'GBP';
        }
      }

      const result = {
        items: cleanedItems,
        total: finalTotal,
        currency: currency,
      };

      // If no items extracted but we had a PDF, log error
      if (cleanedItems.length === 0 && pdfBuffer) {
        console.error('[PDF] PDF provided but no items extracted. PDF might be image-based or contain no extractable financial data.');
      }

      return result;
    } catch (error) {
      console.error('[PDF] Error extracting invoice data:', error);
      return null;
    }
  }

  /**
   * Extracts text from PDF buffer using pdf-parse library
   */
  private async extractTextFromPDF(pdfBuffer: Buffer): Promise<string> {
    try {
      // pdf-parse v2.x API: Use PDFParse class
      const parser = new PDFParseClass({ data: pdfBuffer });
      const extractedText = await parser.getText();
      
      if (!extractedText || (typeof extractedText === 'string' && extractedText.trim().length === 0)) {
        throw new Error('PDF text extraction returned empty result. PDF might be image-based or corrupted.');
      }

      const text = typeof extractedText === 'string' ? extractedText : (extractedText as any)?.text || '';
      
      if (!text || text.trim().length === 0) {
        throw new Error('PDF text extraction returned empty result');
      }
      
      return text;
    } catch (error) {
      console.error('[PDF] Error extracting text from PDF:', error);
      throw new Error(
        `Failed to extract text from PDF: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }
}

export const pdfService = new PDFService();
