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
  Trash,
  TriangleAlert,
  LoaderCircle
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
  const [documentToDelete, setDocumentToDelete] = useState(null);
  const [uploadingDocType, setUploadingDocType] = useState(null);

  const handleEditVehicleToggle = () => {
    if (!isEditingVehicle) {
      setVehicleForm({
        vehicleType: selectedLoan.loan.vehicle_type || "TWO_WHEELER",
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

  const submitVehicleEdit = async (e) => {
    const saved = await handleEditVehicle(e, vehicleForm);
    if (saved) setIsEditingVehicle(false);
  };

  const handleFileChange = async (docType, e) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setUploadingDocType(docType);
      try {
        await handleUploadDocument(docType, file);
      } finally {
        setUploadingDocType(null);
        e.target.value = "";
      }
    }
  };
  if (!selectedLoan) return null;

  const scheduledInterest = (selectedLoan.schedules || [])
    .filter((schedule) => schedule.status !== "CANCELLED")
    .reduce(
      (total, schedule) => total + Number(schedule.scheduled_interest ?? schedule.interest_component ?? 0),
      0,
    );
  const paymentSummaryByEmi = new Map();
  (selectedLoan.payments || []).forEach((payment) => {
    if (!payment.emi_id) return;
    const summary = paymentSummaryByEmi.get(payment.emi_id) || { lastDate: "", fineAmount: 0 };
    const paymentDate = String(payment.payment_date || "").slice(0, 10);
    if (paymentDate > summary.lastDate) summary.lastDate = paymentDate;
    summary.fineAmount += Number(payment.fine_amount || 0);
    paymentSummaryByEmi.set(payment.emi_id, summary);
  });

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
        style={{ width: "min(94vw, 1120px)", maxWidth: "1120px" }}
      >
        <button className="close" onClick={() => setSelectedLoan(null)}>
          <X size={18} />
        </button>
        <div className="autoLoanAgreementHeader">
          <div className="autoLoanAgreementIdentity">
            <span className="overline autoBadgeTag">VEHICLE LOAN AGREEMENT &amp; BORROWER DETAILS</span>
            <h2>{selectedLoan.loan.first_name} {selectedLoan.loan.last_name}</h2>
            <div className="autoLoanBorrowerMeta">
              <span><IdCard size={13} /> Code <b>{selectedLoan.loan.customer_code || "—"}</b></span>
              <span><Phone size={13} /> {selectedLoan.loan.phone ? <PhoneLink phone={selectedLoan.loan.phone} /> : <b>Phone not provided</b>}</span>
              {selectedLoan.loan.email && <span><Mail size={13} /> {selectedLoan.loan.email}</span>}
            </div>
            {selectedLoan.loan.address && (
              <p className="autoLoanBorrowerAddress">
                <MapPin size={13} /> Address: {selectedLoan.loan.address}
              </p>
            )}
          </div>
          <span className="autoLoanAgreementStatus">
            {selectedLoan.loan.status}
          </span>
        </div>

        {/* FINANCIAL SUMMARY */}
        <div className="loanSummaryGrid">
          <div className="loanSummaryMetric principalMetric">
            <div className="loanSummaryLabel">
              <span>
                <Banknote size={15} />
              </span>{" "}
              Loan disbursed
            </div>
            <strong>{money(selectedLoan.loan.loan_amount)}</strong>
            <small>Principal amount</small>
          </div>
          <div className="loanSummaryMetric rateMetric">
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
          <div className="loanSummaryMetric interestMetric">
            <div className="loanSummaryLabel">
              <span>
                <CircleDollarSign size={15} />
              </span>{" "}
              Interest amount
            </div>
            <strong>{money(scheduledInterest)}</strong>
            <small>Total interest in scheduled installments</small>
          </div>
          <div className="loanSummaryMetric tenureMetric">
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
        {selectedLoan.loan.fees_details && (selectedLoan.loan.fees_details.brokerName || selectedLoan.loan.fees_details.jaminName) && (
          <div className="autoLoanSection autoLoanBrokerSection">
            <h4 style={{ margin: "0 0 10px 0", color: "#334155", display: "flex", alignItems: "center", gap: "6px" }}>
              🤝 Broker & Guarantor
            </h4>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "16px 28px" }}>
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
        <div className="autoLoanSection autoLoanVehicleSection">
          <div className="autoLoanSectionHeader">
            <div>
              <span className="autoLoanSectionEyebrow">COLLATERAL</span>
              <h4><CarFront size={17} /> Vehicle Asset Specifications</h4>
            </div>
            <button className="secondary autoBtn" style={{ padding: "6px 10px", fontSize: "12px" }} onClick={handleEditVehicleToggle}>
              {isEditingVehicle ? <><X size={12}/> Cancel</> : <><Edit size={12}/> Edit Vehicle</>}
            </button>
          </div>

          {isEditingVehicle ? (
            <form className="autoVehicleEditForm" onSubmit={submitVehicleEdit}>
              <label><span>Vehicle type</span><select className="autoInput" value={vehicleForm.vehicleType} onChange={(e) => setVehicleForm({...vehicleForm, vehicleType: e.target.value})}>
                <option value="TWO_WHEELER">Two Wheeler (Bike / Scooter)</option>
                <option value="THREE_WHEELER">Three Wheeler / Auto Rickshaw</option>
                <option value="CAR">Car / SUV</option>
                <option value="COMMERCIAL">Commercial Vehicle</option>
                <option value="PICKUP">Pickup</option>
                <option value="TRUCK">Truck</option>
                <option value="BUS">Bus</option>
                <option value="TRACTOR">Tractor</option>
                <option value="VAN">Van / Minibus</option>
                <option value="OTHER">Other</option>
              </select></label>
              <label><span>Make</span><input className="autoInput" value={vehicleForm.make} onChange={(e) => setVehicleForm({...vehicleForm, make: e.target.value})} /></label>
              <label><span>Model</span><input className="autoInput" value={vehicleForm.model} onChange={(e) => setVehicleForm({...vehicleForm, model: e.target.value})} /></label>
              <label><span>Year</span><input type="number" className="autoInput" value={vehicleForm.year} onChange={(e) => setVehicleForm({...vehicleForm, year: e.target.value})} /></label>
              <label><span>Registration number</span><input className="autoInput" value={vehicleForm.registrationNumber} onChange={(e) => setVehicleForm({...vehicleForm, registrationNumber: e.target.value})} /></label>
              <label><span>Chassis number</span><input className="autoInput" value={vehicleForm.chassisNumber} onChange={(e) => setVehicleForm({...vehicleForm, chassisNumber: e.target.value})} /></label>
              <label><span>Engine number</span><input className="autoInput" value={vehicleForm.engineNumber} onChange={(e) => setVehicleForm({...vehicleForm, engineNumber: e.target.value})} /></label>
              <label><span>Insurance details</span><input className="autoInput" value={vehicleForm.insuranceDetails} onChange={(e) => setVehicleForm({...vehicleForm, insuranceDetails: e.target.value})} /></label>
              <div className="autoVehicleEditActions">
                <button type="button" className="secondary autoBtn" onClick={handleEditVehicleToggle}>Cancel</button>
                <button type="submit" className="primary autoBtn"><Save size={14} /> Save changes</button>
              </div>
            </form>
          ) : (
            <div className="autoLoanVehicleGrid">
              <div className="autoLoanVehicleItem"><span><CarFront size={13} /> Vehicle</span><b>{[selectedLoan.loan.make, selectedLoan.loan.model].filter(Boolean).join(" ") || "Vehicle"} ({selectedLoan.loan.year || "2026"})</b></div>
              <div className="autoLoanVehicleItem"><span><Tags size={13} /> Type</span><b>{selectedLoan.loan.vehicle_type || "TWO_WHEELER"}</b></div>
              <div className="autoLoanVehicleItem"><span><IdCard size={13} /> Registration</span><b className="autoRegNo">{selectedLoan.loan.registration_number || "PENDING"}</b></div>
              <div className="autoLoanVehicleItem"><span><Wrench size={13} /> Chassis number</span><b>{selectedLoan.loan.chassis_number || "—"}</b></div>
              <div className="autoLoanVehicleItem"><span><Zap size={13} /> Engine number</span><b>{selectedLoan.loan.engine_number || "—"}</b></div>
              {selectedLoan.loan.insurance_details && <div className="autoLoanVehicleItem"><span><ShieldCheck size={13} /> Insurance</span><b>{selectedLoan.loan.insurance_details}</b></div>}
            </div>
          )}
        </div>

        {/* LOAN DOCUMENTS */}
        <div className="autoLoanSection autoLoanDocumentsSection">
          <div className="autoLoanSectionHeader autoLoanDocumentsHeader">
            <div>
              <span className="autoLoanSectionEyebrow">FILES &amp; RECORDS</span>
              <h4><FileText size={17} /> Loan Documents</h4>
            </div>
            <span className="autoLoanDocumentCount">{selectedLoan.documents?.length || 0} files</span>
          </div>
          
          <div className="autoLoanUploadActions">
            {["aadhaar", "rc_book", "main_doc", "other"].map(docType => {
              const label = docType === "aadhaar" ? "Aadhaar" : docType === "rc_book" ? "RC Book" : docType === "main_doc" ? "Main Doc" : "Other";
              return (
                <div key={docType} style={{ position: "relative" }}>
                  <input type="file" id={`upload_${docType}`} style={{ display: "none" }} disabled={Boolean(uploadingDocType)} onChange={(e) => handleFileChange(docType, e)} />
                  <label htmlFor={`upload_${docType}`} className={`secondary autoBtn autoLoanUploadButton ${uploadingDocType === docType ? "isUploading" : ""}`} aria-disabled={Boolean(uploadingDocType)} style={{ padding: "6px 10px", fontSize: "12px", cursor: uploadingDocType ? "wait" : "pointer", display: "inline-flex", alignItems: "center", gap: "6px", opacity: uploadingDocType && uploadingDocType !== docType ? 0.55 : 1 }}>
                    {uploadingDocType === docType ? <LoaderCircle size={13} className="autoUploadSpinner" /> : <Upload size={13} />}
                    {uploadingDocType === docType ? `Uploading ${label}...` : `Upload ${label}`}
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
                          onClick={() => setDocumentToDelete(doc.filename)}
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
            <div className="autoLoanEmptyDocuments"><FileText size={19} /><span>No documents uploaded yet.</span><small>Upload borrower or vehicle records using the buttons above.</small></div>
          )}
        </div>

        {documentToDelete && (
          <div className="modal autoDeleteOverlay" style={{ zIndex: 2200 }} onClick={() => setDocumentToDelete(null)}>
            <div className="autoDeleteDialog" role="alertdialog" aria-modal="true" aria-labelledby="delete-document-title" aria-describedby="delete-document-description" onClick={(e) => e.stopPropagation()}>
              <div className="autoDeleteIcon"><TriangleAlert size={21} /></div>
              <div className="autoDeleteCopy">
                <span className="autoDeleteEyebrow">REMOVE FILE</span>
                <h3 id="delete-document-title">Delete this document?</h3>
                <p id="delete-document-description">This will permanently remove the file from this loan. This action can’t be undone.</p>
                <div className="autoDeleteFile"><FileText size={16} /><strong title={documentToDelete}>{documentToDelete}</strong></div>
              </div>
              <div className="autoDeleteActions">
                <button type="button" className="autoDeleteCancel" onClick={() => setDocumentToDelete(null)}>Keep document</button>
                <button type="button" className="autoDeleteConfirm" onClick={async () => { const filename = documentToDelete; setDocumentToDelete(null); await handleDeleteDocument(filename); }}><Trash size={14} /> Delete file</button>
              </div>
            </div>
          </div>
        )}

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
                <th>Collected Date</th>
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
                  const paymentSummary = paymentSummaryByEmi.get(s.id) || { lastDate: "", fineAmount: 0 };
                  const emiCollected = Number(s.total_cash_collected || s.collected_amount || s.total_emi || 0);

                  return (
                    <tr key={s.id}>
                      <td>
                        <b>#{s.installment_number}</b>
                      </td>
                      <td>{dateLabel(s.due_date)}</td>
                      <td>{paymentSummary.lastDate ? dateLabel(paymentSummary.lastDate) : "—"}</td>

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
                              EMI Collected: {money(emiCollected)}
                            </span>
                            {paymentSummary.fineAmount > 0 && (
                              <span style={{ fontSize: "11px", color: "#a16207", fontWeight: 600 }}>
                                Fine: {money(paymentSummary.fineAmount)}
                              </span>
                            )}
                          </div>
                        ) : s.status === "PARTIAL" ? (
                          <div style={{ display: "flex", flexDirection: "column", gap: "3px" }}>
                            <span className="tag" style={{ background: "#fef08a", color: "#854d0e", borderColor: "#fde047", width: "fit-content" }}>
                              PARTIAL
                            </span>
                            <span style={{ fontSize: "11px", color: "#64748b" }}>
                              Paid: {money(emiCollected)}
                            </span>
                            {paymentSummary.fineAmount > 0 && (
                              <span style={{ fontSize: "11px", color: "#a16207", fontWeight: 600 }}>
                                Fine: {money(paymentSummary.fineAmount)}
                              </span>
                            )}
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
                            {s.status === "PAID" ? money(emiCollected) : "Cancelled"}
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
                                  fineAmount: "0",
                                  collectedDate: new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 10),
                                  paymentMethod: "CASH",
                                  referenceNumber: "",
                                  receiptNumber: "",
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
                                fineAmount: "0",
                                collectedDate: new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 10),
                                paymentMethod: "CASH",
                                referenceNumber: "",
                                receiptNumber: "",
                              });
                            }}
                          >
                            {isEarliestDue ? "Collect EMI" : hasPriorUnpaid ? `Pay Due (#${earliestUnpaid.installment_number})` : "Pay Advance"}
                          </button>
                        ) : (
                          <div style={{ color: "#047857", fontWeight: "bold", fontSize: "13px" }}>
                            {money(emiCollected)}
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
