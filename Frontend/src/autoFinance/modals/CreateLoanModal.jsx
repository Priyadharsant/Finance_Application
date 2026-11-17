import React from "react";
import { X, UserRound, CarFront, Upload, FileCheck2, LoaderCircle } from "lucide-react";
import SearchableSelect from "../common/SearchableSelect";
import { money } from "../services/autoFinanceApi";

export default function CreateLoanModal({
  showCreateLoan,
  setShowCreateLoan,
  loanForm,
  setLoanForm,
  customerOptions,
  handleCreateLoan,
  partners = [],
  submitting = false,
  uploadProgress = null,
}) {
  if (!showCreateLoan) return null;

  return (
    <div
      className="modal"
      onClick={(event) => {
        if (event.target === event.currentTarget) setShowCreateLoan(false);
      }}
    >
      <form
        className="formCard modalForm autoNewLoanForm"
        onClick={(event) => event.stopPropagation()}
        onSubmit={handleCreateLoan}
      >
        <button
          type="button"
          className="close"
          onClick={() => setShowCreateLoan(false)}
        >
          <X size={18} />
        </button>
        <div className="formTitle autoNewLoanTitle">
          <span className="overline autoBadgeTag">AUTO FINANCE · NEW LOAN</span>
          <h2>Issue a vehicle loan</h2>
          <p>Choose a borrower, set repayment terms, and add vehicle details.</p>
        </div>

        <div className="formGrid">
          <div className="formSectionHeader">
            <UserRound size={15} /> Customer Selection
          </div>
          <div className="loanCustomerPicker">
            <SearchableSelect
              label="Search & Select Customer"
              placeholder="Select existing customer or create a new one..."
              options={[{ value: "", label: "+ Create New Customer Inline", subtext: "" }, ...customerOptions]}
              value={loanForm.customerId}
              onChange={(val) => setLoanForm({ ...loanForm, customerId: val })}
              hint="Select an existing customer or leave empty to fill details below."
            />
          </div>

          {!loanForm.customerId && (
            <>
              <div className="formSectionHeader">
                New Customer Details
              </div>
              <label>
                First Name *
                <input
                  required={!loanForm.customerId}
                  value={loanForm.firstName}
                  onChange={(e) =>
                    setLoanForm({ ...loanForm, firstName: e.target.value })
                  }
                />
              </label>
              <label>
                Last Name *
                <input
                  required={!loanForm.customerId}
                  value={loanForm.lastName}
                  onChange={(e) =>
                    setLoanForm({ ...loanForm, lastName: e.target.value })
                  }
                />
              </label>
              <label>
                Phone Number *
                <input
                  required={!loanForm.customerId}
                  value={loanForm.phone}
                  onChange={(e) =>
                    setLoanForm({ ...loanForm, phone: e.target.value })
                  }
                />
              </label>
              <label>
                Email
                <input
                  type="email"
                  value={loanForm.email}
                  onChange={(e) =>
                    setLoanForm({ ...loanForm, email: e.target.value })
                  }
                />
              </label>
              <label>
                City
                <input
                  value={loanForm.city}
                  onChange={(e) =>
                    setLoanForm({ ...loanForm, city: e.target.value })
                  }
                />
              </label>
              <label>
                State
                <input
                  value={loanForm.state}
                  onChange={(e) =>
                    setLoanForm({ ...loanForm, state: e.target.value })
                  }
                />
              </label>
              <label className="wide">
                Full Address
                <textarea
                  value={loanForm.address}
                  onChange={(e) =>
                    setLoanForm({ ...loanForm, address: e.target.value })
                  }
                />
              </label>
            </>
          )}



          <div className="formSectionHeader">
            💰 Loan Parameters & Calculations
          </div>

          <label>
            Interest Method / Type *
            <select
              value={loanForm.interestType}
              onChange={(e) =>
                setLoanForm({ ...loanForm, interestType: e.target.value })
              }
            >
              <option value="FLAT">Flat Interest Rate</option>
              <option value="REDUCING">Reducing Balance Rate</option>
            </select>
          </label>

          <label>
            Loan Amount (₹) *
            <input
              type="number"
              min="1000"
              required
              placeholder="e.g. 75000"
              value={loanForm.loanAmount}
              onChange={(e) =>
                setLoanForm({ ...loanForm, loanAmount: e.target.value })
              }
            />
          </label>

          <label>
            Interest Rate (% per month) *
            <input
              type="number"
              step="0.1"
              required
              placeholder="e.g. 12"
              value={loanForm.interestRate}
              onChange={(e) =>
                setLoanForm({ ...loanForm, interestRate: e.target.value })
              }
            />
          </label>

          <label>
            Tenure (Months) *
            <input
              type="number"
              min="1"
              max="84"
              required
              placeholder="e.g. 12"
              value={loanForm.tenureMonths}
              onChange={(e) =>
                setLoanForm({ ...loanForm, tenureMonths: e.target.value })
              }
            />
          </label>

          <label>
            Loan Start Date *
            <input
              type="date"
              required
              value={loanForm.startDate}
              onChange={(e) =>
                setLoanForm({ ...loanForm, startDate: e.target.value })
              }
            />
          </label>

          <div className="formSectionHeader" style={{ marginTop: "24px" }}>
            🤝 Broker & Guarantor (Jamin) Details
          </div>
          <div className="loanSubFormGrid">
            <label>Broker Name <input placeholder="Name" value={loanForm.brokerName} onChange={(e) => setLoanForm({ ...loanForm, brokerName: e.target.value })} /></label>
            <label>Broker Phone <input placeholder="Phone" value={loanForm.brokerPhone} onChange={(e) => setLoanForm({ ...loanForm, brokerPhone: e.target.value })} /></label>
          </div>
          <div className="loanSubFormGrid">
            <label>Jamin (Guarantor) Name <input placeholder="Name" value={loanForm.jaminName} onChange={(e) => setLoanForm({ ...loanForm, jaminName: e.target.value })} /></label>
            <label>Jamin Phone <input placeholder="Phone" value={loanForm.jaminPhone} onChange={(e) => setLoanForm({ ...loanForm, jaminPhone: e.target.value })} /></label>
            <label>Jamin Relation <input placeholder="Relation (e.g. Brother)" value={loanForm.jaminRelation} onChange={(e) => setLoanForm({ ...loanForm, jaminRelation: e.target.value })} /></label>
          </div>

          <div className="formSectionHeader" style={{ marginTop: "24px" }}>
            💰 Deductions & Fees
          </div>
          <div className="loanFeesGrid">
            <label>Income Due <input type="number" className="autoInput" value={loanForm.incomeDue} onChange={(e) => setLoanForm({ ...loanForm, incomeDue: Number(e.target.value) })} /></label>
            <label>Document <input type="number" className="autoInput" value={loanForm.documentFee} onChange={(e) => setLoanForm({ ...loanForm, documentFee: Number(e.target.value) })} /></label>
            <label>Hire Purchase <input type="number" className="autoInput" value={loanForm.hirePurchase} onChange={(e) => setLoanForm({ ...loanForm, hirePurchase: Number(e.target.value) })} /></label>
            <label>Tax Amount <input type="number" className="autoInput" value={loanForm.taxAmount} onChange={(e) => setLoanForm({ ...loanForm, taxAmount: Number(e.target.value) })} /></label>
            <label>Insurance <input type="number" className="autoInput" value={loanForm.insurance} onChange={(e) => setLoanForm({ ...loanForm, insurance: Number(e.target.value) })} /></label>
            <label>Fitness Cert <input type="number" className="autoInput" value={loanForm.insuranceFine} onChange={(e) => setLoanForm({ ...loanForm, insuranceFine: Number(e.target.value) })} /></label>
            <label>Green Tax <input type="number" className="autoInput" value={loanForm.greenTax} onChange={(e) => setLoanForm({ ...loanForm, greenTax: Number(e.target.value) })} /></label>
            <label>Fine <input type="number" className="autoInput" value={loanForm.fine} onChange={(e) => setLoanForm({ ...loanForm, fine: Number(e.target.value) })} /></label>
            <label>Name Transfer <input type="number" className="autoInput" value={loanForm.nationalTax} onChange={(e) => setLoanForm({ ...loanForm, nationalTax: Number(e.target.value) })} /></label>
            <label>Permit <input type="number" className="autoInput" value={loanForm.permit} onChange={(e) => setLoanForm({ ...loanForm, permit: Number(e.target.value) })} /></label>
            <label>Brokerage (Cust.) <input type="number" className="autoInput" value={loanForm.brokerageCustomer} onChange={(e) => setLoanForm({ ...loanForm, brokerageCustomer: Number(e.target.value) })} /></label>
            <label>Brokerage (Hand) <input type="number" className="autoInput" value={loanForm.brokerageHand} onChange={(e) => setLoanForm({ ...loanForm, brokerageHand: Number(e.target.value) })} /></label>
          </div>

          <div className="formSectionHeader" style={{ marginTop: "24px" }}>
            📎 Loan Documents (Optional)
          </div>
          <div className="loanDocumentPickerGrid">
            {[
              { id: 'aadhaar', label: 'Aadhaar Card' },
              { id: 'rc_book', label: 'RC Book' },
              { id: 'main_doc', label: 'Main Agreement' },
              { id: 'other', label: 'Other Document' }
            ].map(doc => (
              <div key={doc.id} className="loanDocumentUploadCard">
                <span className="loanDocumentUploadLabel">{doc.label}</span>
                <label className={`loanDocumentUploadButton ${loanForm.documents?.[doc.id] ? "hasFile" : ""} ${uploadProgress?.docType === doc.id ? "isUploading" : ""}`}>
                  {uploadProgress?.docType === doc.id ? <LoaderCircle size={15} className="autoUploadSpinner" /> : loanForm.documents?.[doc.id] ? <FileCheck2 size={15} /> : <Upload size={15} />}
                  <span>{uploadProgress?.docType === doc.id ? `Uploading ${uploadProgress.current}/${uploadProgress.total} · ${uploadProgress.fileName}` : loanForm.documents?.[doc.id]?.name || "Choose a file"}</span>
                  <input
                    type="file"
                    aria-label={`Upload ${doc.label}`}
                    disabled={submitting}
                    onChange={(e) => {
                      if (e.target.files && e.target.files[0]) {
                        setLoanForm({
                          ...loanForm,
                          documents: {
                            ...(loanForm.documents || {}),
                            [doc.id]: e.target.files[0]
                          }
                        });
                      }
                    }}
                  />
                </label>
              </div>
            ))}
          </div>
          {uploadProgress && (
            <div className="loanUploadProgressNotice" role="status" aria-live="polite">
              <LoaderCircle size={16} className="autoUploadSpinner" />
              <span>Uploading {uploadProgress.docType.replaceAll("_", " ")} ({uploadProgress.current} of {uploadProgress.total})</span>
            </div>
          )}

          {/* LIVE EMI CALCULATION PREVIEW BOX (FLAT & REDUCING) */}
          <div className="loanDisbursementPreview">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ color: "#64748b", fontWeight: 600 }}>Total Loan Amount:</span>
              <b style={{ fontSize: "16px", color: "#0f172a" }}>₹{Number(loanForm.loanAmount || 0).toLocaleString()}</b>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "8px" }}>
              <span style={{ color: "#ef4444", fontWeight: 600 }}>Total Deductions:</span>
              <b style={{ fontSize: "15px", color: "#ef4444" }}>- ₹{(Number(loanForm.incomeDue || 0) + Number(loanForm.documentFee || 0) + Number(loanForm.hirePurchase || 0) + Number(loanForm.taxAmount || 0) + Number(loanForm.insurance || 0) + Number(loanForm.insuranceFine || 0) + Number(loanForm.greenTax || 0) + Number(loanForm.fine || 0) + Number(loanForm.nationalTax || 0) + Number(loanForm.permit || 0) + Number(loanForm.brokerageCustomer || 0)).toLocaleString()}</b>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "12px", borderTop: "1px solid #e2e8f0", paddingTop: "12px" }}>
              <span style={{ color: "#059669", fontWeight: 700, fontSize: "16px" }}>In-Hand Amount (Disbursed):</span>
              <b style={{ fontSize: "20px", color: "#059669" }}>₹{(Number(loanForm.loanAmount || 0) - (Number(loanForm.incomeDue || 0) + Number(loanForm.documentFee || 0) + Number(loanForm.hirePurchase || 0) + Number(loanForm.taxAmount || 0) + Number(loanForm.insurance || 0) + Number(loanForm.insuranceFine || 0) + Number(loanForm.greenTax || 0) + Number(loanForm.fine || 0) + Number(loanForm.nationalTax || 0) + Number(loanForm.permit || 0) + Number(loanForm.brokerageCustomer || 0))).toLocaleString()}</b>
            </div>
          </div>

          {Boolean(loanForm.loanAmount && loanForm.tenureMonths) &&
            (() => {
              const P = parseFloat(loanForm.loanAmount || 0);
              const rateVal = parseFloat(loanForm.interestRate || 0);
              const n = parseInt(loanForm.tenureMonths || 12);
              const isReducing = loanForm.interestType === "REDUCING";

              let monthlyEmi = 0;
              let totalInt = 0;
              let totalPay = 0;

              if (isReducing && rateVal > 0 && n > 0) {
                const rMo = rateVal / 100;
                monthlyEmi =
                  (P * rMo * Math.pow(1 + rMo, n)) /
                  (Math.pow(1 + rMo, n) - 1);
                totalPay = monthlyEmi * n;
                totalInt = totalPay - P;
              } else {
                totalInt = P * (rateVal / 100) * n;
                totalPay = P + totalInt;
                monthlyEmi = n > 0 ? totalPay / n : 0;
              }

              return (
                <div className="breakdown loanEmiPreview">
                  <div>
                    <span>Monthly EMI ({loanForm.interestType})</span>
                    <b>{money(monthlyEmi)}</b>
                  </div>
                  <div>
                    <span>Total Interest</span>
                    <b>{money(totalInt)}</b>
                  </div>
                  <div>
                    <span>Principal</span>
                    <b>{money(P)}</b>
                  </div>
                  <div>
                    <span>Total Payable</span>
                    <b>{money(totalPay)}</b>
                  </div>
                </div>
              );
            })()}

          <div className="formSectionHeader">
            <CarFront size={15} /> Vehicle Specifications
          </div>

          <label>
            Vehicle Type
            <select
              value={loanForm.vehicleType}
              onChange={(e) =>
                setLoanForm({ ...loanForm, vehicleType: e.target.value })
              }
            >
              <option value="TWO_WHEELER">
                Two-Wheeler (Bike / Scooter)
              </option>
              <option value="THREE_WHEELER">Three Wheeler / Auto Rickshaw</option>
              <option value="CAR">Car / SUV</option>
              <option value="COMMERCIAL">Commercial Vehicle</option>
              <option value="PICKUP">Pickup</option>
              <option value="TRUCK">Truck</option>
              <option value="BUS">Bus</option>
              <option value="TRACTOR">Tractor</option>
              <option value="VAN">Van / Minibus</option>
              <option value="OTHER">Other</option>
            </select>
          </label>

          <label>
            Make / Brand
            <input
              placeholder="e.g. Honda, Hero, Hyundai"
              value={loanForm.make}
              onChange={(e) =>
                setLoanForm({ ...loanForm, make: e.target.value })
              }
            />
          </label>

          <label>
            Model
            <input
              placeholder="e.g. Activa 6G, Creta"
              value={loanForm.model}
              onChange={(e) =>
                setLoanForm({ ...loanForm, model: e.target.value })
              }
            />
          </label>

          <label>
            Registration Number
            <input
              placeholder="e.g. TN-01-AB-1234"
              value={loanForm.registrationNumber}
              onChange={(e) =>
                setLoanForm({
                  ...loanForm,
                  registrationNumber: e.target.value,
                })
              }
            />
          </label>

          <label>
            Chassis Number
            <input
              placeholder="Chassis No"
              value={loanForm.chassisNumber}
              onChange={(e) =>
                setLoanForm({ ...loanForm, chassisNumber: e.target.value })
              }
            />
          </label>

          <label>
            Engine Number
            <input
              placeholder="Engine No"
              value={loanForm.engineNumber}
              onChange={(e) =>
                setLoanForm({ ...loanForm, engineNumber: e.target.value })
              }
            />
          </label>
        </div>

        <button
          type="submit"
          className="primary autoBtn full"
          disabled={submitting}
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "8px",
            opacity: submitting ? 0.75 : 1,
            cursor: submitting ? "not-allowed" : "pointer",
          }}
        >
          {submitting ? (
            <>
              <span className="autoBtnSpinner" />
              {uploadProgress
                ? `Uploading ${uploadProgress.docType.replaceAll("_", " ")} (${uploadProgress.current}/${uploadProgress.total})...`
                : "Generating Loan & Schedules..."}
            </>
          ) : (
            "Generate Loan & EMI Schedule"
          )}
        </button>
      </form>
    </div>
  );
}
