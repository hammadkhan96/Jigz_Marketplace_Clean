import './env.js';
import { Pool } from 'pg';  // ✅ Use PostgreSQL driver for Cloud SQL
import { drizzle } from 'drizzle-orm/node-postgres';  // ✅ Use node-postgres ORM
import * as schema from "../shared/schema";

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

console.log(" DATABASE_URL being used:", process.env.DATABASE_URL); // Added debug log
export const pool = new Pool({ connectionString: process.env.DATABASE_URL });
export const db = drizzle(pool, { schema });