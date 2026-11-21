import React, { useState } from "react";
import { Plus, Clock3, CarFront, Download, Calendar, X, RotateCcw, FileSpreadsheet } from "lucide-react";
import PhoneLink from "../common/PhoneLink";
import { apiCall, money, dateLabel } from "../services/autoFinanceApi";
import { exportAutoMonthlyCollectionReport } from "../../globalCapital/services/globalCapitalExportUtils";
import MonthFilterModal from "../../components/MonthFilterModal";

export default function AutoVehicleLoans({
  overview = {},
  loans = [],
  vehiclePageLoans = [],
  loanSerialById = new Map(),
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
  const [showMonthModal, setShowMonthModal] = useState(false);

  const handleExportMonthlyCollections = async (selectedMonth) => {
    const response = await apiCall(`/loans/reports/monthly?month=${encodeURIComponent(selectedMonth)}`);
    const reportData = {
      autoFinance: {
        loans,
        collections: (response.data || []).map((payment) => ({
          ...payment,
          amount: payment.amount_paid,
          amount_paid: payment.amount_paid,
        })),
      },
    };
    exportAutoMonthlyCollectionReport(reportData, {}, selectedMonth);
  };

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
  const filteredLoanRepayments = vehiclePageLoans.reduce((sum, l) => sum + Number(l.total_paid || 0), 0);
  const filteredFineCollected = vehiclePageLoans.reduce((sum, l) => sum + Number(l.total_fine_paid || 0), 0);
  const filteredCollected = filteredLoanRepayments + filteredFineCollected;
  const filteredActiveCount = vehiclePageLoans.filter((l) => l.status === "ACTIVE").length;
  const filteredCompletedCount = vehiclePageLoans.filter((l) => l.status === "COMPLETED").length;
  
  // Total contractual expected (Gross = Principal + Scheduled Interest) as in Dashboard Analytics
  const filteredGrossExpected = vehiclePageLoans.reduce((sum, l) => {
    const gross = Number(
      l.agreed_total_payable ?? l.total_payable ??
      (Number(l.loan_amount || 0) + Number(l.total_interest || 0))
    );
    return sum + gross;
  }, 0);
  const filteredRecoveryRate = filteredGrossExpected > 0 ? Math.round((filteredLoanRepayments / filteredGrossExpected) * 100) : (filteredDisbursed > 0 ? Math.round((filteredLoanRepayments / filteredDisbursed) * 100) : 0);
  const filteredRemaining = Math.max(0, filteredGrossExpected - filteredLoanRepayments);


  return (
    <section className="content autoModulePage autoVehicleLoansPage">
      <div className="autoModuleHero">
        <div>
          <span className="overline autoBadgeTag">VEHICLE LOANS</span>
          <h2>Vehicle Loans</h2>
          <p>
            All active and completed vehicle loans and repayment details.
          </p>
        </div>
        <div className="autoModuleHeroActions">
          <button
            type="button"
            className="unifiedReportBtn"
            onClick={() => setShowMonthModal(true)}
            title="Download Monthly Collections Report (.xlsx)"
          >
            <FileSpreadsheet size={15} /> Monthly Collection Report
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
      <div className="metricGrid autoVehicleMetrics" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", marginBottom: "22px" }}>
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
        <div className="metric autoMetric green">
          <span>{isFiltered ? "Filtered Collected" : "Total Collected"}</span>
          <b>{money(filteredCollected)}</b>
          <small style={{ color: "#047857", fontSize: "11.5px", fontWeight: 600, display: "block", marginTop: "4px" }}>
            {filteredRecoveryRate}% Recovered
          </small>
          {filteredFineCollected > 0 && <small style={{ color: "#0f766e", fontSize: "11px", fontWeight: 650, display: "block", marginTop: "3px" }}>
            Includes {money(filteredFineCollected)} in fines
          </small>}
        </div>
        <div className="metric autoMetric teal">
          <span>Fine Collected</span>
          <b>{money(filteredFineCollected)}</b>
          <small style={{ color: "#0f766e", fontSize: "11.5px", fontWeight: 600, display: "block", marginTop: "4px" }}>
            {vehiclePageLoans.filter((loan) => Number(loan.total_fine_paid || 0) > 0).length} loans with fines
          </small>
        </div>
        <div className="metric autoMetric red">
          <span>{isFiltered ? "Filtered Remaining" : "Total Balance Pending"}</span>
          <b>{money(filteredRemaining)}</b>
          <small style={{ color: "#dc2626", fontSize: "11.5px", fontWeight: 600, display: "block", marginTop: "4px" }}>
            Outstanding Balance
          </small>
        </div>
      </div>

      {/* ORGANIZED FILTER BAR: TABS + MONTH CALENDAR + SEARCH + VEHICLE TYPE */}
      <div className="autoLoansToolbar">
        {/* Left: Status Switcher Tabs */}
        <div className="autoLoanTabs" role="tablist" aria-label="Filter vehicle loans by status">
          <button
            type="button"
            className={loanTabFilter === "ALL" ? "active" : ""}
            role="tab" aria-selected={loanTabFilter === "ALL"}
            onClick={() => setLoanTabFilter("ALL")}
          >
            All Loans ({loans.length})
          </button>
          <button
            type="button"
            className={loanTabFilter === "ACTIVE" ? "active" : ""}
            role="tab" aria-selected={loanTabFilter === "ACTIVE"}
            onClick={() => setLoanTabFilter("ACTIVE")}
          >
            Active ({loans.filter(l => l.status === "ACTIVE").length})
          </button>
          <button
            type="button"
            className={loanTabFilter === "COMPLETED" ? "active" : ""}
            role="tab" aria-selected={loanTabFilter === "COMPLETED"}
            onClick={() => setLoanTabFilter("COMPLETED")}
          >
            Completed ({loans.filter(l => l.status === "COMPLETED").length})
          </button>
        </div>

        {/* Right: Month Calendar, Search, Vehicle Type, Reset */}
        <div className="autoLoanFilters">
          {/* Month Calendar Picker */}
          <div
            className="autoLoanMonth"
            title="Filter by Start Month Calendar"
          >
            <Calendar size={15} color="#0f766e" />
            <input
              type="month"
              value={loanMonthFilter}
              onChange={(e) => setLoanMonthFilter(e.target.value)}
              className="autoLoanMonthInput"
              title="Click calendar icon to filter by loan start month"
            />
            {loanMonthFilter && (
              <button
                type="button"
                onClick={() => setLoanMonthFilter("")}
                className="autoClearIconBtn"
                title="Clear Month Filter"
              >
                <X size={13} />
              </button>
            )}
          </div>

          <div className="autoLoanSearchWrap">
            <input
              placeholder="Search name, phone, customer/loan ID, vehicle, reg no, date..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="autoLoanSearchInput"
            />
          </div>

          <select
            value={vehicleTypeFilter}
            onChange={(e) => setVehicleTypeFilter(e.target.value)}
            className="autoLoanTypeSelect"
          >
            <option value="ALL">All Vehicle Types</option>
            <option value="TWO_WHEELER">Two Wheeler</option>
            <option value="THREE_WHEELER">Three Wheeler</option>
            <option value="CAR">Car</option>
            <option value="COMMERCIAL">Commercial</option>
            <option value="PICKUP">Pickup</option>
            <option value="TRUCK">Truck</option>
            <option value="BUS">Bus</option>
            <option value="TRACTOR">Tractor</option>
            <option value="VAN">Van / Minibus</option>
            <option value="OTHER">Other</option>
          </select>

          {isFiltered && (
            <button
              type="button"
              className="autoSecondaryBtn"
              onClick={handleResetFilters}
              title="Reset all filters"
            >
              <RotateCcw size={12} /> Reset
            </button>
          )}
        </div>
      </div>

      <div className="card tableWrap autoLoansTableCard">
        <table>
          <thead>
            <tr>
              <th style={{ width: "50px" }}>S.No</th>
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
                <td style={{ color: "#64748b", fontWeight: "600", width: "50px" }}>{loanSerialById.get(String(l.id)) || "—"}</td>
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
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-start", gap: "3px", marginTop: "3px" }}>
                    <small style={{ display: "block", color: "#64748b", lineHeight: 1.35 }}>
                      {l.interest_rate}% ({l.interest_type || "FLAT"}) • {l.tenure_months} Mo
                    </small>
                    <small style={{ display: "block", color: "#64748b", lineHeight: 1.35 }}>
                      Interest amount: {money(l.total_interest)}
                    </small>
                  </div>
                </td>
                <td>
                  <b className="greenText">{money(Number(l.total_paid || 0) + Number(l.total_fine_paid || 0))}</b>
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-start", gap: "4px", marginTop: "5px" }}>
                    <small style={{ display: "flex", alignItems: "center", gap: "8px", color: "#64748b", lineHeight: 1.2, whiteSpace: "nowrap" }}>
                      {Number(l.total_fine_paid || 0) > 0 && <span style={{ color: "#a16207", fontWeight: 650 }}>Fine: {money(l.total_fine_paid)}</span>}
                      <span>Last collected: {l.last_collected_date ? dateLabel(l.last_collected_date) : "—"}</span>
                    </small>
                    <small style={{ color: "#64748b", lineHeight: 1.2 }}>
                      <span style={{ display: "inline-flex", alignItems: "center", gap: "4px", padding: "3px 7px", borderRadius: "6px", background: Number(l.pending_dues_count || 0) > 0 ? "#fff7ed" : "#ecfdf5", color: Number(l.pending_dues_count || 0) > 0 ? "#c2410c" : "#047857", fontWeight: 700 }}>
                        <Clock3 size={11} /> {l.pending_dues_count || 0} Pending
                      </span>
                    </small>
                  </div>
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


      <MonthFilterModal
        isOpen={showMonthModal}
        onClose={() => setShowMonthModal(false)}
        onExport={handleExportMonthlyCollections}
        title="Auto Monthly Collections Report"
        themeColor="#0284c7"
      />
    </section>
  );
}
