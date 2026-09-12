import React from "react";
import { X } from "lucide-react";
import { money, formatTxNotes } from "../utils/formatters.js";

export default function GlobalRecordDetailsModal({ type, record, close }) {
  if (!record) return null;

  const titles = {
    ledger: "Ledger entry details",
    partner: "Partner details",
    transaction: "Capital transaction details",
    closing: "Monthly closing details",
    expense: "Expense record details",
  };

  const formatDate = (value) =>
    value
      ? new Date(value).toLocaleString("en-IN", {
          dateStyle: "medium",
          timeStyle: "short",
        })
      : "Not available";

  const fields =
    type === "ledger"
      ? [
          ["Entry type", record.type],
          ["Source module", record.source_module],
          ["Direction", record.direction],
          ["Amount", money(record.amount)],
          ["Effective date", formatDate(record.effective_date)],
          ["Reference type", record.reference_type || "Not available"],
          ["Notes", record.notes || "No notes"],
        ]
      : type === "partner"
      ? [
          ["Partner name", record.name],
          ["Status", record.status],
          ["Joined", formatDate(record.created_at)],
          ["Current Available Capital", money(record.current_capital)],
        ]
      : type === "transaction"
      ? [
          ["Partner", record.partner_name],
          ["Transaction type", record.transaction_type],
          ["Status", record.status],
          ["Amount", money(record.amount)],
          ["Effective date", formatDate(record.effective_date)],
          ["Notes", formatTxNotes(record.notes) || "No notes"],
        ]
      : type === "expense"
      ? [
          ["Reason (Why)", record.description],
          ["Amount", money(record.amount)],
          ["Category", record.category],
          ["Expense Type", record.expense_type || "GENERAL"],
          ["Expense Date", formatDate(record.expense_date)],
          [
            "Vehicle / Loan",
            record.auto_loan_reg
              ? `${record.auto_loan_vehicle || "Vehicle"} (${record.auto_loan_reg})`
              : record.loan_id
              ? `Loan ID: ${record.loan_id}`
              : "Not linked to loan",
          ],
          ["Recorded At", formatDate(record.created_at)],
        ]
      : [
          ["Period", record.period_label],
          ["Status", record.status],
          ["Calculated profit", money(record.calculated_company_profit)],
          ["Final profit", money(record.final_company_profit)],
          ["Closed at", formatDate(record.closed_at)],
          [
            "Adjustment reason",
            record.adjustment_reason || "No adjustment",
          ],
        ];

  return (
    <div
      className="modalOverlay"
      onClick={(event) => {
        if (event.target === event.currentTarget) close();
      }}
    >
      <div
        className="modalContent globalRecordModal"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="modalHeader">
          <div>
            <span className="overline autoBadgeTag">GLOBAL CAPITAL</span>
            <h3>{titles[type] || "Record details"}</h3>
          </div>
          <button
            className="iconBtn"
            onClick={close}
            aria-label="Close details"
          >
            <X size={18} />
          </button>
        </div>
        <div className="globalRecordGrid">
          {fields.map(([label, value]) => (
            <div key={label}>
              <span>{label}</span>
              <strong>{value}</strong>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
