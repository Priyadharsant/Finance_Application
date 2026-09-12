import React, { useState, useEffect } from "react";
import {
  X,
  ArrowDownCircle,
  ArrowRightCircle,
  Landmark,
  Check,
  Copy,
  Banknote,
  UserRound,
  Phone,
  CarFront,
  ShieldCheck,
  Activity,
  Users,
  Receipt,
  Globe,
} from "lucide-react";
import { API } from "../services/globalCapitalApi.js";
import { money, formatDate } from "../utils/formatters.js";

export default function LedgerTransactionModal({ record, close }) {
  const [details, setDetails] = useState(null);
  const [loading, setLoading] = useState(true);
  const [copiedId, setCopiedId] = useState(false);

  useEffect(() => {
    let isMounted = true;
    const loadDetails = async () => {
      try {
        setLoading(true);
        const res = await fetch(`${API}/ledger/${record.id}`);
        if (res.ok) {
          const data = await res.json();
          if (isMounted) setDetails(data);
        }
      } catch (err) {
        console.error("Failed to load extended transaction details", err);
      } finally {
        if (isMounted) setLoading(false);
      }
    };
    loadDetails();
    return () => {
      isMounted = false;
    };
  }, [record.id]);

  const handleCopyId = () => {
    if (record?.id) {
      navigator.clipboard.writeText(record.id);
      setCopiedId(true);
      setTimeout(() => setCopiedId(false), 2000);
    }
  };

  const formatOnlyDate = (val) =>
    val ? new Date(val).toLocaleDateString("en-IN") : "—";

  const isCredit = record.direction === "CREDIT";

  return (
    <div
      className="modalOverlay"
      onClick={(e) => {
        if (e.target === e.currentTarget) close();
      }}
    >
      <div
        className="modalContent txModalContent"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modalHeader">
          <div>
            <span className="overline autoBadgeTag">TRANSACTION AUDIT</span>
            <h3>Global Cash Ledger Transaction</h3>
          </div>
          <button className="iconBtn" onClick={close} aria-label="Close">
            <X size={18} />
          </button>
        </div>

        <div className="modalBody">
          {/* Top Hero Banner */}
          <div className={`txHeroCard ${isCredit ? "credit" : "debit"}`}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <span
                style={{
                  fontSize: "11px",
                  fontWeight: "800",
                  letterSpacing: ".5px",
                  textTransform: "uppercase",
                }}
              >
                {isCredit ? "CASH INFLOW (CREDIT)" : "CASH OUTFLOW (DEBIT)"}
              </span>
              <span className={`txBadge ${isCredit ? "credit" : "debit"}`}>
                {isCredit ? (
                  <ArrowDownCircle size={13} />
                ) : (
                  <ArrowRightCircle size={13} />
                )}
                {isCredit ? "CREDIT" : "DEBIT"}
              </span>
            </div>

            <div className="txHeroAmount">
              {isCredit ? "+" : "-"} {money(record.amount)}
            </div>

            <div className="txBadgeRow">
              <span
                className="analyticsPill"
                style={{ background: "#ffffff", fontWeight: "700" }}
              >
                {record.type}
              </span>
              <span className="txBadge module">
                {record.source_module === "AUTO" && <CarFront size={12} />}
                {record.source_module === "DAILY" && <Activity size={12} />}
                {record.source_module === "GLOBAL" && <Globe size={12} />}
                {record.source_module} FINANCE
              </span>
              <span
                style={{ fontSize: "12px", opacity: 0.85, marginLeft: "auto" }}
              >
                Effective: {formatOnlyDate(record.effective_date)}
              </span>
            </div>
          </div>

          {/* Core Transaction Parameters */}
          <div className="txSection" style={{ marginTop: 0 }}>
            <div className="txSectionTitle">
              <Landmark size={14} /> Audit &amp; Ledger Attributes
            </div>
            <div className="txGrid">
              <div className="txGridItem">
                <span>Transaction ID</span>
                <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                  <strong
                    style={{
                      fontSize: "11px",
                      fontFamily: "monospace",
                      color: "#475569",
                    }}
                  >
                    {record.id}
                  </strong>
                  <button
                    type="button"
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "3px",
                      background: copiedId ? "#dcfce7" : "#f1f5f9",
                      color: copiedId ? "#15803d" : "#475569",
                      border: "1px solid",
                      borderColor: copiedId ? "#86efac" : "#cbd5e1",
                      borderRadius: "4px",
                      padding: "1px 6px",
                      fontSize: "10.5px",
                      fontWeight: "600",
                      cursor: "pointer",
                      transition: "all 0.15s ease",
                    }}
                    title="Copy Transaction ID"
                    onClick={handleCopyId}
                  >
                    {copiedId ? <Check size={11} /> : <Copy size={11} />}
                    {copiedId ? "Copied" : "Copy"}
                  </button>
                </div>
              </div>
              <div className="txGridItem">
                <span>Recorded Timestamp</span>
                <strong>
                  {formatDate(record.transaction_date || record.created_at)}
                </strong>
              </div>
              <div className="txGridItem">
                <span>Reference Type</span>
                <strong>{record.reference_type || "N/A"}</strong>
              </div>
              <div className="txGridItem">
                <span>Reference ID</span>
                <strong
                  style={{
                    fontSize: "11px",
                    fontFamily: "monospace",
                    color: "#475569",
                  }}
                >
                  {record.reference_id || "None"}
                </strong>
              </div>
            </div>

            {record.notes && (
              <div className="txNotesBox">
                <strong>Notes / Narration:</strong> {record.notes}
              </div>
            )}
          </div>

          {/* Extended Business Details */}
          {loading ? (
            <div
              style={{
                padding: "28px",
                textAlign: "center",
                color: "#64748b",
              }}
            >
              <div className="livePulseDot" style={{ margin: "0 auto 8px" }} />
              <small>Fetching contextual loan, customer, and vehicle details...</small>
            </div>
          ) : (
            <>
              {/* Payment Details if available */}
              {details?.payment && (
                <div className="txSection">
                  <div className="txSectionTitle">
                    <Banknote size={14} /> Collection / Payment Breakdown
                  </div>
                  <div className="txGrid threeCol">
                    <div className="txGridItem">
                      <span>Total Amount Paid</span>
                      <strong style={{ color: "#059669", fontSize: "15px" }}>
                        {money(details.payment.amount_paid)}
                      </strong>
                    </div>
                    <div className="txGridItem">
                      <span>Principal Portion</span>
                      <strong>{money(details.payment.principal_paid)}</strong>
                    </div>
                    <div className="txGridItem">
                      <span>Interest Portion</span>
                      <strong>{money(details.payment.interest_paid)}</strong>
                    </div>
                    {Number(details.payment.extra_principal_paid || 0) > 0 && (
                      <div className="txGridItem">
                        <span>Extra Principal</span>
                        <strong style={{ color: "#0284c7" }}>
                          {money(details.payment.extra_principal_paid)}
                        </strong>
                      </div>
                    )}
                    <div className="txGridItem">
                      <span>Payment Method</span>
                      <strong style={{ textTransform: "uppercase" }}>
                        {details.payment.payment_method || "CASH"}
                      </strong>
                    </div>
                    <div className="txGridItem">
                      <span>Payment Date</span>
                      <strong>
                        {formatOnlyDate(details.payment.payment_date)}
                      </strong>
                    </div>
                    <div className="txGridItem">
                      <span>Receipt / Ref No</span>
                      <strong>
                        {details.payment.reference_number || "None"}
                      </strong>
                    </div>
                    {details.payment.emi_id && (
                      <div className="txGridItem">
                        <span>Associated EMI ID</span>
                        <strong
                          style={{
                            fontSize: "11px",
                            fontFamily: "monospace",
                            color: "#64748b",
                          }}
                        >
                          {details.payment.emi_id}
                        </strong>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Customer Details if available */}
              {details?.customer && (
                <div className="txSection">
                  <div className="txSectionTitle">
                    <UserRound size={14} /> Linked Customer Information
                  </div>
                  <div className="txGrid">
                    <div className="txGridItem">
                      <span>Customer Name</span>
                      <strong style={{ fontSize: "14px", color: "#0f172a" }}>
                        {details.customer.name}
                      </strong>
                    </div>
                    <div className="txGridItem">
                      <span>Phone Number</span>
                      <strong>
                        {details.customer.phone ? (
                          <a
                            href={`tel:${details.customer.phone}`}
                            className="phoneLink"
                          >
                            <Phone size={13} /> {details.customer.phone}
                          </a>
                        ) : (
                          "Not provided"
                        )}
                      </strong>
                    </div>
                    {details.customer.customerCode && (
                      <div className="txGridItem">
                        <span>Customer Code</span>
                        <strong>{details.customer.customerCode}</strong>
                      </div>
                    )}
                    {(details.customer.address || details.customer.city) && (
                      <div className="txGridItem">
                        <span>Address / City</span>
                        <strong>
                          {[details.customer.address, details.customer.city]
                            .filter(Boolean)
                            .join(", ") || "N/A"}
                        </strong>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Vehicle Details if available */}
              {details?.vehicle &&
                (details.vehicle.regNo || details.vehicle.make) && (
                  <div className="txSection">
                    <div className="txSectionTitle">
                      <CarFront size={14} /> Vehicle Information
                    </div>
                    <div className="txGrid">
                      <div className="txGridItem">
                        <span>Vehicle Model</span>
                        <strong style={{ fontSize: "14px" }}>
                          {[details.vehicle.make, details.vehicle.model]
                            .filter(Boolean)
                            .join(" ") || "Vehicle"}
                        </strong>
                      </div>
                      <div className="txGridItem">
                        <span>Registration Number</span>
                        <strong
                          style={{ color: "#2563eb", letterSpacing: ".5px" }}
                        >
                          {details.vehicle.regNo || "Not registered"}
                        </strong>
                      </div>
                      {details.vehicle.vehicleType && (
                        <div className="txGridItem">
                          <span>Vehicle Type</span>
                          <strong>{details.vehicle.vehicleType}</strong>
                        </div>
                      )}
                      {details.vehicle.chassisNo && (
                        <div className="txGridItem">
                          <span>Chassis Number</span>
                          <strong
                            style={{
                              fontFamily: "monospace",
                              fontSize: "11px",
                            }}
                          >
                            {details.vehicle.chassisNo}
                          </strong>
                        </div>
                      )}
                    </div>
                  </div>
                )}

              {/* Auto Loan Portfolio details */}
              {details?.loan && details.module === "AUTO" && (
                <div className="txSection">
                  <div className="txSectionTitle">
                    <ShieldCheck size={14} /> Auto Loan Portfolio Context
                  </div>
                  <div className="txGrid threeCol">
                    <div className="txGridItem">
                      <span>Loan Amount</span>
                      <strong style={{ color: "#0f172a" }}>
                        {money(details.loan.loanAmount)}
                      </strong>
                    </div>
                    <div className="txGridItem">
                      <span>Interest Rate</span>
                      <strong>
                        {details.loan.interestRate}% (
                        {details.loan.interestType || "FLAT"})
                      </strong>
                    </div>
                    <div className="txGridItem">
                      <span>Tenure</span>
                      <strong>{details.loan.tenureMonths} Months</strong>
                    </div>
                    <div className="txGridItem">
                      <span>Loan Status</span>
                      <span className="statusPill active">
                        {details.loan.status}
                      </span>
                    </div>
                    <div className="txGridItem">
                      <span>Disbursed On</span>
                      <strong>{formatOnlyDate(details.loan.startDate)}</strong>
                    </div>
                    <div className="txGridItem">
                      <span>Maturity Date</span>
                      <strong>{formatOnlyDate(details.loan.endDate)}</strong>
                    </div>
                  </div>

                  {/* Loan Fees Details if present */}
                  {details.loan.feesDetails &&
                    Object.values(details.loan.feesDetails).some(
                      (v) => Number(v) > 0
                    ) && (
                      <div
                        style={{
                          marginTop: "12px",
                          paddingTop: "10px",
                          borderTop: "1px dashed #cbd5e1",
                        }}
                      >
                        <span
                          style={{
                            fontSize: "11px",
                            fontWeight: "700",
                            color: "#64748b",
                            textTransform: "uppercase",
                            letterSpacing: "0.4px",
                            display: "block",
                            marginBottom: "8px",
                          }}
                        >
                          Initial Loan Fees &amp; Deductions
                        </span>
                        <div className="txGrid threeCol">
                          {Number(details.loan.feesDetails.documentFee || 0) > 0 && (
                            <div className="txGridItem">
                              <span>Document Fee</span>
                              <strong>{money(details.loan.feesDetails.documentFee)}</strong>
                            </div>
                          )}
                          {Number(details.loan.feesDetails.hirePurchase || 0) > 0 && (
                            <div className="txGridItem">
                              <span>Hire Purchase</span>
                              <strong>{money(details.loan.feesDetails.hirePurchase)}</strong>
                            </div>
                          )}
                          {Number(details.loan.feesDetails.brokerageCustomer || 0) > 0 && (
                            <div className="txGridItem">
                              <span>Brokerage (Customer)</span>
                              <strong>{money(details.loan.feesDetails.brokerageCustomer)}</strong>
                            </div>
                          )}
                          {Number(details.loan.feesDetails.brokerageHand || 0) > 0 && (
                            <div className="txGridItem">
                              <span>Brokerage (Hand)</span>
                              <strong>{money(details.loan.feesDetails.brokerageHand)}</strong>
                            </div>
                          )}
                          {Number(details.loan.feesDetails.insurance || 0) > 0 && (
                            <div className="txGridItem">
                              <span>Insurance</span>
                              <strong>{money(details.loan.feesDetails.insurance)}</strong>
                            </div>
                          )}
                          {Number(details.loan.feesDetails.permit || 0) > 0 && (
                            <div className="txGridItem">
                              <span>Permit</span>
                              <strong>{money(details.loan.feesDetails.permit)}</strong>
                            </div>
                          )}
                          {Number(details.loan.feesDetails.taxAmount || 0) > 0 && (
                            <div className="txGridItem">
                              <span>Road Tax</span>
                              <strong>{money(details.loan.feesDetails.taxAmount)}</strong>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                </div>
              )}

              {/* Daily Loan details */}
              {details?.loan && details.module === "DAILY" && (
                <div className="txSection">
                  <div className="txSectionTitle">
                    <Activity size={14} /> Daily Finance Account Context
                  </div>
                  <div className="txGrid threeCol">
                    <div className="txGridItem">
                      <span>Gross Finance</span>
                      <strong style={{ color: "#0f172a" }}>
                        {money(details.loan.grossAmount)}
                      </strong>
                    </div>
                    <div className="txGridItem">
                      <span>Daily Agreed Due</span>
                      <strong style={{ color: "#059669" }}>
                        {money(details.loan.dailyDue)}/day
                      </strong>
                    </div>
                    <div className="txGridItem">
                      <span>Initial Deduction</span>
                      <strong>
                        {money(details.loan.initialDeduction)}
                      </strong>
                    </div>
                    <div className="txGridItem">
                      <span>Net Disbursed</span>
                      <strong>
                        {money(details.loan.netDisbursement)}
                      </strong>
                    </div>
                    <div className="txGridItem">
                      <span>Agreed Total</span>
                      <strong>{money(details.loan.agreedPayable)}</strong>
                    </div>
                    <div className="txGridItem">
                      <span>Account Status</span>
                      <span className="statusPill active">
                        {details.loan.status}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* Partner details */}
              {details?.partner && (
                <div className="txSection">
                  <div className="txSectionTitle">
                    <Users size={14} /> Partner Capital Profile
                  </div>
                  <div className="txGrid">
                    <div className="txGridItem">
                      <span>Partner Name</span>
                      <strong style={{ fontSize: "14px" }}>
                        {details.partner.partner_name || details.partner.name}
                      </strong>
                    </div>
                    <div className="txGridItem">
                      <span>Partner Status</span>
                      <span className="statusPill active">
                        {details.partner.partner_status ||
                          details.partner.status ||
                          "ACTIVE"}
                      </span>
                    </div>
                    <div className="txGridItem">
                      <span>Capital Transaction Type</span>
                      <strong>
                        {details.partner.transaction_type || "CONTRIBUTION"}
                      </strong>
                    </div>
                    <div className="txGridItem">
                      <span>Transaction Amount</span>
                      <strong style={{ color: "#059669" }}>
                        {money(details.partner.amount || record.amount)}
                      </strong>
                    </div>
                  </div>
                </div>
              )}

              {/* Expense details */}
              {details?.expense && (
                <div className="txSection">
                  <div className="txSectionTitle">
                    <Receipt size={14} /> Linked Business Expense
                  </div>
                  <div className="txGrid">
                    <div className="txGridItem">
                      <span>Expense Reason (Why)</span>
                      <strong style={{ fontSize: "14px" }}>
                        {details.expense.description}
                      </strong>
                    </div>
                    <div className="txGridItem">
                      <span>Category</span>
                      <span
                        className={`expenseCategoryPill ${
                          details.expense.category?.toLowerCase() || "general"
                        }`}
                      >
                        {details.expense.category || "GENERAL"}
                      </span>
                    </div>
                    <div className="txGridItem">
                      <span>Expense Subtype</span>
                      <strong>
                        {details.expense.expense_type || "GENERAL"}
                      </strong>
                    </div>
                    <div className="txGridItem">
                      <span>Amount</span>
                      <strong style={{ color: "#e11d48" }}>
                        {money(details.expense.amount)}
                      </strong>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Modal Footer */}
        <div
          className="modalActions"
          style={{
            marginTop: "18px",
            paddingTop: "14px",
            borderTop: "1px solid #e2e8f0",
            display: "flex",
            justifyContent: "flex-end",
          }}
        >
          <button type="button" className="secondaryBtn" onClick={close}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
