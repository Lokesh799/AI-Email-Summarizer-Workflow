import type { Config } from 'drizzle-kit';

// Get DATABASE_URL from environment (loaded by npm script)
const databaseUrl = process.env.DATABASE_URL || '';

if (!databaseUrl) {
  console.error('⚠️  Warning: DATABASE_URL not found. Make sure .env exists in backend directory.');
  console.error('   Using placeholder - migrations may fail if DATABASE_URL is not set.');
}

const config: Config = {
  schema: './src/db/schema.ts',
  out: './drizzle',
  driver: 'pg',
  dbCredentials: {
    connectionString: databaseUrl || 'postgresql://placeholder',
  },
};

export default config;
