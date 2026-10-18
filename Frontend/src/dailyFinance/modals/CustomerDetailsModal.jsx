import React from "react";
import { X, TrendingUp, CheckCircle2, FileSpreadsheet } from "lucide-react";
import { Metric, Empty } from "../components/CommonComponents.jsx";
import { money, dateLabel } from "../services/dailyFinanceApi.js";
import { exportCustomerStatement } from "../services/dailyExportUtils.js";

export default function CustomerDetailsModal({
  data,
  close,
  editPayment,
  onOpenCloseLoan,
  onOpenIncreaseLoan,
}) {
  if (!data || !data.customer) return null;
  const customer = data.customer;
  const isActive = customer.status !== "COMPLETED" && customer.status !== "CANCELLED";

  const sortedCollections = React.useMemo(() => {
    return [...(data.collections || [])].sort((a, b) => {
      const da = new Date(a.collection_date || 0).getTime();
      const db = new Date(b.collection_date || 0).getTime();
      if (da !== db) return da - db;
      const ca = new Date(a.created_at || 0).getTime();
      const cb = new Date(b.created_at || 0).getTime();
      return ca - cb;
    });
  }, [data.collections]);

  return (
    <div
      className="modal"
      onClick={(event) => {
        if (event.target === event.currentTarget) close();
      }}
    >
      <div className="detailsCard" onClick={(event) => event.stopPropagation()}>
        <button className="close" onClick={close}>
          <X size={18} />
        </button>

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "12px", paddingRight: "40px" }}>
          <div>
            <span className="overline">CUSTOMER DETAILS</span>
            <h2>{customer.customer_name}</h2>
            <p>
              {customer.mobile_number ? (
                <a className="phoneLink" href={`tel:${customer.mobile_number}`}>
                  {customer.mobile_number}
                </a>
              ) : (
                "No phone"
              )}{" "}
              · {customer.address || "No address"} · Finance Date: {dateLabel(customer.finance_date)}
            </p>
          </div>

          {/* Quick Action Buttons for Loan Management & Excel Export */}
          <div style={{ display: "flex", gap: "8px", alignItems: "center", flexWrap: "wrap", marginTop: "4px" }}>
            <button
              type="button"
              className="iconTextButton"
              style={{
                background: "#f8fafc",
                color: "#0284c7",
                border: "1.5px solid #bae6fd",
                borderRadius: "9px",
                padding: "7px 14px",
                fontSize: "12.5px",
                fontWeight: "700",
                cursor: "pointer",
              }}
              onClick={() => exportCustomerStatement(customer, data.collections)}
              title="Download customer statement & loan details in Excel (.xlsx)"
            >
              <FileSpreadsheet size={15} /> Statement (Excel)
            </button>

            {isActive && onOpenIncreaseLoan && (
              <button
                type="button"
                className="iconTextButton"
                style={{
                  background: "#f0fdfa",
                  color: "#0f766e",
                  border: "1.5px solid #99f6e4",
                  borderRadius: "9px",
                  padding: "7px 14px",
                  fontSize: "12.5px",
                  fontWeight: "700",
                  cursor: "pointer",
                }}
                onClick={() => onOpenIncreaseLoan(customer)}
              >
                <TrendingUp size={15} /> Increase Loan
              </button>
            )}

            {isActive && onOpenCloseLoan && (
              <button
                type="button"
                className="iconTextButton"
                style={{
                  background: "#fff1f2",
                  color: "#be123c",
                  border: "1.5px solid #fecdd3",
                  borderRadius: "9px",
                  padding: "7px 14px",
                  fontSize: "12.5px",
                  fontWeight: "700",
                  cursor: "pointer",
                }}
                onClick={() => onOpenCloseLoan(customer)}
              >
                <CheckCircle2 size={15} /> Close Loan
              </button>
            )}
          </div>
        </div>
        <div className="detailMetricsContainer">
          <div className="detailGrid detailGridTop">
            <Metric
              title="Finance amount"
              value={customer.gross_finance_amount}
            />
            <Metric title="Interest" value={customer.initial_deduction} />
            <Metric title="Amount given" value={customer.net_disbursement} />
            <Metric title="Total return" value={customer.agreed_total_payable} />
          </div>
          <div className="detailGrid detailGridBottom">
            <Metric
              title="Collected"
              value={customer.total_collected}
              tone="green"
            />
            <Metric title="Remaining" value={customer.remaining} tone="orange" />
            <Metric
              title="Profit"
              value={customer.initial_deduction}
              tone="green"
            />
          </div>
        </div>
        <div className="card tableWrap">
          <div className="cardHead">
            <h3>Collection history</h3>
          </div>
          {data.isLoadingCollections ? (
            <div style={{ padding: "32px 20px", textAlign: "center", color: "#64748b" }}>
              <div
                className="inPageDataSpinner"
                style={{
                  margin: "0 auto 10px auto",
                  width: "32px",
                  height: "32px",
                  borderWidth: "3px",
                  borderTopColor: "#0d9488",
                }}
              />
              <p style={{ margin: 0, fontSize: "13px", fontWeight: "600", color: "#475569" }}>
                Loading payment history & transactions...
              </p>
            </div>
          ) : sortedCollections.length > 0 ? (
            <table>
              <thead>
                <tr>
                  <th style={{ width: "60px" }}>S.No</th>
                  <th>Date</th>
                  <th style={{ textAlign: "right" }}>Amount collected</th>
                  <th style={{ textAlign: "right" }}>Total collected</th>
                  <th style={{ textAlign: "right" }}>Remaining</th>
                  <th style={{ textAlign: "center", width: "80px" }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {sortedCollections.map((payment, idx) => (
                  <tr key={payment.payment_id}>
                    <td style={{ color: "#64748b", fontWeight: "600" }}>{idx + 1}</td>
                    <td>{dateLabel(payment.collection_date)}</td>
                    <td style={{ textAlign: "right", fontWeight: "700", color: "#059669" }}>
                      {money(payment.amount)}
                    </td>
                    <td style={{ textAlign: "right" }}>{money(payment.total_collected)}</td>
                    <td style={{ textAlign: "right" }} className="redText">{money(payment.remaining)}</td>
                    <td style={{ textAlign: "center" }}>
                      <button
                        className="payButton"
                        onClick={() =>
                          editPayment({
                            ...payment,
                            collectionDate: payment.collection_date,
                            amount: payment.amount,
                          })
                        }
                      >
                        Edit
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <Empty text="No collections recorded." />
          )}
        </div>
      </div>
    </div>
  );
}
