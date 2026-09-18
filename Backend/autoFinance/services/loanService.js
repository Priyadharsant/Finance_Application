import { pool } from "../config/db.js";
import { validateAndDisburseFunds, createLedgerEntry } from "../../global_cash/services/globalCash.service.js";
import crypto from "crypto";

export function addMonthsSafe(baseDate, months) {
  let y, m, d;
  if (typeof baseDate === 'string' && /^\d{4}-\d{2}-\d{2}/.test(baseDate)) {
    const parts = baseDate.slice(0, 10).split('-').map(Number);
    y = parts[0];
    m = parts[1] - 1;
    d = parts[2];
  } else {
    const dt = new Date(baseDate);
    y = dt.getFullYear();
    m = dt.getMonth();
    d = dt.getDate();
  }

  const targetMonthTotal = m + months;
  const targetYear = y + Math.floor(targetMonthTotal / 12);
  const targetMonth = ((targetMonthTotal % 12) + 12) % 12;
  const maxDays = new Date(targetYear, targetMonth + 1, 0).getDate();
  const targetDay = Math.min(d, maxDays);

  const pad = (n) => String(n).padStart(2, '0');
  return `${targetYear}-${pad(targetMonth + 1)}-${pad(targetDay)}`;
}

export async function createLoanWithVehicle(data) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Acquire global lock to prevent concurrent over-allocation
    await client.query('SELECT pg_advisory_xact_lock(1001);');

    const {
      // customer details
      customerId,
      firstName,
      lastName,
      phone,
      email,
      address,
      city,
      state,
      // loan details
      loanTypeId,
      interestType, // FLAT or REDUCING
      loanAmount,
      interestRate,
      tenureMonths,
      startDate,
      // vehicle details
      vehicleType,
      make,
      model,
      year,
      registrationNumber,
      chassisNumber,
      engineNumber,
      insuranceDetails,
      incomeDue, documentFee, hirePurchase, taxAmount, insurance, insuranceFine, greenTax, fine, nationalTax, permit, brokerageCustomer, brokerageHand
    } = data;

    const startStr = startDate ? startDate.slice(0, 10) : new Date().toISOString().slice(0, 10);
    const endStr = addMonthsSafe(startStr, parseInt(tenureMonths || 12));

    // 0. Create Customer Inline if no customerId is provided
    let finalCustomerId = customerId;
    if (!finalCustomerId && firstName && lastName) {
      finalCustomerId = crypto.randomUUID();
      const customerCode = 'AUTO-' + Math.floor(10000 + Math.random() * 90000);
      const custQuery = `
        INSERT INTO autofinance_customers (id, customer_code, first_name, last_name, phone, email, address, city, state)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      `;
      await client.query(custQuery, [
        finalCustomerId,
        customerCode,
        firstName,
        lastName,
        phone || null,
        email || null,
        address || null,
        city || null,
        state || null
      ]);
    } else if (!finalCustomerId) {
      throw new Error("Customer ID or Customer details (First Name, Last Name) are required");
    }

    // Ensure columns exist and expenses table exists
    await client.query(`ALTER TABLE autofinance_loans ADD COLUMN IF NOT EXISTS interest_type VARCHAR(50) DEFAULT 'FLAT';`);
    await client.query(`ALTER TABLE autofinance_loans ADD COLUMN IF NOT EXISTS fees_details JSONB DEFAULT '{}'::jsonb;`);
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

    const feesDetailsObj = {
      incomeDue: Number(incomeDue||0), documentFee: Number(documentFee||0), hirePurchase: Number(hirePurchase||0),
      taxAmount: Number(taxAmount||0), insurance: Number(insurance||0), insuranceFine: Number(insuranceFine||0),
      greenTax: Number(greenTax||0), fine: Number(fine||0), nationalTax: Number(nationalTax||0),
      permit: Number(permit||0), brokerageCustomer: Number(brokerageCustomer||0), brokerageHand: Number(brokerageHand||0)
    };

    // 1. Insert Loan
    const loanQuery = `
      INSERT INTO autofinance_loans (
        customer_id, loan_type_id, interest_type, loan_amount, interest_rate, tenure_months, start_date, end_date, status, fees_details
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'ACTIVE', $9)
      RETURNING *;
    `;
    const loanRes = await client.query(loanQuery, [
      finalCustomerId,
      loanTypeId || null,
      interestType || 'FLAT',
      loanAmount,
      interestRate,
      tenureMonths,
      startStr,
      endStr,
      feesDetailsObj
    ]);
    const loan = loanRes.rows[0];

    const totalDeductions = feesDetailsObj.incomeDue + feesDetailsObj.documentFee + feesDetailsObj.hirePurchase + feesDetailsObj.taxAmount + feesDetailsObj.insurance + feesDetailsObj.insuranceFine + feesDetailsObj.greenTax + feesDetailsObj.fine + feesDetailsObj.nationalTax + feesDetailsObj.permit + feesDetailsObj.brokerageCustomer;
    const inHandAmount = Number(loanAmount) - totalDeductions;

    // Global Cash Ledger Integration (Disburse in-hand amount)
    await validateAndDisburseFunds(client, {
      module: 'AUTO',
      amount: inHandAmount,
      effectiveDate: startStr,
      referenceType: 'AUTO_LOAN',
      referenceId: loan.id,
      notes: `Auto Loan Disbursement (In-Hand) for Customer ${finalCustomerId}`
    });

    // Record expense for brokerage provided by hand into expenses table (Category: AUTO)
    if (feesDetailsObj.brokerageHand > 0) {
      try {
        await client.query(`
          INSERT INTO expenses (loan_id, expense_date, amount, category, expense_type, description, created_by)
          VALUES ($1, $2, $3, 'AUTO', 'BROKERAGE_HAND', $4, null)
        `, [loan.id, startStr, feesDetailsObj.brokerageHand, `Brokerage Hand for Auto Loan ${loan.id}`]);
      } catch(e) {
        console.error("Failed to insert brokerage expense into expenses table", e);
      }
    }

    // 2. Insert Vehicle (if vehicle details provided)
    let vehicle = null;
    if (make || model || registrationNumber) {
      const vehicleQuery = `
        INSERT INTO autofinance_vehicles (
          loan_id, vehicle_type, make, model, year, registration_number, chassis_number, engine_number, insurance_details
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        RETURNING *;
      `;
      const vehicleRes = await client.query(vehicleQuery, [
        loan.id,
        vehicleType || 'TWO_WHEELER',
        make || '',
        model || '',
        year ? parseInt(year) : new Date().getFullYear(),
        registrationNumber || `REG-${Date.now().toString().slice(-6)}`,
        chassisNumber || '',
        engineNumber || '',
        insuranceDetails || ''
      ]);
      vehicle = vehicleRes.rows[0];
    }

    // 3. Generate EMI Schedule (FLAT vs REDUCING)
    const P = parseFloat(loanAmount);
    const ratePercent = parseFloat(interestRate);
    const n = parseInt(tenureMonths);
    const method = (interestType || 'FLAT').toUpperCase();

    if (method === 'REDUCING') {
      const r = (ratePercent / 100) / 12;
      let emi = 0;
      if (r > 0) {
        emi = (P * r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1);
      } else {
        emi = P / n;
      }
      let balance = P;

      for (let i = 1; i <= n; i++) {
        const dueDateStr = addMonthsSafe(startStr, i);

        let interestComp = r > 0 ? balance * r : 0;
        let principalComp = emi - interestComp;

        // Absorb minor rounding discrepancy on final installment
        if (i === n) {
          principalComp = balance;
          emi = principalComp + interestComp;
        }

        balance -= principalComp;
        if (balance < 0) balance = 0;

        await client.query(`
          INSERT INTO autofinance_emi_schedules (
            loan_id, installment_number, due_date, principal_component, interest_component, total_emi, status
          )
          VALUES ($1, $2, $3, $4, $5, $6, 'PENDING');
        `, [
          loan.id,
          i,
          dueDateStr,
          principalComp.toFixed(2),
          interestComp.toFixed(2),
          emi.toFixed(2)
        ]);
      }
    } else {
      // FLAT INTEREST
      const totalInterest = P * (ratePercent / 100) * (n / 12);
      const monthlyPrincipal = P / n;
      const monthlyInterest = totalInterest / n;
      const monthlyEMI = monthlyPrincipal + monthlyInterest;

      for (let i = 1; i <= n; i++) {
        const dueDateStr = addMonthsSafe(startStr, i);

        await client.query(`
          INSERT INTO autofinance_emi_schedules (
            loan_id, installment_number, due_date, principal_component, interest_component, total_emi, status
          )
          VALUES ($1, $2, $3, $4, $5, $6, 'PENDING');
        `, [
          loan.id,
          i,
          dueDateStr,
          monthlyPrincipal.toFixed(2),
          monthlyInterest.toFixed(2),
          monthlyEMI.toFixed(2)
        ]);
      }
    }

    await client.query('COMMIT');
    return { ...loan, vehicle };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

