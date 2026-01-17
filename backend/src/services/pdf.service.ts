import OpenAI from 'openai';
import { createRequire } from 'module';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

// -----------------------------
// Setup
// -----------------------------
const require = createRequire(import.meta.url);
const pdfParse = require('pdf-parse');

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

if (!process.env.OPENAI_API_KEY) {
  throw new Error('OPENAI_API_KEY environment variable is not set');
}

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// -----------------------------
// Types
// -----------------------------
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

// -----------------------------
// Constants
// -----------------------------
const FINANCIAL_DOCUMENT_KEYWORDS = [
  'invoice',
  'payment',
  'amount',
  'total',
  'bill',
  'salary',
  'payslip',
  'earnings',
  'deductions',
  'basic',
  'hra',
  'tax',
  'net',
  'gross',
  'rs.',
  'inr',
  'usd',
];

const MAX_CONTENT_LENGTH = 8000;

// -----------------------------
// Service
// -----------------------------
export class PDFService {
  /**
   * Extract invoice or payslip data from email text or PDF
   */
  async extractInvoiceData(
    emailBody: string,
    pdfBuffer?: Buffer
  ): Promise<InvoiceData | null> {
    try {
      let content = emailBody;
      let source = 'email';

      // -----------------------------
      // PDF Extraction
      // -----------------------------
      if (pdfBuffer) {
        try {
          content = await this.extractTextFromPDF(pdfBuffer);
          source = 'pdf';
        } catch (err) {
          console.error('[PDF] Falling back to email body');
        }
      }

      if (!content || content.length < 30) return null;

      // -----------------------------
      // Keyword check (email only)
      // -----------------------------
      if (source === 'email') {
        const hasKeyword = FINANCIAL_DOCUMENT_KEYWORDS.some(k =>
          content.toLowerCase().includes(k)
        );
        if (!hasKeyword) return null;
      }

      const lower = content.toLowerCase();
      const isPayslip =
        lower.includes('payslip') ||
        lower.includes('salary') ||
        lower.includes('earnings') ||
        lower.includes('deductions');

      // -----------------------------
      // Prompt
      // -----------------------------
      const prompt = `
Extract financial data from this ${isPayslip ? 'PAYSLIP' : 'FINANCIAL DOCUMENT'}.

Return STRICT JSON ONLY in this format:
{
  "items": [
    { "item": "name", "price": 100, "quantity": 1, "total": 100 }
  ],
  "total": 100,
  "currency": "INR"
}

Rules:
- Extract ALL earnings and deductions if payslip
- Net Pay / Take Home = final total
- Remove commas from numbers
- Quantity = 1 if missing
- Currency: INR if Rs/INR found else USD

Content:
${content.substring(0, MAX_CONTENT_LENGTH)}
`;

      // -----------------------------
      // OpenAI Call
      // -----------------------------
      const response = await openai.chat.completions.create({
        model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content:
              'You extract structured financial data and return valid JSON only.',
          },
          { role: 'user', content: prompt },
        ],
        response_format: { type: 'json_object' },
        temperature: 0,
        max_tokens: 2000,
      });

      const raw = response.choices[0]?.message?.content;
      if (!raw) return null;

      const parsed = JSON.parse(raw) as InvoiceData;

      // -----------------------------
      // Cleanup & Validation
      // -----------------------------
      const parseAmount = (v: any): number =>
        typeof v === 'number'
          ? v
          : typeof v === 'string'
          ? parseFloat(v.replace(/,/g, '')) || 0
          : 0;

      const items: InvoiceItem[] = (parsed.items || [])
        .filter(i => i.item)
        .map(i => ({
          item: i.item.trim(),
          price: parseAmount(i.price || i.total),
          quantity: i.quantity || 1,
          total:
            parseAmount(i.total) ||
            parseAmount(i.price) * (i.quantity || 1),
        }));

      let total = parseAmount(parsed.total);

      if (!total && items.length) {
        const deductionKeys = ['tax', 'pf', 'deduction', 'professional'];
        const earnings = items
          .filter(i => !deductionKeys.some(k => i.item.toLowerCase().includes(k)))
          .reduce((s, i) => s + (i.total || 0), 0);

        const deductions = items
          .filter(i => deductionKeys.some(k => i.item.toLowerCase().includes(k)))
          .reduce((s, i) => s + (i.total || 0), 0);

        total = isPayslip ? earnings - deductions : earnings;
      }

      let currency = parsed.currency || 'USD';
      const upper = content.toUpperCase();
      if (upper.includes('RS') || upper.includes('INR')) currency = 'INR';
      if (upper.includes('€')) currency = 'EUR';
      if (upper.includes('£')) currency = 'GBP';

      return { items, total, currency };
    } catch (err) {
      console.error('[PDF] Extraction failed:', err);
      return null;
    }
  }

  /**
   * PDF text extraction (100% stable)
   */
  private async extractTextFromPDF(buffer: Buffer): Promise<string> {
    const result = await pdfParse(buffer);

    if (!result?.text || !result.text.trim()) {
      throw new Error('PDF has no readable text (scanned or empty)');
    }

    return result.text;
  }
}

// -----------------------------
// Export instance
// -----------------------------
export const pdfService = new PDFService();
