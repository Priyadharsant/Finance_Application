import React, { useState, useMemo } from "react";
import {
  Users,
  Plus,
  MinusCircle,
  Phone,
  Mail,
  Download,
  Search,
  X,
  Calendar,
  RotateCcw,
  ChevronDown,
  ChevronUp,
  AlertCircle,
} from "lucide-react";
import { money } from "../utils/formatters.js";
import { exportPartnerBalances } from "../services/globalCapitalExportUtils.js";

export default function PartnerManagement({
  partners,
  onOpenAddPartner,
  onOpenCapitalAction,
  onSelectRecord,
}) {
  const currentMonthStr = new Date().toISOString().slice(0, 7);
  const [monthFilter, setMonthFilter] = useState(currentMonthStr);
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedPartnerId, setExpandedPartnerId] = useState(null);

  const filteredPartners = useMemo(() => {
    return (partners || []).filter((p) => {
      if (monthFilter) {
        const joinDate = String(p.created_at || p.effective_date || "").slice(0, 7);
        if (joinDate !== monthFilter) return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchName = (p.name || p.partner_name || "").toLowerCase().includes(q);
        const matchPhone = (p.phone || "").toLowerCase().includes(q);
        const matchEmail = (p.email || "").toLowerCase().includes(q);
        const matchPan = (p.pan_number || p.pan || "").toLowerCase().includes(q);
        if (!matchName && !matchPhone && !matchEmail && !matchPan) return false;
      }
      return true;
    });
  }, [partners, monthFilter, searchQuery]);

  const totalAvailableCapital = filteredPartners.reduce(
    (sum, p) => sum + Number(p.current_capital || 0),
    0
  );
  const totalWithdrawn = filteredPartners.reduce(
    (sum, p) => sum + Number(p.total_withdrawn || 0),
    0
  );

  return (
    <div className="financeFadeIn globalCapitalView">
      <div className="financeHeader">
        <div>
          <span className="overline autoBadgeTag">CAPITAL NETWORK</span>
          <h2>Business Partners</h2>
          <p className="globalSectionDescription">Manage partner capital simply.</p>
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
            onClick={() => exportPartnerBalances(filteredPartners)}
            title="Download partner report to Excel"
          >
            <Download size={16} /> Download Excel{filteredPartners.length < (partners?.length || 0) ? ` (${filteredPartners.length})` : ""}
          </button>
          <button
            className="primaryBtn"
            onClick={onOpenAddPartner}
          >
            <Plus size={16} /> Add Partner
          </button>
        </div>
      </div>

      <div className="globalCapitalStats compact">
        <div>
          <span>Filtered partners</span>
          <strong>{filteredPartners.length}</strong>
          <small>Total registered: {partners.length}</small>
        </div>
        <div>
          <span>Current Partner Balance</span>
          <strong style={{ color: "#0f766e" }}>
            {money(totalAvailableCapital)}
          </strong>
          <small>Active partner balance</small>
        </div>
        <div>
          <span>Total Withdrawn</span>
          <strong style={{ color: "#e11d48" }}>
            -{money(totalWithdrawn)}
          </strong>
          <small>Total money withdrawn</small>
        </div>
      </div>

      {/* Partner Filters Bar */}
      <div className="expenseFilterBar mt-20" style={{ margin: "20px 0 14px", padding: "10px 14px", background: "#f8fafc", borderRadius: "10px", border: "1px solid #e2e8f0", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "10px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
          {/* Month Calendar Picker (Join Month) */}
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
            title="Filter by Join Month Calendar"
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
              title="Click calendar icon to filter by join month"
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

          <div className="expenseSearchInput" style={{ minWidth: "240px" }}>
            <Search size={14} color="#94a3b8" />
            <input
              type="text"
              placeholder="Search partner, phone, PAN..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
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

          {(monthFilter !== currentMonthStr || searchQuery) && (
            <button
              type="button"
              className="secondaryBtn"
              style={{ padding: "5px 10px", fontSize: "11px", display: "inline-flex", alignItems: "center", gap: "4px" }}
              onClick={() => {
                setMonthFilter(currentMonthStr);
                setSearchQuery("");
              }}
            >
              <RotateCcw size={12} /> Reset Filters
            </button>
          )}
        </div>
      </div>

      <div className="financeCard globalCapitalCard">
        <div
          className="cardHead"
          style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <h3 style={{ margin: 0 }}>
              <Users size={18} /> Partner Profiles &amp; Balances
            </h3>
            <span className="tag autoTag" style={{ fontSize: "11px" }}>
              {filteredPartners.length} of {partners.length}
            </span>
          </div>
          <span style={{ fontSize: "12px", color: "#64748b" }}>
            💡 Click any partner to view details &amp; account history
          </span>
        </div>
        <div className="tableResponsive">
          <table className="financeTable">
            <thead>
              <tr>
                <th>Partner &amp; Contact</th>
                <th style={{ textAlign: "right" }}>Total Out</th>
                <th style={{ textAlign: "right" }}>Current Balance</th>
                <th style={{ textAlign: "center", width: "220px" }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredPartners.map((p) => (
                <tr
                  className="clickable globalClickableRow"
                  key={p.id}
                  title="Click to view partner details"
                  onClick={() =>
                    onSelectRecord({ type: "partner", record: p })
                  }
                >
                  <td>
                    <div style={{ display: "flex", flexDirection: "column", gap: "3px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                        <strong style={{ fontSize: "14px", color: "#0f172a" }}>
                          {p.name}
                        </strong>
                        {p.borrowed_funds && p.borrowed_funds.length > 0 && (
                          <button
                            type="button"
                            className="tag"
                            style={{
                              background: expandedPartnerId === p.id ? "#7c3aed" : "#f5f3ff",
                              color: expandedPartnerId === p.id ? "#ffffff" : "#7c3aed",
                              border: "1px solid #ddd6fe",
                              borderRadius: "6px",
                              padding: "2px 8px",
                              fontSize: "11px",
                              fontWeight: "700",
                              cursor: "pointer",
                              display: "inline-flex",
                              alignItems: "center",
                              gap: "4px",
                            }}
                            onClick={(e) => {
                              e.stopPropagation();
                              setExpandedPartnerId(expandedPartnerId === p.id ? null : p.id);
                            }}
                            title="Click to view borrowed money sources and interest"
                          >
                            <span>Lend Money ({p.borrowed_funds.length})</span>
                            {expandedPartnerId === p.id ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                          </button>
                        )}
                      </div>

                      <div className="partnerContactPills">
                        {p.phone && (
                          <a
                            href={`tel:${p.phone}`}
                            onClick={(e) => e.stopPropagation()}
                          >
                            <Phone size={11} /> {p.phone}
                          </a>
                        )}
                        {p.email && (
                          <a
                            href={`mailto:${p.email}`}
                            onClick={(e) => e.stopPropagation()}
                          >
                            <Mail size={11} /> {p.email}
                          </a>
                        )}
                      </div>

                      {/* COLLAPSIBLE BORROWED FUNDS DROPDOWN */}
                      {expandedPartnerId === p.id && p.borrowed_funds && (
                        <div
                          style={{
                            marginTop: "8px",
                            padding: "10px 12px",
                            background: "#faf5ff",
                            border: "1px solid #e9d5ff",
                            borderRadius: "8px",
                            fontSize: "12px",
                          }}
                          onClick={(e) => e.stopPropagation()}
                        >
                          <div style={{ fontWeight: "700", color: "#6b21a8", marginBottom: "6px", display: "flex", justifyContent: "space-between" }}>
                            <span>Borrowed / Lend Money Breakdown:</span>
                            <span>Total: ₹{Number(p.borrowed_total || 0).toLocaleString("en-IN")}</span>
                          </div>
                          <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                            {p.borrowed_funds.map((bf) => (
                              <div
                                key={bf.id}
                                style={{
                                  background: "#ffffff",
                                  padding: "6px 10px",
                                  borderRadius: "6px",
                                  border: "1px solid #f3e8ff",
                                  display: "flex",
                                  justifyContent: "space-between",
                                  alignItems: "center",
                                }}
                              >
                                <div>
                                  <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                                    <strong style={{ color: "#0f172a" }}>{bf.lender_name || "Lender"}</strong>
                                    {bf.transaction_type === "WITHDRAWAL" && (
                                      <span style={{ fontSize: "10px", background: "#fee2e2", color: "#dc2626", padding: "1px 6px", borderRadius: "4px", fontWeight: "600" }}>
                                        Repaid / Withdrawn
                                      </span>
                                    )}
                                  </div>
                                  <div style={{ color: "#64748b", fontSize: "11px" }}>
                                    Date: {bf.effective_date ? new Date(bf.effective_date).toLocaleDateString("en-IN") : "—"}
                                    {bf.notes ? ` · ${bf.notes}` : ""}
                                  </div>
                                </div>
                                <div style={{ textAlign: "right" }}>
                                  <div style={{ fontWeight: "700", color: bf.transaction_type === "WITHDRAWAL" ? "#dc2626" : "#7c3aed" }}>
                                    {bf.transaction_type === "WITHDRAWAL" ? "-" : "+"}₹{Number(bf.amount || 0).toLocaleString("en-IN")}
                                  </div>
                                  <span style={{ fontSize: "11px", color: "#b91c1c", fontWeight: "600" }}>
                                    Interest: {bf.interest_rate || 0}%
                                  </span>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </td>
                  <td
                    style={{
                      textAlign: "right",
                      fontWeight: "600",
                      color: "#e11d48",
                    }}
                  >
                    -{money(p.total_withdrawn)}
                  </td>
                  <td
                    style={{
                      textAlign: "right",
                      fontWeight: "700",
                      fontSize: "14.5px",
                      color: "#0f766e",
                    }}
                  >
                    {money(p.current_capital)}
                  </td>
                  <td style={{ textAlign: "center" }}>
                    <div
                      style={{
                        display: "inline-flex",
                        gap: "6px",
                        alignItems: "center",
                      }}
                      onClick={(e) => e.stopPropagation()}
                    >
                      <button
                        type="button"
                        className="partnerActionBtn add"
                        title="Add Money / Capital Deposit"
                        onClick={() => onOpenCapitalAction(p.id, "CONTRIBUTION")}
                      >
                        + Add
                      </button>
                      <button
                        type="button"
                        className="partnerActionBtn withdraw"
                        title="Withdraw Money"
                        onClick={() => onOpenCapitalAction(p.id, "WITHDRAWAL")}
                      >
                        - Withdraw
                      </button>
                      <button
                        type="button"
                        className="secondaryBtn"
                        style={{
                          padding: "4px 8px",
                          fontSize: "11px",
                          borderRadius: "6px",
                        }}
                        title="View full details"
                        onClick={() =>
                          onSelectRecord({ type: "partner", record: p })
                        }
                      >
                        Details →
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {filteredPartners.length === 0 && (
                <tr>
                  <td colSpan="4" style={{ textAlign: "center", padding: "36px", color: "#64748b" }}>
                    No partners match your selected filters or search query.
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
