import React, { useState } from "react";
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
  Edit,
  Save,
  Upload,
  FileText,
  Trash
} from "lucide-react";
import PhoneLink from "../common/PhoneLink";
import { money, dateLabel, API_BASE } from "../services/autoFinanceApi";

export default function LoanDetailsModal({
  selectedLoan,
  setSelectedLoan,
  handleOpenCloseLoan,
  handleExportIndividual,
  handleEditVehicle,
  handleUploadDocument,
  handleDeleteDocument,
  setPayEmiModal,
  setPayForm,
  setNotice,
}) {
  const [isEditingVehicle, setIsEditingVehicle] = useState(false);
  const [vehicleForm, setVehicleForm] = useState({});

  const handleEditVehicleToggle = () => {
    if (!isEditingVehicle) {
      setVehicleForm({
        vehicleType: selectedLoan.loan.vehicle_type || "",
        make: selectedLoan.loan.make || "",
        model: selectedLoan.loan.model || "",
        year: selectedLoan.loan.year || "",
        registrationNumber: selectedLoan.loan.registration_number || "",
        chassisNumber: selectedLoan.loan.chassis_number || "",
        engineNumber: selectedLoan.loan.engine_number || "",
        insuranceDetails: selectedLoan.loan.insurance_details || ""
      });
    }
    setIsEditingVehicle(!isEditingVehicle);
  };

  const submitVehicleEdit = (e) => {
    handleEditVehicle(e, vehicleForm);
    setIsEditingVehicle(false);
  };

  const handleFileChange = (docType, e) => {
    if (e.target.files && e.target.files[0]) {
      handleUploadDocument(docType, e.target.files[0]);
    }
  };
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

        {/* BROKER & GUARANTOR DETAILS */}
        {selectedLoan.loan.fees_details && (selectedLoan.loan.fees_details.brokerName || selectedLoan.loan.fees_details.jaminName || selectedLoan.loan.fees_details.fundSource === "PARTNER") && (
          <div style={{ background: "#f8fafc", padding: "14px 18px", borderRadius: "12px", border: "1px solid #e2e8f0", margin: "16px 0", fontSize: "13px" }}>
            <h4 style={{ margin: "0 0 10px 0", color: "#334155", display: "flex", alignItems: "center", gap: "6px" }}>
              🤝 Stakeholders, Broker & Guarantor
            </h4>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "16px 28px" }}>
              <div>
                <span style={{ color: "#64748b" }}>Fund Source:</span>{" "}
                <b style={{ color: selectedLoan.loan.fees_details.fundSource === "PARTNER" ? "#7c3aed" : "#0284c7" }}>
                  {selectedLoan.loan.fees_details.fundSource === "PARTNER" ? "PARTNER CAPITAL" : "OWN CAPITAL (COMPANY)"}
                </b>
                {selectedLoan.loan.fees_details.fundSource === "PARTNER" && (
                  <span style={{ marginLeft: "6px", color: "#64748b" }}>
                    (Partner Interest Rate: <b>{selectedLoan.loan.fees_details.partnerInterestRate || 0}%</b>)
                  </span>
                )}
              </div>
              {selectedLoan.loan.fees_details.brokerName && (
                <div>
                  <span style={{ color: "#64748b" }}>Broker:</span> <b>{selectedLoan.loan.fees_details.brokerName}</b>
                  {selectedLoan.loan.fees_details.brokerPhone && <span style={{ marginLeft: "8px" }}><Phone size={12} /> {selectedLoan.loan.fees_details.brokerPhone}</span>}
                </div>
              )}
              {selectedLoan.loan.fees_details.jaminName && (
                <div>
                  <span style={{ color: "#64748b" }}>Guarantor (Jamin):</span> <b>{selectedLoan.loan.fees_details.jaminName}</b>
                  {selectedLoan.loan.fees_details.jaminRelation && <span style={{ color: "#64748b", marginLeft: "4px" }}>({selectedLoan.loan.fees_details.jaminRelation})</span>}
                  {selectedLoan.loan.fees_details.jaminPhone && <span style={{ marginLeft: "8px" }}><Phone size={12} /> {selectedLoan.loan.fees_details.jaminPhone}</span>}
                </div>
              )}
            </div>
          </div>
        )}

        {/* VEHICLE ASSET SPECIFICATIONS */}
        <div style={{ background: "#f8fafc", padding: "14px 18px", borderRadius: "12px", border: "1px solid #e2e8f0", margin: "16px 0", fontSize: "13px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" }}>
            <h4 style={{ margin: 0, color: "#334155", display: "flex", alignItems: "center", gap: "6px" }}>
              <CarFront size={16} /> Vehicle Asset Specifications
            </h4>
            <button className="secondary autoBtn" style={{ padding: "4px 8px", fontSize: "12px" }} onClick={handleEditVehicleToggle}>
              {isEditingVehicle ? <><X size={12}/> Cancel</> : <><Edit size={12}/> Edit Vehicle</>}
            </button>
          </div>

          {isEditingVehicle ? (
            <form onSubmit={submitVehicleEdit} style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "10px" }}>
              <label>Vehicle Type <input className="autoInput" value={vehicleForm.vehicleType} onChange={(e) => setVehicleForm({...vehicleForm, vehicleType: e.target.value})} /></label>
              <label>Make <input className="autoInput" value={vehicleForm.make} onChange={(e) => setVehicleForm({...vehicleForm, make: e.target.value})} /></label>
              <label>Model <input className="autoInput" value={vehicleForm.model} onChange={(e) => setVehicleForm({...vehicleForm, model: e.target.value})} /></label>
              <label>Year <input type="number" className="autoInput" value={vehicleForm.year} onChange={(e) => setVehicleForm({...vehicleForm, year: e.target.value})} /></label>
              <label>Reg Number <input className="autoInput" value={vehicleForm.registrationNumber} onChange={(e) => setVehicleForm({...vehicleForm, registrationNumber: e.target.value})} /></label>
              <label>Chassis No <input className="autoInput" value={vehicleForm.chassisNumber} onChange={(e) => setVehicleForm({...vehicleForm, chassisNumber: e.target.value})} /></label>
              <label>Engine No <input className="autoInput" value={vehicleForm.engineNumber} onChange={(e) => setVehicleForm({...vehicleForm, engineNumber: e.target.value})} /></label>
              <label>Insurance Details <input className="autoInput" value={vehicleForm.insuranceDetails} onChange={(e) => setVehicleForm({...vehicleForm, insuranceDetails: e.target.value})} /></label>
              <div style={{ gridColumn: "1 / -1", display: "flex", justifyContent: "flex-end", marginTop: "10px" }}>
                <button type="submit" className="primary autoBtn"><Save size={14} /> Save Changes</button>
              </div>
            </form>
          ) : (
            <div style={{ display: "flex", flexWrap: "wrap", gap: "16px 28px" }}>
              <div><span><CarFront size={14} /> Vehicle:</span> <b>{selectedLoan.loan.make} {selectedLoan.loan.model} ({selectedLoan.loan.year || "2026"})</b></div>
              <div><span><Tags size={14} /> Type:</span> <b>{selectedLoan.loan.vehicle_type || "TWO_WHEELER"}</b></div>
              <div><span><IdCard size={14} /> Reg No:</span> <b className="autoRegNo">{selectedLoan.loan.registration_number || "PENDING"}</b></div>
              <div><span><Wrench size={14} /> Chassis No:</span> <b>{selectedLoan.loan.chassis_number || "—"}</b></div>
              <div><span><Zap size={14} /> Engine No:</span> <b>{selectedLoan.loan.engine_number || "—"}</b></div>
              {selectedLoan.loan.insurance_details && <div><span><ShieldCheck size={14} /> Insurance:</span> <b>{selectedLoan.loan.insurance_details}</b></div>}
            </div>
          )}
        </div>

        {/* LOAN DOCUMENTS */}
        <div style={{ background: "#f8fafc", padding: "14px 18px", borderRadius: "12px", border: "1px solid #e2e8f0", margin: "16px 0", fontSize: "13px" }}>
          <h4 style={{ margin: "0 0 10px 0", color: "#334155", display: "flex", alignItems: "center", gap: "6px" }}>
            <FileText size={16} /> Loan Documents
          </h4>
          
          <div style={{ display: "flex", gap: "12px", flexWrap: "wrap", marginBottom: "16px" }}>
            {["aadhaar", "rc_book", "main_doc", "other"].map(docType => {
              const label = docType === "aadhaar" ? "Aadhaar" : docType === "rc_book" ? "RC Book" : docType === "main_doc" ? "Main Doc" : "Other";
              return (
                <div key={docType} style={{ position: "relative" }}>
                  <input type="file" id={`upload_${docType}`} style={{ display: "none" }} onChange={(e) => handleFileChange(docType, e)} />
                  <label htmlFor={`upload_${docType}`} className="secondary autoBtn" style={{ padding: "4px 10px", fontSize: "12px", cursor: "pointer", display: "inline-flex", alignItems: "center", gap: "6px" }}>
                    <Upload size={13} /> Upload {label}
                  </label>
                </div>
              );
            })}
          </div>

          {selectedLoan.documents && selectedLoan.documents.length > 0 ? (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: "10px" }}>
              {selectedLoan.documents.map(doc => {
                const downloadUrl = doc.url || `${API_BASE}/loans/${selectedLoan.loan.id}/documents/${doc.filename}`;
                const isSupabase = doc.storage === "supabase" || Boolean(doc.url);
                return (
                  <div key={doc.filename} style={{ padding: "10px 12px", background: "#fff", border: "1px solid #cbd5e1", borderRadius: "8px", display: "flex", justifyContent: "space-between", alignItems: "center", gap: "8px" }}>
                    <div style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "2px" }}>
                        <span style={{ fontWeight: "bold", fontSize: "12px", textTransform: "capitalize", color: "#0f766e" }}>{doc.docType.replace("_", " ")}</span>
                        <span style={{ fontSize: "10px", background: isSupabase ? "#ecfdf5" : "#f1f5f9", color: isSupabase ? "#059669" : "#64748b", padding: "1px 5px", borderRadius: "4px", fontWeight: "600" }}>
                          {isSupabase ? "☁️ Supabase" : "💾 Local"}
                        </span>
                      </div>
                      <small style={{ color: "#64748b", fontSize: "11px" }}>{(doc.size / 1024).toFixed(1)} KB</small>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                      <a href={downloadUrl} download target="_blank" rel="noreferrer" className="primary autoBtn" style={{ padding: "4px 8px", fontSize: "11px", textDecoration: "none" }}>
                        Download
                      </a>
                      {handleDeleteDocument && (
                        <button
                          type="button"
                          onClick={() => handleDeleteDocument(doc.filename)}
                          title="Delete document"
                          style={{
                            background: "transparent",
                            border: "1px solid #fca5a5",
                            color: "#ef4444",
                            padding: "4px",
                            borderRadius: "4px",
                            cursor: "pointer",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center"
                          }}
                        >
                          <Trash size={13} />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div style={{ color: "#64748b", fontSize: "12px", fontStyle: "italic" }}>No documents uploaded yet.</div>
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
