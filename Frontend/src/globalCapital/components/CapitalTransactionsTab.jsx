import React, { useState, useMemo } from "react";
import {
  Plus,
  MinusCircle,
  ArrowDownCircle,
  ArrowRightCircle,
  Download,
  Calendar,
  Search,
  X,
  RotateCcw,
} from "lucide-react";
import { money, formatTxNotes } from "../utils/formatters.js";
import { exportCapitalTransactions } from "../services/globalCapitalExportUtils.js";

export default function CapitalTransactionsTab({
  transactions = [],
  partners = [],
  txFilterType,
  setTxFilterType,
  onOpenCapitalAction,
  onSelectRecord,
}) {
  const currentMonthStr = new Date().toISOString().slice(0, 7);
  const [monthFilter, setMonthFilter] = useState(currentMonthStr);
  const [partnerFilter, setPartnerFilter] = useState("ALL");
  const [searchQuery, setSearchQuery] = useState("");

  // Unique partner list for dropdown
  const partnerOptions = useMemo(() => {
    if (partners && partners.length > 0) return partners;
    const map = new Map();
    (transactions || []).forEach((t) => {
      if (t.partner_id && !map.has(t.partner_id)) {
        map.set(t.partner_id, { id: t.partner_id, name: t.partner_name || `Partner #${t.partner_id}` });
      }
    });
    return Array.from(map.values());
  }, [partners, transactions]);

  // Comprehensive in-page filtering
  const filteredTransactions = useMemo(() => {
    return (transactions || []).filter((t) => {
      // 1. Transaction Type filter
      if (txFilterType === "CONTRIBUTION") {
        const isContrib =
          t.transaction_type === "CONTRIBUTION" ||
          t.transaction_type === "ADJUSTMENT_INCREASE" ||
          t.transaction_type === "PROFIT_SHARE";
        if (!isContrib) return false;
      } else if (txFilterType === "WITHDRAWAL") {
        const isWithdrawal =
          t.transaction_type === "WITHDRAWAL" ||
          t.transaction_type === "ADJUSTMENT_DECREASE" ||
          t.transaction_type === "CAPITAL_EXIT";
        if (!isWithdrawal) return false;
      }

      // 2. Month Calendar filter (YYYY-MM)
      if (monthFilter) {
        const txDate = String(t.effective_date || t.transaction_date || t.created_at || "").slice(0, 7);
        if (txDate !== monthFilter) return false;
      }

      // 3. Partner filter
      if (partnerFilter !== "ALL") {
        if (String(t.partner_id) !== String(partnerFilter)) return false;
      }

      // 4. Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchPartner = (t.partner_name || "").toLowerCase().includes(q);
        const matchNotes = (t.notes || "").toLowerCase().includes(q);
        const matchRef = (t.reference_number || t.reference_id || "").toLowerCase().includes(q);
        const matchType = (t.transaction_type || "").toLowerCase().includes(q);
        if (!matchPartner && !matchNotes && !matchRef && !matchType) return false;
      }

      return true;
    });
  }, [transactions, txFilterType, monthFilter, partnerFilter, searchQuery]);

  const totalDeposits = filteredTransactions
    .filter(
      (t) =>
        t.transaction_type === "CONTRIBUTION" ||
        t.transaction_type === "ADJUSTMENT_INCREASE" ||
        t.transaction_type === "PROFIT_SHARE"
    )
    .reduce((sum, t) => sum + Number(t.amount || 0), 0);

  const totalWithdrawals = filteredTransactions
    .filter(
      (t) =>
        t.transaction_type === "WITHDRAWAL" ||
        t.transaction_type === "ADJUSTMENT_DECREASE" ||
        t.transaction_type === "CAPITAL_EXIT"
    )
    .reduce((sum, t) => sum + Number(t.amount || 0), 0);

  const netMovement = totalDeposits - totalWithdrawals;

  const isFiltered =
    txFilterType !== "ALL" ||
    monthFilter !== currentMonthStr ||
    partnerFilter !== "ALL" ||
    searchQuery.trim() !== "";

  const handleResetFilters = () => {
    setTxFilterType("ALL");
    setMonthFilter(currentMonthStr);
    setPartnerFilter("ALL");
    setSearchQuery("");
  };

  return (
    <div className="financeFadeIn globalCapitalView">
      <div className="financeHeader">
        <div>
          <span className="overline autoBadgeTag">CAPITAL ACTIVITY</span>
          <h2>Capital Transactions</h2>
          <p className="globalSectionDescription">
            Complete record of partner capital deposits, injections, withdrawals, and exit settlements.
          </p>
        </div>
        <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
          <button
            className="secondaryBtn"
            style={{ color: "#dc2626", borderColor: "#fca5a5" }}
            onClick={() => onOpenCapitalAction(null, "WITHDRAWAL")}
          >
            <MinusCircle size={16} /> Record Withdrawal
          </button>
          <button
            className="secondaryBtn"
            onClick={() => exportCapitalTransactions(filteredTransactions, { label: monthFilter || undefined })}
            title="Export Filtered Capital Transactions to Excel"
          >
            <Download size={16} /> Export Report (Excel)
            {filteredTransactions.length < transactions.length ? ` (${filteredTransactions.length})` : ""}
          </button>
          <button
            className="primaryBtn"
            style={{ background: "#059669", borderColor: "#059669" }}
            onClick={() => onOpenCapitalAction(null, "CONTRIBUTION")}
          >
            <Plus size={16} /> Record Contribution
          </button>
        </div>
      </div>

      {/* KPI Stats Reflecting Active Filters */}
      <div className="globalCapitalStats fourCol">
        <div>
          <span>Transactions</span>
          <strong>{filteredTransactions.length}</strong>
          <small>
            {isFiltered ? `Filtered from ${transactions.length} records` : `Total recorded records`}
          </small>
        </div>
        <div>
          <span>Capital In (Deposits)</span>
          <strong style={{ color: "#059669" }}>
            +{money(totalDeposits)}
          </strong>
          <small>Partner capital added</small>
        </div>
        <div>
          <span>Capital Out (Withdrawals)</span>
          <strong style={{ color: "#e11d48" }}>
            -{money(totalWithdrawals)}
          </strong>
          <small>Partner capital withdrawn</small>
        </div>
        <div>
          <span>Net Movement</span>
          <strong style={{ color: "#0f766e" }}>
            {money(netMovement)}
          </strong>
          <small>Net capital flow</small>
        </div>
      </div>

      {/* Interactive In-Page Filters Bar with Month Calendar */}
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
        {/* Left: Type Switcher */}
        <div style={{ display: "flex", gap: "8px", alignItems: "center", flexWrap: "wrap" }}>
          {[
            { id: "ALL", label: "All Types" },
            { id: "CONTRIBUTION", label: "Deposits (In)" },
            { id: "WITHDRAWAL", label: "Withdrawals (Out)" },
          ].map((f) => (
            <button
              key={f.id}
              type="button"
              className={`secondaryBtn ${txFilterType === f.id ? "active" : ""}`}
              style={{
                background: txFilterType === f.id ? "#0f766e" : "#ffffff",
                color: txFilterType === f.id ? "#ffffff" : "#475569",
                borderColor: txFilterType === f.id ? "#0f766e" : "#cbd5e1",
                fontSize: "12px",
                fontWeight: "600",
                padding: "6px 12px",
              }}
              onClick={() => setTxFilterType(f.id)}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* Right: Month Calendar, Partner Selector & Search Box */}
        <div style={{ display: "flex", gap: "10px", alignItems: "center", flexWrap: "wrap" }}>
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

          {/* Partner Selector */}
          <select
            value={partnerFilter}
            onChange={(e) => setPartnerFilter(e.target.value)}
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
            <option value="ALL">All Partners</option>
            {partnerOptions.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name || p.partner_name}
              </option>
            ))}
          </select>

          {/* Live Search */}
          <div className="expenseSearchInput" style={{ minWidth: "200px" }}>
            <Search size={14} color="#94a3b8" />
            <input
              type="text"
              placeholder="Search partner, note, UTR..."
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

      <div className="financeCard globalCapitalCard">
        <div className="tableResponsive">
          <table className="financeTable">
            <thead>
              <tr>
                <th>Date</th>
                <th>Partner</th>
                <th>Transaction Type</th>
                <th>Direction</th>
                <th>Narration / Notes</th>
                <th>Status</th>
                <th style={{ textAlign: "right" }}>Amount</th>
              </tr>
            </thead>
            <tbody>
              {filteredTransactions.map((t) => {
                const isContrib =
                  t.transaction_type === "CONTRIBUTION" ||
                  t.transaction_type === "ADJUSTMENT_INCREASE" ||
                  t.transaction_type === "PROFIT_SHARE";
                return (
                  <tr
                    className="clickable globalClickableRow"
                    key={t.id}
                    onClick={() =>
                      onSelectRecord({ type: "transaction", record: t })
                    }
                  >
                    <td>
                      {new Date(t.effective_date).toLocaleDateString("en-IN")}
                    </td>
                    <td style={{ fontWeight: "600", color: "#0f172a" }}>
                      {t.partner_name}
                    </td>
                    <td>
                      <span
                        className="analyticsPill"
                        style={{
                          background: isContrib ? "#ecfdf5" : "#fff1f2",
                          color: isContrib ? "#047857" : "#be123c",
                          fontWeight: "700",
                        }}
                      >
                        {t.transaction_type === "PROFIT_SHARE"
                          ? "AUTO PROFIT SHARE"
                          : t.transaction_type}
                      </span>
                    </td>
                    <td>
                      {isContrib ? (
                        <span
                          style={{
                            color: "#059669",
                            fontWeight: "600",
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "4px",
                          }}
                        >
                          <ArrowDownCircle size={14} /> IN
                        </span>
                      ) : (
                        <span
                          style={{
                            color: "#e11d48",
                            fontWeight: "600",
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "4px",
                          }}
                        >
                          <ArrowRightCircle size={14} /> OUT
                        </span>
                      )}
                    </td>
                    <td>
                      <small style={{ color: "#64748b" }}>
                        {formatTxNotes(t.notes)}
                      </small>
                    </td>
                    <td>
                      <span className="statusPill active">{t.status}</span>
                    </td>
                    <td
                      style={{
                        textAlign: "right",
                        fontWeight: "700",
                        fontSize: "14px",
                        color: isContrib ? "#059669" : "#e11d48",
                      }}
                    >
                      {isContrib ? "+" : "-"}
                      {money(t.amount)}
                    </td>
                  </tr>
                );
              })}
              {filteredTransactions.length === 0 && (
                <tr>
                  <td colSpan="7" style={{ textAlign: "center", padding: "30px", color: "#64748b" }}>
                    No capital transactions found matching the applied filters.
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
