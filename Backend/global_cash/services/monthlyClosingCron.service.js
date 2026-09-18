import cron from 'node-cron';
import { pool } from '../../autoFinance/config/db.js';
import { calculatePeriodFinancials } from './globalCash.service.js';
import {
  ensureProfitCalculationTables,
  calculatePartnerProfitDistribution,
} from './profitCalculation.service.js';

let cronTask = null;
let dailyCronTask = null;
let lastExecutionResult = null;
let lastDailyCalculationResult = null;

/**
 * Helper to calculate period dates for the previous month.
 * If running on Date 1 of month M (e.g. Oct 1):
 * Returns { periodStart: '2026-09-01', periodEnd: '2026-09-30', year: 2026, month: 9 }
 */
export function getPreviousMonthPeriod(referenceDate = new Date()) {
  const ref = new Date(referenceDate);
  // Last day of previous month
  const prevMonthEnd = new Date(Date.UTC(ref.getFullYear(), ref.getMonth(), 0));
  const year = prevMonthEnd.getUTCFullYear();
  const month = prevMonthEnd.getUTCMonth() + 1;
  const lastDay = prevMonthEnd.getUTCDate();

  const periodStart = `${year}-${String(month).padStart(2, '0')}-01`;
  const periodEnd = `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;

  return { year, month, periodStart, periodEnd };
}

/**
 * Executes the automated Date 1 Monthly Closing:
 * 1. Calculates operational revenue, expenses, and net profit for the previous month.
 * 2. If net profit > 0, calculates time-weighted capital weights and partner shares.
 * 3. Finalizes the profit calculation record.
 * 4. Automatically credits each partner's share to their partner account (partner_capital_transactions)
 *    so it is immediately available in their account balance for withdrawal or compounding.
 * 5. Logs profit payment records.
 */
export async function executeAutomatedMonthlyClosing({
  year,
  month,
  force = false,
  client = pool,
} = {}) {
  await ensureProfitCalculationTables(client);

  // 1. Determine target period
  let periodStart;
  let periodEnd;
  let targetYear = year;
  let targetMonth = month;

  if (targetYear && targetMonth) {
    const y = parseInt(targetYear, 10);
    const m = parseInt(targetMonth, 10);
    const lastDay = new Date(Date.UTC(y, m, 0)).getUTCDate();
    periodStart = `${y}-${String(m).padStart(2, '0')}-01`;
    periodEnd = `${y}-${String(m).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
  } else {
    const prev = getPreviousMonthPeriod();
    targetYear = prev.year;
    targetMonth = prev.month;
    periodStart = prev.periodStart;
    periodEnd = prev.periodEnd;
  }

  console.log(`[MonthlyClosingCron] Starting automated closing for period: ${periodStart} to ${periodEnd} (force=${force})`);

  // 2. Check idempotency: has this period already been finalized?
  const existingRes = await client.query(
    `SELECT * FROM partner_profit_calculations WHERE period_start = $1 AND period_end = $2;`,
    [periodStart, periodEnd]
  );

  let existingCalc = existingRes.rows[0];
  if (existingCalc && existingCalc.status === 'FINALIZED' && !force) {
    console.log(`[MonthlyClosingCron] Period ${periodStart} to ${periodEnd} is already finalized (ID: ${existingCalc.id}). Skipping.`);
    const result = {
      success: true,
      alreadyProcessed: true,
      periodStart,
      periodEnd,
      calculationId: existingCalc.id,
      distributableProfit: parseFloat(existingCalc.distributable_profit),
      message: `Monthly closing for ${periodStart} to ${periodEnd} was already completed and finalized.`,
    };
    lastExecutionResult = { timestamp: new Date().toISOString(), ...result };
    return result;
  }

  // 3. Calculate Period Financials (Revenue, Expenses, Net Profit)
  const financials = await calculatePeriodFinancials(client, periodStart, periodEnd);
  const totalRevenue = financials.totalRevenue || 0;
  const expenses = financials.expenses || 0;
  const netProfit = financials.netProfit || 0;
  const distributableProfit = Math.max(0, netProfit);

  console.log(`[MonthlyClosingCron] Period Financials: Revenue=₹${totalRevenue}, Expenses=₹${expenses}, NetProfit=₹${netProfit}`);

  // 4. Calculate Partner Distribution using Time-Weighted Capital
  let distributionPreview = { allocations: [], totalCapitalWeight: 0 };
  if (distributableProfit > 0) {
    distributionPreview = await calculatePartnerProfitDistribution(
      client,
      {
        periodStart,
        periodEnd,
        distributableProfit,
      }
    );
  }

  // 5. Persist or Update Partner Profit Calculation record as FINALIZED
  let calculationId = existingCalc?.id;
  if (existingCalc) {
    const updateRes = await client.query(
      `UPDATE partner_profit_calculations
       SET distributable_profit = $1,
           total_capital_weight = $2,
           status = 'FINALIZED',
           finalized_at = NOW(),
           notes = $3,
           updated_at = NOW()
       WHERE id = $4
       RETURNING *;`,
      [
        distributableProfit,
        distributionPreview.totalCapitalWeight,
        `Automated Date 1 Closing (Revenue: ₹${totalRevenue.toFixed(2)}, Expenses: ₹${expenses.toFixed(2)}, Net Profit: ₹${netProfit.toFixed(2)})`,
        calculationId,
      ]
    );
    // Remove previous payments and allocations if re-running with force
    await client.query(`
      DELETE FROM partner_profit_payments 
      WHERE allocation_id IN (SELECT id FROM partner_profit_allocations WHERE calculation_id = $1);
    `, [calculationId]);
    await client.query(`DELETE FROM partner_profit_allocations WHERE calculation_id = $1;`, [calculationId]);
  } else {
    const insertRes = await client.query(
      `INSERT INTO partner_profit_calculations (
         period_start, period_end, distributable_profit, total_capital_weight,
         status, finalized_at, created_by, notes
       )
       VALUES ($1, $2, $3, $4, 'FINALIZED', NOW(), 'CRON_AUTOMATION', $5)
       RETURNING *;`,
      [
        periodStart,
        periodEnd,
        distributableProfit,
        distributionPreview.totalCapitalWeight,
        `Automated Date 1 Closing (Revenue: ₹${totalRevenue.toFixed(2)}, Expenses: ₹${expenses.toFixed(2)}, Net Profit: ₹${netProfit.toFixed(2)})`,
      ]
    );
    existingCalc = insertRes.rows[0];
    calculationId = existingCalc.id;
  }

  // 6. Save Allocations and credit each partner's account
  const partnerResults = [];
  const creditEffectiveDate = new Date().toISOString().slice(0, 10); // Date 1

  for (const alloc of distributionPreview.allocations) {
    const allocatedProfit = alloc.allocatedProfit || 0;

    // Insert allocation record with status 'CREDITED_TO_CAPITAL' and paid_amount = allocatedProfit
    const allocInsertRes = await client.query(
      `INSERT INTO partner_profit_allocations (
         calculation_id, partner_id, opening_capital, closing_capital,
         capital_weight, profit_ratio, allocated_profit, payable_amount,
         paid_amount, status
       )
       VALUES ($1, $2, $3, $4, $5, $6, $7, 0, $8, 'CREDITED_TO_CAPITAL')
       RETURNING *;`,
      [
        calculationId,
        alloc.partnerId,
        alloc.openingCapital,
        alloc.closingCapital,
        alloc.capitalWeight,
        alloc.profitRatio,
        allocatedProfit,
        allocatedProfit,
      ]
    );
    const savedAlloc = allocInsertRes.rows[0];

    // If profit > 0, credit the partner's account (partner_capital_transactions)
    let capitalTxId = null;
    if (allocatedProfit > 0) {
      // Check if profit share transaction already exists for this calculation & partner
      const txCheck = await client.query(
        `SELECT id FROM partner_capital_transactions 
         WHERE partner_id = $1 
           AND transaction_type = 'PROFIT_SHARE' 
           AND notes LIKE $2;`,
        [alloc.partnerId, `%Calculation: ${calculationId}%`]
      );

      if (txCheck.rowCount === 0) {
        const txInsertRes = await client.query(
          `INSERT INTO partner_capital_transactions (
             partner_id, transaction_type, amount, effective_date, status, notes
           )
           VALUES ($1, 'PROFIT_SHARE', $2, $3, 'COMPLETED', $4)
           RETURNING *;`,
          [
            alloc.partnerId,
            allocatedProfit,
            creditEffectiveDate,
            `Automated Net Profit Share for ${periodStart} to ${periodEnd} (Calculation: ${calculationId})`,
          ]
        );
        capitalTxId = txInsertRes.rows[0].id;

        // Also record in partner_profit_payments for comprehensive auditing
        await client.query(
          `INSERT INTO partner_profit_payments (
             partner_id, allocation_id, amount, payment_date, reference, notes
           )
           VALUES ($1, $2, $3, $4, 'AUTO_PROFIT_CREDIT', $5);`,
          [
            alloc.partnerId,
            savedAlloc.id,
            allocatedProfit,
            creditEffectiveDate,
            `Automated monthly net income credited to partner capital on date 1`,
          ]
        );
      } else {
        capitalTxId = txCheck.rows[0].id;
      }
    }

    partnerResults.push({
      partnerId: alloc.partnerId,
      partnerName: alloc.partnerName,
      profitRatio: alloc.profitRatio,
      allocatedProfit,
      capitalTransactionId: capitalTxId,
      creditedToAccount: allocatedProfit > 0,
    });
  }

  const result = {
    success: true,
    alreadyProcessed: false,
    periodStart,
    periodEnd,
    calculationId,
    financials: {
      autoRevenue: financials.autoRevenue,
      dailyRevenue: financials.dailyRevenue,
      totalRevenue,
      expenses,
      netProfit,
    },
    distributableProfit,
    totalCapitalWeight: distributionPreview.totalCapitalWeight,
    partnersCount: partnerResults.length,
    partnerAllocations: partnerResults,
    message: `Successfully calculated revenue (₹${totalRevenue.toLocaleString('en-IN')}) and distributed net profit (₹${netProfit.toLocaleString('en-IN')}) to ${partnerResults.length} partners. Capital credited & available.`,
  };

  lastExecutionResult = {
    timestamp: new Date().toISOString(),
    ...result,
  };

  console.log(`[MonthlyClosingCron] Successfully completed automated closing for ${periodStart} to ${periodEnd}`);
  return result;
}

