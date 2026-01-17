import { FastifyInstance } from 'fastify';
import { readFileSync, existsSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { emailService } from '../services/email.service.js';
import { pdfService } from '../services/pdf.service.js';

// const __filename = fileURLToPath(import.meta.url);
// const __dirname = dirname(__filename);

import path from "path";

const __dirname = path.resolve();


/**
 * Mock routes for loading sample email data
 * 
 * "Load Mock Emails" functionality:
 * - Reads sample emails from mock-emails.json
 * - Processes them through OpenAI API for summarization
 * - Stores the summaries in the database
 * - Useful for testing and demonstration purposes
 */
export async function mockRoutes(fastify: FastifyInstance) {
  // Load and process mock emails
  fastify.post('/mock/load', async (_request, reply) => {
    try {
      const filePath = join(__dirname, '../data/mock-emails.json');
      const fileContent = readFileSync(filePath, 'utf-8');
      const emails = JSON.parse(fileContent);

      if (!Array.isArray(emails) || emails.length === 0) {
        return reply.status(400).send({ error: 'Invalid or empty mock emails file' });
      }

      // Check if sample PDF exists and attach it to invoice emails
      const samplePdfPath = join(__dirname, '../data/sample-invoice.pdf');
      let pdfBuffer: Buffer | undefined;
      
      if (existsSync(samplePdfPath)) {
        try {
          pdfBuffer = readFileSync(samplePdfPath);
          fastify.log.info(`Loaded sample PDF for invoice simulation: ${pdfBuffer.length} bytes`);
        } catch (error) {
          fastify.log.warn('Could not load sample PDF, will use text extraction only');
        }
      } else {
        // If PDF doesn't exist, create a simulated PDF buffer from sample invoice text
        // This simulates PDF attachment processing
        const sampleInvoiceText = readFileSync(
          join(__dirname, '../data/sample-invoice.txt'),
          'utf-8'
        );
        // Simulate PDF by using the text content (in real scenario, this would be actual PDF bytes)
        fastify.log.info('Sample PDF not found, using text-based invoice simulation');
      }

      // Attach PDF to invoice emails for simulation
      const emailsWithPdf = emails.map((email) => {
        const isInvoiceEmail =
          email.subject?.toLowerCase().includes('invoice') ||
          email.subject?.toLowerCase().includes('bill') ||
          email.sender?.toLowerCase().includes('billing');
        
        return {
          ...email,
          pdfAttachment: isInvoiceEmail && pdfBuffer ? pdfBuffer : undefined,
        };
      });

      const summaries = await emailService.batchCreateSummaries(emailsWithPdf);

      const pdfCount = emailsWithPdf.filter((e) => e.pdfAttachment).length;

      return reply.status(201).send({
        message: 'Mock emails loaded and summarized successfully',
        data: summaries,
        count: summaries.length,
        pdfAttachments: pdfCount > 0 ? `${pdfCount} emails processed with PDF attachments` : 'No PDF attachments',
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      fastify.log.error(error);
      return reply.status(500).send({ error: errorMessage });
    }
  });

  // Get mock emails without processing
  fastify.get('/mock/emails', async (_request, reply) => {
    try {
      const filePath = join(__dirname, '../data/mock-emails.json');
      const fileContent = readFileSync(filePath, 'utf-8');
      const emails = JSON.parse(fileContent);

      return reply.send({ data: emails, count: emails.length });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      fastify.log.error(error);
      return reply.status(500).send({ error: errorMessage });
    }
  });
}
