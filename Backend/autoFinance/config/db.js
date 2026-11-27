import pg from 'pg';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../../.env') });
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

const { Pool } = pg;

// PostgreSQL DATE values are calendar dates, not instants. Keep them as
// YYYY-MM-DD strings so JSON serialization cannot shift them by a timezone.
pg.types.setTypeParser(1082, (value) => value);

const connectionString = process.env.POSTGRES_URL || process.env.DATABASE_URL;
const configuredHost = process.env.POSTGRES_HOST;
if (process.env.NODE_ENV === 'production' && !connectionString && !configuredHost) {
  throw new Error(
    'PostgreSQL is not configured. Set POSTGRES_URL or DATABASE_URL to your PostgreSQL connection string. ' +
      'SUPABASE_URL configures file storage and cannot be used as the database connection.'
  );
}

const isRemote =
  connectionString &&
  !connectionString.includes('localhost') &&
  !connectionString.includes('127.0.0.1');

export const pool = new Pool(
  connectionString
    ? {
        connectionString,
        ssl: isRemote ? { rejectUnauthorized: false } : undefined,
        max: 20,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 30000, // 30s to allow Neon serverless compute wake-up
        keepAlive: true,
        keepAliveInitialDelayMillis: 10000,
      }
    : {
        host: configuredHost || 'localhost',
        port: process.env.POSTGRES_PORT ? parseInt(process.env.POSTGRES_PORT, 10) : 5432,
        database: process.env.POSTGRES_DB || 'finance',
        user: process.env.POSTGRES_USER || 'postgres',
        password: process.env.POSTGRES_PASSWORD || '1607',
        max: 20,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 30000,
        keepAlive: true,
        keepAliveInitialDelayMillis: 10000,
      }
);

let hasLoggedConnection = false;
pool.on('connect', (client) => {
  if (!hasLoggedConnection) {
    const target = connectionString
      ? new URL(connectionString).host
      : `${configuredHost || 'localhost'}:${process.env.POSTGRES_PORT || 5432}`;
    console.log(`Connected to PostgreSQL database (${target}).`);
    hasLoggedConnection = true;
  }
});

pool.on('error', (err) => {
  console.error('PostgreSQL client error (auto-reconnecting):', err.message);
});

// Self-healing schema migrations for new or edited columns
(async function initSchemaSafety() {
  try {
    await pool.query(`
      ALTER TABLE autofinance_customers ADD COLUMN IF NOT EXISTS notes TEXT;
      ALTER TABLE daily_finance_accounts ADD COLUMN IF NOT EXISTS closed_date DATE;
      ALTER TABLE daily_finance_payments ADD COLUMN IF NOT EXISTS fine_amount NUMERIC(14,2) NOT NULL DEFAULT 0;
      ALTER TABLE autofinance_emi_schedules ADD COLUMN IF NOT EXISTS pending_amount NUMERIC(14,2) NOT NULL DEFAULT 0;
      ALTER TABLE autofinance_emi_schedules ADD COLUMN IF NOT EXISTS pending_amount_forwarded NUMERIC(14,2) NOT NULL DEFAULT 0;
      ALTER TABLE autofinance_emi_schedules ADD COLUMN IF NOT EXISTS fine_amount NUMERIC(14,2) NOT NULL DEFAULT 0;
      ALTER TABLE autofinance_loans ADD COLUMN IF NOT EXISTS total_payable NUMERIC(14,2);
      ALTER TABLE autofinance_loans ADD COLUMN IF NOT EXISTS interest_type VARCHAR(50) DEFAULT 'FLAT';
      ALTER TABLE autofinance_loans ADD COLUMN IF NOT EXISTS fees_details JSONB DEFAULT '{}'::jsonb;
    `);
  } catch (e) {
    console.warn('[Schema Init Warning]:', e.message);
  }
})();

export const query = (text, params) => pool.query(text, params);
