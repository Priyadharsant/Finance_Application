import express from 'express';
import { pool as db } from '../../autoFinance/config/db.js';
import { verifyAuthToken } from './appAuthRoutes.js';
import { rescheduleFutureEMIs } from '../../autoFinance/services/loanService.js';

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

// Curated list of MAIN tables organized strictly into Daily, Auto, and Global:
const MAIN_TABLES_CONFIG = [
  // =========================================================
  // 1. DAILY FINANCE
  // =========================================================
  {
    id: 'daily_finance_accounts',
    name: 'daily_finance_accounts',
    label: 'Daily Loans (Change Name & Amount)',
    module: 'Daily Finance',
    description: 'Change borrower name, loan amount, daily due, and payable in one table',
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
  // 2. AUTO FINANCE (Collected list only, uncollected schedules excluded)
  // =========================================================
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
    searchFields: ['c.customer_name', 'c.mobile_number', 't.status']
  },
  daily_finance_payments: {
    selectExtra: `, COALESCE(dc.customer_name, '—') AS customer_name`,
    joinClause: `LEFT JOIN "daily_finance_customers" dc ON dc.customer_id = t.customer_id`,
    extraColumns: [
      { column_name: 'customer_name', data_type: 'character varying', is_nullable: 'YES', is_primary: false, is_virtual: true }
    ],
    searchFields: ['dc.customer_name']
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
  partner_capital_transactions: {
    selectExtra: `, COALESCE(gp.name, '—') AS partner_name`,
    joinClause: `LEFT JOIN "global_partners" gp ON gp.id = t.partner_id`,
    extraColumns: [
      { column_name: 'partner_name', data_type: 'character varying', is_nullable: 'YES', is_primary: false, is_virtual: true }
    ],
    searchFields: ['gp.name', 't.lender_name']
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
    const updates = req.body;
    const validTables = await getValidTables();
    if (!validTables.includes(tableName)) {
      return res.status(404).json({ error: 'Table not found' });
    }

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
        `SELECT customer_id, gross_finance_amount, agreed_total_payable FROM daily_finance_accounts WHERE finance_id = $1`,
        [id]
      );
      if (accRes.rows.length > 0) {
        const custId = accRes.rows[0].customer_id;
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
          custValues.push(updates.address);
        }
        if (custSetClauses.length > 0) {
          custSetClauses.push(`updated_at = NOW()`);
          custValues.push(custId);
          await db.query(
            `UPDATE daily_finance_customers SET ${custSetClauses.join(', ')} WHERE customer_id = $${cIdx}`,
            custValues
          );
        }

        if (updates.gross_finance_amount !== undefined) {
          updates.agreed_total_payable = updates.gross_finance_amount;
        }
      }
    }

    // =========================================================================
    // 3. UPDATE: autofinance_emi_schedules (Sync breakdown, status & payments)
    // =========================================================================
    let autoFinanceLoanIdToReschedule = null;

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

// 5. DELETE /api/table-editor/data/:tableName/:id - DISABLED (Edit & Update only)
router.delete('/data/:tableName/:id', requireAuth, async (req, res) => {
  return res.status(403).json({
    error: 'Deletions are disabled in Table Studio. Only editing and updating existing records are allowed.',
  });
});

export default router;
