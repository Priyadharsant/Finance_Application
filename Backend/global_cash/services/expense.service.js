import { pool } from '../../autoFinance/config/db.js';

let tableEnsured = false;

export async function ensureUnifiedExpensesTable(client = pool) {
  if (tableEnsured) return;
  try {
    // 0. Drop view if expenses was previously created as a view
    const viewCheck = await client.query(`
      SELECT table_type FROM information_schema.tables 
      WHERE table_schema = 'public' AND table_name = 'expenses';
    `);
    if (viewCheck.rows.length > 0 && viewCheck.rows[0].table_type === 'VIEW') {
      await client.query(`DROP VIEW IF EXISTS expenses CASCADE;`);
    }

    // 1. Create unified expenses table
    await client.query(`
      CREATE TABLE IF NOT EXISTS expenses (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        expense_date DATE NOT NULL,
        amount NUMERIC(14,2) NOT NULL CHECK(amount > 0),
        category VARCHAR(50) NOT NULL DEFAULT 'GENERAL',
        expense_type VARCHAR(100) DEFAULT 'GENERAL',
        description TEXT NOT NULL,
        loan_id UUID NULL,
        finance_id UUID NULL,
        created_by UUID NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);

    // 2. Indexes for fast queries
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_expenses_date ON expenses(expense_date);
      CREATE INDEX IF NOT EXISTS idx_expenses_category ON expenses(category);
    `);

    // 3. Migrate from autofinance_expenses if table exists and has rows not in expenses
    const autoTableCheck = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'autofinance_expenses' AND table_type = 'BASE TABLE'
      );
    `);

    if (autoTableCheck.rows[0].exists) {
      await client.query(`
        INSERT INTO expenses (id, loan_id, expense_date, amount, category, expense_type, description, created_by, created_at, updated_at)
        SELECT 
          ae.id, ae.loan_id, ae.expense_date, ae.amount, 'AUTO', 
          COALESCE(ae.expense_type, 'BROKERAGE_HAND'), ae.description, ae.created_by, ae.created_at, ae.updated_at
        FROM autofinance_expenses ae
        WHERE NOT EXISTS (SELECT 1 FROM expenses e WHERE e.id = ae.id)
        ON CONFLICT (id) DO NOTHING;
      `);
    }

    // 4. Migrate from daily_finance_expenses if exists
    const dailyTableCheck = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'daily_finance_expenses' AND table_type = 'BASE TABLE'
      );
    `);

    if (dailyTableCheck.rows[0].exists) {
      await client.query(`
        INSERT INTO expenses (id, expense_date, amount, category, expense_type, description, created_by, created_at, updated_at)
        SELECT 
          dfe.expense_id, dfe.expense_date, dfe.amount, 'DAILY', 
          'DAILY_OPERATIONAL', dfe.description, dfe.created_by, dfe.created_at, dfe.updated_at
        FROM daily_finance_expenses dfe
        WHERE NOT EXISTS (SELECT 1 FROM expenses e WHERE e.id = dfe.expense_id)
        ON CONFLICT (id) DO NOTHING;
      `);
    }

    tableEnsured = true;
  } catch (err) {
    console.error('Error ensuring unified expenses table:', err);
  }
}

export async function recordExpense(client = pool, data) {
  await ensureUnifiedExpensesTable(client);
  const {
    amount,
    description,
    expenseDate,
    category = 'GENERAL',
    expenseType = 'GENERAL',
    loanId = null,
    financeId = null,
    createdBy = null,
  } = data;

  const numAmount = parseFloat(amount);
  if (!numAmount || numAmount <= 0) {
    throw new Error('Expense amount must be greater than 0');
  }
  if (!description || !description.trim()) {
    throw new Error('Expense reason (description) is required');
  }

  const validCategory = ['AUTO', 'DAILY', 'GENERAL'].includes(String(category).toUpperCase())
    ? String(category).toUpperCase()
    : 'GENERAL';

  const dateVal = expenseDate || new Date().toISOString().slice(0, 10);

  const query = `
    INSERT INTO expenses (
      expense_date, amount, category, expense_type, description, loan_id, finance_id, created_by
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
    RETURNING *;
  `;

  const res = await client.query(query, [
    dateVal,
    numAmount,
    validCategory,
    expenseType || 'GENERAL',
    description.trim(),
    loanId || null,
    financeId || null,
    createdBy || null,
  ]);

  return res.rows[0];
}

