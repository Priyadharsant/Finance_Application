export async function getAvailableCapital(client) {
  const query = `
    SELECT 
      COALESCE(SUM(CASE WHEN direction = 'CREDIT' THEN amount ELSE 0 END), 0) -
      COALESCE(SUM(CASE WHEN direction = 'DEBIT' THEN amount ELSE 0 END), 0) AS available_capital
    FROM global_cash_ledger;
  `;
  const res = await client.query(query);
  const grossCapital = parseFloat(res.rows[0].available_capital || 0);

  let totalExpenses = 0;
  try {
    const expRes = await client.query(`SELECT COALESCE(SUM(amount), 0) AS total_expenses FROM expenses;`);
    totalExpenses = parseFloat(expRes.rows[0].total_expenses || 0);
  } catch (e) {
    totalExpenses = 0;
  }

  return grossCapital - totalExpenses;
}

export async function getCapitalBreakdown(client) {
  const ledgerRes = await client.query(`
    SELECT 
      COALESCE(SUM(CASE WHEN direction = 'CREDIT' THEN amount ELSE 0 END), 0) AS total_credits,
      COALESCE(SUM(CASE WHEN direction = 'DEBIT' THEN amount ELSE 0 END), 0) AS total_debits,
      COALESCE(SUM(CASE WHEN direction = 'CREDIT' THEN amount ELSE 0 END), 0) -
      COALESCE(SUM(CASE WHEN direction = 'DEBIT' THEN amount ELSE 0 END), 0) AS gross_capital
    FROM global_cash_ledger;
  `);

  let expensesData = { totalExpenses: 0, autoExpenses: 0, dailyExpenses: 0, generalExpenses: 0 };
  try {
    const expRes = await client.query(`
      SELECT 
        COALESCE(SUM(amount), 0) AS total_expenses,
        COALESCE(SUM(CASE WHEN category = 'AUTO' THEN amount ELSE 0 END), 0) AS auto_expenses,
        COALESCE(SUM(CASE WHEN category = 'DAILY' THEN amount ELSE 0 END), 0) AS daily_expenses,
        COALESCE(SUM(CASE WHEN category = 'GENERAL' THEN amount ELSE 0 END), 0) AS general_expenses
      FROM expenses;
    `);
    expensesData = {
      totalExpenses: parseFloat(expRes.rows[0].total_expenses || 0),
      autoExpenses: parseFloat(expRes.rows[0].auto_expenses || 0),
      dailyExpenses: parseFloat(expRes.rows[0].daily_expenses || 0),
      generalExpenses: parseFloat(expRes.rows[0].general_expenses || 0)
    };
  } catch (e) {
    // Table not created yet
  }

  // Calculate Company Revenue from operations (Auto Finance interest + Daily Finance deductions/interest)
  let autoRevenue = 0;
  try {
    const autoRes = await client.query(`SELECT COALESCE(SUM(interest_paid), 0) AS interest FROM autofinance_payments;`);
    autoRevenue = parseFloat(autoRes.rows[0].interest || 0);
    if (autoRevenue === 0) {
      const ledgerAuto = await client.query(`SELECT COALESCE(SUM(amount), 0) AS interest FROM global_cash_ledger WHERE type = 'AUTO_LOAN_REPAYMENT_INTEREST';`);
      autoRevenue = parseFloat(ledgerAuto.rows[0].interest || 0);
    }
  } catch (e) {
    autoRevenue = 0;
  }

  let dailyRevenue = 0;
  try {
    const dailyRes = await client.query(`SELECT COALESCE(SUM(initial_deduction), 0) AS deduction FROM daily_finance_accounts;`);
    dailyRevenue = parseFloat(dailyRes.rows[0].deduction || 0);
    if (dailyRevenue === 0) {
      const ledgerDaily = await client.query(`SELECT COALESCE(SUM(amount), 0) AS deduction FROM global_cash_ledger WHERE type = 'DAILY_LOAN_INTEREST_DEDUCTION';`);
      dailyRevenue = parseFloat(ledgerDaily.rows[0].deduction || 0);
    }
  } catch (e) {
    dailyRevenue = 0;
  }

  const totalRevenue = autoRevenue + dailyRevenue;
  const netProfit = totalRevenue - expensesData.totalExpenses;

  const grossCapital = parseFloat(ledgerRes.rows[0].gross_capital || 0);
  const availableCapital = grossCapital - expensesData.totalExpenses;

  return {
    grossCapital,
    totalCredits: parseFloat(ledgerRes.rows[0].total_credits || 0),
    totalDebits: parseFloat(ledgerRes.rows[0].total_debits || 0),
    expenses: expensesData,
    revenue: {
      totalRevenue,
      autoRevenue,
      dailyRevenue,
    },
    netProfit,
    availableCapital,
  };
}

