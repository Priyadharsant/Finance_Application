import React from "react";
import { X } from "lucide-react";
import { money } from "../services/autoFinanceApi";

export default function PayEmiModal({
  payEmiModal,
  setPayEmiModal,
  payForm,
  setPayForm,
  handlePayEmi,
  submitting = false,
}) {
  if (!payEmiModal) return null;
  const remainingInterest = Number(payEmiModal.remainingInterest || 0);
  const remainingPrincipal = Number(payEmiModal.remainingPrincipal || 0);
  const enteredInterest = Number(payForm.interestPaid || 0);
  const enteredPrincipal = Number(payForm.principalPaid || 0);
  const carriedAmount = Number(payEmiModal.carriedAmount || 0);
  const enteredCarry = Number(payForm.carriedAmount || 0);
  const scheduledInstallmentDue = remainingInterest + remainingPrincipal;
  const pendingAmount = Math.max(0, scheduledInstallmentDue - enteredInterest - Math.min(enteredPrincipal, remainingPrincipal));
  const extraPrincipalPaid = Math.max(0, enteredPrincipal - remainingPrincipal);
  const totalAmountDue = remainingInterest + remainingPrincipal + carriedAmount;

  return (
    <div
      className="modal"
      onClick={(event) => {
        if (!submitting && event.target === event.currentTarget) setPayEmiModal(null);
      }}
    >
      <form
        className="paymentCard autoPayEmiForm"
        onClick={(event) => event.stopPropagation()}
        onSubmit={handlePayEmi}
      >
        <button
          type="button"
          className="close"
          disabled={submitting}
          onClick={() => !submitting && setPayEmiModal(null)}
          style={{ opacity: submitting ? 0.4 : 1, cursor: submitting ? "not-allowed" : "pointer" }}
        >
          <X size={18} />
        </button>
        <span className="overline autoBadgeTag">COLLECT EMI</span>
        <h2>Installment #{payEmiModal.instNo}</h2>
        {payEmiModal.remainingInterest !== undefined && (
          <div className={`autoPayDueSummary${carriedAmount > 0 ? " hasCarry" : ""}`}>
            <div className="autoPayDueBreakdown">
              <span>Principal <b>{money(payEmiModal.remainingPrincipal)}</b></span>
              <span>Interest <b>{money(payEmiModal.remainingInterest)}</b></span>
            </div>
            {carriedAmount > 0 && (
              <div className="autoPayCarryLine">
                <span>Previous month pending</span>
                <b>{money(carriedAmount)}</b>
              </div>
            )}
            <div className="autoPayTotalLine">
              <span>Total due</span>
              <b>{money(totalAmountDue)}</b>
            </div>
          </div>
        )}
        <div className="autoPayEmiFields">
          <label>
            Interest Collected (₹)
            <input
              type="number"
              min="0"
              step="0.01"
              disabled={submitting}
              value={payForm.interestPaid ?? "0"}
              onChange={(e) =>
                setPayForm({ ...payForm, interestPaid: e.target.value })
              }
            />
          </label>
          <label>
            Principal Collected (₹)
            <input
              type="number"
              min="0"
              step="0.01"
              disabled={submitting}
              value={payForm.principalPaid ?? "0"}
              onChange={(e) =>
                setPayForm({ ...payForm, principalPaid: e.target.value })
              }
            />
          </label>
          <div style={{ color: "#64748b", fontSize: "12px", gridColumn: "1 / -1" }}>
            Total collected: <b>{money(enteredInterest + enteredPrincipal + enteredCarry)}</b>
          </div>
          {extraPrincipalPaid > 0 && (
            <div style={{ color: "#059669", fontSize: "12px", fontWeight: 700, gridColumn: "1 / -1" }}>
              Extra Principal: {money(extraPrincipalPaid)} · Will reduce remaining future installments
            </div>
          )}
          {pendingAmount > 0 && (
            <div style={{ color: "#b45309", fontSize: "12px", fontWeight: 700, gridColumn: "1 / -1" }}>
              Pending amount: {money(pendingAmount)} · Will be added to next month
            </div>
          )}
          {Number(payEmiModal.pendingAmountForwarded || 0) > 0 && (
            <div style={{ color: "#b45309", fontSize: "12px", fontWeight: 700, gridColumn: "1 / -1" }}>
              Pending amount: {money(payEmiModal.pendingAmountForwarded)} · Will carry into the following month
            </div>
          )}
          <label>
            Fine Amount (₹)
            <input
              type="number"
              min="0"
              step="0.01"
              disabled={submitting}
              value={payForm.fineAmount ?? "0"}
              onChange={(e) =>
                setPayForm({ ...payForm, fineAmount: e.target.value })
              }
            />
          </label>
          <label>
            Collected Date
            <input
              type="date"
              required
              disabled={submitting}
              value={payForm.collectedDate || ""}
              onChange={(e) =>
                setPayForm({ ...payForm, collectedDate: e.target.value })
              }
            />
          </label>
          <label>
            Payment Method
            <select
              disabled={submitting}
              value={payForm.paymentMethod}
              onChange={(e) =>
                setPayForm({ ...payForm, paymentMethod: e.target.value })
              }
            >
              <option value="CASH">Cash</option>
              <option value="UPI">UPI / GPay / PhonePe</option>
              <option value="BANK_TRANSFER">Bank Transfer</option>
            </select>
          </label>
          <label>
            Reference / UTR No
            <input
              placeholder="Transaction ID (optional)"
              disabled={submitting}
              value={payForm.referenceNumber}
              onChange={(e) =>
                setPayForm({ ...payForm, referenceNumber: e.target.value })
              }
            />
          </label>
          <label>
            Receipt Number
            <input
              placeholder="Receipt number (optional)"
              disabled={submitting}
              value={payForm.receiptNumber || ""}
              onChange={(e) =>
                setPayForm({ ...payForm, receiptNumber: e.target.value })
              }
            />
          </label>
        </div>
        <button
          type="submit"
          className="primary autoBtn full"
          disabled={submitting}
          style={{
            marginTop: "14px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "8px",
            opacity: submitting ? 0.75 : 1,
            cursor: submitting ? "not-allowed" : "pointer",
          }}
        >
          {submitting ? (
            <>
              <span className="autoBtnSpinner" />
              Recording Payment...
            </>
          ) : (
            "Confirm Payment"
          )}
        </button>
      </form>
    </div>
  );
}
