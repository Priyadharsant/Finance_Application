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
import { money, formatDate } from "../utils/formatters.js";
import { exportPartnerBalances } from "../services/globalCapitalExportUtils.js";

export default function PartnerManagement({
  partners,
  onOpenAddPartner,
  onOpenCapitalAction,
  onSelectRecord,
}) {
  const [monthFilter, setMonthFilter] = useState("");
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
    }).sort((a, b) => {
      const da = new Date(a.created_at || a.effective_date || 0).getTime();
      const db = new Date(b.created_at || b.effective_date || 0).getTime();
      if (da !== db) return da - db;
      return (a.name || a.partner_name || "").localeCompare(b.name || b.partner_name || "");
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
          <span>Partners</span>
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

          {monthFilter && (
            <button
              type="button"
              className="secondaryBtn"
              style={{ padding: "4px 8px", fontSize: "11.5px" }}
              onClick={() => setMonthFilter("")}
            >
              Show All Partners
            </button>
          )}
        </div>

        {/* Search */}
        <div className="searchBox">
          <Search size={14} />
          <input
            type="text"
            placeholder="Search partner / phone / PAN..."
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

      {/* Partners List Table */}
      <div className="financeTableCard">
        <div className="tableWrap">
          <table className="financeTable">
            <thead>
              <tr>
                <th style={{ width: "40px" }}></th>
                <th>Partner</th>
                <th>Contact</th>
                <th style={{ textAlign: "right" }}>Current Capital</th>
                <th style={{ textAlign: "center", width: "230px" }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredPartners.map((p) => (
                <React.Fragment key={p.id}>
                  <tr
                    onClick={() =>
                      setExpandedPartnerId(expandedPartnerId === p.id ? null : p.id)
                    }
                    style={{ cursor: "pointer" }}
                  >
                    <td style={{ textAlign: "center" }}>
                      {expandedPartnerId === p.id ? (
                        <ChevronUp size={16} color="#64748b" />
                      ) : (
                        <ChevronDown size={16} color="#64748b" />
                      )}
                    </td>
                    <td>
                      <div style={{ fontWeight: "700", color: "#0f172a" }}>
                        {p.name || p.partner_name}
                      </div>
                      <div style={{ fontSize: "11px", color: "#64748b" }}>
                        Joined: {formatDate(p.created_at || p.effective_date)}
                      </div>
                    </td>
                    <td>
                      <div>{p.phone || "—"}</div>
                      <div style={{ fontSize: "11px", color: "#64748b" }}>
                        {p.email || p.pan_number || "—"}
                      </div>
                    </td>
                    <td style={{ textAlign: "right", fontWeight: "700" }}>
                      <div>{money(p.current_capital)}</div>
                      <div style={{ fontSize: "11px", fontWeight: "600", marginTop: "3px", display: "flex", gap: "6px", justifyContent: "flex-end", flexWrap: "wrap" }}>
                        <span style={{ color: "#0d9488", background: "#f0fdfa", padding: "1px 5px", borderRadius: "4px" }}>
                          Own: {money(p.available_own_capital ?? p.own_capital ?? 0)}
                        </span>
                        <span style={{ color: "#7c3aed", background: "#f5f3ff", padding: "1px 5px", borderRadius: "4px" }}>
                          Lend: {money(p.available_lend_capital ?? p.lend_capital ?? p.borrowed_total ?? 0)}
                        </span>
                      </div>
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

                  {/* Expanded Breakdown Accordion */}
                  {expandedPartnerId === p.id && (
                    <tr style={{ background: "#f8fafc" }}>
                      <td colSpan="5" style={{ padding: "14px 20px" }}>
                        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "12px" }}>
                          <div style={{ padding: "10px", background: "#ffffff", borderRadius: "8px", border: "1px solid #e2e8f0" }}>
                            <div style={{ fontSize: "11px", color: "#64748b", fontWeight: "600" }}>BASE CAPITAL</div>
                            <div style={{ fontSize: "15px", fontWeight: "700", color: "#0f172a", marginTop: "2px" }}>
                              {money(p.base_capital ?? p.initial_contribution ?? 0)}
                            </div>
                          </div>
                          <div style={{ padding: "10px", background: "#ffffff", borderRadius: "8px", border: "1px solid #e2e8f0" }}>
                            <div style={{ fontSize: "11px", color: "#64748b", fontWeight: "600" }}>TOTAL CONTRIBUTED</div>
                            <div style={{ fontSize: "15px", fontWeight: "700", color: "#059669", marginTop: "2px" }}>
                              {money(p.total_contributed ?? 0)}
                            </div>
                          </div>
                          <div style={{ padding: "10px", background: "#ffffff", borderRadius: "8px", border: "1px solid #e2e8f0" }}>
                            <div style={{ fontSize: "11px", color: "#64748b", fontWeight: "600" }}>TOTAL WITHDRAWN</div>
                            <div style={{ fontSize: "15px", fontWeight: "700", color: "#dc2626", marginTop: "2px" }}>
                              {money(p.total_withdrawn ?? 0)}
                            </div>
                          </div>
                          <div style={{ padding: "10px", background: "#ffffff", borderRadius: "8px", border: "1px solid #e2e8f0" }}>
                            <div style={{ fontSize: "11px", color: "#64748b", fontWeight: "600" }}>PROFIT EARNED</div>
                            <div style={{ fontSize: "15px", fontWeight: "700", color: "#2563eb", marginTop: "2px" }}>
                              {money(p.profit_earned ?? 0)}
                            </div>
                          </div>
                        </div>

                        {p.lender_breakdown && p.lender_breakdown.length > 0 && (
                          <div style={{ marginTop: "12px", padding: "10px", background: "#ffffff", borderRadius: "8px", border: "1px solid #e2e8f0" }}>
                            <div style={{ fontSize: "11.5px", fontWeight: "700", color: "#7c3aed", marginBottom: "6px" }}>
                              BORROWED / LEND CAPITAL DETAILS
                            </div>
                            <table style={{ width: "100%", fontSize: "12px" }}>
                              <thead>
                                <tr style={{ color: "#64748b", borderBottom: "1px solid #e2e8f0" }}>
                                  <th style={{ textAlign: "left", padding: "4px 0" }}>Lender</th>
                                  <th style={{ textAlign: "right", padding: "4px 0" }}>Amount</th>
                                  <th style={{ textAlign: "right", padding: "4px 0" }}>Interest %</th>
                                </tr>
                              </thead>
                              <tbody>
                                {p.lender_breakdown.map((l, lIdx) => (
                                  <tr key={lIdx} style={{ borderBottom: "1px solid #f1f5f9" }}>
                                    <td style={{ padding: "4px 0", fontWeight: "600" }}>{l.lenderName || "—"}</td>
                                    <td style={{ textAlign: "right", padding: "4px 0" }}>{money(l.amount)}</td>
                                    <td style={{ textAlign: "right", padding: "4px 0" }}>{l.interestRate ? `${l.interestRate}%` : "—"}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        )}
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              ))}
              {filteredPartners.length === 0 && (
                <tr>
                  <td colSpan="5" style={{ textAlign: "center", padding: "36px", color: "#64748b" }}>
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
