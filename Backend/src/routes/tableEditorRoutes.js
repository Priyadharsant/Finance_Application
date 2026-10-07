import express from 'express';
import { pool as db } from '../../autoFinance/config/db.js';
import { verifyAuthToken } from './appAuthRoutes.js';

const router = express.Router();

// Middleware to verify authentication
function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
  const isSessionAuth = req.session && req.session.isAppAuthenticated;

  if (isSessionAuth || (token && verifyAuthToken(token))) {
    return next();
  }

  // Also allow query or header password for direct access if provided
  const headerPwd = req.headers['x-admin-password'];
  const configuredPassword = process.env.APP_PASSWORD || process.env.POSTGRES_PASSWORD || '1607';
  if (headerPwd && String(headerPwd).trim() === String(configuredPassword).trim()) {
    return next();
  }

  return res.status(401).json({ error: 'Unauthorized: Admin authentication required' });
}

// Curated list of MAIN tables requested by user:
// Loans, Loan Collections, Partners Add and Withdrawal, Global Ledger & Expenses
const MAIN_TABLES_CONFIG = [
  // 1. Partners (Add & Withdrawal)
  {
    id: 'global_partners',
    name: 'global_partners',
    label: 'Partners (Add & Profiles)',
    module: 'Partners (Add & Withdrawal)',
    description: 'Partner profiles, contact info, and status',
    icon: 'Users',
  },
  {
    id: 'partner_capital_transactions',
    name: 'partner_capital_transactions',
    label: 'Partner Capital & Withdrawals (Own / Lend)',
    module: 'Partners (Add & Withdrawal)',
    description: 'Capital contributions and withdrawals with Own vs Lend breakdown',
    icon: 'Landmark',
  },

  // 2. Loans
  {
    id: 'autofinance_loans',
    name: 'autofinance_loans',
    label: 'Loans (Vehicle Loans)',
    module: 'Loans',
    description: 'Loan amount, interest, tenure, EMI, and status',
    icon: 'CarFront',
  },
  {
    id: 'autofinance_customers',
    name: 'autofinance_customers',
    label: 'Loan Customers (Borrowers)',
    module: 'Loans',
    description: 'Customer profiles, phone, Aadhaar, and address',
    icon: 'UserRound',
  },
  {
    id: 'daily_finance_customers',
    name: 'daily_finance_customers',
    label: 'Daily Loan Borrowers',
    module: 'Loans',
    description: 'Daily loan customer profiles',
    icon: 'Users',
  },

  // 3. Loan Collections
  {
    id: 'autofinance_emi_schedules',
    name: 'autofinance_emi_schedules',
    label: 'Loan Collections (EMI Schedules)',
    module: 'Loan Collections',
    description: 'Due dates, installment amounts, penalty, and paid status',
    icon: 'Calendar',
  },
  {
    id: 'autofinance_payments',
    name: 'autofinance_payments',
    label: 'Auto Loan Payment Collections',
    module: 'Loan Collections',
    description: 'Collected payments and receipts',
    icon: 'Receipt',
  },
  {
    id: 'daily_finance_payments',
    name: 'daily_finance_payments',
    label: 'Daily Loan Collections',
    module: 'Loan Collections',
    description: 'Daily loan collection receipts',
    icon: 'Receipt',
  },

  // 4. Global Ledger & Expenses
  {
    id: 'global_cash_ledger',
    name: 'global_cash_ledger',
    label: 'Global Cash Ledger',
    module: 'Cash Ledger & Expenses',
    description: 'All company inflows and outflows (Credits / Debits)',
    icon: 'Globe',
  },
  {
    id: 'expenses',
    name: 'expenses',
    label: 'Business Expenses',
    module: 'Cash Ledger & Expenses',
    description: 'General and operational expenses',
    icon: 'Receipt',
  },
];

// Check if table is valid
async function getValidTables() {
  const allowed = MAIN_TABLES_CONFIG.map(t => t.name);
  const q = `
    SELECT table_name 
    FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = ANY($1)
    ORDER BY table_name;
  `;
  const res = await db.query(q, [allowed]);
  return res.rows.map(r => r.table_name);
}