export async function getExpenses(client = pool, filters = {}) {
  await ensureUnifiedExpensesTable(client);
  const {
    year,
    month,
    category,
    from,
    to,
    search,
    limit = 200,
    offset = 0,
  } = filters;

  const conditions = [];
  const params = [];

  if (year) {
    params.push(Number(year));
    conditions.push(`EXTRACT(YEAR FROM e.expense_date) = $${params.length}`);
  }

  if (month) {
    params.push(Number(month));
    conditions.push(`EXTRACT(MONTH FROM e.expense_date) = $${params.length}`);
  }

  if (category && category !== 'ALL') {
    params.push(category.toUpperCase());
    conditions.push(`e.category = $${params.length}`);
  }

  if (from) {
    params.push(from);
    conditions.push(`e.expense_date >= $${params.length}`);
  }

  if (to) {
    params.push(to);
    conditions.push(`e.expense_date <= $${params.length}`);
  }

  if (search && search.trim()) {
    params.push(`%${search.trim().toLowerCase()}%`);
    conditions.push(`(LOWER(e.description) LIKE $${params.length} OR LOWER(e.expense_type) LIKE $${params.length})`);
  }

  const whereClause = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

  const listQuery = `
    SELECT 
      e.*,
      v.registration_number AS auto_loan_reg,
      v.vehicle_type AS auto_loan_vehicle
    FROM expenses e
    LEFT JOIN autofinance_vehicles v ON e.loan_id = v.loan_id
    ${whereClause}
    ORDER BY e.expense_date DESC, e.created_at DESC
    LIMIT $${params.length + 1} OFFSET $${params.length + 2};
  `;

  const expensesRes = await client.query(listQuery, [...params, limit, offset]);

  // Summaries
  const filteredSummaryQuery = `
    SELECT 
      COALESCE(SUM(amount), 0) AS filtered_total,
      COUNT(*) AS filtered_count
    FROM expenses e
    ${whereClause};
  `;
  const filteredRes = await client.query(filteredSummaryQuery, params);

  // All-time and Category breakdown
  const categorySummaryQuery = `
    SELECT 
      category,
      COALESCE(SUM(amount), 0) AS total,
      COUNT(*) AS count
    FROM expenses
    GROUP BY category;
  `;
  const catRes = await client.query(categorySummaryQuery);

  const categoryBreakdown = {
    AUTO: { total: 0, count: 0 },
    DAILY: { total: 0, count: 0 },
    GENERAL: { total: 0, count: 0 },
  };

  let allTimeTotal = 0;
  let allTimeCount = 0;

  for (const row of catRes.rows) {
    const cat = row.category?.toUpperCase() || 'GENERAL';
    const tot = parseFloat(row.total || 0);
    const cnt = parseInt(row.count || 0, 10);
    if (categoryBreakdown[cat]) {
      categoryBreakdown[cat] = { total: tot, count: cnt };
    }
    allTimeTotal += tot;
    allTimeCount += cnt;
  }

  // Monthly totals (last 12 months for selector/history)
  const monthlyQuery = `
    SELECT 
      TO_CHAR(expense_date, 'YYYY-MM') AS period,
      COALESCE(SUM(amount), 0) AS total,
      COUNT(*) AS count
    FROM expenses
    GROUP BY TO_CHAR(expense_date, 'YYYY-MM')
    ORDER BY period DESC
    LIMIT 24;
  `;
  const monthlyRes = await client.query(monthlyQuery);

  return {
    expenses: expensesRes.rows,
    summary: {
      totalFiltered: parseFloat(filteredRes.rows[0].filtered_total || 0),
      countFiltered: parseInt(filteredRes.rows[0].filtered_count || 0, 10),
      allTimeTotal,
      allTimeCount,
      categoryBreakdown,
      monthlyTotals: monthlyRes.rows.map(r => ({
        period: r.period,
        total: parseFloat(r.total || 0),
        count: parseInt(r.count || 0, 10),
      })),
    },
  };
}

export async function deleteExpense(client = pool, id) {
  await ensureUnifiedExpensesTable(client);
  const res = await client.query('DELETE FROM expenses WHERE id = $1 RETURNING *', [id]);
  if (res.rowCount === 0) {
    throw new Error('Expense not found');
  }
  return res.rows[0];
}

export async function getTotalExpenses(client = pool) {
  await ensureUnifiedExpensesTable(client);
  const res = await client.query(`
    SELECT 
      COALESCE(SUM(amount), 0) AS total_expenses,
      COALESCE(SUM(CASE WHEN category = 'AUTO' THEN amount ELSE 0 END), 0) AS auto_expenses,
      COALESCE(SUM(CASE WHEN category = 'DAILY' THEN amount ELSE 0 END), 0) AS daily_expenses,
      COALESCE(SUM(CASE WHEN category = 'GENERAL' THEN amount ELSE 0 END), 0) AS general_expenses,
      COUNT(*) AS total_count
    FROM expenses;
  `);
  return {
    totalExpenses: parseFloat(res.rows[0].total_expenses),
    autoExpenses: parseFloat(res.rows[0].auto_expenses),
    dailyExpenses: parseFloat(res.rows[0].daily_expenses),
    generalExpenses: parseFloat(res.rows[0].general_expenses),
    totalCount: parseInt(res.rows[0].total_count, 10),
  };
}
