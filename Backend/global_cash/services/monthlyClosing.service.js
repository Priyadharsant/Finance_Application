import { calculateMonthlyWeightedCapital } from './partnerCapital.service.js';

export async function calculateCompanyNetProfit(client, year, month) {
  // 1. Auto Finance Profit: Interest + Penalties collected in this month
  const autoQuery = `
    SELECT COALESCE(SUM(pa.allocated_amount), 0) AS auto_profit
    FROM autofinance_payment_allocations pa
    JOIN autofinance_payments p ON pa.payment_id = p.id
    WHERE EXTRACT(YEAR FROM p.payment_date) = $1 AND EXTRACT(MONTH FROM p.payment_date) = $2
    AND pa.allocation_type IN ('EMI_INTEREST', 'PENALTY');
  `;
  const autoRes = await client.query(autoQuery, [year, month]);
  const autoProfit = parseFloat(autoRes.rows[0].auto_profit);

  // 2. Daily Finance Profit: Deductions for loans disbursed this month
  const dailyQuery = `
    SELECT COALESCE(SUM(initial_deduction), 0) AS daily_profit
    FROM daily_finance_accounts
    WHERE EXTRACT(YEAR FROM finance_date) = $1 AND EXTRACT(MONTH FROM finance_date) = $2;
  `;
  const dailyRes = await client.query(dailyQuery, [year, month]);
  const dailyProfit = parseFloat(dailyRes.rows[0].daily_profit);

  // Combine
  const totalProfit = autoProfit + dailyProfit;
  return totalProfit;
}

export async function createDraftMonthlyClosing(client, year, month) {
  const periodLabel = `${year}-${String(month).padStart(2, '0')}`;

  // 1. Check if it already exists
  const checkQuery = `SELECT * FROM monthly_closings WHERE period_label = $1;`;
  const checkRes = await client.query(checkQuery, [periodLabel]);
  if (checkRes.rowCount > 0) {
    throw new Error(`Closing for period ${periodLabel} already exists.`);
  }

  // 2. Calculate company net profit
  const calculatedProfit = await calculateCompanyNetProfit(client, year, month);

  // 3. Create Draft
  const insertQuery = `
    INSERT INTO monthly_closings (period_label, status, calculated_company_profit, final_company_profit)
    VALUES ($1, 'DRAFT', $2, $2)
    RETURNING *;
  `;
  const insertRes = await client.query(insertQuery, [periodLabel, calculatedProfit]);
  const closing = insertRes.rows[0];

  // 4. Calculate partner capital and create allocations
  const partnerStats = await calculateMonthlyWeightedCapital(client, year, month);

  for (const stat of partnerStats) {
    const partnerProfit = stat.ownershipRatio * calculatedProfit;

    await client.query(`
      INSERT INTO partner_monthly_allocations (
        closing_id, partner_id, closing_capital, weighted_capital, ownership_ratio, profit_amount, status
      ) VALUES ($1, $2, $3, $4, $5, $6, 'PROFIT_ALLOCATED')
    `, [
      closing.id,
      stat.partnerId,
      stat.closingCapital,
      stat.weightedCapital,
      stat.ownershipRatio,
      partnerProfit
    ]);
  }

  return closing;
}

export async function finalizeMonthlyClosing(client, closingId, manualAdjustment = 0, adjustmentReason = null) {
  // 1. Update closing with final amounts
  const closingRes = await client.query(`
    UPDATE monthly_closings
    SET 
      manual_adjustment = $2,
      adjustment_reason = $3,
      final_company_profit = calculated_company_profit + $2,
      status = 'CLOSED',
      closed_at = NOW()
    WHERE id = $1 AND status != 'CLOSED'
    RETURNING *;
  `, [closingId, manualAdjustment, adjustmentReason]);

  if (closingRes.rowCount === 0) {
    throw new Error('Closing not found or already closed.');
  }

  const closing = closingRes.rows[0];

  // 2. Recalculate allocations based on final profit
  const allocationsRes = await client.query(`
    SELECT * FROM partner_monthly_allocations WHERE closing_id = $1;
  `, [closingId]);

  for (const alloc of allocationsRes.rows) {
    const finalPartnerProfit = parseFloat(alloc.ownership_ratio) * parseFloat(closing.final_company_profit);

    await client.query(`
      UPDATE partner_monthly_allocations
      SET profit_amount = $2, status = 'PROFIT_PAYABLE'
      WHERE id = $1;
    `, [alloc.id, finalPartnerProfit]);

    // Note: This does NOT automatically reinvest. It remains as 'PROFIT_PAYABLE'.
    // A separate action will be needed if a partner wants to withdraw or reinvest this payable amount.
  }

  return closing;
}
