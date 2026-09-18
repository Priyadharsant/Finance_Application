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
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [monthFilter, setMonthFilter] = useState(currentMonthStr);
  const [searchQuery, setSearchQuery] = useState("");

  const filteredPartners = useMemo(() => {
    return (partners || []).filter((p) => {
      const pStatus = (p.status || "ACTIVE").toUpperCase();
      if (statusFilter !== "ALL" && pStatus !== statusFilter) return false;
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
  }, [partners, statusFilter, monthFilter, searchQuery]);

  const totalAvailableCapital = filteredPartners.reduce(
    (sum, p) => sum + Number(p.current_capital || 0),
    0
  );
  const totalProfitEarned = filteredPartners.reduce(
    (sum, p) => sum + Number(p.profit_earned || 0),
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
          <p className="globalSectionDescription">
            Manage partner capital portfolios, track lifetime contributions and withdrawals, and disburse partner capital.
          </p>
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
            title="Export Filtered Partner Capital Report to Excel"
          >
            <Download size={16} /> Export Report (Excel){filteredPartners.length < (partners?.length || 0) ? ` (${filteredPartners.length})` : ""}
          </button>
          <button
            className="primaryBtn"
            onClick={onOpenAddPartner}
          >
            <Plus size={16} /> Add Partner
          </button>
        </div>
      </div>

      <div className="globalCapitalStats fourCol">
        <div>
          <span>Filtered partners</span>
          <strong>{filteredPartners.length}</strong>
          <small>Total registered: {partners.length}</small>
        </div>
        <div>
          <span>Current Available Capital</span>
          <strong style={{ color: "#0f766e" }}>
            {money(totalAvailableCapital)}
          </strong>
          <small>Filtered available capital</small>
        </div>
        <div>
          <span>Profit Earned</span>
          <strong style={{ color: "#7c3aed" }}>
            +{money(totalProfitEarned)}
          </strong>
          <small>Net profit credited</small>
        </div>
        <div>
          <span>Total Withdrawn (Out)</span>
          <strong style={{ color: "#e11d48" }}>
            -{money(totalWithdrawn)}
          </strong>
          <small>Lifetime withdrawals</small>
        </div>
      </div>

      {/* Partner Filters Bar */}
      <div className="expenseFilterBar mt-20" style={{ margin: "20px 0 14px", padding: "10px 14px", background: "#f8fafc", borderRadius: "10px", border: "1px solid #e2e8f0", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "10px" }}>
        <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
          {[
            { id: "ALL", label: "All Statuses" },
            { id: "ACTIVE", label: "Active" },
            { id: "INACTIVE", label: "Inactive" },
          ].map((st) => (
            <button
              key={st.id}
              type="button"
              className={`secondaryBtn ${statusFilter === st.id ? "active" : ""}`}
              style={{
                background: statusFilter === st.id ? "#0f766e" : "#ffffff",
                color: statusFilter === st.id ? "#ffffff" : "#475569",
                borderColor: statusFilter === st.id ? "#0f766e" : "#cbd5e1",
                padding: "5px 12px",
                fontSize: "12px",
                fontWeight: "600",
              }}
              onClick={() => setStatusFilter(st.id)}
            >
              {st.label}
            </button>
          ))}
        </div>

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

          {(statusFilter !== "ALL" || monthFilter !== currentMonthStr || searchQuery) && (
            <button
              type="button"
              className="secondaryBtn"
              style={{ padding: "5px 10px", fontSize: "11px", display: "inline-flex", alignItems: "center", gap: "4px" }}
              onClick={() => {
                setStatusFilter("ALL");
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
            💡 Click any partner row to open full dossier &amp; transaction history
          </span>
        </div>
        <div className="tableResponsive">
          <table className="financeTable">
            <thead>
              <tr>
                <th>Partner &amp; Contact</th>
                <th>Status</th>
                <th>Joined</th>
                <th style={{ textAlign: "right" }}>Profit Earned</th>
                <th style={{ textAlign: "right" }}>Total Out</th>
                <th style={{ textAlign: "right" }}>Current Available Capital</th>
                <th style={{ textAlign: "center", width: "220px" }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredPartners.map((p) => (
                <tr
                  className="clickable globalClickableRow"
                  key={p.id}
                  title="Click to view full partner dossier"
                  onClick={() =>
                    onSelectRecord({ type: "partner", record: p })
                  }
                >
                  <td>
                    <div style={{ display: "flex", flexDirection: "column", gap: "3px" }}>
                      <strong style={{ fontSize: "14px", color: "#0f172a" }}>
                        {p.name}
                      </strong>
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
                    </div>
                  </td>
                  <td>
                    <span className="statusPill active">{p.status}</span>
                  </td>
                  <td>
                    {p.created_at
                      ? new Date(p.created_at).toLocaleDateString("en-IN")
                      : "—"}
                  </td>
                  <td
                    style={{
                      textAlign: "right",
                      fontWeight: "600",
                      color: "#7c3aed",
                    }}
                  >
                    +{money(p.profit_earned)}
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
                  <td colSpan="7" style={{ textAlign: "center", padding: "36px", color: "#64748b" }}>
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