export async function calculatePeriodFinancials(client, periodStart, periodEnd) {
  let autoRevenue = 0;
  try {
    const autoRes = await client.query(`
      SELECT COALESCE(SUM(interest_paid), 0) AS interest
      FROM autofinance_payments
      WHERE payment_date >= $1 AND payment_date <= $2;
    `, [periodStart, periodEnd]);
    autoRevenue = parseFloat(autoRes.rows[0].interest || 0);
    if (autoRevenue === 0) {
      const ledgerAuto = await client.query(`
        SELECT COALESCE(SUM(amount), 0) AS interest
        FROM global_cash_ledger
        WHERE type = 'AUTO_LOAN_REPAYMENT_INTEREST'
          AND effective_date >= $1 AND effective_date <= $2;
      `, [periodStart, periodEnd]);
      autoRevenue = parseFloat(ledgerAuto.rows[0].interest || 0);
    }
  } catch (e) {
    autoRevenue = 0;
  }

  let dailyRevenue = 0;
  try {
    const dailyRes = await client.query(`
      SELECT COALESCE(SUM(initial_deduction), 0) AS deduction
      FROM daily_finance_accounts
      WHERE finance_date >= $1 AND finance_date <= $2;
    `, [periodStart, periodEnd]);
    dailyRevenue = parseFloat(dailyRes.rows[0].deduction || 0);
    if (dailyRevenue === 0) {
      const ledgerDaily = await client.query(`
        SELECT COALESCE(SUM(amount), 0) AS deduction
        FROM global_cash_ledger
        WHERE type = 'DAILY_LOAN_INTEREST_DEDUCTION'
          AND effective_date >= $1 AND effective_date <= $2;
      `, [periodStart, periodEnd]);
      dailyRevenue = parseFloat(ledgerDaily.rows[0].deduction || 0);
    }
  } catch (e) {
    dailyRevenue = 0;
  }

  let periodExpenses = 0;
  try {
    const expRes = await client.query(`
      SELECT COALESCE(SUM(amount), 0) AS expenses
      FROM expenses
      WHERE expense_date >= $1 AND expense_date <= $2;
    `, [periodStart, periodEnd]);
    periodExpenses = parseFloat(expRes.rows[0].expenses || 0);
  } catch (e) {
    periodExpenses = 0;
  }

  const totalRevenue = autoRevenue + dailyRevenue;
  const netProfit = totalRevenue - periodExpenses;
  const suggestedDistributableProfit = Math.max(0, netProfit);

  return {
    periodStart,
    periodEnd,
    autoRevenue,
    dailyRevenue,
    totalRevenue,
    expenses: periodExpenses,
    netProfit,
    suggestedDistributableProfit,
  };
}

export async function createLedgerEntry(client, data) {
  const {
    effectiveDate,
    type,
    amount,
    direction,
    sourceModule,
    referenceType,
    referenceId,
    notes
  } = data;

  if (amount <= 0) {
    throw new Error('Ledger entry amount must be greater than 0');
  }

  const query = `
    INSERT INTO global_cash_ledger (
      effective_date, type, amount, direction, source_module, reference_type, reference_id, notes
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
    RETURNING *;
  `;

  const values = [
    effectiveDate || new Date().toISOString().slice(0, 10),
    type,
    amount,
    direction,
    sourceModule,
    referenceType || null,
    referenceId || null,
    notes || null
  ];

  const res = await client.query(query, values);
  return res.rows[0];
}

export async function validateAndDisburseFunds(client, data) {
  const { module, amount, effectiveDate, referenceType, referenceId, notes } = data;

  if (amount <= 0) {
    throw new Error('Disbursement amount must be greater than 0');
  }

  // Calculate Available Capital
  const availableCapital = await getAvailableCapital(client);

  if (amount > availableCapital) {
    throw new Error(`Insufficient Funds. Available: ${availableCapital}, Requested: ${amount}`);
  }

  // Create Disbursement Ledger Entry
  const ledgerType = module === 'AUTO' ? 'AUTO_LOAN_DISBURSEMENT' : 'DAILY_LOAN_DISBURSEMENT';

  return await createLedgerEntry(client, {
    effectiveDate: effectiveDate || new Date().toISOString().slice(0, 10),
    type: ledgerType,
    amount: amount,
    direction: 'DEBIT',
    sourceModule: module,
    referenceType: referenceType,
    referenceId: referenceId,
    notes: notes
  });
}

