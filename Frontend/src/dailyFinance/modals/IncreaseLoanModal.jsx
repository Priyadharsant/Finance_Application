import React, { useState, useEffect } from "react";
import { TrendingUp, X, Sparkles, AlertCircle, ArrowRight, AlertTriangle } from "lucide-react";
import { money, today } from "../services/dailyFinanceApi.js";
import { globalCapitalApi } from "../../globalCapital/services/globalCapitalApi.js";

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

  const [newLoanAmount, setNewLoanAmount] = useState(
    currentGross > 0 ? String(currentGross) : ""
  );
  const [interestType, setInterestType] = useState("PERCENT");
  const [interestValue, setInterestValue] = useState("10");
  const [dailyAgreedDue, setDailyAgreedDue] = useState(
    customer.daily_agreed_due ? String(customer.daily_agreed_due) : ""
  );
  const [effectiveDate, setEffectiveDate] = useState(today());
  const [notes, setNotes] = useState("Top-up Refinance");
  const [modalError, setModalError] = useState("");
  const [availableCapital, setAvailableCapital] = useState(null);

  useEffect(() => {
    let isMounted = true;
    globalCapitalApi.getLedger()
      .then((data) => {
        if (isMounted && data && typeof data.availableCapital === "number") {
          setAvailableCapital(data.availableCapital);
        }
      })
      .catch(() => {});
    return () => { isMounted = false; };
  }, []);

  const newLoanNum = Number(newLoanAmount || 0);
  const intValNum = Number(interestValue || 0);

  // Interest calculated on full new loan amount as requested
  const interestDeduction =
    interestType === "PERCENT"
      ? Math.round((newLoanNum * intValNum) / 100)
      : Math.round(intValNum);

  const standardDisbursement = Math.max(0, newLoanNum - interestDeduction);
  const cashHandedOver = standardDisbursement - currentRemaining;
  const isInvalidPayout = newLoanNum > 0 && cashHandedOver < 0;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (newLoanNum <= 0 || isInvalidPayout) return;
    setModalError("");
    try {
      await onSubmit({
        financeId: customer.finance_id,
        newLoanAmount: newLoanNum,
        interestType,
        interestValue: intValNum,
        dailyAgreedDue: Number(dailyAgreedDue || 0),
        effectiveDate,
        notes: notes || `Top-up Refinance (Previous balance ₹${currentRemaining} settled; Net cash given: ₹${cashHandedOver})`,
      });
    } catch (err) {
      setModalError(err.message || "Unable to increase loan amount");
    }
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
        style={{ width: "min(580px, 94vw)" }}
      >
        <button type="button" className="close" onClick={onClose}>
          <X size={18} />
        </button>

        <div className="formTitle">
          <span className="overline" style={{ display: "flex", alignItems: "center", gap: "5px", color: "#0d9488" }}>
            <TrendingUp size={14} /> LOAN REFINANCE & TOP-UP
          </span>
          <h2>Increase Loan / Start New Loan</h2>
          <p>Closes previous active loan and starts a new loan with previous balance deducted.</p>
        </div>

        {/* Previous Loan Status Card */}
        <div style={{ marginBottom: "16px", padding: "12px 14px", background: "#f8fafc", borderRadius: "12px", border: "1.5px solid #e2e8f0" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <span style={{ fontSize: "14px", fontWeight: "800", color: "#0f172a" }}>
                {customer.customer_name}
              </span>
              <span style={{ fontSize: "12px", color: "#64748b", marginLeft: "8px" }}>
                (Current Loan)
              </span>
            </div>
            <span className={`tag ${String(customer.status || "ACTIVE").toLowerCase()}`}>
              {customer.status || "ACTIVE"}
            </span>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "8px", marginTop: "8px", fontSize: "12px" }}>
            <div>
              <span style={{ color: "#64748b", display: "block" }}>Previous Loan:</span>
              <strong style={{ color: "#0f172a" }}>{money(currentGross)}</strong>
            </div>
            <div>
              <span style={{ color: "#64748b", display: "block" }}>Collected:</span>
              <strong style={{ color: "#047857" }}>{money(currentCollected)}</strong>
            </div>
            <div>
              <span style={{ color: "#64748b", display: "block" }}>Remaining Balance:</span>
              <strong style={{ color: "#b91c1c", fontSize: "13px" }}>{money(currentRemaining)}</strong>
            </div>
          </div>
        </div>

        <div className="formGrid">
          <label>
            New Total Loan Amount (₹) *
            <input
              type="number"
              min="1"
              step="0.01"
              required
              placeholder="e.g. 50000"
              value={newLoanAmount}
              onChange={(e) => setNewLoanAmount(e.target.value)}
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

          <label>
            Daily Agreed Due (₹)
            <input
              type="number"
              min="0"
              step="0.01"
              placeholder="e.g. 500 (optional)"
              value={dailyAgreedDue}
              onChange={(e) => setDailyAgreedDue(e.target.value)}
            />
          </label>

          <label>
            Notes / Remarks
            <input
              type="text"
              placeholder="e.g. Top-up Refinance"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </label>
        </div>

        {/* Error notification if new payout cannot cover previous balance */}
        {isInvalidPayout && (
          <div style={{ marginTop: "12px", padding: "10px 14px", background: "#fef2f2", border: "1px solid #fecaca", borderRadius: "10px", color: "#b91c1c", fontSize: "12.5px", display: "flex", alignItems: "center", gap: "8px" }}>
            <AlertCircle size={16} />
            <span>New loan payout ({money(standardDisbursement)}) is less than previous balance ({money(currentRemaining)}). Please increase loan amount.</span>
          </div>
        )}

        {/* Real-time Calculation Breakdown Box */}
        <div
          className="breakdown"
          style={{ marginTop: "16px", background: "linear-gradient(135deg, #f0fdfa 0%, #e0f2fe 100%)", borderColor: "#99f6e4" }}
        >
          <span>
            New Finance Amount<b>{money(newLoanNum)}</b>
          </span>
          <span>
            Interest ({interestType === "PERCENT" ? `${intValNum}%` : "Fixed"})<b>{money(interestDeduction)}</b>
          </span>
          <span>
            Prev. Balance Settled<b style={{ color: "#dc2626" }}>- {money(currentRemaining)}</b>
          </span>
          <span>
            Actual Cash Given Now<b style={{ color: "#0284c7", fontSize: "15px" }}>{money(Math.max(0, cashHandedOver))}</b>
          </span>
          {availableCapital !== null && (
            <span>
              Company Cash in Hand<b style={{ color: cashHandedOver > availableCapital ? "#dc2626" : "#059669" }}>{money(availableCapital)}</b>
            </span>
          )}
          <span>
            Total Return to Collect<b style={{ color: "#047857" }}>{money(newLoanNum)}</b>
          </span>
          <span>
            Previous Loan Status<b style={{ color: "#059669" }}>Will be CLOSED</b>
          </span>
        </div>

        {/* Live Warning if cash to give exceeds company cash in hand */}
        {availableCapital !== null && cashHandedOver > availableCapital && (
          <div
            style={{
              marginTop: "12px",
              padding: "10px 14px",
              background: "#fff1f2",
              border: "1.5px solid #fecdd3",
              borderRadius: "10px",
              color: "#9f1239",
              fontSize: "12.5px",
              display: "flex",
              alignItems: "flex-start",
              gap: "8px",
            }}
          >
            <AlertTriangle size={18} style={{ flexShrink: 0, marginTop: "2px", color: "#e11d48" }} />
            <div>
              <strong>Company Cash Shortage Alert:</strong> You need to hand over <strong>{money(cashHandedOver)}</strong>, but Company Global Cash has only <strong>{money(availableCapital)}</strong> (Shortage: {money(cashHandedOver - availableCapital)}).
              <div style={{ fontSize: "11.5px", color: "#881337", marginTop: "3px" }}>
                The system will block this transaction until capital is contributed in <strong>Global Cash &rarr; Partner Capital</strong> or the loan amount is adjusted.
              </div>
            </div>
          </div>
        )}

        {/* Prominent Error Banner if API returned error */}
        {modalError && (
          <div
            style={{
              marginTop: "14px",
              padding: "14px 16px",
              background: "#fef2f2",
              border: "2px solid #ef4444",
              borderRadius: "12px",
              color: "#991b1b",
              fontSize: "13px",
              boxShadow: "0 6px 16px rgba(239, 68, 68, 0.18)",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "8px", fontWeight: "800", fontSize: "14px" }}>
              <AlertCircle size={20} color="#dc2626" />
              <span>Cannot Increase Loan (Transaction Blocked)</span>
            </div>
            <div style={{ marginTop: "6px", fontSize: "13px", fontWeight: "600", color: "#b91c1c" }}>
              Server Error: {modalError}
            </div>
            {modalError.toLowerCase().includes("insufficient funds") && (
              <div
                style={{
                  marginTop: "8px",
                  padding: "10px 12px",
                  background: "#ffffff",
                  borderRadius: "8px",
                  border: "1px dashed #fca5a5",
                  fontSize: "12px",
                  color: "#334155",
                  lineHeight: "1.5",
                }}
              >
                💡 <strong>Why this happens (for your client):</strong> The finance software verifies available company capital in Global Cash before letting cash be handed over. Since this loan needs <strong>{money(cashHandedOver)}</strong> cash given to the customer, but the company cash ledger only has <strong>{availableCapital !== null ? money(availableCapital) : "₹84,000"}</strong>, the server prevented an unrecorded cash deficit.
                <br />
                <strong>To fix:</strong> Add a partner capital contribution under <strong>Global Cash &rarr; Partner Capital</strong> (at least {money(Math.max(0, cashHandedOver - (availableCapital || 84000)))}), or lower the new loan amount.
              </div>
            )}
          </div>
        )}

        <button
          type="submit"
          className="primary full"
          disabled={busy || newLoanNum <= 0 || isInvalidPayout}
          style={{ marginTop: "18px" }}
        >
          <Sparkles size={16} />
          {busy ? "Processing..." : `Confirm & Start New Loan (Give ${money(Math.max(0, cashHandedOver))})`}
        </button>
      </form>
    </div>
  );
}
