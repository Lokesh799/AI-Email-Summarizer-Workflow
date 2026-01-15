import Fastify, { FastifySchemaCompiler } from 'fastify';
import cors from '@fastify/cors';
import dotenv from 'dotenv';
import { emailRoutes } from './routes/emails.routes.js';
import { mockRoutes } from './routes/mock.routes.js';

dotenv.config();

// Custom validator compiler that bypasses ajv completely
// Since we're using Zod for validation in routes, this is a no-op validator
const customValidatorCompiler: FastifySchemaCompiler<any> = () => {
  return () => {
    return true; // Always pass validation - we use Zod instead
  };
};

// Configure Fastify with custom validator to completely bypass ajv-compiler
// This prevents Fastify from trying to load @fastify/ajv-compiler
const fastify = Fastify({
  logger: true,
  validatorCompiler: customValidatorCompiler,
  // Explicitly disable schema controller to prevent ajv-compiler loading
  schemaController: {
    bucket: () => ({
      add: () => {},
      getSchema: () => null,
      getSchemas: () => ({}), // Return empty object - required by Fastify
    }),
  },
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
