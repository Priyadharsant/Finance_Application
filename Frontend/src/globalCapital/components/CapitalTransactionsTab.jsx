import React from "react";
import {
  Plus,
  MinusCircle,
  ArrowDownCircle,
  ArrowRightCircle,
} from "lucide-react";
import { money, formatTxNotes } from "../utils/formatters.js";

export default function CapitalTransactionsTab({
  transactions,
  txFilterType,
  setTxFilterType,
  onOpenCapitalAction,
  onSelectRecord,
}) {
  const totalDeposits = transactions
    .filter(
      (t) =>
        t.transaction_type === "CONTRIBUTION" ||
        t.transaction_type === "ADJUSTMENT_INCREASE"
    )
    .reduce((sum, t) => sum + Number(t.amount || 0), 0);

  const totalWithdrawals = transactions
    .filter(
      (t) =>
        t.transaction_type === "WITHDRAWAL" ||
        t.transaction_type === "ADJUSTMENT_DECREASE" ||
        t.transaction_type === "CAPITAL_EXIT"
    )
    .reduce((sum, t) => sum + Number(t.amount || 0), 0);

  const netMovement = totalDeposits - totalWithdrawals;

  return (
    <div className="financeFadeIn globalCapitalView">
      <div className="financeHeader">
        <div>
          <span className="overline autoBadgeTag">CAPITAL ACTIVITY</span>
          <h2>Capital Transactions</h2>
          <p className="globalSectionDescription">
            Complete record of partner capital deposits, injections, withdrawals, and exit settlements.
          </p>
        </div>
        <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
          <button
            className="secondaryBtn"
            style={{ color: "#dc2626", borderColor: "#fca5a5" }}
            onClick={() => onOpenCapitalAction(null, "WITHDRAWAL")}
          >
            <MinusCircle size={16} /> Record Withdrawal
          </button>
          <button
            className="primaryBtn"
            style={{ background: "#059669", borderColor: "#059669" }}
            onClick={() => onOpenCapitalAction(null, "CONTRIBUTION")}
          >
            <Plus size={16} /> Record Contribution
          </button>
        </div>
      </div>

      {/* Quick Filter Tabs */}
      <div style={{ display: "flex", gap: "8px", marginBottom: "16px" }}>
        {[
          { id: "ALL", label: "All Transactions" },
          { id: "CONTRIBUTION", label: "Deposits (In)" },
          { id: "WITHDRAWAL", label: "Withdrawals (Out)" },
        ].map((f) => (
          <button
            key={f.id}
            type="button"
            className={`secondaryBtn ${txFilterType === f.id ? "active" : ""}`}
            style={{
              background: txFilterType === f.id ? "#0f766e" : "#ffffff",
              color: txFilterType === f.id ? "#ffffff" : "#475569",
              borderColor: txFilterType === f.id ? "#0f766e" : "#cbd5e1",
              fontSize: "12px",
              fontWeight: "600",
            }}
            onClick={() => setTxFilterType(f.id)}
          >
            {f.label}
          </button>
        ))}
      </div>

      <div className="globalCapitalStats fourCol">
        <div>
          <span>Total recorded</span>
          <strong>{transactions.length}</strong>
          <small>Ledger records</small>
        </div>
        <div>
          <span>Capital In (Deposits)</span>
          <strong style={{ color: "#059669" }}>
            +{money(totalDeposits)}
          </strong>
          <small>Partner capital added</small>
        </div>
        <div>
          <span>Capital Out (Withdrawals)</span>
          <strong style={{ color: "#e11d48" }}>
            -{money(totalWithdrawals)}
          </strong>
          <small>Partner capital withdrawn</small>
        </div>
        <div>
          <span>Net Movement</span>
          <strong style={{ color: "#0f766e" }}>
            {money(netMovement)}
          </strong>
          <small>Net capital flow</small>
        </div>
      </div>

      <div className="financeCard globalCapitalCard mt-20">
        <div className="tableResponsive">
          <table className="financeTable">
            <thead>
              <tr>
                <th>Date</th>
                <th>Partner</th>
                <th>Transaction Type</th>
                <th>Direction</th>
                <th>Narration / Notes</th>
                <th>Status</th>
                <th style={{ textAlign: "right" }}>Amount</th>
              </tr>
            </thead>
            <tbody>
              {transactions
                .filter((t) => {
                  if (txFilterType === "CONTRIBUTION") {
                    return (
                      t.transaction_type === "CONTRIBUTION" ||
                      t.transaction_type === "ADJUSTMENT_INCREASE" ||
                      t.transaction_type === "PROFIT_SHARE"
                    );
                  }
                  if (txFilterType === "WITHDRAWAL") {
                    return (
                      t.transaction_type === "WITHDRAWAL" ||
                      t.transaction_type === "ADJUSTMENT_DECREASE" ||
                      t.transaction_type === "CAPITAL_EXIT"
                    );
                  }
                  return true;
                })
                .map((t) => {
                  const isContrib =
                    t.transaction_type === "CONTRIBUTION" ||
                    t.transaction_type === "ADJUSTMENT_INCREASE" ||
                    t.transaction_type === "PROFIT_SHARE";
                  return (
                    <tr
                      className="clickable globalClickableRow"
                      key={t.id}
                      onClick={() =>
                        onSelectRecord({ type: "transaction", record: t })
                      }
                    >
                      <td>
                        {new Date(t.effective_date).toLocaleDateString("en-IN")}
                      </td>
                      <td style={{ fontWeight: "600", color: "#0f172a" }}>
                        {t.partner_name}
                      </td>
                      <td>
                        <span
                          className="analyticsPill"
                          style={{
                            background: isContrib ? "#ecfdf5" : "#fff1f2",
                            color: isContrib ? "#047857" : "#be123c",
                            fontWeight: "700",
                          }}
                        >
                          {t.transaction_type === "PROFIT_SHARE"
                            ? "AUTO PROFIT SHARE"
                            : t.transaction_type}
                        </span>
                      </td>
                      <td>
                        {isContrib ? (
                          <span
                            style={{
                              color: "#059669",
                              fontWeight: "600",
                              display: "inline-flex",
                              alignItems: "center",
                              gap: "4px",
                            }}
                          >
                            <ArrowDownCircle size={14} /> IN
                          </span>
                        ) : (
                          <span
                            style={{
                              color: "#e11d48",
                              fontWeight: "600",
                              display: "inline-flex",
                              alignItems: "center",
                              gap: "4px",
                            }}
                          >
                            <ArrowRightCircle size={14} /> OUT
                          </span>
                        )}
                      </td>
                      <td>
                        <small style={{ color: "#64748b" }}>
                          {formatTxNotes(t.notes)}
                        </small>
                      </td>
                      <td>
                        <span className="statusPill active">{t.status}</span>
                      </td>
                      <td
                        style={{
                          textAlign: "right",
                          fontWeight: "700",
                          fontSize: "14px",
                          color: isContrib ? "#059669" : "#e11d48",
                        }}
                      >
                        {isContrib ? "+" : "-"}
                        {money(t.amount)}
                      </td>
                    </tr>
                  );
                })}
              {transactions.length === 0 && (
                <tr>
                  <td colSpan="7" style={{ textAlign: "center", padding: "30px", color: "#64748b" }}>
                    No capital transactions found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
