import { db } from '../db/index.js';
import { emailSummaries, type EmailSummary, type NewEmailSummary } from '../db/schema.js';
import { eq, desc } from 'drizzle-orm';
import { openAIService } from './openai.service.js';
import { pdfService } from './pdf.service.js';

interface EmailData {
  sender: string;
  subject: string;
  body: string;
}

export class EmailService {
  async createSummary(email: EmailData): Promise<EmailSummary> {
    console.log('💾 [EmailService] Creating summary for email:', email.sender);
    
    const summaryData = await openAIService.summarizeEmail(email);
    console.log('✅ [EmailService] Received summary data from OpenAI');

    // Extract invoice data if category is Invoice
    let invoiceData = null;
    if (summaryData.category === 'Invoice') {
      console.log('📄 [EmailService] Invoice detected, extracting invoice data...');
      invoiceData = await pdfService.extractInvoiceData(email.body);
      if (invoiceData) {
        console.log('✅ [EmailService] Invoice data extracted:', {
          itemsCount: invoiceData.items.length,
          total: invoiceData.total,
        });
      }
    }

    const newSummary: NewEmailSummary = {
      sender: email.sender,
      subject: email.subject,
      body: email.body,
      summary: summaryData.summary,
      category: summaryData.category,
      keywords: summaryData.keywords,
      invoiceData: invoiceData as any,
    };

    console.log('💾 [EmailService] Inserting into database...');
    const [result] = await db.insert(emailSummaries).values(newSummary).returning();
    console.log('✅ [EmailService] Summary saved to database with ID:', result.id);
    
    return result;
  }

  async batchCreateSummaries(emails: EmailData[]): Promise<EmailSummary[]> {
    console.log('💾 [EmailService] Starting batch create summaries...');
    console.log('📊 [EmailService] Total emails:', emails.length);
    
    const summaries = await openAIService.batchSummarizeEmails(emails);
    console.log('✅ [EmailService] Received summaries from OpenAI:', summaries.length);
    
    const results: EmailSummary[] = [];

    // Only insert summaries that were successfully created
    const summariesToInsert: NewEmailSummary[] = [];
    
    for (let i = 0; i < emails.length && i < summaries.length; i++) {
      const email = emails[i];
      const summaryData = summaries[i];

      if (summaryData) {
        console.log(`💾 [EmailService] Preparing summary ${i + 1} for database:`, {
          sender: email.sender,
          category: summaryData.category,
        });

        // Extract invoice data if category is Invoice
        let invoiceData = null;
        if (summaryData.category === 'Invoice') {
          console.log(`📄 [EmailService] Invoice detected for email ${i + 1}, extracting invoice data...`);
          invoiceData = await pdfService.extractInvoiceData(email.body);
          if (invoiceData) {
            console.log(`✅ [EmailService] Invoice data extracted for email ${i + 1}:`, {
              itemsCount: invoiceData.items.length,
              total: invoiceData.total,
            });
          }
        }
        
        summariesToInsert.push({
          sender: email.sender,
          subject: email.subject,
          body: email.body,
          summary: summaryData.summary,
          category: summaryData.category,
          keywords: summaryData.keywords,
          invoiceData: invoiceData as any,
        });
      } else {
        console.warn(`⚠️ [EmailService] No summary data for email ${i + 1}: ${email.sender}`);
      }
    }

    // Batch insert for better performance
    if (summariesToInsert.length > 0) {
      console.log(`💾 [EmailService] Inserting ${summariesToInsert.length} summaries into database...`);
      const inserted = await db.insert(emailSummaries).values(summariesToInsert).returning();
      results.push(...inserted);
      console.log('✅ [EmailService] Successfully saved', inserted.length, 'summaries to database');
    } else {
      console.warn('⚠️ [EmailService] No summaries to insert');
    }

    console.log('✅ [EmailService] Batch create complete. Total saved:', results.length);
    return results;
  }

  async getAllSummaries(category?: string): Promise<EmailSummary[]> {
    console.log('📖 [EmailService] Getting all summaries. Category filter:', category || 'All');
    
    if (category) {
      const summaries = await db
        .select()
        .from(emailSummaries)
        .where(eq(emailSummaries.category, category))
        .orderBy(desc(emailSummaries.createdAt));
      console.log(`✅ [EmailService] Found ${summaries.length} summaries for category: ${category}`);
      return summaries;
    }
    
    const summaries = await db.select().from(emailSummaries).orderBy(desc(emailSummaries.createdAt));
    console.log(`✅ [EmailService] Found ${summaries.length} total summaries`);
    return summaries;
  }

  async getSummaryById(id: string): Promise<EmailSummary | null> {
    console.log('📖 [EmailService] Getting summary by ID:', id);
    const [result] = await db.select().from(emailSummaries).where(eq(emailSummaries.id, id));
    
    if (result) {
      console.log('✅ [EmailService] Summary found:', { id: result.id, category: result.category });
    } else {
      console.log('⚠️ [EmailService] Summary not found for ID:', id);
    }
    
    return result || null;
  }

  async reSummarize(id: string): Promise<EmailSummary> {
    console.log('🔄 [EmailService] Re-summarizing email with ID:', id);
    
    const existing = await this.getSummaryById(id);
    if (!existing) {
      console.error('❌ [EmailService] Email summary not found for ID:', id);
      throw new Error('Email summary not found');
    }

    console.log('📧 [EmailService] Original email data:', {
      sender: existing.sender,
      subject: existing.subject,
      originalCategory: existing.category,
    });

    const emailData = {
      sender: existing.sender,
      subject: existing.subject,
      body: existing.body,
    };

    console.log('🤖 [EmailService] Calling OpenAI for re-summarization...');
    const summaryData = await openAIService.summarizeEmail(emailData);
    console.log('✅ [EmailService] Received new summary data:', {
      newCategory: summaryData.category,
      summaryLength: summaryData.summary.length,
    });

    // Re-extract invoice data if category changed to Invoice
    let invoiceData = existing.invoiceData;
    if (summaryData.category === 'Invoice' && !invoiceData) {
      console.log('📄 [EmailService] Category changed to Invoice, extracting invoice data...');
      invoiceData = await pdfService.extractInvoiceData(existing.body);
    } else if (summaryData.category !== 'Invoice') {
      invoiceData = null; // Clear invoice data if category changed away from Invoice
    }

    console.log('💾 [EmailService] Updating database...');
    const [updated] = await db
      .update(emailSummaries)
      .set({
        summary: summaryData.summary,
        category: summaryData.category,
        keywords: summaryData.keywords,
        invoiceData: invoiceData as any,
        updatedAt: new Date(),
      })
      .where(eq(emailSummaries.id, id))
      .returning();

    console.log('✅ [EmailService] Re-summarization complete. Updated ID:', updated.id);
    return updated;
  }

  async deleteSummary(id: string): Promise<boolean> {
    console.log('🗑️ [EmailService] Deleting summary with ID:', id);
    await db.delete(emailSummaries).where(eq(emailSummaries.id, id));
    console.log('✅ [EmailService] Summary deleted successfully');
    return true;
  }
}

export const emailService = new EmailService();
