import { FastifyInstance } from 'fastify';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { emailService } from '../services/email.service.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

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

      const summaries = await emailService.batchCreateSummaries(emails);

      return reply.status(201).send({
        message: 'Mock emails loaded and summarized successfully',
        data: summaries,
        count: summaries.length,
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
