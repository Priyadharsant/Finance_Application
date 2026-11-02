import path from 'path';
import { fileURLToPath } from 'url';
import pg from '../Backend/node_modules/pg/lib/index.js';

const { Pool } = pg;

async function reconcile() {
  const conn = 'postgresql://neondb_owner:npg_p0SdL2rFhVqP@ep-blue-king-ao4xlr58.c-2.ap-southeast-1.aws.neon.tech/neondb?sslmode=require';
  const neonPool = new Pool({ connectionString: conn, ssl: { rejectUnauthorized: false } });
  const localPool = new Pool({ host: 'localhost', port: 5432, database: 'finance_cloud_analysis_20261102', user: 'postgres', password: '1607' });

  const queryText = 
    "INSERT INTO global_cash_ledger(" +
    "  transaction_date, effective_date, type, amount, direction, source_module, reference_type, reference_id, notes" +
    ") VALUES (" +
    "  NOW(), '2026-09-18', 'DAILY_LOAN_DISBURSEMENT', 180000.00, 'DEBIT', 'DAILY', 'DAILY_LOAN_RECONCILIATION', '816c6a60-0fbe-43a1-a039-72ec8f0f25d6', 'Reconciliation adjustment for loan BEERILAKI A.S KALANGIYAM (difference between net disbursement ₹1,98,000 and initial ledger ₹18,000)'" +
    ") RETURNING *;";

  console.log('Inserting reconciliation into Neon Cloud DB...');
  const neonRes = await neonPool.query(queryText);
  console.log('Neon reconciled entry ID:', neonRes.rows[0].id);

  console.log('Inserting reconciliation into Local DB...');
  const localRes = await localPool.query(queryText);
  console.log('Local reconciled entry ID:', localRes.rows[0].id);

  await neonPool.end();
  await localPool.end();
  console.log('Reconciliation successfully applied on both Neon Cloud and Local DB!');
}

reconcile().catch(console.error);