export async function getAllLoans() {
  const query = `
    SELECT 
      l.*,
      CASE 
        WHEN l.status = 'COMPLETED' OR (COALESCE(s.total_dues_count, 0) > 0 AND COALESCE(s.pending_dues_count, 0) = 0) THEN 'COMPLETED'
        ELSE l.status
      END as status,
      c.first_name, c.last_name, c.phone, c.customer_code,
      lt.name as loan_type_name,
      v.vehicle_type, v.make, v.model, v.registration_number,
      COALESCE(p.total_paid, 0) as total_paid,
      COALESCE(CASE WHEN l.status = 'COMPLETED' THEN 0 ELSE s.pending_dues_count END, 0) as pending_dues_count,
      COALESCE(s.paid_dues_count, 0) as paid_dues_count,
      COALESCE(s.total_dues_count, l.tenure_months) as total_dues_count,
      COALESCE(CASE WHEN l.status = 'COMPLETED' THEN 0 ELSE s.overdue_dues_count END, 0) as overdue_dues_count,
      CASE WHEN l.status = 'COMPLETED' THEN NULL ELSE next_emi.next_due_date END as next_due_date,
      CASE WHEN l.status = 'COMPLETED' THEN 0 ELSE next_emi.next_emi_amount END as next_emi_amount,
      CASE WHEN l.status = 'COMPLETED' THEN NULL ELSE next_emi.next_emi_id END as next_emi_id,
      CASE WHEN l.status = 'COMPLETED' THEN NULL ELSE next_emi.next_installment_number END as next_installment_number
    FROM autofinance_loans l
    JOIN autofinance_customers c ON l.customer_id = c.id
    LEFT JOIN autofinance_loan_types lt ON l.loan_type_id = lt.id
    LEFT JOIN autofinance_vehicles v ON l.id = v.loan_id
    LEFT JOIN (
      SELECT loan_id, SUM(amount_paid) as total_paid
      FROM autofinance_payments
      GROUP BY loan_id
    ) p ON l.id = p.loan_id
    LEFT JOIN (
      SELECT 
        loan_id,
        COUNT(CASE WHEN status IN ('PENDING', 'PARTIAL') THEN 1 END) as pending_dues_count,
        COUNT(CASE WHEN status = 'PAID' THEN 1 END) as paid_dues_count,
        COUNT(id) as total_dues_count,
        COUNT(CASE WHEN status IN ('PENDING', 'PARTIAL') AND due_date < CURRENT_DATE THEN 1 END) as overdue_dues_count
      FROM autofinance_emi_schedules
      GROUP BY loan_id
    ) s ON l.id = s.loan_id
    LEFT JOIN (
      SELECT 
        loan_id,
        MIN(due_date) as next_due_date,
        (array_agg(GREATEST(0, total_emi - COALESCE(collected_amount, 0)) ORDER BY due_date ASC))[1] as next_emi_amount,
        (array_agg(id ORDER BY due_date ASC))[1] as next_emi_id,
        (array_agg(installment_number ORDER BY due_date ASC))[1] as next_installment_number
      FROM autofinance_emi_schedules
      WHERE status IN ('PENDING', 'PARTIAL')
      GROUP BY loan_id
    ) next_emi ON l.id = next_emi.loan_id
    ORDER BY l.created_at DESC;
  `;
  const result = await pool.query(query);
  return result.rows;
}

