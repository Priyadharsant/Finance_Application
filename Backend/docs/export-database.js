import "dotenv/config";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { readFile, writeFile, mkdir, copyFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const execFileAsync = promisify(execFile);
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const backendDocsDir = __dirname;
const rootDocsDir = path.resolve(__dirname, "../../docs");

const host = process.env.POSTGRES_HOST || "localhost";
const port = String(process.env.POSTGRES_PORT || 5432);
const database = process.env.POSTGRES_DB || "finance";
const user = process.env.POSTGRES_USER || "postgres";
const password = process.env.POSTGRES_PASSWORD || "1607";

async function runPgDump(extraArgs) {
  const args = [
    "-h", host,
    "-p", port,
    "-U", user,
    "-d", database,
    "--schema=public",
    "--no-owner",
    "--no-privileges",
    ...extraArgs,
  ];

  const env = {
    ...process.env,
    PGPASSWORD: password,
  };

  const { stdout } = await execFileAsync("pg_dump", args, {
    env,
    maxBuffer: 100 * 1024 * 1024,
  });

  return stdout;
}

function cleanSql(rawSql) {
  return rawSql
    // Remove psql 18 \restrict and \unrestrict commands
    .replace(/^\\restrict[^\r\n]*[\r\n]+/gm, "")
    .replace(/^\\unrestrict[^\r\n]*[\r\n]+/gm, "")
    // Ensure CREATE SCHEMA does not fail if public schema exists
    .replace(/CREATE SCHEMA public;/g, "CREATE SCHEMA IF NOT EXISTS public;")
    // Ensure pgcrypto extension uses IF NOT EXISTS
    .replace(/CREATE EXTENSION IF NOT EXISTS pgcrypto;/g, "__KEEP_PGCRYPTO__")
    .replace(/CREATE EXTENSION pgcrypto;/g, "CREATE EXTENSION IF NOT EXISTS pgcrypto;")
    .replace(/__KEEP_PGCRYPTO__/g, "CREATE EXTENSION IF NOT EXISTS pgcrypto;");
}

async function main() {
  console.log(`Connecting to local PostgreSQL database "${database}" on ${host}:${port}...`);

  await mkdir(backendDocsDir, { recursive: true });
  await mkdir(rootDocsDir, { recursive: true });

  // 1. Full database dump (Schema + Data)
  console.log("Exporting complete schema and data (finance_database.sql)...");
  const fullDumpRaw = await runPgDump(["--column-inserts"]);
  let fullSql = cleanSql(fullDumpRaw);

  // Make sure pgcrypto extension is safely created early
  if (!fullSql.includes("CREATE EXTENSION IF NOT EXISTS pgcrypto;")) {
    fullSql = `CREATE EXTENSION IF NOT EXISTS pgcrypto;\n\n` + fullSql;
  }

  const backendFullDumpPath = path.join(backendDocsDir, "finance_database.sql");
  const rootFullDumpPath = path.join(rootDocsDir, "finance_database.sql");
  await writeFile(backendFullDumpPath, fullSql, "utf8");
  await writeFile(rootFullDumpPath, fullSql, "utf8");
  console.log(`✓ Saved complete database dump to:`);
  console.log(`  - ${backendFullDumpPath}`);
  console.log(`  - ${rootFullDumpPath}`);

  // 2. Data-only inserts (INSERT INTO statements only)
  console.log("Exporting data-only inserts (finance_data_inserts.sql)...");
  const dataDumpRaw = await runPgDump(["--data-only", "--column-inserts"]);
  let dataSql = cleanSql(dataDumpRaw);

  // Wrap with replication role to bypass FK constraint order checks during batch insert
  const wrappedDataSql = [
    "-- ============================================================================",
    "-- Standalone Data Insert Script for Fresh / Existing Databases",
    `-- Exported from local database: ${database}`,
    `-- Export Date: ${new Date().toISOString()}`,
    "-- ============================================================================",
    "",
    "-- Disable foreign key and trigger checks during batch insertion",
    "SET session_replication_role = 'replica';",
    "",
    dataSql.trim(),
    "",
    "-- Re-enable foreign key and trigger checks",
    "SET session_replication_role = 'origin';",
    "",
  ].join("\n");

  const backendDataPath = path.join(backendDocsDir, "finance_data_inserts.sql");
  const rootDataPath = path.join(rootDocsDir, "finance_data_inserts.sql");
  await writeFile(backendDataPath, wrappedDataSql, "utf8");
  await writeFile(rootDataPath, wrappedDataSql, "utf8");
  console.log(`✓ Saved data-only inserts to:`);
  console.log(`  - ${backendDataPath}`);
  console.log(`  - ${rootDataPath}`);

  const insertCount = (wrappedDataSql.match(/^INSERT INTO /gm) || []).length;
  console.log(`\nExport complete! Exported ${insertCount} total rows of data across all tables.`);
}

main().catch((err) => {
  console.error("Export failed:", err);
  process.exit(1);
});
