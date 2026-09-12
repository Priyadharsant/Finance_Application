import React from "react";
import {
  Plus,
  Receipt,
  CarFront,
  Activity,
  Building,
  Search,
  X,
  Trash2,
} from "lucide-react";
import { money } from "../utils/formatters.js";

export default function ExpensesTab({
  expenses,
  expenseSummary,
  expenseFilterMonth,
  setExpenseFilterMonth,
  expenseFilterYear,
  setExpenseFilterYear,
  expenseFilterCategory,
  setExpenseFilterCategory,
  expenseSearch,
  setExpenseSearch,
  onOpenAddExpense,
  onDeleteExpense,
  onSelectRecord,
}) {
  const expenseList = Array.isArray(expenses)
    ? expenses
    : Array.isArray(expenses?.expenses)
    ? expenses.expenses
    : [];

  return (
    <div className="financeFadeIn globalCapitalView">
      <div className="financeHeader">
        <div>
          <span className="overline autoBadgeTag">EXPENSE CONTROL</span>
          <h2>Company Expenses</h2>
          <p className="globalSectionDescription">
            Track, categorize, and audit all company expenses across Auto, Daily, and General operations.
          </p>
        </div>
        <button className="primaryBtn" onClick={onOpenAddExpense}>
          <Plus size={16} /> Record Expense
        </button>
      </div>

      {/* Metric Cards */}
      <div
        className="globalCapitalStats compact"
        style={{ gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))" }}
      >
        <div>
          <span>Period Total</span>
          <strong style={{ color: "#e11d48" }}>
            {money(expenseSummary.totalFiltered)}
          </strong>
          <small>{expenseSummary.countFiltered || 0} entries in selected period</small>
        </div>
        <div>
          <span>All-time total</span>
          <strong>
            {money(expenseSummary.allTimeTotal)}
          </strong>
          <small>{expenseSummary.allTimeCount || 0} total records</small>
        </div>
        <div>
          <span>Auto Finance</span>
          <strong style={{ color: "#2563eb" }}>
            {money(expenseSummary.categoryBreakdown?.AUTO?.total)}
          </strong>
          <small>
            Brokerage &amp; vehicle fees ({expenseSummary.categoryBreakdown?.AUTO?.count || 0})
          </small>
        </div>
        <div>
          <span>Daily Finance</span>
          <strong style={{ color: "#059669" }}>
            {money(expenseSummary.categoryBreakdown?.DAILY?.total)}
          </strong>
          <small>
            Operational expenses ({expenseSummary.categoryBreakdown?.DAILY?.count || 0})
          </small>
        </div>
        <div>
          <span>General Expenses</span>
          <strong style={{ color: "#7c3aed" }}>
            {money(expenseSummary.categoryBreakdown?.GENERAL?.total)}
          </strong>
          <small>
            Office, rent &amp; overheads ({expenseSummary.categoryBreakdown?.GENERAL?.count || 0})
          </small>
        </div>
      </div>

      {/* Filter Bar with Monthly Data Access & Category Tabs */}
      <div className="expenseFilterBar">
        <div className="expenseFilterLeft">
          <button
            type="button"
            className={`expenseCategoryTab ${expenseFilterCategory === "ALL" ? "active" : ""}`}
            onClick={() => setExpenseFilterCategory("ALL")}
          >
            All Categories
          </button>
          <button
            type="button"
            className={`expenseCategoryTab ${expenseFilterCategory === "AUTO" ? "active tab-auto" : ""}`}
            onClick={() => setExpenseFilterCategory("AUTO")}
          >
            <CarFront size={14} /> Auto Finance
          </button>
          <button
            type="button"
            className={`expenseCategoryTab ${expenseFilterCategory === "DAILY" ? "active tab-daily" : ""}`}
            onClick={() => setExpenseFilterCategory("DAILY")}
          >
            <Activity size={14} /> Daily Finance
          </button>
          <button
            type="button"
            className={`expenseCategoryTab ${expenseFilterCategory === "GENERAL" ? "active tab-general" : ""}`}
            onClick={() => setExpenseFilterCategory("GENERAL")}
          >
            <Building size={14} /> General
          </button>
        </div>

        <div className="expenseFilterRight">
          <select
            className="expenseSelect"
            value={expenseFilterMonth}
            onChange={(e) => setExpenseFilterMonth(e.target.value)}
            aria-label="Filter by month"
          >
            <option value="">All Months</option>
            <option value="1">January</option>
            <option value="2">February</option>
            <option value="3">March</option>
            <option value="4">April</option>
            <option value="5">May</option>
            <option value="6">June</option>
            <option value="7">July</option>
            <option value="8">August</option>
            <option value="9">September</option>
            <option value="10">October</option>
            <option value="11">November</option>
            <option value="12">December</option>
          </select>

          <select
            className="expenseSelect"
            value={expenseFilterYear}
            onChange={(e) => setExpenseFilterYear(e.target.value)}
            aria-label="Filter by year"
          >
            <option value="">All Years</option>
            <option value="2026">2026</option>
            <option value="2025">2025</option>
            <option value="2024">2024</option>
          </select>

          <div className="expenseSearchInput">
            <Search size={14} color="#94a3b8" />
            <input
              type="text"
              placeholder="Search reason or type..."
              value={expenseSearch}
              onChange={(e) => setExpenseSearch(e.target.value)}
            />
            {expenseSearch && (
              <button
                type="button"
                onClick={() => setExpenseSearch("")}
                style={{ border: "none", background: "none", cursor: "pointer", color: "#94a3b8", padding: 0 }}
              >
                <X size={12} />
              </button>
            )}
          </div>

          {(expenseFilterMonth ||
            expenseFilterYear !== new Date().getFullYear().toString() ||
            expenseFilterCategory !== "ALL" ||
            expenseSearch) && (
            <button
              type="button"
              className="secondaryBtn"
              style={{ padding: "6px 10px", fontSize: "11px" }}
              onClick={() => {
                setExpenseFilterMonth((new Date().getMonth() + 1).toString());
                setExpenseFilterYear(new Date().getFullYear().toString());
                setExpenseFilterCategory("ALL");
                setExpenseSearch("");
              }}
            >
              Reset Filter
            </button>
          )}
        </div>
      </div>

      {/* Expenses Table */}
      <div className="financeCard globalCapitalCard mt-20">
        <div
          className="cardHead"
          style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "16px 20px" }}
        >
          <h3 style={{ margin: 0 }}>
            <Receipt size={18} /> Expenses Ledger
          </h3>
          <span className="tag autoTag">
            {expenseList.length} {expenseList.length === 1 ? "Record" : "Records"}
          </span>
        </div>

        <div className="tableResponsive">
          <table className="financeTable">
            <thead>
              <tr>
                <th>Date</th>
                <th>Reason (Why)</th>
                <th>Category</th>
                <th>Type</th>
                <th>Reference / Vehicle</th>
                <th style={{ textAlign: "right" }}>Amount (How much)</th>
                <th style={{ textAlign: "center", width: "80px" }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {expenseList.map((exp) => (
                <tr
                  className="clickable globalClickableRow"
                  key={exp.id}
                  onClick={() =>
                    onSelectRecord({ type: "expense", record: exp })
                  }
                >
                  <td>{new Date(exp.expense_date).toLocaleDateString("en-IN")}</td>
                  <td style={{ fontWeight: "600", color: "#0f172a" }}>
                    {exp.description}
                  </td>
                  <td>
                    <span
                      className={`expenseCategoryPill ${
                        exp.category ? exp.category.toLowerCase() : "general"
                      }`}
                    >
                      {exp.category || "GENERAL"}
                    </span>
                  </td>
                  <td>
                    <span
                      className="analyticsPill"
                      style={{ background: "#f1f5f9", color: "#475569" }}
                    >
                      {exp.expense_type || "GENERAL"}
                    </span>
                  </td>
                  <td>
                    {exp.auto_loan_reg ? (
                      <span style={{ display: "inline-flex", alignItems: "center", gap: "4px" }}>
                        <CarFront size={13} color="#2563eb" />
                        <strong>{exp.auto_loan_reg}</strong>
                        <small style={{ color: "#64748b" }}>({exp.auto_loan_vehicle})</small>
                      </span>
                    ) : exp.loan_id ? (
                      <small style={{ color: "#64748b" }}>Auto Loan #{exp.loan_id.slice(0, 8)}</small>
                    ) : (
                      <span style={{ color: "#94a3b8" }}>—</span>
                    )}
                  </td>
                  <td
                    style={{
                      textAlign: "right",
                      fontWeight: "700",
                      color: "#e11d48",
                      fontSize: "14px",
                    }}
                  >
                    {money(exp.amount)}
                  </td>
                  <td style={{ textAlign: "center" }}>
                    <button
                      type="button"
                      className="actionIconBtn"
                      title="Delete expense"
                      onClick={(e) => {
                        e.stopPropagation();
                        onDeleteExpense(exp.id);
                      }}
                    >
                      <Trash2 size={14} />
                    </button>
                  </td>
                </tr>
              ))}
              {expenseList.length === 0 && (
                <tr>
                  <td colSpan="7" style={{ textAlign: "center", padding: "42px 20px" }}>
                    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "8px" }}>
                      <Receipt size={32} color="#94a3b8" />
                      <strong style={{ color: "#334155" }}>No expenses found</strong>
                      <p style={{ margin: 0, color: "#64748b", fontSize: "13px" }}>
                        No expense entries match your current period or filter. Click &quot;Record Expense&quot; above to log an expense.
                      </p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
