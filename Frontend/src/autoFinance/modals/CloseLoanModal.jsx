import React from "react";
import { CheckCircle2, X } from "lucide-react";

export default function CloseLoanModal({
  closeLoanModal,
  setCloseLoanModal,
  submitCloseLoan,
}) {
  if (!closeLoanModal) return null;

  const p = Number(closeLoanModal.principalAmount || 0);
  const pct = Number(closeLoanModal.interestPercent || 0);
  const interestAmt = Math.round((p * pct) / 100);
  const totalAmt = p + interestAmt;

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
      >
        <div className="closeLoanHeader">
          <h3>
            <CheckCircle2 size={19} style={{ color: "#dc2626" }} />
            Close Loan Early
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

        <div className="closeLoanGrid">
          <div className="closeLoanField">
            <label className="closeLoanLabel">Principal (₹)</label>
            <div className="closeLoanInputWrap">
              <span className="closeLoanPrefix">₹</span>
              <input
                type="number"
                min="0"
                required
                className="closeLoanInput"
                value={closeLoanModal.principalAmount}
                onChange={(e) =>
                  setCloseLoanModal({
                    ...closeLoanModal,
                    principalAmount: Number(e.target.value),
                  })
                }
              />
            </div>
          </div>

          <div className="closeLoanField">
            <label className="closeLoanLabel">Interest (%)</label>
            <div className="closeLoanInputWrap">
              <input
                type="number"
                step="0.01"
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
        </div>

        <div className="closeLoanSummaryBox">
          <div>
            <div className="closeLoanSummaryLabel">Total Settlement</div>
            <div className="closeLoanSummarySub">
              ₹{p.toLocaleString()} + {pct}% (₹{interestAmt.toLocaleString()})
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
