import pg from 'pg';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../../.env') });
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

const { Pool } = pg;

const connectionString = process.env.POSTGRES_URL || process.env.DATABASE_URL;
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
        host: process.env.POSTGRES_HOST || 'localhost',
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
      : `${process.env.POSTGRES_HOST || 'localhost'}:${process.env.POSTGRES_PORT || 5432}`;
    console.log(`Connected to PostgreSQL database (${target}).`);
    hasLoggedConnection = true;
  }
});

pool.on('error', (err) => {
  console.error('PostgreSQL client error (auto-reconnecting):', err.message);
});

export const query = (text, params) => pool.query(text, params);
