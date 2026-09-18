import React from "react";
import { Plus, FileSpreadsheet } from "lucide-react";
import { Empty, PhoneLink } from "./CommonComponents.jsx";
import { money } from "../services/dailyFinanceApi.js";
import { exportTotalDailyPortfolio } from "../services/dailyExportUtils.js";

export default function DailyCustomers({
  customers = [],
  search = "",
  setSearch,
  status = "",
  setStatus,
  setShowAdd,
  openDetails,
  onOpenCloseLoan,
  onOpenIncreaseLoan,
}) {
  return (
    <section className="content">
      <div className="intro">
        <div>
          <span className="overline">CUSTOMERS</span>
          <h2>Customer and finance records</h2>
          <p>
            Click a customer to open the complete finance and collection
            history.
          </p>
        </div>
        <button className="primary" onClick={() => setShowAdd(true)}>
          <Plus size={16} /> Add customer
        </button>
      </div>

      {/* DYNAMIC GRID ANALYTICS CARDS (BASED ON FILTERS) */}
      <div className="metricGrid" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", marginBottom: "18px" }}>
        <div className="metric autoMetric blue">
          <span>Filtered Customers</span>
          <b>{customers.length}</b>
          <small style={{ color: "#64748b", fontSize: "11.5px", marginTop: "4px", display: "block" }}>
            {status ? `Status: ${status}` : "All Active & Completed"}
          </small>
        </div>
        <div className="metric autoMetric green">
          <span>Total Disbursed</span>
          <b>{money(customers.reduce((s, c) => s + Number(c.net_disbursement || c.finance_amount || 0), 0))}</b>
          <small style={{ color: "#059669", fontSize: "11.5px", fontWeight: 600, marginTop: "4px", display: "block" }}>
            Principal deployed
          </small>
        </div>
        <div className="metric autoMetric teal">
          <span>Total Collected</span>
          <b>{money(customers.reduce((s, c) => s + Number(c.total_collected || 0), 0))}</b>
          <small style={{ color: "#0f766e", fontSize: "11.5px", fontWeight: 600, marginTop: "4px", display: "block" }}>
            Collections to date
          </small>
        </div>
        <div className="metric autoMetric red">
          <span>Total Remaining</span>
          <b>{money(customers.reduce((s, c) => s + Number(c.balance_amount || 0), 0))}</b>
          <small style={{ color: "#dc2626", fontSize: "11.5px", fontWeight: 600, marginTop: "4px", display: "block" }}>
            Outstanding balance
          </small>
        </div>
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
        <button
          type="button"
          className="iconTextButton"
          style={{
            background: "#059669",
            color: "#ffffff",
            border: 0,
            borderRadius: "8px",
            padding: "10px 15px",
            fontSize: "13px",
            fontWeight: "700",
            cursor: "pointer",
            marginLeft: "auto",
          }}
          onClick={() => exportTotalDailyPortfolio(customers)}
          title="Export current customer accounts to Excel (.xlsx)"
        >
          <FileSpreadsheet size={15} /> Export (Excel)
        </button>
      </div>
      <div className="card tableWrap">
        <table>
          <thead>
            <tr>
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
            {customers.map((customer) => {
              const isActive = customer.status !== "COMPLETED" && customer.status !== "CANCELLED";
              return (
                <tr
                  key={customer.finance_id}
                  onClick={() => openDetails(customer.customer_id)}
                  className="clickable"
                >
                  <td>
                    <b>{customer.customer_name}</b>
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
                      {onOpenIncreaseLoan && (
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
