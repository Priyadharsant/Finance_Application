import React from "react";
import {
  AlertTriangle,
  CalendarDays,
  CarFront,
  CheckCircle2,
  Clock3,
  Plus,
  Zap,
} from "lucide-react";
import PhoneLink from "../common/PhoneLink";
import { money, dateLabel } from "../services/autoFinanceApi";

export default function AutoDashboard({
  overview = {},
  dashboardLoans = [],
  dashboardData = {},
  statusFilter,
  setStatusFilter,
  sortConfig,
  handleSort,
  setShowCreateLoan,
  openLoanDetails,
  setPayEmiModal,
  setPayForm,
}) {
  return (
    <section className="content">
      <div className="intro">
        <div>
          <span className="overline autoBadgeTag">
            AUTO FINANCE ANALYTICS
          </span>
          <h2>Vehicle Loan Portfolio & Business Analytics</h2>
          <p>
            Real-time loan position, capital deployment, EMI recovery, and
            vehicle fleet distribution.
          </p>
        </div>
        <div className="actionGroup">
          <button
            className="primary autoBtn"
            onClick={() => setShowCreateLoan(true)}
          >
            <Plus size={16} /> New Vehicle Loan
          </button>
        </div>
      </div>

      {/* EXECUTIVE KPI METRIC CARDS */}
      <div
        className="metricGrid"
        style={{
          gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))",
        }}
      >
        <div className="metric autoMetric blue">
          <span>Total Disbursed (Principal)</span>
          <b>{money(overview.total_disbursed || 0)}</b>
          <small
            style={{
              color: "#64748b",
              fontSize: "11.5px",
              marginTop: "4px",
              display: "block",
            }}
          >
            Capital deployed across loans
          </small>
        </div>

        <div className="metric autoMetric orange">
          <span>Total Expected Return</span>
          <b>{money(overview.total_expected || 0)}</b>
          <small
            style={{
              color: "#64748b",
              fontSize: "11.5px",
              marginTop: "4px",
              display: "block",
            }}
          >
            Principal + Total Interest Scheduled
          </small>
        </div>

        <div className="metric autoMetric green">
          <span>Total EMI Collected</span>
          <b>{money(overview.total_collected || 0)}</b>
          <small
            style={{
              color: "#059669",
              fontWeight: 600,
              fontSize: "11.5px",
              marginTop: "4px",
              display: "block",
            }}
          >
            {overview.recovery_rate || "0"}% Recovered
          </small>
        </div>

        <div className="metric autoMetric red">
          <span>Remaining Portfolio</span>
          <b>{money(overview.remaining || 0)}</b>
          <small
            style={{
              color: "#dc2626",
              fontWeight: 600,
              fontSize: "11.5px",
              marginTop: "4px",
              display: "block",
            }}
          >
            Balance left to recover
          </small>
        </div>

        <div className="metric autoMetric teal">
          <span>Projected Net Profit</span>
          <b>{money(overview.total_profit || 0)}</b>
          <small
            style={{
              color: "#0f766e",
              fontWeight: 600,
              fontSize: "11.5px",
              marginTop: "4px",
              display: "block",
            }}
          >
            Interest earnings margin
          </small>
        </div>
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
            <span
              className="tag"
              style={{
                background: "#fff7ed",
                color: "#c2410c",
                border: "1px solid #ffedd5",
              }}
            >
              <CalendarDays size={13} /> Today Due:{" "}
              <b>{money(overview.today_due_amount || 0)}</b> (
              {overview.today_due_count || 0})
            </span>
            <span
              className="tag"
              style={{
                background: "#fef2f2",
                color: "#b91c1c",
                border: "1px solid #fecaca",
              }}
            >
              <AlertTriangle size={13} /> Outstanding Overdue:{" "}
              <b>{money(overview.overdue_amount || 0)}</b> (
              {overview.overdue_count || 0})
            </span>
          </div>
        </div>
        <table>
          <thead>
            <tr>
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
            {dashboardLoans.map((l) => {
              const todayStr = new Date().toISOString().slice(0, 10);
              const dueStr = l.next_due_date
                ? new Date(l.next_due_date).toISOString().slice(0, 10)
                : "";
              const isToday = dueStr === todayStr;
              const isOverdue =
                l.next_due_date &&
                new Date(l.next_due_date) < new Date(todayStr);
              const hasUpcoming = l.next_due_date && !isToday && !isOverdue;

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

              return (
                <tr
                  key={l.id}
                  className="clickable"
                  onClick={() => openLoanDetails(l.id)}
                >
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
                  </td>
                  <td>
                    <b className="greenText">{money(l.total_paid)}</b>
                    <small style={{ display: "block", marginTop: "2px" }}>
                      <span
                        style={{
                          color:
                            Number(l.pending_dues_count || 0) > 0
                              ? "#c2410c"
                              : "#047857",
                        }}
                      >
                        <Clock3
                          size={11}
                          style={{ verticalAlign: "middle" }}
                        />{" "}
                        {l.pending_dues_count || 0} Pending
                      </span>
                    </small>
                  </td>
                  <td>
                    {isToday || isOverdue ? (
                      <div
                        style={{
                          display: "flex",
                          flexDirection: "column",
                          alignItems: "flex-start",
                          gap: "4px",
                        }}
                      >
                        <span
                          className="tag"
                          style={{
                            background: isToday ? "#fff7ed" : "#fef2f2",
                            color: isToday ? "#c2410c" : "#b91c1c",
                            border: `1px solid ${isToday ? "#ffedd5" : "#fecaca"}`,
                            fontSize: "10px",
                            padding: "2px 6px",
                          }}
                        >
                          {isToday ? "DUE TODAY" : "OVERDUE"}
                        </span>
                        <b
                          style={{
                            color: isToday ? "#d97706" : "#dc2626",
                            fontSize: "13px",
                          }}
                        >
                          {money(monthlyDueAmount)}
                        </b>
                        <small
                          style={{ color: "#64748b", fontSize: "11px" }}
                        >
                          Inst #{instNo}
                        </small>
                      </div>
                    ) : hasUpcoming ? (
                      <div
                        style={{
                          display: "flex",
                          flexDirection: "column",
                          alignItems: "flex-start",
                          gap: "4px",
                        }}
                      >
                        <span
                          className="tag"
                          style={{
                            background: "#eff6ff",
                            color: "#1d4ed8",
                            border: "1px solid #dbeafe",
                            fontSize: "10px",
                            padding: "2px 6px",
                          }}
                        >
                          UPCOMING DUE
                        </span>
                        <b style={{ color: "#1e3a8a", fontSize: "13px" }}>
                          {money(monthlyDueAmount)}
                        </b>
                        <small
                          style={{ color: "#64748b", fontSize: "11px" }}
                        >
                          Due: {dateLabel(l.next_due_date)}
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
                          background: hasUpcoming ? "#3b82f6" : "#059669",
                          color: "#fff",
                          borderColor: hasUpcoming ? "#3b82f6" : "#059669",
                          fontWeight: "800",
                        }}
                        onClick={(e) => {
                          e.stopPropagation();
                          setPayEmiModal({
                            loanId: l.id,
                            emiId: emiId,
                            totalEmi: monthlyDueAmount,
                            instNo: instNo,
                          });
                          setPayForm({
                            amountPaid: monthlyDueAmount,
                            paymentMethod: "CASH",
                            referenceNumber: "",
                          });
                        }}
                      >
                        Collect EMI
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
