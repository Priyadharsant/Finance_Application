import React, { useState } from "react";
import { FileSpreadsheet } from "lucide-react";
import { Metric, Empty, PhoneLink } from "./CommonComponents.jsx";
import { money, dateLabel } from "../services/dailyFinanceApi.js";
import { exportDailyCategoryReport } from "../../globalCapital/services/globalCapitalExportUtils.js";
import { globalCapitalApi } from "../../globalCapital/services/globalCapitalApi.js";

export default function DailyDashboard({
  position = {},
  customers = [],
  recent = [],
  setPage,
  openDetails,
}) {
  const [downloadingReport, setDownloadingReport] = useState(false);

  const handleExportDailyReport = async () => {
    try {
      setDownloadingReport(true);
      const reportData = await globalCapitalApi.getMasterBusinessLedger();
      exportDailyCategoryReport(reportData, { customers });
    } catch (e) {
      console.error(e);
      alert("Failed to export Daily Finance Report: " + e.message);
    } finally {
      setDownloadingReport(false);
    }
  };

  return (
    <section className="content">
      <div className="intro">
        <div>
          <span className="overline">OVERVIEW</span>
          <h2>Business Overview</h2>
          <p>Summary of collections, active loans, and cash balance.</p>
        </div>
        <div style={{ display: "flex", gap: "10px", alignItems: "center", flexWrap: "wrap" }}>
          <button
            type="button"
            className="unifiedReportBtn"
            onClick={handleExportDailyReport}
            disabled={downloadingReport}
            title="Download complete Daily Finance Report (.xlsx)"
          >
            <FileSpreadsheet size={16} />
            <span>{downloadingReport ? "Compiling..." : "Download Report (.xlsx)"}</span>
          </button>
        </div>
      </div>
      <div className="metricGrid">
        <Metric
          title="Total finance amount"
          value={position.total_finance_amount}
        />
        <Metric title="Amount given" value={position.disbursed} />
        <Metric
          title="Total collected"
          value={position.collected}
          tone="green"
        />
        <Metric
          title="Total remaining"
          value={position.receivable}
          tone="orange"
        />
        <Metric title="Total profit" value={position.profit} tone="green" />
        <Metric
          title="Current In-Hand Amount"
          value={position.collected}
          tone="green"
        />
        <Metric
          title="Next Month Projected Amount"
          value={
            Number(position.collected || 0) +
            Math.round(Number(position.receivable || 0) * 0.5)
          }
          tone="orange"
        />
      </div>
      <div className="dashboardGrid" style={{ gridTemplateColumns: "1fr" }}>
        <div className="card tableWrap">
          <div className="cardHead">
            <div>
              <h3>Customer Accounts</h3>
              <p>Active and completed daily loans.</p>
            </div>
          </div>
          <table>
            <thead>
              <tr>
                <th>Customer</th>
                <th>Amount given</th>
                <th>Total return</th>
                <th>Collected</th>
                <th>Remaining</th>
                <th>Profit</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {customers.map((customer) => (
                <tr
                  key={customer.finance_id}
                  onClick={() => openDetails(customer.customer_id)}
                  className="clickable"
                >
                  <td>
                    <b>{customer.customer_name}</b>
                    <small>
                      {customer.mobile_number ? (
                        <PhoneLink phone={customer.mobile_number} />
                      ) : (
                        customer.address || "No contact details"
                      )}
                    </small>
                  </td>
                  <td>{money(customer.net_disbursement)}</td>
                  <td>{money(customer.agreed_total_payable)}</td>
                  <td>{money(customer.total_collected)}</td>
                  <td className="redText">
                    {money(customer.outstanding_receivable)}
                  </td>
                  <td className="greenText">
                    {money(customer.initial_deduction)}
                  </td>
                  <td>
                    <span className={`tag ${customer.status.toLowerCase()}`}>
                      {customer.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!customers.length && <Empty text="No customers yet." />}
        </div>
      </div>
    </section>
  );
}
