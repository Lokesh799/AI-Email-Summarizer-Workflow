import Fastify from 'fastify';
import cors from '@fastify/cors';
import multipart from '@fastify/multipart';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { readFileSync, existsSync } from 'fs';
import { emailRoutes } from './routes/emails.routes.js';
import { mockRoutes } from './routes/mock.routes.js';
import { pdfRoutes } from './routes/pdf.routes.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

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

// Serve frontend static files in production/Replit (before API routes)
async function setupStaticFiles() {
  if (process.env.NODE_ENV === 'production' || process.env.REPLIT) {
    try {
      // @ts-ignore - @fastify/static types will be available after npm install
      const fastifyStatic = await import('@fastify/static');
      const frontendDistPath = join(__dirname, '../../frontend/dist');
      
      await fastify.register(fastifyStatic.default, {
        root: frontendDistPath,
        prefix: '/',
      });

      // Serve index.html for all non-API routes (SPA routing)
      fastify.setNotFoundHandler((request, reply) => {
        if (request.url.startsWith('/api')) {
          reply.code(404).send({ error: 'Not found' });
        } else {
          const indexPath = join(frontendDistPath, 'index.html');
          if (existsSync(indexPath)) {
            const html = readFileSync(indexPath, 'utf-8');
            reply.type('text/html').send(html);
          } else {
            reply.code(404).send({ error: 'Frontend not built' });
          }
        }
      });
    } catch (error) {
      fastify.log.warn('Frontend static files not found, serving API only');
    }
  }
}

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
    // Setup static files first
    await setupStaticFiles();
    
    const port = Number(process.env.PORT) || 3001;
    await fastify.listen({ port, host: '0.0.0.0' });
    console.log(`🚀 Server running on http://localhost:${port}`);
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

start();
