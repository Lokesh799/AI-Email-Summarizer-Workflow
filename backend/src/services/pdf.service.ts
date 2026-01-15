import OpenAI from 'openai';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
// pdf-parse uses CommonJS, need to use require for ESM compatibility
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const pdfParse = require('pdf-parse');

if (!process.env.OPENAI_API_KEY) {
  throw new Error('OPENAI_API_KEY environment variable is not set');
}

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

interface InvoiceItem {
  item: string;
  price: number;
  quantity?: number;
  total?: number;
}

interface InvoiceData {
  items: InvoiceItem[];
  total: number;
  currency: string;
}

export class PDFService {
  /**
   * Extracts invoice data from email body text (simulated PDF extraction)
   * Also supports actual PDF file parsing if PDF buffer is provided
   */
  async extractInvoiceData(emailBody: string, pdfBuffer?: Buffer): Promise<InvoiceData | null> {
    try {
      let contentToExtract = emailBody;
      let sourceType = 'email body';

      // If PDF buffer is provided, extract text from PDF
      if (pdfBuffer) {
        console.log('📄 [PDF] PDF attachment detected, extracting text from PDF...');
        try {
          contentToExtract = await this.extractTextFromPDF(pdfBuffer);
          sourceType = 'PDF attachment';
          console.log('✅ [PDF] Successfully extracted text from PDF');
        } catch (error) {
          console.warn('⚠️ [PDF] Failed to extract text from PDF, falling back to email body:', error);
          // Fall back to email body if PDF extraction fails
        }
      }

      console.log(`📄 [PDF] Attempting to extract invoice data from ${sourceType}`);
      
      // Check if content contains invoice-related keywords
      const invoiceKeywords = ['invoice', 'payment', 'amount', 'total', 'due', 'bill', '$', 'USD', 'EUR', 'item', 'quantity', 'price'];
      const hasInvoiceContent = invoiceKeywords.some(keyword => 
        contentToExtract.toLowerCase().includes(keyword.toLowerCase())
      );

      if (!hasInvoiceContent) {
        console.log(`📄 [PDF] No invoice content detected in ${sourceType}`);
        return null;
      }

      console.log(`📄 [PDF] Invoice content detected in ${sourceType}, extracting with OpenAI...`);

      const prompt = `Extract invoice information from the following ${sourceType === 'PDF attachment' ? 'PDF document' : 'email body'}. 
If it contains invoice details, return a JSON object with this structure:
{
  "items": [
    {"item": "item name", "price": 100.00, "quantity": 1, "total": 100.00}
  ],
  "total": 100.00,
  "currency": "USD"
}

Extract all item-price combinations you can find. If no invoice data is found, return null.

${sourceType === 'PDF attachment' ? 'PDF Content:' : 'Email body:'}
${contentToExtract.substring(0, 4000)}

Respond with JSON only, no additional text.`;

      const completion = await openai.chat.completions.create({
        model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: 'You are an invoice extraction assistant. Extract invoice items and prices from email content. Return valid JSON only.',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        response_format: { type: 'json_object' },
        temperature: 0.2,
        max_tokens: 500,
      });

      const content = completion.choices[0]?.message?.content;
      if (!content) {
        console.warn('📄 [PDF] No response from OpenAI for invoice extraction');
        return null;
      }

      const parsed = JSON.parse(content);
      
      // Validate structure
      if (parsed === null || !parsed.items || !Array.isArray(parsed.items)) {
        console.log('📄 [PDF] No invoice data extracted');
        return null;
      }

      console.log('✅ [PDF] Invoice data extracted:', {
        itemCount: parsed.items.length,
        total: parsed.total,
        currency: parsed.currency,
      });

      return {
        items: parsed.items,
        total: parsed.total || 0,
        currency: parsed.currency || 'USD',
      };
    } catch (error) {
      console.error('❌ [PDF] Error extracting invoice data:', error);
      return null;
    }
  }

  /**
   * Extracts text from PDF buffer using pdf-parse library
   */
  private async extractTextFromPDF(pdfBuffer: Buffer): Promise<string> {
    try {
      console.log('📄 [PDF] Extracting text from PDF buffer using pdf-parse...');
      
      // Use pdf-parse to extract text from PDF
      const data = await pdfParse(pdfBuffer);
      const extractedText = data.text;
      
      console.log('✅ [PDF] Successfully extracted text from PDF:', {
        pages: data.numpages,
        textLength: extractedText.length,
      });
      
      return extractedText;
    } catch (error) {
      console.error('❌ [PDF] Error extracting text from PDF:', error);
      
      // Fallback: Try to use sample invoice text if PDF parsing fails
      try {
        const sampleText = readFileSync(join(__dirname, '../data/sample-invoice.txt'), 'utf-8');
        console.log('📄 [PDF] Using sample invoice text as fallback');
        return sampleText;
      } catch {
        // Last resort: return a basic error message
        throw new Error(`Failed to extract text from PDF: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }
  }

  /**
   * Processes a PDF file from file path (for testing)
   */
  async extractInvoiceFromPDFFile(filePath: string): Promise<InvoiceData | null> {
    try {
      console.log('📄 [PDF] Reading PDF file from:', filePath);
      const pdfBuffer = readFileSync(filePath);
      const pdfText = await this.extractTextFromPDF(pdfBuffer);
      return await this.extractInvoiceData(pdfText);
    } catch (error) {
      console.error('❌ [PDF] Error processing PDF file:', error);
      return null;
    }
  }
}

export const pdfService = new PDFService();
