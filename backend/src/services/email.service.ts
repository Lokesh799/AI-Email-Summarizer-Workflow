import { db } from '../db/index.js';
import { emailSummaries, type EmailSummary, type NewEmailSummary } from '../db/schema.js';
import { eq, desc } from 'drizzle-orm';
import { openAIService, type EmailData } from './openai.service.js';
import { pdfService } from './pdf.service.js';

export class EmailService {
  /**
   * Creates a summary for a single email
   */
  async createSummary(email: EmailData): Promise<EmailSummary> {
    const summaryData = await openAIService.summarizeEmail(email);

    // Extract invoice data if category is Invoice
    let invoiceData = null;
    if (summaryData.category === 'Invoice') {
      invoiceData = await pdfService.extractInvoiceData(email.body);
    }

    const newSummary: NewEmailSummary = {
      sender: email.sender,
      subject: email.subject,
      body: email.body,
      summary: summaryData.summary,
      category: summaryData.category,
      keywords: summaryData.keywords,
      invoiceData: invoiceData as unknown as Record<string, unknown> | null,
    };

    const [result] = await db.insert(emailSummaries).values(newSummary).returning();
    return result;
  }

  /**
   * Creates summaries for multiple emails in batch
   */
  async batchCreateSummaries(emails: EmailData[]): Promise<EmailSummary[]> {
    if (emails.length === 0) {
      return [];
    }

    const summaries = await openAIService.batchSummarizeEmails(emails);
    const results: EmailSummary[] = [];
    const summariesToInsert: NewEmailSummary[] = [];

    // Prepare summaries for database insertion
    for (let i = 0; i < emails.length && i < summaries.length; i++) {
      const email = emails[i];
      const summaryData = summaries[i];

      if (!summaryData) {
        continue;
      }

      // Extract invoice data if category is Invoice
      let invoiceData = null;
      if (summaryData.category === 'Invoice') {
        invoiceData = await pdfService.extractInvoiceData(email.body);
      }

      summariesToInsert.push({
        sender: email.sender,
        subject: email.subject,
        body: email.body,
        summary: summaryData.summary,
        category: summaryData.category,
        keywords: summaryData.keywords,
        invoiceData: invoiceData as unknown as Record<string, unknown> | null,
      });
    }

    // Batch insert for better performance
    if (summariesToInsert.length > 0) {
      const inserted = await db.insert(emailSummaries).values(summariesToInsert).returning();
      results.push(...inserted);
    }

    return results;
  }

  /**
   * Gets all summaries with optional category filter
   */
  async getAllSummaries(category?: string): Promise<EmailSummary[]> {
    if (category) {
      return db
        .select()
        .from(emailSummaries)
        .where(eq(emailSummaries.category, category))
        .orderBy(desc(emailSummaries.createdAt));
    }

    return db.select().from(emailSummaries).orderBy(desc(emailSummaries.createdAt));
  }

  /**
   * Gets a single summary by ID
   */
  async getSummaryById(id: string): Promise<EmailSummary | null> {
    const [result] = await db.select().from(emailSummaries).where(eq(emailSummaries.id, id));
    return result || null;
  }

  /**
   * Re-summarizes an existing email
   */
  async reSummarize(id: string): Promise<EmailSummary> {
    const existing = await this.getSummaryById(id);
    if (!existing) {
      throw new Error('Email summary not found');
    }

    const emailData: EmailData = {
      sender: existing.sender,
      subject: existing.subject,
      body: existing.body,
    };

    const summaryData = await openAIService.summarizeEmail(emailData);

    // Re-extract invoice data if category changed to Invoice
    let invoiceData = existing.invoiceData;
    if (summaryData.category === 'Invoice' && !invoiceData) {
      invoiceData = await pdfService.extractInvoiceData(existing.body);
    } else if (summaryData.category !== 'Invoice') {
      invoiceData = null; // Clear invoice data if category changed away from Invoice
    }

    const [updated] = await db
      .update(emailSummaries)
      .set({
        summary: summaryData.summary,
        category: summaryData.category,
        keywords: summaryData.keywords,
        invoiceData: invoiceData as unknown as Record<string, unknown> | null,
        updatedAt: new Date(),
      })
      .where(eq(emailSummaries.id, id))
      .returning();

    return updated;
  }

  /**
   * Deletes a summary by ID
   */
  async deleteSummary(id: string): Promise<boolean> {
    await db.delete(emailSummaries).where(eq(emailSummaries.id, id));
    return true;
  }
}

export const emailService = new EmailService();