export async function getLoanDetails(loanId) {
  const loanQuery = `
    SELECT 
      l.*,
      c.first_name, c.last_name, c.phone, c.email, c.address, c.customer_code,
      lt.name as loan_type_name,
      v.vehicle_type, v.make, v.model, v.year, v.registration_number, v.chassis_number, v.engine_number, v.insurance_details
    FROM autofinance_loans l
    JOIN autofinance_customers c ON l.customer_id = c.id
    LEFT JOIN autofinance_loan_types lt ON l.loan_type_id = lt.id
    LEFT JOIN autofinance_vehicles v ON l.id = v.loan_id
    WHERE l.id = $1;
  `;
  const loanRes = await pool.query(loanQuery, [loanId]);
  if (!loanRes.rows[0]) return null;

  const scheduleQuery = `
    SELECT 
      *,
      principal_component AS scheduled_principal,
      interest_component AS scheduled_interest,
      total_emi AS scheduled_emi,
      
      (
        LEAST(COALESCE(paid_principal, 0), COALESCE(principal_component, 0)) +
        LEAST(COALESCE(paid_interest, 0), COALESCE(interest_component, 0))
      ) AS scheduled_amount_paid,
      
      GREATEST(COALESCE(principal_component, 0) - COALESCE(paid_principal, 0), 0) AS remaining_principal,
      
      GREATEST(COALESCE(interest_component, 0) - COALESCE(paid_interest, 0), 0) AS remaining_interest,
      
      GREATEST(
        COALESCE(total_emi, 0) - 
        (
          LEAST(COALESCE(paid_principal, 0), COALESCE(principal_component, 0)) +
          LEAST(COALESCE(paid_interest, 0), COALESCE(interest_component, 0))
        ), 
        0
      ) AS remaining_emi_amount,
      
      (
        LEAST(COALESCE(paid_principal, 0), COALESCE(principal_component, 0)) +
        LEAST(COALESCE(paid_interest, 0), COALESCE(interest_component, 0)) +
        COALESCE(extra_principal_paid, 0)
      ) AS total_cash_collected

    FROM autofinance_emi_schedules
    WHERE loan_id = $1
    ORDER BY installment_number ASC;
  `;
  const scheduleRes = await pool.query(scheduleQuery, [loanId]);

  const paymentsQuery = `
    SELECT * FROM autofinance_payments
    WHERE loan_id = $1
    ORDER BY payment_date DESC;
  `;
  const paymentsRes = await pool.query(paymentsQuery, [loanId]);

  return {
    loan: loanRes.rows[0],
    schedules: scheduleRes.rows,
    payments: paymentsRes.rows
  };
}

