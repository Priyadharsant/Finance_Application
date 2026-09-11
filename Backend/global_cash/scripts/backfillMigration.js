import { pool } from "../../autoFinance/config/db.js";
import { createContribution } from "../services/partnerCapital.service.js";
import { createLedgerEntry } from "../services/globalCash.service.js";

async function runBackfill() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    console.log('Starting Backfill Migration...');

    // NOTE: This script is a template. You must replace the mock data with actual historical records.
    // If exact dates are known, use them. If not, use a single MIGRATION_DATE.
    const MIGRATION_DATE = '2026-01-01'; // The date from which full historical accuracy begins, or a general opening balance date.

    // 1. Create a Global Partner (Admin / Owner)
    const partnerRes = await client.query(`
      INSERT INTO global_partners (name, status)
      VALUES ($1, 'ACTIVE')
      RETURNING *;
    `, ['Company Founders']);
    const partnerId = partnerRes.rows[0].id;
    console.log(`Created Default Partner: ${partnerId}`);

    // 2. Insert Opening Balance Capital Contribution
    // Assuming a total initial capital of 5,000,000 before this system was built
    const openingCapital = 5000000;
    
    await createContribution(client, partnerId, openingCapital, MIGRATION_DATE, 'Opening Balance Migration');
    console.log(`Added Opening Capital: ${openingCapital}`);

    // 3. Backfill existing active loans into the cash ledger as past disbursements
    // Auto Finance
    const autoRes = await client.query(`SELECT id, start_date, loan_amount FROM autofinance_loans WHERE status = 'ACTIVE'`);
    let autoTotal = 0;
    for (const loan of autoRes.rows) {
      await createLedgerEntry(client, {
        effectiveDate: loan.start_date.toISOString().slice(0, 10),
        type: 'AUTO_LOAN_DISBURSEMENT',
        amount: loan.loan_amount,
        direction: 'DEBIT',
        sourceModule: 'AUTO',
        referenceType: 'AUTO_LOAN',
        referenceId: loan.id,
        notes: 'Historical Auto Loan Migration'
      });
      autoTotal += Number(loan.loan_amount);
    }
    console.log(`Backfilled ${autoRes.rowCount} active Auto Loans (Total Disbursement: ${autoTotal})`);

    // Daily Finance
    const dailyRes = await client.query(`SELECT finance_id, finance_date, (gross_finance_amount - initial_deduction) as net_amount FROM daily_finance_accounts WHERE status = 'ACTIVE'`);
    let dailyTotal = 0;
    for (const loan of dailyRes.rows) {
      await createLedgerEntry(client, {
        effectiveDate: loan.finance_date.toISOString().slice(0, 10),
        type: 'DAILY_LOAN_DISBURSEMENT',
        amount: loan.net_amount,
        direction: 'DEBIT',
        sourceModule: 'DAILY',
        referenceType: 'DAILY_LOAN',
        referenceId: loan.finance_id,
        notes: 'Historical Daily Loan Migration'
      });
      dailyTotal += Number(loan.net_amount);
    }
    console.log(`Backfilled ${dailyRes.rowCount} active Daily Loans (Total Disbursement: ${dailyTotal})`);

    // 4. Backfill existing collections (Payments)
    // Auto Finance Payments
    const autoPayRes = await client.query(`SELECT id, payment_date, amount_paid FROM autofinance_payments`);
    let autoPayTotal = 0;
    for (const pay of autoPayRes.rows) {
      await createLedgerEntry(client, {
        effectiveDate: pay.payment_date.toISOString().slice(0, 10),
        type: 'AUTO_COLLECTION',
        amount: pay.amount_paid,
        direction: 'CREDIT',
        sourceModule: 'AUTO',
        referenceType: 'AUTO_PAYMENT',
        referenceId: pay.id,
        notes: 'Historical Auto Payment Migration'
      });
      autoPayTotal += Number(pay.amount_paid);
    }
    console.log(`Backfilled ${autoPayRes.rowCount} Auto Payments (Total Collected: ${autoPayTotal})`);

    // Daily Finance Payments
    const dailyPayRes = await client.query(`SELECT payment_id, collection_date, amount FROM daily_finance_payments WHERE status <> 'VOID'`);
    let dailyPayTotal = 0;
    for (const pay of dailyPayRes.rows) {
      await createLedgerEntry(client, {
        effectiveDate: pay.collection_date.toISOString().slice(0, 10),
        type: 'DAILY_COLLECTION',
        amount: pay.amount,
        direction: 'CREDIT',
        sourceModule: 'DAILY',
        referenceType: 'DAILY_PAYMENT',
        referenceId: pay.payment_id,
        notes: 'Historical Daily Payment Migration'
      });
      dailyPayTotal += Number(pay.amount);
    }
    console.log(`Backfilled ${dailyPayRes.rowCount} Daily Payments (Total Collected: ${dailyPayTotal})`);

    await client.query('COMMIT');
    console.log('Backfill Migration Completed Successfully.');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Migration failed. Rolled back.', error);
  } finally {
    client.release();
    pool.end();
  }
}

runBackfill();
