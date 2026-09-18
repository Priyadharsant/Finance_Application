import React, { useState, useEffect } from "react";
import {
  X,
  Plus,
  MinusCircle,
  UserRound,
  Phone,
  Mail,
  Banknote,
  Activity,
} from "lucide-react";
import { API } from "../services/globalCapitalApi.js";
import { money, formatTxNotes } from "../utils/formatters.js";

export default function PartnerDetailsModal({ partner, close, onAddMoney, onWithdraw }) {
  const [fullData, setFullData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [txFilter, setTxFilter] = useState("ALL");

  useEffect(() => {
    let isMounted = true;
    const fetchDetails = async () => {
      try {
        setLoading(true);
        const res = await fetch(`${API}/partners/${partner.id}`);
        if (res.ok) {
          const data = await res.json();
          if (isMounted) setFullData(data);
        }
      } catch (err) {
        console.error("Failed to load partner dossier", err);
      } finally {
        if (isMounted) setLoading(false);
      }
    };
    fetchDetails();
    return () => {
      isMounted = false;
    };
  }, [partner.id]);

  const p = fullData?.partner || partner;
  const stats = fullData?.stats || {
    baseCapital: p.base_capital != null ? p.base_capital : (p.total_contributed || 0),
    totalProfitEarned: p.profit_earned || 0,
    totalContributed: p.total_contributed || 0,
    totalWithdrawn: p.total_withdrawn || 0,
    currentCapital: p.current_capital || 0,
  };
  const transactions = fullData?.transactions || [];

  const filteredTransactions = transactions.filter((t) => {
    if (txFilter === "CONTRIBUTION") {
      return (
        t.transaction_type === "CONTRIBUTION" ||
        t.transaction_type === "ADJUSTMENT_INCREASE" ||
        t.transaction_type === "PROFIT_SHARE"
      );
    }
    if (txFilter === "WITHDRAWAL") {
      return (
        t.transaction_type === "WITHDRAWAL" ||
        t.transaction_type === "ADJUSTMENT_DECREASE"
      );
    }
    return true;
  });

  return (
    <div
      className="modalOverlay"
      onClick={(e) => {
        if (e.target === e.currentTarget) close();
      }}
    >
      <div
        className="modalContent txModalContent"
        style={{ width: "min(760px, 94vw)" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modalHeader">
          <div>
            <span className="overline autoBadgeTag">PARTNER DOSSIER</span>
            <h3>{p.name}</h3>
          </div>
          <button className="iconBtn" onClick={close} aria-label="Close">
            <X size={18} />
          </button>
        </div>

        <div className="modalBody">
          {/* Top Hero Financial Balance Card */}
          <div
            className="txHeroCard credit"
            style={{
              background: "linear-gradient(135deg, #0f766e 0%, #042f2e 100%)",
              color: "#ffffff",
              border: "none",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <span
                style={{
                  fontSize: "11px",
                  fontWeight: "800",
                  letterSpacing: ".5px",
                  textTransform: "uppercase",
                  opacity: 0.9,
                }}
              >
                Current Available Capital
              </span>
              <span
                className="statusPill active"
                style={{
                  background: "#ffffff",
                  color: "#0f766e",
                  fontWeight: "700",
                }}
              >
                {p.status || "ACTIVE"}
              </span>
            </div>

            <div
              className="txHeroAmount"
              style={{ color: "#ffffff", margin: "12px 0 16px" }}
            >
              {money(stats.currentCapital)}
            </div>

            <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
              <button
                type="button"
                className="primaryBtn"
                style={{
                  background: "#10b981",
                  borderColor: "#10b981",
                  fontSize: "12px",
                  padding: "7px 15px",
                }}
                onClick={() => onAddMoney(p.id)}
              >
                <Plus size={14} /> Add Money (Deposit)
              </button>
              <button
                type="button"
                className="secondaryBtn"
                style={{
                  background: "rgba(255,255,255,0.15)",
                  color: "#ffffff",
                  borderColor: "rgba(255,255,255,0.3)",
                  fontSize: "12px",
                  padding: "7px 15px",
                }}
                onClick={() => onWithdraw(p.id)}
              >
                <MinusCircle size={14} /> Withdraw Money
              </button>
            </div>
          </div>

          {/* Partner Profile Information */}
          <div className="txSection" style={{ marginTop: 0 }}>
            <div className="txSectionTitle">
              <UserRound size={14} /> Partner Profile &amp; Contact
            </div>
            <div className="txGrid">
              <div className="txGridItem">
                <span>Partner Name</span>
                <strong style={{ fontSize: "14px", color: "#0f172a" }}>
                  {p.name}
                </strong>
              </div>
              <div className="txGridItem">
                <span>Phone Number</span>
                <strong>
                  {p.phone ? (
                    <a href={`tel:${p.phone}`} className="phoneLink">
                      <Phone size={13} /> {p.phone}
                    </a>
                  ) : (
                    <span style={{ color: "#94a3b8" }}>Not provided</span>
                  )}
                </strong>
              </div>
              <div className="txGridItem">
                <span>Email Address</span>
                <strong>
                  {p.email ? (
                    <a href={`mailto:${p.email}`} className="phoneLink">
                      <Mail size={13} /> {p.email}
                    </a>
                  ) : (
                    <span style={{ color: "#94a3b8" }}>Not provided</span>
                  )}
                </strong>
              </div>
              <div className="txGridItem">
                <span>PAN / Tax ID</span>
                <strong
                  style={{ fontFamily: "monospace", letterSpacing: ".5px" }}
                >
                  {p.pan_number || (
                    <span
                      style={{ color: "#94a3b8", fontFamily: "sans-serif" }}
                    >
                      Not provided
                    </span>
                  )}
                </strong>
              </div>
              <div className="txGridItem">
                <span>Joined Date</span>
                <strong>
                  {p.created_at
                    ? new Date(p.created_at).toLocaleDateString("en-IN")
                    : "—"}
                </strong>
              </div>
              <div className="txGridItem">
                <span>Address / City</span>
                <strong>
                  {p.address || (
                    <span style={{ color: "#94a3b8" }}>Not provided</span>
                  )}
                </strong>
              </div>
            </div>
            {p.notes && (
              <div className="txNotesBox">
                <strong>Notes / Agreement Terms:</strong> {p.notes}
              </div>
            )}
          </div>

          {/* Financial Breakdown Metric Cards */}
          <div className="txSection">
            <div className="txSectionTitle">
              <Banknote size={14} /> Capital Movement Overview
            </div>
            <div className="txGrid" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))" }}>
              <div className="txGridItem">
                <span>Current Available Capital</span>
                <strong style={{ color: "#0f766e", fontSize: "15px", fontWeight: "800" }}>
                  {money(stats.currentCapital)}
                </strong>
              </div>
              <div className="txGridItem">
                <span>Profit Earned</span>
                <strong style={{ color: "#7c3aed", fontSize: "14.5px" }}>
                  +{money(stats.totalProfitEarned != null ? stats.totalProfitEarned : p.profit_earned || 0)}
                </strong>
              </div>
              <div className="txGridItem">
                <span>Total Withdrawn (Out)</span>
                <strong style={{ color: "#e11d48", fontSize: "14.5px" }}>
                  -{money(stats.totalWithdrawn)}
                </strong>
              </div>
            </div>
          </div>

          {/* Partner Transaction Ledger Table */}
          <div className="partnerTxHistoryBox">
            <div className="partnerTxHistoryHeader">
              <div className="partnerTxHistoryTitle">
                <Activity size={16} color="#0f766e" />
                <span>Capital Transaction History</span>
                <span
                  style={{
                    fontSize: "11px",
                    color: "#64748b",
                    background: "#e2e8f0",
                    padding: "2px 7px",
                    borderRadius: "10px",
                    fontWeight: "600",
                  }}
                >
                  {filteredTransactions.length}
                </span>
              </div>
              <div className="partnerTxFilterPills">
                <button
                  type="button"
                  className={`partnerTxFilterBtn ${txFilter === "ALL" ? "active" : ""}`}
                  onClick={() => setTxFilter("ALL")}
                >
                  All ({transactions.length})
                </button>
                <button
                  type="button"
                  className={`partnerTxFilterBtn ${txFilter === "CONTRIBUTION" ? "active" : ""}`}
                  onClick={() => setTxFilter("CONTRIBUTION")}
                >
                  + Deposits
                </button>
                <button
                  type="button"
                  className={`partnerTxFilterBtn ${txFilter === "WITHDRAWAL" ? "active" : ""}`}
                  onClick={() => setTxFilter("WITHDRAWAL")}
                >
                  - Withdrawals
                </button>
              </div>
            </div>

            <div className="partnerTxTableWrapper">
              {filteredTransactions.length > 0 ? (
                <table className="partnerTxTable">
                  <thead>
                    <tr>
                      <th style={{ width: "130px" }}>Date</th>
                      <th style={{ width: "150px" }}>Type</th>
                      <th>Narration / Notes</th>
                      <th style={{ textAlign: "right", width: "140px" }}>Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredTransactions.map((t) => {
                      const isContrib =
                        t.transaction_type === "CONTRIBUTION" ||
                        t.transaction_type === "ADJUSTMENT_INCREASE" ||
                        t.transaction_type === "PROFIT_SHARE";
                      const dateObj = new Date(t.effective_date);
                      return (
                        <tr key={t.id}>
                          <td>
                            <div className="partnerTxDate">
                              <strong>
                                {dateObj.toLocaleDateString("en-IN", {
                                  day: "2-digit",
                                  month: "short",
                                  year: "numeric",
                                })}
                              </strong>
                              <small>
                                {dateObj.toLocaleTimeString("en-IN", {
                                  hour: "2-digit",
                                  minute: "2-digit",
                                })}
                              </small>
                            </div>
                          </td>
                          <td>
                            <span
                              className={`partnerTxPill ${isContrib ? "credit" : "debit"}`}
                            >
                              {t.transaction_type === "PROFIT_SHARE"
                                ? "+ AUTO PROFIT SHARE"
                                : isContrib
                                  ? "+ CONTRIBUTION"
                                  : "- WITHDRAWAL"}
                            </span>
                          </td>
                          <td>
                            <div className="partnerTxNotes">
                              {formatTxNotes(t.notes)}
                            </div>
                          </td>
                          <td>
                            <div
                              className={`partnerTxAmount ${isContrib ? "credit" : "debit"}`}
                            >
                              {isContrib ? "+" : "-"}
                              {money(t.amount)}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              ) : (
                <div className="partnerTxEmptyState">
                  <Activity size={28} color="#cbd5e1" />
                  <div style={{ fontWeight: "600", fontSize: "13px" }}>
                    No transactions found
                  </div>
                  <p>
                    {txFilter === "ALL"
                      ? "No capital transactions recorded for this partner yet."
                      : `No ${txFilter.toLowerCase()} transactions recorded for this partner.`}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

        <div
          className="modalActions"
          style={{
            marginTop: "18px",
            paddingTop: "14px",
            borderTop: "1px solid #e2e8f0",
            display: "flex",
            justifyContent: "flex-end",
          }}
        >
          <button type="button" className="secondaryBtn" onClick={close}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
