import React from "react";
import { Download } from "lucide-react";
import { money } from "../../autoFinance/services/autoFinanceApi";
import { exportMonthlyStats } from "../services/globalCapitalExportUtils";
import MetricTooltipCard from "../../components/MetricTooltipCard.jsx";

export default function MonthlyStatsTab({ stats = [] }) {
  // The API already returns latest month first.
  const orderedStats = [...stats];
  const latestStats = orderedStats[0];

  return (
    <section className="content">
      <div className="intro">
        <div>
          <span className="overline" style={{ color: "#4f46e5", background: "#eef2ff", padding: "3px 10px", borderRadius: "20px", fontSize: "11px", fontWeight: 700, letterSpacing: "1px" }}>
            GLOBAL CAPITAL
          </span>
          <h2>Monthly Cash Flow &amp; In-Hand Balance</h2>
          <p>
            Month-by-month breakdown of all money in and out across Auto Finance and Daily Finance.
            The closing in-hand cash of each month automatically becomes the opening balance for the next month.
          </p>
        </div>
        <div>
          <button
            className="primary"
            style={{ background: "#16a34a", border: "none" }}
            onClick={() => exportMonthlyStats(orderedStats)}
            disabled={!stats.length}
          >
            <Download size={15} /> Export Excel
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      {stats.length > 0 && (
        <div className="metricGrid" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", marginBottom: "20px" }}>
          <MetricTooltipCard
            title="In-Hand Cash (Current)"
            value={money(latestStats.closingCash)}
            detail={`As of ${latestStats.month}`}
            valueStyle={{ color: "#4f46e5" }}
            style={{ borderLeft: "4px solid #4f46e5" }}
            definition="Cash balance at the end of the latest month in the monthly roll-forward."
            formula="Opening cash + total inflows - total outflows."
            period={`Through ${latestStats.month}, accumulated from the earliest month returned by the API.`}
            source="Partner capital transactions, Auto Finance payments and loans, and Daily Finance payments and loans."
          />
          <MetricTooltipCard
            title="Auto — Amount Given Outside"
            value={money(latestStats.closingAutoInv)}
            detail="Auto disbursements less collections, rolled forward"
            valueStyle={{ color: "#0284c7" }}
            style={{ borderLeft: "4px solid #0284c7" }}
            definition="Cumulative Auto Finance principal issued and not offset by recorded collections in the monthly movement calculation."
            formula="Prior outside balance + loan disbursements - payments collected."
            period={`Through ${latestStats.month}.`}
            source="autofinance_loans.loan_amount and autofinance_payments.amount_paid."
          />
          <MetricTooltipCard
            title="Daily — Amount Given Outside"
            value={money(latestStats.closingDailyInv)}
            detail="Daily disbursements less collections, rolled forward"
            valueStyle={{ color: "#0f766e" }}
            style={{ borderLeft: "4px solid #0f766e" }}
            definition="Cumulative Daily Finance amount issued and not offset by recorded collections in the monthly movement calculation."
            formula="Prior outside balance + daily disbursements - daily collections."
            period={`Through ${latestStats.month}.`}
            source="Daily Finance accounts and payment records."
          />
          <MetricTooltipCard
            title="Next Month Opening Balance"
            value={money(latestStats.closingCash)}
            detail={`Carries forward from ${latestStats.month}`}
            valueStyle={{ color: "#16a34a" }}
            style={{ borderLeft: "4px solid #16a34a" }}
            definition="The latest month closing cash is carried forward as the next month opening cash."
            formula="Next month opening balance = latest closing cash."
            period="Opening balance for the month immediately after the latest month shown."
            source="Monthly Cash Flow & In-Hand Balance roll-forward."
          />
        </div>
      )}

      {/* Detailed Table */}
      <div className="card tableWrap">
        <div className="cardHead">
          <h3>Month-by-Month Breakdown</h3>
        </div>
        <div style={{ overflowX: "auto" }}>
          <table className="dataTable">
            <thead>
              <tr>
                <th style={{ width: "50px" }}>S.No</th>
                <th>Month</th>
                <th>Opening Balance</th>
                <th>Partner Money IN / OUT</th>
                <th>Auto: Collected / Given</th>
                <th>Auto Money Outside</th>
                <th>Daily: Collected / Given</th>
                <th>Daily Money Outside</th>
                <th>Total IN / OUT</th>
                <th>In-Hand Cash (Closing)</th>
              </tr>
            </thead>
            <tbody>
              {orderedStats.map((s, idx) => (
                <tr key={idx} style={idx === 0 ? { background: "#f0fdf4", fontWeight: 600 } : {}}>
                  <td style={{ color: "#64748b", fontWeight: "600", width: "50px" }}>{idx + 1}</td>
                  <td><strong>{s.month}</strong>{idx === 0 && <span style={{ marginLeft: 6, fontSize: 10, color: "#16a34a", background: "#dcfce7", borderRadius: 8, padding: "2px 7px" }}>Latest</span>}</td>
                  <td style={{ color: "#64748b" }}>{money(s.openingCash)}</td>
                  <td>
                    <span style={{ color: "#16a34a" }}>+{money(s.globalIn)}</span><br />
                    <span style={{ color: "#dc2626" }}>-{money(s.globalOut)}</span>
                  </td>
                  <td>
                    <span style={{ color: "#16a34a" }}>+{money(s.autoIn)}</span><br />
                    <span style={{ color: "#dc2626" }}>-{money(s.autoOut)}</span>
                  </td>
                  <td><b style={{ color: "#0284c7" }}>{money(s.closingAutoInv)}</b></td>
                  <td>
                    <span style={{ color: "#16a34a" }}>+{money(s.dailyIn)}</span><br />
                    <span style={{ color: "#dc2626" }}>-{money(s.dailyOut)}</span>
                  </td>
                  <td><b style={{ color: "#0f766e" }}>{money(s.closingDailyInv)}</b></td>
                  <td>
                    <span style={{ color: "#16a34a" }}>+{money(s.totalIn)}</span><br />
                    <span style={{ color: "#dc2626" }}>-{money(s.totalOut)}</span>
                  </td>
                  <td><b style={{ color: "#4f46e5", fontSize: "15px" }}>{money(s.closingCash)}</b></td>
                </tr>
              ))}
            </tbody>
          </table>
          {!stats.length && (
            <div className="empty" style={{ padding: "40px", textAlign: "center" }}>
              <b>No monthly data found.</b>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
