import React, { useEffect, useState, useMemo } from "react";
import { apiCall } from "./services/autoFinanceApi";
import {
  exportToExcel,
  exportTotalPortfolio,
  exportCustomersList,
  exportIndividualLoan,
} from "./services/exportUtils";

// Modals
import AddLoanSchemeModal from "./modals/AddLoanSchemeModal";
import CustomerDetailsModal from "./modals/CustomerDetailsModal";
import CreateLoanModal from "./modals/CreateLoanModal";
import LoanDetailsModal from "./modals/LoanDetailsModal";
import PayEmiModal from "./modals/PayEmiModal";
import CloseLoanModal from "./modals/CloseLoanModal";

// Views
import AutoDashboard from "./components/AutoDashboard";
import AutoCustomers from "./components/AutoCustomers";
import AutoLoanSchemes from "./components/AutoLoanSchemes";
import AutoVehicleLoans from "./components/AutoVehicleLoans";
import AutoReports from "./components/AutoReports";

export default function AutoFinanceView({ activeMenu, setNotice }) {
  const [dashboardData, setDashboardData] = useState({
    overview: {},
    recentLoans: [],
  });
  const [customers, setCustomers] = useState([]);
  const [loanTypes, setLoanTypes] = useState([]);
  const [loans, setLoans] = useState([]);
  const [selectedLoan, setSelectedLoan] = useState(null);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [loading, setLoading] = useState(false);
  const [reportMonth, setReportMonth] = useState(
    new Date().toISOString().slice(0, 7)
  );

  // Modals
  const [showAddLoanType, setShowAddLoanType] = useState(false);
  const [showCreateLoan, setShowCreateLoan] = useState(false);
  const [payEmiModal, setPayEmiModal] = useState(null);
  const [closeLoanModal, setCloseLoanModal] = useState(null);

  // Form states
  const [typeForm, setTypeForm] = useState({
    name: "",
    interestType: "FLAT",
    baseInterestRate: "12",
    defaultTenureMonths: "12",
  });

  const [loanForm, setLoanForm] = useState({
    customerId: "",
    firstName: "",
    lastName: "",
    phone: "",
    email: "",
    city: "",
    state: "",
    address: "",
    loanTypeId: "",
    interestType: "FLAT",
    loanAmount: "",
    interestRate: "12",
    tenureMonths: "12",
    startDate: new Date().toISOString().slice(0, 10),
    vehicleType: "TWO_WHEELER",
    make: "",
    model: "",
    year: new Date().getFullYear(),
    registrationNumber: "",
    chassisNumber: "",
    engineNumber: "",
    incomeDue: 0,
    documentFee: 0,
    hirePurchase: 0,
    taxAmount: 0,
    insurance: 0,
    insuranceFine: 0,
    greenTax: 0,
    fine: 0,
    nationalTax: 0,
    permit: 0,
    brokerageCustomer: 0,
    brokerageHand: 0,
  });

  const [payForm, setPayForm] = useState({
    amountPaid: "",
    paymentMethod: "CASH",
    referenceNumber: "",
  });

  // Filters
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [loanTabFilter, setLoanTabFilter] = useState("ALL");
  const [vehicleTypeFilter, setVehicleTypeFilter] = useState("ALL");
  const [sortConfig, setSortConfig] = useState({
    key: "date",
    direction: "desc",
  });

  const loadData = async () => {
    setLoading(true);
    try {
      const [dashRes, custRes, typesRes, loansRes] = await Promise.allSettled([
        apiCall("/loans/dashboard"),
        apiCall("/customers"),
        apiCall("/loan-types"),
        apiCall("/loans"),
      ]);

      if (dashRes.status === "fulfilled" && dashRes.value.success)
        setDashboardData(dashRes.value.data);
      if (custRes.status === "fulfilled" && custRes.value.success)
        setCustomers(custRes.value.data || []);
      if (typesRes.status === "fulfilled" && typesRes.value.success)
        setLoanTypes(typesRes.value.data || []);
      if (loansRes.status === "fulfilled" && loansRes.value.success)
        setLoans(loansRes.value.data || []);
    } catch (err) {
      setNotice?.({ type: "error", text: err.message });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [activeMenu]);

  // Handlers
  const handleAddLoanType = async (e) => {
    e.preventDefault();
    try {
      await apiCall("/loan-types", {
        method: "POST",
        body: JSON.stringify(typeForm),
      });
      setNotice?.({
        type: "success",
        text: "Loan scheme created successfully!",
      });
      setShowAddLoanType(false);
      setTypeForm({
        name: "",
        interestType: "FLAT",
        baseInterestRate: "12",
        defaultTenureMonths: "12",
      });
      loadData();
    } catch (err) {
      setNotice?.({ type: "error", text: err.message });
    }
  };

  const handleCreateLoan = async (e) => {
    e.preventDefault();
    try {
      await apiCall("/loans", {
        method: "POST",
        body: JSON.stringify(loanForm),
      });
      setNotice?.({
        type: "success",
        text: "Vehicle Loan created with EMI schedule!",
      });
      setShowCreateLoan(false);
      setLoanForm({
        customerId: "",
        firstName: "",
        lastName: "",
        phone: "",
        email: "",
        city: "",
        state: "",
        address: "",
        loanTypeId: "",
        interestType: "FLAT",
        loanAmount: "",
        interestRate: "12",
        tenureMonths: "12",
        startDate: new Date().toISOString().slice(0, 10),
        vehicleType: "TWO_WHEELER",
        make: "",
        model: "",
        year: new Date().getFullYear(),
        registrationNumber: "",
        chassisNumber: "",
        engineNumber: "",
        incomeDue: 0,
        documentFee: 0,
        hirePurchase: 0,
        taxAmount: 0,
        insurance: 0,
        insuranceFine: 0,
        greenTax: 0,
        fine: 0,
        nationalTax: 0,
        permit: 0,
        brokerageCustomer: 0,
        brokerageHand: 0,
      });
      loadData();
    } catch (err) {
      setNotice?.({ type: "error", text: err.message });
    }
  };

  const handlePayEmi = async (e) => {
    e.preventDefault();
    if (!payEmiModal) return;
    try {
      await apiCall("/loans/pay-emi", {
        method: "POST",
        body: JSON.stringify({
          loanId: payEmiModal.loanId,
          emiId: payEmiModal.emiId,
          amountPaid: payForm.amountPaid,
          paymentMethod: payForm.paymentMethod,
          referenceNumber: payForm.referenceNumber,
        }),
      });
      setNotice?.({ type: "success", text: "EMI Payment recorded!" });
      setPayEmiModal(null);
      setPayForm({
        amountPaid: "",
        paymentMethod: "CASH",
        referenceNumber: "",
      });
      if (selectedLoan) {
        const details = await apiCall(`/loans/${selectedLoan.loan.id}`);
        if (details.success) setSelectedLoan(details.data);
      }
      loadData();
    } catch (err) {
      setNotice?.({ type: "error", text: err.message });
    }
  };

  const handleOpenCloseLoan = (loanDetails) => {
    const principal = Number(loanDetails.loan.loan_amount || 0);
    const paidPrincipalRes = (loanDetails.schedules || []).reduce(
      (acc, s) =>
        acc + Number(s.paid_principal || 0) + Number(s.extra_principal_paid || 0),
      0
    );
    const remainingPrincipal = Math.max(0, principal - paidPrincipalRes);

    setCloseLoanModal({
      loanId: loanDetails.loan.id,
      principalAmount: remainingPrincipal,
      interestPercent: 0,
      paymentMethod: "CASH",
      referenceNumber: "",
    });
  };

  const submitCloseLoan = async (e) => {
    e.preventDefault();
    if (!closeLoanModal) return;
    try {
      const p = Number(closeLoanModal.principalAmount || 0);
      const pct = Number(closeLoanModal.interestPercent || 0);
      const interestAmt = Math.round((p * pct) / 100);

      await apiCall(`/loans/${closeLoanModal.loanId}/close`, {
        method: "POST",
        body: JSON.stringify({
          principalAmount: p,
          interestAmount: interestAmt,
          paymentMethod: closeLoanModal.paymentMethod,
          referenceNumber: closeLoanModal.referenceNumber,
        }),
      });
      setNotice?.({ type: "success", text: "Loan successfully closed early!" });
      setCloseLoanModal(null);
      if (selectedLoan) {
        const details = await apiCall(`/loans/${selectedLoan.loan.id}`);
        if (details.success) setSelectedLoan(details.data);
      }
      loadData();
    } catch (err) {
      setNotice?.({ type: "error", text: err.message });
    }
  };

  const openLoanDetails = async (loanId) => {
    try {
      const res = await apiCall(`/loans/${loanId}`);
      if (res.success) setSelectedLoan(res.data);
    } catch (err) {
      setNotice?.({ type: "error", text: err.message });
    }
  };

  const handleExportMonthly = async () => {
    try {
      setLoading(true);
      const res = await apiCall(`/loans/reports/monthly?month=${reportMonth}`);
      if (res.success && res.data) {
        const exportData = res.data.map((p) => ({
          "Payment Date": p.payment_date ? new Date(p.payment_date).toLocaleDateString("en-IN") : "—",
          "Customer Name": `${p.first_name} ${p.last_name}`,
          "Customer Code": p.customer_code,
          Vehicle: `${p.make} ${p.model} (${p.registration_number})`,
          "Inst #": p.installment_number,
          "Amount Paid": Number(p.amount_paid),
          "Payment Method": p.payment_method,
          "Reference No": p.reference_number || "",
        }));
        exportToExcel(exportData, `Monthly_Collections_${reportMonth}`);
        setNotice?.({
          type: "success",
          text: "Monthly report exported successfully!",
        });
      }
    } catch (err) {
      setNotice?.({ type: "error", text: err.message });
    } finally {
      setLoading(false);
    }
  };

  const handleExportTotal = () => {
    exportTotalPortfolio(loans);
  };

  const handleExportIndividual = (loan) => {
    exportIndividualLoan(loan);
  };

  const handleExportIndividualFromId = async (loanId) => {
    try {
      setLoading(true);
      const res = await apiCall(`/loans/${loanId}`);
      if (res.success && res.data) {
        handleExportIndividual(res.data);
      } else {
        setNotice?.({
          type: "error",
          text: "Failed to load loan details for export.",
        });
      }
    } catch (err) {
      setNotice?.({ type: "error", text: err.message });
    } finally {
      setLoading(false);
    }
  };

  const handleExportCustomers = () => {
    exportCustomersList(filteredCustomers);
  };

  const filteredCustomers = useMemo(() => {
    return customers.filter(
      (c) =>
        !search ||
        `${c.first_name} ${c.last_name}`
          .toLowerCase()
          .includes(search.toLowerCase()) ||
        (c.phone && c.phone.includes(search)) ||
        (c.customer_code &&
          c.customer_code.toLowerCase().includes(search.toLowerCase()))
    );
  }, [customers, search]);

  // Dashboard strictly shows ACTIVE loans only (no completed/settled loans)
  const dashboardLoans = useMemo(() => {
    let result = loans.filter((l) => {
      if (l.status !== "ACTIVE" || Number(l.pending_dues_count ?? 1) <= 0)
        return false;

      const matchesSearch =
        !search ||
        `${l.first_name} ${l.last_name}`
          .toLowerCase()
          .includes(search.toLowerCase()) ||
        (l.registration_number &&
          l.registration_number.toLowerCase().includes(search.toLowerCase())) ||
        (l.make && l.make.toLowerCase().includes(search.toLowerCase())) ||
        (l.model && l.model.toLowerCase().includes(search.toLowerCase()));

      if (!matchesSearch) return false;

      if (statusFilter === "ALL") return true;

      const todayStr = new Date().toISOString().slice(0, 10);
      const dueStr = l.next_due_date
        ? new Date(l.next_due_date).toISOString().slice(0, 10)
        : "";
      const isDueToday = dueStr === todayStr;
      const isOverdue =
        l.next_due_date && new Date(l.next_due_date) < new Date(todayStr);
      const isUpToDate = !l.next_due_date;
      const hasUpcoming = l.next_due_date && !isDueToday && !isOverdue;

      if (statusFilter === "OVERDUE") return isOverdue;
      if (statusFilter === "DUE_TODAY") return isDueToday;
      if (statusFilter === "UPCOMING") return hasUpcoming || isUpToDate;

      return true;
    });

    result.sort((a, b) => {
      let aVal = a[sortConfig.key];
      let bVal = b[sortConfig.key];

      if (sortConfig.key === "date") {
        aVal = new Date(a.created_at || a.start_date || 0).getTime();
        bVal = new Date(b.created_at || b.start_date || 0).getTime();
      } else if (sortConfig.key === "due_date") {
        aVal = a.next_due_date ? new Date(a.next_due_date).getTime() : Infinity;
        bVal = b.next_due_date ? new Date(b.next_due_date).getTime() : Infinity;
      } else if (sortConfig.key === "amount") {
        aVal = Number(a.loan_amount || 0);
        bVal = Number(b.loan_amount || 0);
      } else if (sortConfig.key === "total_paid") {
        aVal = Number(a.total_paid || 0);
        bVal = Number(b.total_paid || 0);
      }

      if (aVal < bVal) return sortConfig.direction === "asc" ? -1 : 1;
      if (aVal > bVal) return sortConfig.direction === "asc" ? 1 : -1;
      return 0;
    });

    return result;
  }, [loans, search, statusFilter, sortConfig]);

  // Vehicle Loans directory: show ACTIVE loans first, then COMPLETED loans
  const vehiclePageLoans = useMemo(() => {
    let list = loans.filter((l) => {
      const matchesSearch =
        !search ||
        `${l.first_name} ${l.last_name}`
          .toLowerCase()
          .includes(search.toLowerCase()) ||
        (l.customer_code &&
          l.customer_code.toLowerCase().includes(search.toLowerCase())) ||
        (l.registration_number &&
          l.registration_number.toLowerCase().includes(search.toLowerCase())) ||
        (l.make && l.make.toLowerCase().includes(search.toLowerCase())) ||
        (l.model && l.model.toLowerCase().includes(search.toLowerCase()));

      if (!matchesSearch) return false;

      if (loanTabFilter === "ACTIVE" && l.status !== "ACTIVE") return false;
      if (loanTabFilter === "COMPLETED" && l.status !== "COMPLETED")
        return false;

      if (vehicleTypeFilter !== "ALL" && l.vehicle_type !== vehicleTypeFilter)
        return false;

      return true;
    });

    list.sort((a, b) => {
      // 1. Show ACTIVE loans first, then COMPLETED loans
      const isActiveA = a.status === "ACTIVE" ? 1 : 0;
      const isActiveB = b.status === "ACTIVE" ? 1 : 0;
      if (isActiveA !== isActiveB) {
        return isActiveB - isActiveA;
      }

      // 2. Within each group, sort newest first
      const dateA = new Date(a.created_at || a.start_date || 0).getTime();
      const dateB = new Date(b.created_at || b.start_date || 0).getTime();
      return dateB - dateA;
    });

    return list;
  }, [loans, search, loanTabFilter, vehicleTypeFilter]);

  const handleSort = (key) => {
    setSortConfig((prev) => ({
      key,
      direction: prev.key === key && prev.direction === "asc" ? "desc" : "asc",
    }));
  };

  const customerOptions = useMemo(() => {
    return customers.map((c) => ({
      value: c.id,
      label: `${c.first_name} ${c.last_name || ""}`,
      subtext: `${c.phone || "No phone"} · ${c.customer_code}`,
    }));
  }, [customers]);

  const schemeOptions = useMemo(() => {
    return [
      {
        value: "",
        label: "-- Custom / Manual Entry (No Template) --",
        subtext: "Manually fill all interest rates & terms",
      },
      ...loanTypes.map((t) => ({
        value: t.id,
        label: `${t.name} (${t.base_interest_rate}% p.a.)`,
        subtext: `Method: ${t.interest_type} · Default Rate: ${t.base_interest_rate}% · Tenure: ${t.default_tenure_months} Mo`,
        scheme: t,
      })),
    ];
  }, [loanTypes]);

  const overview = dashboardData.overview || {};

  return (
    <div className="autoFinanceContainer">
      {/* 1. DASHBOARD */}
      {activeMenu === "Dashboard" && (
        <AutoDashboard
          overview={overview}
          dashboardLoans={dashboardLoans}
          dashboardData={dashboardData}
          statusFilter={statusFilter}
          setStatusFilter={setStatusFilter}
          sortConfig={sortConfig}
          handleSort={handleSort}
          setShowCreateLoan={setShowCreateLoan}
          openLoanDetails={openLoanDetails}
          setPayEmiModal={setPayEmiModal}
          setPayForm={setPayForm}
        />
      )}

      {/* 2. CUSTOMERS */}
      {activeMenu === "Customers" && (
        <AutoCustomers
          filteredCustomers={filteredCustomers}
          search={search}
          setSearch={setSearch}
          handleExportCustomers={handleExportCustomers}
          setSelectedCustomer={setSelectedCustomer}
        />
      )}

      {selectedCustomer && (
        <CustomerDetailsModal
          customer={selectedCustomer}
          loans={loans}
          onClose={() => setSelectedCustomer(null)}
        />
      )}

      {/* 3. LOAN SCHEMES */}
      {activeMenu === "Loan Schemes" && (
        <AutoLoanSchemes
          loanTypes={loanTypes}
          setShowAddLoanType={setShowAddLoanType}
        />
      )}

      {/* 4. VEHICLE LOANS */}
      {activeMenu === "Vehicle Loans" && (
        <AutoVehicleLoans
          overview={overview}
          loans={loans}
          vehiclePageLoans={vehiclePageLoans}
          loanTabFilter={loanTabFilter}
          setLoanTabFilter={setLoanTabFilter}
          search={search}
          setSearch={setSearch}
          vehicleTypeFilter={vehicleTypeFilter}
          setVehicleTypeFilter={setVehicleTypeFilter}
          setShowCreateLoan={setShowCreateLoan}
          openLoanDetails={openLoanDetails}
        />
      )}

      {/* 5. REPORTS */}
      {activeMenu === "Reports" && (
        <AutoReports
          overview={overview}
          loans={loans}
          reportMonth={reportMonth}
          setReportMonth={setReportMonth}
          handleExportTotal={handleExportTotal}
          handleExportMonthly={handleExportMonthly}
          handleExportIndividualFromId={handleExportIndividualFromId}
        />
      )}

      {/* MODAL: ADD LOAN SCHEME */}
      <AddLoanSchemeModal
        show={showAddLoanType}
        onClose={() => setShowAddLoanType(false)}
        typeForm={typeForm}
        setTypeForm={setTypeForm}
        onSubmit={handleAddLoanType}
      />

      {/* MODAL: CREATE VEHICLE LOAN */}
      <CreateLoanModal
        showCreateLoan={showCreateLoan}
        setShowCreateLoan={setShowCreateLoan}
        loanForm={loanForm}
        setLoanForm={setLoanForm}
        customerOptions={customerOptions}
        schemeOptions={schemeOptions}
        handleCreateLoan={handleCreateLoan}
      />

      {/* MODAL: LOAN DETAILS & EMI SCHEDULE TABLE */}
      <LoanDetailsModal
        selectedLoan={selectedLoan}
        setSelectedLoan={setSelectedLoan}
        handleOpenCloseLoan={handleOpenCloseLoan}
        handleExportIndividual={handleExportIndividual}
        setPayEmiModal={setPayEmiModal}
        setPayForm={setPayForm}
        setNotice={setNotice}
      />

      {/* MODAL: PAY EMI */}
      <PayEmiModal
        payEmiModal={payEmiModal}
        setPayEmiModal={setPayEmiModal}
        payForm={payForm}
        setPayForm={setPayForm}
        handlePayEmi={handlePayEmi}
      />

      {/* MODAL: CLOSE LOAN EARLY */}
      <CloseLoanModal
        closeLoanModal={closeLoanModal}
        setCloseLoanModal={setCloseLoanModal}
        submitCloseLoan={submitCloseLoan}
      />
    </div>
  );
}
