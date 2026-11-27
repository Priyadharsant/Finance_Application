import React, { useState } from "react";
import { X, Save, AlertCircle, LoaderCircle, ReceiptText, Calendar, IndianRupee, AlertTriangle, ArrowRight } from "lucide-react";
import { money, dateLabel } from "../services/autoFinanceApi";

export default function EditAutoCollectionModal({
  isOpen,
  onClose,
  schedule,
  paymentSummary,
  onSave,
}) {
  if (!isOpen || !schedule) return null;

  const initialAmount = schedule.collected_amount !== null && schedule.collected_amount !== undefined
    ? String(schedule.collected_amount)
    : String(schedule.total_cash_collected || schedule.total_emi || "");

  const initialDate = paymentSummary?.lastDate || schedule.collected_date
    ? (paymentSummary?.lastDate || schedule.collected_date).toString().slice(0, 10)
    : new Date().toISOString().slice(0, 10);

  const initialFine = paymentSummary?.fineAmount !== undefined
    ? String(paymentSummary.fineAmount)
    : String(schedule.fine_amount || 0);

  const [collectedAmount, setCollectedAmount] = useState(initialAmount);
  const [collectedDate, setCollectedDate] = useState(initialDate);
  const [fineAmount, setFineAmount] = useState(initialFine);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const scheduledTotal = Number(schedule.scheduled_emi || schedule.total_emi || 0);
  const pComp = Number(schedule.principal_component || 0);
  const iComp = Number(schedule.interest_component || 0);

  const parsedAmt = Number(collectedAmount || 0);
  const parsedFine = Number(fineAmount || 0);
  const totalCashImpact = parsedAmt + parsedFine;

  // Real-time breakdown calculation
  let calcInterest = 0;
  let calcPrincipal = 0;
  let calcExtra = 0;
  let calcStatus = "PENDING";
  if (parsedAmt > 0) {
    let rem = parsedAmt;
    calcInterest = Math.min(rem, iComp);
    rem = Math.max(0, rem - calcInterest);
    calcPrincipal = Math.min(rem, pComp);
    rem = Math.max(0, rem - calcPrincipal);
    calcExtra = rem;

    const isFullyPaid = calcInterest >= iComp - 0.01 && calcPrincipal >= pComp - 0.01 && scheduledTotal > 0;
    calcStatus = isFullyPaid ? "PAID" : "PARTIAL";
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (isNaN(parsedAmt) || parsedAmt < 0) {
      setError("Please enter a valid collected amount (0 or greater).");
      return;
    }
    if (isNaN(parsedFine) || parsedFine < 0) {
      setError("Please enter a valid fine amount (0 or greater).");
      return;
    }
    if (!collectedDate || !/^\d{4}-\d{2}-\d{2}$/.test(collectedDate)) {
      setError("Please select a valid collected date (YYYY-MM-DD).");
      return;
    }

    setLoading(true);
    try {
      await onSave(schedule.id, {
        collected_amount: parsedAmt,
        collected_date: collectedDate,
        fine_amount: parsedFine,
      });
      onClose();
    } catch (err) {
      setError(err.message || "Failed to update collection.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="modal"
      onClick={(e) => {
        if (e.target === e.currentTarget && !loading) onClose();
      }}
    >
      <form
        className="formCard modalForm"
        onClick={(e) => e.stopPropagation()}
        onSubmit={handleSubmit}
        style={{ width: "min(560px, 94vw)" }}
      >
        <button
          type="button"
          className="close"
          onClick={onClose}
          disabled={loading}
          aria-label="Close"
        >
          <X size={18} />
        </button>

        <div className="formTitle">
          <span className="overline autoBadgeTag">COLLECTION EDITOR</span>
          <h2>Installment #{schedule.installment_number}</h2>
          <p>Update collected payment, payment date, and fine for this installment.</p>
        </div>

        {/* Real-time KPI Card */}
        <div
          style={{
            background: "#f8fafc",
            border: "1.5px solid #e2e8f0",
            borderRadius: "14px",
            padding: "16px",
            marginBottom: "20px",
            display: "grid",
            gridTemplateColumns: "repeat(3, 1fr)",
            gap: "12px",
          }}
        >
          <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
            <span style={{ fontSize: "10.5px", fontWeight: "800", color: "#64748b", textTransform: "uppercase", letterSpacing: "0.5px" }}>
              Scheduled EMI
            </span>
            <strong style={{ fontSize: "16px", color: "#0f172a", fontWeight: "800" }}>
              {money(scheduledTotal)}
            </strong>
            <small style={{ fontSize: "11px", color: "#64748b" }}>
              P: {money(pComp)} · I: {money(iComp)}
            </small>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
            <span style={{ fontSize: "10.5px", fontWeight: "800", color: "#64748b", textTransform: "uppercase", letterSpacing: "0.5px" }}>
              Current Status
            </span>
            <div>
              <span
                className="tag"
                style={{
                  display: "inline-block",
                  padding: "4px 10px",
                  fontSize: "11px",
                  fontWeight: "800",
                  borderRadius: "6px",
                  background: calcStatus === "PAID" ? "#dcfce7" : calcStatus === "PARTIAL" ? "#fef3c7" : "#f1f5f9",
                  color: calcStatus === "PAID" ? "#15803d" : calcStatus === "PARTIAL" ? "#b45309" : "#64748b",
                  border: `1px solid ${calcStatus === "PAID" ? "#86efac" : calcStatus === "PARTIAL" ? "#fde68a" : "#cbd5e1"}`,
                }}
              >
                {calcStatus}
              </span>
            </div>
            <small style={{ fontSize: "11px", color: "#64748b" }}>
              Due: {dateLabel(schedule.due_date)}
            </small>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
            <span style={{ fontSize: "10.5px", fontWeight: "800", color: "#64748b", textTransform: "uppercase", letterSpacing: "0.5px" }}>
              Total Inflow
            </span>
            <strong style={{ fontSize: "16px", color: "#047857", fontWeight: "800" }}>
              {money(totalCashImpact)}
            </strong>
            <small style={{ fontSize: "11px", color: "#059669" }}>
              EMI + Liquid Fine
            </small>
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

        <div className="formGrid">
          <label>
            Collected Amount (₹) *
            <input
              type="number"
              step="0.01"
              min="0"
              required
              disabled={loading}
              value={collectedAmount}
              onChange={(e) => setCollectedAmount(e.target.value)}
              placeholder="0.00"
            />
            <small style={{ display: "block", marginTop: "4px", fontSize: "11px", color: "#64748b", textTransform: "none", fontWeight: "normal" }}>
              {parsedAmt <= 0 ? "Setting to 0 resets status to PENDING" : `Principal: ${money(calcPrincipal)} · Interest: ${money(calcInterest)}`}
            </small>
          </label>

          <label>
            Collected Date *
            <input
              type="date"
              required
              disabled={loading}
              value={collectedDate}
              onChange={(e) => setCollectedDate(e.target.value)}
            />
            <small style={{ display: "block", marginTop: "4px", fontSize: "11px", color: "#64748b", textTransform: "none", fontWeight: "normal" }}>
              Scheduled due: {dateLabel(schedule.due_date)}
            </small>
          </label>

          <label className="wide">
            Fine / Penalty Amount (₹)
            <input
              type="number"
              step="0.01"
              min="0"
              disabled={loading}
              value={fineAmount}
              onChange={(e) => setFineAmount(e.target.value)}
              placeholder="0.00"
            />
            <small style={{ display: "block", marginTop: "4px", fontSize: "11px", color: "#64748b", textTransform: "none", fontWeight: "normal" }}>
              Liquid fine amount credited directly to cash ledger (Kai Iruppu).
            </small>
          </label>
        </div>

        <div
          style={{
            display: "flex",
            justifyContent: "flex-end",
            alignItems: "center",
            gap: "12px",
            marginTop: "24px",
            paddingTop: "20px",
            borderTop: "1px solid var(--border-light)",
          }}
        >
          <button
            type="button"
            className="cancelButton"
            onClick={onClose}
            disabled={loading}
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
            disabled={loading}
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
            {loading ? (
              <>
                <LoaderCircle size={16} className="spinner" />
                Updating...
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
