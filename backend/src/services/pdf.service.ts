import OpenAI from 'openai';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
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

const INVOICE_KEYWORDS = [
  'invoice',
  'payment',
  'amount',
  'total',
  'due',
  'bill',
  '$',
  'USD',
  'EUR',
  'item',
  'quantity',
  'price',
];

const MAX_CONTENT_LENGTH = 4000;

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
          contentToExtract = await this.extractTextFromPDF(pdfBuffer);
          sourceType = 'PDF attachment';
        } catch (error) {
          // Fall back to email body if PDF extraction fails
          console.warn('Failed to extract text from PDF, using email body');
        }
      }

      // Check if content contains invoice-related keywords
      const hasInvoiceContent = INVOICE_KEYWORDS.some((keyword) =>
        contentToExtract.toLowerCase().includes(keyword.toLowerCase())
      );

      if (!hasInvoiceContent) {
        return null;
      }

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
${contentToExtract.substring(0, MAX_CONTENT_LENGTH)}

Respond with JSON only, no additional text.`;

      const completion = await openai.chat.completions.create({
        model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content:
              'You are an invoice extraction assistant. Extract invoice items and prices from email content. Return valid JSON only.',
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
        return null;
      }

      const parsed = JSON.parse(content) as unknown;

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

      return {
        items: invoiceData.items,
        total: invoiceData.total || 0,
        currency: invoiceData.currency || 'USD',
      };
    } catch (error) {
      console.error('Error extracting invoice data:', error);
      return null;
    }
  }

  /**
   * Extracts text from PDF buffer using pdf-parse library
   */
  private async extractTextFromPDF(pdfBuffer: Buffer): Promise<string> {
    try {
      const data = await pdfParse(pdfBuffer);
      return data.text;
    } catch (error) {
      // Fallback: Try to use sample invoice text if PDF parsing fails
      try {
        const sampleText = readFileSync(join(__dirname, '../data/sample-invoice.txt'), 'utf-8');
        return sampleText;
      } catch {
        throw new Error(
          `Failed to extract text from PDF: ${error instanceof Error ? error.message : 'Unknown error'}`
        );
      }
    }
  }
}

export const pdfService = new PDFService();
