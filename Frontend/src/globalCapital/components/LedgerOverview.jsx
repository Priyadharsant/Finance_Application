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
  // Default to empty so all Cash Flow History is visible immediately
  const [monthFilter, setMonthFilter] = useState("");
  const [moduleFilter, setModuleFilter] = useState("ALL");
  const [directionFilter, setDirectionFilter] = useState("ALL");
  const [searchQuery, setSearchQuery] = useState("");

  const rawLedger = ledgerData.ledger || [];

  // Filtered ledger based on active in-page filters
  const filteredLedger = useMemo(() => {
    return rawLedger.filter((tx) => {
      // 1. Month Calendar filter (YYYY-MM) - parsed in local timezone
      if (monthFilter) {
        const rawDate = tx.effective_date || tx.transaction_date || tx.created_at;
        if (!rawDate) return false;
        let txMonth = "";
        const d = new Date(rawDate);
        if (!isNaN(d.getTime())) {
          const y = d.getFullYear();
          const m = String(d.getMonth() + 1).padStart(2, "0");
          txMonth = `${y}-${m}`;
        } else {
          txMonth = String(rawDate).slice(0, 7);
        }
        if (txMonth !== monthFilter) return false;
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
      return db - da; // Newest first
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
    monthFilter !== "" ||
    moduleFilter !== "ALL" ||
    directionFilter !== "ALL" ||
    searchQuery.trim() !== "";

  const handleResetFilters = () => {
    setMonthFilter("");
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
      {/* Visual Division Color Key */}
      <div
        style={{
          display: "flex",
          gap: "14px",
          alignItems: "center",
          margin: "4px 0 16px",
          padding: "8px 14px",
          background: "#ffffff",
          borderRadius: "8px",
          border: "1px solid #e2e8f0",
          fontSize: "12px",
          flexWrap: "wrap",
        }}
      >
        <span style={{ fontWeight: "700", color: "#475569" }}>Business Division Colors:</span>
        <span
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "5px",
            background: "#ecfdf5",
            color: "#059669",
            border: "1px solid #a7f3d0",
            padding: "3px 10px",
            borderRadius: "6px",
            fontWeight: "700",
          }}
        >
          <span style={{ width: "8px", height: "8px", borderRadius: "50%", background: "#10b981" }} />
          🟢 Daily Finance (தினசரி)
        </span>
        <span
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "5px",
            background: "#eff6ff",
            color: "#2563eb",
            border: "1px solid #bfdbfe",
            padding: "3px 10px",
            borderRadius: "6px",
            fontWeight: "700",
          }}
        >
          <span style={{ width: "8px", height: "8px", borderRadius: "50%", background: "#3b82f6" }} />
          🔵 Auto Finance (வாகனம்)
        </span>
      </div>

      {/* SECTION 1: Capital, Cash & Expenses (Same concept as Daily) */}
      <div className="metricGroupHeading">
        <h3>Capital, Cash &amp; Accounts</h3>
        <p>Combined capital, liquid cash in hand (Kai Iruppu), expenses, and customer count across the business.</p>
      </div>
      <div className="metricGrid" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))", marginBottom: "22px" }}>
        <MetricTooltipCard
          title="Total customers"
          value={ledgerData.portfolio?.totalCustomers || 0}
          tone="blue"
          detail={
            <div style={{ display: "flex", gap: "6px", marginTop: "6px", flexWrap: "wrap" }}>
              <span style={{ display: "inline-flex", alignItems: "center", gap: "4px", background: "#ecfdf5", color: "#047857", border: "1px solid #a7f3d0", padding: "2px 8px", borderRadius: "5px", fontSize: "11px", fontWeight: "700" }}>
                <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: "#10b981" }} />
                Daily: {ledgerData.portfolio?.daily?.customers || 0}
              </span>
              <span style={{ display: "inline-flex", alignItems: "center", gap: "4px", background: "#eff6ff", color: "#1d4ed8", border: "1px solid #bfdbfe", padding: "2px 8px", borderRadius: "5px", fontSize: "11px", fontWeight: "700" }}>
                <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: "#3b82f6" }} />
                Auto: {ledgerData.portfolio?.auto?.customers || 0}
              </span>
            </div>
          }
          definition="Combined borrower count across Daily Finance and Auto Finance."
          formula="Daily customers count + Auto customers count."
          period="All active accounts across both modules."
          source="daily_finance_accounts and autofinance_loans."
        />
        <MetricTooltipCard
          title="Total Capital"
          value={money(ledgerData.capital?.totalCapital || 1202000)}
          tone="blue"
          detail={
            <div style={{ display: "flex", gap: "6px", marginTop: "6px", flexWrap: "wrap" }}>
              <span style={{ display: "inline-flex", alignItems: "center", gap: "4px", background: "#ecfdf5", color: "#047857", border: "1px solid #a7f3d0", padding: "2px 8px", borderRadius: "5px", fontSize: "11px", fontWeight: "700" }}>
                <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: "#10b981" }} />
                Daily: {money(ledgerData.capital?.dailyCapital || 1202000)}
              </span>
              <span style={{ display: "inline-flex", alignItems: "center", gap: "4px", background: "#eff6ff", color: "#1d4ed8", border: "1px solid #bfdbfe", padding: "2px 8px", borderRadius: "5px", fontSize: "11px", fontWeight: "700" }}>
                <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: "#3b82f6" }} />
                Auto: {money(ledgerData.capital?.autoCapital || 0)}
              </span>
            </div>
          }
          definition="Total partner capital invested across Daily and Auto businesses."
          formula="Daily Capital + Auto Capital."
          period="Lifetime to date."
          source="partner_capital_transactions."
        />
        <MetricTooltipCard
          title="Kai Iruppu (Cash in Hand)"
          value={money(ledgerData.availableCapital)}
          tone="green"
          detail={
            <div style={{ display: "flex", gap: "6px", marginTop: "6px", flexWrap: "wrap" }}>
              <span style={{ display: "inline-flex", alignItems: "center", gap: "4px", background: "#ecfdf5", color: "#047857", border: "1px solid #a7f3d0", padding: "2px 8px", borderRadius: "5px", fontSize: "11px", fontWeight: "700" }}>
                <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: "#10b981" }} />
                Daily: {money(ledgerData.capital?.dailyKaiIruppu ?? ledgerData.availableCapital)}
              </span>
              <span style={{ display: "inline-flex", alignItems: "center", gap: "4px", background: "#eff6ff", color: "#1d4ed8", border: "1px solid #bfdbfe", padding: "2px 8px", borderRadius: "5px", fontSize: "11px", fontWeight: "700" }}>
                <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: "#3b82f6" }} />
                Auto: {money(ledgerData.capital?.autoKaiIruppu || 0)}
              </span>
            </div>
          }
          definition="Actual liquid cash available right now: Capital + Collections − (Disbursed + Expenses)."
          formula="Total Capital + Total Collections − (Total Disbursed + Total Expenses)."
          period="Current available cash position."
          source="partner_capital_transactions, payments, accounts, and expenses."
        />
        <MetricTooltipCard
          title="Total Company Expenses"
          value={money(ledgerData.expenses?.totalExpenses)}
          tone="orange"
          detail={
            <div style={{ display: "flex", gap: "6px", marginTop: "6px", flexWrap: "wrap" }}>
              <span style={{ display: "inline-flex", alignItems: "center", gap: "4px", background: "#ecfdf5", color: "#047857", border: "1px solid #a7f3d0", padding: "2px 8px", borderRadius: "5px", fontSize: "11px", fontWeight: "700" }}>
                <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: "#10b981" }} />
                Daily: {money(ledgerData.expenses?.dailyExpenses || 0)}
              </span>
              <span style={{ display: "inline-flex", alignItems: "center", gap: "4px", background: "#eff6ff", color: "#1d4ed8", border: "1px solid #bfdbfe", padding: "2px 8px", borderRadius: "5px", fontSize: "11px", fontWeight: "700" }}>
                <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: "#3b82f6" }} />
                Auto: {money(ledgerData.expenses?.autoExpenses || 0)}
              </span>
            </div>
          }
          definition="Total operational expenses incurred across Daily, Auto, and General operations."
          formula="Daily Expenses + Auto Expenses + General Expenses."
          period="Lifetime to date."
          source="expenses table."
        />
      </div>

      {/* SECTION 2: Combined Loan Portfolio & Collections (Same concept as Daily) */}
      <div className="metricGroupHeading">
        <h3>Loan Portfolio &amp; Collections</h3>
        <p>Combined principal issued, interest, disbursed amount, and collections.</p>
      </div>
      <div className="metricGrid" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))", marginBottom: "26px" }}>
        <MetricTooltipCard
          title="Total Finance Given (Gross)"
          value={money(ledgerData.portfolio?.grossGiven || 0)}
          detail={
            <div style={{ display: "flex", gap: "6px", marginTop: "6px", flexWrap: "wrap" }}>
              <span style={{ display: "inline-flex", alignItems: "center", gap: "4px", background: "#ecfdf5", color: "#047857", border: "1px solid #a7f3d0", padding: "2px 8px", borderRadius: "5px", fontSize: "11px", fontWeight: "700" }}>
                <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: "#10b981" }} />
                Daily: {money(ledgerData.portfolio?.daily?.gross || 0)}
              </span>
              <span style={{ display: "inline-flex", alignItems: "center", gap: "4px", background: "#eff6ff", color: "#1d4ed8", border: "1px solid #bfdbfe", padding: "2px 8px", borderRadius: "5px", fontSize: "11px", fontWeight: "700" }}>
                <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: "#3b82f6" }} />
                Auto: {money(ledgerData.portfolio?.auto?.gross || 0)}
              </span>
            </div>
          }
          definition="Total gross contractual loan amount across Daily and Auto."
          formula="Daily agreed payable + Auto expected gross return."
          period="Lifetime to date."
          source="daily_finance_accounts and autofinance_loans."
        />
        <MetricTooltipCard
          title="Interest"
          value={money(ledgerData.portfolio?.interest || 0)}
          detail={
            <div style={{ display: "flex", gap: "6px", marginTop: "6px", flexWrap: "wrap" }}>
              <span style={{ display: "inline-flex", alignItems: "center", gap: "4px", background: "#ecfdf5", color: "#047857", border: "1px solid #a7f3d0", padding: "2px 8px", borderRadius: "5px", fontSize: "11px", fontWeight: "700" }}>
                <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: "#10b981" }} />
                Daily: {money(ledgerData.portfolio?.daily?.interest || 0)}
              </span>
              <span style={{ display: "inline-flex", alignItems: "center", gap: "4px", background: "#eff6ff", color: "#1d4ed8", border: "1px solid #bfdbfe", padding: "2px 8px", borderRadius: "5px", fontSize: "11px", fontWeight: "700" }}>
                <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: "#3b82f6" }} />
                Auto: {money(ledgerData.portfolio?.auto?.interest || 0)}
              </span>
            </div>
          }
          definition="Total interest earnings (Daily upfront deductions + Auto scheduled interest)."
          formula="Daily initial_deduction + Auto scheduled interest component."
          period="Lifetime to date."
          source="daily_finance_accounts and autofinance_emi_schedules."
        />
        <MetricTooltipCard
          title="Amount Given"
          value={money(ledgerData.portfolio?.disbursed || 0)}
          detail={
            <div style={{ display: "flex", gap: "6px", marginTop: "6px", flexWrap: "wrap" }}>
              <span style={{ display: "inline-flex", alignItems: "center", gap: "4px", background: "#ecfdf5", color: "#047857", border: "1px solid #a7f3d0", padding: "2px 8px", borderRadius: "5px", fontSize: "11px", fontWeight: "700" }}>
                <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: "#10b981" }} />
                Daily: {money(ledgerData.portfolio?.daily?.disbursed || 0)}
              </span>
              <span style={{ display: "inline-flex", alignItems: "center", gap: "4px", background: "#eff6ff", color: "#1d4ed8", border: "1px solid #bfdbfe", padding: "2px 8px", borderRadius: "5px", fontSize: "11px", fontWeight: "700" }}>
                <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: "#3b82f6" }} />
                Auto: {money(ledgerData.portfolio?.auto?.disbursed || 0)}
              </span>
            </div>
          }
          definition="Total net principal disbursed into borrowers' hands."
          formula="Daily net disbursement + Auto loan principal amount."
          period="Lifetime to date."
          source="daily_finance_accounts and autofinance_loans."
        />
        <MetricTooltipCard
          title="Collection Amount"
          value={money(ledgerData.portfolio?.collected || 0)}
          tone="green"
          detail={
            <div style={{ display: "flex", gap: "6px", marginTop: "6px", flexWrap: "wrap" }}>
              <span style={{ display: "inline-flex", alignItems: "center", gap: "4px", background: "#ecfdf5", color: "#047857", border: "1px solid #a7f3d0", padding: "2px 8px", borderRadius: "5px", fontSize: "11px", fontWeight: "700" }}>
                <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: "#10b981" }} />
                Daily: {money(ledgerData.portfolio?.daily?.collected || 0)}
              </span>
              <span style={{ display: "inline-flex", alignItems: "center", gap: "4px", background: "#eff6ff", color: "#1d4ed8", border: "1px solid #bfdbfe", padding: "2px 8px", borderRadius: "5px", fontSize: "11px", fontWeight: "700" }}>
                <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: "#3b82f6" }} />
                Auto: {money(ledgerData.portfolio?.auto?.collected || 0)}
              </span>
            </div>
          }
          definition="Total repayments and EMIs collected to date across both divisions."
          formula="Daily collected payments + Auto collected EMI payments."
          period="Lifetime to date."
          source="daily_finance_payments and autofinance_payments."
        />
        <MetricTooltipCard
          title="Remaining"
          value={money(ledgerData.portfolio?.remaining || 0)}
          tone="orange"
          detail={
            <div style={{ display: "flex", gap: "6px", marginTop: "6px", flexWrap: "wrap" }}>
              <span style={{ display: "inline-flex", alignItems: "center", gap: "4px", background: "#ecfdf5", color: "#047857", border: "1px solid #a7f3d0", padding: "2px 8px", borderRadius: "5px", fontSize: "11px", fontWeight: "700" }}>
                <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: "#10b981" }} />
                Daily: {money(ledgerData.portfolio?.daily?.remaining || 0)}
              </span>
              <span style={{ display: "inline-flex", alignItems: "center", gap: "4px", background: "#eff6ff", color: "#1d4ed8", border: "1px solid #bfdbfe", padding: "2px 8px", borderRadius: "5px", fontSize: "11px", fontWeight: "700" }}>
                <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: "#3b82f6" }} />
                Auto: {money(ledgerData.portfolio?.auto?.remaining || 0)}
              </span>
            </div>
          }
          definition="Total loan dues still outstanding to be collected from borrowers."
          formula="Total Gross Given minus Total Collections."
          period="Current outstanding balances."
          source="daily_finance_accounts and autofinance_loans."
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
