import React from "react";
import {
  Calendar,
  RefreshCw,
  Zap,
  Users,
  Eye,
  Check,
  Download,
} from "lucide-react";
import { money } from "../utils/formatters.js";
import { exportSingleMonthClosing } from "../services/globalCapitalExportUtils.js";
import DayToDayCalculationLog from "./DayToDayCalculationLog.jsx";

export default function MonthlyClosingTab({
  currentMonthEstimate,
  loadingEstimate,
  onRefreshEstimate,
  cronStatus,
  runningCron,
  onTriggerCron,
  dailyLogsData,
  loadingDailyLogs,
  runningDailyCalc,
  onRefreshDailyLogs,
  onRunDailyCalc,
  onViewDailyDetail,
  onOpenSegmentModal,
  passedMonthsList,
  historyYear,
  setHistoryYear,
  historyMonth,
  setHistoryMonth,
  historyMonthData,
  loadingHistoryMonth,
  onFetchHistoryMonth,
}) {
  // Use historyMonthData if user selected a month or loaded, otherwise fallback to currentMonthEstimate
  const displayData = historyMonthData || currentMonthEstimate;
  const isLoading = loadingHistoryMonth || loadingEstimate;

  const handleMonthChange = (y, m) => {
    setHistoryYear(y);
    setHistoryMonth(m);
    onFetchHistoryMonth(y, m);
  };

  return (
    <div className="financeFadeIn globalCapitalView">
      {/* ========================================================================= */}
      {/* SECTION 1: UNIFIED MONTHLY CLOSING & PARTNER PROFIT SHARES (FIRST)        */}
      {/* ========================================================================= */}
      <div>
        <div className="financeCard globalCapitalCard" style={{ marginBottom: "20px" }}>
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
            <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
                  <h3 style={{ margin: 0 }}>
                    <Calendar size={18} /> {displayData?.monthName || "Monthly Closing"} {historyYear}
                  </h3>
                  <span
                    className={`liveBadge ${
                      displayData?.isCurrentMonth ? "accumulating" : "finalized"
                    }`}
                  >
                    {displayData?.isCurrentMonth ? (
                      <>
                        <span className="pulseDot"></span>
                        LIVE ({displayData?.daysElapsed || 0} of {displayData?.totalDaysInMonth || 30} Days) · Ongoing Month
                      </>
                    ) : (
                      <>
                        <Check size={12} /> Finalized Month
                      </>
                    )}
                  </span>
                </div>
                <small style={{ color: "#64748b" }}>
                  Billing Period: {displayData?.periodStart} to {displayData?.asOfDate || displayData?.periodEnd}
                </small>
              </div>
            </div>

            {/* In-Page Month Filter Controls & Export */}
            <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
              {/* Month Calendar Picker */}
              <div
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "6px",
                  background: "#ffffff",
                  padding: "4px 10px",
                  borderRadius: "8px",
                  border: "1px solid #cbd5e1",
                }}
                title="Select month to view audit & profit shares"
              >
                <Calendar size={15} color="#0f766e" />
                <input
                  type="month"
                  value={`${historyYear}-${String(historyMonth).padStart(2, "0")}`}
                  onChange={(e) => {
                    if (e.target.value) {
                      const [yStr, mStr] = e.target.value.split("-");
                      handleMonthChange(parseInt(yStr, 10), parseInt(mStr, 10));
                    }
                  }}
                  style={{
                    border: "none",
                    outline: "none",
                    fontSize: "12.5px",
                    color: "#1e293b",
                    fontWeight: "600",
                    background: "transparent",
                    cursor: "pointer",
                  }}
                />
              </div>

              {/* Month Dropdown */}
              <select
                value={historyMonth}
                onChange={(e) => handleMonthChange(historyYear, parseInt(e.target.value, 10))}
                style={{
                  padding: "6px 12px",
                  borderRadius: "6px",
                  border: "1px solid #cbd5e1",
                  fontSize: "12.5px",
                  fontWeight: "600",
                }}
              >
                {[
                  "January", "February", "March", "April", "May", "June",
                  "July", "August", "September", "October", "November", "December"
                ].map((name, idx) => (
                  <option key={name} value={idx + 1}>
                    {name}
                  </option>
                ))}
              </select>

              {/* Year Dropdown */}
              <select
                value={historyYear}
                onChange={(e) => handleMonthChange(parseInt(e.target.value, 10), historyMonth)}
                style={{
                  padding: "6px 12px",
                  borderRadius: "6px",
                  border: "1px solid #cbd5e1",
                  fontSize: "12.5px",
                  fontWeight: "600",
                }}
              >
                {[2024, 2025, 2026, 2027, 2028].map((y) => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
              </select>

              {/* Export Month Report */}
              <button
                type="button"
                className="secondaryBtn"
                onClick={() =>
                  exportSingleMonthClosing(
                    displayData,
                    historyYear,
                    historyMonth
                  )
                }
                title="Export selected month closing & partner profit shares to Excel"
              >
                <Download size={13} />
                <span>Export Month (Excel)</span>
              </button>

              {/* Refresh Button */}
              <button
                type="button"
                className="secondaryBtn"
                onClick={() => {
                  onFetchHistoryMonth(historyYear, historyMonth);
                  if (displayData?.isCurrentMonth) onRefreshEstimate();
                }}
                title="Refresh month data"
              >
                {isLoading ? (
                  <RefreshCw size={13} className="spin" />
                ) : (
                  <RefreshCw size={13} />
                )}
                <span>Refresh</span>
              </button>
            </div>
          </div>

          {/* Quick Past Months Pills */}
          {passedMonthsList && passedMonthsList.length > 0 && (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "6px",
                flexWrap: "wrap",
                padding: "8px 14px",
                background: "#f8fafc",
                borderTop: "1px solid #f1f5f9",
                borderRadius: "0 0 10px 10px",
              }}
            >
              <span style={{ fontSize: "11px", fontWeight: "700", color: "#64748b", textTransform: "uppercase" }}>
                Quick Past Months:
              </span>
              {passedMonthsList.slice(0, 6).map((pm) => {
                const isSelected = pm.year === historyYear && pm.month === historyMonth;
                return (
                  <button
                    key={`${pm.year}-${pm.month}`}
                    type="button"
                    style={{
                      background: isSelected ? "#0f766e" : "#ffffff",
                      color: isSelected ? "#ffffff" : "#475569",
                      border: `1px solid ${isSelected ? "#0f766e" : "#cbd5e1"}`,
                      borderRadius: "6px",
                      padding: "3px 8px",
                      fontSize: "11.5px",
                      fontWeight: "600",
                      cursor: "pointer",
                      transition: "all 0.15s ease",
                    }}
                    onClick={() => handleMonthChange(pm.year, pm.month)}
                  >
                    {pm.label}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Dynamic Financial KPI Cards for the Selected Month */}
        <div className="globalCapitalStats fourCol" style={{ marginBottom: "20px" }}>
          <div>
            <span>Total Revenue</span>
            <strong style={{ color: "#0f766e" }}>
              +{money(
                displayData?.financials?.totalRevenue != null
                  ? displayData.financials.totalRevenue
                  : (Number(displayData?.financials?.autoRevenue || 0) + Number(displayData?.financials?.dailyRevenue || 0))
              )}
            </strong>
            <small>Auto: {money(displayData?.financials?.autoRevenue)} • Daily: {money(displayData?.financials?.dailyRevenue)}</small>
          </div>
          <div>
            <span>Auto Revenue</span>
            <strong style={{ color: "#0f766e" }}>
              +{money(displayData?.financials?.autoRevenue)}
            </strong>
            <small>Auto loan interest collected</small>
          </div>
          <div>
            <span>Expenses</span>
            <strong style={{ color: "#e11d48" }}>
              -{money(displayData?.financials?.expenses)}
            </strong>
            <small>Total expenses in period</small>
          </div>
          <div>
            <span>Net Profit ({displayData?.isCurrentMonth ? "Live" : "Finalized"})</span>
            <strong style={{ color: "#059669" }}>
              {money(
                displayData?.expectedDistributableProfit != null
                  ? displayData.expectedDistributableProfit
                  : displayData?.financials?.netProfit
              )}
            </strong>
            <small>Distributable to partners</small>
          </div>
        </div>

        {/* Partner Profit Shares Table for Selected Month */}
        <div className="financeCard globalCapitalCard">
          <div
            className="cardHead"
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              flexWrap: "wrap",
              gap: "10px",
            }}
          >
            <div>
              <h3 style={{ margin: 0 }}>
                <Users size={18} /> Partner Profit Shares ({displayData?.monthName || "Selected Month"} {historyYear})
              </h3>
              <small style={{ color: "#64748b" }}>
                Time-weighted capital days allocation for {displayData?.monthName} {historyYear}.
              </small>
            </div>
            <span style={{ fontSize: "12.5px", color: "#0f766e", fontWeight: "600" }}>
              Total Capital Weight:{" "}
              {Number(displayData?.totalCapitalWeight || 0).toLocaleString("en-IN", {
                maximumFractionDigits: 0,
              })}{" "}
              Capital-Days
            </span>
          </div>

          <div className="tableResponsive tableScroll">
            <table className="financeTable">
              <thead>
                <tr>
                  <th>Partner</th>
                  <th style={{ textAlign: "right" }}>Opening Capital</th>
                  <th style={{ textAlign: "right" }}>Closing / Current Capital</th>
                  <th style={{ textAlign: "center" }}>Share %</th>
                  <th style={{ textAlign: "right" }}>{displayData?.isCurrentMonth ? "Estimated Profit" : "Profit Earned"}</th>
                  <th style={{ textAlign: "center" }}>Status</th>
                  <th style={{ textAlign: "center" }}>Segments</th>
                </tr>
              </thead>
              <tbody>
                {(displayData?.allocations || []).map((alloc) => {
                  const ratio = Number(alloc.profitRatio || 0);
                  const weight = Number(alloc.capitalWeight || 0);
                  const profitVal = Number(alloc.allocatedProfit != null ? alloc.allocatedProfit : alloc.expectedProfit || 0);

                  return (
                    <tr key={alloc.partnerId}>
                      <td>
                        <strong style={{ fontSize: "14px", color: "#0f172a" }}>
                          {alloc.partnerName}
                        </strong>
                      </td>
                      <td style={{ textAlign: "right", color: "#64748b" }}>
                        {money(alloc.openingCapital)}
                      </td>
                      <td style={{ textAlign: "right", fontWeight: "600", color: "#0f766e" }}>
                        {money(alloc.closingCapital)}
                      </td>
                      <td style={{ textAlign: "center" }}>
                        <span className="profitRatioPill">
                          {(ratio * 100).toFixed(2)}%
                        </span>
                      </td>
                      <td
                        style={{
                          textAlign: "right",
                          fontWeight: "700",
                          fontSize: "14px",
                          color: "#059669",
                        }}
                      >
                        +{money(profitVal)}
                      </td>
                      <td style={{ textAlign: "center" }}>
                        <span
                          className={`statusPill ${
                            displayData?.isCurrentMonth ? "active" : "completed"
                          }`}
                          style={{ fontSize: "11px" }}
                        >
                          {displayData?.isCurrentMonth ? "Auto-credits on 1st" : "Credited"}
                        </span>
                      </td>
                      <td style={{ textAlign: "center" }}>
                        <button
                          type="button"
                          className="actionIconBtn"
                          title="View Segment Breakdown"
                          onClick={() =>
                            onOpenSegmentModal({
                              partnerName: alloc.partnerName,
                              periodStart: displayData?.periodStart,
                              periodEnd: displayData?.asOfDate || displayData?.periodEnd,
                              segments: alloc.segmentBreakdown || [],
                              totalWeight: weight,
                            })
                          }
                        >
                          <Eye size={14} /> Segments
                        </button>
                      </td>
                    </tr>
                  );
                })}
                {(!displayData?.allocations || displayData.allocations.length === 0) && (
                  <tr>
                    <td
                      colSpan="7"
                      style={{ textAlign: "center", padding: "28px", color: "#94a3b8" }}
                    >
                      No active partner capital or profit recorded for {displayData?.monthName || "this month"}.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Day-to-Day Income / Loss Calculation Log */}
        <DayToDayCalculationLog
          dailyLogsData={dailyLogsData}
          loadingDailyLogs={loadingDailyLogs}
          runningDailyCalc={runningDailyCalc}
          onRefresh={onRefreshDailyLogs}
          onRunDailyCalc={onRunDailyCalc}
          onViewDetails={onViewDailyDetail}
        />

        {/* Date 1 Automation Card */}
        <div className="cronBannerBox" style={{ marginTop: "20px" }}>
          <div className="cronBannerLeft">
            <div className="cronPulseBadge">
              <span className="pulseDot"></span>
              <strong>DAILY CALCULATION (11:59 PM) + MONTHLY FINAL CLOSING (DATE 1)</strong>
            </div>
            <p>
              <strong>Daily:</strong> The system automatically calculates revenue, expenses, active capital days, and expected profit every night at 11:59 PM.
              <br />
              <strong>Monthly:</strong> On the 1st of every month at 12:01 AM, the completed month is finalized and the profit is credited to each partner's capital balance.
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: "6px", marginTop: "8px" }}>
              {cronStatus?.lastDailyCalculation && (
                <div className="cronLastRunInfo">
                  <span>Daily Calculation:</span>
                  <strong>
                    Up to {cronStatus.lastDailyCalculation.calcDate || cronStatus.lastDailyCalculation.asOfDate} ({cronStatus.lastDailyCalculation.daysElapsed || cronStatus.lastDailyCalculation.mtdTotals?.daysRecorded || 0} days)
                  </strong>
                  <span>• Net Profit:</span>
                  <strong style={{ color: "#059669" }}>
                    {money(
                      cronStatus.lastDailyCalculation.financials?.netProfit != null
                        ? cronStatus.lastDailyCalculation.financials.netProfit
                        : cronStatus.lastDailyCalculation.expectedDistributableProfit
                    )}
                  </strong>
                  <span>• {cronStatus.lastDailyCalculation.partnersCount || 0} active partners</span>
                </div>
              )}
              {cronStatus?.lastExecution && (
                <div className="cronLastRunInfo">
                  <span>Last Final Closing:</span>
                  <strong>
                    {cronStatus.lastExecution.periodStart} to {cronStatus.lastExecution.periodEnd}
                  </strong>
                  <span>• Net Profit Credited:</span>
                  <strong style={{ color: "#059669" }}>
                    {money(cronStatus.lastExecution.distributableProfit)}
                  </strong>
                  <span>• Credited to {cronStatus.lastExecution.partnersCount || 0} partners</span>
                </div>
              )}
            </div>
          </div>
          <div className="cronBannerRight">
            <button
              type="button"
              className="primaryBtn"
              style={{ background: "linear-gradient(135deg, #0f766e, #047857)" }}
              disabled={runningCron}
              onClick={onTriggerCron}
              title="Finalize monthly closing immediately"
            >
              {runningCron ? (
                <RefreshCw size={14} className="spin" />
              ) : (
                <Zap size={14} />
              )}
              <span>{runningCron ? "Closing..." : "Run Monthly Closing Now"}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
