import { Router } from 'express';
import { validateAndDisburseFunds, createLedgerEntry } from '../../global_cash/services/globalCash.service.js';

const datePattern = /^\d{4}-\d{2}-\d{2}$/;
const amountPattern = /^\d+(\.\d{1,2})?$/;

export function createSimpleFinanceRouter(db) {
  const router = Router();
  const customerDetailsCache = new Map();
  const CACHE_TTL_MS = 60 * 1000; // 1 minute TTL

  const invalidateCustomerCache = (customerId) => {
    if (customerId) customerDetailsCache.delete(customerId);
    else customerDetailsCache.clear();
  };

  router.get('/dashboard', async (req, res, next) => {
    try {
      const asOf = datePattern.test(String(req.query.date)) ? req.query.date : new Date().toISOString().slice(0,10);
      const [position, customers, recent] = await Promise.all([
        db.query(`SELECT
          COALESCE((SELECT SUM(gross_finance_amount) FROM daily_finance_accounts WHERE status <> 'CANCELLED'),0) AS total_finance_amount,
          COALESCE((SELECT SUM(amount) FROM daily_finance_payments WHERE status <> 'VOID'),0) AS collected,
          COALESCE((SELECT SUM(gross_finance_amount-initial_deduction) FROM daily_finance_accounts WHERE status <> 'CANCELLED'),0) AS disbursed,
          COALESCE((SELECT SUM(agreed_total_payable) FROM daily_finance_accounts WHERE status <> 'CANCELLED'),0) - COALESCE((SELECT SUM(amount) FROM daily_finance_payments WHERE status <> 'VOID'),0) AS receivable,
          COALESCE((SELECT SUM(initial_deduction) FROM daily_finance_accounts WHERE status <> 'CANCELLED'),0) AS profit,
          COALESCE((SELECT SUM(amount) FROM daily_finance_payments WHERE collection_date=$1 AND status <> 'VOID'),0) AS today_collected,
          (SELECT COUNT(*) FROM daily_finance_accounts WHERE status='ACTIVE') AS active_accounts,
          (SELECT COUNT(*) FROM daily_finance_accounts WHERE status='COMPLETED') AS completed_accounts,
          (SELECT COUNT(*) FROM daily_finance_accounts WHERE status <> 'CANCELLED') AS total_accounts,
          COALESCE((SELECT SUM(amount) FROM daily_finance_expenses),0) AS expenses,
          COALESCE((SELECT SUM(amount) FROM daily_finance_payments WHERE status <> 'VOID'),0)
          - COALESCE((SELECT SUM(gross_finance_amount-initial_deduction) FROM daily_finance_accounts WHERE status <> 'CANCELLED'),0)
          - COALESCE((SELECT SUM(amount) FROM daily_finance_expenses),0) AS in_hand`, [asOf]),
        db.query(`SELECT c.customer_id,c.customer_name,c.mobile_number,c.address,c.notes,a.finance_id,a.finance_date,a.gross_finance_amount,a.initial_deduction,a.interest_type,a.interest_value,a.net_disbursement,a.agreed_total_payable,a.daily_agreed_due,a.status,a.created_at,
          COALESCE(SUM(p.amount),0) AS total_collected,
          a.agreed_total_payable-COALESCE(SUM(p.amount),0) AS outstanding_receivable,
          a.agreed_total_payable-COALESCE(SUM(p.amount),0) AS remaining
          FROM daily_finance_customers c JOIN daily_finance_accounts a ON a.customer_id=c.customer_id
          LEFT JOIN daily_finance_payments p ON p.finance_id=a.finance_id AND p.status <> 'VOID'
          WHERE c.status='ACTIVE' AND a.status <> 'CANCELLED'
          GROUP BY c.customer_id,a.finance_id ORDER BY a.finance_date ASC, a.created_at ASC`),
        db.query(`SELECT p.payment_id,p.collection_date,p.amount,p.payment_method,c.customer_name FROM daily_finance_payments p JOIN daily_finance_customers c ON c.customer_id=p.customer_id WHERE p.status <> 'VOID' ORDER BY p.collection_date DESC,p.created_at DESC LIMIT 10`),
      ]);
      res.json({ asOf, position: position.rows[0], customers: customers.rows, recentPayments: recent.rows });
    } catch (error) { next(error); }
  });

  router.post('/customers-with-finance', async (req, res) => {
    const client = await db.connect();
    try {
      const { customerName, mobileNumber, address, notes, grossFinanceAmount, interestType = 'AMOUNT', interestValue = 0, agreedTotalPayable, dailyAgreedDue = 0, financeDate } = req.body;
      const normalizedInterestType = interestType === 'PERCENT' ? 'PERCENT' : 'AMOUNT';
      const deduction = normalizedInterestType === 'PERCENT' ? Number(grossFinanceAmount || 0) * Number(interestValue || 0) / 100 : Number(interestValue || 0);
      const payable = agreedTotalPayable || grossFinanceAmount;
      const dailyDue = dailyAgreedDue || 0;
      if (!customerName || !amountPattern.test(String(grossFinanceAmount)) || !amountPattern.test(String(interestValue || 0)) || !amountPattern.test(String(payable)) || deduction > Number(grossFinanceAmount)) throw new Error('Customer name and valid finance amounts are required');
      await client.query('BEGIN');
      await client.query('SELECT pg_advisory_xact_lock(1001);');
      
      const customer = await client.query(`INSERT INTO daily_finance_customers(customer_name,mobile_number,address,notes) VALUES($1,$2,$3,$4) RETURNING *`, [customerName.trim(), mobileNumber || null, address || null, notes || null]);
      const account = await client.query(`INSERT INTO daily_finance_accounts(customer_id,finance_date,gross_finance_amount,initial_deduction,interest_type,interest_value,agreed_total_payable,daily_agreed_due,expected_collection_days,status) VALUES($1,$2,$3,$4,$5,$6,$7,$8,0,'ACTIVE') RETURNING *`, [customer.rows[0].customer_id, datePattern.test(financeDate || '') ? financeDate : new Date().toISOString().slice(0,10), grossFinanceAmount, deduction, normalizedInterestType, interestValue || 0, payable, dailyDue]);
      
      const netDisbursementAmount = Number(grossFinanceAmount) - deduction;
      await validateAndDisburseFunds(client, {
        module: 'DAILY',
        amount: netDisbursementAmount,
        effectiveDate: account.rows[0].finance_date.toISOString().slice(0, 10),
        referenceType: 'DAILY_LOAN',
        referenceId: account.rows[0].finance_id,
        notes: `Daily Finance Loan Disbursement for Customer ${customer.rows[0].customer_id}`
      });

      await client.query('COMMIT');
      invalidateCustomerCache();
      res.status(201).json({ customer: customer.rows[0], account: account.rows[0] });
    } catch (error) { await client.query('ROLLBACK'); res.status(400).json({ error: error.message || 'Unable to create customer' }); } finally { client.release(); }
  });

  router.post('/payments', async (req, res) => {
    const client = await db.connect();
    try {
      const { customerId, financeId, collectionDate, amount, paymentMethod = 'CASH', notes } = req.body;
      if (!customerId || !financeId || !datePattern.test(collectionDate) || !amountPattern.test(String(amount))) {
        throw new Error('Customer, date, and a valid amount are required');
      }
      await client.query('BEGIN');

      const accountRes = await client.query(
        `SELECT agreed_total_payable, status FROM daily_finance_accounts WHERE finance_id=$1 FOR UPDATE`,
        [financeId]
      );
      if (!accountRes.rowCount) throw new Error('Finance account not found');
      const account = accountRes.rows[0];

      const collectedRes = await client.query(
        `SELECT COALESCE(SUM(amount), 0) AS total_collected FROM daily_finance_payments WHERE finance_id=$1 AND status <> 'VOID'`,
        [financeId]
      );
      const currentCollected = Number(collectedRes.rows[0].total_collected);
      const agreedPayable = Number(account.agreed_total_payable);
      const maxAllowed = Math.max(0, agreedPayable - currentCollected);

      if (Number(amount) > maxAllowed) {
        throw new Error(
          `Collection amount (₹${amount}) exceeds remaining loan balance. Maximum allowed is ₹${maxAllowed.toFixed(2)}.`
        );
      }

      const payment = await client.query(
        `INSERT INTO daily_finance_payments(customer_id,finance_id,collection_date,amount,payment_method,notes) VALUES($1,$2,$3,$4,$5,$6) RETURNING *`,
        [customerId, financeId, collectionDate, amount, paymentMethod, notes || null]
      );

      const newTotal = currentCollected + Number(amount);
      const newStatus = newTotal >= agreedPayable ? 'COMPLETED' : 'ACTIVE';
      await client.query(
        `UPDATE daily_finance_accounts SET status=$1, updated_at=NOW() WHERE finance_id=$2`,
        [newStatus, financeId]
      );

      await client.query(
        `INSERT INTO daily_finance_audit_logs(action,entity,entity_id,new_value) VALUES('CREATE','PAYMENT',$1,$2)`,
        [payment.rows[0].payment_id, JSON.stringify(payment.rows[0])]
      );

      await createLedgerEntry(client, {
        effectiveDate: collectionDate,
        type: 'DAILY_COLLECTION',
        amount: Number(amount),
        direction: 'CREDIT',
        sourceModule: 'DAILY',
        referenceType: 'DAILY_PAYMENT',
        referenceId: payment.rows[0].payment_id,
        notes: `Daily Finance Collection for Account ${financeId}`
      });

      await client.query('COMMIT');
      invalidateCustomerCache(customerId);
      res.status(201).json(payment.rows[0]);
    } catch (error) {
      await client.query('ROLLBACK');
      res.status(400).json({ error: error.message || 'Unable to save payment' });
    } finally {
      client.release();
    }
  });

  router.put('/payments/:paymentId', async (req, res) => {
    const client = await db.connect();
    try {
      const { collectionDate, amount, paymentMethod = 'CASH', notes } = req.body;
      if (!datePattern.test(String(collectionDate)) || !amountPattern.test(String(amount))) {
        throw new Error('Date and a valid amount are required');
      }
      await client.query('BEGIN');
      const previous = await client.query(
        `SELECT * FROM daily_finance_payments WHERE payment_id=$1 AND status <> 'VOID' FOR UPDATE`,
        [req.params.paymentId]
      );
      if (!previous.rowCount) throw new Error('Collection entry not found');

      const financeId = previous.rows[0].finance_id;
      const accountRes = await client.query(
        `SELECT agreed_total_payable, status FROM daily_finance_accounts WHERE finance_id=$1 FOR UPDATE`,
        [financeId]
      );
      if (!accountRes.rowCount) throw new Error('Finance account not found');
      const account = accountRes.rows[0];

      const otherCollectedRes = await client.query(
        `SELECT COALESCE(SUM(amount), 0) AS other_collected FROM daily_finance_payments WHERE finance_id=$1 AND payment_id <> $2 AND status <> 'VOID'`,
        [financeId, req.params.paymentId]
      );
      const otherCollected = Number(otherCollectedRes.rows[0].other_collected);
      const agreedPayable = Number(account.agreed_total_payable);
      const maxAllowed = Math.max(0, agreedPayable - otherCollected);

      if (Number(amount) > maxAllowed) {
        throw new Error(
          `Collection amount (₹${amount}) exceeds remaining loan balance. Maximum allowed is ₹${maxAllowed.toFixed(2)}.`
        );
      }

      const result = await client.query(
        `UPDATE daily_finance_payments SET collection_date=$1,amount=$2,payment_method=$3,notes=$4,updated_at=NOW() WHERE payment_id=$5 RETURNING *`,
        [collectionDate, amount, paymentMethod, notes || null, req.params.paymentId]
      );

      const newTotal = otherCollected + Number(amount);
      const newStatus = newTotal >= agreedPayable ? 'COMPLETED' : 'ACTIVE';
      await client.query(
        `UPDATE daily_finance_accounts SET status=$1, updated_at=NOW() WHERE finance_id=$2`,
        [newStatus, financeId]
      );

      await client.query(
        `INSERT INTO daily_finance_audit_logs(action,entity,entity_id,old_value,new_value) VALUES('UPDATE','PAYMENT',$1,$2,$3)`,
        [req.params.paymentId, JSON.stringify(previous.rows[0]), JSON.stringify(result.rows[0])]
      );

      const oldAmount = Number(previous.rows[0].amount);
      const newAmount = Number(amount);
      const delta = newAmount - oldAmount;

      if (delta !== 0) {
        await createLedgerEntry(client, {
          effectiveDate: collectionDate,
          type: 'ADJUSTMENT',
          amount: Math.abs(delta),
          direction: delta > 0 ? 'CREDIT' : 'DEBIT',
          sourceModule: 'DAILY',
          referenceType: 'DAILY_PAYMENT',
          referenceId: req.params.paymentId,
          notes: `Daily Finance Collection Adjustment for Account ${financeId}`
        });
      }

      await client.query('COMMIT');
      invalidateCustomerCache();
      res.json(result.rows[0]);
    } catch (error) {
      await client.query('ROLLBACK');
      res.status(400).json({ error: error.message || 'Unable to update collection' });
    } finally {
      client.release();
    }
  });

  router.get('/daily-entry', async (req, res, next) => {
    try {
      const entryDate = datePattern.test(String(req.query.date)) ? req.query.date : new Date().toISOString().slice(0, 10);
      const result = await db.query(`SELECT c.customer_id, c.customer_name, c.mobile_number,
        a.finance_id, a.finance_date, a.gross_finance_amount, a.initial_deduction,
        a.interest_type, a.interest_value, a.net_disbursement, a.agreed_total_payable,
        COALESCE(a.daily_agreed_due, 0) AS daily_agreed_due, a.status, a.created_at,
        COALESCE((SELECT SUM(x.amount) FROM daily_finance_payments x WHERE x.finance_id=a.finance_id AND x.status <> 'VOID'), 0) AS total_collected,
        COALESCE((SELECT SUM(x.amount) FROM daily_finance_payments x WHERE x.finance_id=a.finance_id AND x.collection_date=$1 AND x.status <> 'VOID'), 0) AS today_collection,
        (SELECT x.payment_id FROM daily_finance_payments x WHERE x.finance_id=a.finance_id AND x.collection_date=$1 AND x.status <> 'VOID' ORDER BY x.created_at DESC LIMIT 1) AS today_payment_id,
        (SELECT x.payment_method FROM daily_finance_payments x WHERE x.finance_id=a.finance_id AND x.collection_date=$1 AND x.status <> 'VOID' ORDER BY x.created_at DESC LIMIT 1) AS today_payment_method,
        GREATEST(a.agreed_total_payable - COALESCE((SELECT SUM(x.amount) FROM daily_finance_payments x WHERE x.finance_id=a.finance_id AND x.status <> 'VOID'), 0), 0) AS remaining
        FROM daily_finance_customers c JOIN daily_finance_accounts a ON a.customer_id=c.customer_id
        WHERE c.status='ACTIVE' AND a.status='ACTIVE' ORDER BY a.finance_date ASC, a.created_at ASC`, [entryDate]);
      res.json({ date: entryDate, customers: result.rows });
    } catch (error) { next(error); }
  });

  router.get('/customers/:customerId', async (req, res, next) => {
    try {
      const customerId = req.params.customerId;
      const cached = customerDetailsCache.get(customerId);
      if (cached && Date.now() - cached.time < CACHE_TTL_MS) {
        return res.json(cached.data);
      }

      const result = await db.query(`
        SELECT 
          COALESCE((
            SELECT json_agg(acc) FROM (
              SELECT c.customer_id, c.customer_name, c.mobile_number, c.address, c.notes,
                     a.finance_id, a.finance_date, a.gross_finance_amount, a.initial_deduction,
                     a.interest_type, a.interest_value, a.net_disbursement, a.agreed_total_payable, a.status,
                     COALESCE((SELECT SUM(p.amount) FROM daily_finance_payments p WHERE p.finance_id = a.finance_id AND p.status <> 'VOID'), 0) AS total_collected,
                     a.agreed_total_payable - COALESCE((SELECT SUM(p.amount) FROM daily_finance_payments p WHERE p.finance_id = a.finance_id AND p.status <> 'VOID'), 0) AS remaining
              FROM daily_finance_customers c
              JOIN daily_finance_accounts a ON a.customer_id = c.customer_id
              WHERE c.customer_id = $1
              ORDER BY (a.status = 'ACTIVE') DESC, a.finance_date DESC, a.created_at DESC
            ) acc
          ), '[]'::json) AS accounts,
          COALESCE((
            SELECT json_agg(pay) FROM (
              SELECT p.payment_id, p.finance_id, p.collection_date, p.amount, p.payment_method, p.notes, p.created_at, p.updated_at,
                     GREATEST(COALESCE(a.agreed_total_payable, 0) - SUM(p.amount) OVER (PARTITION BY p.finance_id ORDER BY p.collection_date, p.created_at, p.payment_id), 0) AS remaining
              FROM daily_finance_payments p
              LEFT JOIN daily_finance_accounts a ON a.finance_id = p.finance_id
              WHERE p.customer_id = $1 AND p.status <> 'VOID'
              ORDER BY p.collection_date DESC, p.created_at DESC
            ) pay
          ), '[]'::json) AS collections;
      `, [customerId]);

      const accounts = result.rows[0]?.accounts || [];
      const collections = result.rows[0]?.collections || [];

      if (!accounts.length) {
        return res.status(404).json({ error: 'Customer not found' });
      }

      const activeAccount = accounts[0];
      const payload = { customer: activeAccount, accounts, collections };

      if (customerDetailsCache.size > 500) customerDetailsCache.clear();
      customerDetailsCache.set(customerId, { time: Date.now(), data: payload });

      res.json(payload);
    } catch (error) { next(error); }
  });

  router.get('/reports/summary', async (req, res, next) => {
    try {
      const from = datePattern.test(String(req.query.from)) ? req.query.from : '2000-01-01';
      const to = datePattern.test(String(req.query.to)) ? req.query.to : new Date().toISOString().slice(0,10);
      const result = await db.query(`SELECT $1::date AS from_date,$2::date AS to_date,
        COALESCE((SELECT SUM(amount) FROM daily_finance_payments WHERE collection_date BETWEEN $1 AND $2 AND status <> 'VOID'),0) AS total_collected,
        0 AS historical_collected,
        COALESCE((SELECT SUM(amount) FROM daily_finance_expenses WHERE expense_date BETWEEN $1 AND $2),0) AS total_expenses,
        COALESCE((SELECT SUM(gross_finance_amount-initial_deduction) FROM daily_finance_accounts WHERE finance_date BETWEEN $1 AND $2 AND status <> 'CANCELLED'),0) AS net_disbursement`, [from, to]);
      res.json(result.rows[0]);
    } catch (error) { next(error); }
  });

  router.get('/reports/collection-dates', async (req, res, next) => {
    try {
      const result = await db.query(`
        SELECT DISTINCT collection_date::date AS collection_date
        FROM daily_finance_payments
        WHERE status <> 'VOID'
        ORDER BY collection_date::date ASC
      `);
      res.json({ dates: result.rows.map((row) => row.collection_date) });
    } catch (error) { next(error); }
  });

  router.get('/reports/customers', async (req, res, next) => {
    try {
      const from = datePattern.test(String(req.query.from)) ? req.query.from : '2000-01-01';
      const to = datePattern.test(String(req.query.to)) ? req.query.to : new Date().toISOString().slice(0, 10);
      const customerId = String(req.query.customerId || '').trim();
      const scope = String(req.query.scope || 'all').trim();
      const statusFilter = String(req.query.status || '').trim();
      const search = String(req.query.search || '').trim();

      const params = [from, to];
      const conditions = ["a.status <> 'CANCELLED'"];

      if (/^[0-9a-f-]{36}$/i.test(customerId)) {
        conditions.push(`c.customer_id=$${params.length + 1}`);
        params.push(customerId);
      }
      if (['ACTIVE', 'COMPLETED', 'CLOSED'].includes(statusFilter)) {
        conditions.push(`a.status=$${params.length + 1}`);
        params.push(statusFilter);
      }
      if (search) {
        conditions.push(`(c.customer_name ILIKE $${params.length + 1} OR c.mobile_number ILIKE $${params.length + 1})`);
        params.push(`%${search}%`);
      }

      let havingClause = '';
      if (scope === 'period_activity') {
        havingClause = 'HAVING (COALESCE(SUM(p.amount),0) > 0 OR (a.finance_date::date BETWEEN $1::date AND $2::date))';
      } else if (scope === 'collections') {
        havingClause = 'HAVING COALESCE(SUM(p.amount),0) > 0';
      } else if (scope === 'disbursed') {
        havingClause = 'HAVING (a.finance_date::date BETWEEN $1::date AND $2::date)';
      }

      const queryStr = `
        SELECT c.customer_id, c.customer_name, c.mobile_number, c.address, c.notes,
          a.finance_id, a.finance_date, a.gross_finance_amount, a.initial_deduction,
          a.interest_type, a.interest_value, a.net_disbursement, a.agreed_total_payable, a.status, a.created_at,
          COALESCE(SUM(p.amount),0) AS period_collected,
          COALESCE((SELECT SUM(allp.amount) FROM daily_finance_payments allp WHERE allp.finance_id=a.finance_id AND allp.status <> 'VOID'),0) AS total_collected,
          a.agreed_total_payable - COALESCE((SELECT SUM(allp.amount) FROM daily_finance_payments allp WHERE allp.finance_id=a.finance_id AND allp.status <> 'VOID'),0) AS remaining,
          a.initial_deduction AS profit,
          CASE WHEN a.finance_date::date BETWEEN $1::date AND $2::date THEN a.gross_finance_amount ELSE 0 END AS period_finance_amount,
          CASE WHEN a.finance_date::date BETWEEN $1::date AND $2::date THEN a.net_disbursement ELSE 0 END AS period_disbursement,
          CASE WHEN a.finance_date::date BETWEEN $1::date AND $2::date THEN a.initial_deduction ELSE 0 END AS period_profit
        FROM daily_finance_customers c
        JOIN daily_finance_accounts a ON a.customer_id=c.customer_id
        LEFT JOIN daily_finance_payments p ON p.finance_id=a.finance_id AND p.status <> 'VOID' AND p.collection_date::date BETWEEN $1::date AND $2::date
        WHERE ${conditions.join(' AND ')}
        GROUP BY c.customer_id, a.finance_id
        ${havingClause}
        ORDER BY a.finance_date ASC, a.created_at ASC
      `;

      const result = await db.query(queryStr, params);

      const totals = result.rows.reduce(
        (sum, row) => ({
          financeAmount: sum.financeAmount + Number(row.gross_finance_amount || 0),
          periodFinanceAmount: sum.periodFinanceAmount + Number(row.period_finance_amount || 0),
          given: sum.given + Number(row.net_disbursement || 0),
          periodDisbursed: sum.periodDisbursed + Number(row.period_disbursement || 0),
          totalReturn: sum.totalReturn + Number(row.agreed_total_payable || 0),
          periodCollected: sum.periodCollected + Number(row.period_collected || 0),
          returned: sum.returned + Number(row.total_collected || 0),
          remaining: sum.remaining + Number(row.remaining || 0),
          profit: sum.profit + Number(row.profit || 0),
          periodProfit: sum.periodProfit + Number(row.period_profit || 0),
        }),
        {
          financeAmount: 0,
          periodFinanceAmount: 0,
          given: 0,
          periodDisbursed: 0,
          totalReturn: 0,
          periodCollected: 0,
          returned: 0,
          remaining: 0,
          profit: 0,
          periodProfit: 0,
        }
      );

      res.json({ from, to, scope, totals, customers: result.rows });
    } catch (error) { next(error); }
  });

  router.post('/expenses', async (req, res) => {
    try {
      const { expenseDate, amount, description } = req.body;
      if (!datePattern.test(String(expenseDate)) || !amountPattern.test(String(amount)) || !description?.trim()) throw new Error('Date, amount, and description are required');
      const result = await db.query(`INSERT INTO daily_finance_expenses(expense_date,amount,description) VALUES($1,$2,$3) RETURNING *`, [expenseDate, amount, description.trim()]);
      await db.query(`INSERT INTO daily_finance_audit_logs(action,entity,entity_id,new_value) VALUES('CREATE','EXPENSE',$1,$2)`, [result.rows[0].expense_id, JSON.stringify(result.rows[0])]);
      
      // Also sync to unified expenses table with category = 'DAILY'
      try {
        await db.query(`
          INSERT INTO expenses(id, expense_date, amount, category, expense_type, description)
          VALUES($1, $2, $3, 'DAILY', 'DAILY_OPERATIONAL', $4)
          ON CONFLICT (id) DO NOTHING;
        `, [result.rows[0].expense_id, expenseDate, amount, description.trim()]);
      } catch (err) {
        console.error('Unified expenses sync error:', err);
      }

      res.status(201).json(result.rows[0]);
    } catch (error) { res.status(400).json({ error: error.message || 'Unable to save expense' }); }
  });

  router.get('/expenses', async (req, res, next) => {
    try { const result = await db.query(`SELECT * FROM daily_finance_expenses WHERE expense_date BETWEEN $1 AND $2 ORDER BY expense_date DESC`, [req.query.from || '2000-01-01', req.query.to || '2999-12-31']); res.json(result.rows); } catch (error) { next(error); }
  });

  router.post('/capital', async (req, res) => {
    try {
      const { date, type, amount, description } = req.body;
      if (!datePattern.test(String(date)) || !['CAPITAL_RECEIVED', 'CAPITAL_RETURNED'].includes(type) || !amountPattern.test(String(amount))) throw new Error('Date, type, and valid amount are required');
      const result = await db.query(`INSERT INTO daily_finance_capital_transactions(date,type,amount,description) VALUES($1,$2,$3,$4) RETURNING *`, [date, type, amount, description || null]);
      await db.query(`INSERT INTO daily_finance_audit_logs(action,entity,entity_id,new_value) VALUES('CREATE','CAPITAL',$1,$2)`, [result.rows[0].capital_transaction_id, JSON.stringify(result.rows[0])]);
      res.status(201).json(result.rows[0]);
    } catch (error) { res.status(400).json({ error: error.message || 'Unable to save capital transaction' }); }
  });

  router.get('/capital/balance', async (req, res, next) => {
    try { const result = await db.query(`SELECT COALESCE(SUM(amount) FILTER (WHERE type='CAPITAL_RECEIVED'),0) AS received,COALESCE(SUM(amount) FILTER (WHERE type='CAPITAL_RETURNED'),0) AS returned,COALESCE(SUM(amount) FILTER (WHERE type='CAPITAL_RECEIVED'),0)-COALESCE(SUM(amount) FILTER (WHERE type='CAPITAL_RETURNED'),0) AS outstanding FROM daily_finance_capital_transactions`); res.json(result.rows[0]); } catch (error) { next(error); }
  });

  router.post('/daily-closing', async (req, res) => {
    try {
      const { closingDate, notes } = req.body;
      if (!datePattern.test(String(closingDate))) throw new Error('A valid closing date is required');
      const result = await db.query(`WITH values AS (SELECT $1::date AS day,COALESCE((SELECT SUM(a.daily_agreed_due) FROM daily_finance_accounts a WHERE a.status='ACTIVE'),0) AS expected,COALESCE((SELECT SUM(amount) FROM daily_finance_payments WHERE collection_date=$1 AND status <> 'VOID'),0) AS actual,COALESCE((SELECT SUM(amount) FROM daily_finance_expenses WHERE expense_date=$1),0) AS expenses,COALESCE((SELECT SUM(gross_finance_amount-initial_deduction) FROM daily_finance_accounts WHERE finance_date=$1),0) AS disbursement) INSERT INTO daily_finance_daily_closings(closing_date,expected_collection,actual_collection,pending_collection,finance_disbursement,expenses,status,closed_at,notes) SELECT day,expected,actual,GREATEST(expected-actual,0),disbursement,expenses,'CLOSED',NOW(),$2 FROM values ON CONFLICT(closing_date) DO UPDATE SET actual_collection=EXCLUDED.actual_collection,pending_collection=EXCLUDED.pending_collection,finance_disbursement=EXCLUDED.finance_disbursement,expenses=EXCLUDED.expenses,status='CLOSED',closed_at=NOW(),notes=EXCLUDED.notes,updated_at=NOW() RETURNING *`, [closingDate, notes || null]);
      res.status(201).json(result.rows[0]);
    } catch (error) { res.status(400).json({ error: error.message || 'Unable to close day' }); }
  });

  router.get('/audit', async (req, res, next) => {
    try { const result = await db.query(`SELECT * FROM daily_finance_audit_logs ORDER BY timestamp DESC LIMIT $1`, [Math.min(Number(req.query.limit) || 100, 500)]); res.json(result.rows); } catch (error) { next(error); }
  });

  // ==========================================================================
  // CLOSE LOAN EARLY (ANYTIME)
  // ==========================================================================
  router.post('/accounts/:financeId/close', async (req, res) => {
    const client = await db.connect();
    try {
      const { financeId } = req.params;
      const { settlementAmount, collectionDate, paymentMethod = 'CASH', notes } = req.body;
      const effDate = datePattern.test(String(collectionDate)) ? collectionDate : new Date().toISOString().slice(0, 10);

      await client.query('BEGIN');
      const accountRes = await client.query(`SELECT * FROM daily_finance_accounts WHERE finance_id = $1 FOR UPDATE`, [financeId]);
      if (!accountRes.rowCount) throw new Error('Finance account not found');
      const account = accountRes.rows[0];

      if (account.status === 'COMPLETED') throw new Error('This finance account is already completed');
      if (account.status === 'CANCELLED') throw new Error('This finance account has been cancelled');

      const collectedRes = await client.query(
        `SELECT COALESCE(SUM(amount), 0) AS total_collected FROM daily_finance_payments WHERE finance_id = $1 AND status <> 'VOID'`,
        [financeId]
      );
      const totalCollectedSoFar = Number(collectedRes.rows[0].total_collected || 0);
      const currentRemaining = Math.max(0, Number(account.agreed_total_payable) - totalCollectedSoFar);

      const settleAmt = settlementAmount !== undefined && settlementAmount !== null && settlementAmount !== ''
        ? Number(settlementAmount)
        : currentRemaining;

      if (isNaN(settleAmt) || settleAmt < 0) {
        throw new Error('Valid settlement amount is required (0 or greater)');
      }

      const discountAmt = req.body.discountAmount !== undefined && req.body.discountAmount !== null && req.body.discountAmount !== ''
        ? Math.max(0, Number(req.body.discountAmount))
        : Math.max(0, currentRemaining - settleAmt);

      let payment = null;
      if (settleAmt > 0) {
        const payRes = await client.query(
          `INSERT INTO daily_finance_payments(customer_id, finance_id, collection_date, amount, payment_method, notes)
           VALUES($1, $2, $3, $4, $5, $6) RETURNING *`,
          [account.customer_id, financeId, effDate, settleAmt, paymentMethod, notes || 'Early Loan Closure Settlement']
        );
        payment = payRes.rows[0];

        // Global Cash Ledger Entry (Credit)
        await createLedgerEntry(client, {
          effectiveDate: effDate,
          type: 'DAILY_COLLECTION',
          amount: settleAmt,
          direction: 'CREDIT',
          sourceModule: 'DAILY',
          referenceType: 'LOAN_CLOSURE',
          referenceId: payment.payment_id,
          notes: `Daily Finance Early Closure Settlement for Customer ${account.customer_id}`
        });
      }

      // Reconcile total agreed payable to match actual total collected so remaining becomes 0
      const finalTotalPayable = totalCollectedSoFar + settleAmt;
      const updatedAccountRes = await client.query(
        `UPDATE daily_finance_accounts
         SET agreed_total_payable = $1, status = 'COMPLETED', updated_at = NOW()
         WHERE finance_id = $2 RETURNING *`,
        [finalTotalPayable, financeId]
      );

      // Record early closure discount in expenses if discountAmt > 0
      let dailyExp = null;
      if (discountAmt > 0) {
        const custRes = await client.query(
          `SELECT customer_name FROM daily_finance_customers WHERE customer_id = $1`,
          [account.customer_id]
        );
        const custName = custRes.rows[0]?.customer_name || `Customer #${account.customer_id}`;
        const expDesc = `Early Loan Closure Discount - ${custName}${notes ? ` - ${notes}` : ''}`;

        const expRes = await client.query(
          `INSERT INTO daily_finance_expenses(expense_date, amount, description)
           VALUES($1, $2, $3) RETURNING *`,
          [effDate, discountAmt, expDesc]
        );
        dailyExp = expRes.rows[0];

        await client.query(
          `INSERT INTO daily_finance_audit_logs(action, entity, entity_id, new_value)
           VALUES('CREATE', 'EXPENSE', $1, $2)`,
          [dailyExp.expense_id, JSON.stringify(dailyExp)]
        );

        // Also sync to unified expenses table with category = 'DAILY'
        try {
          await client.query(`
            INSERT INTO expenses(id, expense_date, amount, category, expense_type, description, finance_id)
            VALUES($1, $2, $3, 'DAILY', 'LOAN_CLOSURE_DISCOUNT', $4, $5)
            ON CONFLICT (id) DO UPDATE SET amount = EXCLUDED.amount, description = EXCLUDED.description;
          `, [dailyExp.expense_id, effDate, discountAmt, expDesc, financeId]);
        } catch (syncErr) {
          console.error('Unified expenses sync error:', syncErr);
        }
      }

      await client.query(
        `INSERT INTO daily_finance_audit_logs(action, entity, entity_id, old_value, new_value, reason)
         VALUES('CLOSE_LOAN_EARLY', 'ACCOUNT', $1, $2, $3, $4)`,
        [financeId, JSON.stringify(account), JSON.stringify(updatedAccountRes.rows[0]), notes || (discountAmt > 0 ? `Early loan closure with ₹${discountAmt} discount` : 'Early loan closure')]
      );

      await client.query('COMMIT');
      invalidateCustomerCache();
      res.json({
        success: true,
        message: 'Loan successfully closed early',
        account: updatedAccountRes.rows[0],
        payment,
        discountAmount: discountAmt,
        expense: dailyExp
      });
    } catch (error) {
      await client.query('ROLLBACK');
      res.status(400).json({ error: error.message || 'Unable to close loan early' });
    } finally {
      client.release();
    }
  });

  // ==========================================================================
  // INCREASE LOAN AMOUNT (TOP-UP / REFINANCE)
  // Closes previous loan and starts a new loan with previous balance deducted from cash given
  // ==========================================================================
  router.post('/accounts/:financeId/increase-amount', async (req, res) => {
    const client = await db.connect();
    try {
      const { financeId } = req.params;
      const {
        newLoanAmount,
        additionalAmount,
        interestType = 'PERCENT',
        interestValue = 0,
        dailyAgreedDue = 0,
        effectiveDate,
        notes
      } = req.body;

      const effDate = datePattern.test(String(effectiveDate)) ? effectiveDate : new Date().toISOString().slice(0, 10);

      await client.query('BEGIN');
      await client.query('SELECT pg_advisory_xact_lock(1001);');

      const accountRes = await client.query(`SELECT * FROM daily_finance_accounts WHERE finance_id = $1 FOR UPDATE`, [financeId]);
      if (!accountRes.rowCount) throw new Error('Finance account not found');
      const account = accountRes.rows[0];

      if (account.status === 'CANCELLED') throw new Error('Cannot increase amount on a cancelled loan');
      if (account.status === 'COMPLETED') throw new Error('This loan is already completed');

      // Calculate previous loan's total collected so far and remaining balance
      const collectedRes = await client.query(
        `SELECT COALESCE(SUM(amount), 0) AS total_collected FROM daily_finance_payments WHERE finance_id = $1 AND status <> 'VOID'`,
        [financeId]
      );
      const totalCollectedSoFar = Number(collectedRes.rows[0].total_collected || 0);
      const previousRemaining = Math.max(0, Number(account.agreed_total_payable) - totalCollectedSoFar);

      // Determine new gross loan amount (from newLoanAmount or additionalAmount)
      let newGross = 0;
      if (newLoanAmount !== undefined && newLoanAmount !== null && newLoanAmount !== '') {
        newGross = Number(newLoanAmount);
      } else if (additionalAmount !== undefined && additionalAmount !== null && additionalAmount !== '') {
        newGross = previousRemaining + Number(additionalAmount);
      }

      if (!newGross || isNaN(newGross) || newGross <= 0) {
        throw new Error('A valid new loan amount greater than 0 is required');
      }

      const normalizedInterestType = interestType === 'PERCENT' ? 'PERCENT' : 'AMOUNT';
      const interestDeduction = normalizedInterestType === 'PERCENT'
        ? Math.round((newGross * Number(interestValue || 0)) / 100)
        : Number(interestValue || 0);

      if (isNaN(interestDeduction) || interestDeduction < 0 || interestDeduction >= newGross) {
        throw new Error('Interest deduction must be between 0 and the new loan amount');
      }

      // Customer receives: (New Loan Amount - Interest) - Previous Loan Balance
      const standardDisbursement = newGross - interestDeduction;
      const actualCashHandedOver = standardDisbursement - previousRemaining;

      if (actualCashHandedOver < 0) {
        throw new Error(`New loan payout (₹${standardDisbursement}) cannot be less than the previous loan balance (₹${previousRemaining})`);
      }

      // 1. Settle and close previous loan
      let settlementPayment = null;
      if (previousRemaining > 0) {
        const payRes = await client.query(
          `INSERT INTO daily_finance_payments(customer_id, finance_id, collection_date, amount, payment_method, notes)
           VALUES($1, $2, $3, $4, 'TRANSFER', $5) RETURNING *`,
          [
            account.customer_id,
            financeId,
            effDate,
            previousRemaining,
            'Settled via Loan Refinance / Top-Up'
          ]
        );
        settlementPayment = payRes.rows[0];
      }

      const closedNotes = account.notes
        ? `${account.notes} | Closed via Top-Up Refinance`
        : 'Closed via Top-Up Refinance';
      await client.query(
        `UPDATE daily_finance_accounts
         SET status = 'COMPLETED', notes = $1, updated_at = NOW()
         WHERE finance_id = $2`,
        [closedNotes, financeId]
      );

      // 2. Create the new loan record
      const newLoanNotes = notes || `Top-up Refinance (Previous balance ₹${previousRemaining} settled; Net cash given: ₹${actualCashHandedOver})`;
      const insertAccountRes = await client.query(
        `INSERT INTO daily_finance_accounts(
           customer_id, finance_date, gross_finance_amount, initial_deduction,
           interest_type, interest_value, agreed_total_payable, daily_agreed_due,
           expected_collection_days, status, notes
         ) VALUES($1, $2, $3, $4, $5, $6, $7, $8, 0, 'ACTIVE', $9) RETURNING *`,
        [
          account.customer_id,
          effDate,
          newGross,
          interestDeduction,
          normalizedInterestType,
          interestValue || 0,
          newGross,
          Number(dailyAgreedDue || 0),
          newLoanNotes
        ]
      );
      const newAccount = insertAccountRes.rows[0];

      // 3. Disburse only the actual physical cash handed over from Global Cash
      if (actualCashHandedOver > 0) {
        await validateAndDisburseFunds(client, {
          module: 'DAILY',
          amount: actualCashHandedOver,
          effectiveDate: effDate,
          referenceType: 'DAILY_LOAN',
          referenceId: newAccount.finance_id,
          notes: `Daily Finance Top-Up Loan Disbursement for Customer ${account.customer_id} (Net Cash Given: ₹${actualCashHandedOver})`
        });
      }

      // 4. Audit Logs
      await client.query(
        `INSERT INTO daily_finance_audit_logs(action, entity, entity_id, old_value, new_value, reason)
         VALUES('CLOSE_LOAN_VIA_TOPUP', 'ACCOUNT', $1, $2, $3, $4)`,
        [financeId, JSON.stringify(account), JSON.stringify({ status: 'COMPLETED' }), `Closed via top-up into new loan ${newAccount.finance_id}`]
      );
      await client.query(
        `INSERT INTO daily_finance_audit_logs(action, entity, entity_id, new_value, reason)
         VALUES('CREATE_TOPUP_LOAN', 'ACCOUNT', $1, $2, $3)`,
        [newAccount.finance_id, JSON.stringify(newAccount), `New top-up loan created from previous loan ${financeId}`]
      );

      await client.query('COMMIT');
      invalidateCustomerCache();
      res.json({
        success: true,
        message: 'Previous loan closed and new loan started successfully',
        previousAccount: { ...account, status: 'COMPLETED' },
        settlementPayment,
        newAccount,
        previousBalanceSettled: previousRemaining,
        netCashDisbursed: actualCashHandedOver
      });
    } catch (error) {
      await client.query('ROLLBACK');
      res.status(400).json({ error: error.message || 'Unable to increase loan amount' });
    } finally {
      client.release();
    }
  });

  return router;
}
