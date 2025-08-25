import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import ws from "ws";
import * as schema from "@shared/schema";

neonConfig.webSocketConstructor = ws;

if (!process.env.DATABASE_URL) {
  console.error("❌ DATABASE_URL environment variable is not set!");
  console.error("");
  console.error("For local development:");
  console.error("1. Copy .env.local.example to .env");
  console.error("2. Set DATABASE_URL to your PostgreSQL connection string");
  console.error("3. Run 'npm run db:push' to set up the database schema");
  console.error("");
  console.error("Example DATABASE_URL:");
  console.error("postgresql://username:password@localhost:5432/jigz_local");
  console.error("");
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

export const pool = new Pool({ connectionString: process.env.DATABASE_URL });
export const db = drizzle({ client: pool, schema });