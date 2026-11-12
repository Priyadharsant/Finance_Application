import React from "react";
import { X, AlertCircle, Edit3, Banknote, CreditCard, Calendar, FileText, CheckCircle2 } from "lucide-react";
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
  const currentMethod = String(payment.paymentMethod || payment.payment_method || "CASH").toUpperCase();
  const isNonCashSettlement = currentMethod === "TRANSFER";

  return (
    <div
      className="modal"
      onClick={(event) => {
        if (event.target === event.currentTarget) close();
      }}
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "rgba(15, 23, 42, 0.65)",
        backdropFilter: "blur(4px)",
        zIndex: 9999,
      }}
    >
      <form
        className="paymentCard"
        onSubmit={submit}
        style={{
          maxWidth: "480px",
          width: "100%",
          background: "#ffffff",
          borderRadius: "16px",
          boxShadow: "0 20px 40px -15px rgba(0, 0, 0, 0.25), 0 0 0 1px rgba(0, 0, 0, 0.05)",
          padding: "24px 26px",
          position: "relative",
          margin: "16px",
        }}
      >
        <button
          type="button"
          className="close"
          onClick={close}
          style={{
            position: "absolute",
            top: "18px",
            right: "18px",
            background: "#f1f5f9",
            border: "none",
            borderRadius: "50%",
            width: "32px",
            height: "32px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "#64748b",
            cursor: "pointer",
          }}
        >
          <X size={16} />
        </button>

        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "6px" }}>
          <div
            style={{
              width: "38px",
              height: "38px",
              borderRadius: "10px",
              background: "#ecfdf5",
              color: "#059669",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Edit3 size={20} />
          </div>
          <div>
            <span style={{ fontSize: "11px", fontWeight: "700", color: "#059669", letterSpacing: "0.06em", textTransform: "uppercase" }}>
              Collection Record
            </span>
            <h2 style={{ margin: 0, fontSize: "20px", fontWeight: "800", color: "#0f172a" }}>
              {payment.customer_name || "Update Daily Collection"}
            </h2>
          </div>
        </div>

        <p style={{ color: "#64748b", fontSize: "13px", marginTop: "4px", marginBottom: "16px" }}>
          Modify collection amount, change payment mode, or adjust collection date.
        </p>

        {/* Summary Card */}
        {maxAllowed !== null && (
          <div
            style={{
              background: "#f8fafc",
              border: "1px solid #e2e8f0",
              borderRadius: "12px",
              padding: "12px 14px",
              marginBottom: "16px",
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: "8px",
            }}
          >
            <div>
              <span style={{ fontSize: "11.5px", color: "#64748b", display: "block" }}>Agreed Return</span>
              <b style={{ fontSize: "14px", color: "#1e293b" }}>{money(payment.agreedTotalPayable || payment.total || maxAllowed)}</b>
            </div>
            <div>
              <span style={{ fontSize: "11.5px", color: "#64748b", display: "block" }}>Max Remaining Balance</span>
              <b style={{ fontSize: "14px", color: isExceeded ? "#dc2626" : "#059669" }}>{money(maxAllowed)}</b>
            </div>
          </div>
        )}

        {/* Date Input */}
        <label style={{ display: "block", marginBottom: "14px", fontWeight: "600", fontSize: "13px", color: "#334155" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "6px" }}>
            <Calendar size={14} color="#64748b" />
            <span>Collection Date</span>
          </div>
          <input
            type="date"
            required
            value={payment.collectionDate || ""}
            onChange={set("collectionDate")}
            style={{
              width: "100%",
              height: "40px",
              borderRadius: "8px",
              border: "1px solid #cbd5e1",
              padding: "0 12px",
              fontSize: "14px",
              color: "#0f172a",
              boxSizing: "border-box",
            }}
          />
        </label>

        {/* Amount Input */}
        <label style={{ display: "block", marginBottom: "14px", fontWeight: "600", fontSize: "13px", color: "#334155" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "6px" }}>
            <Banknote size={14} color="#64748b" />
            <span>{isNonCashSettlement ? "Loan Balance Settled (₹)" : "Amount Collected (₹)"}</span>
          </div>
          <div style={{ position: "relative" }}>
            <span
              style={{
                position: "absolute",
                left: "12px",
                top: "50%",
                transform: "translateY(-50%)",
                fontWeight: "700",
                fontSize: "16px",
                color: isExceeded ? "#dc2626" : "#64748b",
              }}
            >
              ₹
            </span>
            <input
              type="number"
              min="0"
              step="0.01"
              required
              autoFocus
              value={payment.amount ?? ""}
              onChange={set("amount")}
              placeholder="0.00"
              style={{
                width: "100%",
                height: "42px",
                borderRadius: "8px",
                border: isExceeded ? "2px solid #ef4444" : "1px solid #cbd5e1",
                backgroundColor: isExceeded ? "#fef2f2" : "#ffffff",
                paddingLeft: "30px",
                paddingRight: "12px",
                fontSize: "16px",
                fontWeight: "700",
                color: isExceeded ? "#991b1b" : "#0f172a",
                boxSizing: "border-box",
              }}
            />
          </div>
        </label>

        {/* Exceeded Warning Alert */}
        {isExceeded && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              color: "#dc2626",
              fontSize: "12px",
              fontWeight: "700",
              marginBottom: "14px",
              background: "#fef2f2",
              padding: "8px 12px",
              borderRadius: "8px",
              border: "1px solid #fecaca",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              <AlertCircle size={15} />
              <span>Amount exceeds max balance ({money(maxAllowed)})!</span>
            </div>
            <button
              type="button"
              onClick={() => setPayment({ ...payment, amount: maxAllowed })}
              style={{
                fontSize: "11px",
                padding: "3px 8px",
                borderRadius: "5px",
                background: "#fee2e2",
                border: "1px solid #fca5a5",
                color: "#b91c1c",
                cursor: "pointer",
                fontWeight: "700",
              }}
            >
              Set exact balance
            </button>
          </div>
        )}

        {/* Payment Method Selector */}
        <label style={{ display: "block", marginBottom: "14px", fontWeight: "600", fontSize: "13px", color: "#334155" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "6px" }}>
            <CreditCard size={14} color="#64748b" />
            <span>Payment Method</span>
          </div>
          <select
            value={currentMethod}
            onChange={set("paymentMethod")}
            style={{
              width: "100%",
              height: "40px",
              borderRadius: "8px",
              border: "1px solid #cbd5e1",
              padding: "0 12px",
              fontSize: "13.5px",
              fontWeight: "600",
              color: "#0f172a",
              background: "#ffffff",
              boxSizing: "border-box",
              cursor: "pointer",
            }}
          >
            <option value="CASH">💵 Cash (Default)</option>
            <option value="UPI">📱 UPI / GPay / PhonePe</option>
            <option value="BANK_TRANSFER">🏦 Bank Transfer / NEFT</option>
            <option value="TRANSFER">🔄 Internal Refinance / Non-cash Settlement</option>
          </select>
        </label>

        {/* Notes */}
        <label style={{ display: "block", marginBottom: "18px", fontWeight: "600", fontSize: "13px", color: "#334155" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "6px" }}>
            <FileText size={14} color="#64748b" />
            <span>Notes / Remarks</span>
          </div>
          <textarea
            value={payment.notes || ""}
            onChange={set("notes")}
            placeholder="Optional collection note or transaction ID..."
            rows={2}
            style={{
              width: "100%",
              borderRadius: "8px",
              border: "1px solid #cbd5e1",
              padding: "8px 12px",
              fontSize: "13px",
              color: "#0f172a",
              boxSizing: "border-box",
              resize: "vertical",
            }}
          />
        </label>

        {/* Footer Actions */}
        <div style={{ display: "flex", gap: "10px", marginTop: "14px" }}>
          <button
            type="button"
            className="secondary"
            onClick={close}
            style={{
              flex: 1,
              height: "42px",
              borderRadius: "8px",
              border: "1px solid #cbd5e1",
              background: "#f8fafc",
              color: "#475569",
              fontWeight: "700",
              fontSize: "13.5px",
              cursor: "pointer",
            }}
          >
            Cancel
          </button>
          <button
            type="submit"
            className="primary"
            disabled={busy || payment.amount === "" || payment.amount === undefined || isExceeded}
            style={{
              flex: 2,
              height: "42px",
              borderRadius: "8px",
              border: "none",
              background: isExceeded ? "#94a3b8" : "#059669",
              color: "#ffffff",
              fontWeight: "700",
              fontSize: "13.5px",
              cursor: isExceeded ? "not-allowed" : "pointer",
              boxShadow: isExceeded ? "none" : "0 4px 12px rgba(5, 150, 105, 0.3)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "6px",
            }}
          >
            {busy ? "Updating..." : "Update Collection"}
          </button>
        </div>
      </form>
    </div>
  );
}
