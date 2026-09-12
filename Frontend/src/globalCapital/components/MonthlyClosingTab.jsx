import React from "react";
import {
  Calendar,
  RefreshCw,
  Zap,
  Users,
  Eye,
  Check,
} from "lucide-react";
import { money } from "../utils/formatters.js";
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
  return (
    <div className="financeFadeIn globalCapitalView">
      {/* ========================================================================= */}
      {/* SECTION 1: CURRENT ONGOING MONTH (LIVE) */}
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
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <h3 style={{ margin: 0 }}>
                    <Calendar size={18} /> {currentMonthEstimate?.monthName || "Current Month"}
                  </h3>
                  <span className="liveBadge">
                    <span className="pulseDot"></span>
                    LIVE ({currentMonthEstimate?.daysElapsed || 0} of {currentMonthEstimate?.totalDaysInMonth || 30} Days)
                  </span>
                </div>
                <small style={{ color: "#64748b" }}>
                  Billing Period: {currentMonthEstimate?.periodStart} to {currentMonthEstimate?.asOfDate}
                </small>
              </div>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
              <div style={{ textAlign: "right" }}>
                <span
                  style={{
                    fontSize: "11px",
                    color: "#64748b",
                    fontWeight: "600",
                    textTransform: "uppercase",
                  }}
                >
                  Estimated Net Profit
                </span>
                <div style={{ fontSize: "20px", fontWeight: "800", color: "#059669" }}>
                  {money(currentMonthEstimate?.expectedDistributableProfit)}
                </div>
              </div>
              <button
                type="button"
                className="secondaryBtn"
                onClick={onRefreshEstimate}
                title="Refresh current month"
              >
                {loadingEstimate ? <RefreshCw size={13} className="spin" /> : <RefreshCw size={13} />}
                <span>Refresh</span>
              </button>
            </div>
          </div>
        </div>

        {/* 4 Financial KPI Cards */}
        <div className="globalCapitalStats fourCol" style={{ marginBottom: "20px" }}>
          <div>
            <span>Auto Revenue</span>
            <strong style={{ color: "#0f766e" }}>
              +{money(currentMonthEstimate?.financials?.autoRevenue)}
            </strong>
            <small>Auto loan interest</small>
          </div>
          <div>
            <span>Daily Revenue</span>
            <strong style={{ color: "#0f766e" }}>
              +{money(currentMonthEstimate?.financials?.dailyRevenue)}
            </strong>
            <small>Daily loan interest</small>
          </div>
          <div>
            <span>Expenses</span>
            <strong style={{ color: "#e11d48" }}>
              -{money(currentMonthEstimate?.financials?.expenses)}
            </strong>
            <small>Expenses logged</small>
          </div>
          <div>
            <span>Net Profit (Live)</span>
            <strong style={{ color: "#059669" }}>
              {money(currentMonthEstimate?.financials?.netProfit)}
            </strong>
            <small>Total revenue - Expenses</small>
          </div>
        </div>

        {/* Partner Expected Profit Table */}
        <div className="financeCard globalCapitalCard">
          <div
            className="cardHead"
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <div>
              <h3 style={{ margin: 0 }}>
                <Users size={18} /> Partner Profit Shares (This Month)
              </h3>
              <small style={{ color: "#64748b" }}>
                Calculated from active capital days up to today.
              </small>
            </div>
            <span style={{ fontSize: "12px", color: "#0f766e", fontWeight: "600" }}>
              Total Capital Weight:{" "}
              {Number(currentMonthEstimate?.totalCapitalWeight || 0).toLocaleString("en-IN", {
                maximumFractionDigits: 0,
              })}{" "}
              Capital-Days
            </span>
          </div>

          <div className="tableResponsive">
            <table className="financeTable">
              <thead>
                <tr>
                  <th>Partner</th>
                  <th style={{ textAlign: "right" }}>Opening Capital</th>
                  <th style={{ textAlign: "right" }}>Current Capital</th>
                  <th style={{ textAlign: "right" }}>Capital Weight</th>
                  <th style={{ textAlign: "center" }}>Share %</th>
                  <th style={{ textAlign: "right" }}>Estimated Profit</th>
                  <th style={{ textAlign: "center" }}>Status</th>
                  <th style={{ textAlign: "center" }}>Segments</th>
                </tr>
              </thead>
              <tbody>
                {(currentMonthEstimate?.allocations || []).map((alloc) => {
                  const ratio = Number(alloc.profitRatio || 0);
                  const weight = Number(alloc.capitalWeight || 0);
                  const expProfit = Number(alloc.allocatedProfit || 0);

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
                      <td style={{ textAlign: "right", fontFamily: "monospace" }}>
                        {weight.toLocaleString("en-IN", { maximumFractionDigits: 0 })}
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
                        +{money(expProfit)}
                      </td>
                      <td style={{ textAlign: "center" }}>
                        <span className="statusPill active" style={{ fontSize: "11px" }}>
                          Auto-credits on 1st
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
                              periodStart: currentMonthEstimate?.periodStart,
                              periodEnd: currentMonthEstimate?.asOfDate,
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
                {(!currentMonthEstimate?.allocations ||
                  currentMonthEstimate.allocations.length === 0) && (
                  <tr>
                    <td
                      colSpan="8"
                      style={{ textAlign: "center", padding: "28px", color: "#94a3b8" }}
                    >
                      No active partner capital in this period.
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

      {/* ========================================================================= */}
      {/* SECTION 2: PAST MONTHS */}
      {/* ========================================================================= */}
      <div style={{ marginTop: "36px", paddingTop: "24px", borderTop: "2px dashed #cbd5e1" }}>
        <div style={{ marginBottom: "16px" }}>
          <span className="overline autoBadgeTag">HISTORY</span>
          <h3
            style={{
              margin: "4px 0 0",
              color: "#0f172a",
              display: "flex",
              alignItems: "center",
              gap: "8px",
              fontSize: "18px",
            }}
          >
            <Calendar size={18} color="#0f766e" />
            Past Months
          </h3>
          <p style={{ margin: "4px 0 0", fontSize: "13px", color: "#64748b" }}>
            Click any month below to view its finalized profit and partner shares.
          </p>
        </div>

        {/* Quick Month Selector Buttons */}
        <div style={{ marginBottom: "16px" }}>
          <div className="passedMonthsPills">
            {passedMonthsList.map((pm) => {
              const isSelected = historyYear === pm.year && historyMonth === pm.month;
              return (
                <button
                  key={`${pm.year}-${pm.month}`}
                  type="button"
                  className={`passedMonthPillBtn ${isSelected ? "active" : ""}`}
                  onClick={() => {
                    setHistoryYear(pm.year);
                    setHistoryMonth(pm.month);
                    onFetchHistoryMonth(pm.year, pm.month);
                  }}
                >
                  {pm.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Month & Year Dropdown Bar */}
        <div className="monthSelectBar">
          <div className="monthSelectControls">
            <span style={{ fontWeight: 600, color: "#334155", fontSize: "13px" }}>
              Select Month:
            </span>
            <select
              value={historyMonth}
              onChange={(e) => {
                const m = parseInt(e.target.value, 10);
                setHistoryMonth(m);
                onFetchHistoryMonth(historyYear, m);
              }}
              style={{
                padding: "6px 12px",
                borderRadius: "6px",
                border: "1px solid #cbd5e1",
                fontSize: "13px",
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
            <select
              value={historyYear}
              onChange={(e) => {
                const y = parseInt(e.target.value, 10);
                setHistoryYear(y);
                onFetchHistoryMonth(y, historyMonth);
              }}
              style={{
                padding: "6px 12px",
                borderRadius: "6px",
                border: "1px solid #cbd5e1",
                fontSize: "13px",
              }}
            >
              {[2024, 2025, 2026, 2027, 2028].map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
            <button
              type="button"
              className="primaryBtn"
              style={{ padding: "6px 14px", fontSize: "13px" }}
              onClick={() => onFetchHistoryMonth(historyYear, historyMonth)}
            >
              {loadingHistoryMonth ? (
                <RefreshCw size={13} className="spin" />
              ) : (
                <Eye size={13} />
              )}
              <span>View Month</span>
            </button>
          </div>

          <div>
            <span
              className={`liveBadge ${
                historyMonthData?.isCurrentMonth ? "accumulating" : "finalized"
              }`}
            >
              {historyMonthData?.isCurrentMonth ? (
                <>
                  <span className="pulseDot"></span> Ongoing Month
                </>
              ) : (
                <>
                  <Check size={12} /> Finalized Month
                </>
              )}
            </span>
          </div>
        </div>

        {/* Month Financial Overview */}
        <div className="globalCapitalStats fourCol" style={{ marginBottom: "20px" }}>
          <div>
            <span>Total Revenue</span>
            <strong style={{ color: "#0f766e" }}>
              {money(historyMonthData?.financials?.totalRevenue)}
            </strong>
            <small>Auto + Daily operations</small>
          </div>
          <div>
            <span>Auto Interest</span>
            <strong style={{ color: "#0f766e" }}>
              {money(historyMonthData?.financials?.autoRevenue)}
            </strong>
            <small>Collected</small>
          </div>
          <div>
            <span>Expenses</span>
            <strong style={{ color: "#e11d48" }}>
              {money(historyMonthData?.financials?.expenses)}
            </strong>
            <small>Total expenses</small>
          </div>
          <div>
            <span>Net Profit</span>
            <strong style={{ color: "#059669" }}>
              {money(historyMonthData?.financials?.netProfit)}
            </strong>
            <small>Distributed to partners</small>
          </div>
        </div>

        {/* Partner Profit Allocations Table for Selected Month */}
        <div className="financeCard globalCapitalCard">
          <div
            className="cardHead"
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <div>
              <h3 style={{ margin: 0 }}>
                <Users size={18} /> Partner Profit Shares ({historyMonthData?.monthName || "Selected Month"})
              </h3>
              <small style={{ color: "#64748b" }}>
                Period: {historyMonthData?.periodStart} to {historyMonthData?.asOfDate || historyMonthData?.periodEnd}
              </small>
            </div>
            <span style={{ fontSize: "12px", color: "#64748b" }}>
              Total Capital Weight:{" "}
              {Number(historyMonthData?.totalCapitalWeight || 0).toLocaleString("en-IN", {
                maximumFractionDigits: 0,
              })}
            </span>
          </div>

          <div className="tableResponsive">
            <table className="financeTable">
              <thead>
                <tr>
                  <th>Partner</th>
                  <th style={{ textAlign: "right" }}>Opening Capital</th>
                  <th style={{ textAlign: "right" }}>Closing Capital</th>
                  <th style={{ textAlign: "right" }}>Capital Weight</th>
                  <th style={{ textAlign: "center" }}>Share %</th>
                  <th style={{ textAlign: "right" }}>Profit Earned</th>
                  <th style={{ textAlign: "center" }}>Status</th>
                  <th style={{ textAlign: "center" }}>Segments</th>
                </tr>
              </thead>
              <tbody>
                {(historyMonthData?.allocations || []).map((alloc) => {
                  const ratio = Number(alloc.profitRatio || 0);
                  const weight = Number(alloc.capitalWeight || 0);
                  const profit = Number(alloc.allocatedProfit || 0);

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
                      <td style={{ textAlign: "right", fontFamily: "monospace" }}>
                        {weight.toLocaleString("en-IN", { maximumFractionDigits: 0 })}
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
                        +{money(profit)}
                      </td>
                      <td style={{ textAlign: "center" }}>
                        <span
                          className={`statusPill ${
                            historyMonthData?.isCurrentMonth ? "active" : "completed"
                          }`}
                          style={{ fontSize: "11px" }}
                        >
                          {historyMonthData?.isCurrentMonth ? "Accumulating" : "Credited"}
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
                              periodStart: historyMonthData?.periodStart,
                              periodEnd: historyMonthData?.asOfDate || historyMonthData?.periodEnd,
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
                {(!historyMonthData?.allocations || historyMonthData.allocations.length === 0) && (
                  <tr>
                    <td
                      colSpan="8"
                      style={{ textAlign: "center", padding: "28px", color: "#94a3b8" }}
                    >
                      No allocations recorded for this month.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
