import React, { useMemo, useState } from "react";
import { FileSpreadsheet, Printer, Calendar, Search, X } from "lucide-react";
import { money } from "../services/autoFinanceApi.js";
import { exportAutoCategoryReport } from "../../globalCapital/services/globalCapitalExportUtils.js";
import { globalCapitalApi } from "../../globalCapital/services/globalCapitalApi.js";

export default function AutoReports({
  overview = {},
  loans = [],
}) {
  const [downloadingAutoReport, setDownloadingAutoReport] = useState(false);
  const [activePreset, setActivePreset] = useState("month");

  // Date range helper
  const iso = (date) => {
    const offset = date.getTimezoneOffset();
    return new Date(date.getTime() - offset * 60000).toISOString().slice(0, 10);
  };

  const getInitialMonthRange = () => {
    const end = new Date();
    const start = new Date(end);
    start.setDate(1);
    return { from: iso(start), to: iso(end) };
  };

  const [range, setRange] = useState(getInitialMonthRange());
  const [appliedRange, setAppliedRange] = useState(getInitialMonthRange());
  const [scope, setScope] = useState("all");
  const [search, setSearch] = useState("");
  const [customerId, setCustomerId] = useState("");
  const [status, setStatus] = useState("");

  // Presets: Daily, Weekly, Monthly, Yearly
  const preset = (kind) => {
    setActivePreset(kind);
    const end = new Date();
    const start = new Date(end);
    if (kind === "day") {
      // today only
    } else if (kind === "week") {
      start.setDate(end.getDate() - 6);
    } else if (kind === "month") {
      start.setDate(1);
    } else if (kind === "year") {
      start.setMonth(0);
      start.setDate(1);
    }
    const nextRange = { from: iso(start), to: iso(end) };
    setRange(nextRange);
    setAppliedRange(nextRange);
  };

  const handleRunReport = () => {
    setAppliedRange({ ...range });
  };

  // Single Dedicated Auto Finance Excel Report Handler (4 Essential Sheets)
  const handleExportAutoCategoryReport = async () => {
    try {
      setDownloadingAutoReport(true);
      const reportData = await globalCapitalApi.getMasterBusinessLedger();
      exportAutoCategoryReport(reportData, { loans });
    } catch (e) {
      console.error(e);
      alert("Failed to export Auto Finance Report: " + e.message);
    } finally {
      setDownloadingAutoReport(false);
    }
  };

  // Extract unique customer list from loans
  const uniqueCustomers = useMemo(() => {
    const map = new Map();
    loans.forEach((l) => {
      const cId = l.customer_id || l.id;
      const cName = `${l.first_name || ""} ${l.last_name || ""}`.trim() || l.name || `Customer #${cId}`;
      if (!map.has(cId)) {
        map.set(cId, { id: cId, name: cName });
      }
    });
    return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [loans]);

  // Filtered loans based on presets, scope, search, customer, status, and range
  const displayedLoans = useMemo(() => {
    return loans.filter((l) => {
      const loanDateStr = (l.start_date || l.disbursement_date || l.created_at || "").slice(0, 10);

      // Range check
      if (appliedRange.from && loanDateStr && loanDateStr < appliedRange.from) {
        if (scope === "disbursed" || scope === "period_activity") return false;
      }
      if (appliedRange.to && loanDateStr && loanDateStr > appliedRange.to) {
        if (scope === "disbursed" || scope === "period_activity") return false;
      }

      // Scope check
      if (scope === "active" && l.status !== "ACTIVE") return false;
      if (scope === "completed" && l.status !== "COMPLETED") return false;

      // Search query
      const q = (search || "").trim().toLowerCase();
      if (q) {
        const cName = `${l.first_name || ""} ${l.last_name || ""}`.toLowerCase();
        const phone = (l.phone || l.mobile_number || "").toLowerCase();
        const vehicle = `${l.make || ""} ${l.model || ""}`.toLowerCase();
        const regNo = (l.registration_number || "").toLowerCase();
        if (!cName.includes(q) && !phone.includes(q) && !vehicle.includes(q) && !regNo.includes(q)) {
          return false;
        }
      }

      // Customer filter
      if (customerId) {
        const cId = String(l.customer_id || l.id);
        if (cId !== String(customerId)) return false;
      }

      // Status filter
      if (status && l.status !== status) {
        return false;
      }

      return true;
    });
  }, [loans, appliedRange, scope, search, customerId, status]);

  // Aggregated totals for displayed loans
  const displayedTotals = useMemo(() => {
    const totalDisbursed = displayedLoans.reduce((sum, l) => sum + Number(l.loan_amount || 0), 0);
    const totalCollected = displayedLoans.reduce((sum, l) => sum + Number(l.total_paid || 0), 0);
    const totalRemaining = displayedLoans.reduce(
      (sum, l) => sum + Math.max(0, Number(l.loan_amount || 0) - Number(l.total_paid || 0)),
      0
    );
    const activeCount = displayedLoans.filter((l) => l.status === "ACTIVE").length;
    const completedCount = displayedLoans.filter((l) => l.status === "COMPLETED").length;
    const recoveryRate = totalDisbursed > 0 ? Math.round((totalCollected / totalDisbursed) * 100) : 0;

    return {
      totalDisbursed,
      totalCollected,
      totalRemaining,
      activeCount,
      completedCount,
      recoveryRate,
    };
  }, [displayedLoans]);

  return (
    <section className="content">
      {/* Intro Header */}
      <div className="intro" style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "16px" }}>
        <div>
          <span className="overline autoBadgeTag">REPORTS</span>
          <h2>Auto Finance Financial Reports</h2>
          <p>
            Track vehicle loans, EMI collections, and download Excel reports.
          </p>
        </div>

        {/* ONLY ONE PRIMARY EXCEL REPORT FOR AUTO FINANCE */}
        <button
          type="button"
          className="autoBtn"
          style={{
            background: "linear-gradient(135deg, #0284c7 0%, #0369a1 100%)",
            borderColor: "#0284c7",
            color: "#ffffff",
            display: "inline-flex",
            alignItems: "center",
            gap: "8px",
            fontWeight: "700",
            padding: "10px 18px",
            fontSize: "13.5px",
            borderRadius: "10px",
            boxShadow: "0 2px 8px rgba(2, 132, 199, 0.25)",
            cursor: "pointer",
          }}
          onClick={handleExportAutoCategoryReport}
          disabled={downloadingAutoReport}
          title="Download complete Auto Finance Category Report (4 Essential Sheets · latest.xlsx)"
        >
          <FileSpreadsheet size={16} />
          <span>{downloadingAutoReport ? "Compiling..." : "Download Auto Finance Report (.xlsx)"}</span>
        </button>
      </div>

      {/* Control / Filter Bar matching Daily pattern */}
      <div className="reportBar" style={{ flexWrap: "wrap", gap: "10px", marginBottom: "22px" }}>
        {/* Preset Buttons */}
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

        {/* View Scope Dropdown */}
        <select
          value={scope}
          onChange={(e) => setScope(e.target.value)}
          style={{ fontWeight: "600" }}
          title="Filter by account view scope"
        >
          <option value="all">View: All Accounts</option>
          <option value="active">View: Active Loans Only</option>
          <option value="completed">View: Settled / Completed Loans Only</option>
          <option value="disbursed">View: Loans Given in Period Only</option>
        </select>

        {/* Search Input */}
        <input
          placeholder="Search customer / phone / vehicle..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ minWidth: "200px" }}
        />

        {/* Customer Dropdown */}
        <select
          value={customerId}
          onChange={(e) => setCustomerId(e.target.value)}
        >
          <option value="">All customers</option>
          {uniqueCustomers.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>

        {/* Status Dropdown */}
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
        >
          <option value="">All statuses</option>
          <option value="ACTIVE">Active</option>
          <option value="COMPLETED">Completed</option>
          <option value="CLOSED">Closed</option>
        </select>

        {/* From Date */}
        <label>
          From
          <input
            type="date"
            value={range.from}
            onChange={(e) => {
              setActivePreset(null);
              setRange({ ...range, from: e.target.value });
            }}
          />
        </label>

        {/* To Date */}
        <label>
          To
          <input
            type="date"
            value={range.to}
            onChange={(e) => {
              setActivePreset(null);
              setRange({ ...range, to: e.target.value });
            }}
          />
        </label>

        {/* Generate Report Button */}
        <button
          type="button"
          className="primary"
          style={{ background: "#0284c7", borderColor: "#0284c7" }}
          onClick={handleRunReport}
        >
          Generate report
        </button>
      </div>

      {/* Metric Cards Grid */}
      <div className="metricGrid" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", marginBottom: "20px" }}>
        <div className="metric autoMetric blue">
          <span>Loans Disbursed</span>
          <b>{money(displayedTotals.totalDisbursed)}</b>
          <small style={{ color: "#64748b", fontSize: "11.5px", marginTop: "4px", display: "block" }}>
            {displayedLoans.length} Loans in view
          </small>
        </div>
        <div className="metric autoMetric green">
          <span>EMI Recovered</span>
          <b>{money(displayedTotals.totalCollected)}</b>
          <small style={{ color: "#059669", fontSize: "11.5px", fontWeight: 600, marginTop: "4px", display: "block" }}>
            {displayedTotals.recoveryRate}% Recovery Rate
          </small>
        </div>
        <div className="metric autoMetric red">
          <span>Remaining Receivable</span>
          <b>{money(displayedTotals.totalRemaining)}</b>
          <small style={{ color: "#dc2626", fontSize: "11.5px", fontWeight: 600, marginTop: "4px", display: "block" }}>
            Outstanding Balance
          </small>
        </div>
        <div className="metric autoMetric orange">
          <span>Active Vehicle Assets</span>
          <b>{displayedTotals.activeCount} Active</b>
          <small style={{ color: "#d97706", fontSize: "11.5px", fontWeight: 600, marginTop: "4px", display: "block" }}>
            {displayedTotals.completedCount} Settled / Completed
          </small>
        </div>
        <div className="metric autoMetric">
          <span>Filtered Accounts</span>
          <b>{displayedLoans.length}</b>
          <small style={{ color: "#64748b", fontSize: "11.5px", marginTop: "4px", display: "block" }}>
            {appliedRange.from} to {appliedRange.to}
          </small>
        </div>
      </div>

      {/* Export Bar with Print View */}
      <div className="exportBar" style={{ display: "flex", justifyContent: "flex-end", marginBottom: "14px" }}>
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

      {/* Filtered Loans Table */}
      <div className="card tableWrap">
        <div className="cardHead" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <h3 style={{ margin: 0 }}>Auto Finance Report</h3>
            <p style={{ margin: "4px 0 0", fontSize: "12px", color: "#64748b" }}>
              {appliedRange.from} to {appliedRange.to}
              {customerId ? ` · Individual customer` : ""}
              {status ? ` · Status: ${status}` : ""}
              {scope !== "all" ? ` · ${scope.toUpperCase()}` : ""}
              {search ? ` · Filter: "${search}"` : ""}
            </p>
          </div>
          <span style={{ fontSize: "12px", color: "#64748b" }}>{displayedLoans.length} Loans Found</span>
        </div>

        {displayedLoans.length === 0 ? (
          <div style={{ padding: "40px 20px", textAlign: "center", color: "#64748b" }}>
            <p style={{ fontSize: "15px", fontWeight: "600", marginBottom: "6px" }}>
              No vehicle loan records match your filter criteria
            </p>
            <p style={{ fontSize: "13px" }}>
              Try adjusting your search query, status, customer selection, or date range.
            </p>
          </div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Customer</th>
                <th>Vehicle & Reg No</th>
                <th>Loan Principal</th>
                <th>Deductions</th>
                <th>In-Hand Disbursed</th>
                <th>Interest Rate</th>
                <th>Tenure</th>
                <th>EMI Collected</th>
                <th>Remaining</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {displayedLoans.map((l) => {
                let fees = {};
                try {
                  fees = typeof l.fees_details === "string" ? JSON.parse(l.fees_details || "{}") : (l.fees_details || {});
                } catch (_) {
                  fees = {};
                }
                const dedAmt = Number(l.totalDeductions ?? (
                  Number(fees.incomeDue || 0) + Number(fees.documentFee || 0) + Number(fees.hirePurchase || 0) +
                  Number(fees.taxAmount || 0) + Number(fees.insurance || 0) + Number(fees.insuranceFine || 0) +
                  Number(fees.greenTax || 0) + Number(fees.fine || 0) + Number(fees.nationalTax || 0) +
                  Number(fees.permit || 0) + Number(fees.brokerageCustomer || 0)
                ));
                const inHand = Number(l.byHand || (Number(l.loan_amount || 0) - dedAmt));
                const rem = Math.max(0, Number(l.loan_amount || 0) - Number(l.total_paid || 0));

                return (
                  <tr key={l.id}>
                    <td>
                      <b>
                        {l.first_name} {l.last_name}
                      </b>
                      {l.phone && (
                        <div style={{ fontSize: "11px", color: "#64748b" }}>{l.phone}</div>
                      )}
                    </td>
                    <td>
                      <div>
                        {l.make} {l.model}
                      </div>
                      <div style={{ fontSize: "11px", color: "#0284c7", fontWeight: 600 }}>
                        {l.registration_number || "REG PENDING"}
                      </div>
                    </td>
                    <td>{money(l.loan_amount)}</td>
                    <td style={{ color: dedAmt > 0 ? "#ef4444" : "#64748b", fontWeight: 600 }}>
                      {dedAmt > 0 ? `- ${money(dedAmt)}` : "₹0"}
                    </td>
                    <td style={{ color: "#059669", fontWeight: 700 }}>
                      {money(inHand)}
                    </td>
                    <td>{l.interest_rate}%</td>
                    <td>{l.tenure_months} Mo</td>
                    <td className="greenText">{money(l.total_paid)}</td>
                    <td style={{ color: rem > 0 ? "#dc2626" : "#059669", fontWeight: 600 }}>
                      {money(rem)}
                    </td>
                    <td>
                      <span
                        style={{
                          padding: "2px 8px",
                          borderRadius: "10px",
                          fontSize: "11px",
                          fontWeight: 600,
                          background: l.status === "ACTIVE" ? "#e0f2fe" : "#dcfce7",
                          color: l.status === "ACTIVE" ? "#0369a1" : "#15803d",
                        }}
                      >
                        {l.status || "ACTIVE"}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </section>
  );
}
