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

  return (
    <div
      className="modal"
      onClick={(event) => {
        if (!submitting && event.target === event.currentTarget) setPayEmiModal(null);
      }}
    >
      <form
        className="paymentCard"
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
        {payEmiModal.remainingEmi !== payEmiModal.totalEmi && (
          <p style={{ margin: "-5px 0 15px 0", fontSize: "13px", color: "#64748b" }}>
            Remaining Amount: <b style={{ color: "#ef4444" }}>{money(payEmiModal.remainingEmi)}</b>
          </p>
        )}
        <label>
          Amount (₹)
          <input
            type="number"
            required
            disabled={submitting}
            value={payForm.amountPaid}
            onChange={(e) =>
              setPayForm({ ...payForm, amountPaid: e.target.value })
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
