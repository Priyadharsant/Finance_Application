import React from "react";
import { UserRound } from "lucide-react";

export default function AutoCustomers({
  filteredCustomers = [],
  search,
  setSearch,
  handleExportCustomers,
  setSelectedCustomer,
}) {
  return (
    <section className="content">
      <div className="intro">
        <div>
          <span className="overline autoBadgeTag">CUSTOMERS</span>
          <h2>Auto Finance Customer Directory</h2>
          <p>Manage customer profiles, contact info, and loan histories.</p>
        </div>
      </div>

      <div
        className="filterBar"
        style={{
          display: "flex",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: "10px",
        }}
      >
        <input
          style={{ flex: 1, minWidth: "250px" }}
          placeholder="Search by customer name, phone, code..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <button
          className="primary autoBtn"
          style={{ background: "#059669", borderColor: "#059669" }}
          onClick={handleExportCustomers}
        >
          Export Customers (Excel)
        </button>
      </div>

      <div className="card tableWrap">
        <table>
          <thead>
            <tr>
              <th>Code</th>
              <th>Customer Name</th>
              <th>Phone Number</th>
              <th>Email</th>
              <th>City / State</th>
              <th>Address</th>
            </tr>
          </thead>
          <tbody>
            {filteredCustomers.map((c) => (
              <tr
                key={c.id}
                className="clickable"
                onClick={() => setSelectedCustomer(c)}
              >
                <td>
                  <span className="tag autoTag">{c.customer_code}</span>
                </td>
                <td>
                  <div className="customerNameCell">
                    <b>
                      {c.first_name} {c.last_name}
                    </b>
                  </div>
                </td>
                <td>
                  {c.phone ? (
                    <a
                      className="phoneLink"
                      href={`tel:${c.phone}`}
                      onClick={(event) => event.stopPropagation()}
                    >
                      {c.phone}
                    </a>
                  ) : (
                    "—"
                  )}
                </td>
                <td>{c.email || "—"}</td>
                <td>{c.city ? `${c.city}, ${c.state || ""}` : "—"}</td>
                <td>
                  <small>{c.address || "—"}</small>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!filteredCustomers.length && (
          <div className="empty">
            <div>
              <UserRound size={28} />
            </div>
            <b>No customers found matching search.</b>
          </div>
        )}
      </div>
    </section>
  );
}
