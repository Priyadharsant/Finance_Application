import express from 'express';
import { pool } from '../../autoFinance/config/db.js';
import { getAvailableCapital, getCapitalBreakdown, getTransactionDetails, calculatePeriodFinancials } from '../services/globalCash.service.js';
import {
  createContribution,
  createWithdrawal,
  getPartnerCurrentCapital,
  getPartnerStats,
} from '../services/partnerCapital.service.js';
import { createDraftMonthlyClosing, finalizeMonthlyClosing } from '../services/monthlyClosing.service.js';
import {
  ensureUnifiedExpensesTable,
  recordExpense,
  getExpenses,
  deleteExpense,
  getTotalExpenses,
} from '../services/expense.service.js';
import {
  ensureProfitCalculationTables,
  calculatePartnerCapitalWeight,
  calculatePartnerProfitDistribution,
  saveProfitCalculation,
  getProfitCalculations,
  getProfitCalculationById,
  finalizeProfitCalculation,
  recordProfitPayment,
} from '../services/profitCalculation.service.js';
import {
  executeAutomatedMonthlyClosing,
  executeDailyOngoingCalculation,
  syncMonthDailyCalculations,
  getCronStatus,
} from '../services/monthlyClosingCron.service.js';

const router = express.Router();

// Initialize unified expenses and profit calculation tables on startup
ensureUnifiedExpensesTable(pool).catch((e) =>
  console.error('Failed to initialize expenses table:', e)
);
ensureProfitCalculationTables(pool).catch((e) =>
  console.error('Failed to initialize profit calculation tables:', e)
);

