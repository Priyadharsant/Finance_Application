import React from "react";
import { UserRound, Calendar, X, RotateCcw, Download } from "lucide-react";

export default function AutoCustomers({
  filteredCustomers = [],
  customerMonthFilter = "",
  setCustomerMonthFilter,
  search,
  setSearch,
  handleExportCustomers,
  setSelectedCustomer,
}) {
  const isFiltered = Boolean(customerMonthFilter) || Boolean(search);

  const handleResetFilters = () => {
    setCustomerMonthFilter?.("");
    setSearch("");
  };

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
          alignItems: "center",
          flexWrap: "wrap",
          gap: "10px",
          marginBottom: "16px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "10px", flex: 1, minWidth: "280px", flexWrap: "wrap" }}>
          {/* Month Calendar Picker (Joined Month) */}
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
              background: "#ffffff",
              padding: "4px 10px",
              borderRadius: "8px",
              border: "1px solid #cbd5e1",
            }}
            title="Filter by Join Month Calendar"
          >
            <Calendar size={15} color="#0f766e" />
            <input
              type="month"
              value={customerMonthFilter}
              onChange={(e) => setCustomerMonthFilter?.(e.target.value)}
              style={{
                border: "none",
                outline: "none",
                fontSize: "12.5px",
                color: "#1e293b",
                fontWeight: "500",
                background: "transparent",
                cursor: "pointer",
              }}
              title="Filter customers by registration month"
            />
            {customerMonthFilter && (
              <button
                type="button"
                onClick={() => setCustomerMonthFilter?.("")}
                style={{
                  border: "none",
                  background: "transparent",
                  color: "#94a3b8",
                  cursor: "pointer",
                  padding: "0 2px",
                }}
                title="Clear Month Filter"
              >
                <X size={13} />
              </button>
            )}
          </div>

          <div style={{ flex: 1, minWidth: "200px" }}>
            <input
              style={{ width: "100%", padding: "7px 12px", borderRadius: "8px", border: "1px solid #cbd5e1", fontSize: "12.5px", outline: "none" }}
              placeholder="Search by customer name, phone, code..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          {isFiltered && (
            <button
              type="button"
              className="secondary autoBtn"
              style={{ padding: "6px 12px", fontSize: "12px", display: "inline-flex", alignItems: "center", gap: "4px" }}
              onClick={handleResetFilters}
              title="Reset filters"
            >
              <RotateCcw size={12} /> Reset
            </button>
          )}
        </div>

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