/**
 * Daily Ongoing Calculation Routine (Runs every night at 23:59: '59 23 * * *'):
 * Calculates THAT SPECIFIC DAY's single-day income or loss (Revenue - Expenses),
 * determines each active partner's share based on active capital on that date,
 * and persists the day-to-day calculation in `daily_profit_logs`.
 */
export async function executeDailyOngoingCalculation({ client = pool, targetDate = null } = {}) {
  try {
    await ensureProfitCalculationTables(client);

    const now = new Date();
    const todayStr = targetDate || now.toISOString().slice(0, 10);
    const parts = todayStr.split('-');
    const y = parseInt(parts[0], 10);
    const m = parseInt(parts[1], 10);
    const periodStart = `${y}-${String(m).padStart(2, '0')}-01`;

    // 1. Calculate THAT SPECIFIC DAY's single-day financials (start = end = todayStr)
    const dayFin = await calculatePeriodFinancials(client, todayStr, todayStr);
    const autoRevenue = parseFloat(dayFin.autoRevenue || 0);
    const dailyRevenue = parseFloat(dayFin.dailyRevenue || 0);
    const totalRevenue = parseFloat((autoRevenue + dailyRevenue).toFixed(2));
    const expenses = parseFloat(dayFin.expenses || 0);
    const netProfit = parseFloat((totalRevenue - expenses).toFixed(2)); // > 0 = Income, < 0 = Loss

    // 2. Query each active partner's effective capital balance on todayStr
    const partnersRes = await client.query(`
      SELECT 
        p.id AS partner_id,
        p.name AS partner_name,
        COALESCE(SUM(CASE WHEN t.transaction_type IN ('CONTRIBUTION', 'CAPITAL_DEPOSIT', 'ADJUSTMENT_INCREASE', 'PROFIT_SHARE', 'PROFIT_CREDIT') THEN t.amount ELSE 0 END), 0) -
        COALESCE(SUM(CASE WHEN t.transaction_type IN ('WITHDRAWAL', 'CAPITAL_WITHDRAWAL', 'ADJUSTMENT_DECREASE', 'CAPITAL_EXIT') THEN t.amount ELSE 0 END), 0) AS capital_balance
      FROM global_partners p
      LEFT JOIN partner_capital_transactions t 
        ON p.id = t.partner_id 
        AND t.status = 'COMPLETED' 
        AND t.effective_date <= $1
      WHERE p.status = 'ACTIVE'
      GROUP BY p.id, p.name
      ORDER BY p.name ASC;
    `, [todayStr]);

    const partnerRows = partnersRes.rows;
    const totalActiveCapital = partnerRows.reduce(
      (sum, r) => sum + Math.max(0, parseFloat(r.capital_balance || 0)),
      0
    );

    // 3. Allocate today's income or loss to active partners
    const allocations = partnerRows.map((r) => {
      const cap = Math.max(0, parseFloat(r.capital_balance || 0));
      const shareRatio = totalActiveCapital > 0 ? cap / totalActiveCapital : 0;
      const shareAmount = Math.round(netProfit * shareRatio * 100) / 100;
      return {
        partnerId: r.partner_id,
        partnerName: r.partner_name,
        capitalBalance: cap,
        capitalSharePercent: parseFloat((shareRatio * 100).toFixed(2)),
        dailyShare: shareAmount, // positive = income share, negative = loss share
      };
    });

    // 4. Persist / Upsert into daily_profit_logs
    const insertRes = await client.query(`
      INSERT INTO daily_profit_logs (
        calc_date, auto_revenue, daily_revenue, total_revenue, expenses, net_profit, total_active_capital, allocations, updated_at
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, CURRENT_TIMESTAMP
      )
      ON CONFLICT (calc_date) DO UPDATE SET
        auto_revenue = EXCLUDED.auto_revenue,
        daily_revenue = EXCLUDED.daily_revenue,
        total_revenue = EXCLUDED.total_revenue,
        expenses = EXCLUDED.expenses,
        net_profit = EXCLUDED.net_profit,
        total_active_capital = EXCLUDED.total_active_capital,
        allocations = EXCLUDED.allocations,
        updated_at = CURRENT_TIMESTAMP
      RETURNING *;
    `, [
      todayStr,
      autoRevenue,
      dailyRevenue,
      totalRevenue,
      expenses,
      netProfit,
      totalActiveCapital,
      JSON.stringify(allocations),
    ]);

    // 5. Month-to-date running totals
    const mtdRes = await client.query(`
      SELECT 
        COUNT(*) as days_recorded,
        COALESCE(SUM(auto_revenue), 0) as mtd_auto_revenue,
        COALESCE(SUM(daily_revenue), 0) as mtd_daily_revenue,
        COALESCE(SUM(total_revenue), 0) as mtd_total_revenue,
        COALESCE(SUM(expenses), 0) as mtd_expenses,
        COALESCE(SUM(net_profit), 0) as mtd_net_profit
      FROM daily_profit_logs
      WHERE calc_date >= $1 AND calc_date <= $2;
    `, [periodStart, todayStr]);

    const mtdRow = mtdRes.rows[0] || {};

    lastDailyCalculationResult = {
      timestamp: new Date().toISOString(),
      calcDate: todayStr,
      periodStart,
      financials: {
        autoRevenue,
        dailyRevenue,
        totalRevenue,
        expenses,
        netProfit,
        status: netProfit >= 0 ? 'INCOME' : 'LOSS',
      },
      totalActiveCapital,
      partnersCount: allocations.length,
      allocations,
      mtdTotals: {
        daysRecorded: parseInt(mtdRow.days_recorded || 0, 10),
        totalRevenue: parseFloat(mtdRow.mtd_total_revenue || 0),
        autoRevenue: parseFloat(mtdRow.mtd_auto_revenue || 0),
        dailyRevenue: parseFloat(mtdRow.mtd_daily_revenue || 0),
        expenses: parseFloat(mtdRow.mtd_expenses || 0),
        netProfit: parseFloat(mtdRow.mtd_net_profit || 0),
        status: parseFloat(mtdRow.mtd_net_profit || 0) >= 0 ? 'INCOME' : 'LOSS',
      },
      message: `Daily calculation for ${todayStr} recorded: ${netProfit >= 0 ? 'Income' : 'Loss'} = ₹${Math.abs(netProfit).toLocaleString('en-IN')}`,
    };

    console.log(`[DailyProfitCron] Daily calculation for ${todayStr}: ${netProfit >= 0 ? 'Income' : 'Loss'} = ₹${netProfit.toFixed(2)}, Active Capital = ₹${totalActiveCapital.toFixed(2)}`);
    return lastDailyCalculationResult;
  } catch (err) {
    console.error('[DailyProfitCron] Daily calculation failed:', err);
    return null;
  }
}

