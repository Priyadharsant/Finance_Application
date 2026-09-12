import React from "react";
import { Plus, Tags } from "lucide-react";

export default function AutoLoanSchemes({
  loanTypes = [],
  setShowAddLoanType,
}) {
  return (
    <section className="content">
      <div className="intro">
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

      <div className="card tableWrap">
        <table>
          <thead>
            <tr>
              <th>Scheme Name</th>
              <th>Interest Method</th>
              <th>Base Rate (% p.a.)</th>
              <th>Default Tenure</th>
            </tr>
          </thead>
          <tbody>
            {loanTypes.map((t) => (
              <tr key={t.id}>
                <td>
                  <b>{t.name}</b>
                </td>
                <td>
                  <b>{t.interest_type}</b>
                </td>
                <td className="greenText">{t.base_interest_rate}%</td>
                <td>{t.default_tenure_months} Months</td>
              </tr>
            ))}
          </tbody>
        </table>
        {!loanTypes.length && (
          <div className="empty">
            <div>
              <Tags size={28} />
            </div>
            <b>No loan schemes configured. Create one to get started.</b>
          </div>
        )}
      </div>
    </section>
  );
}
