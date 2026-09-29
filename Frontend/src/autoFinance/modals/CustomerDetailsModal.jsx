import { CarFront, Phone, Mail, MapPin, X } from "lucide-react";
import { money } from "../services/autoFinanceApi";

export default function CustomerDetailsModal({ customer, loans, onClose }) {
  if (!customer) return null;

  const fullName = `${customer.first_name || ""} ${customer.last_name || ""}`.trim();
  const customerLoans = loans.filter(
    (loan) => String(loan.customer_id) === String(customer.id)
  );
  const initials = fullName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <div
      className="modal"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className="detailsCard"
        style={{ maxWidth: 520, padding: 0, overflow: "hidden" }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header strip */}
        <div style={{
          background: "linear-gradient(135deg, #1e3a5f 0%, #2563eb 100%)",
          padding: "24px 24px 20px",
          position: "relative",
          color: "#fff"
        }}>
          <button
            className="close"
            onClick={onClose}
            style={{ position: "absolute", top: 12, right: 12, background: "rgba(255,255,255,0.15)", border: "none", color: "#fff", borderRadius: 8, padding: "4px 8px", cursor: "pointer" }}
          >
            <X size={16} />
          </button>
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            {/* Avatar */}
            <div style={{
              width: 52, height: 52, borderRadius: "50%",
              background: "rgba(255,255,255,0.2)",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 20, fontWeight: 700, color: "#fff", flexShrink: 0
            }}>
              {initials || "?"}
            </div>
            <div>
              <div style={{ fontSize: 18, fontWeight: 700 }}>{fullName || "Customer"}</div>
              <div style={{ fontSize: 12, opacity: 0.75, marginTop: 2 }}>
                {customer.customer_code || "—"} &nbsp;·&nbsp; Auto Finance Customer
              </div>
            </div>
          </div>
        </div>

        {/* Contact Info */}
        <div style={{ padding: "16px 24px", borderBottom: "1px solid #f1f5f9" }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: "#94a3b8", letterSpacing: 1, marginBottom: 10 }}>CONTACT DETAILS</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px 20px" }}>
            <InfoRow icon={<Phone size={14} />} label="Phone" value={
              customer.phone
                ? <a href={`tel:${customer.phone}`} style={{ color: "#2563eb", fontWeight: 600, textDecoration: "none" }}>{customer.phone}</a>
                : "—"
            } />
            <InfoRow icon={<Mail size={14} />} label="Email" value={customer.email || "—"} />
            <InfoRow icon={<MapPin size={14} />} label="City" value={customer.city || "—"} />
            <InfoRow icon={<MapPin size={14} />} label="Address" value={customer.address || "—"} />
          </div>
        </div>

        {/* Loans */}
        <div style={{ padding: "16px 24px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: "#94a3b8", letterSpacing: 1 }}>VEHICLE LOANS</div>
            <span style={{ fontSize: 11, background: "#dbeafe", color: "#1d4ed8", borderRadius: 20, padding: "2px 10px", fontWeight: 700 }}>
              {customerLoans.length} {customerLoans.length === 1 ? "Loan" : "Loans"}
            </span>
          </div>

          {customerLoans.length > 0 ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {customerLoans.map((loan) => {
                const paidPct = loan.loan_amount > 0
                  ? Math.min(100, Math.round((Number(loan.total_paid || 0) / Number(loan.loan_amount)) * 100))
                  : 0;
                const statusColor = loan.status === "ACTIVE" ? "#16a34a" : loan.status === "CLOSED" ? "#64748b" : "#d97706";
                return (
                  <div key={loan.id} style={{
                    background: "#f8fafc", borderRadius: 10,
                    padding: "14px 16px", border: "1px solid #e2e8f0"
                  }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <CarFront size={16} color="#2563eb" />
                        <div>
                          <div style={{ fontWeight: 600, fontSize: 14, color: "#1e293b" }}>
                            {loan.make || "Vehicle"} {loan.model || ""}
                          </div>
                          <div style={{ fontSize: 12, color: "#94a3b8" }}>
                            {loan.registration_number || loan.vehicle_type || "Vehicle loan"}
                          </div>
                        </div>
                      </div>
                      <span style={{ fontSize: 11, fontWeight: 700, color: statusColor, background: `${statusColor}15`, borderRadius: 20, padding: "3px 10px" }}>
                        {loan.status || "ACTIVE"}
                      </span>
                    </div>

                    {/* Loan numbers */}
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8, marginBottom: 10 }}>
                      <LoanStat label="Loan Amount" value={money(loan.loan_amount)} />
                      <LoanStat label="Amount Paid" value={money(loan.total_paid || 0)} color="#16a34a" />
                      <LoanStat label="Interest Rate" value={`${loan.interest_rate}% / mo`} />
                    </div>

                    {/* Progress bar */}
                    <div>
                      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "#64748b", marginBottom: 4 }}>
                        <span>Recovery Progress</span>
                        <span style={{ fontWeight: 600 }}>{paidPct}%</span>
                      </div>
                      <div style={{ background: "#e2e8f0", borderRadius: 99, height: 6, overflow: "hidden" }}>
                        <div style={{ width: `${paidPct}%`, background: "#2563eb", height: "100%", borderRadius: 99, transition: "width 0.4s" }} />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div style={{ textAlign: "center", color: "#94a3b8", padding: "20px 0", fontSize: 13 }}>
              No vehicle loans found for this customer.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function InfoRow({ icon, label, value }) {
  return (
    <div style={{ display: "flex", alignItems: "flex-start", gap: 8 }}>
      <span style={{ color: "#94a3b8", marginTop: 2, flexShrink: 0 }}>{icon}</span>
      <div>
        <div style={{ fontSize: 11, color: "#94a3b8", fontWeight: 600 }}>{label}</div>
        <div style={{ fontSize: 13, color: "#1e293b", fontWeight: 500, marginTop: 1 }}>{value}</div>
      </div>
    </div>
  );
}

function LoanStat({ label, value, color }) {
  return (
    <div style={{ background: "#fff", borderRadius: 8, padding: "8px 10px", border: "1px solid #e2e8f0" }}>
      <div style={{ fontSize: 10, color: "#94a3b8", fontWeight: 600, marginBottom: 2 }}>{label}</div>
      <div style={{ fontSize: 13, fontWeight: 700, color: color || "#1e293b" }}>{value}</div>
    </div>
  );
}
