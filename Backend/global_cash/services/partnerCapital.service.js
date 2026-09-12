import { createLedgerEntry } from './globalCash.service.js';

export async function createContribution(client, partnerId, amount, effectiveDate, notes) {
  if (amount <= 0) throw new Error("Contribution amount must be > 0");

  const date = effectiveDate || new Date().toISOString().slice(0, 10);

  // 1. Insert Partner Capital Transaction
  const capQuery = `
    INSERT INTO partner_capital_transactions (
      partner_id, transaction_type, amount, effective_date, status, notes
    )
    VALUES ($1, 'CONTRIBUTION', $2, $3, 'COMPLETED', $4)
    RETURNING *;
  `;
  const capRes = await client.query(capQuery, [partnerId, amount, date, notes]);
  const capitalTransaction = capRes.rows[0];

  // 2. Insert Global Cash Ledger Entry
  await createLedgerEntry(client, {
    effectiveDate: date,
    type: 'PARTNER_CONTRIBUTION',
    amount: amount,
    direction: 'CREDIT',
    sourceModule: 'GLOBAL',
    referenceType: 'CAPITAL_TRANSACTION',
    referenceId: capitalTransaction.id,
    notes: notes
  });

  return capitalTransaction;
}

export async function createWithdrawal(client, partnerId, amount, effectiveDate, notes) {
  if (amount <= 0) throw new Error("Withdrawal amount must be > 0");

  const currentCapital = await getPartnerCurrentCapital(client, partnerId);
  if (amount > currentCapital) {
    throw new Error(
      `Insufficient partner capital. Partner only has ₹${Number(currentCapital).toLocaleString('en-IN', { minimumFractionDigits: 2 })} available to withdraw.`
    );
  }

  const date = effectiveDate || new Date().toISOString().slice(0, 10);

  // 1. Insert Partner Capital Transaction (WITHDRAWAL)
  const capQuery = `
    INSERT INTO partner_capital_transactions (
      partner_id, transaction_type, amount, effective_date, status, notes
    )
    VALUES ($1, 'WITHDRAWAL', $2, $3, 'COMPLETED', $4)
    RETURNING *;
  `;
  const capRes = await client.query(capQuery, [partnerId, amount, date, notes]);
  const capitalTransaction = capRes.rows[0];

  // 2. Insert Global Cash Ledger Entry (DEBIT)
  await createLedgerEntry(client, {
    effectiveDate: date,
    type: 'PARTNER_WITHDRAWAL',
    amount: amount,
    direction: 'DEBIT',
    sourceModule: 'GLOBAL',
    referenceType: 'CAPITAL_TRANSACTION',
    referenceId: capitalTransaction.id,
    notes: notes || 'Capital withdrawal by partner'
  });

  return capitalTransaction;
}

export async function getPartnerStats(client, partnerId) {
  const query = `
    SELECT 
      COALESCE(SUM(CASE WHEN transaction_type IN ('CONTRIBUTION', 'ADJUSTMENT_INCREASE', 'CAPITAL_DEPOSIT') THEN amount ELSE 0 END), 0) AS base_capital,
      COALESCE(SUM(CASE WHEN transaction_type = 'PROFIT_SHARE' THEN amount ELSE 0 END), 0) AS profit_from_tx,
      COALESCE(SUM(CASE WHEN transaction_type IN ('CONTRIBUTION', 'ADJUSTMENT_INCREASE', 'PROFIT_SHARE', 'CAPITAL_DEPOSIT') THEN amount ELSE 0 END), 0) AS total_contributed,
      COALESCE(SUM(CASE WHEN transaction_type IN ('WITHDRAWAL', 'ADJUSTMENT_DECREASE', 'CAPITAL_EXIT') THEN amount ELSE 0 END), 0) AS total_withdrawn
    FROM partner_capital_transactions
    WHERE partner_id = $1 AND status = 'COMPLETED';
  `;
  const res = await client.query(query, [partnerId]);
  const row = res.rows[0];
  const baseCapital = parseFloat(row.base_capital);
  let totalProfitEarned = parseFloat(row.profit_from_tx);

  // If there are finalized profit allocations not yet in capital transactions, also check allocations
  if (totalProfitEarned === 0) {
    try {
      const allocRes = await client.query(`
        SELECT COALESCE(SUM(allocated_profit), 0) AS alloc_profit
        FROM partner_profit_allocations a
        JOIN partner_profit_calculations c ON a.calculation_id = c.id
        WHERE a.partner_id = $1 AND c.status = 'FINALIZED';
      `, [partnerId]);
      totalProfitEarned = parseFloat(allocRes.rows[0].alloc_profit || 0);
    } catch (e) {
      // ignore if table doesn't exist
    }
  }

  const totalContributed = baseCapital + totalProfitEarned;
  const totalWithdrawn = parseFloat(row.total_withdrawn);
  const currentCapital = totalContributed - totalWithdrawn;

  return {
    baseCapital,
    totalProfitEarned,
    totalContributed,
    totalWithdrawn,
    currentCapital, // Total Amount (+ Profit)
  };
}

