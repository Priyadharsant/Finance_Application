import React from "react";
import { Plus, Tags } from "lucide-react";

export default function AutoLoanSchemes({
  loanTypes = [],
  setShowAddLoanType,
}) {
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
        <button
          className="primary autoBtn"
          onClick={() => setShowAddLoanType(true)}
        >
          <Plus size={16} /> Add Loan Scheme
        </button>
      </div>

      <div className="autoSchemeGrid">
        {loanTypes.map((t) => (
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
        {!loanTypes.length && (
          <div className="autoSchemeEmpty"><div><Tags size={25} /></div><strong>No loan schemes yet</strong><p>Create a scheme to make it available when setting up a vehicle loan.</p></div>
        )}
      </div>
    </section>
  );
}
