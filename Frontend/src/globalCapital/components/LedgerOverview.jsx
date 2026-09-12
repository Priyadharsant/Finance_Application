import React from "react";
import {
  Globe,
  Landmark,
  ArrowDownCircle,
  ArrowRightCircle,
} from "lucide-react";
import { money } from "../utils/formatters.js";

export default function LedgerOverview({
  ledgerData,
  totalCredits,
  totalDebits,
  onSelectRecord,
}) {
  return (
    <div className="financeFadeIn globalCapitalView">
      {/* Top Hero Banner */}
      <div className="globalCapitalHero">
        <div className="analyticsBannerHead">
          <h4>
            <Globe size={18} /> Available Company Capital
          </h4>
        </div>
        <strong>
          {money(ledgerData.availableCapital)}
        </strong>
        <p>
          Net real-time capital balance (Gross capital minus all business &amp; brokerage expenses).
        </p>
      </div>

      {/* KPI Stats */}
      <div className="globalCapitalStats sixCol">
        <div>
          <span>Gross Revenue</span>
          <strong style={{ color: "#059669" }}>
            {money(ledgerData.revenue?.totalRevenue)}
          </strong>
          <small>
            Auto: {money(ledgerData.revenue?.autoRevenue)} • Daily: {money(ledgerData.revenue?.dailyRevenue)}
          </small>
        </div>
        <div>
          <span>Total Expenses</span>
          <strong style={{ color: "#e11d48" }}>
            {money(ledgerData.expenses?.totalExpenses)}
          </strong>
          <small>
            Auto: {money(ledgerData.expenses?.autoExpenses)} • Daily: {money(ledgerData.expenses?.dailyExpenses)} • Gen: {money(ledgerData.expenses?.generalExpenses)}
          </small>
        </div>
        <div>
          <span>Net Profit</span>
          <strong
            style={{
              color: Number(ledgerData.netProfit || 0) >= 0 ? "#0d9488" : "#e11d48",
            }}
          >
            {money(ledgerData.netProfit)}
          </strong>
          <small>Revenue minus All Expenses</small>
        </div>
        <div>
          <span>Capital in</span>
          <strong>
            {money(ledgerData.totalCredits || totalCredits)}
          </strong>
          <small>Partner contributions</small>
        </div>
        <div>
          <span>Capital deployed</span>
          <strong>
            {money(ledgerData.totalDebits || totalDebits)}
          </strong>
          <small>Finance disbursements</small>
        </div>
        <div>
          <span>Ledger entries</span>
          <strong>{ledgerData.ledger?.length || 0}</strong>
          <small>Auditable transactions</small>
        </div>
      </div>

      {/* Recent Ledger Table */}
      <div className="financeCard globalCapitalCard mt-20">
        <div
          className="cardHead"
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: "10px",
          }}
        >
          <h3>
            <Landmark size={18} /> Global Cash Ledger
          </h3>
          <span
            style={{
              fontSize: "12px",
              color: "#64748b",
              fontWeight: "500",
              display: "flex",
              alignItems: "center",
              gap: "6px",
            }}
          >
            <span>💡 Click any row to view full transaction details</span>
          </span>
        </div>
        <div className="tableResponsive">
          <table className="financeTable">
            <thead>
              <tr>
                <th>Date</th>
                <th>Type / Description</th>
                <th>Module</th>
                <th>Direction</th>
                <th style={{ textAlign: "right" }}>Amount</th>
                <th style={{ textAlign: "center", width: "90px" }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {ledgerData.ledger?.map((tx) => (
                <tr
                  className="clickable globalClickableRow"
                  key={tx.id}
                  title="Click to view full transaction details"
                  onClick={() => onSelectRecord({ type: "ledger", record: tx })}
                >
                  <td>
                    <span style={{ fontWeight: "500" }}>
                      {new Date(tx.effective_date).toLocaleDateString()}
                    </span>
                  </td>
                  <td>
                    <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
                      <div>
                        <span
                          className="analyticsPill"
                          style={{ background: "#f1f5f9", color: "#475569" }}
                        >
                          {tx.type}
                        </span>
                      </div>
                      {tx.notes && (
                        <small
                          style={{
                            color: "#64748b",
                            fontSize: "11px",
                            maxWidth: "260px",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {tx.notes}
                        </small>
                      )}
                    </div>
                  </td>
                  <td>
                    <span className="txBadge module" style={{ fontSize: "10.5px" }}>
                      {tx.source_module}
                    </span>
                  </td>
                  <td>
                    {tx.direction === "CREDIT" ? (
                      <span
                        style={{
                          color: "#10b981",
                          fontWeight: "600",
                          display: "flex",
                          alignItems: "center",
                          gap: "4px",
                        }}
                      >
                        <ArrowDownCircle size={14} /> IN
                      </span>
                    ) : (
                      <span
                        style={{
                          color: "#ef4444",
                          fontWeight: "600",
                          display: "flex",
                          alignItems: "center",
                          gap: "4px",
                        }}
                      >
                        <ArrowRightCircle size={14} /> OUT
                      </span>
                    )}
                  </td>
                  <td
                    style={{
                      textAlign: "right",
                      fontWeight: "700",
                      color: tx.direction === "CREDIT" ? "#10b981" : "#ef4444",
                      fontSize: "14px",
                    }}
                  >
                    {tx.direction === "CREDIT" ? "+" : "-"}
                    {money(tx.amount)}
                  </td>
                  <td style={{ textAlign: "center" }}>
                    <button
                      type="button"
                      className="secondaryBtn"
                      style={{
                        padding: "4px 10px",
                        fontSize: "11px",
                        borderRadius: "6px",
                        lineHeight: "1.2",
                      }}
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelectRecord({ type: "ledger", record: tx });
                      }}
                    >
                      View →
                    </button>
                  </td>
                </tr>
              ))}
              {(!ledgerData.ledger || ledgerData.ledger.length === 0) && (
                <tr>
                  <td
                    colSpan="6"
                    style={{ textAlign: "center", color: "#64748b", padding: "24px" }}
                  >
                    No ledger transactions yet.
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
