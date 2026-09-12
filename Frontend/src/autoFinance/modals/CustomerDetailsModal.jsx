import {
  Banknote,
  CalendarClock,
  CarFront,
  Mail,
  MapPin,
  Percent,
  Phone,
  X,
} from "lucide-react";
import { money } from "../services/autoFinanceApi";

export default function CustomerDetailsModal({ customer, loans, onClose }) {
  if (!customer) return null;

  const fullName =
    `${customer.first_name || ""} ${customer.last_name || ""}`.trim();
  const customerLoans = loans.filter(
    (loan) => String(loan.customer_id) === String(customer.id)
  );

  return (
    <div
      className="modal"
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        className="detailsCard customerProfileCard"
        onClick={(event) => event.stopPropagation()}
      >
        <button
          className="close"
          onClick={onClose}
          aria-label="Close customer details"
        >
          <X size={18} />
        </button>
        <div className="customerProfileHeader">
          <div>
            <span className="overline autoBadgeTag">AUTO FINANCE CUSTOMER</span>
            <h2>{fullName || "Customer details"}</h2>
            <span className="tag autoTag">
              {customer.customer_code || "NO CODE"}
            </span>
          </div>
        </div>
        <div className="customerProfileGrid">
          <div>
            <Phone size={16} />
            <span>
              Phone
              {customer.phone ? (
                <a className="phoneLink" href={`tel:${customer.phone}`}>
                  <strong>{customer.phone}</strong>
                </a>
              ) : (
                <strong>Not provided</strong>
              )}
            </span>
          </div>
          <div>
            <Mail size={16} />
            <span>
              Email<strong>{customer.email || "Not provided"}</strong>
            </span>
          </div>
          <div>
            <MapPin size={16} />
            <span>
              Location
              <strong>
                {customer.city
                  ? `${customer.city}, ${customer.state || ""}`
                  : "Not provided"}
              </strong>
            </span>
          </div>
          <div>
            <MapPin size={16} />
            <span>
              Address<strong>{customer.address || "Not provided"}</strong>
            </span>
          </div>
        </div>
        <div className="customerLoanSection">
          <div className="customerLoanSectionHead">
            <div>
              <span className="overline">LOAN PORTFOLIO</span>
              <h3>Vehicle loan details</h3>
            </div>
            <span className="tag autoTag">
              {customerLoans.length} {customerLoans.length === 1 ? "Loan" : "Loans"}
            </span>
          </div>
          {customerLoans.length ? (
            customerLoans.map((loan) => (
              <div className="customerLoanRow" key={loan.id}>
                <div className="customerLoanTitle">
                  <span className="customerLoanIcon">
                    <CarFront size={16} />
                  </span>
                  <div>
                    <strong>
                      {loan.make || "Vehicle loan"} {loan.model || ""}
                    </strong>
                    <small>
                      {loan.registration_number ||
                        loan.vehicle_type ||
                        "Vehicle details unavailable"}
                    </small>
                  </div>
                  <span className="tag">{loan.status || "ACTIVE"}</span>
                </div>
                <div className="customerLoanMeta">
                  <span>
                    <Banknote size={14} /> Amount
                    <strong>{money(loan.loan_amount)}</strong>
                  </span>
                  <span>
                    <Percent size={14} /> Rate
                    <strong>
                      {loan.interest_rate}% {loan.interest_type || "FLAT"}
                    </strong>
                  </span>
                  <span>
                    <CalendarClock size={14} /> Tenure
                    <strong>{loan.tenure_months} months</strong>
                  </span>
                  <span>
                    <Banknote size={14} /> Paid
                    <strong>{money(loan.total_paid)}</strong>
                  </span>
                </div>
              </div>
            ))
          ) : (
            <div className="customerLoanEmpty">
              No vehicle loans linked to this customer.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
