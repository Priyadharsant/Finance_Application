import React, { useState, useMemo } from "react";
import {
  Globe,
  Landmark,
  ArrowDownCircle,
  ArrowRightCircle,
  Download,
  Calendar,
  Search,
  X,
  RotateCcw,
} from "lucide-react";
import { money, formatDate } from "../utils/formatters.js";
import { matchesSearch } from "../../utils/search.js";
import MetricTooltipCard from "../../components/MetricTooltipCard.jsx";
import { exportGlobalLedger } from "../services/globalCapitalExportUtils.js";

export default function LedgerOverview({
  ledgerData = {},
  totalCredits,
  totalDebits,
  onSelectRecord,
}) {
  const currentMonthStr = new Date().toISOString().slice(0, 7);
  const [monthFilter, setMonthFilter] = useState(currentMonthStr);
  const [moduleFilter, setModuleFilter] = useState("ALL");
  const [directionFilter, setDirectionFilter] = useState("ALL");
  const [searchQuery, setSearchQuery] = useState("");

  const rawLedger = ledgerData.ledger || [];

  // Filtered ledger based on active in-page filters
  const filteredLedger = useMemo(() => {
    return rawLedger.filter((tx) => {
      // 1. Month Calendar filter (YYYY-MM)
      if (monthFilter) {
        const txDate = String(tx.effective_date || tx.transaction_date || tx.created_at || "").slice(0, 7);
        if (txDate !== monthFilter) return false;
      }

      // 2. Source Module filter
      if (moduleFilter !== "ALL") {
        const mod = (tx.source_module || tx.module || "GLOBAL").toUpperCase();
        if (mod !== moduleFilter) return false;
      }

      // 3. Direction filter
      if (directionFilter !== "ALL") {
        const isCredit =
          tx.direction === "CREDIT" ||
          tx.type === "CREDIT" ||
          tx.type === "PARTNER_CONTRIBUTION" ||
          tx.type === "AUTO_COLLECTION" ||
          tx.type === "DAILY_COLLECTION" ||
          tx.type === "ADJUSTMENT_INCREASE";

        if (directionFilter === "CREDIT" && !isCredit) return false;
        if (directionFilter === "DEBIT" && isCredit) return false;
      }

      // 4. Live Search
      if (!matchesSearch(searchQuery, tx)) return false;

      return true;
    }).sort((a, b) => {
      const da = new Date(a.effective_date || a.transaction_date || a.created_at || 0).getTime();
      const db = new Date(b.effective_date || b.transaction_date || b.created_at || 0).getTime();
      return da - db;
    });
  }, [rawLedger, monthFilter, moduleFilter, directionFilter, searchQuery]);

  const filteredInflow = filteredLedger
    .filter(
      (tx) =>
        tx.direction === "CREDIT" ||
        tx.type === "CREDIT" ||
        tx.type === "PARTNER_CONTRIBUTION" ||
        tx.type === "AUTO_COLLECTION" ||
        tx.type === "DAILY_COLLECTION" ||
        tx.type === "ADJUSTMENT_INCREASE"
    )
    .reduce((sum, tx) => sum + Number(tx.amount || 0), 0);

  const filteredOutflow = filteredLedger
    .filter(
      (tx) =>
        tx.direction === "DEBIT" ||
        tx.type === "DEBIT" ||
        tx.type === "PARTNER_WITHDRAWAL" ||
        tx.type === "AUTO_LOAN_DISBURSEMENT" ||
        tx.type === "DAILY_LOAN_DISBURSEMENT" ||
        tx.type === "BUSINESS_EXPENSE" ||
        tx.type === "PROFIT_PAYMENT" ||
        tx.type === "ADJUSTMENT_DECREASE"
    )
    .reduce((sum, tx) => sum + Number(tx.amount || 0), 0);

  const isFiltered =
    monthFilter !== currentMonthStr ||
    moduleFilter !== "ALL" ||
    directionFilter !== "ALL" ||
    searchQuery.trim() !== "";

  const handleResetFilters = () => {
    setMonthFilter(currentMonthStr);
    setModuleFilter("ALL");
    setDirectionFilter("ALL");
    setSearchQuery("");
  };

  const filteredAutoInflow = filteredLedger
    .filter((tx) => (tx.source_module || "").toUpperCase() === "AUTO" && (tx.direction === "CREDIT" || tx.type === "CREDIT"))
    .reduce((sum, tx) => sum + Number(tx.amount || 0), 0);
  const filteredDailyInflow = filteredLedger
    .filter((tx) => (tx.source_module || "").toUpperCase() === "DAILY" && (tx.direction === "CREDIT" || tx.type === "CREDIT"))
    .reduce((sum, tx) => sum + Number(tx.amount || 0), 0);
  const filteredNetFlow = filteredInflow - filteredOutflow;

  return (
    <div className="financeFadeIn globalCapitalView">
      {/* Top Hero Banner */}
      <MetricTooltipCard
        title="Available Company Balance"
        leadingIcon={<Globe size={18} />}
        value={money(ledgerData.availableCapital)}
        detail="Current cash balance after recorded expenses"
        className="globalCapitalBalanceMetric"
        definition="Ledger capital after subtracting recorded expenses."
        formula="(total ledger credits − total ledger debits) − total expenses."
        period="Lifetime totals currently returned by the Global Capital summary."
        source="global_cash_ledger and expenses table."
      />

      {/* KPI Stats (Dynamic based on Active Filters) */}
      <div className="globalCapitalStats fiveCol">
        <MetricTooltipCard
          title={isFiltered ? "Total Money In" : "Interest & Deduction Income"}
          value={money(isFiltered ? filteredInflow : ledgerData.revenue?.totalRevenue)}
          detail={isFiltered ? "Credits in selected ledger rows" : `Auto interest: ${money(ledgerData.revenue?.autoRevenue)} • Daily deductions: ${money(ledgerData.revenue?.dailyRevenue)}`}
          valueStyle={{ color: "#059669", fontSize: 22, marginTop: 7 }}
          definition={isFiltered
            ? "Total credit entries in the selected ledger rows."
            : "Recorded Auto Finance interest paid plus Daily Finance upfront deductions. This is income recorded by the dashboard, not all cash collections."}
          formula={isFiltered ? "Sum of ledger amounts classified as credits." : "Auto interest paid + Daily Finance initial deductions."}
          period={isFiltered ? "Selected month/module/direction/search filters; based on the latest 100 ledger rows returned by the API." : "Lifetime totals currently returned by the Global Capital summary."}
          source={isFiltered ? "global_cash_ledger." : "autofinance_payments.interest_paid and daily_finance_accounts.initial_deduction, with ledger fallbacks."}
        />
        <MetricTooltipCard
          title={isFiltered ? "Total Money Out" : "Total Expenses"}
          value={money(isFiltered ? filteredOutflow : ledgerData.expenses?.totalExpenses)}
          detail={isFiltered ? "Debits in selected ledger rows" : `Auto: ${money(ledgerData.expenses?.autoExpenses)} • Daily: ${money(ledgerData.expenses?.dailyExpenses)}`}
          valueStyle={{ color: "#e11d48", fontSize: 22, marginTop: 7 }}
          definition={isFiltered
            ? "Total debit entries in the selected ledger rows, which can include loan disbursements, withdrawals, expenses, or profit payments."
            : "Recorded expenses across Auto, Daily, and General categories."}
          formula={isFiltered ? "Sum of ledger amounts classified as debits." : "Sum of expenses.amount."}
          period={isFiltered ? "Selected month/module/direction/search filters; based on the latest 100 ledger rows returned by the API." : "Lifetime total currently returned by the Global Capital summary."}
          source={isFiltered ? "global_cash_ledger." : "expenses table, grouped by category."}
        />
        <MetricTooltipCard
          title={isFiltered ? "Net Ledger Movement" : "Net Profit"}
          value={isFiltered ? `${filteredNetFlow >= 0 ? "+" : ""}${money(filteredNetFlow)}` : money(ledgerData.netProfit)}
          detail={isFiltered ? "Money in minus money out" : "Recorded income minus expenses"}
          valueStyle={{ color: (isFiltered ? filteredNetFlow : Number(ledgerData.netProfit || 0)) >= 0 ? "#0d9488" : "#e11d48", fontSize: 22, marginTop: 7 }}
          definition={isFiltered
            ? "Net movement of the ledger rows matching the selected filters."
            : "Recorded Auto interest and Daily Finance deductions after subtracting recorded expenses."}
          formula={isFiltered ? "Filtered ledger credits − filtered ledger debits." : "Auto interest paid + Daily Finance initial deductions − total expenses."}
          period={isFiltered ? "Selected filters; based on the latest 100 ledger rows returned by the API." : "Lifetime totals currently returned by the Global Capital summary."}
          source={isFiltered ? "global_cash_ledger." : "Auto payment interest, Daily Finance accounts, and expenses."}
        />
        <MetricTooltipCard
          title={isFiltered ? "Auto Collections" : "Total Ledger Credits"}
          value={isFiltered ? `+${money(filteredAutoInflow)}` : money(ledgerData.totalCredits || totalCredits)}
          detail={isFiltered ? "Auto credits in selected rows" : "All credit entries; includes recorded collections"}
          valueStyle={{ color: "#2563eb", fontSize: 22, marginTop: 7 }}
          definition={isFiltered
            ? "Auto Finance credit entries in the selected ledger rows."
            : "Total amount of every credit entry in the global cash ledger; this includes partner contributions and recorded collections."}
          formula={isFiltered ? "Sum of credit amounts with source module AUTO." : "Sum of global_cash_ledger amounts where direction is CREDIT."}
          period={isFiltered ? "Selected filters; based on the latest 100 ledger rows returned by the API." : "Lifetime total currently returned by the Global Capital summary."}
          source="global_cash_ledger."
        />
        <MetricTooltipCard
          title={isFiltered ? "Daily Collections" : "Total Ledger Debits"}
          value={isFiltered ? `+${money(filteredDailyInflow)}` : money(ledgerData.totalDebits || totalDebits)}
          detail={isFiltered ? "Daily credits in selected rows" : "All debit entries; not only loans"}
          valueStyle={{ color: isFiltered ? "#059669" : "#e11d48", fontSize: 22, marginTop: 7 }}
          definition={isFiltered
            ? "Daily Finance credit entries in the selected ledger rows."
            : "Total amount of every debit entry in the global cash ledger; this can include disbursements, withdrawals, expenses, and profit payments."}
          formula={isFiltered ? "Sum of credit amounts with source module DAILY." : "Sum of global_cash_ledger amounts where direction is DEBIT."}
          period={isFiltered ? "Selected filters; based on the latest 100 ledger rows returned by the API." : "Lifetime total currently returned by the Global Capital summary."}
          source="global_cash_ledger."
        />
      </div>

      {/* In-Page Filters Bar with Month Calendar */}
      <div
        className="expenseFilterBar mt-20"
        style={{
          margin: "20px 0 16px",
          padding: "12px 16px",
          background: "#f8fafc",
          borderRadius: "10px",
          border: "1px solid #e2e8f0",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "12px",
        }}
      >
        {/* Module Filter Tabs */}
        <div style={{ display: "flex", gap: "6px", alignItems: "center", flexWrap: "wrap" }}>
          {[
            { id: "ALL", label: "All Modules" },
            { id: "AUTO", label: "Auto Finance" },
            { id: "DAILY", label: "Daily Finance" },
            { id: "GLOBAL", label: "Global Capital" },
          ].map((m) => (
            <button
              key={m.id}
              type="button"
              className={`secondaryBtn ${moduleFilter === m.id ? "active" : ""}`}
              style={{
                background: moduleFilter === m.id ? "#0f766e" : "#ffffff",
                color: moduleFilter === m.id ? "#ffffff" : "#475569",
                borderColor: moduleFilter === m.id ? "#0f766e" : "#cbd5e1",
                fontSize: "12px",
                fontWeight: "600",
                padding: "6px 12px",
              }}
              onClick={() => setModuleFilter(m.id)}
            >
              {m.label}
            </button>
          ))}
        </div>

        {/* Right side: Direction tabs, Month Calendar, Search, and Reset */}
        <div style={{ display: "flex", gap: "10px", alignItems: "center", flexWrap: "wrap" }}>
          {/* Direction Filter */}
          <select
            value={directionFilter}
            onChange={(e) => setDirectionFilter(e.target.value)}
            style={{
              padding: "6px 12px",
              borderRadius: "8px",
              border: "1px solid #cbd5e1",
              fontSize: "12px",
              background: "#ffffff",
              color: "#334155",
              fontWeight: "500",
              cursor: "pointer",
            }}
          >
            <option value="ALL">All Transactions</option>
            <option value="CREDIT">Money In (+ Inflow)</option>
            <option value="DEBIT">Money Out (- Outflow)</option>
          </select>

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
            title="Filter by Month Calendar"
          >
            <Calendar size={15} color="#0f766e" />
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
              title="Click calendar icon to select month"
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
                <X size={13} />
              </button>
            )}
          </div>

          {/* Live Search */}
          <div className="expenseSearchInput" style={{ minWidth: "180px" }}>
            <Search size={14} color="#94a3b8" />
            <input
              type="text"
              placeholder="Search date, amount, type, source, reference ID, description, notes..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{ fontSize: "12px" }}
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                style={{ border: "none", background: "none", cursor: "pointer", color: "#94a3b8", padding: 0 }}
              >
                <X size={12} />
              </button>
            )}
          </div>

          {/* Reset Filters */}
          {isFiltered && (
            <button
              type="button"
              className="secondaryBtn"
              style={{ padding: "6px 12px", fontSize: "12px", display: "inline-flex", alignItems: "center", gap: "4px" }}
              onClick={handleResetFilters}
              title="Reset all filters"
            >
              <RotateCcw size={13} /> Reset
            </button>
          )}
        </div>
      </div>

      {/* Recent Ledger Table */}
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
          <h3>
            <Landmark size={18} /> Cash Flow History
          </h3>
          <div style={{ display: "flex", alignItems: "center", gap: "12px", flexWrap: "wrap" }}>
            <button
              className="secondaryBtn"
              style={{ padding: "6px 12px", fontSize: "12px" }}
              onClick={() => exportGlobalLedger(filteredLedger, { label: monthFilter || undefined })}
              title="Download transactions to Excel"
            >
              <Download size={14} /> Download Excel
              {filteredLedger.length < rawLedger.length ? ` (${filteredLedger.length})` : ""}
            </button>
            <span
              style={{
                fontSize: "12px",
                color: "#64748b",
                fontWeight: "500",
                display: "flex",
                alignItems: "center",
                gap: "6px",
              }}
            >
              <span>💡 Click any row to view details</span>
            </span>
          </div>
        </div>
        <div className="tableResponsive">
          <table className="financeTable">
            <thead>
              <tr>
                <th style={{ width: "50px" }}>S.No</th>
                <th>Date</th>
                <th>Description</th>
                <th>Module</th>
                <th>Flow (In/Out)</th>
                <th style={{ textAlign: "right" }}>Amount</th>
                <th style={{ textAlign: "center", width: "90px" }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {filteredLedger.map((tx, idx) => (
                <tr
                  className="clickable globalClickableRow"
                  key={tx.id}
                  title="Click to view full transaction details"
                  onClick={() => onSelectRecord({ type: "ledger", record: tx })}
                >
                  <td style={{ color: "#64748b", fontWeight: "600", width: "50px" }}>{idx + 1}</td>
                  <td>
                    <span style={{ fontWeight: "500" }}>
                      {formatDate(tx.effective_date)}
                    </span>
                  </td>
                  <td>
                    <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
                      <div>
                        <span
                          className="analyticsPill"
                          style={{ background: "#f1f5f9", color: "#475569" }}
                        >
                          {tx.type}
                        </span>
                      </div>
                      {tx.notes && (
                        <small
                          style={{
                            color: "#64748b",
                            fontSize: "11px",
                            maxWidth: "260px",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {tx.notes}
                        </small>
                      )}
                    </div>
                  </td>
                  <td>
                    <span className="txBadge module" style={{ fontSize: "10.5px" }}>
                      {tx.source_module}
                    </span>
                  </td>
                  <td>
                    {tx.direction === "CREDIT" ? (
                      <span
                        style={{
                          color: "#10b981",
                          fontWeight: "600",
                          display: "flex",
                          alignItems: "center",
                          gap: "4px",
                        }}
                      >
                        <ArrowDownCircle size={14} /> IN
                      </span>
                    ) : (
                      <span
                        style={{
                          color: "#ef4444",
                          fontWeight: "600",
                          display: "flex",
                          alignItems: "center",
                          gap: "4px",
                        }}
                      >
                        <ArrowRightCircle size={14} /> OUT
                      </span>
                    )}
                  </td>
                  <td
                    style={{
                      textAlign: "right",
                      fontWeight: "700",
                      color: tx.direction === "CREDIT" ? "#10b981" : "#ef4444",
                      fontSize: "14px",
                    }}
                  >
                    {tx.direction === "CREDIT" ? "+" : "-"}
                    {money(tx.amount)}
                  </td>
                  <td style={{ textAlign: "center" }}>
                    <button
                      type="button"
                      className="secondaryBtn"
                      style={{
                        padding: "4px 10px",
                        fontSize: "11px",
                        borderRadius: "6px",
                        lineHeight: "1.2",
                      }}
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelectRecord({ type: "ledger", record: tx });
                      }}
                    >
                      View →
                    </button>
                  </td>
                </tr>
              ))}
              {filteredLedger.length === 0 && (
                <tr>
                  <td
                    colSpan="7"
                    style={{ textAlign: "center", color: "#64748b", padding: "24px" }}
                  >
                    No transactions found for the selected filter.
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
