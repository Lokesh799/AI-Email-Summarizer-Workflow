import Fastify from 'fastify';
import cors from '@fastify/cors';
import multipart from '@fastify/multipart';
import dotenv from 'dotenv';
import { emailRoutes } from './routes/emails.routes.js';
import { mockRoutes } from './routes/mock.routes.js';
import { pdfRoutes } from './routes/pdf.routes.js';

dotenv.config();

// Configure Fastify
// Note: We use Zod for validation in routes, not Fastify's built-in schema validation
// The ajv shims handle the missing ajv/dist/jtd and ajv/dist/standalone modules
const fastify = Fastify({
  logger: true,
});

// Register CORS
const corsOrigin = process.env.CORS_ORIGIN || true;
fastify.register(cors, {
  origin: corsOrigin,
  credentials: true,
});

// Register multipart for file uploads (PDF attachments)
fastify.register(multipart, {
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit for PDF files
  },
});

// Health check
fastify.get('/health', async () => {
  return { status: 'ok', timestamp: new Date().toISOString() };
});

// Register routes with /api prefix
fastify.register(emailRoutes, { prefix: '/api' });
fastify.register(mockRoutes, { prefix: '/api' });
fastify.register(pdfRoutes, { prefix: '/api' });

const start = async () => {
  try {
    const port = Number(process.env.PORT) || 3001;
    await fastify.listen({ port, host: '0.0.0.0' });
    console.log(`🚀 Server running on http://localhost:${port}`);
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

start();
