import React, { useMemo, useState } from "react";
import {
  FileSpreadsheet,
  Printer,
  Calendar,
  Globe,
  RefreshCw,
} from "lucide-react";
import { money } from "../../autoFinance/services/autoFinanceApi.js";
import { exportGlobalCategoryReport } from "../services/globalCapitalExportUtils.js";
import { globalCapitalApi } from "../services/globalCapitalApi.js";

export default function GlobalReportsTab({
  ledgerData,
  partners = [],
  transactions = [],
  expenses = [],
  closings = [],
  dailyLogsData,
  setNotice,
}) {
  const [internalPartners, setInternalPartners] = useState(partners);

  React.useEffect(() => {
    if (partners && partners.length > 0) {
      setInternalPartners(partners);
    } else {
      globalCapitalApi
        .getPartners()
        .then((data) => setInternalPartners(Array.isArray(data) ? data : []))
        .catch(() => {});
    }
  }, [partners]);

  const [generating, setGenerating] = useState(false);
  const [statusMessage, setStatusMessage] = useState("");
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
  const [scope, setScope] = useState("closings"); // 'closings', 'partners', 'expenses', 'transactions'
  const [search, setSearch] = useState("");
  const [partnerId, setPartnerId] = useState("");
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

  // Single Dedicated Global Capital Report Handler (4 Essential Sheets)
  const handleDownloadGlobalCategoryReport = async () => {
    try {
      setGenerating(true);
      setStatusMessage("Compiling Global Capital Report (4 Essential Sheets · latest.xlsx)...");
      const reportData = await globalCapitalApi.getMasterBusinessLedger();
      let curPartners = internalPartners?.length ? internalPartners : partners;
      if (!curPartners || curPartners.length === 0) {
        try {
          const fresh = await globalCapitalApi.getPartners();
          curPartners = Array.isArray(fresh) ? fresh : [];
          setInternalPartners(curPartners);
        } catch (_) {}
      }
      let curTxs = transactions;
      if (!curTxs || curTxs.length === 0) {
        try {
          const fresh = await globalCapitalApi.getPartnerTransactions();
          curTxs = Array.isArray(fresh) ? fresh : [];
        } catch (_) {}
      }
      let curClosings = closings;
      if (!curClosings || curClosings.length === 0) {
        try {
          const fresh = await globalCapitalApi.getMonthlyClosings();
          curClosings = Array.isArray(fresh) ? fresh : [];
        } catch (_) {}
      }
      let curLedger = ledgerData?.ledger;
      if (!curLedger || curLedger.length === 0) {
        try {
          const fresh = await globalCapitalApi.getLedger();
          curLedger = fresh?.ledger || [];
        } catch (_) {}
      }
      exportGlobalCategoryReport(reportData, {
        partners: curPartners,
        transactions: curTxs,
        closings: curClosings,
        ledger: curLedger,
        expenses,
      });
      if (setNotice) {
        setNotice({
          type: "success",
          text: "Global Capital Report (4 Essential Sheets) downloaded successfully!",
        });
      }
    } catch (err) {
      console.error("Export error:", err);
      if (setNotice) {
        setNotice({
          type: "error",
          text: err.message || "Failed to export Global Capital report",
        });
      }
    } finally {
      setGenerating(false);
      setStatusMessage("");
    }
  };

  // Filtered closings
  const displayedClosings = useMemo(() => {
    return closings.filter((c) => {
      const pStr = `${c.year}-${String(c.month).padStart(2, "0")}`;
      if (appliedRange.from && `${pStr}-31` < appliedRange.from) return false;
      if (appliedRange.to && `${pStr}-01` > appliedRange.to) return false;
      const q = (search || "").trim().toLowerCase();
      if (q && !(c.monthName || pStr).toLowerCase().includes(q)) return false;
      if (status && (c.isCurrentMonth ? "IN_PROGRESS" : "FINALIZED") !== status) return false;
      return true;
    });
  }, [closings, appliedRange, search, status]);

  // Filtered partners
  const displayedPartners = useMemo(() => {
    return internalPartners.filter((p) => {
      const q = (search || "").trim().toLowerCase();
      if (q && !(p.name || p.partner_name || "").toLowerCase().includes(q) && !(p.phone || "").includes(q)) {
        return false;
      }
      if (partnerId && String(p.id) !== String(partnerId)) return false;
      if (status && (p.status || "ACTIVE") !== status) return false;
      return true;
    });
  }, [internalPartners, search, partnerId, status]);

  // Filtered expenses
  const displayedExpenses = useMemo(() => {
    return expenses.filter((e) => {
      const dateStr = (e.expense_date || e.date || "").slice(0, 10);
      if (appliedRange.from && dateStr && dateStr < appliedRange.from) return false;
      if (appliedRange.to && dateStr && dateStr > appliedRange.to) return false;
      const q = (search || "").trim().toLowerCase();
      if (q) {
        const desc = (e.description || e.title || "").toLowerCase();
        const cat = (e.category || e.categoryLabel || "").toLowerCase();
        if (!desc.includes(q) && !cat.includes(q)) return false;
      }
      return true;
    });
  }, [expenses, appliedRange, search]);

  // Aggregated totals
  const totalCapital = internalPartners.reduce((s, p) => s + Number(p.current_capital || p.capital || 0), 0);
  const totalNetProfit = displayedClosings.reduce((s, c) => s + Number(c.financials?.netProfit ?? c.net_profit ?? 0), 0);
  const totalAutoRev = displayedClosings.reduce((s, c) => s + Number(c.financials?.autoRevenue ?? c.auto_revenue ?? 0), 0);
  const totalDailyRev = displayedClosings.reduce((s, c) => s + Number(c.financials?.dailyRevenue ?? c.daily_revenue ?? 0), 0);
  const totalExp = displayedExpenses.reduce((s, e) => s + Number(e.amount || 0), 0);

  return (
    <section className="content">
      {/* Intro Header */}
      <div className="intro" style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "16px" }}>
        <div>
          <span className="overline" style={{ color: "#0f766e" }}>REPORTS</span>
          <h2>Global Capital Reports</h2>
          <p>
            Period corporate equity performance, partner profit shares, and single-click Excel export.
          </p>
        </div>

        {/* ONLY ONE PRIMARY EXCEL REPORT FOR GLOBAL CAPITAL */}
        <button
          type="button"
          className="primary"
          style={{
            background: "linear-gradient(135deg, #0f766e 0%, #115e59 100%)",
            borderColor: "#0f766e",
            color: "#ffffff",
            display: "inline-flex",
            alignItems: "center",
            gap: "8px",
            fontWeight: "700",
            padding: "10px 18px",
            fontSize: "13.5px",
            borderRadius: "10px",
            boxShadow: "0 2px 8px rgba(15, 118, 110, 0.25)",
            cursor: "pointer",
          }}
          onClick={handleDownloadGlobalCategoryReport}
          disabled={generating}
          title="Download complete Global Capital Category Report (4 Essential Sheets · latest.xlsx)"
        >
          <FileSpreadsheet size={16} />
          <span>{generating ? "Compiling..." : "Download Global Capital Report (.xlsx)"}</span>
        </button>
      </div>

      {statusMessage && (
        <div
          style={{
            padding: "10px 16px",
            background: "#f0fdfa",
            border: "1px solid #99f6e4",
            borderRadius: "10px",
            marginBottom: "16px",
            display: "flex",
            alignItems: "center",
            gap: "10px",
            fontSize: "13px",
            color: "#0f766e",
            fontWeight: 600,
          }}
        >
          <RefreshCw size={15} className="spin" />
          <span>{statusMessage}</span>
        </div>
      )}

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
          title="Scope of report view"
        >
          <option value="closings">View: Monthly Closings &amp; Partner Shares</option>
          <option value="partners">View: Partner Capital Accounts</option>
          <option value="expenses">View: Business Operating Expenses (Selavu)</option>
        </select>

        {/* Search Input */}
        <input
          placeholder="Search partner / description..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ minWidth: "200px" }}
        />

        {/* Partner Dropdown */}
        <select
          value={partnerId}
          onChange={(e) => setPartnerId(e.target.value)}
        >
          <option value="">All partners</option>
          {internalPartners.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name || p.partner_name}
            </option>
          ))}
        </select>

        {/* Status Dropdown */}
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
        >
          <option value="">All statuses</option>
          {scope === "closings" ? (
            <>
              <option value="FINALIZED">Finalized</option>
              <option value="IN_PROGRESS">In Progress</option>
            </>
          ) : (
            <>
              <option value="ACTIVE">Active</option>
              <option value="INACTIVE">Inactive</option>
            </>
          )}
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
          style={{ background: "#0f766e", borderColor: "#0f766e" }}
          onClick={handleRunReport}
        >
          Generate report
        </button>
      </div>

      {/* Metric Cards Grid */}
      <div className="metricGrid" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", marginBottom: "20px" }}>
        <div className="metric autoMetric blue">
          <span>Total Partner Capital</span>
          <b>{money(totalCapital)}</b>
          <small style={{ color: "#64748b", fontSize: "11.5px", marginTop: "4px", display: "block" }}>
            {internalPartners.length} Active Partners
          </small>
        </div>
        <div className="metric autoMetric green">
          <span>Period Net Profit</span>
          <b>{money(totalNetProfit)}</b>
          <small style={{ color: "#059669", fontSize: "11.5px", fontWeight: 600, marginTop: "4px", display: "block" }}>
            Operating Profit
          </small>
        </div>
        <div className="metric autoMetric">
          <span>Auto Module Revenue</span>
          <b>{money(totalAutoRev)}</b>
          <small style={{ color: "#0284c7", fontSize: "11.5px", fontWeight: 600, marginTop: "4px", display: "block" }}>
            Period Recovery
          </small>
        </div>
        <div className="metric autoMetric green">
          <span>Daily Vasul Revenue</span>
          <b>{money(totalDailyRev)}</b>
          <small style={{ color: "#059669", fontSize: "11.5px", fontWeight: 600, marginTop: "4px", display: "block" }}>
            Period Collections
          </small>
        </div>
        <div className="metric autoMetric red">
          <span>Period Expenses (Selavu)</span>
          <b>{money(totalExp)}</b>
          <small style={{ color: "#dc2626", fontSize: "11.5px", fontWeight: 600, marginTop: "4px", display: "block" }}>
            Operating Costs
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

      {/* Dynamic Results Table based on Scope */}
      <div className="card tableWrap">
        <div className="cardHead" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <h3 style={{ margin: 0 }}>
              {scope === "closings"
                ? "Monthly Closings & Partner Shares"
                : scope === "partners"
                ? "Partner Capital Accounts"
                : "Business Operating Expenses"}
            </h3>
            <p style={{ margin: "4px 0 0", fontSize: "12px", color: "#64748b" }}>
              {appliedRange.from} to {appliedRange.to}
              {partnerId ? ` · Partner filtered` : ""}
              {status ? ` · Status: ${status}` : ""}
              {search ? ` · Query: "${search}"` : ""}
            </p>
          </div>
          <span style={{ fontSize: "12px", color: "#64748b" }}>
            {scope === "closings"
              ? `${displayedClosings.length} Periods Found`
              : scope === "partners"
              ? `${displayedPartners.length} Partners Found`
              : `${displayedExpenses.length} Expenses Found`}
          </span>
        </div>

        {scope === "closings" && (
          <table>
            <thead>
              <tr>
                <th>Period</th>
                <th>Auto Revenue</th>
                <th>Daily Revenue</th>
                <th>Total Gross</th>
                <th>Operating Expenses</th>
                <th>Net Profit</th>
                <th>Partner Pool</th>
                <th>Company Share</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {displayedClosings.map((c, idx) => {
                const fin = c.financials || {};
                return (
                  <tr key={idx}>
                    <td>
                      <b>{c.monthName || `${c.year}-${String(c.month).padStart(2, "0")}`}</b>
                    </td>
                    <td className="greenText">{money(fin.autoRevenue ?? c.auto_revenue ?? 0)}</td>
                    <td className="greenText">{money(fin.dailyRevenue ?? c.daily_revenue ?? 0)}</td>
                    <td><b>{money(fin.grossRevenue ?? c.gross_revenue ?? 0)}</b></td>
                    <td className="redText">{money(fin.expenses ?? c.expenses_total ?? 0)}</td>
                    <td style={{ color: "#059669", fontWeight: 700 }}>
                      {money(fin.netProfit ?? c.net_profit ?? 0)}
                    </td>
                    <td>{money(fin.partnerPoolProfit ?? c.partner_pool_profit ?? 0)}</td>
                    <td>{money(fin.companyProfit ?? c.company_profit ?? 0)}</td>
                    <td>
                      <span
                        style={{
                          padding: "2px 8px",
                          borderRadius: "10px",
                          fontSize: "11px",
                          fontWeight: 600,
                          background: c.isCurrentMonth ? "#fef3c7" : "#dcfce7",
                          color: c.isCurrentMonth ? "#b45309" : "#15803d",
                        }}
                      >
                        {c.isCurrentMonth ? "In Progress" : "Finalized"}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}

        {scope === "partners" && (
          <table>
            <thead>
              <tr>
                <th>Partner Name</th>
                <th>Phone</th>
                <th>Base Contribution</th>
                <th>Current Capital</th>
                <th>Total Contributed</th>
                <th>Total Withdrawn</th>
                <th>Profit Credited</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {displayedPartners.map((p) => (
                <tr key={p.id}>
                  <td>
                    <b>{p.name || p.partner_name}</b>
                  </td>
                  <td>{p.phone || "—"}</td>
                  <td>{money(p.base_capital ?? p.initial_contribution ?? 0)}</td>
                  <td className="greenText">
                    <b>{money(p.current_capital ?? p.capital ?? 0)}</b>
                  </td>
                  <td>{money(p.total_contributed ?? p.contributed ?? 0)}</td>
                  <td>{money(p.total_withdrawn ?? p.withdrawn ?? 0)}</td>
                  <td style={{ color: "#059669", fontWeight: 700 }}>
                    {money(p.profit_earned ?? p.profit ?? 0)}
                  </td>
                  <td>
                    <span
                      style={{
                        padding: "2px 8px",
                        borderRadius: "10px",
                        fontSize: "11px",
                        fontWeight: 600,
                        background: "#dcfce7",
                        color: "#15803d",
                      }}
                    >
                      {p.status || "ACTIVE"}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {scope === "expenses" && (
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Description</th>
                <th>Category</th>
                <th>Amount</th>
              </tr>
            </thead>
            <tbody>
              {displayedExpenses.map((e, idx) => (
                <tr key={idx}>
                  <td>{e.expense_date ? String(e.expense_date).slice(0, 10) : e.date || "—"}</td>
                  <td><b>{e.description || e.title || "—"}</b></td>
                  <td>
                    <span style={{ padding: "2px 8px", borderRadius: "8px", background: "#f1f5f9", fontSize: "11.5px", fontWeight: 600 }}>
                      {e.categoryLabel || e.category || "GENERAL"}
                    </span>
                  </td>
                  <td className="redText">
                    <b>{money(e.amount || 0)}</b>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </section>
  );
}