// 1. GET /api/table-editor/tables
router.get('/tables', requireAuth, async (req, res) => {
  try {
    const validTables = await getValidTables();
    const result = [];

    for (const item of MAIN_TABLES_CONFIG) {
      if (validTables.includes(item.name)) {
        let count = 0;
        try {
          const countRes = await db.query(`SELECT COUNT(*)::int AS count FROM "${item.name}"`);
          count = countRes.rows[0]?.count || 0;
        } catch (e) {
          // ignore
        }

        result.push({
          ...item,
          rowCount: count,
        });
      }
    }

    res.json({ success: true, tables: result });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

const TABLE_ENRICHMENTS = {
  partner_capital_transactions: {
    selectExtra: `, COALESCE(gp.name, '—') AS partner_name`,
    joinClause: `LEFT JOIN "global_partners" gp ON gp.id = t.partner_id`,
    extraColumns: [
      { column_name: 'partner_name', data_type: 'character varying', is_nullable: 'YES', is_primary: false, is_virtual: true }
    ],
    searchFields: ['gp.name']
  },
  autofinance_loans: {
    selectExtra: `, COALESCE(NULLIF(TRIM(c.first_name || ' ' || COALESCE(c.last_name, '')), ''), '—') AS customer_name`,
    joinClause: `LEFT JOIN "autofinance_customers" c ON c.id = t.customer_id`,
    extraColumns: [
      { column_name: 'customer_name', data_type: 'character varying', is_nullable: 'YES', is_primary: false, is_virtual: true }
    ],
    searchFields: ['c.first_name', 'c.last_name']
  },
  autofinance_emi_schedules: {
    selectExtra: `, COALESCE(NULLIF(TRIM(c.first_name || ' ' || COALESCE(c.last_name, '')), ''), '—') AS customer_name`,
    joinClause: `LEFT JOIN "autofinance_loans" l ON l.id = t.loan_id LEFT JOIN "autofinance_customers" c ON c.id = l.customer_id`,
    extraColumns: [
      { column_name: 'customer_name', data_type: 'character varying', is_nullable: 'YES', is_primary: false, is_virtual: true }
    ],
    searchFields: ['c.first_name', 'c.last_name']
  },
  autofinance_payments: {
    selectExtra: `, COALESCE(NULLIF(TRIM(c.first_name || ' ' || COALESCE(c.last_name, '')), ''), '—') AS customer_name`,
    joinClause: `LEFT JOIN "autofinance_loans" l ON l.id = t.loan_id LEFT JOIN "autofinance_customers" c ON c.id = l.customer_id`,
    extraColumns: [
      { column_name: 'customer_name', data_type: 'character varying', is_nullable: 'YES', is_primary: false, is_virtual: true }
    ],
    searchFields: ['c.first_name', 'c.last_name']
  },
  daily_finance_payments: {
    selectExtra: `, COALESCE(dc.customer_name, '—') AS customer_name`,
    joinClause: `LEFT JOIN "daily_finance_customers" dc ON dc.customer_id = t.customer_id`,
    extraColumns: [
      { column_name: 'customer_name', data_type: 'character varying', is_nullable: 'YES', is_primary: false, is_virtual: true }
    ],
    searchFields: ['dc.customer_name']
  }
};

// 2. GET /api/table-editor/data/:tableName
router.get('/data/:tableName', requireAuth, async (req, res) => {
  try {
    const { tableName } = req.params;
    const validTables = await getValidTables();
    if (!validTables.includes(tableName)) {
      return res.status(404).json({ error: `Table '${tableName}' not found or not accessible.` });
    }

    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(200, Math.max(1, parseInt(req.query.limit, 10) || 50));
    const offset = (page - 1) * limit;
    const search = (req.query.search || '').trim();
    const sortBy = req.query.sortBy || null;
    const sortOrder = req.query.sortOrder === 'desc' ? 'DESC' : 'ASC';

    // Get column definitions
    const colQuery = `
      SELECT 
        c.column_name, 
        c.data_type, 
        c.is_nullable, 
        c.column_default,
        (
          SELECT COUNT(*) > 0
          FROM information_schema.table_constraints tc
          JOIN information_schema.key_column_usage kcu 
            ON tc.constraint_name = kcu.constraint_name 
            AND tc.table_schema = kcu.table_schema
          WHERE tc.constraint_type = 'PRIMARY KEY' 
            AND tc.table_name = c.table_name 
            AND kcu.column_name = c.column_name
        ) AS is_primary
      FROM information_schema.columns c
      WHERE c.table_schema = 'public' AND c.table_name = $1
      ORDER BY c.ordinal_position;
    `;
    const colRes = await db.query(colQuery, [tableName]);
    const columns = colRes.rows;

    // Attach virtual columns if table is enriched (e.g. partner_name, customer_name)
    const enrichment = TABLE_ENRICHMENTS[tableName];
    if (enrichment?.extraColumns) {
      columns.push(...enrichment.extraColumns);
    }

    const primaryCol = columns.find(c => c.is_primary)?.column_name || 'id';

    // Build WHERE clause for search if search string provided
    let whereClause = '';
    const params = [];
    if (search) {
      const searchConditions = [];
      columns.forEach(c => {
        if (!c.is_virtual) {
          searchConditions.push(`CAST(t."${c.column_name}" AS TEXT) ILIKE $1`);
        }
      });
      if (enrichment?.searchFields) {
        enrichment.searchFields.forEach(sf => {
          searchConditions.push(`CAST(${sf} AS TEXT) ILIKE $1`);
        });
      }
      if (searchConditions.length > 0) {
        whereClause = `WHERE ${searchConditions.join(' OR ')}`;
        params.push(`%${search}%`);
      }
    }

    const joinClause = enrichment ? enrichment.joinClause : '';
    const selectExtra = enrichment ? enrichment.selectExtra : '';

    // Count total rows matching search
    const countQuery = `SELECT COUNT(*)::int AS total FROM "${tableName}" t ${joinClause} ${whereClause};`;
    const countRes = await db.query(countQuery, params);
    const totalCount = countRes.rows[0]?.total || 0;

    // Sorting
    let orderClause = '';
    if (sortBy && columns.some(c => c.column_name === sortBy)) {
      if (enrichment?.extraColumns?.some(ec => ec.column_name === sortBy)) {
        orderClause = `ORDER BY "${sortBy}" ${sortOrder}`;
      } else {
        orderClause = `ORDER BY t."${sortBy}" ${sortOrder}`;
      }
    } else if (columns.some(c => c.column_name === 'created_at')) {
      orderClause = `ORDER BY t."created_at" DESC`;
    } else {
      orderClause = `ORDER BY t."${primaryCol}" ASC`;
    }

    // Data query
    const dataParams = [...params, limit, offset];
    const dataQuery = `
      SELECT t.* ${selectExtra}
      FROM "${tableName}" t
      ${joinClause}
      ${whereClause} 
      ${orderClause} 
      LIMIT $${params.length + 1} OFFSET $${params.length + 2};
    `;
    const dataRes = await db.query(dataQuery, dataParams);

    res.json({
      success: true,
      tableName,
      columns,
      primaryKey: primaryCol,
      rows: dataRes.rows,
      totalCount,
      page,
      limit,
      totalPages: Math.ceil(totalCount / limit) || 1
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 3. PUT /api/table-editor/data/:tableName/:id
router.get('/schema/:tableName', requireAuth, async (req, res) => {
  try {
    const { tableName } = req.params;
    const colRes = await db.query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns 
      WHERE table_schema = 'public' AND table_name = $1
      ORDER BY ordinal_position;
    `, [tableName]);
    res.json({ success: true, columns: colRes.rows });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/data/:tableName/:id', requireAuth, async (req, res) => {
  try {
    const { tableName, id } = req.params;
    const updates = req.body;
    const validTables = await getValidTables();
    if (!validTables.includes(tableName)) {
      return res.status(404).json({ error: 'Table not found' });
    }

    // Get table columns
    const colRes = await db.query(`
      SELECT column_name, is_nullable 
      FROM information_schema.columns 
      WHERE table_schema = 'public' AND table_name = $1;
    `, [tableName]);
    const validCols = new Set(colRes.rows.map(r => r.column_name));

    // Get primary key
    const pkRes = await db.query(`
      SELECT kcu.column_name
      FROM information_schema.table_constraints tc
      JOIN information_schema.key_column_usage kcu 
        ON tc.constraint_name = kcu.constraint_name AND tc.table_schema = kcu.table_schema
      WHERE tc.constraint_type = 'PRIMARY KEY' AND tc.table_name = $1
      LIMIT 1;
    `, [tableName]);
    const primaryKey = pkRes.rows[0]?.column_name || 'id';

    const setClauses = [];
    const values = [];
    let paramIdx = 1;

    for (const [key, val] of Object.entries(updates)) {
      if (key !== primaryKey && validCols.has(key)) {
        setClauses.push(`"${key}" = $${paramIdx}`);
        // Handle empty strings for numbers or dates if needed
        let formattedVal = val;
        if (formattedVal === '') formattedVal = null;
        values.push(formattedVal);
        paramIdx++;
      }
    }

    if (setClauses.length === 0) {
      return res.status(400).json({ error: 'No valid columns provided for update' });
    }

    // If updated_at exists, auto update
    if (validCols.has('updated_at') && !updates.updated_at) {
      setClauses.push(`"updated_at" = NOW()`);
    }

    values.push(id);
    const updateQuery = `
      UPDATE "${tableName}"
      SET ${setClauses.join(', ')}
      WHERE "${primaryKey}" = $${paramIdx}
      RETURNING *;
    `;
    const result = await db.query(updateQuery, values);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Record not found to update' });
    }

    let updatedRow = result.rows[0];
    const enrichment = TABLE_ENRICHMENTS[tableName];
    if (enrichment) {
      const reQuery = `
        SELECT t.* ${enrichment.selectExtra}
        FROM "${tableName}" t
        ${enrichment.joinClause}
        WHERE t."${primaryKey}" = $1;
      `;
      const reRes = await db.query(reQuery, [id]);
      if (reRes.rows.length > 0) {
        updatedRow = reRes.rows[0];
      }
    }

    res.json({ success: true, updatedRow });
  } catch (err) {
    if (err.code === '23503') {
      return res.status(400).json({ error: `Relational integrity error: The related record referenced by this field does not exist.` });
    }
    if (err.code === '23514') {
      return res.status(400).json({ error: `Constraint violation: The updated value violates a business rule (e.g., amount cannot be negative).` });
    }
    if (err.code === '23502') {
      return res.status(400).json({ error: `Missing required field: Column "${err.column}" cannot be empty.` });
    }
    res.status(500).json({ error: err.message });
  }
});

// 4. POST /api/table-editor/data/:tableName
router.post('/data/:tableName', requireAuth, async (req, res) => {
  try {
    const { tableName } = req.params;
    const newRecord = req.body;
    const validTables = await getValidTables();
    if (!validTables.includes(tableName)) {
      return res.status(404).json({ error: 'Table not found' });
    }

    const colRes = await db.query(`
      SELECT column_name, data_type, column_default, is_nullable 
      FROM information_schema.columns 
      WHERE table_schema = 'public' AND table_name = $1;
    `, [tableName]);
    const validCols = new Set(colRes.rows.map(r => r.column_name));

    const insertCols = [];
    const valuePlaceholders = [];
    const values = [];
    let paramIdx = 1;

    for (const [key, val] of Object.entries(newRecord)) {
      if (validCols.has(key)) {
        // Skip if id is empty string or undefined (let DB default handle it)
        if (key === 'id' && (!val || val === '')) continue;

        insertCols.push(`"${key}"`);
        valuePlaceholders.push(`$${paramIdx}`);
        let formattedVal = val;
        if (formattedVal === '') formattedVal = null;
        values.push(formattedVal);
        paramIdx++;
      }
    }

    if (insertCols.length === 0) {
      return res.status(400).json({ error: 'No valid column values provided for new row' });
    }

    const insertQuery = `
      INSERT INTO "${tableName}" (${insertCols.join(', ')})
      VALUES (${valuePlaceholders.join(', ')})
      RETURNING *;
    `;
    const result = await db.query(insertQuery, values);

    res.json({ success: true, insertedRow: result.rows[0] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 5. DELETE /api/table-editor/data/:tableName/:id
router.delete('/data/:tableName/:id', requireAuth, async (req, res) => {
  try {
    const { tableName, id } = req.params;
    const validTables = await getValidTables();
    if (!validTables.includes(tableName)) {
      return res.status(404).json({ error: 'Table not found' });
    }

    const pkRes = await db.query(`
      SELECT kcu.column_name
      FROM information_schema.table_constraints tc
      JOIN information_schema.key_column_usage kcu 
        ON tc.constraint_name = kcu.constraint_name AND tc.table_schema = kcu.table_schema
      WHERE tc.constraint_type = 'PRIMARY KEY' AND tc.table_name = $1
      LIMIT 1;
    `, [tableName]);
    const primaryKey = pkRes.rows[0]?.column_name || 'id';

    const deleteQuery = `DELETE FROM "${tableName}" WHERE "${primaryKey}" = $1 RETURNING *;`;
    const result = await db.query(deleteQuery, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Record not found to delete' });
    }

    res.json({ success: true, deletedRow: result.rows[0] });
  } catch (err) {
    if (err.code === '23503') {
      return res.status(400).json({
        error: `Cannot delete this record because other tables depend on it (e.g. loans, transactions, or collections).`
      });
    }
    res.status(500).json({ error: err.message });
  }
});

export default router;
