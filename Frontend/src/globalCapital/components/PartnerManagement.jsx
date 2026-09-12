import React from "react";
import {
  Users,
  Plus,
  MinusCircle,
  Phone,
  Mail,
} from "lucide-react";
import { money } from "../utils/formatters.js";

export default function PartnerManagement({
  partners,
  onOpenAddPartner,
  onOpenCapitalAction,
  onSelectRecord,
}) {
  const totalAvailableCapital = partners.reduce(
    (sum, p) => sum + Number(p.current_capital || 0),
    0
  );
  const totalProfitEarned = partners.reduce(
    (sum, p) => sum + Number(p.profit_earned || 0),
    0
  );
  const totalWithdrawn = partners.reduce(
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
            className="primaryBtn"
            onClick={onOpenAddPartner}
          >
            <Plus size={16} /> Add Partner
          </button>
        </div>
      </div>

      <div className="globalCapitalStats fourCol">
        <div>
          <span>Active partners</span>
          <strong>{partners.length}</strong>
          <small>Registered partners</small>
        </div>
        <div>
          <span>Current Available Capital</span>
          <strong style={{ color: "#0f766e" }}>
            {money(totalAvailableCapital)}
          </strong>
          <small>Total available capital</small>
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

      <div className="financeCard globalCapitalCard mt-20">
        <div
          className="cardHead"
          style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}
        >
          <h3>
            <Users size={18} /> Partner Profiles &amp; Balances
          </h3>
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
              {partners.map((p) => (
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
              {partners.length === 0 && (
                <tr>
                  <td colSpan="7" style={{ textAlign: "center", padding: "30px", color: "#64748b" }}>
                    No partners found. Click &quot;Add Partner&quot; above to register the first partner.
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