export async function getTransactionDetails(client, ledgerId) {
  const ledgerRes = await client.query('SELECT * FROM global_cash_ledger WHERE id = $1', [ledgerId]);
  if (!ledgerRes.rows.length) {
    throw new Error('Ledger transaction not found');
  }
  const tx = ledgerRes.rows[0];

  const result = {
    transaction: tx,
    module: tx.source_module,
    direction: tx.direction,
    amount: tx.amount,
    type: tx.type,
    effectiveDate: tx.effective_date,
    transactionDate: tx.transaction_date,
    notes: tx.notes,
    referenceType: tx.reference_type,
    referenceId: tx.reference_id,
    customer: null,
    loan: null,
    vehicle: null,
    payment: null,
    partner: null,
    expense: null,
  };

  // 1. AUTO FINANCE
  if (tx.source_module === 'AUTO') {
    let loanId = tx.reference_id;

    if (tx.reference_type === 'AUTO_PAYMENT') {
      const pRes = await client.query('SELECT * FROM autofinance_payments WHERE id = $1', [tx.reference_id]);
      if (pRes.rows.length) {
        result.payment = pRes.rows[0];
        loanId = pRes.rows[0].loan_id;
      }
    }

    if (loanId) {
      const loanRes = await client.query(`
        SELECT l.*, lt.name AS scheme_name,
               c.first_name, c.last_name, c.phone, c.customer_code, c.city, c.address,
               v.make, v.model, v.registration_number, v.vehicle_type, v.chassis_number, v.engine_number
        FROM autofinance_loans l
        LEFT JOIN autofinance_customers c ON l.customer_id = c.id
        LEFT JOIN autofinance_vehicles v ON l.id = v.loan_id
        LEFT JOIN autofinance_loan_types lt ON l.loan_type_id = lt.id
        WHERE l.id = $1;
      `, [loanId]);

      if (loanRes.rows.length) {
        const l = loanRes.rows[0];
        result.customer = {
          name: `${l.first_name || ''} ${l.last_name || ''}`.trim() || 'Auto Customer',
          phone: l.phone,
          customerCode: l.customer_code,
          city: l.city,
          address: l.address,
        };
        result.vehicle = {
          make: l.make,
          model: l.model,
          regNo: l.registration_number,
          vehicleType: l.vehicle_type,
          chassisNo: l.chassis_number,
          engineNo: l.engine_number,
        };
        result.loan = {
          id: l.id,
          schemeName: l.scheme_name || 'Standard Vehicle Loan',
          loanAmount: l.loan_amount,
          interestRate: l.interest_rate,
          tenureMonths: l.tenure_months,
          interestType: l.interest_type || 'FLAT',
          status: l.status,
          startDate: l.start_date,
          endDate: l.end_date,
          feesDetails: l.fees_details,
        };
      }
    }
  }

  // 2. DAILY FINANCE
  else if (tx.source_module === 'DAILY') {
    let financeId = tx.reference_id;

    if (tx.reference_type === 'DAILY_PAYMENT') {
      const dpRes = await client.query('SELECT * FROM daily_finance_payments WHERE payment_id = $1', [tx.reference_id]);
      if (dpRes.rows.length) {
        result.payment = dpRes.rows[0];
        financeId = dpRes.rows[0].finance_id;
      }
    }

    if (financeId) {
      const dRes = await client.query(`
        SELECT a.*, c.customer_name, c.mobile_number, c.address, c.reference
        FROM daily_finance_accounts a
        LEFT JOIN daily_finance_customers c ON a.customer_id = c.customer_id
        WHERE a.finance_id = $1;
      `, [financeId]);

      if (dRes.rows.length) {
        const d = dRes.rows[0];
        result.customer = {
          name: d.customer_name || 'Daily Customer',
          phone: d.mobile_number,
          address: d.address,
          reference: d.reference,
        };
        result.loan = {
          financeId: d.finance_id,
          financeDate: d.finance_date,
          grossAmount: d.gross_finance_amount,
          initialDeduction: d.initial_deduction,
          netDisbursement: d.net_disbursement,
          agreedPayable: d.agreed_total_payable,
          dailyDue: d.daily_agreed_due,
          expectedDays: d.expected_collection_days,
          expectedCompletionDate: d.expected_completion_date,
          status: d.status,
        };
      }
    }
  }

  // 3. GLOBAL CAPITAL PARTNERS
  else if (tx.source_module === 'GLOBAL') {
    if (tx.reference_type === 'CAPITAL_TRANSACTION') {
      const pRes = await client.query(`
        SELECT t.*, p.name as partner_name, p.status as partner_status
        FROM partner_capital_transactions t
        JOIN global_partners p ON t.partner_id = p.id
        WHERE t.id = $1;
      `, [tx.reference_id]);
      if (pRes.rows.length) {
        result.partner = pRes.rows[0];
      }
    } else if (tx.reference_type === 'PARTNER') {
      const gpRes = await client.query('SELECT * FROM global_partners WHERE id = $1', [tx.reference_id]);
      if (gpRes.rows.length) {
        result.partner = gpRes.rows[0];
      }
    }
  }

  // 4. EXPENSE REFERENCE
  if (tx.reference_type === 'EXPENSE' || tx.type === 'BUSINESS_EXPENSE') {
    if (tx.reference_id) {
      const eRes = await client.query('SELECT * FROM expenses WHERE id = $1', [tx.reference_id]);
      if (eRes.rows.length) {
        result.expense = eRes.rows[0];
      }
    }
  }

  return result;
}
