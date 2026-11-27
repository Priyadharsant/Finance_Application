import {
  createLoanWithVehicle,
  getAllLoans,
  getLoanDetails,
  getAutoFinanceOverview,
  getDueInstallments,
  rescheduleFutureEMIs,
  ensureAutoPaymentColumns,
} from "../services/loanService.js";
import { pool } from "../config/db.js";
import { createLedgerEntry } from "../../global_cash/services/globalCash.service.js";
import { ensureUnifiedExpensesTable } from "../../global_cash/services/expense.service.js";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import {
  uploadDocumentFile,
  listDocumentFiles,
  getDocumentLocation,
  deleteDocumentFile,
} from "../services/storageService.js";

export async function addLoan(req, res) {
  try {
    const newLoan = await createLoanWithVehicle(req.body);
    return res.status(201).json({ success: true, data: newLoan });
  } catch (error) {
    console.error("Error creating loan:", error);
    if (error.message?.startsWith("Insufficient Auto Finance balance.")) {
      return res.status(409).json({ success: false, message: error.message });
    }
    const duplicateIdentifierMessages = {
      autofinance_vehicles_chassis_number_key: "This chassis number is already registered on another vehicle.",
      autofinance_vehicles_engine_number_key: "This engine number is already registered on another vehicle.",
      autofinance_vehicles_registration_number_key: "This registration number is already registered on another vehicle.",
    };
    if (error.code === "23505" && duplicateIdentifierMessages[error.constraint]) {
      return res.status(409).json({
        success: false,
        message: duplicateIdentifierMessages[error.constraint],
        field: error.constraint.replace("autofinance_vehicles_", "").replace("_key", ""),
      });
    }
    return res.status(500).json({ success: false, message: error.message });
  }
}

