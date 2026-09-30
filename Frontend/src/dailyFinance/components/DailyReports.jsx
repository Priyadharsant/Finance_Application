import React, { useMemo, useState } from "react";
import { FileSpreadsheet, Printer, Filter } from "lucide-react";
import { Metric, Empty } from "./CommonComponents.jsx";
import { money, dateLabel } from "../services/dailyFinanceApi.js";
import { exportDailyCategoryReport } from "../../globalCapital/services/globalCapitalExportUtils.js";
import { globalCapitalApi } from "../../globalCapital/services/globalCapitalApi.js";

export default function DailyReports({
  report,
  runReport,
  range,
  setRange,
  scope = "all",
  setScope,
  customers = [],
  customerId,
  setCustomerId,
  status,
  setStatus,
  search,
  setSearch,
}) {
  const [activePreset, setActivePreset] = useState("day");
  const [downloadingDailyReport, setDownloadingDailyReport] = useState(false);

  const handleExportDailyCategoryReport = async () => {
    try {
      setDownloadingDailyReport(true);
      const reportData = await globalCapitalApi.getMasterBusinessLedger();
      exportDailyCategoryReport(reportData, { customers });
    } catch (e) {
      console.error(e);
      alert("Failed to export Daily Category Report: " + e.message);
    } finally {
      setDownloadingDailyReport(false);
    }
  };

  const preset = (kind) => {
    setActivePreset(kind);
    const end = new Date();
    const start = new Date(end);
    if (kind === "week") start.setDate(end.getDate() - 6);
    if (kind === "month") start.setDate(1);
    if (kind === "year") {
      start.setMonth(0);
      start.setDate(1);
    }
    const iso = (date) => {
      const offset = date.getTimezoneOffset();
      return new Date(date.getTime() - offset * 60000)
        .toISOString()
        .slice(0, 10);
    };
    const nextRange = { from: iso(start), to: iso(end) };
    setRange(nextRange);
    runReport(nextRange, scope);
  };

  // Real-time client-side filter over the fetched report
  const displayedCustomers = useMemo(() => {
    if (!report?.customers) return [];
    return report.customers.filter((row) => {
      const q = (search || "").trim().toLowerCase();
      const matchSearch =
        !q ||
        (row.customer_name && row.customer_name.toLowerCase().includes(q)) ||
        (row.mobile_number && row.mobile_number.includes(q));
      const matchCustomer = !customerId || row.customer_id === customerId;
      const matchStatus = !status || row.status === status;
      return matchSearch && matchCustomer && matchStatus;
    });
  }, [report?.customers, search, customerId, status]);

  // Real-time dynamic totals for the currently displayed rows
  const displayedTotals = useMemo(() => {
    if (!displayedCustomers.length) {
      return {
        financeAmount: 0,
        periodFinanceAmount: 0,
        given: 0,
        periodDisbursed: 0,
        totalReturn: 0,
        periodCollected: 0,
        returned: 0,
        remaining: 0,
        profit: 0,
        periodProfit: 0,
      };
    }
    return displayedCustomers.reduce(
      (sum, row) => ({
        financeAmount: sum.financeAmount + Number(row.gross_finance_amount || 0),
        periodFinanceAmount:
          sum.periodFinanceAmount + Number(row.period_finance_amount || 0),
        given: sum.given + Number(row.net_disbursement || 0),
        periodDisbursed:
          sum.periodDisbursed + Number(row.period_disbursement || 0),
        totalReturn: sum.totalReturn + Number(row.agreed_total_payable || 0),
        periodCollected: sum.periodCollected + Number(row.period_collected || 0),
        returned: sum.returned + Number(row.total_collected || 0),
        remaining: sum.remaining + Number(row.remaining || 0),
        profit: sum.profit + Number(row.profit || 0),
        periodProfit: sum.periodProfit + Number(row.period_profit || 0),
      }),
      {
        financeAmount: 0,
        periodFinanceAmount: 0,
        given: 0,
        periodDisbursed: 0,
        totalReturn: 0,
        periodCollected: 0,
        returned: 0,
        remaining: 0,
        profit: 0,
        periodProfit: 0,
      },
    );
  }, [displayedCustomers]);


  return (
    <section className="content">
      <div className="intro">
        <div>
          <span className="overline">REPORTS</span>
          <h2>Daily Finance Reports</h2>
          <p>Track collections, loans given, and download Excel reports.</p>
        </div>
        <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
          <button
            className="primary"
            style={{
              background: "linear-gradient(135deg, #059669 0%, #047857 100%)",
              borderColor: "#059669",
              fontWeight: "700",
              display: "inline-flex",
              alignItems: "center",
              gap: "8px",
              padding: "10px 18px",
              fontSize: "13.5px",
              borderRadius: "10px",
              boxShadow: "0 2px 8px rgba(5, 150, 105, 0.25)",
              cursor: "pointer",
            }}
            onClick={handleExportDailyCategoryReport}
            disabled={downloadingDailyReport}
            title="Download Daily Finance Report (.xlsx) with Daily Ledger, Loans, Collections, and Expenses"
          >
            <FileSpreadsheet size={16} />
            <span>{downloadingDailyReport ? "Compiling Report..." : "Download Daily Finance Report (.xlsx)"}</span>
          </button>
        </div>
      </div>

      <div className="reportBar" style={{ flexWrap: "wrap", gap: "10px" }}>
        <div className="presetButtons">
          <button
            type="button"
            className={activePreset === "day" ? "active" : ""}
            onClick={() => preset("day")}
          >
            Daily
          </button>
          <button
            type="button"
            className={activePreset === "week" ? "active" : ""}
            onClick={() => preset("week")}
          >
            Weekly
          </button>
          <button
            type="button"
            className={activePreset === "month" ? "active" : ""}
            onClick={() => preset("month")}
          >
            Monthly
          </button>
          <button
            type="button"
            className={activePreset === "year" ? "active" : ""}
            onClick={() => preset("year")}
          >
            Yearly
          </button>
        </div>

        <select
          value={scope}
          onChange={(event) => {
            const nextScope = event.target.value;
            setScope?.(nextScope);
            runReport(range, nextScope);
          }}
          title="Scope of report: All accounts or only accounts with period activity"
          style={{ fontWeight: "600" }}
        >
          <option value="all">View: All Accounts</option>
          <option value="period_activity">View: Period Activity Only</option>
          <option value="collections">View: Collections Received Only (&gt; ₹0)</option>
          <option value="disbursed">View: New Loans Given in Period</option>
        </select>

        <input
          placeholder="Search customer / phone..."
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />

        <select
          value={customerId}
          onChange={(event) => setCustomerId(event.target.value)}
        >
          <option value="">All customers</option>
          {customers.map((customer) => (
            <option key={customer.customer_id} value={customer.customer_id}>
              {customer.customer_name}
            </option>
          ))}
        </select>

        <select
          value={status}
          onChange={(event) => setStatus(event.target.value)}
        >
          <option value="">All statuses</option>
          <option value="ACTIVE">Active</option>
          <option value="COMPLETED">Completed</option>
          <option value="CLOSED">Closed</option>
        </select>

        <label>
          From
          <input
            type="date"
            value={range.from}
            onChange={(event) => {
              setActivePreset(null);
              setRange({ ...range, from: event.target.value });
            }}
          />
        </label>
        <label>
          To
          <input
            type="date"
            value={range.to}
            onChange={(event) => {
              setActivePreset(null);
              setRange({ ...range, to: event.target.value });
            }}
          />
        </label>

        <button className="primary" onClick={() => runReport(range, scope)}>
          Generate report
        </button>
      </div>

      {report ? (
        <>
          <div className="metricGrid">
            <Metric
              title="Period collection"
              value={displayedTotals.periodCollected}
              tone="green"
            />
            <Metric
              title="Period loans disbursed"
              value={displayedTotals.periodDisbursed}
            />
            <Metric
              title="Period profit"
              value={displayedTotals.periodProfit}
              tone="green"
            />
            <Metric
              title="Total return agreed"
              value={displayedTotals.totalReturn}
              tone="orange"
            />
            <Metric
              title="Total collected to-date"
              value={displayedTotals.returned}
              tone="green"
            />
            <Metric
              title="Remaining receivable"
              value={displayedTotals.remaining}
              tone="orange"
            />
            <Metric
              title="Filtered accounts"
              value={displayedCustomers.length}
            />
          </div>

          <div className="exportBar" style={{ display: "flex", justifyContent: "flex-end" }}>
            <button
              type="button"
              onClick={() => window.print()}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
                padding: "8px 14px",
                borderRadius: "8px",
                cursor: "pointer",
              }}
            >
              <Printer size={14} /> Print View
            </button>
          </div>

          <div className="card tableWrap">
            <div className="cardHead">
              <div>
                <h3>Finance report</h3>
                <p>
                  {report.from} to {report.to}
                  {customerId ? " · Individual customer" : ""}
                  {status ? ` · ${status}` : ""}
                  {scope !== "all" ? ` · ${scope.replace("_", " ").toUpperCase()}` : ""}
                  {search ? ` · Filtered: "${search}"` : ""}
                </p>
              </div>
            </div>

            {displayedCustomers.length === 0 ? (
              <div style={{ padding: "40px 20px", textAlign: "center", color: "#64748b" }}>
                <p style={{ fontSize: "15px", fontWeight: "600", marginBottom: "6px" }}>
                  No customer records match your filter criteria
                </p>
                <p style={{ fontSize: "13px" }}>
                  {scope !== "all"
                    ? "No loans given or collections recorded for this period. Try selecting 'All Accounts' or a wider date range."
                    : "Try adjusting your search query, status, or date range."}
                </p>
              </div>
            ) : (
              <table>
                <thead>
                  <tr>
                    <th>Customer</th>
                    <th>Finance amount</th>
                    <th>Interest</th>
                    <th>Amount given</th>
                    <th>Total return</th>
                    <th>Period collected</th>
                    <th>Total collected</th>
                    <th>Remaining</th>
                    <th>Profit</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {displayedCustomers.map((row) => (
                    <tr key={row.finance_id}>
                      <td>
                        <b>{row.customer_name}</b>
                        <small>{dateLabel(row.finance_date)}</small>
                      </td>
                      <td>{money(row.gross_finance_amount)}</td>
                      <td>{money(row.initial_deduction)}</td>
                      <td>{money(row.net_disbursement)}</td>
                      <td>{money(row.agreed_total_payable)}</td>
                      <td style={{ fontWeight: row.period_collected > 0 ? "700" : "normal", color: row.period_collected > 0 ? "#059669" : "inherit" }}>
                        {money(row.period_collected)}
                      </td>
                      <td>{money(row.total_collected)}</td>
                      <td className="redText">{money(row.remaining)}</td>
                      <td className="greenText">{money(row.profit)}</td>
                      <td>
                        <span className={`tag ${String(row.status || "").toLowerCase()}`}>
                          {row.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </>
      ) : (
        <Empty text="Choose a period and generate a report." />
      )}

    </section>
  );
}
