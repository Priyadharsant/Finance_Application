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
                {partners.map((p) => {
                  const ownBal = Number(p.available_own_capital ?? p.own_capital ?? 0);
                  const lendBal = Number(p.available_lend_capital ?? p.lend_capital ?? p.borrowed_total ?? 0);
                  return (
                    <option key={p.id} value={p.id}>
                      {p.name} (Total: ₹{Number(p.current_capital || 0).toLocaleString("en-IN")} | Own: ₹{ownBal.toLocaleString("en-IN")} | Lend: ₹{lendBal.toLocaleString("en-IN")})
                    </option>
                  );
                })}
              </select>
            </div>

            {/* Partner Live Balance Summary */}
            {(() => {
              const selPartner = partners.find((p) => p.id === capitalFormData.partnerId);
              if (!selPartner) return null;

              const ownBal = Math.max(0, Number(selPartner.available_own_capital ?? selPartner.own_capital ?? 0));
              const lendBal = Math.max(0, Number(selPartner.available_lend_capital ?? selPartner.lend_capital ?? selPartner.borrowed_total ?? 0));
              const totalBal = Number(selPartner.current_capital || (ownBal + lendBal));
              const isWithdrawal = capitalActionType === "WITHDRAWAL";
              const isLend = capitalFormData.fundSourceType === "LEND";
              const activeMax = isLend ? lendBal : ownBal;

              return (
                <div
                  style={{
                    background: isWithdrawal ? "#fff1f2" : "#f0fdf4",
                    border: "1px solid",
                    borderColor: isWithdrawal ? "#fecdd3" : "#bbf7d0",
                    borderRadius: "10px",
                    padding: "12px 14px",
                    marginBottom: "14px",
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                    <span style={{ fontSize: "12px", fontWeight: "700", color: "#475569", textTransform: "uppercase" }}>
                      Partner Balance Breakdown
                    </span>
                    <strong style={{ fontSize: "14px", color: isWithdrawal ? "#be123c" : "#047857" }}>
                      Total Available: ₹{totalBal.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                    </strong>
                  </div>

                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
                    <div
                      style={{
                        background: isWithdrawal && !isLend ? "rgba(190, 18, 60, 0.08)" : "rgba(255, 255, 255, 0.8)",
                        border: isWithdrawal && !isLend ? "2px solid #be123c" : "1px solid #e2e8f0",
                        padding: "8px 10px",
                        borderRadius: "6px",
                      }}
                    >
                      <div style={{ fontSize: "11px", color: "#64748b", fontWeight: "600" }}>
                        Personal (Own Money)
                      </div>
                      <div style={{ fontSize: "14px", fontWeight: "700", color: ownBal > 0 ? "#0f766e" : "#94a3b8" }}>
                        ₹{ownBal.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                      </div>
                    </div>

                    <div
                      style={{
                        background: isWithdrawal && isLend ? "rgba(124, 58, 237, 0.08)" : "rgba(255, 255, 255, 0.8)",
                        border: isWithdrawal && isLend ? "2px solid #7c3aed" : "1px solid #e2e8f0",
                        padding: "8px 10px",
                        borderRadius: "6px",
                      }}
                    >
                      <div style={{ fontSize: "11px", color: "#64748b", fontWeight: "600" }}>
                        Lend / Borrowed Money
                      </div>
                      <div style={{ fontSize: "14px", fontWeight: "700", color: lendBal > 0 ? "#7c3aed" : "#94a3b8" }}>
                        ₹{lendBal.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                      </div>
                    </div>
                  </div>

                  {isWithdrawal && activeMax <= 0 && (
                    <div
                      style={{
                        marginTop: "10px",
                        padding: "8px 10px",
                        background: "#fee2e2",
                        border: "1px solid #ef4444",
                        borderRadius: "6px",
                        color: "#991b1b",
                        fontSize: "12px",
                        fontWeight: "600",
                      }}
                    >
                      ⚠️ Cannot withdraw {isLend ? "Lend / Borrowed Money" : "Own Money"}: Available balance is ₹0.00.
                    </div>
                  )}
                </div>
              );
            })()}

            {/* Own Money vs Lend Money */}
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
                Source of Capital (Own vs Lend) *
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
                  <span style={{ fontWeight: capitalFormData.fundSourceType !== "LEND" ? "700" : "400" }}>
                    Own Money (Personal)
                  </span>
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
                  <span style={{ color: "#7c3aed", fontWeight: capitalFormData.fundSourceType === "LEND" ? "700" : "500" }}>
                    Lend / Borrowed Money
                  </span>
                </label>
              </div>

              {capitalFormData.fundSourceType === "LEND" && capitalActionType === "CONTRIBUTION" && (
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

              {capitalFormData.fundSourceType === "LEND" && capitalActionType === "WITHDRAWAL" && (() => {
                const selPartner = partners.find((p) => p.id === capitalFormData.partnerId);
                const lenderList = selPartner?.lender_breakdown || [];
                return (
                  <div style={{ marginTop: "10px" }}>
                    <label style={{ fontSize: "11.5px", color: "#64748b", fontWeight: "600" }}>
                      Select Lender to Repay / Withdraw From
                    </label>
                    {lenderList.length > 0 ? (
                      <select
                        value={capitalFormData.lenderName || ""}
                        onChange={(e) =>
                          setCapitalFormData({
                            ...capitalFormData,
                            lenderName: e.target.value,
                          })
                        }
                        style={{ width: "100%", padding: "7px 10px", fontSize: "13px", borderRadius: "6px", border: "1px solid #cbd5e1" }}
                      >
                        <option value="">-- All / Any Borrowed Funds --</option>
                        {lenderList.map((lb) => (
                          <option key={lb.lenderName} value={lb.lenderName}>
                            {lb.lenderName} (Available to withdraw: ₹{Number(lb.available || 0).toLocaleString("en-IN")})
                          </option>
                        ))}
                      </select>
                    ) : (
                      <input
                        type="text"
                        placeholder="Lender Name (optional)"
                        value={capitalFormData.lenderName || ""}
                        onChange={(e) =>
                          setCapitalFormData({
                            ...capitalFormData,
                            lenderName: e.target.value,
                          })
                        }
                        style={{ width: "100%", padding: "7px 10px", fontSize: "13px", borderRadius: "6px", border: "1px solid #cbd5e1" }}
                      />
                    )}
                  </div>
                );
              })()}
            </div>

            {/* Amount */}
            {(() => {
              const selPartner = partners.find((p) => p.id === capitalFormData.partnerId);
              const isWithdrawal = capitalActionType === "WITHDRAWAL";
              const isLend = capitalFormData.fundSourceType === "LEND";
              const ownBal = Math.max(0, Number(selPartner?.available_own_capital ?? selPartner?.own_capital ?? 0));
              const lendBal = Math.max(0, Number(selPartner?.available_lend_capital ?? selPartner?.lend_capital ?? selPartner?.borrowed_total ?? 0));
              const maxAllowed = isLend ? lendBal : ownBal;
              const enteredAmt = Number(capitalFormData.amount || 0);
              const isOverLimit = isWithdrawal && selPartner && (enteredAmt > maxAllowed || maxAllowed <= 0);

              return (
                <div className="formGroup">
                  <label>
                    {isWithdrawal ? "Withdrawal Amount *" : "Contribution Amount *"}
                  </label>
                  <div style={{ position: "relative" }}>
                    <span
                      style={{
                        position: "absolute",
                        left: "14px",
                        top: "50%",
                        transform: "translateY(-50%)",
                        fontWeight: "700",
                        color: isWithdrawal ? "#e11d48" : "#059669",
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
                      max={isWithdrawal && maxAllowed > 0 ? maxAllowed : undefined}
                      placeholder={isWithdrawal ? `Max ₹${maxAllowed.toLocaleString("en-IN")}` : "e.g. 500000"}
                      style={{
                        paddingLeft: "32px",
                        fontSize: "16px",
                        fontWeight: "700",
                        borderColor: isOverLimit ? "#ef4444" : undefined,
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
                  {isWithdrawal && selPartner && (
                    <div style={{ marginTop: "5px" }}>
                      <small
                        style={{
                          color: isOverLimit ? "#dc2626" : "#64748b",
                          fontWeight: isOverLimit ? "700" : "500",
                          display: "block",
                        }}
                      >
                        Maximum withdrawable {isLend ? "Borrowed" : "Personal Own"} capital: ₹
                        {maxAllowed.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                      </small>
                      {isOverLimit && enteredAmt > maxAllowed && (
                        <div style={{ color: "#b91c1c", fontSize: "11.5px", fontWeight: "700", marginTop: "2px" }}>
                          ❌ Amount exceeds partner's available {isLend ? "Lend / Borrowed" : "Own Money"} balance!
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })()}

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
            {(() => {
              const selPartner = partners.find((p) => p.id === capitalFormData.partnerId);
              const isWithdrawal = capitalActionType === "WITHDRAWAL";
              const isLend = capitalFormData.fundSourceType === "LEND";
              const ownBal = Math.max(0, Number(selPartner?.available_own_capital ?? selPartner?.own_capital ?? 0));
              const lendBal = Math.max(0, Number(selPartner?.available_lend_capital ?? selPartner?.lend_capital ?? selPartner?.borrowed_total ?? 0));
              const maxAllowed = isLend ? lendBal : ownBal;
              const enteredAmt = Number(capitalFormData.amount || 0);
              const isOverLimit = isWithdrawal && selPartner && (enteredAmt > maxAllowed || maxAllowed <= 0);
              const isDisabled = submitting || isOverLimit;

              return (
                <button
                  type="submit"
                  className="primaryBtn"
                  disabled={isDisabled}
                  style={{
                    background:
                      capitalActionType === "WITHDRAWAL"
                        ? "linear-gradient(135deg, #e11d48, #be123c)"
                        : "linear-gradient(135deg, #059669, #047857)",
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                    opacity: isDisabled ? 0.6 : 1,
                    cursor: isDisabled ? "not-allowed" : "pointer",
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
              );
            })()}
          </div>
        </form>
      </div>
    </div>
  );
}
