import React, { useState } from "react";
import {
  AlertTriangle,
  CalendarDays,
  CarFront,
  CheckCircle2,
  Clock3,
  Plus,
  Zap,
  Download,
  Calendar,
  X,
  RotateCcw,
  FileSpreadsheet,
} from "lucide-react";
import PhoneLink from "../common/PhoneLink";
import MetricTooltipCard from "../../components/MetricTooltipCard.jsx";
import { money, dateLabel } from "../services/autoFinanceApi";
import { exportAutoCategoryReport } from "../../globalCapital/services/globalCapitalExportUtils";
import { globalCapitalApi } from "../../globalCapital/services/globalCapitalApi";

export default function AutoDashboard({
  overview = {},
  dashboardLoans = [],
  dashboardData = {},
  statusFilter,
  setStatusFilter,
  dashboardMonthFilter = "",
  setDashboardMonthFilter,
  handleExportDashboardLoans,
  sortConfig,
  handleSort,
  setShowCreateLoan,
  openLoanDetails,
  setPayEmiModal,
  setPayForm,
}) {
  const [downloadingAutoReport, setDownloadingAutoReport] = useState(false);

  const handleExportAutoReport = async () => {
    try {
      setDownloadingAutoReport(true);
      const reportData = await globalCapitalApi.getMasterBusinessLedger();
      exportAutoCategoryReport(reportData, { loans: dashboardLoans });
    } catch (e) {
      console.error(e);
      alert("Failed to export Auto Finance Report: " + e.message);
    } finally {
      setDownloadingAutoReport(false);
    }
  };

  const isDashboardFiltered = statusFilter !== "ALL" || Boolean(dashboardMonthFilter);

  const dashDisbursed = dashboardLoans.reduce((sum, l) => sum + Number(l.loan_amount || 0), 0);
  const dashCollected = dashboardLoans.reduce((sum, l) => sum + Number(l.total_paid || 0), 0);
  const dashRemaining = Math.max(0, dashDisbursed - dashCollected);
  const dashOverdueCount = dashboardLoans.filter((l) => {
    const todayStr = new Date().toISOString().slice(0, 10);
    return l.next_due_date && new Date(l.next_due_date) < new Date(todayStr);
  }).length;
  const dashDueTodayCount = dashboardLoans.filter((l) => {
    const todayStr = new Date().toISOString().slice(0, 10);
    const dueStr = l.next_due_date ? new Date(l.next_due_date).toISOString().slice(0, 10) : "";
    return dueStr === todayStr;
  }).length;
  const dashRecoveryRate = dashDisbursed > 0 ? Math.round((dashCollected / dashDisbursed) * 100) : 0;
  const dashExpectedReturn = dashboardLoans.reduce(
    (sum, loan) => sum + Number(
      loan.agreed_total_payable ?? loan.total_payable ??
      (Number(loan.loan_amount || 0) + Number(loan.total_interest || 0)),
    ),
    0,
  );
  const dashProjectedAmount = dashCollected + dashboardLoans
    .filter((loan) => loan.status === "ACTIVE")
    .reduce((sum, loan) => sum + Number(
      loan.monthly_installment || loan.emi_amount || (Number(loan.loan_amount || 0) * 0.1),
    ), 0);

  return (
    <section className="content">
      <div className="intro">
        <div>
          <span className="overline autoBadgeTag">
            AUTO FINANCE ANALYTICS
          </span>
          <h2>Vehicle Loans &amp; Business Analytics</h2>
          <p>
            Real-time loan position, loans given, EMI collections, and vehicle details.
          </p>
        </div>
        <div className="actionGroup" style={{ display: "flex", gap: "10px", alignItems: "center", flexWrap: "wrap" }}>
          <button
            type="button"
            className="unifiedReportBtn"
            onClick={handleExportAutoReport}
            disabled={downloadingAutoReport}
            title="Download complete Auto Finance Report (.xlsx)"
          >
            <FileSpreadsheet size={16} />
            <span>{downloadingAutoReport ? "Compiling..." : "Download Report (.xlsx)"}</span>
          </button>
        </div>
      </div>

      {/* SECTION 1: Capital, Cash & Accounts */}
      <div className="metricGroupHeading">
        <h3>Capital, Cash &amp; Accounts</h3>
        <p>Total capital, liquid cash in hand (Kai Iruppu), expenses, and customer count for Auto Finance.</p>
      </div>
      <div className="metricGrid" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))" }}>
        <MetricTooltipCard
          title="Total customers"
          value={overview.total_customers || dashboardLoans.length}
          tone="autoMetric blue"
          detail="Active & vehicle loan accounts"
          definition="Number of vehicle loan customer accounts in Auto Finance."
          formula="Count of autofinance_customers."
          period="Lifetime to date."
          source="autofinance_customers."
        />
        <MetricTooltipCard
          title="Total Capital"
          value={money(overview.total_capital || 0)}
          tone="autoMetric blue"
          detail="Auto Finance allocated capital"
          definition="Total capital contributions allocated to Auto Finance."
          formula="Sum of partner_capital_transactions where target_module = 'AUTO'."
          period="Lifetime to date."
          source="partner_capital_transactions."
        />
        <MetricTooltipCard
          title="Kai Iruppu (Cash in Hand)"
          value={money(overview.kai_iruppu || 0)}
          tone="autoMetric green"
          detail="Liquid auto cash balance"
          definition="Liquid cash available for Auto Finance operations."
          formula="Auto Capital + EMI Collections - Disbursements - Auto Expenses."
          period="Current available cash position."
          source="Partner capital, payments, loans, and expenses."
        />
        <MetricTooltipCard
          title="Expense on Auto Finance"
          value={money(overview.expenses || 0)}
          tone="autoMetric orange"
          detail="Operational & brokerage expenses"
          definition="Total operational expenses incurred in Auto Finance."
          formula="Sum of expenses where category = 'AUTO'."
          period="Lifetime to date."
          source="expenses."
        />
      </div>

      {/* SECTION 2: Loan Portfolio & Collections */}
      <div className="metricGroupHeading">
        <h3>Loan Portfolio &amp; Collections</h3>
        <p>Principal issued, scheduled interest, disbursed amount, and EMI collections.</p>
      </div>
      <div className="metricGrid" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))" }}>
        <MetricTooltipCard
          title="Total Finance Given (Gross)"
          value={money(dashExpectedReturn || overview.total_expected || 0)}
          tone="autoMetric"
          detail="Contractual total payable"
          definition="Total gross amount payable on auto vehicle loans (Principal + Interest)."
          formula="Sum of agreed_total_payable or principal + scheduled interest."
          period="All non-cancelled vehicle loans."
          source="autofinance_loans and emi schedules."
        />
        <MetricTooltipCard
          title="Interest"
          value={money(overview.total_profit || Math.max(0, dashExpectedReturn - dashDisbursed))}
          tone="autoMetric"
          detail="Scheduled auto loan profit"
          definition="Total finance interest and charges scheduled on vehicle loans."
          formula="Sum of interest_component from EMI schedules."
          period="Lifetime to date."
          source="autofinance_emi_schedules."
        />
        <MetricTooltipCard
          title="Amount Given"
          value={money(dashDisbursed || overview.total_disbursed || 0)}
          tone="autoMetric"
          detail="Net vehicle loan principal"
          definition="Net principal amount disbursed for vehicle purchases or refinance."
          formula="Sum of loan_amount."
          period="All non-cancelled vehicle loans."
          source="autofinance_loans."
        />
        <MetricTooltipCard
          title="Collection Amount"
          value={money(dashCollected || overview.total_collected || 0)}
          tone="autoMetric green"
          detail={`${dashRecoveryRate}% collected`}
          definition="Total EMI payments collected on auto loans."
          formula="Sum of amount_paid from autofinance_payments."
          period="Lifetime to date."
          source="autofinance_payments."
        />
        <MetricTooltipCard
          title="Remaining"
          value={money(dashRemaining || overview.remaining || 0)}
          tone="autoMetric orange"
          detail="Principal & EMI dues pending"
          definition="Outstanding loan balance still receivable from vehicle borrowers."
          formula="Total Expected Return minus Total Collected."
          period="All active vehicle loans."
          source="autofinance_loans and autofinance_payments."
        />
      </div>

      {/* COMPREHENSIVE VEHICLE LOANS PORTFOLIO TABLE */}
      <div className="card tableWrap" style={{ marginBottom: "28px" }}>
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
            <span className="overline" style={{ color: "#059669" }}>
              ACTIVE VEHICLE LOANS &amp; DUE TRACKING
            </span>
            <h3 style={{ marginTop: "2px" }}>
              <Zap size={17} /> Active Vehicle Loans &amp; Due Tracking
            </h3>
            <p>
              Active ongoing vehicle loans, payment progress, and actionable dues.
            </p>
          </div>
          <div
            style={{
              display: "flex",
              gap: "8px",
              flexWrap: "wrap",
              alignItems: "center",
            }}
          >
            <select
              className="autoSelect"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              style={{
                padding: "6px 12px",
                borderRadius: "6px",
                border: "1px solid #cbd5e1",
                marginRight: "4px",
              }}
            >
              <option value="ALL">All Active Loans</option>
              <option value="OVERDUE">Overdue Dues</option>
              <option value="DUE_TODAY">Due Today</option>
              <option value="UPCOMING">Upcoming Dues</option>
            </select>

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
              title="Filter dues by month calendar"
            >
              <Calendar size={14} color="#0f766e" />
              <input
                type="month"
                value={dashboardMonthFilter}
                onChange={(e) => setDashboardMonthFilter?.(e.target.value)}
                style={{
                  border: "none",
                  outline: "none",
                  fontSize: "12px",
                  color: "#1e293b",
                  fontWeight: "500",
                  background: "transparent",
                  cursor: "pointer",
                }}
                title="Filter dues by month"
              />
              {dashboardMonthFilter && (
                <button
                  type="button"
                  onClick={() => setDashboardMonthFilter?.("")}
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
          </div>
        </div>
        <table>
          <thead>
            <tr>
              <th style={{ width: "50px" }}>S.No</th>
              <th
                className="clickable"
                onClick={() => handleSort("first_name")}
              >
                Customer{" "}
                {sortConfig.key === "first_name" &&
                  (sortConfig.direction === "asc" ? "↑" : "↓")}
              </th>
              <th
                className="clickable"
                onClick={() => handleSort("registration_number")}
              >
                Vehicle & Reg No{" "}
                {sortConfig.key === "registration_number" &&
                  (sortConfig.direction === "asc" ? "↑" : "↓")}
              </th>
              <th
                className="clickable"
                onClick={() => handleSort("amount")}
              >
                Loan Details{" "}
                {sortConfig.key === "amount" &&
                  (sortConfig.direction === "asc" ? "↑" : "↓")}
              </th>
              <th
                className="clickable"
                onClick={() => handleSort("total_paid")}
              >
                Payment Progress{" "}
                {sortConfig.key === "total_paid" &&
                  (sortConfig.direction === "asc" ? "↑" : "↓")}
              </th>
              <th
                className="clickable"
                onClick={() => handleSort("due_date")}
              >
                Due Status{" "}
                {sortConfig.key === "due_date" &&
                  (sortConfig.direction === "asc" ? "↑" : "↓")}
              </th>
              <th>EMI</th>
            </tr>
          </thead>
          <tbody>
            {dashboardLoans.map((l, idx) => {
              const getLocalDateString = (d) => {
                if (!d) return "";
                const dt = new Date(d);
                if (isNaN(dt.getTime())) return "";
                const y = dt.getFullYear();
                const m = String(dt.getMonth() + 1).padStart(2, "0");
                const day = String(dt.getDate()).padStart(2, "0");
                return `${y}-${m}-${day}`;
              };

              const todayStr = getLocalDateString(new Date());
              const dueStr = getLocalDateString(l.next_due_date);
              const isToday = Boolean(dueStr && dueStr === todayStr);
              const isOverdue = Boolean(dueStr && dueStr < todayStr);
              const hasUpcoming = Boolean(dueStr && dueStr > todayStr);

              // Monthly due amount calculation
              const dashDue = (dashboardData.dueSchedules || []).find(
                (d) => String(d.loan_id) === String(l.id),
              );
              const monthlyDueAmount = dashDue
                ? (dashDue.remaining_emi_amount !== undefined ? Number(dashDue.remaining_emi_amount) : Math.max(0, Number(dashDue.total_emi || 0) - Number(dashDue.collected_amount || 0)))
                : Number(l.next_emi_amount || 0);
              const instNo = dashDue
                ? dashDue.installment_number
                : l.next_installment_number || "?";
              const emiId = dashDue ? dashDue.id : l.next_emi_id;

              // Determine partial or pending status of the due installment
              const dueStatus = dashDue?.status || l.next_emi_status || "";
              const paidSoFar = Number(dashDue?.collected_amount || l.next_emi_collected || 0);
              const fullInstallmentEmi = Number(dashDue?.total_emi || l.next_emi_total || (monthlyDueAmount + paidSoFar));

              const isPartial = dueStatus === "PARTIAL" || (paidSoFar > 0 && monthlyDueAmount > 0);
              // Only consider pending if due date is strictly in the past (< current date)
              const isPending = !isPartial && isOverdue;

              return (
                <tr
                  key={l.id}
                  className="clickable"
                  onClick={() => openLoanDetails(l.id)}
                >
                  <td style={{ color: "#64748b", fontWeight: "600", width: "50px" }}>{idx + 1}</td>
                  <td>
                    <div className="customerNameCell">
                      <div>
                        <b>
                          {l.first_name} {l.last_name}
                        </b>
                        <small>
                          {l.phone ? (
                            <PhoneLink phone={l.phone} icon />
                          ) : (
                            l.customer_code
                          )}
                        </small>
                      </div>
                    </div>
                  </td>
                  <td>
                    <b>
                      {l.make || "Vehicle"} {l.model}
                    </b>
                    <small
                      className="autoRegNo"
                      style={{ display: "inline-block", marginTop: "3px" }}
                    >
                      {l.registration_number || l.vehicle_type}
                    </small>
                  </td>
                  <td>
                    <b>{money(l.loan_amount)}</b>
                    <small
                      style={{
                        display: "block",
                        color: "#64748b",
                        marginTop: "2px",
                      }}
                    >
                      {l.interest_rate}% ({l.interest_type || "FLAT"}) •{" "}
                      {l.tenure_months} Mo
                    </small>
                    <small style={{ display: "block", color: "#64748b", marginTop: "3px" }}>
                      Interest amount: {money(l.total_interest)}
                    </small>
                  </td>
                  <td>
                    <b className="greenText">{money(l.total_paid)}</b>
                    <small style={{ display: "block", marginTop: "2px" }}>
                      <span
                        style={{
                          color:
                            isPartial
                              ? "#d97706"
                              : Number(l.pending_dues_count || 0) > 0
                              ? "#c2410c"
                              : "#047857",
                          fontWeight: isPartial ? 700 : "normal",
                        }}
                      >
                        <Clock3
                          size={11}
                          style={{ verticalAlign: "middle" }}
                        />{" "}
                        {isPartial ? "Partial Due" : `${l.pending_dues_count || 0} Pending`}
                      </span>
                    </small>
                  </td>
                  <td>
                    {isToday || isOverdue || hasUpcoming ? (
                      <div
                        style={{
                          display: "flex",
                          flexDirection: "column",
                          alignItems: "flex-start",
                          gap: "4px",
                        }}
                      >
                        <div style={{ display: "flex", alignItems: "center", gap: "4px", flexWrap: "wrap" }}>
                          {isPartial ? (
                            <span
                              className="tag"
                              style={{
                                background: "#fef3c7",
                                color: "#b45309",
                                border: "1px solid #fde68a",
                                fontSize: "10px",
                                padding: "2px 6px",
                                fontWeight: "800",
                              }}
                            >
                              PARTIAL
                            </span>
                          ) : isPending ? (
                            <span
                              className="tag"
                              style={{
                                background: isOverdue ? "#fee2e2" : isToday ? "#ffedd5" : "#eff6ff",
                                color: isOverdue ? "#b91c1c" : isToday ? "#c2410c" : "#1d4ed8",
                                border: `1px solid ${isOverdue ? "#fecaca" : isToday ? "#fed7aa" : "#dbeafe"}`,
                                fontSize: "10px",
                                padding: "2px 6px",
                                fontWeight: "800",
                              }}
                            >
                              PENDING
                            </span>
                          ) : null}

                          <span
                            className="tag"
                            style={{
                              background: isToday ? "#fff7ed" : isOverdue ? "#fef2f2" : "#eff6ff",
                              color: isToday ? "#c2410c" : isOverdue ? "#b91c1c" : "#1d4ed8",
                              border: `1px solid ${isToday ? "#ffedd5" : isOverdue ? "#fecaca" : "#dbeafe"}`,
                              fontSize: "10px",
                              padding: "2px 6px",
                            }}
                          >
                            {isToday ? "DUE TODAY" : isOverdue ? "OVERDUE" : "UPCOMING"}
                          </span>
                        </div>

                        <b
                          style={{
                            color: isPartial ? "#d97706" : isOverdue ? "#dc2626" : isToday ? "#d97706" : "#1e3a8a",
                            fontSize: "13px",
                          }}
                        >
                          {money(monthlyDueAmount)}
                        </b>
                        <small
                          style={{ color: "#64748b", fontSize: "11px" }}
                        >
                          Inst #{instNo} {isPartial && paidSoFar > 0 ? `· Paid: ${money(paidSoFar)}` : hasUpcoming ? `· Due: ${dateLabel(l.next_due_date)}` : ""}
                        </small>
                      </div>
                    ) : (
                      <span
                        className="tag"
                        style={{
                          background: "#ecfdf5",
                          color: "#047857",
                          border: "1px solid #d1fae5",
                        }}
                      >
                        <CheckCircle2
                          size={13}
                          style={{
                            verticalAlign: "middle",
                            marginRight: "2px",
                          }}
                        />{" "}
                        UP TO DATE
                      </span>
                    )}
                  </td>
                  <td>
                    {(isToday || isOverdue || hasUpcoming) && emiId ? (
                      <button
                        className="payButton"
                        style={{
                          background: isPartial
                            ? "#d97706"
                            : isOverdue
                            ? "#dc2626"
                            : hasUpcoming
                            ? "#2563eb"
                            : "#059669",
                          color: "#fff",
                          borderColor: isPartial
                            ? "#b45309"
                            : isOverdue
                            ? "#b91c1c"
                            : hasUpcoming
                            ? "#1d4ed8"
                            : "#047857",
                          fontWeight: "800",
                        }}
                        title={
                          isPartial
                            ? `Partial payment recorded (${money(paidSoFar)}). Collect remaining balance of ${money(monthlyDueAmount)}`
                            : isPending
                            ? `Collect pending EMI of ${money(monthlyDueAmount)} for Inst #${instNo}`
                            : `Collect EMI of ${money(monthlyDueAmount)}`
                        }
                        onClick={(e) => {
                          e.stopPropagation();
                          setPayEmiModal({
                            loanId: l.id,
                            emiId: emiId,
                            totalEmi: fullInstallmentEmi,
                            instNo: instNo,
                            remainingEmi: monthlyDueAmount,
                          });
                          setPayForm({
                            amountPaid: monthlyDueAmount,
                            paymentMethod: "CASH",
                            referenceNumber: "",
                          });
                        }}
                      >
                        {isPartial ? "Collect Part" : isPending ? "Collect Pending" : "Collect Due"}
                      </button>
                    ) : (
                      <button
                        className="payButton"
                        style={{
                          background: "#f1f5f9",
                          color: "#0f172a",
                          borderColor: "#cbd5e1",
                        }}
                        onClick={(e) => {
                          e.stopPropagation();
                          openLoanDetails(l.id);
                        }}
                      >
                        Details
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {!dashboardLoans.length && (
          <div className="empty">
            <div>
              <CarFront size={28} />
            </div>
            <b>
              No active vehicle loans found matching criteria. Click "+ New Vehicle Loan" above.
            </b>
          </div>
        )}
      </div>
    </section>
  );
}
