import React from "react";
import { Plus } from "lucide-react";
import { Metric, Empty, PhoneLink } from "./CommonComponents.jsx";
import { money, dateLabel } from "../services/dailyFinanceApi.js";

export default function DailyDashboard({
  position = {},
  customers = [],
  recent = [],
  setPage,
  openDetails,
}) {
  return (
    <section className="content">
      <div className="intro">
        <div>
          <span className="overline">OVERVIEW</span>
          <h2>Business position</h2>
          <p>Everything you need to understand today’s finance position.</p>
        </div>
        <button className="primary" onClick={() => setPage("Customers")}>
          <Plus size={16} /> Add customer
        </button>
      </div>
      <div className="metricGrid">
        <Metric
          title="Total finance amount"
          value={position.total_finance_amount}
        />
        <Metric title="Amount given" value={position.disbursed} />
        <Metric
          title="Total to return"
          value={
            Number(position.receivable || 0) + Number(position.collected || 0)
          }
          tone="orange"
        />
        <Metric
          title="Total collected"
          value={position.collected}
          tone="green"
        />
        <Metric
          title="Total remaining"
          value={position.receivable}
          tone="orange"
        />
        <Metric title="Total profit" value={position.profit} tone="green" />
        <Metric
          title="Active customers"
          value={position.active_accounts}
          count
        />
        <Metric
          title="Completed customers"
          value={position.completed_accounts}
          count
        />
      </div>
      <div className="dashboardGrid">
        <div className="card tableWrap">
          <div className="cardHead">
            <div>
              <h3>Customer position</h3>
              <p>Active and completed finances from PostgreSQL.</p>
            </div>
          </div>
          <table>
            <thead>
              <tr>
                <th>Customer</th>
                <th>Amount given</th>
                <th>Total return</th>
                <th>Collected</th>
                <th>Remaining</th>
                <th>Profit</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {customers.map((customer) => (
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
                </tr>
              ))}
            </tbody>
          </table>
          {!customers.length && <Empty text="No customers yet." />}
        </div>
        <div className="card recentCard">
          <div className="cardHead">
            <h3>Today’s collection</h3>
            <p>
              {money(position.today_collected)} received on the selected date.
            </p>
          </div>
          {recent.slice(0, 8).map((payment) => (
            <div className="recentRow" key={payment.payment_id}>
              <span>{payment.customer_name}</span>
              <b>{money(payment.amount)}</b>
              <small>{dateLabel(payment.collection_date)}</small>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
