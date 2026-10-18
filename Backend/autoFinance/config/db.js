import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config();

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
        max: 15,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 5000,
      }
    : {
        host: process.env.POSTGRES_HOST || 'localhost',
        port: process.env.POSTGRES_PORT ? parseInt(process.env.POSTGRES_PORT, 10) : 5432,
        database: process.env.POSTGRES_DB || 'finance',
        user: process.env.POSTGRES_USER || 'postgres',
        password: process.env.POSTGRES_PASSWORD || '1607',
        max: 15,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 5000,
      }
);

let hasLoggedConnection = false;
pool.on('connect', () => {
  if (!hasLoggedConnection) {
    const target = connectionString
      ? new URL(connectionString).host
      : `${process.env.POSTGRES_HOST || 'localhost'}:${process.env.POSTGRES_PORT || 5432}`;
    console.log(`Connected to PostgreSQL database (${target}).`);
    hasLoggedConnection = true;
  }
});

pool.on('error', (err) => {
  console.error('Unexpected error on idle PostgreSQL client:', err.message);
});

export const query = (text, params) => pool.query(text, params);
