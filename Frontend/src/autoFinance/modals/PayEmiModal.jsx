import React from "react";
import { X } from "lucide-react";
import { money } from "../services/autoFinanceApi";

export default function PayEmiModal({
  payEmiModal,
  setPayEmiModal,
  payForm,
  setPayForm,
  handlePayEmi,
}) {
  if (!payEmiModal) return null;

  return (
    <div
      className="modal"
      onClick={(event) => {
        if (event.target === event.currentTarget) setPayEmiModal(null);
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
          onClick={() => setPayEmiModal(null)}
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
            value={payForm.amountPaid}
            onChange={(e) =>
              setPayForm({ ...payForm, amountPaid: e.target.value })
            }
          />
        </label>
        <label>
          Payment Method
          <select
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
            value={payForm.referenceNumber}
            onChange={(e) =>
              setPayForm({ ...payForm, referenceNumber: e.target.value })
            }
          />
        </label>
        <button
          className="primary autoBtn full"
          style={{ marginTop: "14px" }}
        >
          Confirm Payment
        </button>
      </form>
    </div>
  );
}
