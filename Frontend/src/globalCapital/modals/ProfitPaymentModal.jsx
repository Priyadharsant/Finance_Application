import React from "react";
import { X, Coins } from "lucide-react";
import { money } from "../utils/formatters.js";

export default function ProfitPaymentModal({ allocation, form, setForm, submit, close }) {
  if (!allocation) return null;

  const payable = Number(allocation.payable_amount || allocation.allocated_profit || 0);
  const paid = Number(allocation.paid_amount || 0);
  const unpaid = Math.max(0, payable - paid);

  return (
    <div
      className="modalOverlay"
      onClick={(e) => {
        if (e.target === e.currentTarget) close();
      }}
    >
      <div
        className="modalContent"
        style={{ width: "min(520px, 94vw)" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modalHeader">
          <div>
            <span className="overline autoBadgeTag">SETTLEMENT PAYOUT</span>
            <h3>Record Profit Settlement</h3>
            <small style={{ color: "#64748b" }}>Partner: {allocation.partner_name}</small>
          </div>
          <button className="iconBtn" onClick={close} aria-label="Close">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={submit}>
          <div className="modalBody" style={{ padding: "16px 20px" }}>
            <div
              style={{
                background: "#f0fdf4",
                border: "1px solid #bbf7d0",
                borderRadius: "8px",
                padding: "12px 16px",
                marginBottom: "16px",
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: "10px",
              }}
            >
              <div>
                <span style={{ fontSize: "11px", color: "#166534", textTransform: "uppercase", fontWeight: "600" }}>
                  Allocated Profit
                </span>
                <div style={{ fontSize: "15px", fontWeight: "700", color: "#14532d" }}>
                  {money(payable)}
                </div>
              </div>
              <div>
                <span style={{ fontSize: "11px", color: "#166534", textTransform: "uppercase", fontWeight: "600" }}>
                  Remaining Unpaid
                </span>
                <div style={{ fontSize: "15px", fontWeight: "700", color: "#047857" }}>
                  {money(unpaid)}
                </div>
              </div>
            </div>

            <div className="formGroup">
              <label>Amount to Pay (₹) *</label>
              <input
                required
                type="number"
                step="any"
                min="0.01"
                max={unpaid}
                placeholder="e.g. 5000"
                value={form.amount}
                onChange={(e) => setForm({ ...form, amount: e.target.value })}
              />
              <small style={{ color: "#64748b", marginTop: "4px", display: "block" }}>
                Maximum payable: {money(unpaid)}
              </small>
            </div>

            <div className="formGroup">
              <label>Payment Date *</label>
              <input
                required
                type="date"
                value={form.paymentDate}
                onChange={(e) => setForm({ ...form, paymentDate: e.target.value })}
              />
            </div>

            <div className="formGroup">
              <label>Payment Reference / Cheque / UTR #</label>
              <input
                type="text"
                placeholder="e.g. BANK-TRF-982341"
                value={form.reference}
                onChange={(e) => setForm({ ...form, reference: e.target.value })}
              />
            </div>

            <div className="formGroup">
              <label>Narration / Notes</label>
              <input
                type="text"
                placeholder="e.g. Q3 Profit dividend settlement"
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
              />
            </div>

            <p style={{ fontSize: "11.5px", color: "#64748b", margin: "8px 0 0" }}>
              ℹ️ Notice: This records an immutable <strong>PROFIT_SETTLEMENT</strong> entry in the Global Cash Ledger,
              reducing company cash without reducing the partner&apos;s ownership capital.
            </p>
          </div>

          <div className="modalActions" style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "16px" }}>
            <button type="button" className="secondaryBtn" onClick={close}>
              Cancel
            </button>
            <button type="submit" className="primaryBtn" style={{ background: "#059669", borderColor: "#059669" }}>
              <Coins size={15} /> Confirm Payout
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
