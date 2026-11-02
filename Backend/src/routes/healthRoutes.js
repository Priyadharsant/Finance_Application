import express from 'express';
import { pool as db } from '../../autoFinance/config/db.js';

const router = express.Router();

router.all('/', async (req, res) => {
  const startTime = Date.now();
  let dbStatus = 'connected';
  let dbLatencyMs = null;
  let dbError = null;

  try {
    const t0 = Date.now();
    await db.query('SELECT 1');
    dbLatencyMs = Date.now() - t0;
  } catch (err) {
    dbStatus = 'disconnected';
    dbError = err.message;
  }

  const isHealthy = dbStatus === 'connected';

  let auditData = null;
  if (req.query.audit === 'true') {
    try {
      const [partners, ledger, daily, auto, expenses] = await Promise.all([
        db.query(`
          SELECT 
            p.id, p.name,
            COALESCE(SUM(CASE WHEN t.transaction_type = 'CONTRIBUTION' THEN t.amount ELSE 0 END), 0) as total_contributed,
            COALESCE(SUM(CASE WHEN t.transaction_type = 'WITHDRAWAL' THEN t.amount ELSE 0 END), 0) as total_withdrawn,
            COALESCE(SUM(CASE WHEN t.transaction_type = 'CONTRIBUTION' THEN t.amount ELSE 0 END), 0) -
            COALESCE(SUM(CASE WHEN t.transaction_type = 'WITHDRAWAL' THEN t.amount ELSE 0 END), 0) as current_capital
          FROM global_partners p
          LEFT JOIN partner_capital_transactions t ON p.id = t.partner_id
          GROUP BY p.id, p.name
        `),
        db.query(`
          SELECT 
            COALESCE(SUM(CASE WHEN direction = 'CREDIT' THEN amount ELSE 0 END), 0) as total_credits,
            COALESCE(SUM(CASE WHEN direction = 'DEBIT' THEN amount ELSE 0 END), 0) as total_debits,
            COALESCE(SUM(CASE WHEN direction = 'CREDIT' THEN amount ELSE 0 END), 0) -
            COALESCE(SUM(CASE WHEN direction = 'DEBIT' THEN amount ELSE 0 END), 0) as gross_capital
          FROM global_cash_ledger
        `),
        db.query(`
          SELECT 
            COUNT(*) as total_accounts,
            COALESCE(SUM(gross_finance_amount), 0) as total_gross_loans,
            COALESCE(SUM(initial_deduction), 0) as total_interest_deducted,
            COALESCE(SUM(net_disbursement), 0) as total_amount_disbursed,
            COALESCE(SUM(agreed_total_payable), 0) as total_agreed_payable,
            COALESCE((SELECT SUM(amount) FROM daily_finance_payments WHERE status <> 'VOID'), 0) as total_collected,
            COALESCE(SUM(agreed_total_payable), 0) - COALESCE((SELECT SUM(amount) FROM daily_finance_payments WHERE status <> 'VOID'), 0) as remaining_receivable
          FROM daily_finance_accounts
          WHERE status <> 'CANCELLED'
        `),
        db.query(`
          SELECT 
            COUNT(*) as total_loans,
            COALESCE(SUM(loan_amount), 0) as total_loan_amount,
            COALESCE((SELECT SUM(amount_paid) FROM autofinance_payments), 0) as total_collected,
            COALESCE((SELECT SUM(interest_paid) FROM autofinance_payments), 0) as total_interest_collected,
            COALESCE((SELECT SUM(principal_paid) FROM autofinance_payments), 0) as total_principal_collected
          FROM autofinance_loans
          WHERE status <> 'REJECTED'
        `),
        db.query(`SELECT COALESCE(SUM(amount), 0) as total_expenses FROM expenses`).catch(() => ({ rows: [{ total_expenses: 0 }] }))
      ]);

      auditData = {
        partners: partners.rows,
        ledger: ledger.rows[0],
        daily: daily.rows[0],
        auto: auto.rows[0],
        expenses: Number(expenses.rows[0]?.total_expenses || 0)
      };
    } catch (e) {
      auditData = { error: e.message };
    }
  }

  res.status(isHealthy ? 200 : 503).json({
    status: isHealthy ? 'healthy' : 'degraded',
    service: 'KAMBAM FINANCE Backend API',
    timestamp: new Date().toISOString(),
    uptimeSeconds: Math.floor(process.uptime()),
    database: {
      status: dbStatus,
      latencyMs: dbLatencyMs,
      ...(dbError ? { error: dbError } : {}),
    },
    ...(auditData ? { audit: auditData } : {}),
    responseTimeMs: Date.now() - startTime,
  });
});

export default router;