export async function getLoans(req, res) {
  try {
    const loans = await getAllLoans();
    return res.status(200).json({ success: true, data: loans });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
}

export async function getLoan(req, res) {
  try {
    const loanData = await getLoanDetails(req.params.id);
    if (!loanData) {
      return res
        .status(404)
        .json({ success: false, message: "Loan not found" });
    }
    return res.status(200).json({ success: true, data: loanData });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
}

export async function getDashboard(req, res) {
  try {
    const overview = await getAutoFinanceOverview();
    const loans = await getAllLoans();
    const dueSchedules = await getDueInstallments();
    return res.status(200).json({
      success: true,
      data: {
        overview,
        recentLoans: loans.slice(0, 10),
        dueSchedules,
      },
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
}

export async function recordEmiPayment(req, res) {
  const client = await pool.connect();

  try {
    await ensureAutoPaymentColumns();
    await client.query("BEGIN");

    const {
      loanId,
      emiId,
      amountPaid: rawAmountPaid,
      interestPaid: rawInterestPaid,
      principalPaid: rawPrincipalPaid,
      carriedAmount: rawCarriedAmount = 0,
      pendingAmount: rawPendingAmount = 0,
      fineAmount: rawFineAmount = 0,
      collectedDate,
      paymentMethod,
      referenceNumber,
      receiptNumber,
    } = req.body;

    const componentMode = rawInterestPaid !== undefined || rawPrincipalPaid !== undefined;
    const interestAmount = Number(rawInterestPaid || 0);
    const principalAmount = Number(rawPrincipalPaid || 0);
    const carriedAmount = Number(rawCarriedAmount || 0);
    const pendingAmount = Number(rawPendingAmount || 0);
    const paidAmount = componentMode ? interestAmount + principalAmount + carriedAmount : Number(rawAmountPaid);
    const fineAmount = Number(rawFineAmount);
    const validCollectedDate = /^\d{4}-\d{2}-\d{2}$/.test(String(collectedDate || ""))
      && !Number.isNaN(Date.parse(`${collectedDate}T00:00:00Z`))
      && new Date(`${collectedDate}T00:00:00Z`).toISOString().slice(0, 10) === collectedDate;

    if (!loanId) throw new Error("Loan reference is missing; refresh the loan and retry");
    if (!emiId) throw new Error("Installment reference is missing; refresh the loan and retry");
    if (componentMode && (!Number.isFinite(interestAmount) || interestAmount < 0 || !Number.isFinite(principalAmount) || principalAmount < 0 || !Number.isFinite(carriedAmount) || carriedAmount < 0 || !Number.isFinite(pendingAmount) || pendingAmount < 0)) {
      throw new Error("Interest, principal, and carried amounts must be valid non-negative numbers");
    }
    if (!Number.isFinite(paidAmount) || paidAmount <= 0) {
      throw new Error("Enter a positive amount for the EMI payment");
    }
    if (!Number.isFinite(fineAmount) || fineAmount < 0) {
      throw new Error("Fine amount must be zero or greater");
    }
    if (!validCollectedDate) {
      throw new Error("A valid collected date is required");
    }
    if (String(receiptNumber || "").length > 100) {
      throw new Error("Receipt number must be 100 characters or fewer");
    }

    // =====================================================
    // 0. LOCK LOAN AND VALIDATE TOTAL OUTSTANDING BALANCE
    // =====================================================

    // Lock loan and fetch the actual contractual values.
    //
    // IMPORTANT:
    // Do not calculate the remaining loan balance from:
    // SUM(total_emi) - SUM(collected_amount)
    //
    // Future EMIs can be rescheduled, so their values are
    // derived values, not the accounting source of truth.
    const loanResult = await client.query(
      `
      SELECT
        id,
        loan_amount,
        interest_rate,
        tenure_months,
        interest_type,
        status
      FROM autofinance_loans
      WHERE id = $1
      FOR UPDATE
      `,
      [loanId],
    );

    if (loanResult.rows.length === 0) {
      throw new Error("Loan not found");
    }

    const loan = loanResult.rows[0];

    const originalPrincipal = Number(loan.loan_amount || 0);
    const interestRate = Number(loan.interest_rate || 0);
    const tenureMonths = Number(loan.tenure_months || 0);

    // =====================================================
    // CALCULATE TOTAL CONTRACTUAL INTEREST
    // =====================================================

    const schedInterestResult = await client.query(
      `SELECT COALESCE(SUM(interest_component), 0) AS scheduled_interest
       FROM autofinance_emi_schedules
       WHERE loan_id = $1 AND status != 'CANCELLED'`,
      [loanId]
    );
    const scheduledInterestSum = Number(schedInterestResult.rows[0].scheduled_interest || 0);

    const totalContractualInterest = Number(
      (loan.interest_type === 'FLAT'
        ? (originalPrincipal * (interestRate / 100) * tenureMonths)
        : scheduledInterestSum
      ).toFixed(2)
    );

    // =====================================================
    // GET ACTUAL PAYMENT ALLOCATIONS
    //
    // autofinance_payments is the accounting source of truth.
    // =====================================================

    const paymentTotalsResult = await client.query(
      `
      SELECT
        COALESCE(SUM(principal_paid), 0) AS principal_paid,
        COALESCE(SUM(interest_paid), 0) AS interest_paid,
        COALESCE(SUM(extra_principal_paid), 0) AS extra_principal_paid
      FROM autofinance_payments
      WHERE loan_id = $1
      `,
      [loanId],
    );

    const paymentTotals = paymentTotalsResult.rows[0];

    const totalScheduledPrincipalPaid = Number(
      paymentTotals.principal_paid || 0,
    );

    const totalExtraPrincipalPaidGlobal = Number(
      paymentTotals.extra_principal_paid || 0,
    );

    const totalInterestPaidGlobal = Number(
      paymentTotals.interest_paid || 0,
    );

    // =====================================================
    // CALCULATE ACTUAL OUTSTANDING CONTRACTUAL BALANCE
    // =====================================================

    const totalPrincipalPaidGlobal = Number(
      (
        totalScheduledPrincipalPaid +
        totalExtraPrincipalPaidGlobal
      ).toFixed(2),
    );

    const remainingPrincipalGlobal = Math.max(
      0,
      Number(
        (
          originalPrincipal -
          totalPrincipalPaidGlobal
        ).toFixed(2),
      ),
    );

    const remainingInterestGlobal = Math.max(
      0,
      Number(
        (
          totalContractualInterest -
          totalInterestPaidGlobal
        ).toFixed(2),
      ),
    );

    const remainingLoanBalance = Number(
      (
        remainingPrincipalGlobal +
        remainingInterestGlobal
      ).toFixed(2),
    );

    // =====================================================
    // VALIDATE PAYMENT
    // =====================================================

    if (paidAmount > remainingLoanBalance + 0.01) {
      throw new Error(
        `Payment of ₹${paidAmount.toFixed(2)} exceeds total remaining loan balance of ₹${remainingLoanBalance.toFixed(2)}`
      );
    }

    // =====================================================
    // 1. GET EMI DETAILS
    // =====================================================

    const emiResult = await client.query(
      `
      SELECT
        id,
        loan_id,
        installment_number,
        principal_component,
        interest_component,
        total_emi,
        collected_amount,
        paid_principal,
        paid_interest,
        extra_principal_paid,
        pending_amount,
        status
      FROM autofinance_emi_schedules
      WHERE id = $1
        AND loan_id = $2
      FOR UPDATE
      `,
      [emiId, loanId],
    );

    if (emiResult.rows.length === 0) {
      throw new Error("EMI schedule not found");
    }

    const emi = emiResult.rows[0];

    if (emi.status === "PAID") {
      throw new Error(
        "This EMI is already fully paid. Select a pending or partial EMI."
      );
    }

    // =====================================================
    // ENFORCE FIFO (FIRST-IN, FIRST-OUT)
    // Borrowers cannot skip ahead to upcoming EMIs while
    // earlier installments remain unpaid/overdue.
    // =====================================================
    const priorUnpaidRes = await client.query(
      `SELECT installment_number 
       FROM autofinance_emi_schedules 
       WHERE loan_id = $1 
         AND installment_number < $2 
         AND status IN ('PENDING', 'PARTIAL')
       ORDER BY installment_number ASC 
       LIMIT 1`,
      [loanId, emi.installment_number]
    );

    if (priorUnpaidRes.rows.length > 0) {
      throw new Error(
        `Installment #${priorUnpaidRes.rows[0].installment_number} is still pending/unpaid. Financial accounting rules require clearing earlier installments before collecting Installment #${emi.installment_number}.`
      );
    }

    const scheduledPrincipal = Number(emi.principal_component || 0);
    const scheduledInterest = Number(emi.interest_component || 0);

    const previousCollected = Number(emi.collected_amount || 0);
    const previousPaidPrincipal = Number(emi.paid_principal || 0);
    const previousPaidInterest = Number(emi.paid_interest || 0);
    const previousExtraPrincipal = Number(emi.extra_principal_paid || 0);
    const scheduledCarry = Number(emi.pending_amount || 0);
    if (componentMode && Math.abs(carriedAmount - scheduledCarry) > 0.01) {
      throw new Error("The previous month pending amount must be collected with this installment.");
    }

    // A carried amount settles the unpaid components on the earlier EMI that
    // generated it. Allocate it there so future principal/interest schedules
    // remain based on the actual loan balance instead of spreading the shortfall.
    if (componentMode && carriedAmount > 0) {
      const carrySources = await client.query(
        `SELECT id, principal_component, interest_component, paid_principal, paid_interest,
                pending_amount_forwarded
         FROM autofinance_emi_schedules
         WHERE loan_id = $1 AND installment_number < $2
           AND COALESCE(pending_amount_forwarded, 0) > 0
         ORDER BY installment_number ASC
         FOR UPDATE`,
        [loanId, emi.installment_number]
      );
      let carryToAllocate = carriedAmount;
      for (const source of carrySources.rows) {
        if (carryToAllocate <= 0.01) break;
        const unpaidInterest = Math.max(0, Number(source.interest_component || 0) - Number(source.paid_interest || 0));
        const unpaidPrincipal = Math.max(0, Number(source.principal_component || 0) - Number(source.paid_principal || 0));
        const sourceCarry = Number(source.pending_amount_forwarded || 0);
        let sourceAllocation = Math.min(carryToAllocate, sourceCarry);
        const interestAllocation = Math.min(sourceAllocation, unpaidInterest);
        sourceAllocation -= interestAllocation;
        const principalAllocation = Math.min(sourceAllocation, unpaidPrincipal);
        const allocated = interestAllocation + principalAllocation;
        if (allocated <= 0) continue;
        await client.query(
          `UPDATE autofinance_emi_schedules
           SET paid_interest = COALESCE(paid_interest, 0) + $1,
               paid_principal = COALESCE(paid_principal, 0) + $2,
               pending_amount_forwarded = GREATEST(0, COALESCE(pending_amount_forwarded, 0) - $3)
           WHERE id = $4`,
          [interestAllocation, principalAllocation, allocated, source.id]
        );
        carryToAllocate = Number((carryToAllocate - allocated).toFixed(2));
      }
      if (carryToAllocate > 0.01) {
        throw new Error("Previous month pending does not match the earlier installment balance.");
      }
    }

    // =====================================================
    // 2. CHECK REMAINING AMOUNT FOR CURRENT EMI
    // =====================================================

    const remainingInterest = Math.max(0, scheduledInterest - previousPaidInterest);
    const remainingPrincipal = Math.max(0, scheduledPrincipal - previousPaidPrincipal);

    // =====================================================
    // 3. PAYMENT ALLOCATION
    //
    // Order:
    // 1. Remaining scheduled interest
    // 2. Remaining scheduled principal
    // 3. Extra principal prepayment
    // =====================================================

    const roundMoney = (value) => Number(Number(value).toFixed(2));

    let remainingPayment = roundMoney(paidAmount);

    const interestPaidNow = componentMode
      ? roundMoney(interestAmount)
      : roundMoney(Math.min(remainingPayment, remainingInterest));
    if (!componentMode) remainingPayment = roundMoney(remainingPayment - interestPaidNow);

    const principalPaidCurrent = componentMode
      ? roundMoney(Math.min(principalAmount, remainingPrincipal))
      : roundMoney(Math.min(remainingPayment, remainingPrincipal));
    if (!componentMode) remainingPayment = roundMoney(remainingPayment - principalPaidCurrent);

    const extraPrincipalPaymentNow = componentMode
      ? roundMoney(Math.max(0, principalAmount - remainingPrincipal))
      : roundMoney(Math.max(0, remainingPayment));

    const extraInterestPaymentNow = componentMode
      ? roundMoney(Math.max(0, interestAmount - remainingInterest))
      : 0;

    if (componentMode && !extraPrincipalPaymentNow && !extraInterestPaymentNow && (interestPaidNow + principalPaidCurrent + pendingAmount > remainingInterest + remainingPrincipal + 0.01)) {
      throw new Error("Collected interest, principal, and pending amount must equal the remaining installment due.");
    }

    // =====================================================
    // CUMULATIVE EMI STATE
    // =====================================================

    const totalInterestPaid = roundMoney(previousPaidInterest + interestPaidNow);
    const totalPrincipalPaid = roundMoney(previousPaidPrincipal + principalPaidCurrent); 
    const totalExtraPrincipalPaid = roundMoney(previousExtraPrincipal + extraPrincipalPaymentNow);
    
    // Only scheduled EMI collection belongs in collected_amount.
    const scheduledPaymentNow = roundMoney(
      interestPaidNow + principalPaidCurrent + carriedAmount
    );

    const totalCollected = roundMoney(
      previousCollected + scheduledPaymentNow
    );

    // =====================================================
    // FINAL PAYMENT RECONCILIATION CHECK
    // =====================================================

    const allocatedPayment = roundMoney(
      interestPaidNow +
      principalPaidCurrent +
      carriedAmount +
      extraPrincipalPaymentNow
    );

    if (Math.abs(allocatedPayment - paidAmount) > 0.01) {
      throw new Error(
        "Payment allocation mismatch. Transaction aborted."
      );
    }

    if (componentMode && pendingAmount > 0) {
      const nextExists = await client.query(
        `SELECT 1 FROM autofinance_emi_schedules WHERE loan_id = $1 AND installment_number > $2 AND status = 'PENDING' LIMIT 1`,
        [loanId, emi.installment_number]
      );
      if (!nextExists.rows.length) throw new Error("There is no next month available to carry this pending amount.");
    }

    // =====================================================
    // 4. DETERMINE EMI STATUS
    // =====================================================

    const currentEmiFullyPaid =
      totalInterestPaid >= scheduledInterest &&
      totalPrincipalPaid >= scheduledPrincipal &&
      carriedAmount >= scheduledCarry;

    const newStatus = currentEmiFullyPaid || (componentMode && pendingAmount > 0) ? "PAID" : "PARTIAL";

    // =====================================================
    // 5. UPDATE CURRENT EMI
    // =====================================================

    await client.query(
      `
      UPDATE autofinance_emi_schedules
      SET
        collected_amount = $2,
        paid_interest = $3,
        paid_principal = $4,
        extra_principal_paid = $5,
        status = $6,
        pending_amount = GREATEST(0, COALESCE(pending_amount, 0) - $7)
      WHERE id = $1
      `,
      [
        emiId,
        totalCollected,
        totalInterestPaid,
        totalPrincipalPaid,
        totalExtraPrincipalPaid,
        newStatus,
        carriedAmount,
      ],
    );

    if (componentMode && pendingAmount > 0) {
      const nextScheduleRes = await client.query(
        `SELECT id, principal_component, interest_component, total_emi
         FROM autofinance_emi_schedules
         WHERE loan_id = $1 AND installment_number > $2 AND status = 'PENDING'
         ORDER BY installment_number ASC LIMIT 1 FOR UPDATE`,
        [loanId, emi.installment_number]
      );
      const next = nextScheduleRes.rows[0];
      const nextTotalEmi = Number(next.total_emi || 0) + pendingAmount;
      await client.query(
        `UPDATE autofinance_emi_schedules
         SET total_emi = $1, pending_amount = COALESCE(pending_amount, 0) + $2
         WHERE id = $3`,
        [nextTotalEmi, pendingAmount, next.id]
      );
      await client.query(
        `UPDATE autofinance_emi_schedules
         SET pending_amount_forwarded = COALESCE(pending_amount_forwarded, 0) + $1
         WHERE id = $2`,
        [pendingAmount, emiId]
      );
    }

    // =====================================================
    // 6. INSERT PAYMENT RECORD (AUDITABLE)
    // =====================================================

    const payRes = await client.query(
      `
      INSERT INTO autofinance_payments (
        loan_id,
        emi_id,
        payment_date,
        amount_paid,
        fine_amount,
        principal_paid,
        interest_paid,
        extra_principal_paid,
        payment_method,
        reference_number,
        receipt_number
      )
      VALUES (
        $1, $2, $3::date, $4, $5, $6, $7, $8, $9, $10, $11
      )
      RETURNING *
      `,
      [
        loanId,
        emiId,
        collectedDate,
        paidAmount,
        fineAmount,
        principalPaidCurrent,
        interestPaidNow,
        extraPrincipalPaymentNow,
        paymentMethod || "CASH",
        referenceNumber || "",
        String(receiptNumber || "").trim() || null,
      ],
    );

    const payment = payRes.rows[0];

    // =====================================================
    // 7. GLOBAL CASH LEDGER
    // =====================================================

    await createLedgerEntry(client, {
      effectiveDate: collectedDate,
      type: "AUTO_COLLECTION",
      amount: paidAmount + fineAmount,
      direction: "CREDIT",
      sourceModule: "AUTO",
      referenceType: "AUTO_PAYMENT",
      referenceId: payment.id,
      notes: `Auto Loan EMI Collection for Loan ${loanId}${fineAmount > 0 ? ` (Fine: ${fineAmount.toFixed(2)})` : ""}${receiptNumber ? ` (Receipt: ${String(receiptNumber).trim()})` : ""}`,
    });

    // =====================================================
    // 8. RECALCULATE FUTURE EMI SCHEDULE
    // =====================================================
    
    // This strictly recomputes future pending schedules using global outstanding principal tracking.
    // Keep the contractual future EMIs unchanged when a shortfall is carried.
    // It will be allocated to its source EMI when collected next month.
    if (!(componentMode && pendingAmount > 0)) {
      await rescheduleFutureEMIs(client, loanId);
    }

    await client.query("COMMIT");

    return res.status(200).json({
      success: true,
      data: payment,
    });

  } catch (error) {
    await client.query("ROLLBACK");

    console.error("Error recording EMI payment:", error);

    return res.status(500).json({
      success: false,
      message: error.message,
    });

  } finally {
    client.release();
  }
}

  export async function getMonthlyReport(req, res) {
    const client = await pool.connect();
    try {
      await ensureAutoPaymentColumns();
      const monthParam = req.query.month; // Expected format: 'YYYY-MM'
      const targetDate = monthParam ? `${monthParam}-01` : new Date().toISOString();
  
      const query = `
        SELECT 
          p.id as payment_id,
          p.loan_id,
          p.payment_date,
          p.amount_paid,
          p.fine_amount,
          p.payment_method,
          p.reference_number,
          p.receipt_number,
          p.created_at,
          COALESCE(s.installment_number, 0) as installment_number,
          COALESCE(s.total_emi, p.amount_paid) as expected_emi,
          l.loan_amount,
          l.interest_rate,
          l.tenure_months,
          c.first_name,
          c.last_name,
          c.customer_code,
          v.make,
          v.model,
          v.registration_number
        FROM autofinance_payments p
        LEFT JOIN autofinance_emi_schedules s ON p.emi_id = s.id
        JOIN autofinance_loans l ON p.loan_id = l.id
        JOIN autofinance_customers c ON l.customer_id = c.id
        LEFT JOIN autofinance_vehicles v ON l.id = v.loan_id
        WHERE date_trunc('month', p.payment_date::timestamp) = date_trunc('month', $1::timestamp)
        ORDER BY p.payment_date ASC, p.created_at ASC;
      `;
      const result = await client.query(query, [targetDate]);
    res.status(200).json({ success: true, data: result.rows });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  } finally {
    client.release();
  }
}

export async function closeLoanEarly(req, res) {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const { id: loanId } = req.params;
    const {
      principalAmount,
      interestAmount,
      discountAmount,
      closingDate,
      paymentMethod,
      referenceNumber,
    } = req.body;

    const paidPrincipal = Math.max(0, Number(principalAmount || 0));
    const paidInterest = Math.max(0, Number(interestAmount || 0));
    const discountAmt = Math.max(0, Number(discountAmount || 0));
    const totalPaid = paidPrincipal + paidInterest;
    const validClosingDate = /^\d{4}-\d{2}-\d{2}$/.test(String(closingDate || ""))
      ? closingDate
      : null;

    if (!loanId) {
      throw new Error("loanId is required");
    }

    // 1. Mark loan as COMPLETED
    const loanUpdate = await client.query(
      `UPDATE autofinance_loans SET status = 'COMPLETED' WHERE id = $1 AND status != 'COMPLETED' RETURNING id`,
      [loanId]
    );

    if (loanUpdate.rows.length === 0) {
      throw new Error("Loan not found or already completed");
    }

    // 2. Cancel all pending and partial EMIs
    await client.query(
      `
      UPDATE autofinance_emi_schedules
      SET status = 'CANCELLED'
      WHERE loan_id = $1 AND status IN ('PENDING', 'PARTIAL')
      `,
      [loanId]
    );

    // 3. Insert Closure Payment Record if any cash/amount was collected
    let payment = null;
    if (totalPaid > 0) {
      const payRes = await client.query(
        `
        INSERT INTO autofinance_payments (
          loan_id,
          payment_date,
          amount_paid,
          principal_paid,
          interest_paid,
          extra_principal_paid,
          payment_method,
          reference_number
        )
        VALUES (
          $1, COALESCE($2::date, CURRENT_DATE), $3, $4, $5, 0, $6, $7
        )
        RETURNING *
        `,
        [
          loanId,
          validClosingDate,
          totalPaid,
          paidPrincipal,
          paidInterest,
          paymentMethod || "CASH",
          referenceNumber || "LOAN_CLOSURE",
        ]
      );

      payment = payRes.rows[0];

      // 4. Update Global Cash Ledger (Credit for amount received)
      await createLedgerEntry(client, {
        type: "AUTO_COLLECTION",
        amount: totalPaid,
        direction: "CREDIT",
        sourceModule: "AUTO",
        referenceType: "LOAN_CLOSURE",
        referenceId: payment.id,
        notes: `Early Closure Payment for Auto Loan ${loanId}`,
      });
    }

    // 5. If discount > 0, record in unified expenses table under category 'AUTO'
    let expenseRecord = null;
    if (discountAmt > 0) {
      await ensureUnifiedExpensesTable(client);

      const detailsRes = await client.query(
        `
        SELECT 
          c.first_name, c.last_name, c.customer_code,
          v.registration_number, v.make, v.model
        FROM autofinance_loans l
        LEFT JOIN autofinance_customers c ON l.customer_id = c.id
        LEFT JOIN autofinance_vehicles v ON l.id = v.loan_id
        WHERE l.id = $1
        `,
        [loanId]
      );
      const details = detailsRes.rows[0] || {};
      const custName = `${details.first_name || ''} ${details.last_name || ''}`.trim() || 'Customer';
      const vehicleInfo = details.registration_number ? ` (Vehicle: ${details.registration_number})` : '';
      const expDesc = `Early Loan Closure Discount - ${custName}${vehicleInfo} [Loan ${loanId.slice(0, 8)}]`;

      const expRes = await client.query(
        `
        INSERT INTO expenses (
          expense_date, amount, category, expense_type, description, loan_id
        )
        VALUES (COALESCE($1::date, CURRENT_DATE), $2, 'AUTO', 'LOAN_CLOSURE_DISCOUNT', $3, $4)
        RETURNING *
        `,
        [validClosingDate, discountAmt, expDesc, loanId]
      );
      expenseRecord = expRes.rows[0];
    }

    await client.query("COMMIT");

    return res.status(200).json({
      success: true,
      message: "Loan closed successfully",
      data: {
        payment,
        expense: expenseRecord,
        discountAmount: discountAmt,
      },
    });

  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Error closing loan early:", error);
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  } finally {
    client.release();
  }
}

// =====================================================
// VEHICLE UPDATE
// =====================================================
export async function updateVehicle(req, res) {
  try {
    const { id: loanId } = req.params;
    const { vehicleType, make, model, year, registrationNumber, chassisNumber, engineNumber, insuranceDetails } = req.body;
    const parsedYear = year === undefined || year === null || String(year).trim() === ""
      ? null
      : Number.parseInt(year, 10);
    if (parsedYear !== null && (!Number.isInteger(parsedYear) || parsedYear < 1900 || parsedYear > 2200)) {
      return res.status(400).json({ success: false, message: "Enter a valid vehicle year." });
    }
    const result = await pool.query(
      `INSERT INTO autofinance_vehicles (
         loan_id, vehicle_type, make, model, year, registration_number,
         chassis_number, engine_number, insurance_details
       )
       VALUES ($1, COALESCE($2, 'TWO_WHEELER'), $3, $4, $5, $6, $7, $8, $9)
       ON CONFLICT (loan_id) DO UPDATE SET
         vehicle_type = COALESCE(EXCLUDED.vehicle_type, autofinance_vehicles.vehicle_type),
         make = COALESCE(EXCLUDED.make, autofinance_vehicles.make),
         model = COALESCE(EXCLUDED.model, autofinance_vehicles.model),
         year = COALESCE(EXCLUDED.year, autofinance_vehicles.year),
         registration_number = COALESCE(EXCLUDED.registration_number, autofinance_vehicles.registration_number),
         chassis_number = COALESCE(EXCLUDED.chassis_number, autofinance_vehicles.chassis_number),
         engine_number = COALESCE(EXCLUDED.engine_number, autofinance_vehicles.engine_number),
         insurance_details = COALESCE(EXCLUDED.insurance_details, autofinance_vehicles.insurance_details)
       RETURNING *`,
      [loanId, vehicleType || null, make?.trim() || null, model?.trim() || null, parsedYear,
       registrationNumber?.trim() || null, chassisNumber?.trim() || null, engineNumber?.trim() || null,
       insuranceDetails?.trim() || null]
    );
    return res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error("Error updating vehicle:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
}

// =====================================================
// DOCUMENT UPLOAD / LIST / SERVE / DELETE (Supabase Storage + Local Fallback)
// =====================================================
export async function uploadDocument(req, res) {
  try {
    const { id: loanId } = req.params;
    const { docType } = req.body; // e.g. "aadhaar", "rc_book", "main_doc", "other"
    if (!req.file) return res.status(400).json({ success: false, message: "No file uploaded" });

    const result = await uploadDocumentFile({
      loanId,
      file: req.file,
      docType,
    });

    return res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error("Error uploading document:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
}

export async function getDocuments(req, res) {
  try {
    const { id: loanId } = req.params;
    const files = await listDocumentFiles(loanId);
    return res.json({ success: true, data: files });
  } catch (error) {
    console.error("Error listing documents:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
}

export async function serveDocument(req, res) {
  try {
    const { id: loanId, filename } = req.params;
    const location = await getDocumentLocation(loanId, filename);
    if (!location) {
      return res.status(404).json({ success: false, message: "File not found" });
    }
    if (location.type === "redirect") {
      return res.redirect(location.url);
    }
    if (location.type === "file") {
      return res.download(location.path, location.filename);
    }
    return res.status(404).json({ success: false, message: "File not found" });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
}

export async function deleteDocument(req, res) {
  try {
    const { id: loanId, filename } = req.params;
    const result = await deleteDocumentFile(loanId, filename);
    return res.json({ success: true, ...result });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
}

export async function updateLoanTerms(req, res) {
  try {
    const { id: loanId } = req.params;
    const updates = req.body || {};

    const lRes = await pool.query(
      `SELECT l.*, v.id AS vehicle_id, c.id AS cust_id
       FROM autofinance_loans l
       LEFT JOIN autofinance_customers c ON c.id = l.customer_id
       LEFT JOIN autofinance_vehicles v ON v.loan_id = l.id
       WHERE l.id = $1`,
      [loanId]
    );

    if (!lRes.rows.length) {
      return res.status(404).json({ success: false, message: "Loan not found" });
    }

    const curL = lRes.rows[0];

    // 1. Borrower Name / Phone update
    if (curL.cust_id && (updates.customer_name !== undefined || updates.customer_phone !== undefined)) {
      const currentCustomerRes = await pool.query(
        `SELECT * FROM autofinance_customers WHERE id = $1`,
        [curL.cust_id]
      );
      const currentCustomer = currentCustomerRes.rows[0];
      if (currentCustomer) {
        const fullName = updates.customer_name !== undefined && String(updates.customer_name).trim()
          ? String(updates.customer_name).trim()
          : [currentCustomer.first_name, currentCustomer.last_name].filter(Boolean).join(' ').trim();
        const nameParts = fullName.split(/\s+/);
        const firstName = nameParts.shift() || currentCustomer.first_name;
        const lastName = nameParts.join(' ') || null;
        const phone = updates.customer_phone !== undefined
          ? (updates.customer_phone ? String(updates.customer_phone).trim() : null)
          : currentCustomer.phone;

        await pool.query(
          `UPDATE autofinance_customers
           SET first_name = $1, last_name = $2, phone = $3, updated_at = NOW()
           WHERE id = $4`,
          [firstName, lastName, phone, curL.cust_id]
        );
      }
    }

    // 2. Vehicle registration number
    if (updates.registration_number !== undefined && curL.vehicle_id) {
      await pool.query(
        `ALTER TABLE autofinance_vehicles ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP`
      ).catch(() => {});
      await pool.query(
        `UPDATE autofinance_vehicles SET registration_number = $1, updated_at = NOW() WHERE id = $2`,
        [String(updates.registration_number).trim(), curL.vehicle_id]
      );
    }

    // 3. Fees & deductions JSONB
    const feeFieldMap = {
      income_due: 'incomeDue',
      document_fee: 'documentFee',
      hire_purchase: 'hirePurchase',
      tax_amount: 'taxAmount',
      insurance: 'insurance',
      insurance_fine: 'insuranceFine',
      green_tax: 'greenTax',
      fine: 'fine',
      national_tax: 'nationalTax',
      permit: 'permit',
      brokerage_customer: 'brokerageCustomer',
      brokerage_hand: 'brokerageHand',
    };
    const feeUpdates = Object.entries(feeFieldMap).filter(([field]) => updates[field] !== undefined);
    if (feeUpdates.length) {
      const feesDetails = typeof curL.fees_details === 'string'
        ? JSON.parse(curL.fees_details || '{}')
        : { ...(curL.fees_details || {}) };
      for (const [field, jsonKey] of feeUpdates) {
        feesDetails[jsonKey] = Number(updates[field] || 0);
      }
      await pool.query(
        `UPDATE autofinance_loans SET fees_details = $1::jsonb, updated_at = NOW() WHERE id = $2`,
        [JSON.stringify(feesDetails), loanId]
      );

      // Reconcile Brokerage Hand expense and Global Cash Ledger
      if (updates.brokerage_hand !== undefined) {
        const newBrokerageHand = Number(updates.brokerage_hand || 0);
        const expenseDate = updates.disbursement_date || updates.start_date || curL.disbursement_date || curL.start_date || new Date().toISOString().slice(0, 10);
        const customerDisplayName = (
          updates.customer_name ||
          [curL.first_name, curL.last_name].filter(Boolean).join(' ') ||
          curL.customer_name ||
          'Customer'
        ).trim();
        const desc = `Brokerage Hand - ${customerDisplayName}`;

        if (newBrokerageHand > 0) {
          const expCheck = await pool.query(
            `SELECT id FROM expenses WHERE (loan_id = $1 AND expense_type = 'BROKERAGE_HAND') OR description = $2 OR description ILIKE $3 ORDER BY created_at ASC`,
            [loanId, desc, `Brokerage Hand for Auto Loan ${loanId}%`]
          );

          if (expCheck.rows.length > 0) {
            const expId = expCheck.rows[0].id;
            await pool.query(
              `UPDATE expenses
               SET amount = $1, expense_date = $2, description = $3, updated_at = NOW()
               WHERE id = $4`,
              [newBrokerageHand, expenseDate, desc, expId]
            );

            // Sync global_cash_ledger debit entry for this expense if tracked
            await pool.query(
              `UPDATE global_cash_ledger
               SET amount = $1, effective_date = $2, notes = $3
               WHERE reference_type = 'EXPENSE' AND reference_id = $4::uuid`,
              [newBrokerageHand, expenseDate, desc, expId]
            );
          } else {
            const insRes = await pool.query(
              `INSERT INTO expenses (loan_id, expense_date, amount, category, expense_type, description, created_by)
               VALUES ($1, $2, $3, 'AUTO', 'BROKERAGE_HAND', $4, null)
               RETURNING id`,
              [loanId, expenseDate, newBrokerageHand, desc]
            );

            await pool.query(
              `INSERT INTO global_cash_ledger (effective_date, type, amount, direction, source_module, reference_type, reference_id, notes)
               VALUES ($1, 'EXPENSE', $2, 'DEBIT', 'AUTO', 'EXPENSE', $3, $4)`,
              [expenseDate, newBrokerageHand, insRes.rows[0].id, desc]
            );
          }
        } else {
          // If brokerage_hand was changed to 0, remove or delete expense and ledger
          const expCheck = await pool.query(
            `SELECT id FROM expenses WHERE (loan_id = $1 AND expense_type = 'BROKERAGE_HAND') OR description = $2`,
            [loanId, desc]
          );
          const expIds = expCheck.rows.map((r) => r.id);
          if (expIds.length) {
            await pool.query(
              `DELETE FROM global_cash_ledger WHERE reference_type = 'EXPENSE' AND reference_id = ANY($1::uuid[])`,
              [expIds]
            );
            await pool.query(`DELETE FROM expenses WHERE id = ANY($1::uuid[])`, [expIds]);
          }
        }
      }
    }

    // 4. Loan Financial Terms (loan_amount, interest_rate, interest_type, tenure_months, start_date)
    const newLoanAmt = updates.loan_amount !== undefined ? Number(updates.loan_amount) : Number(curL.loan_amount);
    const newRate = updates.interest_rate !== undefined ? Number(updates.interest_rate) : Number(curL.interest_rate);
    const newType = updates.interest_type !== undefined ? String(updates.interest_type).toUpperCase() : (curL.interest_type || 'FLAT');
    const newTenure = updates.tenure_months !== undefined ? Number(updates.tenure_months) : Number(curL.tenure_months);
    let newStart = updates.start_date || curL.start_date || new Date().toISOString().slice(0, 10);
    let effectiveDate = updates.disbursement_date || updates.start_date || curL.start_date || new Date().toISOString().slice(0, 10);

    await pool.query(
      `UPDATE autofinance_loans
       SET loan_amount = $1, interest_rate = $2, interest_type = $3, tenure_months = $4,
           start_date = $5, updated_at = NOW()
       WHERE id = $6`,
      [newLoanAmt, newRate, newType, newTenure, newStart, loanId]
    );

    // 5. Global Cash Ledger sync
    await pool.query(
      `UPDATE global_cash_ledger
       SET amount = $1, effective_date = $2
       WHERE type = 'AUTO_LOAN_DISBURSEMENT' AND reference_id = $3::uuid`,
      [newLoanAmt, effectiveDate, loanId]
    );

    // 6. Reschedule future EMIs
    await rescheduleFutureEMIs(pool, loanId);

    return res.json({ success: true, message: "Loan terms updated and rescheduled successfully." });
  } catch (error) {
    console.error("Error updating loan terms:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
}

/**
 * Update an existing collection installment (allowed fields: collected_amount, collected_date, fine_amount)
 */
export async function updateCollection(req, res) {
  const { scheduleId } = req.params;
  const updates = req.body || {};

  try {
    const curRes = await pool.query(
      `SELECT id, loan_id, installment_number, principal_component, interest_component, total_emi, collected_amount
       FROM autofinance_emi_schedules WHERE id = $1`,
      [scheduleId]
    );

    if (curRes.rows.length === 0) {
      return res.status(404).json({ success: false, message: "Installment schedule not found." });
    }

    const sched = curRes.rows[0];
    const loanId = sched.loan_id;
    const pComp = Number(sched.principal_component || 0);
    const iComp = Number(sched.interest_component || 0);
    const contractualEmi = Number((pComp + iComp).toFixed(2));

    const amountWasEdited = updates.collected_amount !== undefined;
    const fineWasEdited = updates.fine_amount !== undefined;
    const dateWasEdited = updates.collected_date !== undefined;

    let fineToSave = 0;
    if (fineWasEdited) {
      const fineAmount = Number(updates.fine_amount);
      if (!Number.isFinite(fineAmount) || fineAmount < 0) {
        return res.status(400).json({ success: false, message: "Fine amount must be a valid amount greater than or equal to zero." });
      }
      fineToSave = Number(fineAmount.toFixed(2));
    }

    let dateToSave = new Date().toISOString().slice(0, 10);
    if (dateWasEdited) {
      const collectedDate = String(updates.collected_date || "");
      const validDate = /^\d{4}-\d{2}-\d{2}$/.test(collectedDate)
        && !Number.isNaN(Date.parse(`${collectedDate}T00:00:00Z`))
        && new Date(`${collectedDate}T00:00:00Z`).toISOString().slice(0, 10) === collectedDate;
      if (!validDate) {
        return res.status(400).json({ success: false, message: "Collected date must be a valid date (YYYY-MM-DD)." });
      }
      dateToSave = collectedDate;
    }

    let newAmt = Number(sched.collected_amount || 0);
    if (amountWasEdited) {
      const rawCol = updates.collected_amount;
      newAmt = (rawCol === "" || rawCol === null || isNaN(Number(rawCol)))
        ? 0
        : Math.max(0, Number(Number(rawCol).toFixed(2)));
    }

    if (!amountWasEdited && newAmt <= 0) {
      return res.status(400).json({ success: false, message: "Fine amount and collected date can only be edited on an installment with a payment." });
    }

    let paidInterest = 0;
    let paidPrincipal = 0;
    let extraPrincipal = 0;
    let newStatus = "PENDING";

    if (newAmt > 0) {
      let rem = newAmt;
      paidInterest = Number(Math.min(rem, iComp).toFixed(2));
      rem = Number((rem - paidInterest).toFixed(2));
      paidPrincipal = Number(Math.min(rem, pComp).toFixed(2));
      rem = Number((rem - paidPrincipal).toFixed(2));
      extraPrincipal = Number(Math.max(0, rem).toFixed(2));

      const isFullyPaid = (paidInterest >= iComp - 0.01) && (paidPrincipal >= pComp - 0.01) && contractualEmi > 0;
      newStatus = isFullyPaid ? "PAID" : "PARTIAL";
    }

    // Update schedule
    await pool.query(
      `UPDATE autofinance_emi_schedules
       SET collected_amount = $1,
           paid_interest = $2,
           paid_principal = $3,
           extra_principal_paid = $4,
           status = $5
       WHERE id = $6`,
      [
        newAmt > 0 ? newAmt : null,
        paidInterest,
        paidPrincipal,
        extraPrincipal,
        newStatus,
        scheduleId
      ]
    );

    // Reconcile autofinance_payments
    if (newAmt > 0) {
      const payCheck = await pool.query(
        `SELECT id, fine_amount, payment_date FROM autofinance_payments WHERE emi_id = $1 ORDER BY created_at ASC`,
        [scheduleId]
      );
      const primary = payCheck.rows[0];
      const primaryId = primary?.id;
      const existingFine = payCheck.rows.reduce((sum, payment) => sum + Number(payment.fine_amount || 0), 0);
      const finalFine = fineWasEdited ? fineToSave : existingFine;
      const rawPaymentDate = primary?.payment_date;
      const formattedExistingDate = rawPaymentDate
        ? (typeof rawPaymentDate === 'string'
            ? rawPaymentDate.slice(0, 10)
            : (rawPaymentDate instanceof Date ? rawPaymentDate.toISOString().slice(0, 10) : String(rawPaymentDate).slice(0, 10)))
        : dateToSave;
      const finalDate = dateWasEdited ? dateToSave : formattedExistingDate;

      if (payCheck.rows.length > 0) {
        await pool.query(
          `UPDATE autofinance_payments
           SET amount_paid = $1, principal_paid = $2, interest_paid = $3, extra_principal_paid = $4, payment_date = $5, fine_amount = $6
           WHERE id = $7`,
          [newAmt, paidPrincipal, paidInterest, extraPrincipal, finalDate, finalFine, primaryId]
        );

        if (payCheck.rows.length > 1) {
          const extraIds = payCheck.rows.slice(1).map((p) => p.id);
          await pool.query(
            `DELETE FROM global_cash_ledger WHERE source_module = 'AUTO' AND reference_type = 'AUTO_PAYMENT' AND reference_id = ANY($1::uuid[])`,
            [extraIds]
          );
          await pool.query(`DELETE FROM autofinance_payments WHERE id = ANY($1)`, [extraIds]);
        }
      } else {
        const insertedPayment = await pool.query(
          `INSERT INTO autofinance_payments (
            loan_id, emi_id, payment_date, amount_paid, fine_amount, principal_paid, interest_paid, extra_principal_paid, payment_method, reference_number
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'CASH', 'Collection Editor')
          RETURNING id`,
          [loanId, scheduleId, finalDate, newAmt, finalFine, paidPrincipal, paidInterest, extraPrincipal]
        );
        await pool.query(
          `INSERT INTO global_cash_ledger (effective_date, type, amount, direction, source_module, reference_type, reference_id, notes)
           VALUES ($1, 'AUTO_COLLECTION', $2, 'CREDIT', 'AUTO', 'AUTO_PAYMENT', $3, 'Auto collection recorded via Collection Editor')`,
          [finalDate, newAmt + finalFine, insertedPayment.rows[0].id]
        );
      }

      await pool.query(
        `UPDATE global_cash_ledger ledger
         SET amount = payment.amount_paid + COALESCE(payment.fine_amount, 0), effective_date = payment.payment_date
         FROM autofinance_payments payment
         WHERE ledger.source_module = 'AUTO' AND ledger.reference_type = 'AUTO_PAYMENT'
           AND ledger.reference_id = payment.id AND payment.emi_id = $1`,
        [scheduleId]
      );
    } else {
      const removedPayments = await pool.query(`SELECT id FROM autofinance_payments WHERE emi_id = $1`, [scheduleId]);
      const removedIds = removedPayments.rows.map((p) => p.id);
      if (removedIds.length) {
        await pool.query(
          `DELETE FROM global_cash_ledger WHERE source_module = 'AUTO' AND reference_type = 'AUTO_PAYMENT' AND reference_id = ANY($1::uuid[])`,
          [removedIds]
        );
      }
      await pool.query(`DELETE FROM autofinance_payments WHERE emi_id = $1`, [scheduleId]);
    }

    // Reschedule subsequent EMIs
    await rescheduleFutureEMIs(pool, loanId);

    return res.json({ success: true, message: "Collection updated successfully." });
  } catch (error) {
    console.error("Error updating collection:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
}