/**
 * Synchronize / backfill daily calculations for all days in a month.
 */
export async function syncMonthDailyCalculations({ client = pool, year, month } = {}) {
  const now = new Date();
  const y = year || now.getFullYear();
  const m = month || now.getMonth() + 1;
  const isCurrentMonth = y === now.getFullYear() && m === now.getMonth() + 1;
  const maxDay = isCurrentMonth ? now.getDate() : new Date(Date.UTC(y, m, 0)).getUTCDate();

  const results = [];
  for (let day = 1; day <= maxDay; day++) {
    const dateStr = `${y}-${String(m).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const dayResult = await executeDailyOngoingCalculation({ client, targetDate: dateStr });
    if (dayResult) {
      results.push(dayResult);
    }
  }
  return results;
}

/**
 * Check if today is Date 1 and if previous month closing is pending.
 */
export async function checkAndRunCatchupOnDate1() {
  const today = new Date();
  const dateOfMonth = today.getDate();

  // If today is the 1st of the month, check if previous month was closed
  if (dateOfMonth === 1) {
    console.log(`[MonthlyClosingCron] Today is Date 1. Checking if previous month closing is pending...`);
    try {
      await executeAutomatedMonthlyClosing();
    } catch (err) {
      console.error(`[MonthlyClosingCron] Error during Date 1 catchup:`, err);
    }
  }
}

/**
 * Initialize both cron schedulers:
 * 1. Daily Calculation: Every day at 23:59 ('59 23 * * *')
 * 2. Monthly Final Closing: On Date 1 at 00:01 AM ('1 0 1 * *')
 */
export function initMonthlyClosingCron() {
  if (cronTask || dailyCronTask) {
    console.log('[MonthlyClosingCron] Cron schedulers already initialized.');
    return;
  }

  // Schedule 1: Daily Profit Calculation at 23:59 every day ('59 23 * * *')
  dailyCronTask = cron.schedule('59 23 * * *', async () => {
    console.log('[DailyProfitCron] Triggering end-of-day profit calculation...');
    await executeDailyOngoingCalculation();
  });
  console.log('[DailyProfitCron] Scheduled daily calculation cron at 23:59 every night (59 23 * * *).');

  // Run initial daily calculation on startup
  executeDailyOngoingCalculation().catch((e) =>
    console.error('[DailyProfitCron] Startup daily calculation failed:', e)
  );

  // Schedule 2: Monthly Final Closing at 00:01 AM on Day 1 of every month ('1 0 1 * *')
  cronTask = cron.schedule('1 0 1 * *', async () => {
    console.log('[MonthlyClosingCron] Triggered automated Date 1 monthly closing via cron schedule.');
    try {
      await executeAutomatedMonthlyClosing();
    } catch (err) {
      console.error('[MonthlyClosingCron] Cron execution failed:', err);
    }
  });
  console.log('[MonthlyClosingCron] Scheduled Date 1 automated monthly closing cron (1 0 1 * *).');

  // Also run safety catch-up check on server boot
  checkAndRunCatchupOnDate1().catch((e) =>
    console.error('[MonthlyClosingCron] Startup check failed:', e)
  );

  // Safety periodic check every 6 hours: if today is day 1 and previous month hasn't been closed, run it
  setInterval(() => {
    checkAndRunCatchupOnDate1().catch((e) =>
      console.error('[MonthlyClosingCron] Periodic Date 1 check failed:', e)
    );
  }, 6 * 60 * 60 * 1000);
}

/**
 * Returns the status of the cron schedulers.
 */
export function getCronStatus() {
  const now = new Date();
  // Next run is on the 1st of next month (or 1st of this month if today is before the 1st)
  let nextRunYear = now.getFullYear();
  let nextRunMonth = now.getMonth() + 1;
  if (now.getDate() === 1 && now.getHours() === 0 && now.getMinutes() === 0) {
    // Exactly running
  } else {
    if (nextRunMonth > 12) {
      nextRunYear += 1;
      nextRunMonth = 1;
    }
  }
  const nextRunDate = `${nextRunYear}-${String(nextRunMonth).padStart(2, '0')}-01 00:01:00`;

  return {
    active: !!cronTask,
    monthlySchedule: '1 0 1 * *',
    monthlyDescription: 'At 00:01 AM on Date 1: Finalize Month & Credit Profit to Partner Accounts',
    dailySchedule: '59 23 * * *',
    dailyDescription: 'At 11:59 PM Every Day: Calculate Daily Accumulated Profit & Active Days',
    nextScheduledRun: nextRunDate,
    lastExecution: lastExecutionResult,
    lastDailyCalculation: lastDailyCalculationResult,
  };
}