export async function getDueInstallments() {
  await pool.query(`ALTER TABLE autofinance_loans ADD COLUMN IF NOT EXISTS interest_type VARCHAR(50) DEFAULT 'FLAT';`);
  const query = `
    SELECT 
      s.*,
      GREATEST(0, s.total_emi - COALESCE(s.collected_amount, 0)) AS remaining_emi_amount,
      l.customer_id, l.loan_amount, l.tenure_months,
      c.first_name, c.last_name, c.phone, c.customer_code,
      v.make, v.model, v.registration_number, v.vehicle_type,
      COALESCE(ls.pending_dues_count, 0) as pending_dues_count,
      COALESCE(ls.paid_dues_count, 0) as paid_dues_count,
      COALESCE(ls.total_dues_count, l.tenure_months) as total_dues_count,
      COALESCE(ls.outstanding_due_count, 0) as outstanding_due_count,
      COALESCE(ls.overdue_due_count, 0) as overdue_due_count,
      COALESCE(ls.today_due_count, 0) as today_due_count
    FROM autofinance_emi_schedules s
    JOIN autofinance_loans l ON s.loan_id = l.id
    JOIN autofinance_customers c ON l.customer_id = c.id
    LEFT JOIN autofinance_vehicles v ON l.id = v.loan_id
    LEFT JOIN (
      SELECT 
        loan_id,
        COUNT(CASE WHEN status IN ('PENDING', 'PARTIAL') THEN 1 END) as pending_dues_count,
        COUNT(CASE WHEN status = 'PAID' THEN 1 END) as paid_dues_count,
        COUNT(id) as total_dues_count,
        COUNT(CASE WHEN status IN ('PENDING', 'PARTIAL') AND due_date <= CURRENT_DATE THEN 1 END) as outstanding_due_count,
        COUNT(CASE WHEN status IN ('PENDING', 'PARTIAL') AND due_date < CURRENT_DATE THEN 1 END) as overdue_due_count,
        COUNT(CASE WHEN status IN ('PENDING', 'PARTIAL') AND due_date = CURRENT_DATE THEN 1 END) as today_due_count
      FROM autofinance_emi_schedules
      GROUP BY loan_id
    ) ls ON s.loan_id = ls.loan_id
    WHERE s.status IN ('PENDING', 'PARTIAL') AND s.due_date <= CURRENT_DATE AND l.status = 'ACTIVE'
    ORDER BY s.due_date ASC, s.installment_number ASC;
  `;
  const res = await pool.query(query);
  return res.rows;
}

