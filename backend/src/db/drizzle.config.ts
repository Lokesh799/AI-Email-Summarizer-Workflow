import type { Config } from 'drizzle-kit';
import dotenv from 'dotenv';
import { resolve } from 'path';

// Load .env from backend directory (parent of src)
dotenv.config({ path: resolve(__dirname, '../../.env') });

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL environment variable is not set. Make sure backend/.env exists and contains DATABASE_URL');
}

const config = {
  schema: './src/db/schema.ts',
  out: './drizzle',
  driver: 'pg',
  dbCredentials: {
    connectionString: process.env.DATABASE_URL,
  },
} satisfies Config;

export default config;
