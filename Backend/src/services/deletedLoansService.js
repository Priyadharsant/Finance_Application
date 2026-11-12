/**
 * Service to handle safe, audited deletion of loans across Daily Finance and Auto Finance.
 * Completely cascades payments, schedules, vehicles, documents, and reverts global_cash_ledger capital.
 * Automatically archives the deleted loan snapshot in `deleted_loans_archive` for view-only reference.
 */

export async function ensureDeletedLoansTable(db) {
  const query = `
    CREATE TABLE IF NOT EXISTS deleted_loans_archive (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      loan_id VARCHAR(255) NOT NULL,
      loan_type VARCHAR(50) NOT NULL,
      customer_name VARCHAR(255),
      customer_phone VARCHAR(50),
      principal_amount NUMERIC(15, 2) DEFAULT 0,
      total_amount NUMERIC(15, 2) DEFAULT 0,
      total_collected NUMERIC(15, 2) DEFAULT 0,
      disbursement_date TIMESTAMPTZ,
      deleted_at TIMESTAMPTZ DEFAULT NOW(),
      deleted_by VARCHAR(100) DEFAULT 'Admin',
      deletion_reason TEXT,
      details_json JSONB
    );
    CREATE INDEX IF NOT EXISTS idx_deleted_loans_archive_deleted_at ON deleted_loans_archive(deleted_at DESC);
  `;
  try {
    await db.query(query);
  } catch (err) {
    console.error('[deletedLoansService] Error ensuring table exists:', err.message);
  }
}

