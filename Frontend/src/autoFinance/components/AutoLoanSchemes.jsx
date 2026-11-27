import React, { useState, useMemo } from "react";
import { Plus, Tags, Search, X } from "lucide-react";
import { matchesSearch } from "../../utils/search.js";

export default function AutoLoanSchemes({
  loanTypes = [],
  setShowAddLoanType,
}) {
  const [search, setSearch] = useState("");

  const filteredSchemes = useMemo(() => {
    if (!search.trim()) return loanTypes;
    return loanTypes.filter((t) => matchesSearch(search, t));
  }, [loanTypes, search]);

  return (
    <section className="content autoModulePage autoSchemesPage">
      <div className="autoModuleHero">
        <div>
          <span className="overline autoBadgeTag">SCHEMES</span>
          <h2>Vehicle Loan Types & Rates</h2>
          <p>
            Configure loan interest rates, categories, and tenure limits.
          </p>
        </div>
        <div style={{ display: "flex", gap: "10px", alignItems: "center", flexWrap: "wrap" }}>
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
              background: "#ffffff",
              padding: "6px 12px",
              borderRadius: "8px",
              border: "1px solid #cbd5e1",
            }}
          >
            <Search size={15} color="#64748b" />
            <input
              type="text"
              placeholder="Search scheme name, rate, tenure..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{
                border: "none",
                outline: "none",
                fontSize: "13px",
                color: "#1e293b",
                width: "210px",
                background: "transparent",
              }}
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch("")}
                style={{
                  border: "none",
                  background: "transparent",
                  color: "#94a3b8",
                  cursor: "pointer",
                  padding: "0 2px",
                }}
                title="Clear Search"
              >
                <X size={14} />
              </button>
            )}
          </div>
          <button
            className="primary autoBtn"
            onClick={() => setShowAddLoanType(true)}
          >
            <Plus size={16} /> Add Loan Scheme
          </button>
        </div>
      </div>

      <div className="autoSchemeGrid">
        {filteredSchemes.map((t) => (
          <article className="autoSchemeCard" key={t.id}>
            <div className="autoSchemeIcon"><Tags size={18} /></div>
            <div className="autoSchemeName"><span>LOAN SCHEME</span><h3>{t.name}</h3></div>
            <div className="autoSchemeDetails">
              <div><span>Interest method</span><strong>{t.interest_type}</strong></div>
              <div><span>Base rate</span><strong className="autoSchemeRate">{t.base_interest_rate}%<small>p.a.</small></strong></div>
              <div><span>Default tenure</span><strong>{t.default_tenure_months}<small> months</small></strong></div>
            </div>
          </article>
        ))}
        {!filteredSchemes.length && (
          <div className="autoSchemeEmpty">
            <div><Tags size={25} /></div>
            <strong>{search ? "No matching schemes found" : "No loan schemes yet"}</strong>
            <p>{search ? "Try a different search term or clear the filter." : "Create a scheme to make it available when setting up a vehicle loan."}</p>
          </div>
        )}
      </div>
    </section>
  );
}
