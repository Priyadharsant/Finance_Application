import React, { useState } from "react";
import { TrendingUp, X, Sparkles } from "lucide-react";
import { money, today } from "../services/dailyFinanceApi.js";

export default function IncreaseLoanModal({
  customer,
  onClose,
  onSubmit,
  busy,
}) {
  if (!customer) return null;

  const currentGross = Number(customer.gross_finance_amount || 0);
  const currentAgreed = Number(customer.agreed_total_payable || 0);
  const currentCollected = Number(customer.total_collected || 0);
  const currentRemaining = Math.max(
    0,
    Number(
      customer.remaining !== undefined && customer.remaining !== null
        ? customer.remaining
        : customer.outstanding_receivable !== undefined && customer.outstanding_receivable !== null
        ? customer.outstanding_receivable
        : currentAgreed - currentCollected
    )
  );

  const [additionalAmount, setAdditionalAmount] = useState("");
  const [interestType, setInterestType] = useState("PERCENT");
  const [interestValue, setInterestValue] = useState("10");
  const [effectiveDate, setEffectiveDate] = useState(today());
  const [notes, setNotes] = useState("Additional loan amount top-up");

  const addNum = Number(additionalAmount || 0);
  const intValNum = Number(interestValue || 0);

  const additionalDeduction =
    interestType === "PERCENT"
      ? Math.round((addNum * intValNum) / 100)
      : Math.round(intValNum);

  const netDisbursement = Math.max(0, addNum - additionalDeduction);
  const newTotalGross = currentGross + addNum;
  const newTotalReturn = currentAgreed + addNum;
  const newRemaining = currentRemaining + addNum;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (addNum <= 0) return;
    onSubmit({
      financeId: customer.finance_id,
      additionalAmount: addNum,
      interestType,
      interestValue: intValNum,
      effectiveDate,
      notes,
    });
  };

  return (
    <div
      className="modal"
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <form
        className="formCard modalForm"
        onClick={(e) => e.stopPropagation()}
        onSubmit={handleSubmit}
        style={{ width: "min(560px, 94vw)" }}
      >
        <button type="button" className="close" onClick={onClose}>
          <X size={18} />
        </button>

        <div className="formTitle">
          <span className="overline" style={{ display: "flex", alignItems: "center", gap: "5px", color: "#0d9488" }}>
            <TrendingUp size={14} /> LOAN EXPANSION & TOP-UP
          </span>
          <h2>Increase Loan Amount</h2>
          <p>Add additional principal to customer's active daily finance account.</p>
        </div>

        <div style={{ marginBottom: "16px", padding: "12px 14px", background: "#f8fafc", borderRadius: "12px", border: "1.5px solid #e2e8f0" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: "14px", fontWeight: "800", color: "#0f172a" }}>
              {customer.customer_name}
            </span>
            <span className={`tag ${String(customer.status || "ACTIVE").toLowerCase()}`}>
              {customer.status || "ACTIVE"}
            </span>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "8px", marginTop: "8px", fontSize: "12px" }}>
            <div>
              <span style={{ color: "#64748b", display: "block" }}>Current Gross:</span>
              <strong style={{ color: "#0f172a" }}>{money(currentGross)}</strong>
            </div>
            <div>
              <span style={{ color: "#64748b", display: "block" }}>Agreed Return:</span>
              <strong style={{ color: "#0f172a" }}>{money(currentAgreed)}</strong>
            </div>
            <div>
              <span style={{ color: "#64748b", display: "block" }}>Remaining Due:</span>
              <strong style={{ color: "#b91c1c" }}>{money(currentRemaining)}</strong>
            </div>
          </div>
        </div>

        <div className="formGrid">
          <label>
            Additional Loan Amount (₹) *
            <input
              type="number"
              min="1"
              step="0.01"
              required
              placeholder="e.g. 5000"
              value={additionalAmount}
              onChange={(e) => setAdditionalAmount(e.target.value)}
            />
          </label>

          <label>
            Effective Date *
            <input
              type="date"
              required
              value={effectiveDate}
              onChange={(e) => setEffectiveDate(e.target.value)}
            />
          </label>

          <label>
            Interest Deduction Type
            <select
              value={interestType}
              onChange={(e) => setInterestType(e.target.value)}
            >
              <option value="PERCENT">Percentage (%)</option>
              <option value="AMOUNT">Fixed Amount (₹)</option>
            </select>
          </label>

          <label>
            Interest Value *
            <input
              type="number"
              min="0"
              step="0.01"
              required
              placeholder={interestType === "PERCENT" ? "e.g. 10" : "e.g. 500"}
              value={interestValue}
              onChange={(e) => setInterestValue(e.target.value)}
            />
          </label>

          <label className="wide">
            Top-up Reason / Notes
            <input
              type="text"
              placeholder="e.g. Emergency top-up / festival business advance"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </label>
        </div>

        {/* Real-time Calculation Breakdown Box */}
        <div
          className="breakdown"
          style={{ marginTop: "16px", background: "linear-gradient(135deg, #f0fdfa 0%, #e0f2fe 100%)", borderColor: "#99f6e4" }}
        >
          <span>
            Upfront Interest<b>{money(additionalDeduction)}</b>
          </span>
          <span>
            Cash Disbursed Now<b style={{ color: "#0284c7" }}>{money(netDisbursement)}</b>
          </span>
          <span>
            New Total Return<b style={{ color: "#047857" }}>{money(newTotalReturn)}</b>
          </span>
          <span>
            New Remaining<b style={{ color: "#b91c1c" }}>{money(newRemaining)}</b>
          </span>
        </div>

        <button
          type="submit"
          className="primary full"
          disabled={busy || addNum <= 0}
          style={{ marginTop: "18px" }}
        >
          <Sparkles size={16} />
          {busy ? "Updating..." : `Confirm & Disburse +${money(addNum)}`}
        </button>
      </form>
    </div>
  );
}