export async function getAutoFinanceOverview() {
  // 1. Isolated counts/sums to completely eliminate multi-table Cartesian multiplication
  const query = `
    SELECT
      (SELECT COUNT(*) FROM autofinance_loans) as total_loans,
      (SELECT COALESCE(SUM(loan_amount), 0) FROM autofinance_loans) as total_disbursed,
      (SELECT COUNT(*) FROM autofinance_customers) as total_customers,
      (SELECT COALESCE(SUM(amount_paid), 0) FROM autofinance_payments) as total_collected,
      (SELECT COUNT(*) FROM autofinance_vehicles) as total_vehicles,
      (SELECT COUNT(*) FROM autofinance_vehicles WHERE vehicle_type = 'TWO_WHEELER') as two_wheeler_count,
      (SELECT COUNT(*) FROM autofinance_vehicles WHERE vehicle_type = 'CAR') as car_count,
      (SELECT COUNT(*) FROM autofinance_vehicles WHERE vehicle_type = 'COMMERCIAL') as commercial_count,
      (SELECT COUNT(*) FROM autofinance_loans WHERE status = 'ACTIVE') as active_loans,
      (SELECT COUNT(*) FROM autofinance_loans WHERE status = 'COMPLETED') as completed_loans;
  `;
  const res = await pool.query(query);
  const row = res.rows[0] || {};

  // 2. Schedule totals for active loans (including PENDING and PARTIAL)
  const schedQuery = `
    SELECT 
      COALESCE(SUM(s.total_emi), 0) as total_expected_emi,
      COALESCE(SUM(s.interest_component), 0) as total_expected_interest,
      COUNT(CASE WHEN s.status IN ('PENDING', 'PARTIAL') THEN 1 END) as pending_installments,
      COUNT(CASE WHEN s.status = 'PAID' THEN 1 END) as paid_installments,
      
      -- TODAY DUE (Remaining balance on pending/partial due today)
      COALESCE(SUM(
        CASE 
          WHEN s.due_date = CURRENT_DATE AND s.status IN ('PENDING', 'PARTIAL') 
          THEN GREATEST(0, s.total_emi - COALESCE(s.collected_amount, 0)) 
          ELSE 0 
        END
      ), 0) as today_due_amount,
      COUNT(CASE WHEN s.due_date = CURRENT_DATE AND s.status IN ('PENDING', 'PARTIAL') THEN 1 END) as today_due_count,
      
      -- OUTSTANDING OVERDUE (Remaining balance on pending/partial due on or before today)
      COALESCE(SUM(
        CASE 
          WHEN s.due_date <= CURRENT_DATE AND s.status IN ('PENDING', 'PARTIAL') 
          THEN GREATEST(0, s.total_emi - COALESCE(s.collected_amount, 0)) 
          ELSE 0 
        END
      ), 0) as overdue_amount,
      COUNT(CASE WHEN s.due_date <= CURRENT_DATE AND s.status IN ('PENDING', 'PARTIAL') THEN 1 END) as overdue_count
    FROM autofinance_emi_schedules s
    JOIN autofinance_loans l ON s.loan_id = l.id
    WHERE l.status = 'ACTIVE';
  `;
  const schedRes = await pool.query(schedQuery);
  const schedRow = schedRes.rows[0] || {};

  const totalDisbursed = parseFloat(row.total_disbursed || 0);
  const totalCollected = parseFloat(row.total_collected || 0);
  const totalExpected = parseFloat(schedRow.total_expected_emi || (totalDisbursed * 1.2));
  const totalProfit = parseFloat(schedRow.total_expected_interest || (totalExpected - totalDisbursed));
  const remaining = Math.max(0, totalExpected - totalCollected);
  const recoveryRate = totalExpected > 0 ? ((totalCollected / totalExpected) * 100).toFixed(1) : '0.0';

  return {
    ...row,
    total_expected: totalExpected,
    total_profit: totalProfit,
    remaining: remaining,
    recovery_rate: recoveryRate,
    pending_installments: schedRow.pending_installments || 0,
    paid_installments: schedRow.paid_installments || 0,
    today_due_amount: parseFloat(schedRow.today_due_amount || 0),
    today_due_count: parseInt(schedRow.today_due_count || 0),
    overdue_amount: parseFloat(schedRow.overdue_amount || 0),
    overdue_count: parseInt(schedRow.overdue_count || 0)
  };
}

