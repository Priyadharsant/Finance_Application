import React from "react";
import { CheckCircle2, X, AlertCircle } from "lucide-react";

export default function CloseLoanModal({
  closeLoanModal,
  setCloseLoanModal,
  submitCloseLoan,
}) {
  if (!closeLoanModal) return null;

  const remP = Number(closeLoanModal.remainingPrincipal ?? closeLoanModal.principalAmount ?? 0);
  const p = Number(closeLoanModal.principalAmount ?? remP);
  const pct = Number(closeLoanModal.interestPercent || 0);
  const interestAmt = Math.round((p * pct) / 100);
  const discountAmt = Number(closeLoanModal.discountAmount || 0);
  const totalAmt = p + interestAmt;

  const handlePrincipalChange = (val) => {
    const num = val === "" ? "" : Number(val);
    const parsed = Number(val || 0);
    const autoDisc = remP > parsed ? Number((remP - parsed).toFixed(2)) : 0;
    setCloseLoanModal({
      ...closeLoanModal,
      principalAmount: num,
      discountAmount: autoDisc,
    });
  };

  const handleDiscountChange = (val) => {
    const num = val === "" ? "" : Number(val);
    const parsed = Number(val || 0);
    const autoP = remP > parsed ? Number((remP - parsed).toFixed(2)) : 0;
    setCloseLoanModal({
      ...closeLoanModal,
      discountAmount: num,
      principalAmount: autoP,
    });
  };

  return (
    <div
      className="closeLoanOverlay"
      onClick={(event) => {
        if (event.target === event.currentTarget) {
          setCloseLoanModal(null);
        }
      }}
    >
      <form
        className="closeLoanCard"
        onClick={(e) => e.stopPropagation()}
        onSubmit={submitCloseLoan}
        style={{ width: "min(460px, 94vw)" }}
      >
        <div className="closeLoanHeader">
          <h3>
            <CheckCircle2 size={19} style={{ color: "#dc2626" }} />
            Close Auto Loan Early
          </h3>
          <button
            type="button"
            className="closeLoanCloseBtn"
            onClick={() => setCloseLoanModal(null)}
            title="Cancel"
          >
            <X size={15} />
          </button>
        </div>

        {(closeLoanModal.customerName || closeLoanModal.regNumber) && (
          <div style={{ marginBottom: "14px", padding: "10px 12px", background: "#f8fafc", borderRadius: "10px", border: "1px solid #e2e8f0" }}>
            <div style={{ fontSize: "14px", fontWeight: "700", color: "#0f172a" }}>
              {closeLoanModal.customerName || "Customer Loan"}
            </div>
            <div style={{ fontSize: "12px", color: "#64748b", marginTop: "2px" }}>
              {closeLoanModal.regNumber ? `Vehicle: ${closeLoanModal.regNumber} · ` : ""}
              Remaining Principal: <strong>₹{remP.toLocaleString()}</strong>
            </div>
          </div>
        )}

        <div className="closeLoanGrid">
          <div className="closeLoanField">
            <label className="closeLoanLabel">Outstanding Principal</label>
            <div style={{ fontSize: "16px", fontWeight: "800", color: "#dc2626", padding: "8px 0" }}>
              ₹{remP.toLocaleString()}
            </div>
          </div>

          <div className="closeLoanField">
            <label className="closeLoanLabel">Settlement Principal (₹)</label>
            <div className="closeLoanInputWrap">
              <span className="closeLoanPrefix">₹</span>
              <input
                type="number"
                min="0"
                step="any"
                required
                className="closeLoanInput"
                value={closeLoanModal.principalAmount === "" ? "" : closeLoanModal.principalAmount}
                onChange={(e) => handlePrincipalChange(e.target.value)}
              />
            </div>
          </div>
        </div>

        <div className="closeLoanGrid" style={{ marginTop: "4px" }}>
          <div className="closeLoanField">
            <label className="closeLoanLabel">Closing Interest (%)</label>
            <div className="closeLoanInputWrap">
              <input
                type="number"
                step="any"
                min="0"
                placeholder="0"
                className="closeLoanInputPercent"
                value={closeLoanModal.interestPercent === "" ? "" : closeLoanModal.interestPercent}
                onChange={(e) =>
                  setCloseLoanModal({
                    ...closeLoanModal,
                    interestPercent: e.target.value === "" ? "" : Number(e.target.value),
                  })
                }
              />
              <span className="closeLoanSuffix">%</span>
            </div>
          </div>

          <div className="closeLoanField">
            <label className="closeLoanLabel">Discount / Waiver (₹)</label>
            <div className="closeLoanInputWrap">
              <span className="closeLoanPrefix">₹</span>
              <input
                type="number"
                min="0"
                step="any"
                placeholder="0"
                className="closeLoanInput"
                value={closeLoanModal.discountAmount === "" ? "" : closeLoanModal.discountAmount}
                onChange={(e) => handleDiscountChange(e.target.value)}
              />
            </div>
          </div>
        </div>

        {discountAmt > 0 && (
          <div style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "11.5px", color: "#d97706", background: "#fffbeb", padding: "8px 10px", borderRadius: "8px", border: "1px solid #fde68a", margin: "10px 0" }}>
            <AlertCircle size={14} />
            <span>
              Waiver/Discount of <b>₹{discountAmt.toLocaleString()}</b> applied &amp; recorded in <b>Auto Finance Expenses</b>.
            </span>
          </div>
        )}

        <div className="closeLoanSummaryBox" style={{ marginTop: "10px" }}>
          <div>
            <div className="closeLoanSummaryLabel">Settlement Cash Collection</div>
            <div className="closeLoanSummarySub">
              Principal: ₹{p.toLocaleString()} {pct > 0 ? `+ ${pct}% (₹${interestAmt.toLocaleString()})` : ""}
              {discountAmt > 0 ? ` · Discount: ₹${discountAmt.toLocaleString()} (Expense)` : ""}
            </div>
          </div>
          <div className="closeLoanSummaryValue">
            ₹{totalAmt.toLocaleString()}
          </div>
        </div>

        <div className="closeLoanField" style={{ marginBottom: "10px" }}>
          <label className="closeLoanLabel">Payment Method</label>
          <div className="closeLoanSegmented">
            <button
              type="button"
              className={`closeLoanSegmentBtn ${closeLoanModal.paymentMethod === "CASH" ? "active" : ""}`}
              onClick={() =>
                setCloseLoanModal({ ...closeLoanModal, paymentMethod: "CASH" })
              }
            >
              Cash
            </button>
            <button
              type="button"
              className={`closeLoanSegmentBtn ${closeLoanModal.paymentMethod === "UPI" ? "active" : ""}`}
              onClick={() =>
                setCloseLoanModal({ ...closeLoanModal, paymentMethod: "UPI" })
              }
            >
              UPI
            </button>
            <button
              type="button"
              className={`closeLoanSegmentBtn ${closeLoanModal.paymentMethod === "BANK_TRANSFER" ? "active" : ""}`}
              onClick={() =>
                setCloseLoanModal({ ...closeLoanModal, paymentMethod: "BANK_TRANSFER" })
              }
            >
              Bank
            </button>
          </div>
        </div>

        <div className="closeLoanField">
          <label className="closeLoanLabel">Reference / UTR (Optional)</label>
          <input
            type="text"
            className="closeLoanTextInput"
            placeholder="UTR / Cheque / Txn ID"
            value={closeLoanModal.referenceNumber || ""}
            onChange={(e) =>
              setCloseLoanModal({
                ...closeLoanModal,
                referenceNumber: e.target.value,
              })
            }
          />
        </div>

        <div className="closeLoanActions">
          <button
            type="button"
            className="closeLoanCancelBtn"
            onClick={() => setCloseLoanModal(null)}
          >
            Cancel
          </button>
          <button type="submit" className="closeLoanSubmitBtn">
            Confirm &amp; Close
          </button>
        </div>
      </form>
    </div>
  );
}
