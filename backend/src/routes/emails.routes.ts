import { FastifyInstance } from 'fastify';
import { emailService } from '../services/email.service.js';
import { pdfService } from '../services/pdf.service.js';
import { z } from 'zod';

const EmailSchema = z.object({
  sender: z.string().min(1),
  subject: z.string().min(1),
  body: z.string().min(1),
});

export async function emailRoutes(fastify: FastifyInstance) {
  // Get all summaries with optional category filter
  fastify.get<{ Querystring: { category?: string } }>('/summaries', async (request, reply) => {
    try {
      console.log('📥 [API] GET /api/summaries - Request received');
      const { category } = request.query;
      console.log('🔍 [API] Category filter:', category || 'All');
      
      const summaries = await emailService.getAllSummaries(category);
      console.log('✅ [API] Found', summaries.length, 'summaries');
      
      return reply.send({ data: summaries, count: summaries.length });
    } catch (error) {
      console.error('❌ [API] Error getting summaries:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      return reply.status(500).send({ error: errorMessage });
    }
  });

  // Get single summary by ID
  fastify.get<{ Params: { id: string } }>('/summaries/:id', async (request, reply) => {
    try {
      const { id } = request.params;
      console.log('📥 [API] GET /api/summaries/:id - ID:', id);
      
      const summary = await emailService.getSummaryById(id);
      if (!summary) {
        console.warn('⚠️ [API] Summary not found for ID:', id);
        return reply.status(404).send({ error: 'Summary not found' });
      }
      console.log('✅ [API] Returning summary for ID:', id);
      return reply.send({ data: summary });
    } catch (error) {
      console.error('❌ [API] Error getting summary by ID:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      return reply.status(500).send({ error: errorMessage });
    }
  });

  // Create single summary
  fastify.post<{ Body: z.infer<typeof EmailSchema> }>('/summaries', async (request, reply) => {
    try {
      console.log('📥 [API] POST /api/summaries - Creating single summary');
      const validated = EmailSchema.parse(request.body);
      console.log('✅ [API] Request validated. Sender:', validated.sender);
      
      const summary = await emailService.createSummary(validated);
      console.log('✅ [API] Summary created with ID:', summary.id);
      return reply.status(201).send({ data: summary });
    } catch (error) {
      console.error('❌ [API] Error creating summary:', error);
      if (error instanceof z.ZodError) {
        console.error('❌ [API] Validation errors:', error.errors);
        return reply.status(400).send({ error: 'Invalid email data', details: error.errors });
      }
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      return reply.status(500).send({ error: errorMessage });
    }
  });

  // Batch create summaries
  fastify.post<{ Body: { emails: z.infer<typeof EmailSchema>[] } }>(
    '/summaries/batch',
    async (request, reply) => {
      try {
        console.log('📥 [API] POST /api/summaries/batch - Received request');
        const { emails } = request.body;
        console.log('📊 [API] Number of emails in batch:', emails?.length || 0);
        
        if (!Array.isArray(emails) || emails.length === 0) {
          console.warn('⚠️ [API] Invalid batch request - empty or not an array');
          return reply.status(400).send({ error: 'Emails array is required and cannot be empty' });
        }

        const validatedEmails = emails.map((email) => EmailSchema.parse(email));
        console.log('✅ [API] Validated', validatedEmails.length, 'emails');
        
        const summaries = await emailService.batchCreateSummaries(validatedEmails);
        console.log('✅ [API] Batch processing complete. Returning', summaries.length, 'summaries');
        
        return reply.status(201).send({ data: summaries, count: summaries.length });
      } catch (error) {
        console.error('❌ [API] Error in batch create:', error);
        if (error instanceof z.ZodError) {
          return reply.status(400).send({ error: 'Invalid email data', details: error.errors });
        }
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        console.error('❌ [API] Error in batch create:', error);
        return reply.status(500).send({ error: errorMessage });
      }
    }
  );

  // Re-summarize
  fastify.post<{ Params: { id: string } }>('/summaries/:id/resummarize', async (request, reply) => {
    try {
      const { id } = request.params;
      console.log('📥 [API] POST /api/summaries/:id/resummarize - ID:', id);
      
      const summary = await emailService.reSummarize(id);
      console.log('✅ [API] Re-summarization complete for ID:', id);
      
      return reply.send({ data: summary });
    } catch (error) {
      console.error('❌ [API] Error re-summarizing:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      if (errorMessage.includes('not found')) {
        return reply.status(404).send({ error: errorMessage });
      }
      return reply.status(500).send({ error: errorMessage });
    }
  });

  // Delete summary
  fastify.delete<{ Params: { id: string } }>('/summaries/:id', async (request, reply) => {
    try {
      const { id } = request.params;
      console.log('📥 [API] DELETE /api/summaries/:id - ID:', id);
      
      const deleted = await emailService.deleteSummary(id);
      console.log('✅ [API] Summary deleted:', deleted);
      if (!deleted) {
        return reply.status(404).send({ error: 'Summary not found' });
      }
      return reply.send({ message: 'Summary deleted successfully' });
    } catch (error) {
      console.error('❌ [API] Error deleting summary:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      return reply.status(500).send({ error: errorMessage });
    }
  });

  // Export summaries as CSV
  fastify.get<{ Querystring: { category?: string } }>('/summaries/export', async (request, reply) => {
    try {
      console.log('📥 [API] GET /api/summaries/export - Export request');
      const { category } = request.query;
      console.log('🔍 [API] Export category filter:', category || 'All');
      
      const summaries = await emailService.getAllSummaries(category);
      console.log('✅ [API] Exporting', summaries.length, 'summaries as CSV');

      const headers = ['ID', 'Sender', 'Subject', 'Summary', 'Category', 'Keywords', 'Invoice Total', 'Created At', 'Updated At'];
      const rows = summaries.map((summary) => [
        summary.id,
        summary.sender,
        summary.subject,
        summary.summary.replace(/\n/g, ' ').replace(/\r/g, ''),
        summary.category,
        summary.keywords?.join('; ') || '',
        summary.invoiceData && typeof summary.invoiceData === 'object' && 'currency' in summary.invoiceData && 'total' in summary.invoiceData
          ? `${(summary.invoiceData as any).currency} ${(summary.invoiceData as any).total.toFixed(2)}`
          : '',
        summary.createdAt instanceof Date ? summary.createdAt.toISOString() : summary.createdAt,
        summary.updatedAt instanceof Date ? summary.updatedAt.toISOString() : summary.updatedAt,
      ]);

      // Escape CSV values properly
      const escapeCsvValue = (value: string): string => {
        if (value.includes(',') || value.includes('"') || value.includes('\n')) {
          return `"${value.replace(/"/g, '""')}"`;
        }
        return value;
      };

      const csv = [
        headers.join(','),
        ...rows.map((row) => row.map((cell) => escapeCsvValue(String(cell))).join(',')),
      ].join('\n');

      reply.header('Content-Type', 'text/csv');
      reply.header('Content-Disposition', `attachment; filename="email-summaries-${Date.now()}.csv"`);
      console.log('✅ [API] CSV export generated. Size:', csv.length, 'bytes');
      return reply.send(csv);
    } catch (error) {
      console.error('❌ [API] Error exporting CSV:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      return reply.status(500).send({ error: errorMessage });
    }
  });

  // Extract invoice from email body (for testing/simulation)
  fastify.post<{ Body: { emailBody?: string } }>('/summaries/extract-invoice', async (request, reply) => {
    try {
      console.log('📥 [API] POST /api/summaries/extract-invoice - Invoice extraction request');
      const { emailBody } = request.body;
      
      if (!emailBody) {
        return reply.status(400).send({ error: 'Email body is required' });
      }

      const invoiceData = await pdfService.extractInvoiceData(emailBody);
      
      if (!invoiceData) {
        return reply.status(404).send({ error: 'No invoice data found in email body' });
      }

      console.log('✅ [API] Invoice data extracted successfully');
      return reply.send({ data: invoiceData });
    } catch (error) {
      console.error('❌ [API] Error extracting invoice:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      return reply.status(500).send({ error: errorMessage });
    }
  });
}
