import 'dotenv/config';
import { pool } from './autoFinance/config/db.js';

async function generateAuditReport() {
  const client = await pool.connect();
  try {
    // 1. Partners & Capital
    const partnerRes = await client.query(`
      SELECT 
        p.id, p.name,
        COALESCE(SUM(CASE WHEN t.transaction_type = 'CONTRIBUTION' THEN t.amount ELSE 0 END), 0) as total_contributed,
        COALESCE(SUM(CASE WHEN t.transaction_type = 'WITHDRAWAL' THEN t.amount ELSE 0 END), 0) as total_withdrawn,
        COALESCE(SUM(CASE WHEN t.transaction_type = 'CONTRIBUTION' THEN t.amount ELSE 0 END), 0) -
        COALESCE(SUM(CASE WHEN t.transaction_type = 'WITHDRAWAL' THEN t.amount ELSE 0 END), 0) as current_capital
      FROM global_partners p
      LEFT JOIN partner_capital_transactions t ON p.id = t.partner_id
      GROUP BY p.id, p.name
    `);

    // 2. Global Cash Ledger
    const ledgerRes = await client.query(`
      SELECT 
        COALESCE(SUM(CASE WHEN direction = 'CREDIT' THEN amount ELSE 0 END), 0) as total_credits,
        COALESCE(SUM(CASE WHEN direction = 'DEBIT' THEN amount ELSE 0 END), 0) as total_debits,
        COALESCE(SUM(CASE WHEN direction = 'CREDIT' THEN amount ELSE 0 END), 0) -
        COALESCE(SUM(CASE WHEN direction = 'DEBIT' THEN amount ELSE 0 END), 0) as gross_capital
      FROM global_cash_ledger;
    `);

    // 3. Daily Finance
    const dailyRes = await client.query(`
      SELECT 
        COUNT(*) as total_accounts,
        COALESCE(SUM(gross_finance_amount), 0) as total_gross_loans,
        COALESCE(SUM(initial_deduction), 0) as total_interest_deducted,
        COALESCE(SUM(net_disbursement), 0) as total_amount_disbursed,
        COALESCE(SUM(agreed_total_payable), 0) as total_agreed_payable,
        COALESCE((SELECT SUM(amount) FROM daily_finance_payments WHERE status <> 'VOID'), 0) as total_collected,
        COALESCE(SUM(agreed_total_payable), 0) - COALESCE((SELECT SUM(amount) FROM daily_finance_payments WHERE status <> 'VOID'), 0) as remaining_receivable
      FROM daily_finance_accounts
      WHERE status <> 'CANCELLED';
    `);

    // 4. Auto Finance
    const autoRes = await client.query(`
      SELECT 
        COUNT(*) as total_loans,
        COALESCE(SUM(loan_amount), 0) as total_loan_amount,
        COALESCE((SELECT SUM(amount_paid) FROM autofinance_payments), 0) as total_collected,
        COALESCE((SELECT SUM(interest_paid) FROM autofinance_payments), 0) as total_interest_collected,
        COALESCE((SELECT SUM(principal_paid) FROM autofinance_payments), 0) as total_principal_collected
      FROM autofinance_loans
      WHERE status <> 'REJECTED';
    `);

    // 5. Expenses
    let expensesRes = { rows: [{ total_expenses: 0 }] };
    try {
      expensesRes = await client.query(`SELECT COALESCE(SUM(amount), 0) as total_expenses FROM expenses;`);
    } catch (e) {}

    console.log("=== AUDIT SUMMARY JSON ===");
    console.log(JSON.stringify({
      partners: partnerRes.rows,
      ledger: ledgerRes.rows[0],
      daily: dailyRes.rows[0],
      auto: autoRes.rows[0],
      expenses: expensesRes.rows[0].total_expenses
    }, null, 2));

  } finally {
    client.release();
    process.exit(0);
  }
}

generateAuditReport().catch(err => {
  console.error("Audit error:", err);
  process.exit(1);
});
