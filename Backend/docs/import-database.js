import "dotenv/config";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";

const { Client } = pg;
const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));

const targetArg = process.argv.slice(2).find((arg) => !arg.startsWith("--"));
const sqlPath = path.resolve(
  targetArg || path.join(scriptDirectory, "finance_database.sql"),
);

const isDataOnly =
  path.basename(sqlPath).includes("data_inserts") ||
  process.argv.includes("--data-only") ||
  process.argv.includes("--no-drop");

const connectionString =
  process.env.POSTGRES_URL ||
  process.env.DATABASE_URL;

const isRemote =
  connectionString &&
  !connectionString.includes("localhost") &&
  !connectionString.includes("127.0.0.1");

const clientConfig = connectionString
  ? {
      connectionString,
      ssl: isRemote ? { rejectUnauthorized: false } : undefined,
    }
  : {
      host: process.env.POSTGRES_HOST || "localhost",
      port: process.env.POSTGRES_PORT ? parseInt(process.env.POSTGRES_PORT, 10) : 5432,
      database: process.env.POSTGRES_DB || "finance",
      user: process.env.POSTGRES_USER || "postgres",
      password: process.env.POSTGRES_PASSWORD || "1607",
    };

const client = new Client(clientConfig);

try {
  let sql = await readFile(sqlPath, "utf8");
  // Filter out any psql-specific backslash commands that node-postgres cannot execute directly
  sql = sql
    .replace(/^\\restrict[^\r\n]*[\r\n]+/gm, "")
    .replace(/^\\unrestrict[^\r\n]*[\r\n]+/gm, "");

  await client.connect();

  const targetHost = connectionString
    ? new URL(connectionString).host
    : `${clientConfig.host}:${clientConfig.port}`;
  const targetDb = connectionString
    ? new URL(connectionString).pathname.replace("/", "")
    : clientConfig.database;

  console.log(`Connected to target database: ${targetDb} on ${targetHost}`);

  if (!isDataOnly) {
    console.log(`Resetting public schema on ${targetDb}...`);
    await client.query("DROP SCHEMA IF EXISTS public CASCADE; CREATE SCHEMA public;");
  } else {
    console.log(`Inserting data into existing schema on ${targetDb}...`);
  }

  console.log(`Executing ${path.basename(sqlPath)}...`);
  await client.query(sql);
  console.log(`✓ Successfully imported ${path.relative(process.cwd(), sqlPath)} into ${targetDb}`);

  // Query verification stats
  const res = await client.query(
    "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_type = 'BASE TABLE' ORDER BY table_name;"
  );
  let totalRows = 0;
  console.log(`\nVerification: Found ${res.rows.length} tables in ${targetDb}:`);
  for (const r of res.rows) {
    const c = await client.query(`SELECT count(*) FROM public."${r.table_name}"`);
    const count = parseInt(c.rows[0].count, 10);
    totalRows += count;
    if (count > 0) {
      console.log(`  - ${r.table_name}: ${count} rows`);
    }
  }
  console.log(`\n✓ Total rows imported: ${totalRows} across ${res.rows.length} tables.`);
} catch (error) {
  console.error("Database import failed:", error.message);
  process.exitCode = 1;
} finally {
  await client.end().catch(() => {});
}
