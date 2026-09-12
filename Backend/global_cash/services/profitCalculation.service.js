import { createLedgerEntry } from './globalCash.service.js';

/**
 * Helper to ensure migration tables are present.
 */
export async function ensureProfitCalculationTables(client) {
  const sql = `
    CREATE TABLE IF NOT EXISTS partner_profit_calculations (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        period_start DATE NOT NULL,
        period_end DATE NOT NULL,
        distributable_profit NUMERIC(14,2) NOT NULL CHECK(distributable_profit >= 0),
        total_capital_weight NUMERIC(24,4) NOT NULL DEFAULT 0,
        status VARCHAR(50) DEFAULT 'DRAFT',
        calculated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
        finalized_at TIMESTAMPTZ,
        created_by VARCHAR(150),
        notes TEXT,
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS partner_profit_allocations (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        calculation_id UUID NOT NULL REFERENCES partner_profit_calculations(id) ON DELETE CASCADE,
        partner_id UUID NOT NULL REFERENCES global_partners(id),
        opening_capital NUMERIC(14,2) NOT NULL DEFAULT 0,
        closing_capital NUMERIC(14,2) NOT NULL DEFAULT 0,
        capital_weight NUMERIC(24,4) NOT NULL DEFAULT 0,
        profit_ratio NUMERIC(14,8) NOT NULL DEFAULT 0,
        allocated_profit NUMERIC(14,2) NOT NULL DEFAULT 0,
        payable_amount NUMERIC(14,2) NOT NULL DEFAULT 0,
        paid_amount NUMERIC(14,2) NOT NULL DEFAULT 0,
        status VARCHAR(50) DEFAULT 'ALLOCATED',
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS partner_profit_payments (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        partner_id UUID NOT NULL REFERENCES global_partners(id),
        allocation_id UUID NOT NULL REFERENCES partner_profit_allocations(id),
        amount NUMERIC(14,2) NOT NULL CHECK(amount > 0),
        payment_date DATE NOT NULL DEFAULT CURRENT_DATE,
        reference VARCHAR(150),
        global_cash_ledger_reference UUID,
        notes TEXT,
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS daily_profit_logs (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        calc_date DATE NOT NULL UNIQUE,
        auto_revenue NUMERIC(14,2) NOT NULL DEFAULT 0,
        daily_revenue NUMERIC(14,2) NOT NULL DEFAULT 0,
        total_revenue NUMERIC(14,2) NOT NULL DEFAULT 0,
        expenses NUMERIC(14,2) NOT NULL DEFAULT 0,
        net_profit NUMERIC(14,2) NOT NULL DEFAULT 0,
        total_active_capital NUMERIC(14,2) NOT NULL DEFAULT 0,
        allocations JSONB NOT NULL DEFAULT '[]'::jsonb,
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
    );
  `;
  await client.query(sql);
}

/**
 * Format Date to YYYY-MM-DD
 */
