import React from "react";
import { Plus, Loader2 } from "lucide-react";
import { Empty, PhoneLink } from "./CommonComponents.jsx";
import { money, dateLabel } from "../services/dailyFinanceApi.js";

export default function DailyCustomers({
  customers = [],
  search = "",
  setSearch,
  status = "",
  setStatus,
  setShowAdd,
  openDetails,
  loadingDetailsId,
  onOpenCloseLoan,
  onOpenIncreaseLoan,
}) {
  return (
    <section className="content">
      <div className="intro">
        <div>
          <span className="overline">CUSTOMERS</span>
          <h2>Customer Loans ({customers.length})</h2>
          <p>
            Click a customer to open loan details and payment history.
          </p>
        </div>
        <button className="primary" onClick={() => setShowAdd(true)}>
          <Plus size={16} /> Add customer
        </button>
      </div>

      <div className="filterBar">
        <input
          placeholder="Search customer name"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />
        <select
          value={status}
          onChange={(event) => setStatus(event.target.value)}
        >
          <option value="">All statuses</option>
          <option value="ACTIVE">Active</option>
          <option value="COMPLETED">Completed</option>
        </select>
      </div>
      <div className="card tableWrap">
        <table>
          <thead>
            <tr>
              <th style={{ width: "50px" }}>S.No</th>
              <th style={{ textAlign: "center" }}>Finance date</th>
              <th>Customer</th>
              <th>Finance amount</th>
              <th>Interest</th>
              <th>Amount given</th>
              <th>Total return</th>
              <th>Collected</th>
              <th>Remaining</th>
              <th>Profit</th>
              <th>Status</th>
              <th style={{ textAlign: "center" }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {customers.map((customer, idx) => {
              const isActive = customer.status !== "COMPLETED" && customer.status !== "CANCELLED";
              const isThisLoading = loadingDetailsId === customer.customer_id;
              return (
                <tr
                  key={customer.finance_id}
                  onClick={() => openDetails(customer.customer_id, customer)}
                  className={`clickable ${isThisLoading ? "rowLoading" : ""}`}
                >
                  <td style={{ color: "#64748b", fontWeight: "600", width: "50px" }}>{idx + 1}</td>
                  <td style={{ textAlign: "center", whiteSpace: "nowrap" }}>{dateLabel(customer.finance_date)}</td>
                  <td>
                    <div style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}>
                      <b>{customer.customer_name}</b>
                      {isThisLoading && (
                        <Loader2
                          size={13}
                          style={{
                            color: "#0d9488",
                            animation: "autoSpin 0.75s linear infinite",
                          }}
                        />
                      )}
                    </div>
                    <small>
                      {customer.mobile_number ? (
                        <PhoneLink phone={customer.mobile_number} />
                      ) : (
                        customer.address || "No contact details"
                      )}
                    </small>
                  </td>
                  <td>{money(customer.gross_finance_amount)}</td>
                  <td>
                    {money(customer.initial_deduction)}{" "}
                    {customer.interest_type === "PERCENT" && (
                      <small>({customer.interest_value}%)</small>
                    )}
                  </td>
                  <td>{money(customer.net_disbursement)}</td>
                  <td>{money(customer.agreed_total_payable)}</td>
                  <td>{money(customer.total_collected)}</td>
                  <td className="redText">
                    {money(customer.outstanding_receivable)}
                  </td>
                  <td className="greenText">
                    {money(customer.initial_deduction)}
                  </td>
                  <td>
                    <span className={`tag ${customer.status.toLowerCase()}`}>
                      {customer.status}
                    </span>
                  </td>
                  <td style={{ textAlign: "center" }} onClick={(e) => e.stopPropagation()}>
                    <div style={{ display: "inline-flex", gap: "6px" }}>
                      {isActive && onOpenIncreaseLoan && (
                        <button
                          type="button"
                          className="partnerActionBtn add"
                          title="Increase loan amount"
                          onClick={() => onOpenIncreaseLoan(customer)}
                        >
                          + Top-Up
                        </button>
                      )}
                      {isActive && onOpenCloseLoan && (
                        <button
                          type="button"
                          className="partnerActionBtn withdraw"
                          title="Close loan early"
                          onClick={() => onOpenCloseLoan(customer)}
                        >
                          Close
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {!customers.length && <Empty text="No matching customers." />}
      </div>
    </section>
  );
}
