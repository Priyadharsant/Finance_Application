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
import { money } from "../utils/formatters.js";
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
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchNotes = (tx.notes || "").toLowerCase().includes(q);
        const matchType = (tx.type || "").toLowerCase().includes(q);
        const matchRef = (String(tx.reference_id || "") + " " + String(tx.reference_type || "")).toLowerCase().includes(q);
        const matchDesc = (tx.description || "").toLowerCase().includes(q);
        const matchMod = (tx.source_module || "").toLowerCase().includes(q);
        if (!matchNotes && !matchType && !matchRef && !matchDesc && !matchMod) return false;
      }

      return true;
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
      <div className="globalCapitalHero">
        <div className="analyticsBannerHead">
          <h4>
            <Globe size={18} /> Available Company Capital
          </h4>
        </div>
        <strong>
          {money(ledgerData.availableCapital)}
        </strong>
        <p>
          Net real-time capital balance (Gross capital minus all business &amp; brokerage expenses).
        </p>
      </div>

      {/* KPI Stats (Dynamic based on Active Filters) */}
      <div className="globalCapitalStats sixCol">
        <div>
          <span>{isFiltered ? "Filtered Inflow" : "Gross Revenue"}</span>
          <strong style={{ color: "#059669" }}>
            {money(isFiltered ? filteredInflow : ledgerData.revenue?.totalRevenue)}
          </strong>
          <small>
            {isFiltered ? "Credits in active filter" : `Auto: ${money(ledgerData.revenue?.autoRevenue)} • Daily: ${money(ledgerData.revenue?.dailyRevenue)}`}
          </small>
        </div>
        <div>
          <span>{isFiltered ? "Filtered Outflow" : "Total Expenses"}</span>
          <strong style={{ color: "#e11d48" }}>
            {money(isFiltered ? filteredOutflow : ledgerData.expenses?.totalExpenses)}
          </strong>
          <small>
            {isFiltered ? "Debits in active filter" : `Auto: ${money(ledgerData.expenses?.autoExpenses)} • Daily: ${money(ledgerData.expenses?.dailyExpenses)}`}
          </small>
        </div>
        <div>
          <span>{isFiltered ? "Filtered Net Movement" : "Net Profit"}</span>
          <strong
            style={{
              color: (isFiltered ? filteredNetFlow : Number(ledgerData.netProfit || 0)) >= 0 ? "#0d9488" : "#e11d48",
            }}
          >
            {isFiltered ? (filteredNetFlow >= 0 ? "+" : "") + money(filteredNetFlow) : money(ledgerData.netProfit)}
          </strong>
          <small>{isFiltered ? "Inflow minus Outflow" : "Revenue minus All Expenses"}</small>
        </div>
        <div>
          <span>{isFiltered ? "Auto Module Inflow" : "Capital in"}</span>
          <strong style={{ color: isFiltered ? "#2563eb" : undefined }}>
            {isFiltered ? `+${money(filteredAutoInflow)}` : money(ledgerData.totalCredits || totalCredits)}
          </strong>
          <small>{isFiltered ? "Auto Finance Credits" : "Partner contributions"}</small>
        </div>
        <div>
          <span>{isFiltered ? "Daily Module Inflow" : "Capital deployed"}</span>
          <strong style={{ color: isFiltered ? "#059669" : undefined }}>
            {isFiltered ? `+${money(filteredDailyInflow)}` : money(ledgerData.totalDebits || totalDebits)}
          </strong>
          <small>{isFiltered ? "Daily Finance Credits" : "Finance disbursements"}</small>
        </div>
        <div>
          <span>Ledger entries</span>
          <strong>{filteredLedger.length}</strong>
          <small>{isFiltered ? `Filtered of ${rawLedger.length}` : "Auditable transactions"}</small>
        </div>
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
            <option value="ALL">All Cash Flows</option>
            <option value="CREDIT">Inflow (Credits Only)</option>
            <option value="DEBIT">Outflow (Debits Only)</option>
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
              placeholder="Search narration, ref, type..."
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
            <Landmark size={18} /> Global Cash Ledger
          </h3>
          <div style={{ display: "flex", alignItems: "center", gap: "12px", flexWrap: "wrap" }}>
            <button
              className="secondaryBtn"
              style={{ padding: "6px 12px", fontSize: "12px" }}
              onClick={() => exportGlobalLedger(filteredLedger, { label: monthFilter || undefined })}
              title="Export Filtered General Cash Ledger to Excel"
            >
              <Download size={14} /> Export Ledger (Excel)
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
              <span>💡 Click any row to view full transaction details</span>
            </span>
          </div>
        </div>
        <div className="tableResponsive">
          <table className="financeTable">
            <thead>
              <tr>
                <th>Date</th>
                <th>Type / Description</th>
                <th>Module</th>
                <th>Direction</th>
                <th style={{ textAlign: "right" }}>Amount</th>
                <th style={{ textAlign: "center", width: "90px" }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {filteredLedger.map((tx) => (
                <tr
                  className="clickable globalClickableRow"
                  key={tx.id}
                  title="Click to view full transaction details"
                  onClick={() => onSelectRecord({ type: "ledger", record: tx })}
                >
                  <td>
                    <span style={{ fontWeight: "500" }}>
                      {new Date(tx.effective_date).toLocaleDateString()}
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
                    colSpan="6"
                    style={{ textAlign: "center", color: "#64748b", padding: "24px" }}
                  >
                    No ledger transactions found matching the applied filters.
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
