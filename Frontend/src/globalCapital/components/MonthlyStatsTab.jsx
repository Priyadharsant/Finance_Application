import React from "react";
import { Download } from "lucide-react";
import { money } from "../../autoFinance/services/autoFinanceApi";
import { exportMonthlyStats } from "../services/globalCapitalExportUtils";

export default function MonthlyStatsTab({ stats = [] }) {
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
            onClick={() => exportMonthlyStats(stats)}
            disabled={!stats.length}
          >
            <Download size={15} /> Export Excel
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      {stats.length > 0 && (
        <div className="metricGrid" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", marginBottom: "20px" }}>
          <div className="metric" style={{ borderLeft: "4px solid #4f46e5" }}>
            <span>In-Hand Cash (Current)</span>
            <b style={{ color: "#4f46e5" }}>{money(stats[0].closingCash)}</b>
            <small style={{ color: "#64748b", display: "block", marginTop: "4px" }}>As of {stats[0].month}</small>
          </div>
          <div className="metric" style={{ borderLeft: "4px solid #0284c7" }}>
            <span>Auto — Amount Given Outside</span>
            <b style={{ color: "#0284c7" }}>{money(stats[0].closingAutoInv)}</b>
            <small style={{ color: "#64748b", display: "block", marginTop: "4px" }}>Total loans not yet recovered</small>
          </div>
          <div className="metric" style={{ borderLeft: "4px solid #0f766e" }}>
            <span>Daily — Amount Given Outside</span>
            <b style={{ color: "#0f766e" }}>{money(stats[0].closingDailyInv)}</b>
            <small style={{ color: "#64748b", display: "block", marginTop: "4px" }}>Total loans not yet recovered</small>
          </div>
          <div className="metric" style={{ borderLeft: "4px solid #16a34a" }}>
            <span>Next Month Opening Balance</span>
            <b style={{ color: "#16a34a" }}>{money(stats[0].closingCash)}</b>
            <small style={{ color: "#64748b", display: "block", marginTop: "4px" }}>Carries forward to {
              (() => {
                const [yr, mo] = stats[0].month.split("-").map(Number);
                const next = new Date(yr, mo, 1);
                return `${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, "0")}`;
              })()
            }</small>
          </div>
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
              {stats.map((s, idx) => (
                <tr key={idx} style={idx === 0 ? { background: "#f0fdf4", fontWeight: 600 } : {}}>
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
