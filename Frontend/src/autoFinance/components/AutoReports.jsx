import React, { useMemo } from "react";
import { X, Calendar } from "lucide-react";
import { money } from "../services/autoFinanceApi";

export default function AutoReports({
  overview = {},
  loans = [],
  reportMonth,
  setReportMonth,
  handleExportTotal,
  handleExportMonthly,
  handleExportIndividualFromId,
}) {
  const currentMonthStr = new Date().toISOString().slice(0, 7);

  const filteredLoans = useMemo(() => {
    if (!reportMonth) return loans;
    return loans.filter((l) => {
      const lm = String(l.start_date || l.disbursement_date || l.created_at || "").slice(0, 7);
      return lm === reportMonth;
    });
  }, [loans, reportMonth]);

  const repDisbursed = filteredLoans.reduce((sum, l) => sum + Number(l.loan_amount || 0), 0);
  const repCollected = filteredLoans.reduce((sum, l) => sum + Number(l.total_paid || 0), 0);
  const repRemaining = filteredLoans.reduce((sum, l) => sum + Math.max(0, Number(l.loan_amount || 0) - Number(l.total_paid || 0)), 0);
  const repActive = filteredLoans.filter(l => l.status === "ACTIVE").length;
  const repCompleted = filteredLoans.filter(l => l.status === "COMPLETED").length;
  const repRecoveryRate = repDisbursed > 0 ? Math.round((repCollected / repDisbursed) * 100) : 0;

  return (
    <section className="content">
      <div className="intro">
        <div>
          <span className="overline autoBadgeTag">REPORTS</span>
          <h2>Auto Finance Financial Reports</h2>
          <p>
            Export & audit vehicle loan portfolios, disbursements, and
            collection schedules.
          </p>
        </div>
      </div>

      <div
        className="exportBar"
        style={{
          display: "flex",
          gap: "12px",
          flexWrap: "wrap",
          marginBottom: "20px",
          alignItems: "center",
        }}
      >
        <button className="primary autoBtn" onClick={handleExportTotal}>
          Export Total Portfolio (Excel) ({loans.length})
        </button>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "6px",
            background: "#f1f5f9",
            padding: "2px 8px",
            borderRadius: "6px",
            border: "1px solid #cbd5e1",
          }}
        >
          <Calendar size={14} color="#0f766e" />
          <input
            type="month"
            value={reportMonth}
            onChange={(e) => setReportMonth(e.target.value)}
            style={{
              border: "none",
              background: "transparent",
              outline: "none",
              fontSize: "13px",
              cursor: "pointer",
              color: "#0f172a",
              fontWeight: 500,
            }}
          />
          {reportMonth && (
            <button
              type="button"
              onClick={() => setReportMonth("")}
              style={{
                border: "none",
                background: "transparent",
                color: "#94a3b8",
                cursor: "pointer",
                padding: "0 2px",
              }}
              title="Clear Month Filter"
            >
              <X size={13} />
            </button>
          )}
          <button
            className="primary autoBtn"
            style={{
              background: "#059669",
              borderColor: "#059669",
              padding: "4px 10px",
              fontSize: "12px",
            }}
            onClick={handleExportMonthly}
          >
            Export Monthly (Excel) ({filteredLoans.length})
          </button>
        </div>
        <button onClick={() => window.print()}>Export PDF / Print</button>
      </div>

      {/* DYNAMIC METRIC GRID (BASED ON FILTERS) */}
      <div className="metricGrid" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", marginBottom: "20px" }}>
        <div className="metric autoMetric blue">
          <span>Financed Portfolio</span>
          <b>{money(repDisbursed)}</b>
          <small style={{ color: "#64748b", fontSize: "11.5px", marginTop: "4px", display: "block" }}>
            {filteredLoans.length} Loans {reportMonth ? `(${reportMonth})` : "(All Time)"}
          </small>
        </div>
        <div className="metric autoMetric green">
          <span>EMI Recovered</span>
          <b>{money(repCollected)}</b>
          <small style={{ color: "#059669", fontSize: "11.5px", fontWeight: 600, marginTop: "4px", display: "block" }}>
            {repRecoveryRate}% Recovered
          </small>
        </div>
        <div className="metric autoMetric red">
          <span>Remaining Portfolio</span>
          <b>{money(repRemaining)}</b>
          <small style={{ color: "#dc2626", fontSize: "11.5px", fontWeight: 600, marginTop: "4px", display: "block" }}>
            Balance Outstanding
          </small>
        </div>
        <div className="metric autoMetric orange">
          <span>Active Vehicle Assets</span>
          <b>{repActive} Active</b>
          <small style={{ color: "#d97706", fontSize: "11.5px", fontWeight: 600, marginTop: "4px", display: "block" }}>
            {repCompleted} Settled / Completed
          </small>
        </div>
      </div>

      <div className="card tableWrap">
        <div className="cardHead" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <h3 style={{ margin: 0 }}>Portfolio Summary {reportMonth ? `(${reportMonth})` : ""}</h3>
          <span style={{ fontSize: "12px", color: "#64748b" }}>{filteredLoans.length} Loans Found</span>
        </div>
        <table>
          <thead>
            <tr>
              <th>Customer</th>
              <th>Vehicle</th>
              <th>Loan Amount</th>
              <th>Interest Rate</th>
              <th>Tenure</th>
              <th>Collected</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {filteredLoans.map((l) => (
              <tr key={l.id}>
                <td>
                  <b>
                    {l.first_name} {l.last_name}
                  </b>
                </td>
                <td>
                  {l.make} {l.model} ({l.registration_number})
                </td>
                <td>{money(l.loan_amount)}</td>
                <td>{l.interest_rate}%</td>
                <td>{l.tenure_months} Mo</td>
                <td className="greenText">{money(l.total_paid)}</td>
                <td>
                  <button
                    className="payButton"
                    style={{
                      padding: "4px 10px",
                      fontSize: "11.5px",
                      background: "#f1f5f9",
                      color: "#0f172a",
                      border: "1px solid #cbd5e1",
                    }}
                    onClick={() => handleExportIndividualFromId(l.id)}
                  >
                    Export Full Details
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
