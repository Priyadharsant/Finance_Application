import { createLoanWithVehicle, getAllLoans, getLoanDetails, getAutoFinanceOverview, getDueInstallments } from "../services/loanService.js";
import { pool } from "../config/db.js";

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
      return res.status(404).json({ success: false, message: "Loan not found" });
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
        dueSchedules
      }
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
}

export async function recordEmiPayment(req, res) {
  try {
    const { loanId, emiId, amountPaid, paymentMethod, referenceNumber } = req.body;
    
    // 1. Insert payment record
    const payRes = await pool.query(`
      INSERT INTO autofinance_payments (loan_id, payment_date, amount_paid, payment_method, reference_number)
      VALUES ($1, CURRENT_DATE, $2, $3, $4)
      RETURNING *;
    `, [loanId, amountPaid, paymentMethod || 'CASH', referenceNumber || '']);

    // 2. Mark EMI status if emiId passed
    if (emiId) {
      await pool.query(`
        UPDATE autofinance_emi_schedules
        SET status = 'PAID'
        WHERE id = $1;
      `, [emiId]);
    }

    return res.status(200).json({ success: true, data: payRes.rows[0] });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
}
