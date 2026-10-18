import React, { useState, useMemo } from "react";
import { FileSpreadsheet, Loader2 } from "lucide-react";
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
  loadingDetailsId,
}) {
  const [downloadingReport, setDownloadingReport] = useState(false);

  const sortedCustomers = useMemo(() => {
    return [...customers].sort((a, b) => {
      const da = new Date(a.finance_date || 0).getTime();
      const db = new Date(b.finance_date || 0).getTime();
      if (da !== db) return da - db;
      const ca = new Date(a.created_at || a.account_created_at || 0).getTime();
      const cb = new Date(b.created_at || b.account_created_at || 0).getTime();
      return ca - cb;
    });
  }, [customers]);

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
          title="Total customers"
          value={customers.length || position.total_accounts || position.active_accounts || 0}
          tone="blue"
          count
        />
        <Metric
          title="Finance amount"
          value={position.total_finance_amount}
        />
        <Metric
          title="Interest"
          value={position.profit}
        />
        <Metric
          title="Amount given"
          value={position.disbursed}
        />
        <Metric
          title="Total return"
          value={position.total_agreed_return || position.total_finance_amount}
        />
        <Metric
          title="Collected"
          value={position.collected}
          tone="green"
        />
        <Metric
          title="Remaining"
          value={position.receivable}
          tone="orange"
        />
        <Metric
          title="Profit"
          value={position.profit}
          tone="green"
        />
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
              <h3>Customer Accounts ({customers.length || position.total_accounts || position.active_accounts || 0})</h3>
              <p>Active and completed daily loans.</p>
            </div>
          </div>
          <table>
            <thead>
              <tr>
                <th style={{ width: "50px" }}>S.No</th>
                <th style={{ textAlign: "center" }}>Finance date</th>
                <th>Customer</th>
                <th>Finance amount</th>
                <th>Interest</th>
                <th>Amount given</th>
                <th>Total return</th>
                <th>Collected</th>
                <th>Remaining</th>
                <th>Profit</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {sortedCustomers.map((customer, idx) => {
                const isThisLoading = loadingDetailsId === customer.customer_id;
                return (
                  <tr
                    key={customer.finance_id}
                    onClick={() => openDetails(customer.customer_id, customer)}
                    className={`clickable ${isThisLoading ? "rowLoading" : ""}`}
                  >
                    <td style={{ color: "#64748b", fontWeight: "600", width: "50px" }}>{idx + 1}</td>
                    <td style={{ textAlign: "center", whiteSpace: "nowrap" }}>{dateLabel(customer.finance_date)}</td>
                    <td>
                      <div style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}>
                        <b>{customer.customer_name}</b>
                        {isThisLoading && (
                          <Loader2
                            size={13}
                            style={{
                              color: "#0d9488",
                              animation: "autoSpin 0.75s linear infinite",
                            }}
                          />
                        )}
                      </div>
                      <small>
                        {customer.mobile_number ? (
                          <PhoneLink phone={customer.mobile_number} />
                        ) : (
                          customer.address || "No contact details"
                        )}
                      </small>
                    </td>
                  <td>{money(customer.gross_finance_amount)}</td>
                  <td>
                    {money(customer.initial_deduction)}{" "}
                    {customer.interest_type === "PERCENT" && (
                      <small>({customer.interest_value}%)</small>
                    )}
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
              );
            })}
            </tbody>
          </table>
          {!customers.length && <Empty text="No customers yet." />}
        </div>
      </div>
    </section>
  );
}
