import React, { useState, useMemo } from "react";
import {
  Calendar,
  RefreshCw,
  Calculator,
  Eye,
  Download,
  Search,
  X,
  RotateCcw,
} from "lucide-react";
import { money } from "../utils/formatters.js";
import { exportDayToDayLogs } from "../services/globalCapitalExportUtils.js";

export default function DayToDayCalculationLog({
  dailyLogsData,
  loadingDailyLogs,
  runningDailyCalc,
  onRefresh,
  onRunDailyCalc,
  onViewDetails,
}) {
  const currentMonthStr = new Date().toISOString().slice(0, 7);
  const [monthFilter, setMonthFilter] = useState(currentMonthStr);
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [dateSearch, setDateSearch] = useState("");

  const rawLogs = dailyLogsData?.logs || [];

  const filteredLogs = useMemo(() => {
    return rawLogs.filter((l) => {
      // 1. Month Calendar filter (YYYY-MM)
      if (monthFilter) {
        const lMonth = String(l.calcDate || "").slice(0, 7);
        if (lMonth !== monthFilter) return false;
      }

      // 2. Status filter
      if (statusFilter === "PROFIT" && Number(l.netProfit || 0) < 0) return false;
      if (statusFilter === "LOSS" && Number(l.netProfit || 0) >= 0) return false;

      // 3. Date Search
      if (dateSearch.trim()) {
        const q = dateSearch.toLowerCase().trim();
        if (!String(l.calcDate || "").toLowerCase().includes(q)) return false;
      }

      return true;
    });
  }, [rawLogs, monthFilter, statusFilter, dateSearch]);

  const filteredAutoRev = useMemo(() => {
    return filteredLogs.reduce((sum, l) => sum + Number(l.autoRevenue || 0), 0);
  }, [filteredLogs]);

  const filteredDailyRev = useMemo(() => {
    return filteredLogs.reduce((sum, l) => sum + Number(l.dailyRevenue || 0), 0);
  }, [filteredLogs]);

  const filteredTotalRev = filteredAutoRev + filteredDailyRev;

  const filteredExpenses = useMemo(() => {
    return filteredLogs.reduce((sum, l) => sum + Number(l.expenses || 0), 0);
  }, [filteredLogs]);

  const filteredNetProfit = useMemo(() => {
    return filteredLogs.reduce((sum, l) => sum + Number(l.netProfit || 0), 0);
  }, [filteredLogs]);

  const avgDailyProfit = filteredLogs.length > 0 ? filteredNetProfit / filteredLogs.length : 0;

  const todayStr = new Date().toISOString().slice(0, 10);
  const todayLog =
    rawLogs.find((l) => l.calcDate === todayStr) ||
    rawLogs[rawLogs.length - 1];

  const isTodayProfit = todayLog ? todayLog.netProfit >= 0 : true;

  const isFiltered = monthFilter !== currentMonthStr || statusFilter !== "ALL" || dateSearch.trim() !== "";

  return (
    <div className="financeCard globalCapitalCard" style={{ marginTop: "24px" }}>
      <div
        className="cardHead"
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "12px",
        }}
      >
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <h3 style={{ margin: 0 }}>
              <Calendar size={18} /> Day-to-Day Income &amp; Loss Calculation
            </h3>
            <span
              className="liveBadge"
              style={{ background: "#f0fdf4", color: "#166534", borderColor: "#bbf7d0" }}
            >
              Midnight Cron (23:59)
            </span>
          </div>
          <small style={{ color: "#64748b" }}>
            Calculates today's income or loss at midnight day-to-day. On Date 1, the monthly final closing aggregates the entire month.
          </small>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
          <button
            type="button"
            className="secondaryBtn"
            style={{ background: "#f8fafc", borderColor: "#cbd5e1" }}
            onClick={() => exportDayToDayLogs({ ...dailyLogsData, logs: filteredLogs }, monthFilter || "")}
            title="Export Day-to-Day calculation logs to Excel"
          >
            <Download size={13} />
            <span>Export Logs (Excel){filteredLogs.length < rawLogs.length ? ` (${filteredLogs.length})` : ""}</span>
          </button>

          <button
            type="button"
            className="secondaryBtn"
            style={{ background: "#f8fafc", borderColor: "#cbd5e1" }}
            disabled={loadingDailyLogs}
            onClick={onRefresh}
            title="Refresh day-by-day logs"
          >
            <RefreshCw size={13} className={loadingDailyLogs ? "spin" : ""} />
            <span>Refresh Logs</span>
          </button>

          <button
            type="button"
            className="primaryBtn"
            style={{
              background: "linear-gradient(135deg, #0284c7, #0369a1)",
              padding: "7px 14px",
              fontSize: "12px",
            }}
            disabled={runningDailyCalc}
            onClick={() => onRunDailyCalc()}
            title="Calculate today's income or loss immediately"
          >
            {runningDailyCalc ? (
              <RefreshCw size={13} className="spin" />
            ) : (
              <Calculator size={13} />
            )}
            <span>{runningDailyCalc ? "Calculating..." : "Calculate Today Now"}</span>
          </button>
        </div>
      </div>

      {/* Filter Bar with Month Calendar & Status for Day-to-Day */}
      <div
        className="expenseFilterBar"
        style={{
          margin: "14px 0 12px",
          padding: "10px 14px",
          background: "#f8fafc",
          borderRadius: "8px",
          border: "1px solid #e2e8f0",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "10px",
        }}
      >
        <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
          {[
            { id: "ALL", label: "All Days" },
            { id: "PROFIT", label: "Profit Days (+)" },
            { id: "LOSS", label: "Loss Days (-)" },
          ].map((st) => (
            <button
              key={st.id}
              type="button"
              className={`secondaryBtn ${statusFilter === st.id ? "active" : ""}`}
              style={{
                background: statusFilter === st.id ? "#0f766e" : "#ffffff",
                color: statusFilter === st.id ? "#ffffff" : "#475569",
                borderColor: statusFilter === st.id ? "#0f766e" : "#cbd5e1",
                padding: "4px 10px",
                fontSize: "11.5px",
                fontWeight: "600",
              }}
              onClick={() => setStatusFilter(st.id)}
            >
              {st.label}
            </button>
          ))}
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
          {/* Month Calendar Picker */}
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
              background: "#ffffff",
              padding: "4px 8px",
              borderRadius: "6px",
              border: "1px solid #cbd5e1",
            }}
            title="Filter by Month Calendar"
          >
            <Calendar size={14} color="#0f766e" />
            <input
              type="month"
              value={monthFilter}
              onChange={(e) => setMonthFilter(e.target.value)}
              style={{
                border: "none",
                outline: "none",
                fontSize: "12px",
                color: "#1e293b",
                fontWeight: "500",
                background: "transparent",
                cursor: "pointer",
              }}
              title="Filter logs by month calendar"
            />
            {monthFilter && (
              <button
                type="button"
                onClick={() => setMonthFilter("")}
                style={{
                  border: "none",
                  background: "transparent",
                  color: "#94a3b8",
                  cursor: "pointer",
                  padding: "0 2px",
                }}
                title="Clear Month Filter"
              >
                <X size={12} />
              </button>
            )}
          </div>

          <div className="expenseSearchInput" style={{ minWidth: "160px" }}>
            <Search size={13} color="#94a3b8" />
            <input
              type="text"
              placeholder="Search date (e.g. 2026-09)..."
              value={dateSearch}
              onChange={(e) => setDateSearch(e.target.value)}
              style={{ fontSize: "11.5px", padding: "4px 8px" }}
            />
            {dateSearch && (
              <button
                type="button"
                onClick={() => setDateSearch("")}
                style={{ border: "none", background: "none", cursor: "pointer", color: "#94a3b8", padding: 0 }}
              >
                <X size={12} />
              </button>
            )}
          </div>

          {isFiltered && (
            <button
              type="button"
              className="secondaryBtn"
              style={{ padding: "4px 8px", fontSize: "11px", display: "inline-flex", alignItems: "center", gap: "4px" }}
              onClick={() => {
                setMonthFilter(currentMonthStr);
                setStatusFilter("ALL");
                setDateSearch("");
              }}
            >
              <RotateCcw size={11} /> Reset
            </button>
          )}
        </div>
      </div>

      {/* DYNAMIC GRID ANALYTICS CARDS (BASED ON ACTIVE FILTERS) */}
      <div
        className="globalCapitalStats fiveCol"
        style={{
          margin: "12px 0 16px",
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))",
          gap: "12px",
        }}
      >
        <div style={{ background: "#f8fafc", padding: "12px 14px", borderRadius: "10px", border: "1px solid #e2e8f0" }}>
          <span style={{ fontSize: "11.5px", color: "#64748b", fontWeight: "600", textTransform: "uppercase" }}>Filtered Days</span>
          <strong style={{ display: "block", fontSize: "19px", color: "#0f172a", marginTop: "3px" }}>{filteredLogs.length} Days</strong>
          <small style={{ color: "#64748b", fontSize: "11.5px" }}>{monthFilter ? `Month: ${monthFilter}` : "All Recorded Days"}</small>
        </div>
        <div style={{ background: "#f8fafc", padding: "12px 14px", borderRadius: "10px", border: "1px solid #e2e8f0" }}>
          <span style={{ fontSize: "11.5px", color: "#64748b", fontWeight: "600", textTransform: "uppercase" }}>Total Revenue</span>
          <strong style={{ display: "block", fontSize: "19px", color: "#059669", marginTop: "3px" }}>+{money(filteredTotalRev)}</strong>
          <small style={{ color: "#059669", fontSize: "11.5px" }}>Auto: {money(filteredAutoRev)} • Daily: {money(filteredDailyRev)}</small>
        </div>
        <div style={{ background: "#f8fafc", padding: "12px 14px", borderRadius: "10px", border: "1px solid #e2e8f0" }}>
          <span style={{ fontSize: "11.5px", color: "#64748b", fontWeight: "600", textTransform: "uppercase" }}>Total Expenses</span>
          <strong style={{ display: "block", fontSize: "19px", color: "#e11d48", marginTop: "3px" }}>-{money(filteredExpenses)}</strong>
          <small style={{ color: "#e11d48", fontSize: "11.5px" }}>Business operations &amp; fees</small>
        </div>
        <div style={{ background: "#f8fafc", padding: "12px 14px", borderRadius: "10px", border: "1px solid #e2e8f0" }}>
          <span style={{ fontSize: "11.5px", color: "#64748b", fontWeight: "600", textTransform: "uppercase" }}>Net Income / Loss</span>
          <strong style={{ display: "block", fontSize: "19px", color: filteredNetProfit >= 0 ? "#059669" : "#e11d48", marginTop: "3px" }}>
            {filteredNetProfit >= 0 ? "+" : ""}{money(filteredNetProfit)}
          </strong>
          <small style={{ color: filteredNetProfit >= 0 ? "#059669" : "#e11d48", fontSize: "11.5px", fontWeight: "600" }}>
            {filteredNetProfit >= 0 ? "Net Profit in Filter" : "Net Loss in Filter"}
          </small>
        </div>
        <div style={{ background: "#f8fafc", padding: "12px 14px", borderRadius: "10px", border: "1px solid #e2e8f0" }}>
          <span style={{ fontSize: "11.5px", color: "#64748b", fontWeight: "600", textTransform: "uppercase" }}>Avg Daily Net</span>
          <strong style={{ display: "block", fontSize: "19px", color: avgDailyProfit >= 0 ? "#0f766e" : "#e11d48", marginTop: "3px" }}>
            {avgDailyProfit >= 0 ? "+" : ""}{money(avgDailyProfit)}
          </strong>
          <small style={{ color: "#64748b", fontSize: "11.5px" }}>Per recorded active day</small>
        </div>
      </div>

      {/* Today's Highlight Bar */}
      {todayLog && (
        <div
          style={{
            margin: "12px 0 16px",
            padding: "12px 18px",
            borderRadius: "10px",
            background: isTodayProfit
              ? "linear-gradient(135deg, #ecfdf5 0%, #f0fdf4 100%)"
              : "linear-gradient(135deg, #fff1f2 0%, #ffe4e6 100%)",
            border: `1px solid ${isTodayProfit ? "#a7f3d0" : "#fecdd3"}`,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: "12px",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <div
              style={{
                padding: "6px 12px",
                borderRadius: "20px",
                fontWeight: "700",
                fontSize: "12px",
                background: isTodayProfit ? "#059669" : "#e11d48",
                color: "#ffffff",
                display: "flex",
                alignItems: "center",
                gap: "6px",
              }}
            >
              {isTodayProfit ? "TODAY'S NET INCOME" : "TODAY'S NET LOSS"}
            </div>
            <span
              style={{
                fontSize: "18px",
                fontWeight: "800",
                color: isTodayProfit ? "#065f46" : "#9f1239",
              }}
            >
              {isTodayProfit ? "+" : ""}
              {money(todayLog.netProfit)}
            </span>
            <span style={{ fontSize: "12px", color: "#64748b" }}>
              ({todayLog.calcDate})
            </span>
          </div>

          <div
            style={{
              display: "flex",
              gap: "16px",
              fontSize: "12px",
              color: "#334155",
              flexWrap: "wrap",
            }}
          >
            <span>
              Auto Rev:{" "}
              <strong style={{ color: "#0f766e" }}>
                +{money(todayLog.autoRevenue)}
              </strong>
            </span>
            <span>
              Daily Rev:{" "}
              <strong style={{ color: "#0f766e" }}>
                +{money(todayLog.dailyRevenue)}
              </strong>
            </span>
            <span>
              Expenses:{" "}
              <strong style={{ color: "#e11d48" }}>
                -{money(todayLog.expenses)}
              </strong>
            </span>
            <span>
              Active Capital:{" "}
              <strong>{money(todayLog.totalActiveCapital)}</strong>
            </span>
          </div>
        </div>
      )}

      {/* Day-to-Day Table */}
      <div className="tableResponsive tableScroll">
        <table className="financeTable">
          <thead>
            <tr>
              <th>Date</th>
              <th style={{ textAlign: "right" }}>Auto Rev</th>
              <th style={{ textAlign: "right" }}>Daily Rev</th>
              <th style={{ textAlign: "right" }}>Total Rev</th>
              <th style={{ textAlign: "right" }}>Expenses</th>
              <th style={{ textAlign: "right" }}>Net Income / Loss</th>
              <th style={{ textAlign: "right" }}>Active Capital</th>
              <th style={{ textAlign: "center" }}>Partner Shares</th>
            </tr>
          </thead>
          <tbody>
            {filteredLogs.map((log) => {
              const isToday = log.calcDate === todayStr;
              const isProfit = log.netProfit >= 0;

              return (
                <tr
                  key={log.id || log.calcDate}
                  style={isToday ? { background: "rgba(2, 132, 199, 0.04)" } : undefined}
                >
                  <td>
                    <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                      <strong style={{ fontSize: "13px", color: "#0f172a" }}>
                        {log.calcDate}
                      </strong>
                      {isToday && (
                        <span
                          style={{
                            fontSize: "10px",
                            padding: "2px 6px",
                            borderRadius: "10px",
                            background: "#0284c7",
                            color: "#ffffff",
                            fontWeight: "700",
                          }}
                        >
                          TODAY
                        </span>
                      )}
                    </div>
                  </td>
                  <td style={{ textAlign: "right", color: "#0f766e", fontSize: "12px" }}>
                    +{money(log.autoRevenue)}
                  </td>
                  <td style={{ textAlign: "right", color: "#0f766e", fontSize: "12px" }}>
                    +{money(log.dailyRevenue)}
                  </td>
                  <td style={{ textAlign: "right", fontWeight: "600", fontSize: "12px" }}>
                    {money(log.totalRevenue)}
                  </td>
                  <td style={{ textAlign: "right", color: "#e11d48", fontSize: "12px" }}>
                    {Number(log.expenses || 0) > 0 ? `-${money(log.expenses)}` : "₹0.00"}
                  </td>
                  <td style={{ textAlign: "right", fontWeight: "700" }}>
                    <span
                      style={{
                        padding: "3px 8px",
                        borderRadius: "6px",
                        fontSize: "12px",
                        background: isProfit ? "#ecfdf5" : "#fff1f2",
                        color: isProfit ? "#059669" : "#e11d48",
                        display: "inline-block",
                      }}
                    >
                      {isProfit ? "+" : ""}
                      {money(log.netProfit)}
                    </span>
                  </td>
                  <td style={{ textAlign: "right", fontSize: "12px", fontFamily: "monospace" }}>
                    {money(log.totalActiveCapital)}
                  </td>
                  <td style={{ textAlign: "center" }}>
                    <button
                      type="button"
                      className="actionIconBtn"
                      title="View each partner's share for this day"
                      onClick={() => onViewDetails(log)}
                    >
                      <Eye size={13} /> {log.allocations?.length || 0} Partners
                    </button>
                  </td>
                </tr>
              );
            })}
            {filteredLogs.length === 0 && (
              <tr>
                <td colSpan="8" style={{ textAlign: "center", padding: "28px", color: "#94a3b8" }}>
                  {loadingDailyLogs
                    ? "Loading daily logs..."
                    : rawLogs.length > 0
                    ? "No day-to-day calculation logs found matching the applied filters."
                    : "No daily records found. Click 'Calculate Today Now' to compute."}
                </td>
              </tr>
            )}
          </tbody>
          {dailyLogsData?.totals && (
            <tfoot>
              <tr style={{ background: "#f8fafc", fontWeight: "700", borderTop: "2px solid #e2e8f0" }}>
                <td>Month Total ({dailyLogsData.count} Days)</td>
                <td style={{ textAlign: "right", color: "#0f766e" }}>
                  +{money(dailyLogsData.totals.autoRevenue)}
                </td>
                <td style={{ textAlign: "right", color: "#0f766e" }}>
                  +{money(dailyLogsData.totals.dailyRevenue)}
                </td>
                <td style={{ textAlign: "right" }}>
                  {money(dailyLogsData.totals.totalRevenue)}
                </td>
                <td style={{ textAlign: "right", color: "#e11d48" }}>
                  -{money(dailyLogsData.totals.expenses)}
                </td>
                <td
                  style={{
                    textAlign: "right",
                    color: dailyLogsData.totals.netProfit >= 0 ? "#059669" : "#e11d48",
                  }}
                >
                  {dailyLogsData.totals.netProfit >= 0 ? "+" : ""}
                  {money(dailyLogsData.totals.netProfit)}
                </td>
                <td colSpan="2" style={{ textAlign: "center", fontSize: "11px", color: "#64748b" }}>
                  Accumulated Day-to-Day Total
                </td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>
    </div>
  );
}
