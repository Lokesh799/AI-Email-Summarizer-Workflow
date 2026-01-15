import Fastify from 'fastify';
import cors from '@fastify/cors';
import dotenv from 'dotenv';
import { emailRoutes } from './routes/emails.routes.js';
import { mockRoutes } from './routes/mock.routes.js';

dotenv.config();

const fastify = Fastify({
  logger: true,
});

// Register CORS
const corsOrigin = process.env.CORS_ORIGIN || true;
fastify.register(cors, {
  origin: corsOrigin,
  credentials: true,
});

// Health check
fastify.get('/health', async () => {
  return { status: 'ok', timestamp: new Date().toISOString() };
});

// Register routes with /api prefix
fastify.register(emailRoutes, { prefix: '/api' });
fastify.register(mockRoutes, { prefix: '/api' });

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
