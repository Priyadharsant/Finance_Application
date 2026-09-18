import React from "react";
import { Plus, Clock3, CarFront, Download, Calendar, X, RotateCcw } from "lucide-react";
import PhoneLink from "../common/PhoneLink";
import { money } from "../services/autoFinanceApi";

export default function AutoVehicleLoans({
  overview = {},
  loans = [],
  vehiclePageLoans = [],
  loanTabFilter,
  setLoanTabFilter,
  loanMonthFilter = "",
  setLoanMonthFilter,
  search,
  setSearch,
  vehicleTypeFilter,
  setVehicleTypeFilter,
  setShowCreateLoan,
  openLoanDetails,
  handleExportVehicleLoans,
}) {
  const isFiltered =
    loanTabFilter !== "ALL" ||
    Boolean(loanMonthFilter) ||
    vehicleTypeFilter !== "ALL" ||
    Boolean(search);

  const handleResetFilters = () => {
    setLoanTabFilter("ALL");
    setLoanMonthFilter?.("");
    setVehicleTypeFilter("ALL");
    setSearch("");
  };

  const filteredDisbursed = vehiclePageLoans.reduce((sum, l) => sum + Number(l.loan_amount || 0), 0);
  const filteredCollected = vehiclePageLoans.reduce((sum, l) => sum + Number(l.total_paid || 0), 0);
  const filteredActiveCount = vehiclePageLoans.filter((l) => l.status === "ACTIVE").length;
  const filteredCompletedCount = vehiclePageLoans.filter((l) => l.status === "COMPLETED").length;
  const filteredRecoveryRate = filteredDisbursed > 0 ? Math.round((filteredCollected / filteredDisbursed) * 100) : 0;
  const filteredRemaining = Math.max(0, filteredDisbursed - filteredCollected);

  return (
    <section className="content">
      <div className="intro">
        <div>
          <span className="overline autoBadgeTag">VEHICLE LOANS PORTFOLIO</span>
          <h2>Vehicle Loans &amp; Registered Assets</h2>
          <p>
            Comprehensive directory of all active and completed vehicle loan agreements, registered vehicles, and repayment status.
          </p>
        </div>
        <div style={{ display: "flex", gap: "10px", flexWrap: "wrap", alignItems: "center" }}>
          <button
            className="secondary autoBtn"
            style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}
            onClick={handleExportVehicleLoans}
            title="Export Filtered Vehicle Loans to Excel"
          >
            <Download size={15} /> Export Report (Excel)
            {vehiclePageLoans.length < loans.length ? ` (${vehiclePageLoans.length})` : ` (${loans.length})`}
          </button>
          <button
            className="primary autoBtn"
            onClick={() => setShowCreateLoan(true)}
          >
            <Plus size={16} /> Create Vehicle Loan
          </button>
        </div>
      </div>

      {/* DYNAMIC GRID ANALYTICS CARDS (BASED ON ACTIVE FILTERS) */}
      <div className="metricGrid" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", marginBottom: "22px" }}>
        <div className="metric autoMetric blue">
          <span>{isFiltered ? "Filtered Disbursed" : "Total Disbursed"}</span>
          <b>{money(filteredDisbursed)}</b>
          <small style={{ color: "#64748b", fontSize: "11.5px", display: "block", marginTop: "4px" }}>
            {isFiltered ? `${vehiclePageLoans.length} filtered / ${loans.length} total` : `${loans.length} Total Loans`}
          </small>
        </div>
        <div className="metric autoMetric green">
          <span>Active Loans</span>
          <b>{filteredActiveCount}</b>
          <small style={{ color: "#059669", fontSize: "11.5px", fontWeight: 600, display: "block", marginTop: "4px" }}>
            {isFiltered ? `${filteredActiveCount} of ${vehiclePageLoans.length} filtered` : "Ongoing Repayments"}
          </small>
        </div>
        <div className="metric autoMetric teal">
          <span>Completed Loans</span>
          <b>{filteredCompletedCount}</b>
          <small style={{ color: "#0f766e", fontSize: "11.5px", fontWeight: 600, display: "block", marginTop: "4px" }}>
            {isFiltered ? `${filteredCompletedCount} of ${vehiclePageLoans.length} filtered` : "Fully Settled"}
          </small>
        </div>
        <div className="metric autoMetric orange">
          <span>{isFiltered ? "Filtered Collected" : "Total EMI Collected"}</span>
          <b>{money(filteredCollected)}</b>
          <small style={{ color: "#d97706", fontSize: "11.5px", fontWeight: 600, display: "block", marginTop: "4px" }}>
            {filteredRecoveryRate}% Recovered
          </small>
        </div>
        <div className="metric autoMetric red">
          <span>{isFiltered ? "Filtered Remaining" : "Remaining Portfolio"}</span>
          <b>{money(filteredRemaining)}</b>
          <small style={{ color: "#dc2626", fontSize: "11.5px", fontWeight: 600, display: "block", marginTop: "4px" }}>
            Outstanding Balance
          </small>
        </div>
      </div>

      {/* ORGANIZED FILTER BAR: TABS + MONTH CALENDAR + SEARCH + VEHICLE TYPE */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "12px", marginBottom: "16px" }}>
        {/* Left: Status Switcher Tabs */}
        <div style={{ display: "flex", gap: "4px", background: "#f1f5f9", padding: "4px", borderRadius: "10px" }}>
          <button
            type="button"
            style={{
              padding: "7px 16px",
              border: "none",
              borderRadius: "8px",
              fontWeight: 700,
              fontSize: "12.5px",
              cursor: "pointer",
              background: loanTabFilter === "ALL" ? "#ffffff" : "transparent",
              color: loanTabFilter === "ALL" ? "#0f172a" : "#64748b",
              boxShadow: loanTabFilter === "ALL" ? "0 1px 4px rgba(0,0,0,0.08)" : "none",
              transition: "all 0.15s ease"
            }}
            onClick={() => setLoanTabFilter("ALL")}
          >
            All Loans ({loans.length})
          </button>
          <button
            type="button"
            style={{
              padding: "7px 16px",
              border: "none",
              borderRadius: "8px",
              fontWeight: 700,
              fontSize: "12.5px",
              cursor: "pointer",
              background: loanTabFilter === "ACTIVE" ? "#ffffff" : "transparent",
              color: loanTabFilter === "ACTIVE" ? "#059669" : "#64748b",
              boxShadow: loanTabFilter === "ACTIVE" ? "0 1px 4px rgba(0,0,0,0.08)" : "none",
              transition: "all 0.15s ease"
            }}
            onClick={() => setLoanTabFilter("ACTIVE")}
          >
            Active ({loans.filter(l => l.status === "ACTIVE").length})
          </button>
          <button
            type="button"
            style={{
              padding: "7px 16px",
              border: "none",
              borderRadius: "8px",
              fontWeight: 700,
              fontSize: "12.5px",
              cursor: "pointer",
              background: loanTabFilter === "COMPLETED" ? "#ffffff" : "transparent",
              color: loanTabFilter === "COMPLETED" ? "#2563eb" : "#64748b",
              boxShadow: loanTabFilter === "COMPLETED" ? "0 1px 4px rgba(0,0,0,0.08)" : "none",
              transition: "all 0.15s ease"
            }}
            onClick={() => setLoanTabFilter("COMPLETED")}
          >
            Completed ({loans.filter(l => l.status === "COMPLETED").length})
          </button>
        </div>

        {/* Right: Month Calendar, Search, Vehicle Type, Reset */}
        <div style={{ display: "flex", gap: "10px", alignItems: "center", flexWrap: "wrap" }}>
          {/* Month Calendar Picker */}
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
            title="Filter by Start Month Calendar"
          >
            <Calendar size={15} color="#0f766e" />
            <input
              type="month"
              value={loanMonthFilter}
              onChange={(e) => setLoanMonthFilter(e.target.value)}
              style={{
                border: "none",
                outline: "none",
                fontSize: "12.5px",
                color: "#1e293b",
                fontWeight: "500",
                background: "transparent",
                cursor: "pointer",
              }}
              title="Click calendar icon to filter by loan start month"
            />
            {loanMonthFilter && (
              <button
                type="button"
                onClick={() => setLoanMonthFilter("")}
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

          <div style={{ minWidth: "220px", maxWidth: "340px", flex: 1 }}>
            <input
              placeholder="Search customer, phone, vehicle, reg no..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ width: "100%", padding: "7px 12px", borderRadius: "8px", border: "1px solid #cbd5e1", fontSize: "12.5px", outline: "none" }}
            />
          </div>

          <select
            value={vehicleTypeFilter}
            onChange={(e) => setVehicleTypeFilter(e.target.value)}
            style={{ padding: "7px 12px", borderRadius: "8px", border: "1px solid #cbd5e1", fontSize: "12.5px", background: "#ffffff", fontWeight: 600, color: "#334155" }}
          >
            <option value="ALL">All Vehicle Types</option>
            <option value="TWO_WHEELER">Two Wheeler</option>
            <option value="CAR">Car</option>
            <option value="COMMERCIAL">Commercial</option>
          </select>

          {isFiltered && (
            <button
              type="button"
              className="secondary autoBtn"
              style={{ padding: "6px 12px", fontSize: "12px", display: "inline-flex", alignItems: "center", gap: "4px" }}
              onClick={handleResetFilters}
              title="Reset all filters"
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
              <th>Customer</th>
              <th>Vehicle &amp; Reg No</th>
              <th>Loan Details</th>
              <th>Collections</th>
              <th>Status</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {vehiclePageLoans.map((l) => (
              <tr
                key={l.id}
                className="clickable"
                onClick={() => openLoanDetails(l.id)}
              >
                <td>
                  <div className="customerNameCell">
                    <div>
                      <b>
                        {l.first_name} {l.last_name}
                      </b>
                      <small>
                        {l.phone ? (
                          <PhoneLink phone={l.phone} icon />
                        ) : (
                          l.customer_code
                        )}
                      </small>
                    </div>
                  </div>
                </td>
                <td>
                  <b>
                    {l.make || "Vehicle"} {l.model}
                  </b>
                  <small
                    className="autoRegNo"
                    style={{ display: "inline-block", marginTop: "3px" }}
                  >
                    {l.registration_number || l.vehicle_type}
                  </small>
                </td>
                <td>
                  <b>{money(l.loan_amount)}</b>
                  <small style={{ display: "block", color: "#64748b", marginTop: "2px" }}>
                    {l.interest_rate}% ({l.interest_type || "FLAT"}) • {l.tenure_months} Mo
                  </small>
                </td>
                <td>
                  <b className="greenText">{money(l.total_paid)}</b>
                  <small style={{ display: "block", marginTop: "3px" }}>
                    <span
                      className="tag"
                      style={{
                        fontSize: "10.5px",
                        padding: "2px 6px",
                        background:
                          l.status === "COMPLETED"
                            ? "#ecfdf5"
                            : Number(l.pending_dues_count || 0) > 0
                              ? "#fff7ed"
                              : "#ecfdf5",
                        color:
                          l.status === "COMPLETED"
                            ? "#047857"
                            : Number(l.pending_dues_count || 0) > 0
                              ? "#c2410c"
                              : "#047857",
                        border:
                          l.status === "COMPLETED"
                            ? "1px solid #d1fae5"
                            : Number(l.pending_dues_count || 0) > 0
                              ? "1px solid #ffedd5"
                              : "1px solid #d1fae5",
                      }}
                    >
                      <Clock3 size={11} style={{ verticalAlign: "middle", marginRight: "2px" }} />
                      {l.paid_dues_count || 0} / {l.total_dues_count || l.tenure_months} Paid
                    </span>
                  </small>
                </td>
                <td>
                  <span
                    className="tag"
                    style={{
                      background: l.status === "ACTIVE" ? "#ecfdf5" : "#eff6ff",
                      color: l.status === "ACTIVE" ? "#047857" : "#1d4ed8",
                      border: `1px solid ${l.status === "ACTIVE" ? "#d1fae5" : "#bfdbfe"}`,
                      fontWeight: 700,
                    }}
                  >
                    {l.status || "ACTIVE"}
                  </span>
                </td>
                <td>
                  <button
                    className="payButton"
                    style={{
                      background: l.status === "ACTIVE" ? "#059669" : "#3b82f6",
                      borderColor: l.status === "ACTIVE" ? "#059669" : "#3b82f6",
                      color: "#fff",
                      fontWeight: 700,
                    }}
                    onClick={(e) => {
                      e.stopPropagation();
                      openLoanDetails(l.id);
                    }}
                  >
                    Details
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!vehiclePageLoans.length && (
          <div className="empty">
            <div>
              <CarFront size={28} />
            </div>
            <b>No vehicle loans found matching the criteria.</b>
          </div>
        )}
      </div>
    </section>
  );
}
