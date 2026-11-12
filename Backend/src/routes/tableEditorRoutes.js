import express from 'express';
import { pool as db } from '../../autoFinance/config/db.js';
import { verifyAuthToken } from './appAuthRoutes.js';
import { rescheduleFutureEMIs } from '../../autoFinance/services/loanService.js';
import {
  ensureDeletedLoansTable,
  deleteDailyLoan,
  deleteAutoLoan,
} from '../services/deletedLoansService.js';

const router = express.Router();

// Initialize deleted loans archive table on module load
ensureDeletedLoansTable(db);

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

// Curated list of MAIN tables organized strictly into Daily, Auto, and Global:
const MAIN_TABLES_CONFIG = [
  // =========================================================
  // 1. DAILY FINANCE
  // =========================================================
  {
    id: 'daily_finance_accounts',
    name: 'daily_finance_accounts',
    label: 'Daily Loans (Borrower & Repayment Details)',
    module: 'Daily Finance',
    description: 'Edit borrower and repayment details. Disbursement amount, deduction, and date changes require a verified correction.',
    icon: 'Users',
  },
  {
    id: 'daily_finance_payments',
    name: 'daily_finance_payments',
    label: 'Daily Collections (Change Amount)',
    module: 'Daily Finance',
    description: 'Change daily collected amounts, collection dates, and payment methods',
    icon: 'Receipt',
  },

  // =========================================================
  // 2. AUTO FINANCE
  // =========================================================
  {
    id: 'autofinance_loans',
    name: 'autofinance_loans',
    label: 'Auto Loans (Vehicle & Loan Details)',
    module: 'Auto Finance',
    description: 'Edit loan details, disbursement, interest, and terms. Delete loan option available.',
    icon: 'CarFront',
  },
  {
    id: 'autofinance_customers',
    name: 'autofinance_customers',
    label: 'Auto Customers (Change Cust Info)',
    module: 'Auto Finance',
    description: 'Change customer profile, first/last name, phone, city, and address',
    icon: 'UserRound',
  },
  {
    id: 'autofinance_emi_schedules',
    name: 'autofinance_emi_schedules',
    label: 'Auto Collections (Collected List Only)',
    module: 'Auto Finance',
    description: 'Change collected amount on collected installments (uncollected schedules excluded)',
    icon: 'Calendar',
  },

  // =========================================================
  // 3. GLOBAL CAPITAL
  // =========================================================
  {
    id: 'expenses',
    name: 'expenses',
    label: 'Business Expenses (Expense Edit)',
    module: 'Global Capital',
    description: 'Edit business and operational expenses, categories, and amounts',
    icon: 'Receipt',
  },
  {
    id: 'partner_capital_amounts',
    name: 'partner_capital_amounts',
    label: 'Partner Capital Amounts (Own 1st, Then Lenders)',
    module: 'Global Capital',
    description: 'Change partner capital amounts: Own capital as 1st row, followed by lenders',
    icon: 'Landmark',
  },
  {
    id: 'partner_capital_transactions',
    name: 'partner_capital_transactions',
    label: 'Capital Transactions (Transaction Edit)',
    module: 'Global Capital',
    description: 'Edit capital transactions, deposits, withdrawals, dates, and amounts',
    icon: 'Database',
  },

  // =========================================================
  // 4. AUDIT & ARCHIVES (View-Only)
  // =========================================================
  {
    id: 'deleted_loans_archive',
    name: 'deleted_loans_archive',
    label: 'Deleted Loans (View-Only History)',
    module: 'Audit & Archives',
    description: 'View-only historical audit archive of deleted loans, payments, and reverted capital',
    icon: 'Archive',
    isViewOnly: true,
  },
];

