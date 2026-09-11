import {
  createLoanWithVehicle,
  getAllLoans,
  getLoanDetails,
  getAutoFinanceOverview,
  getDueInstallments,
  rescheduleFutureEMIs,
} from "../services/loanService.js";
import { pool } from "../config/db.js";
import { createLedgerEntry } from "../../global_cash/services/globalCash.service.js";

export async function addLoan(req, res) {
  try {
    const newLoan = await createLoanWithVehicle(req.body);
    return res.status(201).json({ success: true, data: newLoan });
  } catch (error) {
    console.error("Error creating loan:", error);
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
    await client.query("BEGIN");

    const {
      loanId,
      emiId,
      amountPaid,
      paymentMethod,
      referenceNumber,
    } = req.body;

    const paidAmount = Number(amountPaid);

    if (
      !loanId ||
      !emiId ||
      !Number.isFinite(paidAmount) ||
      paidAmount <= 0
    ) {
      throw new Error(
        "loanId, emiId and a valid positive amountPaid are required"
      );
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
    // CALCULATE TOTAL CONTRACTUAL FLAT INTEREST
    // =====================================================

    const totalContractualInterest = Number(
      (
        originalPrincipal *
        (interestRate / 100) *
        (tenureMonths / 12)
      ).toFixed(2),
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

    const scheduledPrincipal = Number(emi.principal_component || 0);
    const scheduledInterest = Number(emi.interest_component || 0);

    const previousCollected = Number(emi.collected_amount || 0);
    const previousPaidPrincipal = Number(emi.paid_principal || 0);
    const previousPaidInterest = Number(emi.paid_interest || 0);
    const previousExtraPrincipal = Number(emi.extra_principal_paid || 0);

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

    const interestPaidNow = roundMoney(
      Math.min(remainingPayment, remainingInterest)
    );

    remainingPayment = roundMoney(remainingPayment - interestPaidNow);

    const principalPaidCurrent = roundMoney(
      Math.min(remainingPayment, remainingPrincipal)
    );

    remainingPayment = roundMoney(remainingPayment - principalPaidCurrent);

    const extraPrincipalPaymentNow = roundMoney(remainingPayment); 

    // =====================================================
    // CUMULATIVE EMI STATE
    // =====================================================

    const totalInterestPaid = roundMoney(previousPaidInterest + interestPaidNow);
    const totalPrincipalPaid = roundMoney(previousPaidPrincipal + principalPaidCurrent); 
    const totalExtraPrincipalPaid = roundMoney(previousExtraPrincipal + extraPrincipalPaymentNow);
    
    // Only scheduled EMI collection belongs in collected_amount.
    const scheduledPaymentNow = roundMoney(
      interestPaidNow + principalPaidCurrent
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
      extraPrincipalPaymentNow
    );

    if (Math.abs(allocatedPayment - paidAmount) > 0.01) {
      throw new Error(
        "Payment allocation mismatch. Transaction aborted."
      );
    }

    // =====================================================
    // 4. DETERMINE EMI STATUS
    // =====================================================

    const currentEmiFullyPaid =
      totalInterestPaid >= scheduledInterest &&
      totalPrincipalPaid >= scheduledPrincipal;

    const newStatus = currentEmiFullyPaid ? "PAID" : "PARTIAL";

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
        status = $6
      WHERE id = $1
      `,
      [
        emiId,
        totalCollected,
        totalInterestPaid,
        totalPrincipalPaid,
        totalExtraPrincipalPaid,
        newStatus,
      ],
    );

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
        principal_paid,
        interest_paid,
        extra_principal_paid,
        payment_method,
        reference_number
      )
      VALUES (
        $1, $2, CURRENT_DATE, $3, $4, $5, $6, $7, $8
      )
      RETURNING *
      `,
      [
        loanId,
        emiId,
        paidAmount,
        principalPaidCurrent,
        interestPaidNow,
        extraPrincipalPaymentNow,
        paymentMethod || "CASH",
        referenceNumber || "",
      ],
    );

    const payment = payRes.rows[0];

    // =====================================================
    // 7. GLOBAL CASH LEDGER
    // =====================================================

    await createLedgerEntry(client, {
      type: "AUTO_COLLECTION",
      amount: paidAmount,
      direction: "CREDIT",
      sourceModule: "AUTO",
      referenceType: "AUTO_PAYMENT",
      referenceId: payment.id,
      notes: `Auto Loan EMI Collection for Loan ${loanId}`,
    });

    // =====================================================
    // 8. RECALCULATE FUTURE EMI SCHEDULE
    // =====================================================
    
    // This strictly recomputes future pending schedules using global outstanding principal tracking.
    await rescheduleFutureEMIs(client, loanId);

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
      const monthParam = req.query.month; // Expected format: 'YYYY-MM'
      const targetDate = monthParam ? `${monthParam}-01` : new Date().toISOString();
  
      const query = `
        SELECT 
          p.id as payment_id,
          p.amount_paid,
          p.payment_method,
          p.reference_number,
          p.created_at as payment_date,
          s.installment_number,
          s.total_emi as expected_emi,
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
        JOIN autofinance_emi_schedules s ON p.emi_id = s.id
        JOIN autofinance_loans l ON p.loan_id = l.id
        JOIN autofinance_customers c ON l.customer_id = c.id
        LEFT JOIN autofinance_vehicles v ON l.id = v.loan_id
        WHERE date_trunc('month', p.created_at) = date_trunc('month', $1::timestamp)
        ORDER BY p.created_at DESC;
      `;
      const result = await client.query(query, [targetDate]);
    res.status(200).json({ success: true, data: result.rows });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  } finally {
    client.release();
  }
}