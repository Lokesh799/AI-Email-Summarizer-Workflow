import { FastifyInstance } from 'fastify';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { emailService } from '../services/email.service.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export async function mockRoutes(fastify: FastifyInstance) {
  // Load and process mock emails
  fastify.post('/mock/load', async (_request, reply) => {
    try {
      console.log('📥 [API] POST /api/mock/load - Loading mock emails');
      const filePath = join(__dirname, '../data/mock-emails.json');
      console.log('📁 [API] Reading mock emails from:', filePath);
      
      const fileContent = readFileSync(filePath, 'utf-8');
      const emails = JSON.parse(fileContent);
      console.log('✅ [API] Loaded', emails.length, 'mock emails from file');

      console.log('🚀 [API] Starting batch processing with OpenAI...');
      const summaries = await emailService.batchCreateSummaries(emails);
      
      console.log('✅ [API] Mock emails processed successfully. Total summaries:', summaries.length);
      console.log('📊 [API] Summary breakdown:', {
        total: summaries.length,
        categories: summaries.reduce((acc, s) => {
          acc[s.category] = (acc[s.category] || 0) + 1;
          return acc;
        }, {} as Record<string, number>),
      });
      
      return reply.status(201).send({
        message: 'Mock emails loaded and summarized successfully',
        data: summaries,
        count: summaries.length,
      });
    } catch (error) {
      console.error('❌ [API] Error loading mock emails:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      return reply.status(500).send({ error: errorMessage });
    }
  });

  // Get mock emails without processing
  fastify.get('/mock/emails', async (_request, reply) => {
    try {
      console.log('📥 [API] GET /api/mock/emails - Getting raw mock emails');
      const filePath = join(__dirname, '../data/mock-emails.json');
      console.log('📁 [API] Reading from:', filePath);
      
      const fileContent = readFileSync(filePath, 'utf-8');
      const emails = JSON.parse(fileContent);
      console.log('✅ [API] Loaded', emails.length, 'mock emails');
      
      return reply.send({ data: emails, count: emails.length });
    } catch (error) {
      console.error('❌ [API] Error getting mock emails:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      return reply.status(500).send({ error: errorMessage });
    }
  });
}
