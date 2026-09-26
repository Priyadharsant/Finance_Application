import pg from 'pg';
const { Pool } = pg;
const pool = new Pool({ user: 'postgres', password: 'hari4274', database: 'finance' });
async function run() {
  const res = await pool.query("SELECT pg_get_constraintdef(oid) FROM pg_constraint WHERE conname = 'daily_finance_accounts_interest_type_check'");
  console.log(res.rows[0]);
  pool.end();
}
run();