// --- DASHBOARD & LEDGER ---
router.get('/ledger', async (req, res) => {
  try {
    const breakdown = await getCapitalBreakdown(pool);
    const ledgerRes = await pool.query('SELECT * FROM global_cash_ledger ORDER BY transaction_date DESC LIMIT 100');
    
    res.json({
      availableCapital: breakdown.availableCapital,
      grossCapital: breakdown.grossCapital,
      totalCredits: breakdown.totalCredits,
      totalDebits: breakdown.totalDebits,
      expenses: breakdown.expenses,
      revenue: breakdown.revenue,
      netProfit: breakdown.netProfit,
      ledger: ledgerRes.rows
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/ledger/:id', async (req, res) => {
  try {
    const details = await getTransactionDetails(pool, req.params.id);
    res.json(details);
  } catch (err) {
    res.status(404).json({ error: err.message });
  }
});

// --- PERIOD FINANCIALS (REVENUE, EXPENSES & NET PROFIT ESTIMATION) ---
router.get('/period-financials', async (req, res) => {
  try {
    const { periodStart, periodEnd } = req.query;
    if (!periodStart || !periodEnd) {
      return res.status(400).json({ error: 'periodStart and periodEnd query parameters are required' });
    }
    const financials = await calculatePeriodFinancials(pool, periodStart, periodEnd);
    res.json(financials);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --- EXPENSES (UNIFIED: AUTO, DAILY, GENERAL) ---
router.get('/expenses', async (req, res) => {
  try {
    const { year, month, category, from, to, search, limit, offset } = req.query;
    const data = await getExpenses(pool, {
      year,
      month,
      category,
      from,
      to,
      search,
      limit: limit ? parseInt(limit, 10) : 200,
      offset: offset ? parseInt(offset, 10) : 0,
    });
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/expenses', async (req, res) => {
  try {
    const expense = await recordExpense(pool, req.body);
    res.status(201).json(expense);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.delete('/expenses/:id', async (req, res) => {
  try {
    const deleted = await deleteExpense(pool, req.params.id);
    res.json({ success: true, deleted });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// --- PARTNERS ---
router.get('/partners', async (req, res) => {
  try {
    const partnersRes = await pool.query('SELECT * FROM global_partners ORDER BY created_at ASC');
    const partners = partnersRes.rows;

    // Attach comprehensive stats
    for (const p of partners) {
      const stats = await getPartnerStats(pool, p.id);
      p.current_capital = stats.currentCapital;
      p.base_capital = stats.baseCapital;
      p.profit_earned = stats.totalProfitEarned;
      p.total_contributed = stats.totalContributed;
      p.total_withdrawn = stats.totalWithdrawn;
    }

    res.json(partners);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/partners/:id', async (req, res) => {
  try {
    const partnerRes = await pool.query('SELECT * FROM global_partners WHERE id = $1', [req.params.id]);
    if (!partnerRes.rows.length) {
      return res.status(404).json({ error: 'Partner not found' });
    }
    const partner = partnerRes.rows[0];
    const stats = await getPartnerStats(pool, partner.id);
    partner.current_capital = stats.currentCapital;
    partner.base_capital = stats.baseCapital;
    partner.profit_earned = stats.totalProfitEarned;
    partner.total_contributed = stats.totalContributed;
    partner.total_withdrawn = stats.totalWithdrawn;

    // Fetch transactions specifically for this partner
    const txRes = await pool.query(`
      SELECT * FROM partner_capital_transactions
      WHERE partner_id = $1
      ORDER BY effective_date DESC, transaction_timestamp DESC
    `, [partner.id]);

    res.json({
      partner,
      stats,
      transactions: txRes.rows
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/partners', async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const {
      name,
      phone,
      email,
      address,
      pan_number,
      notes,
      initialContribution,
      effectiveDate,
    } = req.body;

    if (!name || !name.trim()) {
      throw new Error('Partner name is required');
    }

    const insertRes = await client.query(
      `INSERT INTO global_partners (name, phone, email, address, pan_number, notes, status)
       VALUES ($1, $2, $3, $4, $5, $6, 'ACTIVE')
       RETURNING *`,
      [
        name.trim(),
        phone ? phone.trim() : null,
        email ? email.trim() : null,
        address ? address.trim() : null,
        pan_number ? pan_number.trim() : null,
        notes ? notes.trim() : null,
      ]
    );
    const partner = insertRes.rows[0];

    // If initial contribution provided, record it
    if (initialContribution && Number(initialContribution) > 0) {
      await createContribution(
        client,
        partner.id,
        Number(initialContribution),
        effectiveDate || new Date().toISOString().slice(0, 10),
        'Initial partner capital contribution'
      );
    }

    await client.query('COMMIT');
    const stats = await getPartnerStats(pool, partner.id);
    partner.current_capital = stats.currentCapital;
    partner.total_contributed = stats.totalContributed;
    partner.total_withdrawn = stats.totalWithdrawn;

    res.json(partner);
  } catch (err) {
    await client.query('ROLLBACK');
    res.status(400).json({ error: err.message });
  } finally {
    client.release();
  }
});

router.put('/partners/:id', async (req, res) => {
  try {
    const { name, phone, email, address, pan_number, notes, status } = req.body;
    const updateRes = await pool.query(
      `UPDATE global_partners
       SET name = COALESCE($1, name),
           phone = $2,
           email = $3,
           address = $4,
           pan_number = $5,
           notes = $6,
           status = COALESCE($7, status),
           updated_at = NOW()
       WHERE id = $8
       RETURNING *`,
      [name, phone, email, address, pan_number, notes, status, req.params.id]
    );
    if (!updateRes.rows.length) {
      return res.status(404).json({ error: 'Partner not found' });
    }
    const partner = updateRes.rows[0];
    const stats = await getPartnerStats(pool, partner.id);
    partner.current_capital = stats.currentCapital;
    partner.total_contributed = stats.totalContributed;
    partner.total_withdrawn = stats.totalWithdrawn;

    res.json(partner);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// --- PARTNER TRANSACTIONS ---
router.get('/partner-transactions', async (req, res) => {
  try {
    const txRes = await pool.query(`
      SELECT t.*, p.name as partner_name 
      FROM partner_capital_transactions t
      JOIN global_partners p ON t.partner_id = p.id
      ORDER BY effective_date DESC, transaction_timestamp DESC
      LIMIT 200
    `);
    res.json(txRes.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/partner-transactions/contribution', async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const { partnerId, amount, effectiveDate, notes } = req.body;
    
    if (!partnerId) throw new Error('Partner is required');
    if (!amount || Number(amount) <= 0) throw new Error('Valid contribution amount is required');

    const tx = await createContribution(client, partnerId, Number(amount), effectiveDate, notes);
    
    await client.query('COMMIT');
    res.json(tx);
  } catch (err) {
    await client.query('ROLLBACK');
    res.status(400).json({ error: err.message });
  } finally {
    client.release();
  }
});

router.post('/partner-transactions/withdrawal', async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const { partnerId, amount, effectiveDate, notes } = req.body;

    if (!partnerId) throw new Error('Partner is required');
    if (!amount || Number(amount) <= 0) throw new Error('Valid withdrawal amount is required');

    const tx = await createWithdrawal(client, partnerId, Number(amount), effectiveDate, notes);

    await client.query('COMMIT');
    res.json(tx);
  } catch (err) {
    await client.query('ROLLBACK');
    res.status(400).json({ error: err.message });
  } finally {
    client.release();
  }
});

// --- MONTHLY CLOSINGS ---
router.get('/monthly-closings', async (req, res) => {
  try {
    const closingsRes = await pool.query('SELECT * FROM monthly_closings ORDER BY period_label DESC');
    res.json(closingsRes.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/monthly-closings/draft', async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const { year, month } = req.body;
    
    const draft = await createDraftMonthlyClosing(client, year, month);
    
    // Fetch detailed allocations for the response
    const allocRes = await client.query(`
      SELECT a.*, p.name as partner_name
      FROM partner_monthly_allocations a
      JOIN global_partners p ON a.partner_id = p.id
      WHERE a.closing_id = $1
    `, [draft.id]);
    
    await client.query('COMMIT');
    res.json({ closing: draft, allocations: allocRes.rows });
  } catch (err) {
    await client.query('ROLLBACK');
    res.status(400).json({ error: err.message });
  } finally {
    client.release();
  }
});

router.post('/monthly-closings/:id/finalize', async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const { manualAdjustment, adjustmentReason } = req.body;
    
    const finalized = await finalizeMonthlyClosing(client, req.params.id, manualAdjustment, adjustmentReason);
    
    await client.query('COMMIT');
    res.json(finalized);
  } catch (err) {
    await client.query('ROLLBACK');
    res.status(400).json({ error: err.message });
  } finally {
    client.release();
  }
});

// Fetch draft allocations
router.get('/monthly-closings/:id/allocations', async (req, res) => {
  try {
    const allocRes = await pool.query(`
      SELECT a.*, p.name as partner_name
      FROM partner_monthly_allocations a
      JOIN global_partners p ON a.partner_id = p.id
      WHERE a.closing_id = $1
    `, [req.params.id]);
    res.json(allocRes.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --- PARTNER PROFIT / INTEREST CALCULATION (TIME-WEIGHTED CAPITAL) ---

// 1. Get Capital Weight Breakdown for a single partner in a period
router.get('/partners/:partnerId/capital-weight', async (req, res) => {
  try {
    const { periodStart, periodEnd } = req.query;
    if (!periodStart || !periodEnd) {
      return res.status(400).json({ error: 'periodStart and periodEnd query parameters are required' });
    }
    const weightData = await calculatePartnerCapitalWeight(
      pool,
      req.params.partnerId,
      periodStart,
      periodEnd
    );
    res.json(weightData);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// 2. Preview Profit Distribution without saving
router.post('/profit-calculations/preview', async (req, res) => {
  try {
    const { periodStart, periodEnd, distributableProfit } = req.body;
    const preview = await calculatePartnerProfitDistribution(pool, {
      periodStart,
      periodEnd,
      distributableProfit,
    });
    res.json(preview);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// 2b. Live Estimate for Current Ongoing Month or Any Selected Month
router.get('/this-month-estimate', async (req, res) => {
  try {
    const now = new Date();
    const qYear = parseInt(req.query.year, 10);
    const qMonth = parseInt(req.query.month, 10);

    const y = !isNaN(qYear) ? qYear : now.getFullYear();
    const m = !isNaN(qMonth) ? qMonth : now.getMonth() + 1;

    const isCurrentMonth = y === now.getFullYear() && m === now.getMonth() + 1;
    const lastDay = new Date(Date.UTC(y, m, 0)).getUTCDate();
    const periodStart = `${y}-${String(m).padStart(2, '0')}-01`;
    const periodEnd = `${y}-${String(m).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
    const todayStr = isCurrentMonth ? now.toISOString().slice(0, 10) : periodEnd;
    const daysElapsed = isCurrentMonth ? now.getDate() : lastDay;

    const effectivePeriodEnd = isCurrentMonth ? todayStr : periodEnd;

    // 1. Operational Financials (up to this date for ongoing month, full month for others)
    const financials = await calculatePeriodFinancials(pool, periodStart, effectivePeriodEnd);
    const totalRevenue = financials.totalRevenue || 0;
    const expenses = financials.expenses || 0;
    const netProfit = financials.netProfit || 0;
    const expectedDistributableProfit = Math.max(0, netProfit);

    // 2. Expected partner shares using time-weighted capital up to effective date
    let distribution = { allocations: [], totalCapitalWeight: 0 };
    if (expectedDistributableProfit > 0) {
      distribution = await calculatePartnerProfitDistribution(pool, {
        periodStart,
        periodEnd: effectivePeriodEnd,
        distributableProfit: expectedDistributableProfit,
      });
    } else {
      const sampleDist = await calculatePartnerProfitDistribution(pool, {
        periodStart,
        periodEnd: effectivePeriodEnd,
        distributableProfit: 1000,
      });
      distribution = {
        totalCapitalWeight: sampleDist.totalCapitalWeight,
        allocations: sampleDist.allocations.map((a) => ({
          ...a,
          allocatedProfit: 0,
          payableAmount: 0,
        })),
      };
    }

    const monthDate = new Date(Date.UTC(y, m - 1, 1));
    const monthName = monthDate.toLocaleString('default', {
      month: 'long',
      year: 'numeric',
      timeZone: 'UTC',
    });

    res.json({
      isCurrentMonth,
      year: y,
      month: m,
      periodStart,
      periodEnd,
      asOfDate: todayStr,
      daysElapsed,
      totalDaysInMonth: lastDay,
      monthName,
      financials: {
        autoRevenue: financials.autoRevenue || 0,
        dailyRevenue: financials.dailyRevenue || 0,
        totalRevenue,
        expenses,
        netProfit,
      },
      expectedDistributableProfit,
      totalCapitalWeight: distribution.totalCapitalWeight,
      allocations: distribution.allocations,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 3. Create and Save Profit Calculation (Draft or Finalized)
router.post('/profit-calculations', async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const { periodStart, periodEnd, distributableProfit, notes, createdBy, finalize } = req.body;
    const calculation = await saveProfitCalculation(client, {
      periodStart,
      periodEnd,
      distributableProfit,
      notes,
      createdBy,
      finalize,
    });
    await client.query('COMMIT');
    res.status(201).json(calculation);
  } catch (err) {
    await client.query('ROLLBACK');
    res.status(400).json({ error: err.message });
  } finally {
    client.release();
  }
});

// 4. List all Profit Calculations
router.get('/profit-calculations', async (req, res) => {
  try {
    const calculations = await getProfitCalculations(pool);
    res.json(calculations);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 5. Get Profit Calculation Details by ID
router.get('/profit-calculations/:id', async (req, res) => {
  try {
    const details = await getProfitCalculationById(pool, req.params.id);
    res.json(details);
  } catch (err) {
    res.status(404).json({ error: err.message });
  }
});

// 6. Finalize a Profit Calculation
router.post('/profit-calculations/:id/finalize', async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const finalized = await finalizeProfitCalculation(client, req.params.id);
    await client.query('COMMIT');
    res.json(finalized);
  } catch (err) {
    await client.query('ROLLBACK');
    res.status(400).json({ error: err.message });
  } finally {
    client.release();
  }
});

// 7. Record Partner Profit Settlement Payment
router.post('/partner-profit-payments', async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const { partnerId, allocationId, amount, paymentDate, reference, notes } = req.body;
    const result = await recordProfitPayment(client, {
      partnerId,
      allocationId,
      amount,
      paymentDate,
      reference,
      notes,
    });
    await client.query('COMMIT');
    res.status(201).json(result);
  } catch (err) {
    await client.query('ROLLBACK');
    res.status(400).json({ error: err.message });
  } finally {
    client.release();
  }
});

// --- DAY-TO-DAY CALCULATION LOGS ---
router.get('/daily-profit-logs', async (req, res) => {
  try {
    const now = new Date();
    const qYear = parseInt(req.query.year, 10);
    const qMonth = parseInt(req.query.month, 10);

    const y = !isNaN(qYear) ? qYear : now.getFullYear();
    const m = !isNaN(qMonth) ? qMonth : now.getMonth() + 1;

    const startDate = `${y}-${String(m).padStart(2, '0')}-01`;
    const lastDay = new Date(Date.UTC(y, m, 0)).getUTCDate();
    const endDate = `${y}-${String(m).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;

    let logs = await pool.query(`
      SELECT 
        id, 
        calc_date::text AS calc_date, 
        auto_revenue, 
        daily_revenue, 
        total_revenue, 
        expenses, 
        net_profit, 
        total_active_capital, 
        allocations, 
        updated_at
      FROM daily_profit_logs
      WHERE calc_date >= $1 AND calc_date <= $2
      ORDER BY calc_date ASC;
    `, [startDate, endDate]);

    // If empty and it's current month, sync automatically so user sees day-to-day data
    if (logs.rows.length === 0 && y === now.getFullYear() && m === (now.getMonth() + 1)) {
      await syncMonthDailyCalculations({ client: pool, year: y, month: m });
      logs = await pool.query(`
        SELECT 
          id, 
          calc_date::text AS calc_date, 
          auto_revenue, 
          daily_revenue, 
          total_revenue, 
          expenses, 
          net_profit, 
          total_active_capital, 
          allocations, 
          updated_at
        FROM daily_profit_logs
        WHERE calc_date >= $1 AND calc_date <= $2
        ORDER BY calc_date ASC;
      `, [startDate, endDate]);
    }

    const rows = logs.rows.map(r => {
      const netProfit = parseFloat(r.net_profit || 0);
      return {
        id: r.id,
        calcDate: String(r.calc_date).slice(0, 10),
        autoRevenue: parseFloat(r.auto_revenue || 0),
        dailyRevenue: parseFloat(r.daily_revenue || 0),
        totalRevenue: parseFloat(r.total_revenue || 0),
        expenses: parseFloat(r.expenses || 0),
        netProfit,
        status: netProfit >= 0 ? 'INCOME' : 'LOSS',
        totalActiveCapital: parseFloat(r.total_active_capital || 0),
        allocations: r.allocations || [],
        updatedAt: r.updated_at
      };
    });

    const totals = rows.reduce((acc, r) => ({
      totalRevenue: parseFloat((acc.totalRevenue + r.totalRevenue).toFixed(2)),
      autoRevenue: parseFloat((acc.autoRevenue + r.autoRevenue).toFixed(2)),
      dailyRevenue: parseFloat((acc.dailyRevenue + r.dailyRevenue).toFixed(2)),
      expenses: parseFloat((acc.expenses + r.expenses).toFixed(2)),
      netProfit: parseFloat((acc.netProfit + r.netProfit).toFixed(2)),
    }), { totalRevenue: 0, autoRevenue: 0, dailyRevenue: 0, expenses: 0, netProfit: 0 });

    res.json({
      year: y,
      month: m,
      startDate,
      endDate,
      count: rows.length,
      totals: {
        ...totals,
        status: totals.netProfit >= 0 ? 'INCOME' : 'LOSS',
      },
      logs: rows
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --- AUTOMATED DATE 1 CLOSING CRON ---
router.post('/cron/run-monthly-closing', async (req, res) => {
  try {
    const { year, month, force } = req.body || {};
    const result = await executeAutomatedMonthlyClosing({ year, month, force, client: pool });
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/cron/run-daily-calculation', async (req, res) => {
  try {
    const { date } = req.body || {};
    const result = await executeDailyOngoingCalculation({ client: pool, targetDate: date });
    res.json({ success: true, ...result });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/cron/sync-daily-logs', async (req, res) => {
  try {
    const { year, month } = req.body || {};
    const results = await syncMonthDailyCalculations({ client: pool, year, month });
    res.json({ success: true, count: results.length, results });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/cron/status', async (req, res) => {
  try {
    const status = getCronStatus();
    res.json(status);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;

