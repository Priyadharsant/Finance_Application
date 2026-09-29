import React from "react";
import { X, ArrowDownCircle, MinusCircle } from "lucide-react";

export default function CapitalTransactionModal({
  show,
  close,
  capitalActionType,
  setCapitalActionType,
  capitalFormData,
  setCapitalFormData,
  partners,
  onSubmit,
  submitting = false,
}) {
  if (!show) return null;

  return (
    <div className="modalOverlay" onClick={close}>
      <div
        className="modalContent"
        style={{ width: "min(560px, 94vw)" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modalHeader">
          <div>
            <span className="overline autoBadgeTag">
              {capitalActionType === "WITHDRAWAL"
                ? "CAPITAL OUTFLOW"
                : "CAPITAL INFLOW"}
            </span>
            <h3>
              {capitalActionType === "WITHDRAWAL"
                ? "Withdraw Partner Capital"
                : "Add Capital Contribution"}
            </h3>
          </div>
          <button
            type="button"
            className="iconBtn"
            onClick={close}
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={onSubmit}>
          <div className="modalBody">
            {/* Type Switcher Toggle */}
            <div className="txTypeToggle">
              <button
                type="button"
                className={`txTypeToggleBtn ${
                  capitalActionType === "CONTRIBUTION"
                    ? "active contribution"
                    : ""
                }`}
                onClick={() => setCapitalActionType("CONTRIBUTION")}
              >
                <ArrowDownCircle size={15} /> + Amount In
              </button>
              <button
                type="button"
                className={`txTypeToggleBtn ${
                  capitalActionType === "WITHDRAWAL" ? "active withdrawal" : ""
                }`}
                onClick={() => setCapitalActionType("WITHDRAWAL")}
              >
                <MinusCircle size={15} /> - Withdraw
              </button>
            </div>

            {/* Partner Select */}
            <div className="formGroup">
              <label>Select Partner *</label>
              <select
                required
                value={capitalFormData.partnerId}
                onChange={(e) =>
                  setCapitalFormData({
                    ...capitalFormData,
                    partnerId: e.target.value,
                  })
                }
              >
                <option value="">-- Choose Partner --</option>
                {partners.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} (Current: ₹{Number(p.current_capital || 0).toLocaleString("en-IN")})
                  </option>
                ))}
              </select>
            </div>

            {/* Partner Live Balance Banner */}
            {capitalFormData.partnerId && (
              <div
                style={{
                  background:
                    capitalActionType === "WITHDRAWAL" ? "#fff1f2" : "#f0fdf4",
                  border: "1px solid",
                  borderColor:
                    capitalActionType === "WITHDRAWAL" ? "#fecdd3" : "#bbf7d0",
                  borderRadius: "8px",
                  padding: "10px 14px",
                  marginBottom: "14px",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <span style={{ fontSize: "12px", color: "#475569" }}>
                  Partner Available Capital:
                </span>
                <strong
                  style={{
                    fontSize: "14px",
                    color:
                      capitalActionType === "WITHDRAWAL" ? "#be123c" : "#047857",
                  }}
                >
                  ₹
                  {Number(
                    partners.find((p) => p.id === capitalFormData.partnerId)
                      ?.current_capital || 0
                  ).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                </strong>
              </div>
            )}
            
            {/* Own Money vs Lend Money (Contribution Only) */}
            {capitalActionType === "CONTRIBUTION" && (
              <div
                style={{
                  background: "#f8fafc",
                  padding: "12px",
                  borderRadius: "8px",
                  border: "1px solid #e2e8f0",
                  marginBottom: "14px",
                }}
              >
                <label style={{ fontSize: "12.5px", fontWeight: "700", color: "#334155", marginBottom: "6px", display: "block" }}>
                  Source of Capital (Own vs Lend)
                </label>
                <div style={{ display: "flex", gap: "16px", marginBottom: "10px" }}>
                  <label style={{ display: "inline-flex", alignItems: "center", gap: "6px", cursor: "pointer", fontSize: "13px" }}>
                    <input
                      type="radio"
                      name="fundSourceType"
                      value="OWN"
                      checked={capitalFormData.fundSourceType !== "LEND"}
                      onChange={() =>
                        setCapitalFormData({
                          ...capitalFormData,
                          fundSourceType: "OWN",
                          lenderName: "",
                          interestRate: "",
                        })
                      }
                    />
                    <span>Own Money (Personal)</span>
                  </label>
                  <label style={{ display: "inline-flex", alignItems: "center", gap: "6px", cursor: "pointer", fontSize: "13px" }}>
                    <input
                      type="radio"
                      name="fundSourceType"
                      value="LEND"
                      checked={capitalFormData.fundSourceType === "LEND"}
                      onChange={() =>
                        setCapitalFormData({
                          ...capitalFormData,
                          fundSourceType: "LEND",
                        })
                      }
                    />
                    <span style={{ color: "#7c3aed", fontWeight: "600" }}>Lend / Borrowed Money</span>
                  </label>
                </div>

                {capitalFormData.fundSourceType === "LEND" && (
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", marginTop: "10px" }}>
                    <div>
                      <label style={{ fontSize: "11.5px", color: "#64748b", fontWeight: "600" }}>
                        From Whom Borrowed (Lender Name) *
                      </label>
                      <input
                        required
                        type="text"
                        placeholder="e.g. Ramesh Uncle / ABC Finance"
                        value={capitalFormData.lenderName || ""}
                        onChange={(e) =>
                          setCapitalFormData({
                            ...capitalFormData,
                            lenderName: e.target.value,
                          })
                        }
                        style={{ width: "100%", padding: "7px 10px", fontSize: "13px", borderRadius: "6px", border: "1px solid #cbd5e1" }}
                      />
                    </div>
                    <div>
                      <label style={{ fontSize: "11.5px", color: "#64748b", fontWeight: "600" }}>
                        Interest Rate Payable (%) *
                      </label>
                      <input
                        required
                        type="number"
                        step="any"
                        placeholder="e.g. 1.5 or 2.0"
                        value={capitalFormData.interestRate || ""}
                        onChange={(e) =>
                          setCapitalFormData({
                            ...capitalFormData,
                            interestRate: e.target.value,
                          })
                        }
                        style={{ width: "100%", padding: "7px 10px", fontSize: "13px", borderRadius: "6px", border: "1px solid #cbd5e1" }}
                      />
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Amount */}
            <div className="formGroup">
              <label>
                {capitalActionType === "WITHDRAWAL"
                  ? "Withdrawal Amount *"
                  : "Contribution Amount *"}
              </label>
              <div style={{ position: "relative" }}>
                <span
                  style={{
                    position: "absolute",
                    left: "14px",
                    top: "50%",
                    transform: "translateY(-50%)",
                    fontWeight: "700",
                    color:
                      capitalActionType === "WITHDRAWAL"
                        ? "#e11d48"
                        : "#059669",
                    fontSize: "16px",
                  }}
                >
                  ₹
                </span>
                <input
                  required
                  type="number"
                  step="any"
                  min="1"
                  placeholder="e.g. 500000"
                  style={{
                    paddingLeft: "32px",
                    fontSize: "16px",
                    fontWeight: "700",
                  }}
                  value={capitalFormData.amount}
                  onChange={(e) =>
                    setCapitalFormData({
                      ...capitalFormData,
                      amount: e.target.value,
                    })
                  }
                />
              </div>
              {capitalActionType === "WITHDRAWAL" && capitalFormData.partnerId && (
                <small
                  style={{
                    color: "#64748b",
                    marginTop: "4px",
                    display: "block",
                  }}
                >
                  Maximum withdrawable amount: ₹
                  {Number(
                    partners.find((p) => p.id === capitalFormData.partnerId)
                      ?.current_capital || 0
                  ).toLocaleString("en-IN")}
                </small>
              )}
            </div>

            {/* Effective Date */}
            <div className="formGroup">
              <label>Effective Date *</label>
              <input
                required
                type="date"
                value={capitalFormData.effectiveDate}
                onChange={(e) =>
                  setCapitalFormData({
                    ...capitalFormData,
                    effectiveDate: e.target.value,
                  })
                }
              />
            </div>

            {/* Notes / Reason */}
            <div className="formGroup">
              <label>Narration / Reason</label>
              <input
                type="text"
                placeholder={
                  capitalActionType === "WITHDRAWAL"
                    ? "e.g. Partner dividend payout or capital reduction"
                    : "e.g. Working capital injection or growth funding"
                }
                value={capitalFormData.notes}
                onChange={(e) =>
                  setCapitalFormData({
                    ...capitalFormData,
                    notes: e.target.value,
                  })
                }
              />
            </div>
          </div>

          <div className="modalActions">
            <button
              type="button"
              className="secondaryBtn"
              disabled={submitting}
              onClick={close}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="primaryBtn"
              disabled={submitting}
              style={{
                background:
                  capitalActionType === "WITHDRAWAL"
                    ? "linear-gradient(135deg, #e11d48, #be123c)"
                    : "linear-gradient(135deg, #059669, #047857)",
                display: "flex",
                alignItems: "center",
                gap: "8px",
                opacity: submitting ? 0.75 : 1,
                cursor: submitting ? "not-allowed" : "pointer",
              }}
            >
              {submitting ? (
                <>
                  <span className="autoBtnSpinner" />
                  {capitalActionType === "WITHDRAWAL"
                    ? "Processing Withdrawal..."
                    : "Processing Deposit..."}
                </>
              ) : (
                capitalActionType === "WITHDRAWAL"
                  ? "Confirm Withdrawal"
                  : "Confirm Deposit"
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