export function formatDate(dateInput) {
  if (!dateInput) return null;
  if (typeof dateInput === 'string') {
    return dateInput.slice(0, 10);
  }
  if (dateInput instanceof Date) {
    const y = dateInput.getFullYear();
    const m = String(dateInput.getMonth() + 1).padStart(2, '0');
    const d = String(dateInput.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }
  return String(dateInput).slice(0, 10);
}

/**
 * Calculate inclusive calendar days between two UTC dates.
 * e.g. Sep 1 to Sep 9 is 9 days.
 */
export function getInclusiveDays(dateStr1, dateStr2) {
  const [y1, m1, d1] = dateStr1.split('-').map(Number);
  const [y2, m2, d2] = dateStr2.split('-').map(Number);
  const utc1 = Date.UTC(y1, m1 - 1, d1);
  const utc2 = Date.UTC(y2, m2 - 1, d2);
  const msPerDay = 24 * 60 * 60 * 1000;
  return Math.round((utc2 - utc1) / msPerDay) + 1;
}

/**
 * Add days to YYYY-MM-DD
 */
export function addDays(dateStr, numDays) {
  const [y, m, d] = dateStr.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d + numDays));
  const year = dt.getUTCFullYear();
  const month = String(dt.getUTCMonth() + 1).padStart(2, '0');
  const day = String(dt.getUTCDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Identifies if a transaction type is an inflow (credit) or outflow (debit) to partner capital.
 */
function isCredit(type) {
  return ['CONTRIBUTION', 'CAPITAL_DEPOSIT', 'ADJUSTMENT_INCREASE', 'PROFIT_SHARE', 'PROFIT_CREDIT'].includes(type);
}

function isDebit(type) {
  return ['WITHDRAWAL', 'CAPITAL_WITHDRAWAL', 'ADJUSTMENT_DECREASE', 'CAPITAL_EXIT'].includes(type);
}

/**
 * Calculate Capital Weight and Segments for a single partner in [periodStart, periodEnd].
 * Time-Weighted Capital = sum of (Effective Capital Balance * Number of Active Days)
 */
export async function calculatePartnerCapitalWeight(client, partnerId, periodStart, periodEnd) {
  const startStr = formatDate(periodStart);
  const endStr = formatDate(periodEnd);

  if (startStr > endStr) {
    throw new Error(`periodStart (${startStr}) cannot be after periodEnd (${endStr})`);
  }

  // 1. Opening Balance prior to periodStart
  const openingQuery = `
    SELECT 
      COALESCE(SUM(CASE WHEN transaction_type IN ('CONTRIBUTION', 'CAPITAL_DEPOSIT', 'ADJUSTMENT_INCREASE', 'PROFIT_SHARE', 'PROFIT_CREDIT') THEN amount ELSE 0 END), 0) AS total_credits,
      COALESCE(SUM(CASE WHEN transaction_type IN ('WITHDRAWAL', 'CAPITAL_WITHDRAWAL', 'ADJUSTMENT_DECREASE', 'CAPITAL_EXIT') THEN amount ELSE 0 END), 0) AS total_debits
    FROM partner_capital_transactions
    WHERE partner_id = $1 
      AND status = 'COMPLETED'
      AND effective_date < $2;
  `;
  const openingRes = await client.query(openingQuery, [partnerId, startStr]);
  const openingCredits = parseFloat(openingRes.rows[0].total_credits || 0);
  const openingDebits = parseFloat(openingRes.rows[0].total_debits || 0);
  const openingBalance = openingCredits - openingDebits;

  // 2. Transactions during the period, ordered deterministically:
  // effective_date ASC, transaction_timestamp ASC, id ASC
  const txQuery = `
    SELECT 
      id,
      partner_id,
      transaction_type,
      amount,
      effective_date,
      transaction_timestamp,
      notes
    FROM partner_capital_transactions
    WHERE partner_id = $1 
      AND status = 'COMPLETED'
      AND effective_date >= $2
      AND effective_date <= $3
    ORDER BY effective_date ASC, transaction_timestamp ASC, id ASC;
  `;
  const txRes = await client.query(txQuery, [partnerId, startStr, endStr]);
  const periodTxs = txRes.rows;

  // 3. Group transactions by effective_date to determine net daily changes
  // A capital transaction is effective from its effective_date.
  // Multiple transactions on the same date are applied in deterministic order to yield the date's closing effective balance.
  const dateTxMap = new Map(); // dateStr -> array of txs
  for (const tx of periodTxs) {
    const dStr = formatDate(tx.effective_date);
    if (!dateTxMap.has(dStr)) {
      dateTxMap.set(dStr, []);
    }
    dateTxMap.get(dStr).push(tx);
  }

  // 4. Build Segments:
  // Each segment has:
  // - startDate
  // - endDate
  // - activeDays
  // - capitalBalance
  // - segmentWeight = capitalBalance * activeDays
  const segments = [];
  let currentBalance = openingBalance;
  let currentSegmentStart = startStr;

  // Sorted unique transaction dates within period
  const changeDates = Array.from(dateTxMap.keys()).sort();

  for (const changeDate of changeDates) {
    // If the changeDate is after currentSegmentStart, the balance prior to this date
    // was effective from currentSegmentStart up to (changeDate - 1 day).
    if (changeDate > currentSegmentStart) {
      const segEnd = addDays(changeDate, -1);
      const days = getInclusiveDays(currentSegmentStart, segEnd);
      if (days > 0) {
        segments.push({
          startDate: currentSegmentStart,
          endDate: segEnd,
          activeDays: days,
          capitalBalance: currentBalance,
          segmentWeight: currentBalance * days,
        });
      }
      currentSegmentStart = changeDate;
    }

    // Apply all transactions for changeDate in deterministic order
    const dayTxs = dateTxMap.get(changeDate);
    for (const tx of dayTxs) {
      const amt = parseFloat(tx.amount);
      if (isCredit(tx.transaction_type)) {
        currentBalance += amt;
      } else if (isDebit(tx.transaction_type)) {
        currentBalance -= amt;
      }
    }
  }

  // Final segment from currentSegmentStart to endStr
  if (currentSegmentStart <= endStr) {
    const days = getInclusiveDays(currentSegmentStart, endStr);
    if (days > 0) {
      segments.push({
        startDate: currentSegmentStart,
        endDate: endStr,
        activeDays: days,
        capitalBalance: currentBalance,
        segmentWeight: currentBalance * days,
      });
    }
  }

  // Calculate total capital weight = sum(segmentWeight)
  let totalCapitalWeight = 0;
  for (const seg of segments) {
    totalCapitalWeight += seg.segmentWeight;
  }

  const closingBalance = currentBalance;

  return {
    partnerId,
    openingBalance,
    closingBalance,
    capitalWeight: totalCapitalWeight,
    transactionCount: periodTxs.length,
    transactionBreakdown: periodTxs.map(t => ({
      id: t.id,
      type: t.transaction_type,
      amount: parseFloat(t.amount),
      effectiveDate: formatDate(t.effective_date),
      notes: t.notes,
    })),
    segmentBreakdown: segments,
  };
}

/**
 * System-Wide Profit Distribution calculation using Time-Weighted Capital.
 * Uses exact cent allocation (Hare-Niemeyer / Largest Remainder) so:
 * Sum(Allocated Profit) === Distributable Profit exactly.
 */
export async function calculatePartnerProfitDistribution(client, { periodStart, periodEnd, distributableProfit }) {
  const startStr = formatDate(periodStart);
  const endStr = formatDate(periodEnd);
  const profitNum = parseFloat(distributableProfit);

  if (!startStr || !endStr) {
    throw new Error('Valid periodStart and periodEnd are required');
  }
  if (startStr > endStr) {
    throw new Error(`periodStart (${startStr}) cannot be after periodEnd (${endStr})`);
  }
  if (isNaN(profitNum) || profitNum < 0) {
    throw new Error('Distributable profit must be a non-negative number');
  }

  // 1. Fetch all partners (excluding EXITED before periodStart)
  const partnersQuery = `
    SELECT id, name, status, created_at
    FROM global_partners
    WHERE status != 'EXITED' OR exit_effective_date >= $1
    ORDER BY created_at ASC, name ASC;
  `;
  const partnersRes = await client.query(partnersQuery, [startStr]);
  const partners = partnersRes.rows;

  // 2. Compute Capital Weight for each partner
  const partnerAllocations = [];
  let totalCapitalWeight = 0;

  for (const p of partners) {
    const weightData = await calculatePartnerCapitalWeight(client, p.id, startStr, endStr);
    totalCapitalWeight += weightData.capitalWeight;
    partnerAllocations.push({
      partnerId: p.id,
      partnerName: p.name,
      status: p.status,
      openingCapital: weightData.openingBalance,
      closingCapital: weightData.closingBalance,
      capitalWeight: weightData.capitalWeight,
      segmentBreakdown: weightData.segmentBreakdown,
      transactionBreakdown: weightData.transactionBreakdown,
    });
  }

  // 3. Compute Profit Ratio and Exact Allocated Profit
  // Avoid floating-point mismatch by using integer cents / paise
  const totalProfitCents = Math.round(profitNum * 100);
  let allocatedCentsSum = 0;

  const intermediate = partnerAllocations.map(p => {
    let ratio = 0;
    let exactShareCents = 0;
    if (totalCapitalWeight > 0 && p.capitalWeight > 0) {
      ratio = p.capitalWeight / totalCapitalWeight;
      exactShareCents = totalProfitCents * ratio;
    }

    const floorCents = Math.floor(exactShareCents);
    const remainder = exactShareCents - floorCents;
    allocatedCentsSum += floorCents;

    return {
      ...p,
      profitRatio: ratio,
      floorCents,
      remainder,
      finalCents: floorCents,
    };
  });

  // Distribute remaining cents to partners with the largest fractional remainder
  let remainderCents = totalProfitCents - allocatedCentsSum;
  if (remainderCents > 0 && totalCapitalWeight > 0) {
    // Sort by remainder descending, then capitalWeight descending, then partnerId
    const sorted = [...intermediate].sort((a, b) => {
      if (b.remainder !== a.remainder) return b.remainder - a.remainder;
      if (b.capitalWeight !== a.capitalWeight) return b.capitalWeight - a.capitalWeight;
      return a.partnerId.localeCompare(b.partnerId);
    });

    for (let i = 0; i < remainderCents && i < sorted.length; i++) {
      sorted[i].finalCents += 1;
    }
  }

  const finalAllocations = intermediate.map(p => {
    const allocatedProfit = p.finalCents / 100;
    return {
      partnerId: p.partnerId,
      partnerName: p.partnerName,
      status: p.status,
      openingCapital: p.openingCapital,
      closingCapital: p.closingCapital,
      capitalWeight: p.capitalWeight,
      profitRatio: parseFloat(p.profitRatio.toFixed(8)),
      allocatedProfit: allocatedProfit,
      payableAmount: allocatedProfit,
      paidAmount: 0,
      segmentBreakdown: p.segmentBreakdown,
      transactionBreakdown: p.transactionBreakdown,
    };
  });

  return {
    periodStart: startStr,
    periodEnd: endStr,
    distributableProfit: profitNum,
    totalCapitalWeight,
    partnerCount: partners.length,
    allocations: finalAllocations,
  };
}

/**
 * Save profit calculation to database (DRAFT or FINALIZED).
 * Ensures idempotency and database transaction safety.
 */
export async function saveProfitCalculation(client, { periodStart, periodEnd, distributableProfit, notes, createdBy, finalize = false }) {
  const startStr = formatDate(periodStart);
  const endStr = formatDate(periodEnd);

  // Check if a FINALIZED calculation already exists for this exact period
  const existingFinalized = await client.query(`
    SELECT id, status, finalized_at
    FROM partner_profit_calculations
    WHERE period_start = $1 AND period_end = $2 AND status = 'FINALIZED'
  `, [startStr, endStr]);

  if (existingFinalized.rowCount > 0) {
    throw new Error(`A finalized profit calculation already exists for period ${startStr} to ${endStr}. Finalized periods cannot be modified.`);
  }

  // Calculate distribution
  const distribution = await calculatePartnerProfitDistribution(client, {
    periodStart: startStr,
    periodEnd: endStr,
    distributableProfit,
  });

  const calcStatus = finalize ? 'FINALIZED' : 'DRAFT';
  const finalizedAt = finalize ? 'NOW()' : 'NULL';

  // Insert master record
  const insertCalcSql = `
    INSERT INTO partner_profit_calculations (
      period_start, period_end, distributable_profit, total_capital_weight,
      status, finalized_at, created_by, notes
    )
    VALUES ($1, $2, $3, $4, $5, ${finalize ? 'NOW()' : 'NULL'}, $6, $7)
    RETURNING *;
  `;
  const calcRes = await client.query(insertCalcSql, [
    startStr,
    endStr,
    distribution.distributableProfit,
    distribution.totalCapitalWeight,
    calcStatus,
    createdBy || 'Admin',
    notes || null,
  ]);
  const calculation = calcRes.rows[0];

  // Insert allocation records
  const savedAllocations = [];
  for (const alloc of distribution.allocations) {
    const allocStatus = finalize ? 'PROFIT_PAYABLE' : 'ALLOCATED';
    const insAllocSql = `
      INSERT INTO partner_profit_allocations (
        calculation_id, partner_id, opening_capital, closing_capital,
        capital_weight, profit_ratio, allocated_profit, payable_amount,
        paid_amount, status
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 0, $9)
      RETURNING *;
    `;
    const allocRes = await client.query(insAllocSql, [
      calculation.id,
      alloc.partnerId,
      alloc.openingCapital,
      alloc.closingCapital,
      alloc.capitalWeight,
      alloc.profitRatio,
      alloc.allocatedProfit,
      alloc.allocatedProfit,
      allocStatus,
    ]);
    const savedAlloc = allocRes.rows[0];
    savedAllocations.push({
      ...savedAlloc,
      partner_name: alloc.partnerName,
      segmentBreakdown: alloc.segmentBreakdown,
    });
  }

  return {
    ...calculation,
    allocations: savedAllocations,
  };
}

/**
 * Get all profit calculations.
 */
export async function getProfitCalculations(client) {
  const res = await client.query(`
    SELECT 
      c.*,
      COUNT(a.id) AS partner_count,
      COALESCE(SUM(a.allocated_profit), 0) AS total_allocated,
      COALESCE(SUM(a.paid_amount), 0) AS total_paid
    FROM partner_profit_calculations c
    LEFT JOIN partner_profit_allocations a ON c.id = a.calculation_id
    GROUP BY c.id
    ORDER BY c.period_end DESC, c.created_at DESC;
  `);
  return res.rows;
}

/**
 * Get calculation details by ID, including partner allocations, segment breakdowns, and payments.
 */
export async function getProfitCalculationById(client, calculationId) {
  const calcRes = await client.query(`
    SELECT * FROM partner_profit_calculations WHERE id = $1
  `, [calculationId]);

  if (calcRes.rowCount === 0) {
    throw new Error('Profit calculation not found');
  }
  const calculation = calcRes.rows[0];

  // Allocations with partner details
  const allocRes = await client.query(`
    SELECT 
      a.*,
      p.name as partner_name,
      p.status as partner_status,
      p.phone as partner_phone,
      p.email as partner_email
    FROM partner_profit_allocations a
    JOIN global_partners p ON a.partner_id = p.id
    WHERE a.calculation_id = $1
    ORDER BY a.allocated_profit DESC, a.capital_weight DESC;
  `, [calculationId]);

  // For each allocation, compute segment breakdown for detail auditing
  const detailedAllocations = [];
  for (const row of allocRes.rows) {
    const weightData = await calculatePartnerCapitalWeight(
      client,
      row.partner_id,
      calculation.period_start,
      calculation.period_end
    );
    detailedAllocations.push({
      ...row,
      segmentBreakdown: weightData.segmentBreakdown,
      transactionBreakdown: weightData.transactionBreakdown,
    });
  }

  // Fetch any payments logged for this calculation's allocations
  const paymentsRes = await client.query(`
    SELECT 
      pm.*,
      p.name as partner_name,
      a.allocated_profit
    FROM partner_profit_payments pm
    JOIN partner_profit_allocations a ON pm.allocation_id = a.id
    JOIN global_partners p ON pm.partner_id = p.id
    WHERE a.calculation_id = $1
    ORDER BY pm.payment_date DESC, pm.created_at DESC;
  `, [calculationId]);

  return {
    ...calculation,
    allocations: detailedAllocations,
    payments: paymentsRes.rows,
  };
}

/**
 * Finalize a draft profit calculation.
 * Sets status='FINALIZED', finalized_at=NOW(), and allocations status='PROFIT_PAYABLE'.
 */
export async function finalizeProfitCalculation(client, calculationId) {
  // Check if exists and not already finalized
  const calcRes = await client.query(`
    SELECT * FROM partner_profit_calculations WHERE id = $1
  `, [calculationId]);

  if (calcRes.rowCount === 0) {
    throw new Error('Profit calculation not found');
  }
  const calc = calcRes.rows[0];
  if (calc.status === 'FINALIZED') {
    throw new Error('Profit calculation is already finalized');
  }

  // Update calculation
  const updateCalc = await client.query(`
    UPDATE partner_profit_calculations
    SET status = 'FINALIZED', finalized_at = NOW(), updated_at = NOW()
    WHERE id = $1
    RETURNING *;
  `, [calculationId]);

  // Update allocations to PROFIT_PAYABLE
  await client.query(`
    UPDATE partner_profit_allocations
    SET status = 'PROFIT_PAYABLE', updated_at = NOW()
    WHERE calculation_id = $1 AND status = 'ALLOCATED';
  `, [calculationId]);

  return updateCalc.rows[0];
}

/**
 * Record a full or partial profit payment settlement for a partner.
 * 1. Validates unpaid payable balance.
 * 2. Creates record in partner_profit_payments.
 * 3. Increases paid_amount, updates status ('PAID' or 'PARTIALLY_PAID').
 * 4. Logs immutable global cash ledger entry:
 *    type = 'PROFIT_SETTLEMENT', direction = 'DEBIT', source_module = 'GLOBAL', reference_type = 'PROFIT_PAYMENT'.
 * 5. Does NOT reduce partner capital!
 */
export async function recordProfitPayment(client, { partnerId, allocationId, amount, paymentDate, reference, notes }) {
  const amt = parseFloat(amount);
  if (isNaN(amt) || amt <= 0) {
    throw new Error('Payment amount must be greater than 0');
  }

  // 1. Fetch allocation
  const allocRes = await client.query(`
    SELECT a.*, p.name as partner_name, c.status as calc_status
    FROM partner_profit_allocations a
    JOIN global_partners p ON a.partner_id = p.id
    JOIN partner_profit_calculations c ON a.calculation_id = c.id
    WHERE a.id = $1;
  `, [allocationId]);

  if (allocRes.rowCount === 0) {
    throw new Error('Partner profit allocation record not found');
  }
  const alloc = allocRes.rows[0];

  if (alloc.partner_id !== partnerId) {
    throw new Error('Partner ID does not match allocation record');
  }

  const payableAmount = parseFloat(alloc.payable_amount);
  const currentPaid = parseFloat(alloc.paid_amount);
  const remainingUnpaid = payableAmount - currentPaid;

  // Allow a tiny epsilon for float comparisons
  if (amt > remainingUnpaid + 0.001) {
    throw new Error(
      `Payment amount (₹${amt.toFixed(2)}) exceeds remaining unpaid profit (₹${remainingUnpaid.toFixed(2)}).`
    );
  }

  const date = paymentDate ? formatDate(paymentDate) : new Date().toISOString().slice(0, 10);

  // 2. Insert profit payment record
  const insertPaymentSql = `
    INSERT INTO partner_profit_payments (
      partner_id, allocation_id, amount, payment_date, reference, notes
    )
    VALUES ($1, $2, $3, $4, $5, $6)
    RETURNING *;
  `;
  const paymentRes = await client.query(insertPaymentSql, [
    partnerId,
    allocationId,
    amt,
    date,
    reference || null,
    notes || `Profit settlement payout to ${alloc.partner_name}`,
  ]);
  const payment = paymentRes.rows[0];

  // 3. Update allocation paid_amount & status
  const newPaidAmount = currentPaid + amt;
  const isFullyPaid = Math.abs(newPaidAmount - payableAmount) < 0.01;
  const newStatus = isFullyPaid ? 'PAID' : 'PARTIALLY_PAID';

  await client.query(`
    UPDATE partner_profit_allocations
    SET paid_amount = $1, status = $2, updated_at = NOW()
    WHERE id = $3;
  `, [newPaidAmount, newStatus, allocationId]);

  // 4. Create immutable Global Cash Ledger entry (DEBIT)
  const ledgerEntry = await createLedgerEntry(client, {
    effectiveDate: date,
    type: 'PROFIT_SETTLEMENT',
    amount: amt,
    direction: 'DEBIT',
    sourceModule: 'GLOBAL',
    referenceType: 'PROFIT_PAYMENT',
    referenceId: payment.id,
    notes: notes || `Profit settlement payout to ${alloc.partner_name} (${reference ? `Ref: ${reference}` : ''})`,
  });

  // Link ledger reference back to payment
  if (ledgerEntry?.id) {
    await client.query(`
      UPDATE partner_profit_payments
      SET global_cash_ledger_reference = $1
      WHERE id = $2;
    `, [ledgerEntry.id, payment.id]);
    payment.global_cash_ledger_reference = ledgerEntry.id;
  }

  return {
    payment,
    newPaidAmount,
    remainingUnpaid: Math.max(0, payableAmount - newPaidAmount),
    allocationStatus: newStatus,
    ledgerEntryId: ledgerEntry?.id,
  };
}
