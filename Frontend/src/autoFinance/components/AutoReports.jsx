import React from "react";
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
          Export Total Portfolio (Excel)
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
          <input
            type="month"
            value={reportMonth}
            onChange={(e) => setReportMonth(e.target.value)}
            style={{
              border: "none",
              background: "transparent",
              outline: "none",
              fontSize: "14px",
              cursor: "pointer",
              color: "#0f172a",
            }}
          />
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
            Export Monthly (Excel)
          </button>
        </div>
        <button onClick={() => window.print()}>Export PDF / Print</button>
      </div>

      <div className="metricGrid">
        <div className="metric autoMetric">
          <span>Total Financed Portfolio</span>
          <b>{money(overview.total_disbursed || 0)}</b>
        </div>
        <div className="metric autoMetric green">
          <span>Total EMI Recovered</span>
          <b>{money(overview.total_collected || 0)}</b>
        </div>
        <div className="metric autoMetric orange">
          <span>Active Vehicle Assets</span>
          <b>{overview.total_vehicles || loans.length || 0}</b>
        </div>
      </div>

      <div className="card tableWrap">
        <div className="cardHead">
          <h3>Portfolio Summary</h3>
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
            {loans.map((l) => (
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
