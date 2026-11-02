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
import { money, formatTxNotes, formatDate } from "../utils/formatters.js";
import { matchesSearch } from "../../utils/search.js";
import { exportCapitalTransactions } from "../services/globalCapitalExportUtils.js";

export default function CapitalTransactionsTab({
  transactions = [],
  partners = [],
  txFilterType,
  setTxFilterType,
  onOpenCapitalAction,
  onSelectRecord,
}) {
  const [monthFilter, setMonthFilter] = useState("");
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
      if (!matchesSearch(searchQuery, t)) return false;

      return true;
    }).sort((a, b) => {
      const da = new Date(a.effective_date || a.transaction_date || 0).getTime();
      const db = new Date(b.effective_date || b.transaction_date || 0).getTime();
      if (da !== db) return da - db;
      const ca = new Date(a.created_at || a.createdAt || 0).getTime();
      const cb = new Date(b.created_at || b.createdAt || 0).getTime();
      return ca - cb;
    });
  }, [transactions, txFilterType, monthFilter, partnerFilter, searchQuery]);

  const totalIn = filteredTransactions
    .filter((t) => t.transaction_type === "CONTRIBUTION" || t.transaction_type === "ADJUSTMENT_INCREASE" || t.transaction_type === "PROFIT_SHARE")
    .reduce((sum, t) => sum + Number(t.amount || 0), 0);

  const totalOut = filteredTransactions
    .filter((t) => t.transaction_type === "WITHDRAWAL" || t.transaction_type === "ADJUSTMENT_DECREASE" || t.transaction_type === "CAPITAL_EXIT")
    .reduce((sum, t) => sum + Number(t.amount || 0), 0);

  return (
    <div className="financeFadeIn globalCapitalView">
      <div className="financeHeader">
        <div>
          <span className="overline autoBadgeTag">FINANCIAL FLOW</span>
          <h2>Capital Transactions</h2>
          <p className="globalSectionDescription">Audit trail of all money invested and withdrawn.</p>
        </div>
        <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
          <button
            className="secondaryBtn"
            style={{ color: "#dc2626", borderColor: "#fca5a5" }}
            onClick={() => onOpenCapitalAction(null, "WITHDRAWAL")}
          >
            <MinusCircle size={16} /> Withdraw Money
          </button>
          <button
            className="primaryBtn"
            style={{ background: "#059669", borderColor: "#059669" }}
            onClick={() => onOpenCapitalAction(null, "CONTRIBUTION")}
          >
            <Plus size={16} /> Add Money (Deposit)
          </button>
          <button
            className="secondaryBtn"
            onClick={() => exportCapitalTransactions(filteredTransactions)}
            title="Download transactions to Excel"
          >
            <Download size={16} /> Download Excel{filteredTransactions.length < (transactions?.length || 0) ? ` (${filteredTransactions.length})` : ""}
          </button>
        </div>
      </div>

      <div className="globalCapitalStats compact">
        <div>
          <span>Total Transactions</span>
          <strong>{filteredTransactions.length}</strong>
          <small>Showing {filteredTransactions.length} of {transactions.length} records</small>
        </div>
        <div>
          <span>Capital Inflow (Deposits)</span>
          <strong style={{ color: "#059669" }}>
            +{money(totalIn)}
          </strong>
          <small>Total additions</small>
        </div>
        <div>
          <span>Capital Outflow (Withdrawals)</span>
          <strong style={{ color: "#dc2626" }}>
            -{money(totalOut)}
          </strong>
          <small>Total withdrawals</small>
        </div>
      </div>

      {/* Filter and Control Bar */}
      <div className="expenseFilterBar mt-20" style={{ margin: "20px 0 14px", padding: "10px 14px", background: "#f8fafc", borderRadius: "10px", border: "1px solid #e2e8f0", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "10px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
          {/* Segment Pills (Type) */}
          <div className="segmentControls" style={{ display: "inline-flex", background: "#e2e8f0", padding: "2px", borderRadius: "8px" }}>
            <button
              type="button"
              className={`segmentBtn ${txFilterType === "ALL" ? "active" : ""}`}
              onClick={() => setTxFilterType("ALL")}
              style={{ padding: "4px 10px", fontSize: "12px", border: "none", borderRadius: "6px", cursor: "pointer", background: txFilterType === "ALL" ? "#ffffff" : "transparent", fontWeight: txFilterType === "ALL" ? "700" : "500" }}
            >
              All
            </button>
            <button
              type="button"
              className={`segmentBtn ${txFilterType === "CONTRIBUTION" ? "active" : ""}`}
              onClick={() => setTxFilterType("CONTRIBUTION")}
              style={{ padding: "4px 10px", fontSize: "12px", border: "none", borderRadius: "6px", cursor: "pointer", background: txFilterType === "CONTRIBUTION" ? "#ffffff" : "transparent", fontWeight: txFilterType === "CONTRIBUTION" ? "700" : "500", color: txFilterType === "CONTRIBUTION" ? "#059669" : "inherit" }}
            >
              Inflow (Deposits)
            </button>
            <button
              type="button"
              className={`segmentBtn ${txFilterType === "WITHDRAWAL" ? "active" : ""}`}
              onClick={() => setTxFilterType("WITHDRAWAL")}
              style={{ padding: "4px 10px", fontSize: "12px", border: "none", borderRadius: "6px", cursor: "pointer", background: txFilterType === "WITHDRAWAL" ? "#ffffff" : "transparent", fontWeight: txFilterType === "WITHDRAWAL" ? "700" : "500", color: txFilterType === "WITHDRAWAL" ? "#dc2626" : "inherit" }}
            >
              Outflow (Withdrawals)
            </button>
          </div>

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
            title="Filter by Transaction Month"
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
              title="Click calendar icon to filter by month"
            />
            {monthFilter && (
              <button
                type="button"
                onClick={() => setMonthFilter("")}
                style={{
                  border: "none",
                  background: "transparent",
                  color: "#64748b",
                  cursor: "pointer",
                  padding: "0 2px",
                }}
                title="Clear Month Filter"
              >
                <X size={13} />
              </button>
            )}
          </div>

          {/* Partner Dropdown */}
          <select
            value={partnerFilter}
            onChange={(e) => setPartnerFilter(e.target.value)}
            style={{
              padding: "5px 10px",
              borderRadius: "8px",
              border: "1px solid #cbd5e1",
              fontSize: "12px",
              background: "#ffffff",
              cursor: "pointer",
              fontWeight: "500",
            }}
          >
            <option value="ALL">All Partners</option>
            {partnerOptions.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name || p.partner_name}
              </option>
            ))}
          </select>

          {(monthFilter || partnerFilter !== "ALL" || txFilterType !== "ALL" || searchQuery) && (
            <button
              type="button"
              className="secondaryBtn"
              style={{ padding: "4px 8px", fontSize: "11.5px" }}
              onClick={() => {
                setMonthFilter("");
                setPartnerFilter("ALL");
                setTxFilterType("ALL");
                setSearchQuery("");
              }}
            >
              <RotateCcw size={12} /> Reset
            </button>
          )}
        </div>

        {/* Search */}
        <div className="searchBox">
          <Search size={14} />
          <input
            type="text"
            placeholder="Search partner/lender, phone, ID, type, amount, date, notes..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery("")}
              style={{
                border: "none",
                background: "transparent",
                color: "#94a3b8",
                cursor: "pointer",
              }}
            >
              <X size={14} />
            </button>
          )}
        </div>
      </div>

      {/* Transactions Table */}
      <div className="financeTableCard">
        <div className="tableWrap">
          <table className="financeTable">
            <thead>
              <tr>
                <th>Date</th>
                <th>Partner</th>
                <th>Type</th>
                <th>Source</th>
                <th>Notes / Narration</th>
                <th style={{ textAlign: "right" }}>Amount</th>
                <th style={{ textAlign: "center" }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredTransactions.map((t) => {
                const isDeposit = t.transaction_type === "CONTRIBUTION" || t.transaction_type === "ADJUSTMENT_INCREASE" || t.transaction_type === "PROFIT_SHARE";
                return (
                  <tr
                    key={t.id}
                    onClick={() => onSelectRecord({ type: "capital_transaction", record: t })}
                    style={{ cursor: "pointer" }}
                  >
                    <td style={{ whiteSpace: "nowrap" }}>
                      {formatDate(t.effective_date || t.transaction_date || t.created_at)}
                    </td>
                    <td>
                      <div style={{ fontWeight: "700", color: "#0f172a" }}>
                        {t.partner_name || "—"}
                      </div>
                      {t.reference_number && (
                        <div style={{ fontSize: "11px", color: "#64748b" }}>
                          Ref: {t.reference_number}
                        </div>
                      )}
                    </td>
                    <td>
                      <span
                        className="autoBadgeTag"
                        style={{
                          background: isDeposit ? "#ecfdf5" : "#fef2f2",
                          color: isDeposit ? "#059669" : "#dc2626",
                          border: `1px solid ${isDeposit ? "#a7f3d0" : "#fecaca"}`,
                          fontWeight: "700",
                          fontSize: "11px",
                          padding: "2px 8px",
                          borderRadius: "12px",
                        }}
                      >
                        {isDeposit ? "DEPOSIT" : "WITHDRAWAL"}
                      </span>
                    </td>
                    <td>
                      {t.fund_source_type === "LEND" ? (
                        <span style={{ color: "#7c3aed", fontWeight: "600", fontSize: "12px" }}>
                          Lend ({t.lender_name || "Borrower"})
                        </span>
                      ) : (
                        <span style={{ color: "#0d9488", fontWeight: "600", fontSize: "12px" }}>
                          Own
                        </span>
                      )}
                    </td>
                    <td style={{ maxWidth: "250px" }}>
                      <div style={{ fontSize: "12px", color: "#334155", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {formatTxNotes(t.notes) || "—"}
                      </div>
                    </td>
                    <td style={{ textAlign: "right", fontWeight: "700" }}>
                      <span style={{ color: isDeposit ? "#059669" : "#dc2626" }}>
                        {isDeposit ? "+" : "-"}{money(t.amount)}
                      </span>
                    </td>
                    <td style={{ textAlign: "center" }}>
                      <button
                        type="button"
                        className="secondaryBtn"
                        style={{ padding: "3px 8px", fontSize: "11px" }}
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelectRecord({ type: "capital_transaction", record: t });
                        }}
                      >
                        Details →
                      </button>
                    </td>
                  </tr>
                );
              })}
              {filteredTransactions.length === 0 && (
                <tr>
                  <td colSpan="7" style={{ textAlign: "center", padding: "36px", color: "#64748b" }}>
                    No capital transactions match your selected filters.
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
