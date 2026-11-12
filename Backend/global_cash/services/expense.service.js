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

    // Ensure columns exist on legacy installations
    await client.query(`ALTER TABLE expenses ADD COLUMN IF NOT EXISTS loan_id UUID NULL;`);
    await client.query(`ALTER TABLE expenses ADD COLUMN IF NOT EXISTS finance_id UUID NULL;`);

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
        INSERT INTO expenses (loan_id, expense_date, amount, category, expense_type, description, created_by, created_at, updated_at)
        SELECT 
          ae.loan_id, ae.expense_date, ae.amount, 'AUTO', 
          COALESCE(ae.expense_type, 'BROKERAGE_HAND'), ae.description, ae.created_by, ae.created_at, ae.updated_at
        FROM autofinance_expenses ae
        WHERE NOT EXISTS (
          SELECT 1 FROM expenses e 
          WHERE e.description = ae.description 
            AND e.amount = ae.amount 
            AND e.expense_date = ae.expense_date
        );
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
        INSERT INTO expenses (expense_date, amount, category, expense_type, description, created_by, created_at, updated_at)
        SELECT 
          dfe.expense_date, dfe.amount, 'DAILY', 
          'DAILY_OPERATIONAL', dfe.description, dfe.created_by, dfe.created_at, dfe.updated_at
        FROM daily_finance_expenses dfe
        WHERE NOT EXISTS (
          SELECT 1 FROM expenses e 
          WHERE e.description = dfe.description 
            AND e.amount = dfe.amount 
            AND e.expense_date = dfe.expense_date
        );
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

  const validCategory = ['AUTO', 'DAILY', 'GENERAL', 'INTEREST'].includes(String(category).toUpperCase())
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

  const insertedRow = res.rows[0];
  if (validCategory === 'DAILY') {
    try {
      await client.query(`
        INSERT INTO daily_finance_expenses (expense_id, expense_date, amount, description)
        VALUES ($1, $2, $3, $4)
        ON CONFLICT (expense_id) DO UPDATE SET amount = EXCLUDED.amount, description = EXCLUDED.description
      `, [insertedRow.id, dateVal, numAmount, description.trim()]);
    } catch (e) {
      console.warn("Could not sync to daily_finance_expenses:", e.message);
    }
  }

  return insertedRow;
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
    limit = 10000,
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
    if (category.toUpperCase() === 'INTEREST') {
      conditions.push(`(e.category = 'INTEREST' OR e.expense_type = 'INTEREST' OR LOWER(e.description) LIKE '%interest%' OR LOWER(e.description) LIKE '%vatti%')`);
    } else {
      params.push(category.toUpperCase());
      conditions.push(`e.category = $${params.length}`);
    }
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
    const searchParam = `$${params.length}`;
    const phoneDigits = search.trim().replace(/\D/g, '');
    const hasPhoneDigits = phoneDigits.length >= 4 && /^[+\d\s().-]+$/.test(search.trim());
    const phoneSearchParam = hasPhoneDigits ? `$${params.length + 1}` : null;
    conditions.push(`(
      LOWER(COALESCE(e.description, '')) LIKE ${searchParam}
      OR LOWER(COALESCE(e.expense_type, '')) LIKE ${searchParam}
      OR LOWER(COALESCE(e.category, '')) LIKE ${searchParam}
      OR e.id::text ILIKE ${searchParam}
      OR COALESCE(e.loan_id::text, '') ILIKE ${searchParam}
      OR COALESCE(e.finance_id::text, '') ILIKE ${searchParam}
      OR e.expense_date::text ILIKE ${searchParam}
      OR e.amount::text ILIKE ${searchParam}
      OR e.created_at::text ILIKE ${searchParam}
      OR EXISTS (
        SELECT 1
        FROM autofinance_loans al
        JOIN autofinance_customers ac ON ac.id = al.customer_id
        LEFT JOIN autofinance_vehicles av ON av.loan_id = al.id
        WHERE al.id = e.loan_id
          AND (
            LOWER(COALESCE(ac.first_name, '') || ' ' || COALESCE(ac.last_name, '')) LIKE ${searchParam}
            OR LOWER(COALESCE(ac.phone, '')) LIKE ${searchParam}
            OR LOWER(COALESCE(ac.customer_code, '')) LIKE ${searchParam}
            OR LOWER(COALESCE(av.registration_number, '')) LIKE ${searchParam}
            ${hasPhoneDigits ? `OR REGEXP_REPLACE(COALESCE(ac.phone, ''), '[^0-9]', '', 'g') LIKE ${phoneSearchParam}` : ''}
          )
      )
      OR EXISTS (
        SELECT 1
        FROM daily_finance_accounts da
        JOIN daily_finance_customers dc ON dc.customer_id = da.customer_id
        WHERE da.finance_id = e.finance_id
          AND (
            LOWER(COALESCE(dc.customer_name, '')) LIKE ${searchParam}
            OR LOWER(COALESCE(dc.mobile_number, '')) LIKE ${searchParam}
            ${hasPhoneDigits ? `OR REGEXP_REPLACE(COALESCE(dc.mobile_number, ''), '[^0-9]', '', 'g') LIKE ${phoneSearchParam}` : ''}
          )
      )
    )`);
    if (hasPhoneDigits) params.push(`%${phoneDigits}%`);
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
  try {
    await client.query('DELETE FROM daily_finance_expenses WHERE expense_id = $1', [id]);
  } catch (e) {
    // Ignore if not in daily_finance_expenses
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
      COALESCE(SUM(CASE WHEN category = 'INTEREST' OR expense_type = 'INTEREST' OR LOWER(description) LIKE '%interest%' OR LOWER(description) LIKE '%vatti%' THEN amount ELSE 0 END), 0) AS interest_expenses,
      COUNT(*) AS total_count
    FROM expenses;
  `);
  return {
    totalExpenses: parseFloat(res.rows[0].total_expenses),
    autoExpenses: parseFloat(res.rows[0].auto_expenses),
    dailyExpenses: parseFloat(res.rows[0].daily_expenses),
    generalExpenses: parseFloat(res.rows[0].general_expenses),
    interestExpenses: parseFloat(res.rows[0].interest_expenses),
    totalCount: parseInt(res.rows[0].total_count, 10),
  };
}
