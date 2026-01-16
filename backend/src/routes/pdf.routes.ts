import { FastifyInstance } from 'fastify';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { pdfService } from '../services/pdf.service.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Routes for PDF invoice extraction testing
 */
export async function pdfRoutes(fastify: FastifyInstance) {
  // Test PDF extraction endpoint
  fastify.post('/pdf/extract', async (request, reply) => {
    try {
      const data = await request.file();

      if (!data) {
        return reply.status(400).send({ error: 'No file uploaded' });
      }

      if (!data.filename || !data.filename.toLowerCase().endsWith('.pdf')) {
        return reply.status(400).send({ error: 'File must be a PDF' });
      }

      // Read PDF buffer
      const chunks: Buffer[] = [];
      for await (const chunk of data.file) {
        chunks.push(chunk);
      }
      const pdfBuffer = Buffer.concat(chunks);

      fastify.log.info(`Processing PDF: ${data.filename}, size: ${pdfBuffer.length} bytes`);

      // First, try to extract raw text for debugging
      let rawText = '';
      try {
        const pdfParse = require('pdf-parse');
        const pdfData = await pdfParse(pdfBuffer);
        rawText = pdfData.text || '';
        fastify.log.info(`Extracted ${rawText.length} characters from PDF`);
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : 'Unknown error';
        fastify.log.warn(`Could not extract raw text for debugging: ${errorMsg}`);
      }

      // Extract invoice data from PDF
      const invoiceData = await pdfService.extractInvoiceData('', pdfBuffer);

      if (!invoiceData) {
        return reply.status(200).send({
          message: 'PDF processed but no financial data found',
          filename: data.filename,
          extractedTextLength: rawText.length,
          extractedTextPreview: rawText.substring(0, 500),
        });
      }

      return reply.send({
        message: 'Financial data extracted successfully',
        filename: data.filename,
        data: invoiceData,
        extractedTextLength: rawText.length,
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      fastify.log.error(error);
      return reply.status(500).send({ error: errorMessage });
    }
  });

  // Test with sample invoice (simulation)
  fastify.get('/pdf/test', async (_request, reply) => {
    try {
      const sampleInvoiceText = readFileSync(
        join(__dirname, '../data/sample-invoice.txt'),
        'utf-8'
      );

      // Simulate PDF extraction by using the text content
      const invoiceData = await pdfService.extractInvoiceData(sampleInvoiceText);

      if (!invoiceData) {
        return reply.status(200).send({
          message: 'Sample invoice processed but no invoice data found',
        });
      }

      return reply.send({
        message: 'Sample invoice data extracted successfully',
        data: invoiceData,
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      fastify.log.error(error);
      return reply.status(500).send({ error: errorMessage });
    }
  });

  // Debug endpoint to see raw PDF text
  fastify.post('/pdf/debug', async (request, reply) => {
    try {
      const data = await request.file();

      if (!data) {
        return reply.status(400).send({ error: 'No file uploaded' });
      }

      if (!data.filename || !data.filename.toLowerCase().endsWith('.pdf')) {
        return reply.status(400).send({ error: 'File must be a PDF' });
      }

      // Read PDF buffer
      const chunks: Buffer[] = [];
      for await (const chunk of data.file) {
        chunks.push(chunk);
      }
      const pdfBuffer = Buffer.concat(chunks);

      // Extract raw text
      const pdfParse = require('pdf-parse');
      const pdfData = await pdfParse(pdfBuffer);
      const rawText = pdfData.text || '';

      return reply.send({
        filename: data.filename,
        fileSize: pdfBuffer.length,
        extractedTextLength: rawText.length,
        extractedText: rawText,
        preview: rawText.substring(0, 2000),
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      fastify.log.error(error);
      return reply.status(500).send({ error: errorMessage });
    }
  });
}
