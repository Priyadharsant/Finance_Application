import React from "react";
import { X, AlertCircle } from "lucide-react";
import { money } from "../services/dailyFinanceApi.js";

export default function PaymentEditorModal({
  payment,
  setPayment,
  submit,
  close,
  busy,
}) {
  if (!payment) return null;

  const set = (key) => (event) =>
    setPayment({ ...payment, [key]: event.target.value });

  const maxAllowed = payment.maxAllowed !== undefined ? Number(payment.maxAllowed) : null;
  const isExceeded = maxAllowed !== null && Number(payment.amount || 0) > maxAllowed;

  return (
    <div
      className="modal"
      onClick={(event) => {
        if (event.target === event.currentTarget) close();
      }}
    >
      <form className="paymentCard" onSubmit={submit} style={{ maxWidth: "460px" }}>
        <button type="button" className="close" onClick={close}>
          <X size={18} />
        </button>
        <span className="overline">EDIT COLLECTION</span>
        <h2 style={{ marginBottom: "2px" }}>
          {payment.customer_name || "Update Daily Collection"}
        </h2>
        <p style={{ color: "#64748b", fontSize: "13px", marginTop: 0, marginBottom: "16px" }}>
          Modify or adjust payment recorded for this customer.
        </p>

        <label>
          Collection date
          <input
            type="date"
            required
            value={payment.collectionDate || ""}
            onChange={set("collectionDate")}
          />
        </label>

        <label>
          Amount collected (₹)
          <input
            type="number"
            min="0"
            step="0.01"
            required
            autoFocus
            value={payment.amount ?? ""}
            onChange={set("amount")}
            placeholder="Enter amount collected"
            style={{
              borderColor: isExceeded ? "#ef4444" : undefined,
              backgroundColor: isExceeded ? "#fef2f2" : undefined,
            }}
          />
        </label>

        {maxAllowed !== null && (
          <div style={{ marginTop: "-8px", marginBottom: "10px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "12px", color: "#64748b" }}>
              <span>Remaining Loan Balance:</span>
              <b style={{ color: isExceeded ? "#dc2626" : "#0f766e" }}>{money(maxAllowed)}</b>
            </div>

            {isExceeded && (
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  color: "#dc2626",
                  fontSize: "12px",
                  fontWeight: "700",
                  marginTop: "6px",
                  background: "#fef2f2",
                  padding: "6px 10px",
                  borderRadius: "6px",
                  border: "1px solid #fecaca",
                }}
              >
                <span>⚠️ Cannot exceed remaining balance!</span>
                <button
                  type="button"
                  onClick={() => setPayment({ ...payment, amount: maxAllowed })}
                  style={{
                    fontSize: "11px",
                    padding: "2px 6px",
                    borderRadius: "4px",
                    background: "#fee2e2",
                    border: "1px solid #fca5a5",
                    color: "#b91c1c",
                    cursor: "pointer",
                    fontWeight: "700",
                  }}
                >
                  Set to {money(maxAllowed)}
                </button>
              </div>
            )}
          </div>
        )}

        <label>
          Payment method
          <select
            value={payment.paymentMethod || payment.payment_method || "CASH"}
            onChange={set("paymentMethod")}
          >
            <option value="CASH">Cash</option>
            <option value="UPI">UPI / GPay / PhonePe</option>
            <option value="BANK_TRANSFER">Bank Transfer / NEFT</option>
          </select>
        </label>

        <label>
          Notes / remarks
          <textarea
            value={payment.notes || ""}
            onChange={set("notes")}
            placeholder="Optional collection notes or payment details..."
            rows={2}
          />
        </label>

        <div style={{ display: "flex", gap: "10px", marginTop: "12px" }}>
          <button
            type="button"
            className="secondary"
            onClick={close}
            style={{ flex: 1 }}
          >
            Cancel
          </button>
          <button
            type="submit"
            className="primary"
            disabled={busy || payment.amount === "" || payment.amount === undefined || isExceeded}
            style={{
              flex: 2,
              background: isExceeded ? "#94a3b8" : "#059669",
              borderColor: isExceeded ? "#94a3b8" : "#059669",
              cursor: isExceeded ? "not-allowed" : "pointer",
            }}
          >
            {busy ? "Updating..." : "Update Collection"}
          </button>
        </div>
      </form>
    </div>
  );
}