// Check if table is valid (handles physical and virtual tables)
async function getValidTables() {
  const allowed = MAIN_TABLES_CONFIG.map((t) => t.name).filter(
    (n) => n !== 'partner_capital_amounts'
  );
  const q = `
    SELECT table_name 
    FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = ANY($1)
    ORDER BY table_name;
  `;
  const res = await db.query(q, [allowed]);
  const tableNames = res.rows.map((r) => r.table_name);
  tableNames.push('partner_capital_amounts');
  return tableNames;
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
          if (item.name === 'partner_capital_amounts') {
            const pCount = await db.query(`SELECT COUNT(*)::int AS count FROM "global_partners"`);
            const lCount = await db.query(
              `SELECT COUNT(*)::int AS count FROM "partner_capital_transactions" WHERE fund_source_type = 'LEND' AND transaction_type IN ('CONTRIBUTION', 'ADJUSTMENT_INCREASE', 'CAPITAL_DEPOSIT')`
            );
            count = (pCount.rows[0]?.count || 0) + (lCount.rows[0]?.count || 0);
          } else if (item.name === 'autofinance_emi_schedules') {
            // Only count collected installments
            const countRes = await db.query(
              `SELECT COUNT(*)::int AS count FROM "autofinance_emi_schedules" WHERE (COALESCE(collected_amount, 0) > 0 OR status IN ('PAID', 'PARTIAL'))`
            );
            count = countRes.rows[0]?.count || 0;
          } else {
            const countRes = await db.query(`SELECT COUNT(*)::int AS count FROM "${item.name}"`);
            count = countRes.rows[0]?.count || 0;
          }
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
  daily_finance_accounts: {
    selectExtra: `, COALESCE(c.customer_name, '—') AS customer_name, COALESCE(c.mobile_number, '—') AS mobile_number, COALESCE(c.address, '—') AS address`,
    joinClause: `LEFT JOIN "daily_finance_customers" c ON c.customer_id = t.customer_id`,
    extraColumns: [
      { column_name: 'customer_name', data_type: 'character varying', is_nullable: 'NO', is_primary: false, is_virtual: true },
      { column_name: 'mobile_number', data_type: 'character varying', is_nullable: 'YES', is_primary: false, is_virtual: true },
      { column_name: 'address', data_type: 'text', is_nullable: 'YES', is_primary: false, is_virtual: true }
    ],
    searchFields: ['c.customer_name', 'c.mobile_number', 'c.address', 'c.notes', 't.status']
  },
  daily_finance_payments: {
    selectExtra: `, COALESCE(dc.customer_name, '—') AS customer_name, COALESCE(dc.mobile_number, '—') AS mobile_number, COALESCE(a.agreed_total_payable, 0) AS loan_total_payable, GREATEST(0, COALESCE(a.agreed_total_payable, 0) - COALESCE((SELECT SUM(allp.amount) FROM daily_finance_payments allp WHERE allp.finance_id = t.finance_id AND allp.status <> 'VOID'), 0)) AS loan_remaining_balance, COALESCE(a.status, 'ACTIVE') AS loan_status`,
    joinClause: `LEFT JOIN "daily_finance_customers" dc ON dc.customer_id = t.customer_id LEFT JOIN "daily_finance_accounts" a ON a.finance_id = t.finance_id`,
    extraColumns: [
      { column_name: 'customer_name', data_type: 'character varying', is_nullable: 'YES', is_primary: false, is_virtual: true },
      { column_name: 'mobile_number', data_type: 'character varying', is_nullable: 'YES', is_primary: false, is_virtual: true },
      { column_name: 'loan_total_payable', data_type: 'numeric', is_nullable: 'YES', is_primary: false, is_virtual: true },
      { column_name: 'loan_remaining_balance', data_type: 'numeric', is_nullable: 'YES', is_primary: false, is_virtual: true },
      { column_name: 'loan_status', data_type: 'character varying', is_nullable: 'YES', is_primary: false, is_virtual: true }
    ],
    searchFields: ['dc.customer_name', 'dc.mobile_number', 'dc.address', 'dc.notes', 'a.status']
  },
  autofinance_loans: {
    selectExtra: `, COALESCE(NULLIF(TRIM(c.first_name || ' ' || COALESCE(c.last_name, '')), ''), '—') AS customer_name, COALESCE(c.phone, '—') AS customer_phone, COALESCE(c.customer_code, '—') AS customer_code, COALESCE(v.registration_number, '—') AS registration_number, COALESCE(v.make, '—') AS vehicle_make, COALESCE(v.model, '—') AS vehicle_model`,
    joinClause: `LEFT JOIN "autofinance_customers" c ON c.id = t.customer_id LEFT JOIN "autofinance_vehicles" v ON v.loan_id = t.id`,
    extraColumns: [
      { column_name: 'customer_name', data_type: 'character varying', is_nullable: 'YES', is_primary: false, is_virtual: true },
      { column_name: 'customer_phone', data_type: 'character varying', is_nullable: 'YES', is_primary: false, is_virtual: true },
      { column_name: 'customer_code', data_type: 'character varying', is_nullable: 'YES', is_primary: false, is_virtual: true },
      { column_name: 'registration_number', data_type: 'character varying', is_nullable: 'YES', is_primary: false, is_virtual: true },
      { column_name: 'vehicle_make', data_type: 'character varying', is_nullable: 'YES', is_primary: false, is_virtual: true },
      { column_name: 'vehicle_model', data_type: 'character varying', is_nullable: 'YES', is_primary: false, is_virtual: true }
    ],
    searchFields: ['c.first_name', 'c.last_name', 'c.phone', 'c.customer_code', 'v.registration_number', 'v.make', 'v.model', 'v.vehicle_type']
  },
  autofinance_emi_schedules: {
    selectExtra: `, COALESCE(NULLIF(TRIM(c.first_name || ' ' || COALESCE(c.last_name, '')), ''), '—') AS customer_name, COALESCE(c.phone, '—') AS customer_phone, COALESCE(c.customer_code, '—') AS customer_code, COALESCE(v.registration_number, '—') AS registration_number`,
    joinClause: `LEFT JOIN "autofinance_loans" l ON l.id = t.loan_id LEFT JOIN "autofinance_customers" c ON c.id = l.customer_id LEFT JOIN "autofinance_vehicles" v ON v.loan_id = l.id`,
    extraColumns: [
      { column_name: 'customer_name', data_type: 'character varying', is_nullable: 'YES', is_primary: false, is_virtual: true },
      { column_name: 'customer_phone', data_type: 'character varying', is_nullable: 'YES', is_primary: false, is_virtual: true },
      { column_name: 'customer_code', data_type: 'character varying', is_nullable: 'YES', is_primary: false, is_virtual: true },
      { column_name: 'registration_number', data_type: 'character varying', is_nullable: 'YES', is_primary: false, is_virtual: true }
    ],
    searchFields: ['c.first_name', 'c.last_name', 'c.phone', 'c.customer_code', 'v.registration_number', 'l.id']
  },
  autofinance_payments: {
    selectExtra: `, COALESCE(NULLIF(TRIM(c.first_name || ' ' || COALESCE(c.last_name, '')), ''), '—') AS customer_name, COALESCE(c.phone, '—') AS customer_phone, COALESCE(c.customer_code, '—') AS customer_code, COALESCE(v.registration_number, '—') AS registration_number`,
    joinClause: `LEFT JOIN "autofinance_loans" l ON l.id = t.loan_id LEFT JOIN "autofinance_customers" c ON c.id = l.customer_id LEFT JOIN "autofinance_vehicles" v ON v.loan_id = l.id`,
    extraColumns: [
      { column_name: 'customer_name', data_type: 'character varying', is_nullable: 'YES', is_primary: false, is_virtual: true },
      { column_name: 'customer_phone', data_type: 'character varying', is_nullable: 'YES', is_primary: false, is_virtual: true },
      { column_name: 'customer_code', data_type: 'character varying', is_nullable: 'YES', is_primary: false, is_virtual: true },
      { column_name: 'registration_number', data_type: 'character varying', is_nullable: 'YES', is_primary: false, is_virtual: true }
    ],
    searchFields: ['c.first_name', 'c.last_name', 'c.phone', 'c.customer_code', 'v.registration_number', 'l.id']
  },
  deleted_loans_archive: {
    selectExtra: '',
    joinClause: '',
    extraColumns: [],
    searchFields: ['t.loan_id', 't.customer_name', 't.customer_phone', 't.loan_type', 't.deletion_reason']
  },
  partner_capital_transactions: {
    selectExtra: `, COALESCE(gp.name, '—') AS partner_name, COALESCE(gp.phone, '—') AS partner_phone, COALESCE(gp.email, '—') AS partner_email`,
    joinClause: `LEFT JOIN "global_partners" gp ON gp.id = t.partner_id`,
    extraColumns: [
      { column_name: 'partner_name', data_type: 'character varying', is_nullable: 'YES', is_primary: false, is_virtual: true },
      { column_name: 'partner_phone', data_type: 'character varying', is_nullable: 'YES', is_primary: false, is_virtual: true },
      { column_name: 'partner_email', data_type: 'character varying', is_nullable: 'YES', is_primary: false, is_virtual: true }
    ],
    searchFields: ['gp.name', 'gp.phone', 'gp.email', 'gp.pan_number', 'gp.address', 'gp.notes', 't.lender_name']
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

    // =========================================================================
    // SPECIAL VIRTUAL TABLE: partner_capital_amounts
    // Strictly sorts OWN as 1st row for each partner, followed by LEND name & amount
    // =========================================================================
    if (tableName === 'partner_capital_amounts') {
      const columns = [
        { column_name: 'id', data_type: 'character varying', is_nullable: 'NO', is_primary: true },
        { column_name: 'partner_name', data_type: 'character varying', is_nullable: 'NO', is_primary: false },
        { column_name: 'fund_source_type', data_type: 'character varying', is_nullable: 'NO', is_primary: false },
        { column_name: 'lender_name', data_type: 'character varying', is_nullable: 'YES', is_primary: false },
        { column_name: 'amount', data_type: 'numeric', is_nullable: 'NO', is_primary: false },
        { column_name: 'interest_rate', data_type: 'numeric', is_nullable: 'YES', is_primary: false },
        { column_name: 'effective_date', data_type: 'date', is_nullable: 'YES', is_primary: false },
        { column_name: 'status', data_type: 'character varying', is_nullable: 'YES', is_primary: false },
        { column_name: 'notes', data_type: 'text', is_nullable: 'YES', is_primary: false },
      ];

      let whereFilter = '';
      const queryParams = [];
      if (search) {
        whereFilter = `WHERE (combined.partner_name ILIKE $1 OR combined.lender_name ILIKE $1 OR combined.fund_source_type ILIKE $1 OR COALESCE(combined.notes, '') ILIKE $1)`;
        queryParams.push(`%${search}%`);
      }

      const baseCTE = `
        WITH own_capital AS (
          SELECT 
            ('own_' || p.id::text) AS id,
            p.id AS partner_id,
            p.name AS partner_name,
            'OWN' AS fund_source_type,
            'Own Funds' AS lender_name,
            COALESCE(
              SUM(CASE WHEN t.transaction_type IN ('CONTRIBUTION', 'ADJUSTMENT_INCREASE', 'CAPITAL_DEPOSIT') AND (t.fund_source_type = 'OWN' OR t.fund_source_type IS NULL) THEN t.amount ELSE 0 END)
              - SUM(CASE WHEN t.transaction_type IN ('WITHDRAWAL', 'ADJUSTMENT_DECREASE', 'CAPITAL_EXIT') AND (t.fund_source_type = 'OWN' OR t.fund_source_type IS NULL) THEN t.amount ELSE 0 END)
            , 0)::numeric AS amount,
            0::numeric AS interest_rate,
            COALESCE(MIN(t.effective_date), p.created_at::date) AS effective_date,
            p.notes,
            p.status
          FROM global_partners p
          LEFT JOIN partner_capital_transactions t ON t.partner_id = p.id AND t.status = 'COMPLETED'
          GROUP BY p.id, p.name, p.notes, p.status, p.created_at
        ),
        lend_capital AS (
          SELECT
            t.id::text AS id,
            p.id AS partner_id,
            p.name AS partner_name,
            'LEND' AS fund_source_type,
            COALESCE(t.lender_name, 'Lender') AS lender_name,
            t.amount::numeric AS amount,
            COALESCE(t.interest_rate, 0)::numeric AS interest_rate,
            t.effective_date,
            t.notes,
            t.status
          FROM partner_capital_transactions t
          JOIN global_partners p ON p.id = t.partner_id
          WHERE t.fund_source_type = 'LEND' AND t.transaction_type IN ('CONTRIBUTION', 'ADJUSTMENT_INCREASE', 'CAPITAL_DEPOSIT')
        ),
        combined AS (
          SELECT * FROM own_capital
          UNION ALL
          SELECT * FROM lend_capital
        )
      `;

      const countRes = await db.query(
        `${baseCTE} SELECT COUNT(*)::int AS total FROM combined ${whereFilter};`,
        queryParams
      );
      const totalCount = countRes.rows[0]?.total || 0;

      // Primary requirement: Own as first row, followed by lend name & amount
      let orderClause = `ORDER BY partner_name ASC, partner_id ASC, CASE WHEN fund_source_type = 'OWN' THEN 1 ELSE 2 END ASC, lender_name ASC`;
      if (sortBy) {
        if (sortBy === 'partner_name') {
          orderClause = `ORDER BY partner_name ${sortOrder}, partner_id ASC, CASE WHEN fund_source_type = 'OWN' THEN 1 ELSE 2 END ASC, lender_name ASC`;
        } else if (sortBy === 'amount') {
          orderClause = `ORDER BY partner_name ASC, CASE WHEN fund_source_type = 'OWN' THEN 1 ELSE 2 END ASC, amount ${sortOrder}`;
        } else if (sortBy === 'lender_name') {
          orderClause = `ORDER BY partner_name ASC, CASE WHEN fund_source_type = 'OWN' THEN 1 ELSE 2 END ASC, lender_name ${sortOrder}`;
        }
      }

      const dataParams = [...queryParams, limit, offset];
      const dataQuery = `
        ${baseCTE}
        SELECT * FROM combined
        ${whereFilter}
        ${orderClause}
        LIMIT $${queryParams.length + 1} OFFSET $${queryParams.length + 2};
      `;
      const dataRes = await db.query(dataQuery, dataParams);

      return res.json({
        success: true,
        tableName: 'partner_capital_amounts',
        columns,
        primaryKey: 'id',
        rows: dataRes.rows,
        totalCount,
        page,
        limit,
        totalPages: Math.ceil(totalCount / limit) || 1,
      });
    }

    // =========================================================================
    // STANDARD PHYSICAL TABLES
    // =========================================================================
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

    // Attach virtual columns if table is enriched
    const enrichment = TABLE_ENRICHMENTS[tableName];
    if (enrichment?.extraColumns) {
      columns.push(...enrichment.extraColumns);
    }

    const primaryCol = columns.find((c) => c.is_primary)?.column_name || 'id';

    // Build conditions & parameters
    const conditions = [];
    const params = [];

    // For Auto Finance: ONLY show collected list to edit, NOT all uncollected schedules
    if (tableName === 'autofinance_emi_schedules') {
      conditions.push(`(COALESCE(t.collected_amount, 0) > 0 OR t.status IN ('PAID', 'PARTIAL'))`);
    }

    if (search) {
      const searchConditions = [];
      columns.forEach((c) => {
        if (!c.is_virtual) {
          searchConditions.push(`CAST(t."${c.column_name}" AS TEXT) ILIKE $${params.length + 1}`);
        }
      });
      if (enrichment?.searchFields) {
        enrichment.searchFields.forEach((sf) => {
          searchConditions.push(`CAST(${sf} AS TEXT) ILIKE $${params.length + 1}`);
        });
      }
      if (searchConditions.length > 0) {
        conditions.push(`(${searchConditions.join(' OR ')})`);
        params.push(`%${search}%`);
      }

      const phoneDigits = search.replace(/\D/g, '');
      const hasPhoneDigits = phoneDigits.length >= 4 && /^[+\d\s().-]+$/.test(search);
      if (hasPhoneDigits) {
        const phoneConditions = [];
        columns
          .filter((column) => /phone|mobile|contact/i.test(column.column_name) && !column.is_virtual)
          .forEach((column) => {
            phoneConditions.push(`REGEXP_REPLACE(COALESCE(CAST(t."${column.column_name}" AS TEXT), ''), '[^0-9]', '', 'g') LIKE $${params.length + 1}`);
          });
        (enrichment?.searchFields || [])
          .filter((field) => /phone|mobile|contact/i.test(field))
          .forEach((field) => {
            phoneConditions.push(`REGEXP_REPLACE(COALESCE(CAST(${field} AS TEXT), ''), '[^0-9]', '', 'g') LIKE $${params.length + 1}`);
          });
        if (phoneConditions.length > 0) {
          conditions.push(`(${phoneConditions.join(' OR ')})`);
          params.push(`%${phoneDigits}%`);
        }
      }
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const joinClause = enrichment ? enrichment.joinClause : '';
    const selectExtra = enrichment ? enrichment.selectExtra : '';

    const countQuery = `SELECT COUNT(*)::int AS total FROM "${tableName}" t ${joinClause} ${whereClause};`;
    const countRes = await db.query(countQuery, params);
    const totalCount = countRes.rows[0]?.total || 0;

    // Sorting
    let orderClause = '';
    if (sortBy && columns.some((c) => c.column_name === sortBy)) {
      if (enrichment?.extraColumns?.some((ec) => ec.column_name === sortBy)) {
        orderClause = `ORDER BY "${sortBy}" ${sortOrder}`;
      } else {
        orderClause = `ORDER BY t."${sortBy}" ${sortOrder}`;
      }
    } else if (tableName === 'partner_capital_transactions') {
      // Order partner transactions: Partner name, then OWN first, then date
      orderClause = `ORDER BY gp.name ASC, CASE WHEN t.fund_source_type = 'OWN' OR t.fund_source_type IS NULL THEN 1 ELSE 2 END ASC, t.effective_date DESC`;
    } else if (columns.some((c) => c.column_name === 'created_at')) {
      orderClause = `ORDER BY t."created_at" DESC`;
    } else {
      orderClause = `ORDER BY t."${primaryCol}" ASC`;
    }

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
      totalPages: Math.ceil(totalCount / limit) || 1,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 3. PUT /api/table-editor/data/:tableName/:id
router.put('/data/:tableName/:id', requireAuth, async (req, res) => {
  try {
    const { tableName, id } = req.params;
    if (tableName === 'deleted_loans_archive') {
      return res.status(403).json({ error: 'Deleted loans archive is view-only and cannot be modified.' });
    }
    const updates = req.body;
    const validTables = await getValidTables();
    if (!validTables.includes(tableName)) {
      return res.status(404).json({ error: 'Table not found' });
    }

    let autoFinanceLoanIdToReschedule = null;

    // =========================================================================
    // 1. UPDATE: partner_capital_amounts
    // =========================================================================
    if (tableName === 'partner_capital_amounts') {
      const isOwn = String(id).startsWith('own_');
      const partnerId = isOwn ? id.replace('own_', '') : null;

      if (isOwn) {
        // Updating OWN row:
        if (updates.partner_name && updates.partner_name.trim()) {
          await db.query(`UPDATE global_partners SET name = $1, updated_at = NOW() WHERE id = $2`, [
            updates.partner_name.trim(),
            partnerId,
          ]);
        }
        if (updates.notes !== undefined) {
          await db.query(`UPDATE global_partners SET notes = $1, updated_at = NOW() WHERE id = $2`, [
            updates.notes,
            partnerId,
          ]);
        }
        if (updates.amount !== undefined && !isNaN(Number(updates.amount))) {
          const newAmount = Number(updates.amount);
          const txCheck = await db.query(
            `SELECT id, amount FROM partner_capital_transactions 
             WHERE partner_id = $1 AND (fund_source_type = 'OWN' OR fund_source_type IS NULL) AND transaction_type IN ('CONTRIBUTION', 'CAPITAL_DEPOSIT')
             ORDER BY effective_date ASC LIMIT 1`,
            [partnerId]
          );
          if (txCheck.rows.length > 0) {
            await db.query(
              `UPDATE partner_capital_transactions SET amount = $1, updated_at = NOW() WHERE id = $2`,
              [newAmount, txCheck.rows[0].id]
            );
          } else {
            await db.query(
              `INSERT INTO partner_capital_transactions (partner_id, transaction_type, amount, effective_date, fund_source_type, status, notes)
               VALUES ($1, 'CONTRIBUTION', $2, CURRENT_DATE, 'OWN', 'COMPLETED', 'Own Capital Contribution')`,
              [partnerId, newAmount]
            );
          }
        }

        const partnerRes = await db.query(
          `SELECT id, name, notes, status, created_at FROM global_partners WHERE id = $1`,
          [partnerId]
        );
        const p = partnerRes.rows[0];
        const ownSumRes = await db.query(
          `SELECT COALESCE(
            SUM(CASE WHEN transaction_type IN ('CONTRIBUTION', 'ADJUSTMENT_INCREASE', 'CAPITAL_DEPOSIT') AND (fund_source_type = 'OWN' OR fund_source_type IS NULL) THEN amount ELSE 0 END)
            - SUM(CASE WHEN transaction_type IN ('WITHDRAWAL', 'ADJUSTMENT_DECREASE', 'CAPITAL_EXIT') AND (fund_source_type = 'OWN' OR fund_source_type IS NULL) THEN amount ELSE 0 END)
          , 0)::numeric AS amount
          FROM partner_capital_transactions WHERE partner_id = $1 AND status = 'COMPLETED'`,
          [partnerId]
        );

        const updatedRow = {
          id: `own_${p.id}`,
          partner_id: p.id,
          partner_name: p.name,
          fund_source_type: 'OWN',
          lender_name: 'Own Funds',
          amount: ownSumRes.rows[0]?.amount || 0,
          interest_rate: 0,
          effective_date: p.created_at,
          status: p.status,
          notes: p.notes,
        };
        return res.json({ success: true, updatedRow });
      } else {
        // Updating LEND row (id is transaction UUID)
        const setClauses = [];
        const values = [];
        let pIdx = 1;

        if (updates.amount !== undefined && !isNaN(Number(updates.amount))) {
          setClauses.push(`amount = $${pIdx++}`);
          values.push(Number(updates.amount));
        }
        if (updates.lender_name !== undefined) {
          setClauses.push(`lender_name = $${pIdx++}`);
          values.push(updates.lender_name ? updates.lender_name.trim() : null);
        }
        if (updates.interest_rate !== undefined) {
          setClauses.push(`interest_rate = $${pIdx++}`);
          values.push(Number(updates.interest_rate) || 0);
        }
        if (updates.effective_date !== undefined) {
          setClauses.push(`effective_date = $${pIdx++}`);
          let effVal = updates.effective_date;
          if (typeof effVal === 'string' && /^\d{2}-\d{2}-\d{4}$/.test(effVal.trim())) {
            const [d, m, y] = effVal.trim().split('-');
            effVal = `${y}-${m}-${d}`;
          }
          values.push(effVal || null);
        }
        if (updates.notes !== undefined) {
          setClauses.push(`notes = $${pIdx++}`);
          values.push(updates.notes);
        }
        if (updates.status !== undefined) {
          setClauses.push(`status = $${pIdx++}`);
          values.push(updates.status);
        }

        if (setClauses.length > 0) {
          setClauses.push(`updated_at = NOW()`);
          values.push(id);
          await db.query(
            `UPDATE partner_capital_transactions SET ${setClauses.join(', ')} WHERE id = $${pIdx}`,
            values
          );
        }

        if (updates.partner_name && updates.partner_name.trim()) {
          const pIdRes = await db.query(
            `SELECT partner_id FROM partner_capital_transactions WHERE id = $1`,
            [id]
          );
          if (pIdRes.rows.length > 0) {
            await db.query(
              `UPDATE global_partners SET name = $1, updated_at = NOW() WHERE id = $2`,
              [updates.partner_name.trim(), pIdRes.rows[0].partner_id]
            );
          }
        }

        const txRes = await db.query(
          `SELECT t.id::text, t.partner_id, p.name AS partner_name, t.fund_source_type, t.lender_name, t.amount, t.interest_rate, t.effective_date, t.status, t.notes
           FROM partner_capital_transactions t
           JOIN global_partners p ON p.id = t.partner_id
           WHERE t.id = $1`,
          [id]
        );

        return res.json({ success: true, updatedRow: txRes.rows[0] });
      }
    }

    // =========================================================================
    // 2. UPDATE: daily_finance_accounts (Unified Name + Amount)
    // =========================================================================
    if (tableName === 'daily_finance_accounts') {
      const accRes = await db.query(
        `SELECT * FROM daily_finance_accounts WHERE finance_id = $1`,
        [id]
      );
      if (accRes.rows.length === 0) {
        return res.status(404).json({ error: 'Daily loan account not found' });
      }
      const currentAcc = accRes.rows[0];
      const custId = currentAcc.customer_id;

      // Update customer details in daily_finance_customers
      const custSetClauses = [];
      const custValues = [];
      let cIdx = 1;

      if (updates.customer_name !== undefined && updates.customer_name.trim() !== '') {
        custSetClauses.push(`customer_name = $${cIdx++}`);
        custValues.push(updates.customer_name.trim());
      }
      if (updates.mobile_number !== undefined) {
        custSetClauses.push(`mobile_number = $${cIdx++}`);
        custValues.push(updates.mobile_number ? updates.mobile_number.trim() : null);
      }
      if (updates.address !== undefined) {
        custSetClauses.push(`address = $${cIdx++}`);
        custValues.push(updates.address ? updates.address.trim() : null);
      }
      if (custSetClauses.length > 0) {
        custSetClauses.push(`updated_at = NOW()`);
        custValues.push(custId);
        await db.query(
          `UPDATE daily_finance_customers SET ${custSetClauses.join(', ')} WHERE customer_id = $${cIdx}`,
          custValues
        );
      }

      // Financial term calculations
      const gross = updates.gross_finance_amount !== undefined
        ? Number(updates.gross_finance_amount)
        : Number(currentAcc.gross_finance_amount);

      const intType = updates.interest_type || currentAcc.interest_type || 'AMOUNT';
      const intVal = updates.interest_value !== undefined
        ? Number(updates.interest_value)
        : Number(currentAcc.interest_value || 0);

      let deduction = Number(currentAcc.initial_deduction || 0);
      if (updates.initial_deduction !== undefined && !isNaN(Number(updates.initial_deduction))) {
        deduction = Number(updates.initial_deduction);
      } else if (
        updates.gross_finance_amount !== undefined ||
        updates.interest_value !== undefined ||
        updates.interest_type !== undefined
      ) {
        deduction = intType === 'PERCENT' ? (gross * intVal) / 100 : intVal;
        updates.initial_deduction = deduction;
      }

      if (updates.gross_finance_amount !== undefined && updates.agreed_total_payable === undefined) {
        updates.agreed_total_payable = gross;
      }

      // Check remaining balance vs total collected for this daily loan
      const collRes = await db.query(
        `SELECT COALESCE(SUM(amount), 0) AS total_collected 
         FROM daily_finance_payments 
         WHERE finance_id = $1 AND status <> 'VOID'`,
        [id]
      );
      const totalCollected = Number(collRes.rows[0]?.total_collected || 0);
      const targetPayable = updates.agreed_total_payable !== undefined
        ? Number(updates.agreed_total_payable)
        : Number(currentAcc.agreed_total_payable);

      if (targetPayable < totalCollected - 0.001) {
        return res.status(400).json({
          error: `Agreed total payable (₹${targetPayable.toLocaleString('en-IN')}) cannot be reduced below the amount already collected (₹${totalCollected.toLocaleString('en-IN')}).`
        });
      }

      const accRemaining = Number(Math.max(0, targetPayable - totalCollected).toFixed(2));
      if (accRemaining <= 0) {
        updates.status = 'COMPLETED';
        if (!updates.closed_date && !currentAcc.closed_date) {
          updates.closed_date = updates.finance_date || currentAcc.finance_date || new Date();
        }
      } else if (accRemaining > 0 && currentAcc.status === 'COMPLETED' && updates.status === undefined) {
        updates.status = 'ACTIVE';
        updates.closed_date = null;
      }

      // Prevent modifying Postgres GENERATED ALWAYS STORED column
      delete updates.net_disbursement;

      // Update global_cash_ledger disbursement
      const netDisbursement = gross - deduction;
      let effDate = updates.finance_date || currentAcc.finance_date;
      if (typeof effDate === 'string' && /^\d{2}-\d{2}-\d{4}$/.test(effDate.trim())) {
        const [d, m, y] = effDate.trim().split('-');
        effDate = `${y}-${m}-${d}`;
      }
      await db.query(
        `UPDATE global_cash_ledger
         SET amount = $1, effective_date = $2
         WHERE type = 'DAILY_LOAN_DISBURSEMENT' AND reference_id = $3::uuid`,
        [netDisbursement, effDate, id]
      );
    }

    // =========================================================================
    // 3. UPDATE: daily_finance_payments
    // =========================================================================
    if (tableName === 'daily_finance_payments') {
      const payRes = await db.query(
        `SELECT * FROM daily_finance_payments WHERE payment_id = $1`,
        [id]
      );
      if (payRes.rows.length === 0) {
        return res.status(404).json({ error: 'Payment record not found' });
      }
      const curPay = payRes.rows[0];
      const financeId = curPay.finance_id;

      // Fetch parent loan account details
      const accRes = await db.query(
        `SELECT agreed_total_payable, gross_finance_amount, status, finance_date, closed_date 
         FROM daily_finance_accounts WHERE finance_id = $1`,
        [financeId]
      );
      if (accRes.rows.length === 0) {
        return res.status(404).json({ error: 'Associated daily loan account not found' });
      }
      const curAcc = accRes.rows[0];
      const agreedPayable = Number(curAcc.agreed_total_payable || curAcc.gross_finance_amount || 0);

      // Fetch sum of all OTHER valid payments for this loan
      const otherCollRes = await db.query(
        `SELECT COALESCE(SUM(amount), 0) AS other_collected 
         FROM daily_finance_payments 
         WHERE finance_id = $1 AND payment_id <> $2 AND status <> 'VOID'`,
        [financeId, id]
      );
      const otherCollected = Number(otherCollRes.rows[0]?.other_collected || 0);
      const maxAllowed = Math.max(0, Number((agreedPayable - otherCollected).toFixed(2)));

      if (updates.amount !== undefined) {
        const newAmt = Number(updates.amount);
        if (isNaN(newAmt) || newAmt < 0) {
          return res.status(400).json({ error: 'Collection amount must be a valid positive number.' });
        }

        // PREVENT edited amount from exceeding the remaining balance!
        if (newAmt > maxAllowed + 0.001) {
          return res.status(400).json({
            error: `Edited collection amount (₹${newAmt.toLocaleString('en-IN')}) exceeds remaining loan balance. Maximum allowed amount is ₹${maxAllowed.toLocaleString('en-IN')}.`
          });
        }
      }

      // Update customer name if provided
      if (updates.customer_name !== undefined && updates.customer_name.trim() !== '') {
        await db.query(
          `UPDATE daily_finance_customers SET customer_name = $1, updated_at = NOW() WHERE customer_id = $2`,
          [updates.customer_name.trim(), curPay.customer_id]
        );
      }

      // Sync global_cash_ledger collection
      const newAmt = updates.amount !== undefined ? Number(updates.amount) : Number(curPay.amount);
      let newDate = updates.collection_date || curPay.collection_date;
      if (typeof newDate === 'string' && /^\d{2}-\d{2}-\d{4}$/.test(newDate.trim())) {
        const [d, m, y] = newDate.trim().split('-');
        newDate = `${y}-${m}-${d}`;
      }
      await db.query(
        `UPDATE global_cash_ledger
         SET amount = $1, effective_date = $2
         WHERE type = 'DAILY_COLLECTION' AND reference_id = $3::uuid`,
        [newAmt, newDate, id]
      );

      // Reconcile and close/reopen loan:
      // If remaining balance becomes 0 -> close loan (status = 'COMPLETED')
      // If remaining balance > 0 and loan was completed -> revert to 'ACTIVE'
      const newTotalCollected = Number((otherCollected + newAmt).toFixed(2));
      const newRemaining = Number(Math.max(0, agreedPayable - newTotalCollected).toFixed(2));

      let newLoanStatus = curAcc.status;
      let newClosedDate = curAcc.closed_date;

      if (newRemaining <= 0) {
        newLoanStatus = 'COMPLETED';
        newClosedDate = newDate || new Date();
      } else if (newRemaining > 0 && curAcc.status === 'COMPLETED') {
        newLoanStatus = 'ACTIVE';
        newClosedDate = null;
      }

      await db.query(
        `UPDATE daily_finance_accounts 
         SET status = $1, closed_date = $2, updated_at = NOW() 
         WHERE finance_id = $3`,
        [newLoanStatus, newClosedDate, financeId]
      );
    }

    // =========================================================================
    // 4. UPDATE: autofinance_loans
    // =========================================================================
    if (tableName === 'autofinance_loans') {
      const lRes = await db.query(
        `SELECT l.*, v.id AS vehicle_id, c.id AS cust_id
         FROM autofinance_loans l
         LEFT JOIN autofinance_customers c ON c.id = l.customer_id
         LEFT JOIN autofinance_vehicles v ON v.loan_id = l.id
         WHERE l.id = $1`,
        [id]
      );
      if (lRes.rows.length > 0) {
        const curL = lRes.rows[0];

        // Update customer name & phone if provided
        if (curL.cust_id && (updates.customer_name !== undefined || updates.customer_phone !== undefined)) {
          const cSet = [];
          const cVals = [];
          let ci = 1;
          if (updates.customer_name !== undefined && updates.customer_name.trim()) {
            const parts = updates.customer_name.trim().split(' ');
            const first = parts[0];
            const last = parts.slice(1).join(' ') || null;
            cSet.push(`first_name = $${ci++}`, `last_name = $${ci++}`);
            cVals.push(first, last);
          }
          if (updates.customer_phone !== undefined) {
            cSet.push(`phone = $${ci++}`);
            cVals.push(updates.customer_phone ? updates.customer_phone.trim() : null);
          }
          if (cSet.length > 0) {
            cSet.push(`updated_at = NOW()`);
            cVals.push(curL.cust_id);
            await db.query(`UPDATE autofinance_customers SET ${cSet.join(', ')} WHERE id = $${ci}`, cVals);
          }
        }

        // Update vehicle registration number if provided
        if (updates.registration_number !== undefined && curL.vehicle_id) {
          await db.query(
            `UPDATE autofinance_vehicles SET registration_number = $1, updated_at = NOW() WHERE id = $2`,
            [updates.registration_number.trim(), curL.vehicle_id]
          );
        }

        // Sync global_cash_ledger if loan_amount or disbursement_date changes
        const newLoanAmt = updates.loan_amount !== undefined ? Number(updates.loan_amount) : Number(curL.loan_amount);
        let newDisbDate = updates.disbursement_date || updates.start_date || curL.start_date || new Date();
        if (typeof newDisbDate === 'string' && /^\d{2}-\d{2}-\d{4}$/.test(newDisbDate.trim())) {
          const [d, m, y] = newDisbDate.trim().split('-');
          newDisbDate = `${y}-${m}-${d}`;
        }
        await db.query(
          `UPDATE global_cash_ledger
           SET amount = $1, effective_date = $2
           WHERE type = 'AUTO_LOAN_DISBURSEMENT' AND reference_id = $3::uuid`,
          [newLoanAmt, newDisbDate, id]
        );

        autoFinanceLoanIdToReschedule = id;
      }
    }

    // =========================================================================
    // 5. UPDATE: expenses
    // =========================================================================
    if (tableName === 'expenses') {
      const expRes = await db.query(`SELECT * FROM expenses WHERE id = $1`, [id]);
      if (expRes.rows.length > 0) {
        const curExp = expRes.rows[0];
        const finalCat = (updates.category || curExp.category || '').toUpperCase();
        if (finalCat === 'DAILY') {
          const newAmt = updates.amount !== undefined ? Number(updates.amount) : Number(curExp.amount);
          let newDate = updates.expense_date || curExp.expense_date;
          if (typeof newDate === 'string' && /^\d{2}-\d{2}-\d{4}$/.test(newDate.trim())) {
            const [d, m, y] = newDate.trim().split('-');
            newDate = `${y}-${m}-${d}`;
          }
          const newDesc = updates.description !== undefined ? updates.description : curExp.description;
          await db.query(
            `INSERT INTO daily_finance_expenses (expense_id, expense_date, amount, description, updated_at)
             VALUES ($1, $2, $3, $4, NOW())
             ON CONFLICT (expense_id) DO UPDATE
             SET amount = EXCLUDED.amount,
                 expense_date = EXCLUDED.expense_date,
                 description = EXCLUDED.description,
                 updated_at = NOW()`,
            [id, newDate, newAmt, newDesc]
          );
        }
      }
    }

    // =========================================================================
    // 3. UPDATE: autofinance_emi_schedules (Sync breakdown, status & payments)
    // =========================================================================
    if (tableName === 'autofinance_emi_schedules') {
      const curRes = await db.query(
        `SELECT id, loan_id, installment_number, principal_component, interest_component, total_emi 
         FROM autofinance_emi_schedules WHERE id = $1`,
        [id]
      );
      if (curRes.rows.length > 0) {
        const sched = curRes.rows[0];
        autoFinanceLoanIdToReschedule = sched.loan_id;
        const pComp = Number(sched.principal_component || 0);
        const iComp = Number(sched.interest_component || 0);
        const contractualEmi = Number((pComp + iComp).toFixed(2));

        if (updates.collected_amount !== undefined) {
          const rawCol = updates.collected_amount;
          const newAmt = (rawCol === '' || rawCol === null || isNaN(Number(rawCol)))
            ? 0
            : Math.max(0, Number(Number(rawCol).toFixed(2)));

          let paidInterest = 0;
          let paidPrincipal = 0;
          let extraPrincipal = 0;
          let newStatus = 'PENDING';

          if (newAmt > 0) {
            let rem = newAmt;
            paidInterest = Number(Math.min(rem, iComp).toFixed(2));
            rem = Number((rem - paidInterest).toFixed(2));
            paidPrincipal = Number(Math.min(rem, pComp).toFixed(2));
            rem = Number((rem - paidPrincipal).toFixed(2));
            extraPrincipal = Number(Math.max(0, rem).toFixed(2));

            const isFullyPaid = (paidInterest >= iComp - 0.01) && (paidPrincipal >= pComp - 0.01) && contractualEmi > 0;
            newStatus = isFullyPaid ? 'PAID' : 'PARTIAL';
          }

          updates.collected_amount = newAmt > 0 ? newAmt : null;
          updates.paid_interest = paidInterest;
          updates.paid_principal = paidPrincipal;
          updates.extra_principal_paid = extraPrincipal;
          updates.status = newStatus;
          updates.total_emi = contractualEmi;

          // Reconcile autofinance_payments
          if (newAmt > 0) {
            const payCheck = await db.query(
              `SELECT id FROM autofinance_payments WHERE emi_id = $1 ORDER BY created_at ASC`,
              [id]
            );
            if (payCheck.rows.length > 0) {
              const primaryId = payCheck.rows[0].id;
              await db.query(
                `UPDATE autofinance_payments 
                 SET amount_paid = $1, principal_paid = $2, interest_paid = $3, extra_principal_paid = $4, payment_date = CURRENT_DATE
                 WHERE id = $5`,
                [newAmt, paidPrincipal, paidInterest, extraPrincipal, primaryId]
              );
              if (payCheck.rows.length > 1) {
                const extraIds = payCheck.rows.slice(1).map((r) => r.id);
                await db.query(`DELETE FROM autofinance_payments WHERE id = ANY($1)`, [extraIds]);
              }
            } else {
              await db.query(
                `INSERT INTO autofinance_payments (
                  loan_id, emi_id, payment_date, amount_paid, principal_paid, interest_paid, extra_principal_paid, payment_method, reference_number
                ) VALUES ($1, $2, CURRENT_DATE, $3, $4, $5, $6, 'CASH', 'Table Studio')`,
                [autoFinanceLoanIdToReschedule, id, newAmt, paidPrincipal, paidInterest, extraPrincipal]
              );
            }
          } else {
            await db.query(`DELETE FROM autofinance_payments WHERE emi_id = $1`, [id]);
          }
        }
      }
    }

    // =========================================================================
    // 4. STANDARD COLUMN UPDATES
    // =========================================================================
    const colRes = await db.query(
      `SELECT column_name, is_nullable 
       FROM information_schema.columns 
       WHERE table_schema = 'public' AND table_name = $1;`,
      [tableName]
    );
    const validCols = new Set(colRes.rows.map((r) => r.column_name));

    const pkRes = await db.query(
      `SELECT kcu.column_name
       FROM information_schema.table_constraints tc
       JOIN information_schema.key_column_usage kcu 
         ON tc.constraint_name = kcu.constraint_name AND tc.table_schema = kcu.table_schema
       WHERE tc.constraint_type = 'PRIMARY KEY' AND tc.table_name = $1
       LIMIT 1;`,
      [tableName]
    );
    const primaryKey = pkRes.rows[0]?.column_name || 'id';

    const setClauses = [];
    const values = [];
    let paramIdx = 1;

    for (const [key, val] of Object.entries(updates)) {
      if (key !== primaryKey && validCols.has(key)) {
        setClauses.push(`"${key}" = $${paramIdx}`);
        let formattedVal = val;
        if (formattedVal === '') formattedVal = null;
        if (typeof formattedVal === 'string' && /^\d{2}-\d{2}-\d{4}$/.test(formattedVal.trim())) {
          const [d, m, y] = formattedVal.trim().split('-');
          formattedVal = `${y}-${m}-${d}`;
        }
        values.push(formattedVal);
        paramIdx++;
      }
    }

    if (setClauses.length > 0) {
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
      await db.query(updateQuery, values);
    }

    // Post-update: trigger loan rescheduling and status recalculation
    if (autoFinanceLoanIdToReschedule) {
      try {
        await rescheduleFutureEMIs(db, autoFinanceLoanIdToReschedule);
      } catch (e) {
        console.error('Error rescheduling future EMIs after table editor update:', e);
      }
    }

    // Re-fetch updated row with joined columns
    let updatedRow = null;
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
    } else {
      const baseReRes = await db.query(`SELECT * FROM "${tableName}" WHERE "${primaryKey}" = $1;`, [id]);
      if (baseReRes.rows.length > 0) {
        updatedRow = baseReRes.rows[0];
      }
    }

    if (!updatedRow) {
      return res.status(404).json({ error: 'Record not found to update' });
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

// 4. POST /api/table-editor/data/:tableName - DISABLED (Edit & Update only)
router.post('/data/:tableName', requireAuth, async (req, res) => {
  return res.status(403).json({
    error: 'Insertions are disabled in Table Studio. Only editing and updating existing records are allowed.',
  });
});

// Details for deleted loan archive record
router.get('/loan-archive-details/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const result = await db.query('SELECT * FROM deleted_loans_archive WHERE id = $1 OR loan_id = $1', [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Deleted loan archive record not found.' });
    }
    return res.json(result.rows[0]);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// 5. DELETE /api/table-editor/data/:tableName/:id and /loan/:tableName/:id
const handleDeleteLoan = async (req, res) => {
  try {
    const { tableName, id } = req.params;
    const adminUser = req.session?.user?.username || req.headers['x-admin-user'] || 'Admin';
    const reason = req.body?.reason || req.query?.reason || 'Deleted via Table Studio';

    if (tableName === 'daily_finance_accounts') {
      const result = await deleteDailyLoan(db, id, adminUser, reason);
      return res.json({
        success: true,
        message: `Daily Loan #${id} (${result.customerName}) deleted successfully. Reverted ₹${result.revertedCapital} capital and removed ${result.deletedCollectionsCount} collection payments.`,
        data: result,
      });
    }

    if (tableName === 'autofinance_loans') {
      const result = await deleteAutoLoan(db, id, adminUser, reason);
      return res.json({
        success: true,
        message: `Auto Loan #${id} (${result.customerName}) deleted successfully. Reverted ₹${result.revertedCapital} capital and removed ${result.deletedCollectionsCount} collection payments.`,
        data: result,
      });
    }

    return res.status(403).json({
      error: "Deletions are only permitted on loan tables ('daily_finance_accounts' and 'autofinance_loans').",
    });
  } catch (err) {
    console.error('[tableEditorRoutes] Delete loan error:', err);
    return res.status(500).json({ error: err.message });
  }
};

router.delete('/loan/:tableName/:id', requireAuth, handleDeleteLoan);
router.delete('/data/:tableName/:id', requireAuth, handleDeleteLoan);

export default router;
