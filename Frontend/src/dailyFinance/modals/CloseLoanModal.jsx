import React, { useState, useEffect } from "react";
import { CheckCircle2, X, AlertCircle } from "lucide-react";
import { money, today } from "../services/dailyFinanceApi.js";

export default function CloseLoanModal({
  customer,
  onClose,
  onSubmit,
  busy,
}) {
  if (!customer) return null;

  const currentRemaining = Math.max(
    0,
    Number(
      customer.remaining !== undefined && customer.remaining !== null
        ? customer.remaining
        : customer.outstanding_receivable !== undefined && customer.outstanding_receivable !== null
        ? customer.outstanding_receivable
        : Number(customer.agreed_total_payable || 0) - Number(customer.total_collected || 0)
    )
  );

  const [settlementAmount, setSettlementAmount] = useState(currentRemaining);
  const [collectionDate, setCollectionDate] = useState(today());
  const [paymentMethod, setPaymentMethod] = useState("CASH");
  const [notes, setNotes] = useState("Early loan settlement");

  useEffect(() => {
    setSettlementAmount(currentRemaining);
  }, [customer, currentRemaining]);

  const settleNum = Number(settlementAmount || 0);
  const isDiscounted = settleNum < currentRemaining;
  const discountAmount = Math.max(0, currentRemaining - settleNum);

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit({
      financeId: customer.finance_id,
      settlementAmount: settleNum,
      discountAmount,
      collectionDate,
      paymentMethod,
      notes,
    });
  };

  return (
    <div
      className="closeLoanOverlay"
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <form
        className="closeLoanCard"
        onClick={(e) => e.stopPropagation()}
        onSubmit={handleSubmit}
        style={{ width: "min(440px, 94vw)" }}
      >
        <div className="closeLoanHeader">
          <h3>
            <CheckCircle2 size={19} style={{ color: "#dc2626" }} />
            Close Daily Loan Early
          </h3>
          <button
            type="button"
            className="closeLoanCloseBtn"
            onClick={onClose}
            title="Cancel"
          >
            <X size={15} />
          </button>
        </div>

        <div style={{ marginBottom: "14px", padding: "10px 12px", background: "#f8fafc", borderRadius: "10px", border: "1px solid #e2e8f0" }}>
          <div style={{ fontSize: "14px", fontWeight: "700", color: "#0f172a" }}>
            {customer.customer_name}
          </div>
          <div style={{ fontSize: "12px", color: "#64748b", marginTop: "2px" }}>
            Agreed Return: {money(customer.agreed_total_payable)} · Collected: {money(customer.total_collected)}
          </div>
        </div>

        <div className="closeLoanGrid">
          <div className="closeLoanField">
            <label className="closeLoanLabel">Outstanding Balance</label>
            <div style={{ fontSize: "16px", fontWeight: "800", color: "#dc2626", padding: "8px 0" }}>
              {money(currentRemaining)}
            </div>
          </div>

          <div className="closeLoanField">
            <label className="closeLoanLabel">Settlement Amount (₹)</label>
            <div className="closeLoanInputWrap">
              <span className="closeLoanPrefix">₹</span>
              <input
                type="number"
                min="0"
                step="any"
                required
                className="closeLoanInput"
                value={settlementAmount}
                onChange={(e) => setSettlementAmount(e.target.value)}
              />
            </div>
          </div>
        </div>

        {isDiscounted && discountAmount > 0 && (
          <div style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "11.5px", color: "#d97706", background: "#fffbeb", padding: "8px 10px", borderRadius: "8px", border: "1px solid #fde68a", marginBottom: "12px" }}>
            <AlertCircle size={14} />
            <span>
              Waiver/Discount of <b>{money(discountAmount)}</b> applied &amp; recorded in <b>Daily Expenses</b>.
            </span>
          </div>
        )}

        <div className="closeLoanField" style={{ marginBottom: "12px" }}>
          <label className="closeLoanLabel">Closure Date</label>
          <input
            type="date"
            required
            className="closeLoanTextInput"
            style={{ marginBottom: 0 }}
            value={collectionDate}
            onChange={(e) => setCollectionDate(e.target.value)}
          />
        </div>

        <div className="closeLoanField" style={{ marginBottom: "12px" }}>
          <label className="closeLoanLabel">Payment Method</label>
          <select
            className="closeLoanTextInput"
            style={{ marginBottom: 0, cursor: "pointer" }}
            value={paymentMethod}
            onChange={(e) => setPaymentMethod(e.target.value)}
          >
            <option value="CASH">Cash</option>
            <option value="ONLINE">UPI / Online Transfer</option>
            <option value="BANK">Bank Deposit</option>
            <option value="CHEQUE">Cheque</option>
          </select>
        </div>

        <div className="closeLoanField" style={{ marginBottom: "16px" }}>
          <label className="closeLoanLabel">Settlement Notes</label>
          <input
            type="text"
            className="closeLoanTextInput"
            style={{ marginBottom: 0 }}
            value={notes}
            placeholder="e.g. Account closed early after full settlement"
            onChange={(e) => setNotes(e.target.value)}
          />
        </div>

        <div className="closeLoanActions">
          <button
            type="button"
            className="closeLoanCancelBtn"
            onClick={onClose}
            disabled={busy}
          >
            Cancel
          </button>
          <button
            type="submit"
            className="closeLoanSubmitBtn"
            disabled={busy}
          >
            <CheckCircle2 size={16} />
            {busy ? "Closing..." : "Confirm Early Closure"}
          </button>
        </div>
      </form>
    </div>
  );
}
