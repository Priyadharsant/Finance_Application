import { useEffect, useState } from "react";
import { CarFront, Phone, Mail, MapPin, X, FileText, Download, CalendarDays, IndianRupee, CreditCard, Gauge, UserRound, ShieldCheck } from "lucide-react";
import { apiCall, API_BASE, money, dateLabel } from "../services/autoFinanceApi";

export default function CustomerDetailsModal({ customer, loans = [], onClose }) {
  const [loanDetails, setLoanDetails] = useState({});
  const [loading, setLoading] = useState(true);
  const customerId = customer?.id;
  const customerLoans = loans.filter((loan) => String(loan.customer_id) === String(customerId));

  useEffect(() => {
    let active = true;
    if (!customerId) {
      setLoanDetails({});
      setLoading(false);
      return () => { active = false; };
    }
    setLoading(true);
    Promise.all(customerLoans.map(async (loan) => {
      try {
        const response = await apiCall(`/loans/${loan.id}`);
        return [loan.id, response.data || null];
      } catch {
        return [loan.id, null];
      }
    })).then((entries) => {
      if (active) setLoanDetails(Object.fromEntries(entries));
    }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [customerId, loans]);

  if (!customer) return null;

  const fullName = `${customer.first_name || ""} ${customer.last_name || ""}`.trim() || "Customer";
  const info = [
    { icon: Phone, label: "Phone", value: customer.phone, href: customer.phone ? `tel:${customer.phone}` : null },
    { icon: Mail, label: "Email", value: customer.email },
    { icon: MapPin, label: "Location", value: [customer.city, customer.state].filter(Boolean).join(", ") },
    { icon: MapPin, label: "Address", value: customer.address },
    { icon: ShieldCheck, label: "Aadhaar", value: customer.aadhar_number || customer.aadhaar_number },
    { icon: FileText, label: "PAN", value: customer.pan_number },
  ];

  return (
    <div className="modal autoCustomerModal" onClick={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <div className="autoCustomerDialog" role="dialog" aria-modal="true" aria-labelledby="auto-customer-title" onClick={(event) => event.stopPropagation()}>
        <header className="autoCustomerDialogHero">
          <div className="autoCustomerDialogIdentity">
            <div className="autoCustomerDialogAvatar"><UserRound size={24} /></div>
            <div className="autoCustomerDialogTitle">
              <span>CUSTOMER PROFILE</span>
              <h2 id="auto-customer-title">{fullName}</h2>
              <small>{customer.customer_code || "Auto Finance customer"}</small>
            </div>
          </div>
          <button type="button" className="autoCustomerDialogClose" onClick={onClose} aria-label="Close customer profile"><X size={18} /></button>
        </header>

        <div className="autoCustomerDialogBody">
          <section className="autoCustomerInfoSection">
            <div className="autoCustomerSectionHeading"><div><span>PROFILE</span><h3>Contact details</h3></div><span className="autoCustomerSectionCount">{info.filter((item) => item.value).length} details</span></div>
            <div className="autoCustomerInfoGrid">
              {info.map(({ icon: Icon, label, value, href }) => (
                <div className="autoCustomerInfoItem" key={label}>
                  <span className="autoCustomerInfoIcon"><Icon size={16} /></span>
                  <span className="autoCustomerInfoText"><small>{label}</small>{href && value ? <a href={href}>{value}</a> : <strong>{value || "Not provided"}</strong>}</span>
                </div>
              ))}
            </div>
          </section>

          <section className="autoCustomerLoansSection">
            <div className="autoCustomerSectionHeading"><div><span>PORTFOLIO</span><h3>Vehicle loans</h3></div><span className="autoCustomerSectionCount">{customerLoans.length} {customerLoans.length === 1 ? "loan" : "loans"}</span></div>
            {loading && <div className="autoCustomerLoading"><span className="autoCustomerLoadingSpinner" />Loading loan details…</div>}
            {!loading && customerLoans.length === 0 && <div className="autoCustomerNoLoans"><CarFront size={21} /><strong>No vehicle loans yet</strong><span>Loans associated with this customer will appear here.</span></div>}
            <div className="autoCustomerLoanList">
              {customerLoans.map((summary) => {
                const details = loanDetails[summary.id];
                const loan = details?.loan || summary;
                const fee = loan.fees_details || {};
                const docs = details?.documents || [];
                // Total collected excluding fines, counting all payments (including early close)
                const paid = details?.payments?.length
                  ? details.payments.reduce((s, p) => s + Number(p.amount_paid || 0), 0)
                  : Number(loan.total_paid || 0);
                const fine = details?.payments?.length
                  ? details.payments.reduce((s, p) => s + Number(p.fine_amount || 0), 0)
                  : Number(loan.total_fine_paid || 0);
                const principal = Number(loan.loan_amount || 0);
                const totalGross = Number(loan.agreed_total_payable ?? loan.total_payable ?? (principal + Number(loan.total_interest || 0)));
                const balance = loan.status === "COMPLETED" ? 0 : Math.max(0, totalGross - paid);
                return (
                  <article className="autoCustomerLoanCard" key={summary.id}>
                    <div className="autoCustomerLoanCardHead">
                      <span className="autoCustomerLoanIcon"><CarFront size={18} /></span>
                      <div className="autoCustomerVehicle"><span>VEHICLE</span><h4>{[loan.make, loan.model].filter(Boolean).join(" ") || "Vehicle loan"}</h4><small>{loan.registration_number || "Registration pending"} · {loan.vehicle_type || "Vehicle"}</small></div>
                      <span className={`autoCustomerStatus ${String(loan.status || "ACTIVE").toLowerCase()}`}>{loan.status || "ACTIVE"}</span>
                    </div>

                    <div className="autoCustomerLoanStats">
                      <Metric icon={IndianRupee} label="Principal" value={money(loan.loan_amount)} />
                      <Metric icon={CreditCard} label="Collected" value={money(paid)} />
                      {fine > 0 && <Metric icon={CreditCard} label="Fine" value={money(fine)} />}
                      <Metric icon={Gauge} label="Balance" value={money(balance)} />
                      <Metric icon={CalendarDays} label="Tenure" value={`${loan.tenure_months ?? "—"} months`} />
                    </div>

                    <div className="autoCustomerLoanMeta">
                      <span><small>Interest</small><strong>{loan.interest_type || "FLAT"} · {loan.interest_rate ?? "—"}% / month</strong></span>
                      <span><small>Start date</small><strong>{dateLabel(loan.loan_start_date || loan.start_date)}</strong></span>
                      <span><small>Maturity</small><strong>{dateLabel(loan.maturity_date || loan.end_date)}</strong></span>
                      <span><small>Chassis / Engine</small><strong>{[loan.chassis_number, loan.engine_number].filter(Boolean).join(" / ") || "Not provided"}</strong></span>
                    </div>

                    <div className="autoCustomerLoanDetails">
                      <div className="autoCustomerExpandedContent">
                        <h5>Fees &amp; deductions</h5>
                        <div className="autoCustomerFeeGrid">{[["Income due", fee.incomeDue], ["Document fee", fee.documentFee], ["Hire purchase", fee.hirePurchase], ["Tax", fee.taxAmount], ["Insurance", fee.insurance], ["Insurance fine", fee.insuranceFine], ["Green tax", fee.greenTax], ["Fine", fee.fine], ["National tax", fee.nationalTax], ["Permit", fee.permit], ["Customer brokerage", fee.brokerageCustomer], ["Hand brokerage", fee.brokerageHand]].map(([label, value]) => <span key={label}><small>{label}</small><strong>{money(value || 0)}</strong></span>)}</div>

                        <h5>Broker &amp; guarantor</h5>
                        <div className="autoCustomerPeopleGrid">{[["Broker", loan.broker_name], ["Broker phone", loan.broker_phone], ["Guarantor", loan.guarantor_name || loan.jamin_name], ["Guarantor phone", loan.guarantor_phone || loan.jamin_phone], ["Relation", loan.guarantor_relation || loan.jamin_relation]].map(([label, value]) => <span key={label}><small>{label}</small><strong>{value || "—"}</strong></span>)}</div>

                        <h5>Documents <span>{docs.length}</span></h5>
                        {docs.length ? <div className="autoCustomerDocumentList">{docs.map((doc) => <a key={doc.filename} href={doc.url || `${API_BASE}/loans/${loan.id}/documents/${encodeURIComponent(doc.filename)}`} target="_blank" rel="noreferrer"><FileText size={15} /><span><strong>{doc.docType || "Document"}</strong><small>{doc.filename}</small></span><Download size={15} /></a>)}</div> : <p className="autoCustomerSubtle">No documents uploaded.</p>}

                        <h5>Repayment schedule <span>{details?.schedules?.length || 0}</span></h5>
                        {details?.schedules?.length ? <DataTable headings={["#", "Due date", "EMI", "Principal", "Interest", "Status"]} rows={details.schedules.map((row) => [row.installment_number, dateLabel(row.due_date), money(row.total_emi), money(row.principal_component), money(row.interest_component), row.status])} /> : <p className="autoCustomerSubtle">{details ? "No repayment schedule available." : "Loan details could not be loaded."}</p>}

                        <h5>Payments <span>{details?.payments?.length || 0}</span></h5>
                        {details?.payments?.length ? <DataTable headings={["Collected date", "EMI amount", "Method", "Receipt"]} rows={details.payments.map((row) => [dateLabel(row.payment_date), money(row.amount_paid), row.payment_method || "—", row.receipt_number || "—"])} /> : <p className="autoCustomerSubtle">No payments recorded.</p>}
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

function Metric({ icon: Icon, label, value }) {
  return <div className="autoCustomerLoanMetric"><span><Icon size={13} />{label}</span><strong>{value || "—"}</strong></div>;
}

function DataTable({ headings, rows }) {
  return <div className="autoCustomerDataTableWrap"><table className="autoCustomerDataTable"><thead><tr>{headings.map((heading) => <th key={heading}>{heading}</th>)}</tr></thead><tbody>{rows.map((row, index) => <tr key={index}>{row.map((value, cellIndex) => <td key={cellIndex}>{value || "—"}</td>)}</tr>)}</tbody></table></div>;
}
