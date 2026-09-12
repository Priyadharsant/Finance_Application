import React from "react";
import {
  X,
  IdCard,
  Phone,
  Mail,
  MapPin,
  Banknote,
  Percent,
  CalendarClock,
  CircleDollarSign,
  CarFront,
  Tags,
  Wrench,
  Zap,
  ShieldCheck,
} from "lucide-react";
import PhoneLink from "../common/PhoneLink";
import { money, dateLabel } from "../services/autoFinanceApi";

export default function LoanDetailsModal({
  selectedLoan,
  setSelectedLoan,
  handleOpenCloseLoan,
  handleExportIndividual,
  setPayEmiModal,
  setPayForm,
  setNotice,
}) {
  if (!selectedLoan) return null;

  return (
    <div
      className="modal"
      onClick={(event) => {
        if (event.target === event.currentTarget) setSelectedLoan(null);
      }}
    >
      <div
        className="detailsCard autoLoanDossier"
        onClick={(event) => event.stopPropagation()}
        style={{ width: "min(92vw, 1040px)", maxWidth: "1040px" }}
      >
        <button className="close" onClick={() => setSelectedLoan(null)}>
          <X size={18} />
        </button>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            flexWrap: "wrap",
            gap: "10px",
          }}
        >
          <div>
            <span className="overline autoBadgeTag">
              VEHICLE LOAN AGREEMENT &amp; BORROWER DETAILS
            </span>
            <h2 style={{ marginTop: "4px" }}>
              {selectedLoan.loan.first_name} {selectedLoan.loan.last_name}
            </h2>
            <p style={{ margin: "2px 0 0", color: "#64748b" }}>
              <IdCard size={13} /> Customer Code:{" "}
              <b>{selectedLoan.loan.customer_code}</b> ·
              <Phone size={13} /> Phone:{" "}
              {selectedLoan.loan.phone ? (
                <PhoneLink phone={selectedLoan.loan.phone} />
              ) : (
                <b>Not provided</b>
              )}{" "}
              {selectedLoan.loan.email ? (
                <>
                  <Mail size={13} /> {selectedLoan.loan.email}
                </>
              ) : (
                ""
              )}
            </p>
            {selectedLoan.loan.address && (
              <p
                style={{
                  margin: "2px 0 0",
                  color: "#64748b",
                  fontSize: "13px",
                }}
              >
                <MapPin size={13} /> Address: {selectedLoan.loan.address}
              </p>
            )}
          </div>
          <span
            className="tag active"
            style={{ fontSize: "13px", padding: "6px 14px" }}
          >
            {selectedLoan.loan.status}
          </span>
        </div>

        {/* FINANCIAL SUMMARY */}
        <div className="loanSummaryGrid">
          <div className="loanSummaryMetric">
            <div className="loanSummaryLabel">
              <span>
                <Banknote size={15} />
              </span>{" "}
              Loan disbursed
            </div>
            <strong>{money(selectedLoan.loan.loan_amount)}</strong>
            <small>Principal amount</small>
          </div>
          <div className="loanSummaryMetric">
            <div className="loanSummaryLabel">
              <span>
                <Percent size={15} />
              </span>{" "}
              Interest rate
            </div>
            <strong>{selectedLoan.loan.interest_rate}%</strong>
            <small>
              {selectedLoan.loan.interest_type || "FLAT"} interest
            </small>
          </div>
          <div className="loanSummaryMetric">
            <div className="loanSummaryLabel">
              <span>
                <CalendarClock size={15} />
              </span>{" "}
              Tenure
            </div>
            <strong>{selectedLoan.loan.tenure_months}</strong>
            <small>Months</small>
          </div>
          <div className="loanSummaryMetric collected">
            <div className="loanSummaryLabel">
              <span>
                <CircleDollarSign size={15} />
              </span>{" "}
              Total collected
            </div>
            <strong>
              {money(
                selectedLoan.schedules?.reduce(
                  (acc, s) => acc + parseFloat(s.total_cash_collected || s.collected_amount || 0),
                  0,
                ),
              )}
            </strong>
            <small>Paid installments</small>
          </div>
          <div className="loanSummaryMetric remaining">
            <div className="loanSummaryLabel">
              <span>
                <Banknote size={15} />
              </span>{" "}
              Remaining balance
            </div>
            <strong>
              {money(
                selectedLoan.schedules?.reduce(
                  (acc, s) => acc + parseFloat(s.remaining_emi_amount ?? s.total_emi ?? 0),
                  0,
                ),
              )}
            </strong>
            <small>Pending installments</small>
          </div>
        </div>

        {/* VEHICLE ASSET SPECIFICATIONS */}
        <div
          style={{
            background: "#f8fafc",
            padding: "14px 18px",
            borderRadius: "12px",
            border: "1px solid #e2e8f0",
            margin: "16px 0",
            fontSize: "13px",
            display: "flex",
            flexWrap: "wrap",
            gap: "16px 28px",
          }}
        >
          <div>
            <span>
              <CarFront size={14} /> Vehicle:
            </span>{" "}
            <b>
              {selectedLoan.loan.make} {selectedLoan.loan.model} (
              {selectedLoan.loan.year || "2026"})
            </b>
          </div>
          <div>
            <span>
              <Tags size={14} /> Type:
            </span>{" "}
            <b>{selectedLoan.loan.vehicle_type || "TWO_WHEELER"}</b>
          </div>
          <div>
            <span>
              <IdCard size={14} /> Reg No:
            </span>{" "}
            <b className="autoRegNo">
              {selectedLoan.loan.registration_number || "PENDING"}
            </b>
          </div>
          <div>
            <span>
              <Wrench size={14} /> Chassis No:
            </span>{" "}
            <b>{selectedLoan.loan.chassis_number || "—"}</b>
          </div>
          <div>
            <span>
              <Zap size={14} /> Engine No:
            </span>{" "}
            <b>{selectedLoan.loan.engine_number || "—"}</b>
          </div>
          {selectedLoan.loan.insurance_details && (
            <div>
              <span>
                <ShieldCheck size={14} /> Insurance:
              </span>{" "}
              <b>{selectedLoan.loan.insurance_details}</b>
            </div>
          )}
        </div>

        <div className="card tableWrap" style={{ marginTop: "16px" }}>
          <div className="cardHead" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "10px" }}>
            <h3>
              EMI Installment Schedule (
              {selectedLoan.schedules?.filter((s) => s.status === "PAID")
                .length || 0}{" "}
              / {selectedLoan.schedules?.length || 0} Paid)
            </h3>
            <div style={{ display: "flex", gap: "10px" }}>
              {selectedLoan.loan.status !== 'COMPLETED' && (
                <button
                  className="primary autoBtn"
                  style={{ padding: "4px 10px", fontSize: "12px", background: "#ef4444", borderColor: "#ef4444" }}
                  onClick={() => handleOpenCloseLoan(selectedLoan)}
                >
                  Close Loan Early
                </button>
              )}
              <button
                className="primary autoBtn"
                style={{ padding: "4px 10px", fontSize: "12px", background: "#3b82f6", borderColor: "#3b82f6" }}
                onClick={() => handleExportIndividual(selectedLoan)}
              >
                Download Schedule (Excel)
              </button>
            </div>
          </div>
          <table>
            <thead>
              <tr>
                <th>Inst #</th>
                <th>Due Date</th>
                <th>Principal</th>
                <th>Interest</th>
                <th>Total EMI</th>
                <th>Status</th>
                <th>EMI</th>
              </tr>
            </thead>
            <tbody>
              {(() => {
                const earliestUnpaid = selectedLoan.schedules?.find(
                  (item) => item.status === "PENDING" || item.status === "PARTIAL"
                );
                return selectedLoan.schedules?.map((s) => {
                  const isEarliestDue = earliestUnpaid && earliestUnpaid.id === s.id;
                  const hasPriorUnpaid = earliestUnpaid && earliestUnpaid.installment_number < s.installment_number;

                  return (
                    <tr key={s.id}>
                      <td>
                        <b>#{s.installment_number}</b>
                      </td>
                      <td>{dateLabel(s.due_date)}</td>

                      {/* PRINCIPAL COLUMN */}
                      <td>
                        <b>{money(s.scheduled_principal)}</b>
                        {s.status === "PARTIAL" && Number(s.paid_principal || 0) > 0 && (
                          <small style={{ display: "block", color: "#059669", fontSize: "11px" }}>
                            Paid: {money(s.paid_principal)}
                          </small>
                        )}
                        {Number(s.extra_principal_paid || 0) > 0 && (
                          <small style={{ display: "block", color: "#16a34a", fontSize: "11px" }}>
                            Extra: {money(s.extra_principal_paid)}
                          </small>
                        )}
                        {s.status === "PARTIAL" && Number(s.remaining_principal || 0) > 0 && (
                          <small style={{ display: "block", color: "#dc2626", fontSize: "11px" }}>
                            Rem: {money(s.remaining_principal)}
                          </small>
                        )}
                      </td>

                      {/* INTEREST COLUMN */}
                      <td>
                        <b>{money(s.scheduled_interest)}</b>
                        {s.status === "PARTIAL" && Number(s.paid_interest || 0) > 0 && (
                          <small style={{ display: "block", color: "#059669", fontSize: "11px" }}>
                            Paid: {money(s.paid_interest)}
                          </small>
                        )}
                        {s.status === "PARTIAL" && Number(s.remaining_interest || 0) > 0 && (
                          <small style={{ display: "block", color: "#dc2626", fontSize: "11px" }}>
                            Rem: {money(s.remaining_interest)}
                          </small>
                        )}
                      </td>

                      {/* TOTAL EMI COLUMN */}
                      <td>
                        <b>{money(s.scheduled_emi)}</b>
                        {s.status === "PARTIAL" && (
                          <small style={{ display: "block", color: "#d97706", fontWeight: "bold", fontSize: "11px" }}>
                            Bal Due: {money(s.remaining_emi_amount)}
                          </small>
                        )}
                      </td>

                      {/* STATUS COLUMN */}
                      <td>
                        {s.status === "PAID" ? (
                          <div style={{ display: "flex", flexDirection: "column", gap: "3px" }}>
                            <span className="tag" style={{ background: "#dcfce7", color: "#15803d", borderColor: "#86efac", width: "fit-content" }}>
                              PAID
                            </span>
                            {Number(s.extra_principal_paid || 0) > 0 && (
                              <span style={{ fontSize: "11px", color: "#16a34a", fontWeight: "500" }}>
                                Extra Principal: {money(s.extra_principal_paid)}
                              </span>
                            )}
                            <span style={{ fontSize: "11px", fontWeight: "bold", color: "#0f172a" }}>
                              Total Collected: {money(s.total_cash_collected)}
                            </span>
                          </div>
                        ) : s.status === "PARTIAL" ? (
                          <div style={{ display: "flex", flexDirection: "column", gap: "3px" }}>
                            <span className="tag" style={{ background: "#fef08a", color: "#854d0e", borderColor: "#fde047", width: "fit-content" }}>
                              PARTIAL
                            </span>
                            <span style={{ fontSize: "11px", color: "#64748b" }}>
                              Paid: {money(s.scheduled_amount_paid)}
                            </span>
                            {Number(s.extra_principal_paid || 0) > 0 && (
                              <span style={{ fontSize: "11px", color: "#16a34a", fontWeight: "500" }}>
                                Extra Principal: {money(s.extra_principal_paid)}
                              </span>
                            )}
                          </div>
                        ) : s.status === "CANCELLED" ? (
                          <span className="tag" style={{ background: "#f1f5f9", color: "#64748b", borderColor: "#cbd5e1" }}>
                            CANCELLED
                          </span>
                        ) : (
                          <span className="tag">PENDING</span>
                        )}
                      </td>

                      {/* ACTION COLUMN */}
                      <td>
                        {selectedLoan.loan.status === "COMPLETED" || s.status === "CANCELLED" ? (
                          <div style={{ color: s.status === "PAID" ? "#047857" : "#94a3b8", fontWeight: s.status === "PAID" ? "bold" : "normal", fontSize: "12px" }}>
                            {s.status === "PAID" ? money(s.collected_amount || s.total_emi) : "Cancelled"}
                          </div>
                        ) : s.status !== "PAID" ? (
                          <button
                            className="payButton"
                            style={{
                              background: isEarliestDue ? "#059669" : hasPriorUnpaid ? "#64748b" : "#2563eb",
                              borderColor: isEarliestDue ? "#059669" : hasPriorUnpaid ? "#64748b" : "#2563eb",
                              color: "#fff",
                              fontWeight: "700",
                            }}
                            title={hasPriorUnpaid ? `Installment #${earliestUnpaid.installment_number} is unpaid and must be cleared first` : undefined}
                            onClick={() => {
                              if (hasPriorUnpaid) {
                                setNotice?.({
                                  type: "info",
                                  text: `Installment #${earliestUnpaid.installment_number} is pending. Auto-routed payment to Installment #${earliestUnpaid.installment_number} to maintain chronological order.`
                                });
                                setPayEmiModal({
                                  loanId: selectedLoan.loan.id,
                                  emiId: earliestUnpaid.id,
                                  totalEmi: earliestUnpaid.total_emi,
                                  instNo: earliestUnpaid.installment_number,
                                  remainingEmi: earliestUnpaid.status === "PARTIAL" ? earliestUnpaid.remaining_emi_amount : earliestUnpaid.total_emi,
                                });
                                setPayForm({
                                  amountPaid: earliestUnpaid.status === "PARTIAL" ? earliestUnpaid.remaining_emi_amount : earliestUnpaid.total_emi,
                                  paymentMethod: "CASH",
                                  referenceNumber: "",
                                });
                                return;
                              }

                              setPayEmiModal({
                                loanId: selectedLoan.loan.id,
                                emiId: s.id,
                                totalEmi: s.total_emi,
                                instNo: s.installment_number,
                                remainingEmi: s.status === "PARTIAL" ? s.remaining_emi_amount : s.total_emi,
                              });
                              setPayForm({
                                amountPaid: s.status === "PARTIAL" ? s.remaining_emi_amount : s.total_emi,
                                paymentMethod: "CASH",
                                referenceNumber: "",
                              });
                            }}
                          >
                            {isEarliestDue ? "Collect EMI" : hasPriorUnpaid ? `Pay Due (#${earliestUnpaid.installment_number})` : "Pay Advance"}
                          </button>
                        ) : (
                          <div style={{ color: "#047857", fontWeight: "bold", fontSize: "13px" }}>
                            {money(s.collected_amount || s.total_emi)}
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                });
              })()}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
