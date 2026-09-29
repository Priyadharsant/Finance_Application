import { pool } from '../../autoFinance/config/db.js';

export async function getMasterBusinessLedger(client = pool, options = {}) {
  const { year, month } = options;

  // 1. FETCH DAILY FINANCE DATA
  const dfAccountsQuery = `
    SELECT 
      a.finance_id,
      a.finance_date,
      a.gross_finance_amount,
      a.initial_deduction,
      a.net_disbursement,
      a.agreed_total_payable,
      a.status,
      c.customer_id,
      c.customer_name,
      c.mobile_number,
      COALESCE((SELECT SUM(p.amount) FROM daily_finance_payments p WHERE p.finance_id = a.finance_id AND p.status <> 'VOID'), 0) as total_collected,
      GREATEST(0, a.agreed_total_payable - COALESCE((SELECT SUM(p.amount) FROM daily_finance_payments p WHERE p.finance_id = a.finance_id AND p.status <> 'VOID'), 0)) as balance
    FROM daily_finance_accounts a
    JOIN daily_finance_customers c ON a.customer_id = c.customer_id
    WHERE a.status <> 'CANCELLED'
    ORDER BY a.finance_date ASC, c.customer_name ASC;
  `;
  const dfAccountsRes = await client.query(dfAccountsQuery);
  const dfAccounts = dfAccountsRes.rows;

  // Fetch all daily payments to map month-by-month collections
  const dfPaymentsQuery = `
    SELECT 
      finance_id,
      TO_CHAR(collection_date, 'YYYY-MM') as month_key,
      TO_CHAR(collection_date, 'Mon YYYY') as month_label,
      SUM(amount) as monthly_amount
    FROM daily_finance_payments
    WHERE status <> 'VOID'
    GROUP BY finance_id, TO_CHAR(collection_date, 'YYYY-MM'), TO_CHAR(collection_date, 'Mon YYYY')
    ORDER BY month_key ASC;
  `;
  const dfPaymentsRes = await client.query(dfPaymentsQuery);

  // Collect all unique collection months
  const monthMap = {};
  const distinctMonths = [];
  dfPaymentsRes.rows.forEach(r => {
    if (!monthMap[r.month_key]) {
      monthMap[r.month_key] = r.month_label;
      distinctMonths.push({ key: r.month_key, label: r.month_label });
    }
  });
  distinctMonths.sort((a, b) => a.key.localeCompare(b.key));

  // Map monthly payments to each account
  const accountPaymentsMap = {};
  dfPaymentsRes.rows.forEach(r => {
    if (!accountPaymentsMap[r.finance_id]) accountPaymentsMap[r.finance_id] = {};
    accountPaymentsMap[r.finance_id][r.month_key] = Number(r.monthly_amount || 0);
  });

  const dailyLoansList = dfAccounts.map((a, idx) => {
    const gross = Number(a.gross_finance_amount || 0);
    const pitibu = Number(a.initial_deduction || 0);
    const byHand = Number(a.net_disbursement || (gross - pitibu));
    const income = Number(a.total_collected || 0);
    const balance = Number(a.balance || 0);
    const monthlyVasul = {};
    distinctMonths.forEach(m => {
      monthlyVasul[m.key] = accountPaymentsMap[a.finance_id]?.[m.key] || 0;
    });

    return {
      sNo: idx + 1,
      financeId: a.finance_id,
      date: a.finance_date ? String(a.finance_date).slice(0, 10) : '',
      customerName: a.customer_name || '—',
      mobileNumber: a.mobile_number || '',
      loanAmount: gross,
      pitibu: pitibu,
      income: income,
      balance: balance,
      matakku: a.status === 'COMPLETED' ? (gross - income) : 0,
      byHand: byHand,
      monthlyVasul,
      status: a.status
    };
  });

  // Daily totals
  const dfTotals = dailyLoansList.reduce((acc, row) => ({
    totalLoan: acc.totalLoan + row.loanAmount,
    pitipu: acc.pitipu + row.pitibu,
    income: acc.income + row.income,
    balance: acc.balance + row.balance,
    distrubut: acc.distrubut + row.byHand,
  }), { totalLoan: 0, pitipu: 0, income: 0, balance: 0, distrubut: 0 });

  // 2. FETCH AUTO FINANCE DATA
  const autoLoansQuery = `
    SELECT 
      l.id,
      l.start_date,
      l.loan_amount,
      l.interest_rate,
      l.tenure_months,
      l.fees_details,
      l.status,
      c.first_name,
      c.last_name,
      c.phone,
      v.vehicle_type,
      v.make,
      v.model,
      v.registration_number,
      COALESCE((SELECT SUM(amount_paid) FROM autofinance_payments WHERE loan_id = l.id), 0) as total_collected,
      COALESCE((SELECT SUM(total_emi) FROM autofinance_emi_schedules WHERE loan_id = l.id), 0) as total_scheduled
    FROM autofinance_loans l
    JOIN autofinance_customers c ON l.customer_id = c.id
    LEFT JOIN autofinance_vehicles v ON l.id = v.loan_id
    ORDER BY l.start_date ASC, l.created_at ASC;
  `;
  const autoLoansRes = await client.query(autoLoansQuery);

  const autoLoansList = autoLoansRes.rows.map((l, idx) => {
    let fees = {};
    try {
      fees = typeof l.fees_details === 'string' ? JSON.parse(l.fees_details || '{}') : (l.fees_details || {});
    } catch (_) { fees = {}; }

    const loanAmt = Number(l.loan_amount || 0);
    const rate = Number(l.interest_rate || 0);
    const tenure = Number(l.tenure_months || 0);
    const scheduled = Number(l.total_scheduled || 0);
    const totalAmount = scheduled > 0 ? scheduled : (loanAmt + (loanAmt * rate * tenure / 1200));

    const docFee = Number(fees.documentFee || 0);
    const hp = Number(fees.hirePurchase || 0);
    const ta = Number(fees.taxAmount || 0);
    const insurance = Number(fees.insurance || 0);
    const ifFee = Number(fees.insuranceFine || 0);
    const gt = Number(fees.greenTax || 0);
    const fine = Number(fees.fine || 0);
    const nt = Number(fees.nationalTax || 0);
    const permit = Number(fees.permit || 0);
    const brokerCustomer = Number(fees.brokerageCustomer || 0);
    const brokerHand = Number(fees.brokerageHand || 0);
    const brokerName = fees.brokerName || '—';
    const incomeDue = Number(fees.incomeDue || 0);
    const fcInsurSelavu = Number(fees.fcInsuranceExpense || 0);

    const totalDeductions = docFee + hp + ta + insurance + ifFee + gt + fine + nt + permit + brokerCustomer + incomeDue;
    const byHand = loanAmt - totalDeductions;
    const incomeCollected = Number(l.total_collected || 0);

    // Build raw charges description string like "d 4000 hp 1500..."
    const chargesParts = [];
    if (docFee) chargesParts.push(`d ${docFee}`);
    if (hp) chargesParts.push(`hp ${hp}`);
    if (ta) chargesParts.push(`ta ${ta}`);
    if (insurance) chargesParts.push(`insu ${insurance}`);
    if (ifFee) chargesParts.push(`if ${ifFee}`);
    if (gt) chargesParts.push(`gt ${gt}`);
    if (fine) chargesParts.push(`f ${fine}`);
    if (nt) chargesParts.push(`nt ${nt}`);
    if (permit) chargesParts.push(`permit ${permit}`);

    return {
      sNo: idx + 1,
      id: l.id,
      date: l.start_date ? String(l.start_date).slice(0, 10) : '',
      customerName: `${l.first_name || ''} ${l.last_name || ''}`.trim() || '—',
      vehicle: `${l.vehicle_type || ''} ${l.make || ''} ${l.model || ''}`.trim() || l.registration_number || '—',
      regNo: l.registration_number || '',
      loanAmount: loanAmt,
      interestRate: rate,
      totalAmount: totalAmount,
      byHand: byHand,
      broker: brokerCustomer || brokerHand,
      brokerName: brokerName,
      chargesDescription: chargesParts.join(' ') || '—',
      incomeDue: incomeDue,
      document: docFee,
      hp: hp,
      ta: ta,
      insurance: insurance,
      if: ifFee,
      gt: gt,
      fine: fine,
      nt: nt,
      permit: permit,
      totalDeductions: totalDeductions,
      selavuFcInsur: fcInsurSelavu,
      incomeCollected: incomeCollected,
      status: l.status
    };
  });

  // Auto totals
  const autoTotals = autoLoansList.reduce((acc, row) => ({
    totalLoan: acc.totalLoan + row.loanAmount,
    totalLoanWithInterest: acc.totalLoanWithInterest + row.totalAmount,
    autoInterest: acc.autoInterest + (row.totalAmount - row.loanAmount),
    loanIncome: acc.loanIncome + row.incomeCollected,
    distribut: acc.distribut + row.byHand,
    document: acc.document + row.document,
    hp: acc.hp + row.hp,
    ta: acc.ta + row.ta,
    insurance: acc.insurance + row.insurance,
    if: acc.if + row.if,
    gt: acc.gt + row.gt,
    fine: acc.fine + row.fine,
    nt: acc.nt + row.nt,
    permit: acc.permit + row.permit,
    totalCharges: acc.totalCharges + row.totalDeductions,
    fcSelavu: acc.fcSelavu + row.selavuFcInsur,
    broker: acc.broker + row.broker,
  }), {
    totalLoan: 0,
    totalLoanWithInterest: 0,
    autoInterest: 0,
    loanIncome: 0,
    distribut: 0,
    document: 0,
    hp: 0,
    ta: 0,
    insurance: 0,
    if: 0,
    gt: 0,
    fine: 0,
    nt: 0,
    permit: 0,
    totalCharges: 0,
    fcSelavu: 0,
    broker: 0,
  });

  // 3. FETCH PARTNERS CAPITAL
  const partnersQuery = `
    SELECT 
      p.id,
      p.name,
      p.status,
      COALESCE((
        SELECT SUM(CASE WHEN transaction_type IN ('CONTRIBUTION', 'ADJUSTMENT_INCREASE', 'PROFIT_SHARE') THEN amount WHEN transaction_type IN ('WITHDRAWAL', 'ADJUSTMENT_DECREASE', 'CAPITAL_EXIT') THEN -amount ELSE 0 END)
        FROM partner_capital_transactions
        WHERE partner_id = p.id AND status = 'COMPLETED'
      ), 0) as current_capital,
      COALESCE((
        SELECT SUM(amount) FROM partner_capital_transactions
        WHERE partner_id = p.id AND transaction_type = 'CONTRIBUTION' AND status = 'COMPLETED'
      ), 0) as total_contributed,
      COALESCE((
        SELECT SUM(amount) FROM partner_capital_transactions
        WHERE partner_id = p.id AND transaction_type = 'WITHDRAWAL' AND status = 'COMPLETED'
      ), 0) as total_withdrawn,
      COALESCE((
        SELECT SUM(amount) FROM partner_capital_transactions
        WHERE partner_id = p.id AND transaction_type = 'PROFIT_SHARE' AND status = 'COMPLETED'
      ), 0) as profit_earned
    FROM global_partners p
    ORDER BY p.name ASC;
  `;
  const partnersRes = await client.query(partnersQuery);
  const partnersList = partnersRes.rows.map((p, idx) => ({
    sNo: idx + 1,
    id: p.id,
    name: p.name,
    capital: Number(p.current_capital || 0),
    contributed: Number(p.total_contributed || 0),
    withdrawn: Number(p.total_withdrawn || 0),
    profit: Number(p.profit_earned || 0),
    status: p.status
  }));
  const totalInvestment = partnersList.reduce((sum, p) => sum + p.capital, 0);

  // 4. FETCH EXPENSES (SELAVU)
  const expensesQuery = `
    SELECT 
      id,
      expense_date,
      amount,
      category,
      expense_type,
      description
    FROM expenses
    ORDER BY expense_date ASC, created_at ASC;
  `;
  const expensesRes = await client.query(expensesQuery);

  // Categorize expenses into standard categories from latest.xlsx:
  // shop open, tea, god, allowencs, others, rent eb, salery, intesrst
  const expenseCategories = [
    { key: 'shopOpen', label: 'Shop Open / Setup' },
    { key: 'tea', label: 'Tea & Pantry' },
    { key: 'god', label: 'Pooja / Temple' },
    { key: 'allowances', label: 'Allowances' },
    { key: 'others', label: 'Others' },
    { key: 'rentEb', label: 'Rent & EB' },
    { key: 'salary', label: 'Salary' },
    { key: 'interest', label: 'Interest' },
  ];

  const matchCategory = (catStr = '', descStr = '') => {
    const s = `${catStr} ${descStr}`.toLowerCase();
    if (s.includes('shop') || s.includes('opening') || s.includes('setup')) return 'shopOpen';
    if (s.includes('tea') || s.includes('coffee') || s.includes('snack') || s.includes('pantry')) return 'tea';
    if (s.includes('god') || s.includes('pooja') || s.includes('temple')) return 'god';
    if (s.includes('allow') || s.includes('bata') || s.includes('petrol') || s.includes('travel')) return 'allowances';
    if (s.includes('rent') || s.includes('eb') || s.includes('electric') || s.includes('current')) return 'rentEb';
    if (s.includes('salary') || s.includes('salery') || s.includes('wages') || s.includes('staff')) return 'salary';
    if (s.includes('interest') || s.includes('vatti') || s.includes('borrow')) return 'interest';
    return 'others';
  };

  const expensesList = expensesRes.rows.map((e, idx) => {
    const amt = Number(e.amount || 0);
    const cat = matchCategory(e.category, e.description || e.expense_type);
    return {
      sNo: idx + 1,
      id: e.id,
      date: e.expense_date ? String(e.expense_date).slice(0, 10) : '',
      amount: amt,
      categoryKey: cat,
      categoryLabel: e.category || 'GENERAL',
      description: e.description || e.expense_type || '—'
    };
  });

  const categoryTotals = {
    shopOpen: 0,
    tea: 0,
    god: 0,
    allowances: 0,
    others: 0,
    rentEb: 0,
    salary: 0,
    interest: 0,
    totalSelavu: 0
  };

  expensesList.forEach(e => {
    if (categoryTotals[e.categoryKey] !== undefined) {
      categoryTotals[e.categoryKey] += e.amount;
    } else {
      categoryTotals.others += e.amount;
    }
    categoryTotals.totalSelavu += e.amount;
  });

  // 5. COMBINED RECONCILIATION SUMMARY (Matching latest.xlsx exactly)
  // Daily Kaieruppu: Income - Expenses (or collections + pitipu - expenses)
  const dlKaieruppu = dfTotals.income + dfTotals.pitipu - categoryTotals.totalSelavu;

  // Auto Kaieruppu: Loan Income + Charges - Auto Selavu - Distribut (or collections + charges - broker - office expenses)
  const autoOfficeExpenses = categoryTotals.salary + categoryTotals.rentEb + categoryTotals.interest;
  const autoIruppu = autoTotals.loanIncome + autoTotals.totalCharges - autoTotals.fcSelavu - autoTotals.broker - autoOfficeExpenses;

  const totalKaieruppu = dlKaieruppu + autoIruppu;
  const totalDistribut = dfTotals.distrubut + autoTotals.distribut;
  const difference = totalInvestment - totalDistribut;
  const kaiEruppuPlusDifference = totalKaieruppu + difference;

  return {
    asOf: new Date().toISOString().slice(0, 10),
    distinctMonths,
    dailyFinance: {
      loans: dailyLoansList,
      totals: {
        ...dfTotals,
        balancePlusIncome: dfTotals.balance + dfTotals.income,
        selavu: categoryTotals.totalSelavu,
        kaieruppu: dlKaieruppu,
      }
    },
    autoFinance: {
      loans: autoLoansList,
      totals: {
        ...autoTotals,
        dTaHpInsuFc: autoTotals.document + autoTotals.ta + autoTotals.hp + autoTotals.insurance + autoTotals.fcSelavu,
        expensesSaleryRentCar: autoOfficeExpenses,
        iruppu: autoIruppu
      }
    },
    partners: {
      list: partnersList,
      totalInvestment: totalInvestment
    },
    expenses: {
      items: expensesList,
      categoryTotals: categoryTotals,
      categories: expenseCategories
    },
    reconciliation: {
      dlKaieruppu: dlKaieruppu,
      autoKaieruppu: autoIruppu,
      totalKaieruppu: totalKaieruppu,
      dlDistribut: dfTotals.distrubut,
      autoDistribut: autoTotals.distribut,
      totalDistribut: totalDistribut,
      investment: totalInvestment,
      loanDistribut: totalDistribut,
      difference: difference,
      kaiEruppuPlusDifference: kaiEruppuPlusDifference
    }
  };
}
