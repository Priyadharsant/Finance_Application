const { Client } = require(`pg`);
async function main() {
  const client = new Client({ user: `postgres`, password: `hari4274`, database: `finance`, port: 5432 });
  await client.connect();
  const t = await client.query(`SELECT table_name FROM information_schema.tables WHERE table_schema=` + `'public' AND table_type=` + `'BASE TABLE' ORDER BY table_name`);
  console.log(`Tables:`, t.rows.map(r => r.table_name).join(`, `));
  await client.end();
}
main().catch(e => { console.error(e.message); process.exit(1); });
