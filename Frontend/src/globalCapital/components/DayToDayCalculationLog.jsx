import React from "react";
import { Calendar, RefreshCw, Calculator, Eye } from "lucide-react";
import { money } from "../utils/formatters.js";

export default function DayToDayCalculationLog({
  dailyLogsData,
  loadingDailyLogs,
  runningDailyCalc,
  onRefresh,
  onRunDailyCalc,
  onViewDetails,
}) {
  const todayStr = new Date().toISOString().slice(0, 10);
  const todayLog =
    (dailyLogsData?.logs || []).find((l) => l.calcDate === todayStr) ||
    dailyLogsData?.logs?.[dailyLogsData.logs.length - 1];

  const isTodayProfit = todayLog ? todayLog.netProfit >= 0 : true;

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

        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
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
      <div className="tableResponsive">
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
            {(dailyLogsData?.logs || []).map((log) => {
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
            {(!dailyLogsData?.logs || dailyLogsData.logs.length === 0) && (
              <tr>
                <td colSpan="8" style={{ textAlign: "center", padding: "28px", color: "#94a3b8" }}>
                  {loadingDailyLogs
                    ? "Loading daily logs..."
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