export async function deleteDailyLoan(db, financeId, adminUser = 'Admin', reason = 'Deleted via Table Studio') {
  const client = await db.connect();
  try {
    await client.query('BEGIN');

    // 1. Fetch loan and customer details
    const loanRes = await client.query(
      `SELECT a.*, 
              COALESCE(c.customer_name, 'Unknown') AS customer_name,
              c.mobile_number,
              c.address
       FROM daily_finance_accounts a
       LEFT JOIN daily_finance_customers c ON c.customer_id = a.customer_id
       WHERE a.finance_id = $1`,
      [financeId]
    );

    if (loanRes.rows.length === 0) {
      throw new Error(`Daily Loan with ID "${financeId}" not found.`);
    }

    const loan = loanRes.rows[0];

    // 2. Fetch all collections / payments
    const paymentsRes = await client.query(
      `SELECT * FROM daily_finance_payments WHERE finance_id = $1 ORDER BY collection_date ASC`,
      [financeId]
    );
    const payments = paymentsRes.rows;
    const paymentIds = payments.map((p) => p.payment_id);

    // 3. Calculate summary metrics
    const totalCollected = payments.reduce(
      (sum, p) => sum + Number(p.amount || p.amount_paid || p.collected_amount || 0),
      0
    );

    // 4. Archive into deleted_loans_archive
    await client.query(
      `INSERT INTO deleted_loans_archive (
        loan_id,
        loan_type,
        customer_name,
        customer_phone,
        principal_amount,
        total_amount,
        total_collected,
        disbursement_date,
        deleted_by,
        deletion_reason,
        details_json
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
      [
        String(loan.finance_id),
        'DAILY',
        loan.customer_name || '—',
        loan.mobile_number || '—',
        Number(loan.gross_finance_amount || loan.net_disbursement || 0),
        Number(loan.agreed_total_payable || loan.gross_finance_amount || 0),
        totalCollected,
        loan.finance_date || loan.created_at || new Date(),
        adminUser,
        reason,
        JSON.stringify({
          loanDetails: loan,
          collectionsCount: payments.length,
          collections: payments,
          deletedAt: new Date().toISOString(),
        }),
      ]
    );

    // 5. Revert / Delete all related records in global_cash_ledger
    // This reverses the loan disbursement debit and any collection credits, fully reverting capital
    if (paymentIds.length > 0) {
      await client.query(
        `DELETE FROM global_cash_ledger 
         WHERE (source_module = 'DAILY' AND reference_type = 'DAILY_LOAN' AND reference_id = $1::uuid)
            OR (source_module = 'DAILY' AND reference_type = 'DAILY_PAYMENT' AND reference_id = ANY($2::uuid[]))
            OR (reference_id = $1::uuid)`,
        [financeId, paymentIds]
      );
    } else {
      await client.query(
        `DELETE FROM global_cash_ledger 
         WHERE (source_module = 'DAILY' AND reference_type = 'DAILY_LOAN' AND reference_id = $1::uuid)
            OR (reference_id = $1::uuid)`,
        [financeId]
      );
    }

    // 6. Delete from relational tables with explicit FK ordering
    await client.query(`DELETE FROM daily_finance_historical_collections WHERE finance_id = $1::uuid`, [financeId]);
    await client.query(`DELETE FROM daily_finance_audit_logs WHERE entity_id = $1::uuid`, [financeId]);
    await client.query(`DELETE FROM daily_finance_payments WHERE finance_id = $1::uuid`, [financeId]);
    await client.query(`DELETE FROM daily_finance_accounts WHERE finance_id = $1::uuid`, [financeId]);

    await client.query('COMMIT');

    return {
      success: true,
      loanId: financeId,
      loanType: 'DAILY',
      customerName: loan.customer_name,
      revertedCapital: Number(loan.gross_finance_amount || loan.net_disbursement || 0),
      deletedCollectionsCount: payments.length,
      deletedTotalCollected: totalCollected,
    };
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

export async function deleteAutoLoan(db, loanId, adminUser = 'Admin', reason = 'Deleted via Table Studio') {
  const client = await db.connect();
  try {
    await client.query('BEGIN');

    // 1. Fetch loan and customer details
    const loanRes = await client.query(
      `SELECT l.*,
              COALESCE(NULLIF(TRIM(c.first_name || ' ' || COALESCE(c.last_name, '')), ''), 'Unknown') AS customer_name,
              c.phone AS customer_phone,
              c.customer_code,
              v.registration_number,
              v.make AS vehicle_make,
              v.model AS vehicle_model
       FROM autofinance_loans l
       LEFT JOIN autofinance_customers c ON c.id = l.customer_id
       LEFT JOIN autofinance_vehicles v ON v.loan_id = l.id
       WHERE l.id = $1`,
      [loanId]
    );

    if (loanRes.rows.length === 0) {
      throw new Error(`Auto Loan with ID "${loanId}" not found.`);
    }

    const loan = loanRes.rows[0];

    // 2. Fetch payments, EMI schedules, and vehicle
    const paymentsRes = await client.query(
      `SELECT * FROM autofinance_payments WHERE loan_id = $1 ORDER BY payment_date ASC`,
      [loanId]
    );
    const payments = paymentsRes.rows;
    const paymentIds = payments.map((p) => p.id);

    const schedulesRes = await client.query(
      `SELECT * FROM autofinance_emi_schedules WHERE loan_id = $1 ORDER BY installment_number ASC`,
      [loanId]
    );
    const schedules = schedulesRes.rows;

    const vehicleRes = await client.query(
      `SELECT * FROM autofinance_vehicles WHERE loan_id = $1`,
      [loanId]
    );
    const vehicles = vehicleRes.rows;

    const totalCollected = payments.reduce(
      (sum, p) => sum + Number(p.amount_paid || p.collected_amount || 0),
      0
    );

    // 3. Archive into deleted_loans_archive
    await client.query(
      `INSERT INTO deleted_loans_archive (
        loan_id,
        loan_type,
        customer_name,
        customer_phone,
        principal_amount,
        total_amount,
        total_collected,
        disbursement_date,
        deleted_by,
        deletion_reason,
        details_json
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
      [
        String(loan.id),
        'AUTO',
        loan.customer_name || '—',
        loan.customer_phone || '—',
        Number(loan.loan_amount || loan.principal_amount || 0),
        Number(loan.total_amount || 0),
        totalCollected,
        loan.start_date || loan.created_at || new Date(),
        adminUser,
        reason,
        JSON.stringify({
          loanDetails: loan,
          collectionsCount: payments.length,
          collections: payments,
          schedulesCount: schedules.length,
          schedules,
          vehicles,
          deletedAt: new Date().toISOString(),
        }),
      ]
    );

    // 4. Revert / Delete all related records in global_cash_ledger
    if (paymentIds.length > 0) {
      await client.query(
        `DELETE FROM global_cash_ledger 
         WHERE (source_module = 'AUTO' AND reference_type = 'AUTO_LOAN' AND reference_id = $1::uuid)
            OR (source_module = 'AUTO' AND reference_type = 'AUTO_PAYMENT' AND reference_id = ANY($2::uuid[]))
            OR (reference_id = $1::uuid)`,
        [loanId, paymentIds]
      );
    } else {
      await client.query(
        `DELETE FROM global_cash_ledger 
         WHERE (source_module = 'AUTO' AND reference_type = 'AUTO_LOAN' AND reference_id = $1::uuid)
            OR (reference_id = $1::uuid)`,
        [loanId]
      );
    }

    // 5. Cascade delete from autoFinance tables in strict FK order
    await client.query(`DELETE FROM autofinance_payment_allocations WHERE payment_id IN (SELECT id FROM autofinance_payments WHERE loan_id = $1::uuid)`, [loanId]);
    await client.query(`DELETE FROM autofinance_customer_documents WHERE loan_id = $1::uuid`, [loanId]);
    await client.query(`DELETE FROM autofinance_payments WHERE loan_id = $1::uuid`, [loanId]);
    await client.query(`DELETE FROM autofinance_penalties WHERE emi_id IN (SELECT id FROM autofinance_emi_schedules WHERE loan_id = $1::uuid)`, [loanId]);
    await client.query(`DELETE FROM autofinance_emi_schedules WHERE loan_id = $1::uuid`, [loanId]);
    await client.query(`DELETE FROM autofinance_vehicles WHERE loan_id = $1::uuid`, [loanId]);
    await client.query(`DELETE FROM autofinance_loans WHERE id = $1::uuid`, [loanId]);

    await client.query('COMMIT');

    return {
      success: true,
      loanId,
      loanType: 'AUTO',
      customerName: loan.customer_name,
      revertedCapital: Number(loan.loan_amount || loan.principal_amount || 0),
      deletedCollectionsCount: payments.length,
      deletedTotalCollected: totalCollected,
    };
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}
