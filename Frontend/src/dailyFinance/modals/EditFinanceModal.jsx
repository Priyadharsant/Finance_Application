import React, { useState, useEffect } from "react";
import { X, Save, AlertCircle } from "lucide-react";
import { money, today } from "../services/dailyFinanceApi.js";

export default function EditFinanceModal({
  customerData,
  onSave,
  busy,
  close,
}) {
  const [form, setForm] = useState({
    customerName: "",
    mobileNumber: "",
    address: "",
    customerNotes: "",
    financeDate: today(),
    grossFinanceAmount: "",
    interestType: "PERCENT",
    interestValue: "",
    initialDeduction: "",
    agreedTotalPayable: "",
    dailyAgreedDue: "",
    expectedCollectionDays: "",
    status: "ACTIVE",
    closedDate: "",
    accountNotes: "",
  });

  const [totalCollected, setTotalCollected] = useState(0);

  useEffect(() => {
    if (customerData) {
      const gross = customerData.gross_finance_amount !== undefined
        ? String(customerData.gross_finance_amount)
        : "";
      const deduction = customerData.initial_deduction !== undefined
        ? String(customerData.initial_deduction)
        : "";
      const payable = customerData.agreed_total_payable !== undefined
        ? String(customerData.agreed_total_payable)
        : gross;
      const dailyDue = customerData.daily_agreed_due !== undefined
        ? String(customerData.daily_agreed_due)
        : "0";
      const collected = Number(customerData.total_collected || 0);
      setTotalCollected(collected);

      let fDate = today();
      if (customerData.finance_date) {
        fDate = String(customerData.finance_date).slice(0, 10);
      }

      let cDate = "";
      if (customerData.closed_date) {
        cDate = String(customerData.closed_date).slice(0, 10);
      }

      setForm({
        customerName: customerData.customer_name || "",
        mobileNumber: customerData.mobile_number || "",
        address: customerData.address || "",
        customerNotes: customerData.notes || "",
        financeDate: fDate,
        grossFinanceAmount: gross,
        interestType: customerData.interest_type || "AMOUNT",
        interestValue: customerData.interest_value !== undefined ? String(customerData.interest_value) : deduction,
        initialDeduction: deduction,
        agreedTotalPayable: payable,
        dailyAgreedDue: dailyDue,
        expectedCollectionDays: customerData.expected_collection_days !== undefined ? String(customerData.expected_collection_days) : "100",
        status: customerData.status || "ACTIVE",
        closedDate: cDate,
        accountNotes: customerData.account_notes || "",
      });
    }
  }, [customerData]);

  // Dynamic calculations
  const grossNum = Number(form.grossFinanceAmount || 0);
  const intValNum = Number(form.interestValue || 0);

  // Auto-calculated deduction if not manually overridden
  const calcDeduction =
    form.interestType === "PERCENT"
      ? (grossNum * intValNum) / 100
      : intValNum;

  const effectiveDeduction =
    form.initialDeduction !== "" && !isNaN(Number(form.initialDeduction))
      ? Number(form.initialDeduction)
      : calcDeduction;

  const amountGiven = Math.max(0, grossNum - effectiveDeduction);
  const payableNum = form.agreedTotalPayable !== "" ? Number(form.agreedTotalPayable) : grossNum;
  const remaining = Math.max(0, payableNum - totalCollected);

  const handleInterestTypeOrValueChange = (newType, newVal) => {
    const val = Number(newVal || 0);
    const newDed = newType === "PERCENT" ? (grossNum * val) / 100 : val;
    setForm((prev) => ({
      ...prev,
      interestType: newType,
      interestValue: newVal,
      initialDeduction: String(newDed),
    }));
  };

  const handleGrossChange = (newGross) => {
    const gNum = Number(newGross || 0);
    let newDed = form.initialDeduction;
    if (form.interestType === "PERCENT") {
      newDed = String((gNum * intValNum) / 100);
    }
    setForm((prev) => ({
      ...prev,
      grossFinanceAmount: newGross,
      initialDeduction: newDed,
      agreedTotalPayable: prev.agreedTotalPayable === prev.grossFinanceAmount || !prev.agreedTotalPayable ? newGross : prev.agreedTotalPayable,
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.customerName.trim()) {
      alert("Please enter customer name");
      return;
    }
    if (grossNum <= 0) {
      alert("Gross finance amount must be greater than 0");
      return;
    }

    onSave({
      customerName: form.customerName.trim(),
      mobileNumber: form.mobileNumber.trim() || null,
      address: form.address.trim() || null,
      notes: form.customerNotes.trim() || null,
      financeDate: form.financeDate,
      grossFinanceAmount: grossNum,
      interestType: form.interestType,
      interestValue: intValNum,
      initialDeduction: effectiveDeduction,
      agreedTotalPayable: payableNum,
      dailyAgreedDue: Number(form.dailyAgreedDue || 0),
      expectedCollectionDays: Number(form.expectedCollectionDays || 0),
      status: form.status,
      closedDate: form.status === "ACTIVE" ? null : (form.closedDate || today()),
      accountNotes: form.accountNotes.trim() || null,
    });
  };

  return (
    <div
      className="modal"
      onClick={(e) => {
        if (e.target === e.currentTarget) close();
      }}
      style={{
        position: "fixed",
        inset: 0,
        backgroundColor: "rgba(15, 23, 42, 0.65)",
        backdropFilter: "blur(4px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 9999,
        padding: "16px",
      }}
    >
      <div
        className="formCard modalForm"
        style={{
          maxWidth: "760px",
          width: "100%",
          maxHeight: "92vh",
          overflowY: "auto",
          background: "#ffffff",
          borderRadius: "16px",
          boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)",
          padding: "28px",
          position: "relative",
        }}
      >
        <button
          type="button"
          className="close"
          onClick={close}
          style={{
            position: "absolute",
            top: "20px",
            right: "20px",
            background: "#f1f5f9",
            border: 0,
            borderRadius: "50%",
            width: "34px",
            height: "34px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
            color: "#64748b",
          }}
        >
          <X size={18} />
        </button>

        <div className="formTitle" style={{ marginBottom: "20px" }}>
          <span className="overline" style={{ color: "#0d9488", fontWeight: "700", letterSpacing: "0.05em" }}>
            FULL LOAN &amp; CUSTOMER EDITOR
          </span>
          <h2 style={{ fontSize: "22px", fontWeight: "800", color: "#0f172a", margin: "4px 0" }}>
            Edit Finance: {customerData?.customer_name || "Customer"}
          </h2>
          <p style={{ color: "#64748b", fontSize: "13px", margin: 0 }}>
            Modify customer details, principal amount, interest, payable dues, dates, or status.
          </p>
        </div>

        <form onSubmit={handleSubmit}>
          {/* Section 1: Customer Profile */}
          <div style={{ marginBottom: "20px" }}>
            <h4 style={{ fontSize: "13px", textTransform: "uppercase", color: "#475569", fontWeight: "700", borderBottom: "1px solid #e2e8f0", paddingBottom: "6px", marginBottom: "12px" }}>
              1. Customer Profile
            </h4>
            <div className="formGrid" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "12px" }}>
              <label>
                Customer Name *
                <input
                  required
                  value={form.customerName}
                  onChange={(e) => setForm({ ...form, customerName: e.target.value })}
                  placeholder="e.g. MUNIYANDI.M"
                />
              </label>
              <label>
                Mobile Number
                <input
                  value={form.mobileNumber}
                  onChange={(e) => setForm({ ...form, mobileNumber: e.target.value })}
                  placeholder="e.g. 9876543210"
                />
              </label>
              <label style={{ gridColumn: "1 / -1" }}>
                Address / Location
                <input
                  value={form.address}
                  onChange={(e) => setForm({ ...form, address: e.target.value })}
                  placeholder="Street, City, Area"
                />
              </label>
            </div>
          </div>

          {/* Section 2: Loan Financial Terms */}
          <div style={{ marginBottom: "20px" }}>
            <h4 style={{ fontSize: "13px", textTransform: "uppercase", color: "#475569", fontWeight: "700", borderBottom: "1px solid #e2e8f0", paddingBottom: "6px", marginBottom: "12px" }}>
              2. Finance &amp; Interest Structure
            </h4>
            <div className="formGrid" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "12px" }}>
              <label>
                Finance Date *
                <input
                  type="date"
                  required
                  value={form.financeDate}
                  onChange={(e) => setForm({ ...form, financeDate: e.target.value })}
                />
              </label>
              <label>
                Gross Finance Amount (₹) *
                <input
                  type="number"
                  min="1"
                  step="0.01"
                  required
                  value={form.grossFinanceAmount}
                  onChange={(e) => handleGrossChange(e.target.value)}
                  placeholder="e.g. 10000"
                />
              </label>
              <label>
                Interest Type
                <select
                  value={form.interestType}
                  onChange={(e) => handleInterestTypeOrValueChange(e.target.value, form.interestValue)}
                >
                  <option value="PERCENT">Percentage (%)</option>
                  <option value="AMOUNT">Fixed Amount (₹)</option>
                </select>
              </label>
              <label>
                Interest Value {form.interestType === "PERCENT" ? "(%)" : "(₹)"} *
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  required
                  value={form.interestValue}
                  onChange={(e) => handleInterestTypeOrValueChange(form.interestType, e.target.value)}
                  placeholder={form.interestType === "PERCENT" ? "e.g. 10" : "e.g. 1000"}
                />
              </label>
              <label>
                Initial Deduction / Pitipu (₹)
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.initialDeduction}
                  onChange={(e) => setForm({ ...form, initialDeduction: e.target.value })}
                  placeholder="Calculated automatically or override"
                />
              </label>
              <label>
                Total Agreed Return (₹) *
                <input
                  type="number"
                  min="1"
                  step="0.01"
                  required
                  value={form.agreedTotalPayable}
                  onChange={(e) => setForm({ ...form, agreedTotalPayable: e.target.value })}
                  placeholder="e.g. 10000"
                />
              </label>
              <label>
                Daily Agreed Due (₹/day)
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.dailyAgreedDue}
                  onChange={(e) => setForm({ ...form, dailyAgreedDue: e.target.value })}
                  placeholder="e.g. 100"
                />
              </label>
              <label>
                Expected Days
                <input
                  type="number"
                  min="1"
                  value={form.expectedCollectionDays}
                  onChange={(e) => setForm({ ...form, expectedCollectionDays: e.target.value })}
                  placeholder="e.g. 100"
                />
              </label>
            </div>
          </div>

          {/* Section 3: Status & Loan State */}
          <div style={{ marginBottom: "20px" }}>
            <h4 style={{ fontSize: "13px", textTransform: "uppercase", color: "#475569", fontWeight: "700", borderBottom: "1px solid #e2e8f0", paddingBottom: "6px", marginBottom: "12px" }}>
              3. Loan Status &amp; State
            </h4>
            <div className="formGrid" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "12px" }}>
              <label>
                Loan Status
                <select
                  value={form.status}
                  onChange={(e) => setForm({ ...form, status: e.target.value })}
                >
                  <option value="ACTIVE">ACTIVE</option>
                  <option value="COMPLETED">COMPLETED</option>
                  <option value="CLOSED">CLOSED</option>
                </select>
              </label>
              {(form.status === "COMPLETED" || form.status === "CLOSED") && (
                <label>
                  Closed Date
                  <input
                    type="date"
                    value={form.closedDate}
                    onChange={(e) => setForm({ ...form, closedDate: e.target.value })}
                  />
                </label>
              )}
              <label style={{ gridColumn: form.status === "ACTIVE" ? "2 / -1" : "1 / -1" }}>
                Notes / Remarks
                <input
                  value={form.customerNotes}
                  onChange={(e) => setForm({ ...form, customerNotes: e.target.value })}
                  placeholder="Internal notes, guarantee, etc."
                />
              </label>
            </div>
          </div>

          {/* Live Financial Summary Box */}
          <div
            className="breakdown"
            style={{
              background: "#f8fafc",
              border: "1px solid #e2e8f0",
              borderRadius: "12px",
              padding: "16px",
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))",
              gap: "12px",
              marginBottom: "24px",
            }}
          >
            <div>
              <div style={{ fontSize: "11px", color: "#64748b", fontWeight: "600" }}>Upfront Interest</div>
              <div style={{ fontSize: "16px", fontWeight: "800", color: "#0d9488" }}>{money(effectiveDeduction)}</div>
            </div>
            <div>
              <div style={{ fontSize: "11px", color: "#64748b", fontWeight: "600" }}>Disbursed (Cash Given)</div>
              <div style={{ fontSize: "16px", fontWeight: "800", color: "#0284c7" }}>{money(amountGiven)}</div>
            </div>
            <div>
              <div style={{ fontSize: "11px", color: "#64748b", fontWeight: "600" }}>Total Return</div>
              <div style={{ fontSize: "16px", fontWeight: "800", color: "#0f172a" }}>{money(payableNum)}</div>
            </div>
            <div>
              <div style={{ fontSize: "11px", color: "#64748b", fontWeight: "600" }}>Already Collected</div>
              <div style={{ fontSize: "16px", fontWeight: "800", color: "#059669" }}>{money(totalCollected)}</div>
            </div>
            <div>
              <div style={{ fontSize: "11px", color: "#64748b", fontWeight: "600" }}>Remaining Due</div>
              <div style={{ fontSize: "16px", fontWeight: "800", color: remaining > 0 ? "#ea580c" : "#059669" }}>
                {money(remaining)}
              </div>
            </div>
          </div>

          {/* Modal Action Buttons */}
          <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px" }}>
            <button
              type="button"
              onClick={close}
              disabled={busy}
              style={{
                background: "#f1f5f9",
                color: "#475569",
                border: "1px solid #cbd5e1",
                padding: "10px 18px",
                borderRadius: "8px",
                fontWeight: "700",
                fontSize: "13.5px",
                cursor: "pointer",
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={busy}
              style={{
                background: "#0d9488",
                color: "#ffffff",
                border: 0,
                padding: "10px 22px",
                borderRadius: "8px",
                fontWeight: "700",
                fontSize: "13.5px",
                cursor: busy ? "not-allowed" : "pointer",
                display: "inline-flex",
                alignItems: "center",
                gap: "8px",
                boxShadow: "0 2px 4px rgba(13, 148, 136, 0.25)",
              }}
            >
              <Save size={16} />
              {busy ? "Saving Changes..." : "Save All Changes"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
