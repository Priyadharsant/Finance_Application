import "dotenv/config";
import pg from "pg";

const { Client } = pg;

const targetMode = process.argv.includes("--local") ? "local" : "remote";

const connectionString =
  targetMode === "local"
    ? null
    : process.env.POSTGRES_URL || process.env.DATABASE_URL;

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

async function resetTables() {
  try {
    await client.connect();

    const targetHost = connectionString
      ? new URL(connectionString).host
      : `${clientConfig.host}:${clientConfig.port}`;
    const targetDb = connectionString
      ? new URL(connectionString).pathname.replace("/", "")
      : clientConfig.database;

    console.log(`\n========================================`);
    console.log(`Connecting to: ${targetDb} on ${targetHost}`);
    console.log(`========================================\n`);

    // Get all base tables in the public schema
    const res = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
        AND table_type = 'BASE TABLE'
      ORDER BY table_name;
    `);

    const tableNames = res.rows.map((row) => row.table_name);

    if (tableNames.length === 0) {
      console.log("No tables found in public schema.");
      return;
    }

    console.log(`Found ${tableNames.length} tables in public schema:`);
    console.log(tableNames.map((t) => ` - ${t}`).join("\n"));
    console.log(`\nTruncating all tables and restarting identity sequences...`);

    // Build TRUNCATE statement with quoted table names
    const quotedTables = tableNames.map((t) => `"public"."${t}"`).join(", ");
    await client.query(`TRUNCATE TABLE ${quotedTables} RESTART IDENTITY CASCADE;`);

    console.log(`\nSuccessfully truncated ${tableNames.length} tables without deleting table structures!`);

    // Quick verification: verify row counts are 0
    console.log("\nVerifying row counts:");
    for (const t of tableNames) {
      const countRes = await client.query(`SELECT count(*)::int AS count FROM "public"."${t}"`);
      const count = countRes.rows[0].count;
      console.log(` - ${t}: ${count} rows`);
    }

    console.log("\nAll tables have been completely reset.\n");
  } catch (error) {
    console.error("Error resetting tables:", error.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

resetTables();


