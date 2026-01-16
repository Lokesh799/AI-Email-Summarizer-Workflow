import { FastifyInstance } from 'fastify';
import { emailService } from '../services/email.service.js';
import { pdfService } from '../services/pdf.service.js';
import { z } from 'zod';

const EmailSchema = z.object({
  sender: z.string().min(1, 'Sender is required'),
  subject: z.string().min(1, 'Subject is required'),
  body: z.string().min(1, 'Body is required'),
});

export async function emailRoutes(fastify: FastifyInstance) {
  // Get all summaries with optional category filter and pagination
  fastify.get<{ Querystring: { category?: string; page?: string; limit?: string } }>(
    '/summaries',
    async (request, reply) => {
      try {
        const { category, page, limit } = request.query;
        const pageNumber = page ? parseInt(page, 10) : 1;
        const pageSize = limit ? parseInt(limit, 10) : 50;

        const summaries = await emailService.getAllSummaries(category);
        
        // Simple pagination
        const startIndex = (pageNumber - 1) * pageSize;
        const endIndex = startIndex + pageSize;
        const paginatedSummaries = summaries.slice(startIndex, endIndex);

        // Add cache headers for better performance
        reply.header('Cache-Control', 'private, max-age=60');
        
        return reply.send({
          data: paginatedSummaries,
          count: paginatedSummaries.length,
          total: summaries.length,
          page: pageNumber,
          pageSize,
          totalPages: Math.ceil(summaries.length / pageSize),
        });
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        fastify.log.error(error);
        return reply.status(500).send({ error: errorMessage });
      }
    }
  );

  // Get single summary by ID
  fastify.get<{ Params: { id: string } }>('/summaries/:id', async (request, reply) => {
    try {
      const { id } = request.params;
      const summary = await emailService.getSummaryById(id);
      
      if (!summary) {
        return reply.status(404).send({ error: 'Summary not found' });
      }
      
      return reply.send({ data: summary });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      fastify.log.error(error);
      return reply.status(500).send({ error: errorMessage });
    }
  });

  // Create single summary (supports PDF attachment via multipart/form-data)
  fastify.post('/summaries', async (request, reply) => {
    try {
      // Check if request is multipart (has files)
      const contentType = request.headers['content-type'] || '';
      const isMultipart = contentType.includes('multipart/form-data');

      if (!isMultipart) {
        // Handle JSON body (no file upload)
        const body = request.body as { sender?: string; subject?: string; body?: string };
        const validated = EmailSchema.parse(body);
        const summary = await emailService.createSummary(validated);
        return reply.status(201).send({ data: summary });
      }

      // Handle multipart/form-data with PDF attachment
      const fields: Record<string, string> = {};
      let pdfBuffer: Buffer | undefined;

      // Parse all parts (fields and files)
      const parts = request.parts();
      for await (const part of parts) {
        if (part.type === 'file') {
          if (part.filename && part.filename.toLowerCase().endsWith('.pdf')) {
            const chunks: Buffer[] = [];
            for await (const chunk of part.file) {
              chunks.push(chunk);
            }
            pdfBuffer = Buffer.concat(chunks);
            fastify.log.info(`📎 [API] Received PDF attachment: ${part.filename}, size: ${pdfBuffer.length} bytes`);
          } else {
            fastify.log.warn(`⚠️ [API] File uploaded but not PDF: ${part.filename}`);
          }
        } else {
          fields[part.fieldname] = part.value as string;
        }
      }

      fastify.log.info(`📧 [API] Email data: sender=${fields.sender}, subject=${fields.subject}, hasPDF=${!!pdfBuffer}`);

      // Validate required fields
      if (!fields.sender || !fields.subject || !fields.body) {
        return reply.status(400).send({ 
          error: 'Missing required fields', 
          required: ['sender', 'subject', 'body'] 
        });
      }

      const emailData = {
        sender: fields.sender,
        subject: fields.subject,
        body: fields.body,
        pdfAttachment: pdfBuffer,
      };

      const summary = await emailService.createSummary(emailData);
      
      return reply.status(201).send({ 
        data: summary,
        message: pdfBuffer ? 'Email processed with PDF attachment' : 'Email processed successfully'
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return reply.status(400).send({ error: 'Invalid email data', details: error.errors });
      }
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      fastify.log.error(error);
      return reply.status(500).send({ error: errorMessage });
    }
  });

  // Batch create summaries
  fastify.post<{ Body: { emails: z.infer<typeof EmailSchema>[] } }>(
    '/summaries/batch',
    async (request, reply) => {
      try {
        const { emails } = request.body;

        if (!Array.isArray(emails) || emails.length === 0) {
          return reply.status(400).send({ error: 'Emails array is required and cannot be empty' });
        }

        const validatedEmails = emails.map((email) => EmailSchema.parse(email));
        const summaries = await emailService.batchCreateSummaries(validatedEmails);

        return reply.status(201).send({ data: summaries, count: summaries.length });
      } catch (error) {
        if (error instanceof z.ZodError) {
          return reply.status(400).send({ error: 'Invalid email data', details: error.errors });
        }
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        fastify.log.error(error);
        return reply.status(500).send({ error: errorMessage });
      }
    }
  );

  // Re-summarize
  fastify.post<{ Params: { id: string } }>('/summaries/:id/resummarize', async (request, reply) => {
    try {
      const { id } = request.params;
      const summary = await emailService.reSummarize(id);
      return reply.send({ data: summary });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      if (errorMessage.includes('not found')) {
        return reply.status(404).send({ error: errorMessage });
      }
      fastify.log.error(error);
      return reply.status(500).send({ error: errorMessage });
    }
  });

  // Delete summary
  fastify.delete<{ Params: { id: string } }>('/summaries/:id', async (request, reply) => {
    try {
      const { id } = request.params;
      await emailService.deleteSummary(id);
      return reply.send({ message: 'Summary deleted successfully' });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      fastify.log.error(error);
      return reply.status(500).send({ error: errorMessage });
    }
  });

  // Export summaries as CSV
  fastify.get<{ Querystring: { category?: string } }>('/summaries/export', async (request, reply) => {
    try {
      const { category } = request.query;
      const summaries = await emailService.getAllSummaries(category);

      // CSV headers - using clear, descriptive names
      const headers = [
        'ID',
        'Sender',
        'Subject',
        'Summary',
        'Category',
        'Keywords',
        'Invoice Total',
        'Created At',
        'Updated At',
      ];

      const escapeCsvValue = (value: string): string => {
        if (value.includes(',') || value.includes('"') || value.includes('\n')) {
          return `"${value.replace(/"/g, '""')}"`;
        }
        return value;
      };

      const rows = summaries.map((summary) => {
        const invoiceTotal =
          summary.invoiceData &&
          typeof summary.invoiceData === 'object' &&
          'currency' in summary.invoiceData &&
          'total' in summary.invoiceData
            ? `${(summary.invoiceData as { currency: string; total: number }).currency} ${(summary.invoiceData as { currency: string; total: number }).total.toFixed(2)}`
            : '';

        return [
          summary.id,
          summary.sender,
          summary.subject,
          summary.summary.replace(/\n/g, ' ').replace(/\r/g, ''),
          summary.category,
          summary.keywords?.join('; ') || '',
          invoiceTotal,
          summary.createdAt instanceof Date
            ? summary.createdAt.toISOString()
            : String(summary.createdAt),
          summary.updatedAt instanceof Date
            ? summary.updatedAt.toISOString()
            : String(summary.updatedAt),
        ].map((cell) => escapeCsvValue(String(cell)));
      });

      // Create CSV with UTF-8 BOM for better Excel compatibility
      // Excel will recognize the first row as headers and may style them differently
      const csv = '\uFEFF' + [headers.join(','), ...rows.map((row) => row.join(','))].join('\n');

      reply.header('Content-Type', 'text/csv; charset=utf-8');
      reply.header('Content-Disposition', `attachment; filename="email-summaries-${Date.now()}.csv"`);
      return reply.send(csv);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      fastify.log.error(error);
      return reply.status(500).send({ error: errorMessage });
    }
  });
}
