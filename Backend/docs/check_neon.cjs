const pg = require("pg");
const pool = new pg.Pool({
  connectionString: "postgresql://neondb_owner:npg_p0SdL2rFhVqP@ep-blue-king-ao4xlr58-pooler.c-2.ap-southeast-1.aws.neon.tech/neondb?sslmode=require",
  ssl: { rejectUnauthorized: false }
});

async function main() {
  const res = await pool.query(`
    SELECT table_schema, table_name 
    FROM information_schema.tables 
    WHERE table_schema NOT IN ('information_schema', 'pg_catalog')
    ORDER BY table_schema, table_name;
  `);
  console.log("Total non-system tables:", res.rows.length);
  for (const r of res.rows) {
    try {
      const countRes = await pool.query(`SELECT count(*) FROM "${r.table_schema}"."${r.table_name}"`);
      console.log(`${r.table_schema}.${r.table_name}: ${countRes.rows[0].count} rows`);
    } catch (err) {
      console.log(`${r.table_schema}.${r.table_name}: ERROR ${err.message}`);
    }
  }
  await pool.end();
}

main().catch(console.error);