export async function getPartnerCurrentCapital(client, partnerId) {
  const stats = await getPartnerStats(client, partnerId);
  return stats.currentCapital;
}

export async function calculateMonthlyWeightedCapital(client, year, month) {
  // 1. Determine start and end dates
  const startDate = new Date(year, month - 1, 1);
  const endDate = new Date(year, month, 0); // last day of the month
  const totalDaysInMonth = endDate.getDate();

  const startDateStr = startDate.toISOString().slice(0, 10);
  const endDateStr = endDate.toISOString().slice(0, 10);

  // 2. Fetch all completed transactions for all partners on or before the end date
  const query = `
    SELECT 
      partner_id,
      transaction_type,
      amount,
      effective_date
    FROM partner_capital_transactions
    WHERE status = 'COMPLETED' AND effective_date <= $1
    ORDER BY effective_date ASC, transaction_timestamp ASC;
  `;
  const res = await client.query(query, [endDateStr]);
  const transactions = res.rows;

  // 3. Process transactions chronologically to compute daily balances
  const partnerBalances = {}; // { partnerId: { currentBalance: 0, weightedSum: 0 } }
  
  // Initialize partners who have any transactions
  const uniquePartners = [...new Set(transactions.map(t => t.partner_id))];
  uniquePartners.forEach(id => {
    partnerBalances[id] = { currentBalance: 0, weightedSum: 0 };
  });

  // Create a timeline of changes.
  // A day runs from start of day to end of day. If a transaction happens on effective_date X, 
  // the new balance applies starting on day X.
  
  let currentSimDate = new Date(startDate);
  // We first apply all transactions that happened BEFORE the start of the month to get opening balances.
  const beforeStart = transactions.filter(t => new Date(t.effective_date) < startDate);
  beforeStart.forEach(t => {
    applyTransaction(partnerBalances[t.partner_id], t);
  });

  const withinMonth = transactions.filter(t => new Date(t.effective_date) >= startDate);
  let withinMonthIdx = 0;

  // Simulate day by day for the month
  for (let day = 1; day <= totalDaysInMonth; day++) {
    const dayStr = currentSimDate.toISOString().slice(0, 10);

    // Apply any transactions that take effect exactly on this day
    while (withinMonthIdx < withinMonth.length && withinMonth[withinMonthIdx].effective_date.toISOString().slice(0,10) === dayStr) {
      applyTransaction(partnerBalances[withinMonth[withinMonthIdx].partner_id], withinMonth[withinMonthIdx]);
      withinMonthIdx++;
    }

    // Accumulate weight for this day
    for (const pid of uniquePartners) {
      partnerBalances[pid].weightedSum += partnerBalances[pid].currentBalance * 1; // 1 day
    }

    // Move to next day
    currentSimDate.setDate(currentSimDate.getDate() + 1);
  }

  // 4. Calculate total weight and ratios
  let totalWeightedCapital = 0;
  for (const pid of uniquePartners) {
    totalWeightedCapital += partnerBalances[pid].weightedSum;
  }

  const results = [];
  for (const pid of uniquePartners) {
    const pb = partnerBalances[pid];
    const ratio = totalWeightedCapital > 0 ? (pb.weightedSum / totalWeightedCapital) : 0;
    
    // We can also calculate closing capital (which is currentBalance at end of month)
    results.push({
      partnerId: pid,
      closingCapital: pb.currentBalance,
      weightedCapital: pb.weightedSum,
      ownershipRatio: ratio
    });
  }

  return results;
}

function applyTransaction(partnerBalanceObj, transaction) {
  const amt = parseFloat(transaction.amount);
  const type = transaction.transaction_type;

  if (['CONTRIBUTION', 'ADJUSTMENT_INCREASE', 'PROFIT_SHARE', 'CAPITAL_DEPOSIT'].includes(type)) {
    partnerBalanceObj.currentBalance += amt;
  } else if (['WITHDRAWAL', 'ADJUSTMENT_DECREASE', 'CAPITAL_EXIT'].includes(type)) {
    partnerBalanceObj.currentBalance -= amt;
  }
}