export async function rescheduleFutureEMIs(client, loanId) {
  // 1. Fetch Loan Details
  const loanRes = await client.query(
    `SELECT loan_amount, interest_rate, tenure_months, interest_type FROM autofinance_loans WHERE id = $1`,
    [loanId]
  );
  if (!loanRes.rows[0]) return;
  
  const loan = loanRes.rows[0];
  const P_initial = parseFloat(loan.loan_amount);
  const ratePercent = parseFloat(loan.interest_rate);
  const n_total = parseInt(loan.tenure_months);
  const isReducing = loan.interest_type === 'REDUCING';

  // 2. Fetch all schedules
  const schedRes = await client.query(
    `SELECT * FROM autofinance_emi_schedules 
     WHERE loan_id = $1 
     ORDER BY installment_number ASC`,
    [loanId]
  );
  
  const schedules = schedRes.rows;
  
  let totalPrincipalPaid = 0;
  let totalInterestPaid = 0;
  let unpaidPrincipalInPartials = 0;
  let unpaidInterestInPartials = 0;
  const pendingSchedules = [];

  for (const s of schedules) {
    const pPaid = Number(s.paid_principal || 0);
    const iPaid = Number(s.paid_interest || 0);
    const ePaid = Number(s.extra_principal_paid || 0);
    
    totalPrincipalPaid += pPaid + ePaid;
    totalInterestPaid += iPaid;
    
    if (s.status === 'PARTIAL') {
      const pComp = Number(s.principal_component || 0);
      const iComp = Number(s.interest_component || 0);
      unpaidPrincipalInPartials += Math.max(0, pComp - pPaid);
      unpaidInterestInPartials += Math.max(0, iComp - iPaid);
    } else if (s.status === 'PENDING') {
      pendingSchedules.push(s);
    }
  }

  // Automatic Loan Completion Check:
  // If no schedules are pending/partial OR if total principal paid has covered the original loan amount
  const hasUnsettled = schedules.some(s => s.status === 'PENDING' || s.status === 'PARTIAL');
  const principalRemaining = P_initial - totalPrincipalPaid;

  if (!hasUnsettled || principalRemaining <= 0.01) {
    if (principalRemaining <= 0.01) {
      await client.query(
        `UPDATE autofinance_emi_schedules 
         SET principal_component = 0, interest_component = 0, total_emi = 0, status = 'CANCELLED'
         WHERE loan_id = $1 AND status IN ('PENDING', 'PARTIAL')`,
        [loanId]
      );
    }
    await client.query(
      `UPDATE autofinance_loans SET status = 'COMPLETED', updated_at = NOW() WHERE id = $1`,
      [loanId]
    );
    return;
  }
  
  const n_pending = pendingSchedules.length;
  if (n_pending === 0) return; // Nothing to reschedule

  let principalToDistribute = P_initial - totalPrincipalPaid - unpaidPrincipalInPartials;
  if (principalToDistribute < 0) principalToDistribute = 0;

  // 3. Recalculate & Update Pending Schedules
  if (isReducing) {
    const r = (ratePercent / 100) / 12;
    let newEmi = 0;
    
    if (principalToDistribute > 0) {
      if (r > 0) {
        newEmi = (principalToDistribute * r * Math.pow(1 + r, n_pending)) / (Math.pow(1 + r, n_pending) - 1);
      } else {
        newEmi = principalToDistribute / n_pending;
      }
    }
    
    let currentBalance = principalToDistribute;
    
    for (let i = 0; i < n_pending; i++) {
      const pending = pendingSchedules[i];
      let interestComp = r > 0 ? currentBalance * r : 0;
      let principalComp = principalToDistribute > 0 ? newEmi - interestComp : 0;
      
      // Handle the final installment to absorb rounding differences
      if (i === n_pending - 1) {
        principalComp = currentBalance;
      }
      
      currentBalance -= principalComp;
      if (currentBalance < 0) currentBalance = 0;
      const totalEmi = principalComp + interestComp;
      
      await client.query(
        `UPDATE autofinance_emi_schedules 
         SET principal_component = $1, interest_component = $2, total_emi = $3 
         WHERE id = $4`,
        [principalComp.toFixed(2), interestComp.toFixed(2), totalEmi.toFixed(2), pending.id]
      );
    }
  } else {
    // FLAT INTEREST
    const totalContractualInterest = P_initial * ratePercent * (n_total / 12) / 100;
    let interestToDistribute = totalContractualInterest - totalInterestPaid - unpaidInterestInPartials;
    if (interestToDistribute < 0) interestToDistribute = 0;

    let distributedPrincipal = 0;
    let distributedInterest = 0;

    for (let i = 0; i < n_pending; i++) {
      const pending = pendingSchedules[i];
      let monthlyPrincipal = principalToDistribute / n_pending;
      let monthlyInterest = interestToDistribute / n_pending;

      // Absorb rounding differences on final installment
      if (i === n_pending - 1) {
        monthlyPrincipal = principalToDistribute - distributedPrincipal;
        monthlyInterest = interestToDistribute - distributedInterest;
      } else {
        // Round to 2 decimals to match normal exact distribution
        monthlyPrincipal = Math.round(monthlyPrincipal * 100) / 100;
        monthlyInterest = Math.round(monthlyInterest * 100) / 100;
      }

      distributedPrincipal += monthlyPrincipal;
      distributedInterest += monthlyInterest;

      const newTotalEmi = monthlyPrincipal + monthlyInterest;

      await client.query(
        `UPDATE autofinance_emi_schedules 
         SET principal_component = $1, interest_component = $2, total_emi = $3 
         WHERE id = $4`,
        [monthlyPrincipal.toFixed(2), monthlyInterest.toFixed(2), newTotalEmi.toFixed(2), pending.id]
      );
    }
  }

  // 4. Check for Loan Completion if all principal has been distributed/absorbed
  if (principalToDistribute <= 0) {
    await client.query(
      `UPDATE autofinance_emi_schedules 
       SET principal_component = 0, interest_component = 0, total_emi = 0, status = 'CANCELLED'
       WHERE loan_id = $1 AND status IN ('PENDING', 'PARTIAL')`,
      [loanId]
    );

    await client.query(
      `UPDATE autofinance_loans SET status = 'COMPLETED', updated_at = NOW() WHERE id = $1`,
      [loanId]
    );
  }
}


