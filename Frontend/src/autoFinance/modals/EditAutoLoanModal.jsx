import React, { useState } from "react";
import { X, Save, AlertCircle, LoaderCircle, IndianRupee, CarFront, Calculator, Calendar } from "lucide-react";
import { money } from "../services/autoFinanceApi";

export default function EditAutoLoanModal({
  loan,
  onSave,
  onClose,
  busy,
}) {
  if (!loan) return null;

  const [form, setForm] = useState({
    customer_name: loan.customer_name || `${loan.first_name || ""} ${loan.last_name || ""}`.trim() || "",
    customer_phone: loan.customer_phone || loan.phone || "",
    registration_number: loan.registration_number || "",
    loan_amount: String(loan.loan_amount || ""),
    interest_rate: String(loan.interest_rate || "12"),
    interest_type: loan.interest_type || "FLAT",
    tenure_months: String(loan.tenure_months || "12"),
    start_date: loan.start_date ? String(loan.start_date).slice(0, 10) : new Date().toISOString().slice(0, 10),
    disbursement_date: loan.disbursement_date
      ? String(loan.disbursement_date).slice(0, 10)
      : loan.start_date
      ? String(loan.start_date).slice(0, 10)
      : new Date().toISOString().slice(0, 10),
    income_due: String(loan.income_due || loan.fees_details?.incomeDue || 0),
    document_fee: String(loan.document_fee || loan.fees_details?.documentFee || 0),
    hire_purchase: String(loan.hire_purchase || loan.fees_details?.hirePurchase || 0),
    tax_amount: String(loan.tax_amount || loan.fees_details?.taxAmount || 0),
    insurance: String(loan.insurance || loan.fees_details?.insurance || 0),
    insurance_fine: String(loan.insurance_fine || loan.fees_details?.insuranceFine || 0),
    green_tax: String(loan.green_tax || loan.fees_details?.greenTax || 0),
    fine: String(loan.fine || loan.fees_details?.fine || 0),
    national_tax: String(loan.national_tax || loan.fees_details?.nationalTax || 0),
    permit: String(loan.permit || loan.fees_details?.permit || 0),
    brokerage_customer: String(loan.brokerage_customer || loan.fees_details?.brokerageCustomer || 0),
    brokerage_hand: String(loan.brokerage_hand || loan.fees_details?.brokerageHand || 0),
  });

  const [error, setError] = useState("");

  const handleChange = (field) => (e) => {
    setForm((prev) => ({ ...prev, [field]: e.target.value }));
  };

  const principal = Number(form.loan_amount || 0);
  const rate = Number(form.interest_rate || 0);
  const tenure = Number(form.tenure_months || 0);
  
  // Calculation preview
  const previewInterest = tenure > 0 ? (principal * (rate / 100) * (tenure / 12)) : 0;
  const previewTotalPayable = principal + previewInterest;
  const previewEmi = tenure > 0 ? previewTotalPayable / tenure : 0;

  const totalDeductions = 
    Number(form.income_due || 0) +
    Number(form.document_fee || 0) +
    Number(form.hire_purchase || 0) +
    Number(form.tax_amount || 0) +
    Number(form.insurance || 0) +
    Number(form.insurance_fine || 0) +
    Number(form.green_tax || 0) +
    Number(form.fine || 0) +
    Number(form.national_tax || 0) +
    Number(form.permit || 0) +
    Number(form.brokerage_customer || 0) +
    Number(form.brokerage_hand || 0);

  const previewNetDisbursed = Math.max(0, principal - totalDeductions);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!form.customer_name.trim()) {
      setError("Customer name is required.");
      return;
    }
    if (principal <= 0) {
      setError("Loan principal amount must be greater than zero.");
      return;
    }
    if (rate <= 0) {
      setError("Interest rate must be greater than zero.");
      return;
    }
    if (tenure <= 0) {
      setError("Tenure months must be at least 1.");
      return;
    }

    try {
      await onSave(loan.id, {
        customer_name: form.customer_name,
        customer_phone: form.customer_phone,
        registration_number: form.registration_number,
        loan_amount: principal,
        interest_rate: rate,
        interest_type: form.interest_type,
        tenure_months: tenure,
        start_date: form.start_date,
        disbursement_date: form.disbursement_date,
        income_due: Number(form.income_due || 0),
        document_fee: Number(form.document_fee || 0),
        hire_purchase: Number(form.hire_purchase || 0),
        tax_amount: Number(form.tax_amount || 0),
        insurance: Number(form.insurance || 0),
        insurance_fine: Number(form.insurance_fine || 0),
        green_tax: Number(form.green_tax || 0),
        fine: Number(form.fine || 0),
        national_tax: Number(form.national_tax || 0),
        permit: Number(form.permit || 0),
        brokerage_customer: Number(form.brokerage_customer || 0),
        brokerage_hand: Number(form.brokerage_hand || 0),
      });
      onClose();
    } catch (err) {
      setError(err.message || "Failed to update loan details.");
    }
  };

  return (
    <div
      className="modal"
      onClick={(e) => {
        if (e.target === e.currentTarget && !busy) onClose();
      }}
    >
      <form
        className="formCard modalForm"
        onClick={(e) => e.stopPropagation()}
        onSubmit={handleSubmit}
        style={{ width: "min(880px, 95vw)" }}
      >
        <button
          type="button"
          className="close"
          onClick={onClose}
          disabled={busy}
          aria-label="Close"
        >
          <X size={18} />
        </button>

        <div className="formTitle">
          <span className="overline autoBadgeTag">VEHICLE LOAN</span>
          <h2>Edit Loan Details &amp; Financial Terms</h2>
          <p>Update customer details, vehicle registration, financial terms, and deductions.</p>
        </div>

        {/* Real-time Financial Breakdown Banner */}
        <div
          style={{
            background: "#f8fafc",
            border: "1.5px solid #e2e8f0",
            borderRadius: "14px",
            padding: "16px 20px",
            marginBottom: "24px",
            display: "grid",
            gridTemplateColumns: "repeat(5, 1fr)",
            gap: "14px",
          }}
        >
          <div>
            <div style={{ fontSize: "10.5px", fontWeight: "800", color: "#64748b", textTransform: "uppercase", letterSpacing: "0.5px" }}>
              Principal
            </div>
            <div style={{ fontSize: "16px", fontWeight: "800", color: "#0f172a", marginTop: "3px" }}>
              {money(principal)}
            </div>
          </div>
          <div>
            <div style={{ fontSize: "10.5px", fontWeight: "800", color: "#64748b", textTransform: "uppercase", letterSpacing: "0.5px" }}>
              Interest ({rate}%)
            </div>
            <div style={{ fontSize: "16px", fontWeight: "800", color: "#0284c7", marginTop: "3px" }}>
              {money(previewInterest)}
            </div>
          </div>
          <div>
            <div style={{ fontSize: "10.5px", fontWeight: "800", color: "#64748b", textTransform: "uppercase", letterSpacing: "0.5px" }}>
              Total Payable
            </div>
            <div style={{ fontSize: "16px", fontWeight: "800", color: "#4f46e5", marginTop: "3px" }}>
              {money(previewTotalPayable)}
            </div>
          </div>
          <div>
            <div style={{ fontSize: "10.5px", fontWeight: "800", color: "#64748b", textTransform: "uppercase", letterSpacing: "0.5px" }}>
              Monthly EMI
            </div>
            <div style={{ fontSize: "16px", fontWeight: "800", color: "#b45309", marginTop: "3px" }}>
              {money(previewEmi)}
            </div>
          </div>
          <div>
            <div style={{ fontSize: "10.5px", fontWeight: "800", color: "#64748b", textTransform: "uppercase", letterSpacing: "0.5px" }}>
              Net In-Hand Disbursed
            </div>
            <div style={{ fontSize: "16px", fontWeight: "800", color: "#059669", marginTop: "3px" }}>
              {money(previewNetDisbursed)}
            </div>
          </div>
        </div>

        {error && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "10px",
              padding: "12px 14px",
              background: "#fef2f2",
              border: "1px solid #fecaca",
              borderRadius: "10px",
              color: "#b91c1c",
              fontSize: "13px",
              fontWeight: 600,
              marginBottom: "20px",
            }}
          >
            <AlertCircle size={17} style={{ flexShrink: 0 }} />
            <span>{error}</span>
          </div>
        )}

        {/* Section: Customer & Vehicle */}
        <h4 style={{ fontSize: "13px", fontWeight: "800", color: "#334155", letterSpacing: "0.5px", textTransform: "uppercase", margin: "0 0 12px 0" }}>
          Customer &amp; Vehicle
        </h4>
        <div className="formGrid" style={{ marginBottom: "24px" }}>
          <label>
            Customer Name *
            <input
              type="text"
              required
              disabled={busy}
              value={form.customer_name}
              onChange={handleChange("customer_name")}
            />
          </label>

          <label>
            Phone Number
            <input
              type="tel"
              disabled={busy}
              value={form.customer_phone}
              onChange={handleChange("customer_phone")}
            />
          </label>

          <label className="wide">
            Registration Number
            <input
              type="text"
              disabled={busy}
              value={form.registration_number}
              onChange={handleChange("registration_number")}
              placeholder="e.g. TN 57 AB 1234"
            />
          </label>
        </div>

        {/* Section: Loan Financial Terms */}
        <h4 style={{ fontSize: "13px", fontWeight: "800", color: "#334155", letterSpacing: "0.5px", textTransform: "uppercase", margin: "0 0 12px 0" }}>
          Loan Financial Terms
        </h4>
        <div className="formGrid" style={{ gridTemplateColumns: "repeat(4, 1fr)", marginBottom: "24px" }}>
          <label>
            Loan Amount (₹) *
            <input
              type="number"
              step="0.01"
              min="1"
              required
              disabled={busy}
              value={form.loan_amount}
              onChange={handleChange("loan_amount")}
            />
          </label>

          <label>
            Interest Rate (%) *
            <input
              type="number"
              step="0.01"
              min="0.01"
              required
              disabled={busy}
              value={form.interest_rate}
              onChange={handleChange("interest_rate")}
            />
          </label>

          <label>
            Interest Type
            <select
              disabled={busy}
              value={form.interest_type}
              onChange={handleChange("interest_type")}
            >
              <option value="FLAT">Flat</option>
              <option value="REDUCING">Reducing Balance</option>
            </select>
          </label>

          <label>
            Tenure (Months) *
            <input
              type="number"
              min="1"
              required
              disabled={busy}
              value={form.tenure_months}
              onChange={handleChange("tenure_months")}
            />
          </label>

          <label style={{ gridColumn: "span 2" }}>
            Loan Start Date
            <input
              type="date"
              disabled={busy}
              value={form.start_date}
              onChange={handleChange("start_date")}
            />
          </label>

          <label style={{ gridColumn: "span 2" }}>
            Disbursement Date
            <input
              type="date"
              disabled={busy}
              value={form.disbursement_date}
              onChange={handleChange("disbursement_date")}
            />
          </label>
        </div>

        {/* Section: Deductions & Fees */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
          <h4 style={{ fontSize: "13px", fontWeight: "800", color: "#334155", letterSpacing: "0.5px", textTransform: "uppercase", margin: 0 }}>
            Deductions &amp; Fees (Deducted from Disbursement)
          </h4>
          <span style={{ fontSize: "12px", color: "#dc2626", fontWeight: "700" }}>
            Total Deductions: {money(totalDeductions)}
          </span>
        </div>
        <div className="formGrid" style={{ gridTemplateColumns: "repeat(4, 1fr)" }}>
          <label>
            Doc Fee (₹)
            <input
              type="number"
              step="0.01"
              min="0"
              disabled={busy}
              value={form.document_fee}
              onChange={handleChange("document_fee")}
            />
          </label>

          <label>
            Hire Purchase (₹)
            <input
              type="number"
              step="0.01"
              min="0"
              disabled={busy}
              value={form.hire_purchase}
              onChange={handleChange("hire_purchase")}
            />
          </label>

          <label>
            Insurance (₹)
            <input
              type="number"
              step="0.01"
              min="0"
              disabled={busy}
              value={form.insurance}
              onChange={handleChange("insurance")}
            />
          </label>

          <label>
            Tax Amount (₹)
            <input
              type="number"
              step="0.01"
              min="0"
              disabled={busy}
              value={form.tax_amount}
              onChange={handleChange("tax_amount")}
            />
          </label>

          <label>
            Green Tax (₹)
            <input
              type="number"
              step="0.01"
              min="0"
              disabled={busy}
              value={form.green_tax}
              onChange={handleChange("green_tax")}
            />
          </label>

          <label>
            Permit (₹)
            <input
              type="number"
              step="0.01"
              min="0"
              disabled={busy}
              value={form.permit}
              onChange={handleChange("permit")}
            />
          </label>

          <label>
            National Tax (₹)
            <input
              type="number"
              step="0.01"
              min="0"
              disabled={busy}
              value={form.national_tax}
              onChange={handleChange("national_tax")}
            />
          </label>

          <label>
            Brokerage (Cust.) (₹)
            <input
              type="number"
              step="0.01"
              min="0"
              disabled={busy}
              value={form.brokerage_customer}
              onChange={handleChange("brokerage_customer")}
            />
          </label>

          <label>
            Brokerage (Hand) (₹)
            <input
              type="number"
              step="0.01"
              min="0"
              disabled={busy}
              value={form.brokerage_hand}
              onChange={handleChange("brokerage_hand")}
            />
          </label>

          <label>
            Income Due (₹)
            <input
              type="number"
              step="0.01"
              min="0"
              disabled={busy}
              value={form.income_due}
              onChange={handleChange("income_due")}
            />
          </label>

          <label>
            Fine (₹)
            <input
              type="number"
              step="0.01"
              min="0"
              disabled={busy}
              value={form.fine}
              onChange={handleChange("fine")}
            />
          </label>

          <label>
            Insurance Fine (₹)
            <input
              type="number"
              step="0.01"
              min="0"
              disabled={busy}
              value={form.insurance_fine}
              onChange={handleChange("insurance_fine")}
            />
          </label>
        </div>

        <div
          style={{
            display: "flex",
            justifyContent: "flex-end",
            alignItems: "center",
            gap: "12px",
            marginTop: "28px",
            paddingTop: "20px",
            borderTop: "1px solid var(--border-light)",
          }}
        >
          <button
            type="button"
            className="cancelButton"
            onClick={onClose}
            disabled={busy}
            style={{
              padding: "10px 22px",
              background: "#ffffff",
              border: "1.5px solid #cbd5e1",
              borderRadius: "10px",
              color: "#475569",
              fontSize: "13.5px",
              fontWeight: "700",
              cursor: "pointer",
              transition: "all 0.18s ease",
            }}
          >
            Cancel
          </button>
          <button
            type="submit"
            className="autoBtn"
            disabled={busy}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "8px",
              padding: "10px 24px",
              fontSize: "13.5px",
              fontWeight: "700",
              borderRadius: "10px",
            }}
          >
            {busy ? (
              <>
                <LoaderCircle size={16} className="spinner" />
                Saving...
              </>
            ) : (
              <>
                <Save size={16} />
                Save Changes
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
