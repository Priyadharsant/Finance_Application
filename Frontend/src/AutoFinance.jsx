import { useEffect, useState, useMemo, useRef } from "react";
import {
  AlertTriangle,
  Banknote,
  Bike,
  CalendarClock,
  CalendarDays,
  CarFront,
  CheckCircle2,
  Clock3,
  CircleDollarSign,
  IdCard,
  Landmark,
  Mail,
  MapPin,
  Phone,
  Plus,
  Percent,
  ShieldCheck,
  Tags,
  Truck,
  UserRound,
  Wrench,
  X,
  Zap,
} from "lucide-react";
import * as XLSX from "xlsx";

const autoFitColumns = (worksheet, data) => {
  if (!data || !data.length) return;
  const keys = Object.keys(data[0]);
  const wscols = keys.map(key => {
    const maxDataLength = data.reduce((max, row) => {
      const val = row[key];
      const valLen = val ? val.toString().length : 0;
      return Math.max(max, valLen);
    }, key.length);
    return { wch: Math.min(maxDataLength + 2, 50) };
  });
  worksheet['!cols'] = wscols;
};

const exportToExcel = (data, fileName) => {
  const worksheet = XLSX.utils.json_to_sheet(data);
  autoFitColumns(worksheet, data);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Sheet1");
  XLSX.writeFile(workbook, `${fileName}.xlsx`);
};

const API_BASE = import.meta.env.VITE_API_URL
  ? import.meta.env.VITE_API_URL.replace("/daily-finance", "")
  : "http://localhost:3000/api";

const money = (value) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(Number(value || 0));
const dateLabel = (value) =>
  value ? new Date(value).toLocaleDateString("en-IN") : "—";

async function apiCall(endpoint, options = {}) {
  const res = await fetch(`${API_BASE}${endpoint}`, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok)
    throw new Error(data.message || data.error || "API Request Failed");
  return data;
}

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
  const [reportMonth, setReportMonth] = useState(new Date().toISOString().slice(0, 7));

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
    // Customer inline fields
    customerId: "",
    firstName: "",
    lastName: "",
    phone: "",
    email: "",
    city: "",
    state: "",
    address: "",
    // Loan fields
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
    // Include both scheduled principal paid and extra principal paid
    const paidPrincipalRes = (loanDetails.schedules || []).reduce(
      (acc, s) => acc + Number(s.paid_principal || 0) + Number(s.extra_principal_paid || 0),
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
        const exportData = res.data.map(p => ({
          "Payment Date": dateLabel(p.payment_date),
          "Customer Name": `${p.first_name} ${p.last_name}`,
          "Customer Code": p.customer_code,
          "Vehicle": `${p.make} ${p.model} (${p.registration_number})`,
          "Inst #": p.installment_number,
          "Amount Paid": Number(p.amount_paid),
          "Payment Method": p.payment_method,
          "Reference No": p.reference_number || ""
        }));
        exportToExcel(exportData, `Monthly_Collections_${reportMonth}`);
        setNotice?.({ type: "success", text: "Monthly report exported successfully!" });
      }
    } catch (err) {
      setNotice?.({ type: "error", text: err.message });
    } finally {
      setLoading(false);
    }
  };

  const handleExportTotal = () => {
    const exportData = loans.map(l => ({
      "Customer Name": `${l.first_name} ${l.last_name}`,
      "Customer Code": l.customer_code,
      "Phone": l.phone || "",
      "Vehicle": `${l.make} ${l.model}`,
      "Reg No": l.registration_number,
      "Loan Amount": Number(l.loan_amount),
      "Interest Rate (%)": Number(l.interest_rate),
      "Tenure (Months)": Number(l.tenure_months),
      "Start Date": dateLabel(l.start_date),
      "End Date": dateLabel(l.end_date),
      "Total Collected": Number(l.total_paid || 0),
      "Pending Dues": Number(l.pending_dues_count || 0),
      "Status": l.status
    }));
    exportToExcel(exportData, `Total_Portfolio_Report_${new Date().toISOString().slice(0, 10)}`);
  };

  const handleExportIndividual = (loan) => {
    if (!loan || !loan.schedules) return;

    const totalCollected = loan.schedules.reduce((acc, s) => acc + parseFloat(s.total_cash_collected || s.collected_amount || 0), 0);

    const fees = loan.loan.fees_details || {};
    const totalDeductions = Number(fees.incomeDue || 0) + Number(fees.documentFee || 0) + Number(fees.hirePurchase || 0) +
      Number(fees.taxAmount || 0) + Number(fees.insurance || 0) + Number(fees.insuranceFine || 0) +
      Number(fees.greenTax || 0) + Number(fees.fine || 0) + Number(fees.nationalTax || 0) +
      Number(fees.permit || 0) + Number(fees.brokerageCustomer || 0);

    // Sheet 1: Details
    const detailsData = [
      { "Category": "Customer Name", "Value": `${loan.loan.first_name} ${loan.loan.last_name}` },
      { "Category": "Customer Code", "Value": loan.loan.customer_code || "" },
      { "Category": "Phone", "Value": loan.loan.phone || "" },
      { "Category": "Address", "Value": `${loan.loan.address || ""}, ${loan.loan.city || ""}, ${loan.loan.state || ""}`.replace(/^, | ,|, $/g, '') },
      { "Category": "Vehicle", "Value": `${loan.loan.make} ${loan.loan.model} (${loan.loan.year || "N/A"})` },
      { "Category": "Registration No", "Value": loan.loan.registration_number || "PENDING" },
      { "Category": "Chassis No", "Value": loan.loan.chassis_number || "N/A" },
      { "Category": "Engine No", "Value": loan.loan.engine_number || "N/A" },
      { "Category": "Loan Amount", "Value": Number(loan.loan.loan_amount) },
      { "Category": "Income Due", "Value": Number(fees.incomeDue || 0) },
      { "Category": "Document Fee", "Value": Number(fees.documentFee || 0) },
      { "Category": "Hire Purchase", "Value": Number(fees.hirePurchase || 0) },
      { "Category": "Tax Amount", "Value": Number(fees.taxAmount || 0) },
      { "Category": "Insurance", "Value": Number(fees.insurance || 0) },
      { "Category": "Insurance Fine", "Value": Number(fees.insuranceFine || 0) },
      { "Category": "Green Tax", "Value": Number(fees.greenTax || 0) },
      { "Category": "Fine", "Value": Number(fees.fine || 0) },
      { "Category": "National Tax", "Value": Number(fees.nationalTax || 0) },
      { "Category": "Permit", "Value": Number(fees.permit || 0) },
      { "Category": "Brokerage (Customer)", "Value": Number(fees.brokerageCustomer || 0) },
      { "Category": "Brokerage (By Hand)", "Value": Number(fees.brokerageHand || 0) },
      { "Category": "In-Hand Amount", "Value": Number(loan.loan.loan_amount) - totalDeductions },
      { "Category": "Interest Rate (%)", "Value": Number(loan.loan.interest_rate) },
      { "Category": "Tenure (Months)", "Value": Number(loan.loan.tenure_months) },
      { "Category": "Start Date", "Value": dateLabel(loan.loan.start_date) },
      { "Category": "End Date", "Value": dateLabel(loan.loan.end_date) },
      { "Category": "Total Collected", "Value": Number(totalCollected) }
    ];

    // Sheet 2: Schedule
    const scheduleData = loan.schedules.map(s => ({
      "Inst #": s.installment_number,
      "Due Date": dateLabel(s.due_date),
      "Principal": Number(s.principal_component),
      "Interest": Number(s.interest_component),
      "Total EMI": Number(s.total_emi),
      "Paid Amount": Number(s.collected_amount || 0),
      "Paid Principal": Number(s.paid_principal || 0),
      "Paid Interest": Number(s.paid_interest || 0),
      "Status": s.status
    }));

    // Sheet 3: Payments
    let paymentsData = [];
    if (loan.payments && loan.payments.length > 0) {
      paymentsData = loan.payments.map(p => ({
        "Payment ID": p.id,
        "Date": dateLabel(p.payment_date),
        "Amount": Number(p.amount_paid),
        "Principal Component": Number(p.principal_paid),
        "Interest Component": Number(p.interest_paid),
        "Extra Principal": Number(p.extra_principal_paid),
        "Method": p.payment_method,
        "Reference No": p.reference_number || "—"
      }));
    } else {
      paymentsData = [{ "Message": "No payments recorded yet." }];
    }

    const ws1 = XLSX.utils.json_to_sheet(detailsData);
    autoFitColumns(ws1, detailsData);
    const ws2 = XLSX.utils.json_to_sheet(scheduleData);
    autoFitColumns(ws2, scheduleData);
    const ws3 = XLSX.utils.json_to_sheet(paymentsData);
    autoFitColumns(ws3, paymentsData);

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, ws1, "Customer Details");
    XLSX.utils.book_append_sheet(workbook, ws2, "EMI Schedule");
    XLSX.utils.book_append_sheet(workbook, ws3, "Payment History");

    XLSX.writeFile(workbook, `Full_Report_${loan.loan.customer_code || "Loan"}_${loan.loan.registration_number || "Vehicle"}.xlsx`);
  };

  const handleExportIndividualFromId = async (loanId) => {
    try {
      setLoading(true);
      const res = await apiCall(`/loans/${loanId}`);
      if (res.success && res.data) {
        handleExportIndividual(res.data);
      } else {
        setNotice?.({ type: "error", text: "Failed to load loan details for export." });
      }
    } catch (err) {
      setNotice?.({ type: "error", text: err.message });
    } finally {
      setLoading(false);
    }
  };
  const handleExportCustomers = () => {
    const exportData = filteredCustomers.map(c => ({
      "Customer Code": c.customer_code,
      "Name": `${c.first_name} ${c.last_name}`,
      "Phone": c.phone || "",
      "Email": c.email || "",
      "Address": c.address || "",
      "City": c.city || "",
      "State": c.state || ""
    }));
    exportToExcel(exportData, `Customer_Directory_${new Date().toISOString().slice(0, 10)}`);
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
          c.customer_code.toLowerCase().includes(search.toLowerCase())),
    );
  }, [customers, search]);

  // Dashboard strictly shows ACTIVE loans only (no completed/settled loans)
  const dashboardLoans = useMemo(() => {
    let result = loans.filter((l) => {
      // Must be ACTIVE and have pending dues
      if (l.status !== "ACTIVE" || Number(l.pending_dues_count ?? 1) <= 0) return false;

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
        `${l.first_name} ${l.last_name}`.toLowerCase().includes(search.toLowerCase()) ||
        (l.customer_code && l.customer_code.toLowerCase().includes(search.toLowerCase())) ||
        (l.registration_number && l.registration_number.toLowerCase().includes(search.toLowerCase())) ||
        (l.make && l.make.toLowerCase().includes(search.toLowerCase())) ||
        (l.model && l.model.toLowerCase().includes(search.toLowerCase()));

      if (!matchesSearch) return false;

      if (loanTabFilter === "ACTIVE" && l.status !== "ACTIVE") return false;
      if (loanTabFilter === "COMPLETED" && l.status !== "COMPLETED") return false;

      if (vehicleTypeFilter !== "ALL" && l.vehicle_type !== vehicleTypeFilter) return false;

      return true;
    });

    list.sort((a, b) => {
      // 1. Show ACTIVE loans first, then COMPLETED loans
      const isActiveA = a.status === "ACTIVE" ? 1 : 0;
      const isActiveB = b.status === "ACTIVE" ? 1 : 0;
      if (isActiveA !== isActiveB) {
        return isActiveB - isActiveA; // Active (1) first, Completed (0) second
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
        <section className="content">
          <div className="intro">
            <div>
              <span className="overline autoBadgeTag">
                AUTO FINANCE ANALYTICS
              </span>
              <h2>Vehicle Loan Portfolio & Business Analytics</h2>
              <p>
                Real-time loan position, capital deployment, EMI recovery, and
                vehicle fleet distribution.
              </p>
            </div>
            <div className="actionGroup">
              <button
                className="primary autoBtn"
                onClick={() => setShowCreateLoan(true)}
              >
                <Plus size={16} /> New Vehicle Loan
              </button>
            </div>
          </div>

          {/* EXECUTIVE KPI METRIC CARDS */}
          <div
            className="metricGrid"
            style={{
              gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))",
            }}
          >
            <div className="metric autoMetric blue">
              <span>Total Disbursed (Principal)</span>
              <b>{money(overview.total_disbursed || 0)}</b>
              <small
                style={{
                  color: "#64748b",
                  fontSize: "11.5px",
                  marginTop: "4px",
                  display: "block",
                }}
              >
                Capital deployed across loans
              </small>
            </div>

            <div className="metric autoMetric orange">
              <span>Total Expected Return</span>
              <b>{money(overview.total_expected || 0)}</b>
              <small
                style={{
                  color: "#64748b",
                  fontSize: "11.5px",
                  marginTop: "4px",
                  display: "block",
                }}
              >
                Principal + Total Interest Scheduled
              </small>
            </div>

            <div className="metric autoMetric green">
              <span>Total EMI Collected</span>
              <b>{money(overview.total_collected || 0)}</b>
              <small
                style={{
                  color: "#059669",
                  fontWeight: 600,
                  fontSize: "11.5px",
                  marginTop: "4px",
                  display: "block",
                }}
              >
                {overview.recovery_rate || "0"}% Recovered
              </small>
            </div>

            <div className="metric autoMetric red">
              <span>Remaining Portfolio</span>
              <b>{money(overview.remaining || 0)}</b>
              <small
                style={{
                  color: "#dc2626",
                  fontWeight: 600,
                  fontSize: "11.5px",
                  marginTop: "4px",
                  display: "block",
                }}
              >
                Balance left to recover
              </small>
            </div>

            <div className="metric autoMetric teal">
              <span>Projected Net Profit</span>
              <b>{money(overview.total_profit || 0)}</b>
              <small
                style={{
                  color: "#0f766e",
                  fontWeight: 600,
                  fontSize: "11.5px",
                  marginTop: "4px",
                  display: "block",
                }}
              >
                Interest earnings margin
              </small>
            </div>
          </div>

          {/* COMPREHENSIVE VEHICLE LOANS PORTFOLIO TABLE */}
          <div className="card tableWrap" style={{ marginBottom: "28px" }}>
            <div
              className="cardHead"
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                flexWrap: "wrap",
                gap: "12px",
              }}
            >
              <div>
                <span className="overline" style={{ color: "#059669" }}>
                  ACTIVE VEHICLE LOANS &amp; DUE TRACKING
                </span>
                <h3 style={{ marginTop: "2px" }}>
                  <Zap size={17} /> Active Vehicle Loans &amp; Due Tracking
                </h3>
                <p>
                  Active ongoing vehicle loans, payment progress, and actionable dues.
                </p>
              </div>
              <div
                style={{
                  display: "flex",
                  gap: "8px",
                  flexWrap: "wrap",
                  alignItems: "center",
                }}
              >
                <select
                  className="autoSelect"
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  style={{
                    padding: "6px 12px",
                    borderRadius: "6px",
                    border: "1px solid #cbd5e1",
                    marginRight: "4px",
                  }}
                >
                  <option value="ALL">All Active Loans</option>
                  <option value="OVERDUE">Overdue Dues</option>
                  <option value="DUE_TODAY">Due Today</option>
                  <option value="UPCOMING">Upcoming Dues</option>
                </select>
                <span
                  className="tag"
                  style={{
                    background: "#fff7ed",
                    color: "#c2410c",
                    border: "1px solid #ffedd5",
                  }}
                >
                  <CalendarDays size={13} /> Today Due:{" "}
                  <b>{money(overview.today_due_amount || 0)}</b> (
                  {overview.today_due_count || 0})
                </span>
                <span
                  className="tag"
                  style={{
                    background: "#fef2f2",
                    color: "#b91c1c",
                    border: "1px solid #fecaca",
                  }}
                >
                  <AlertTriangle size={13} /> Outstanding Overdue:{" "}
                  <b>{money(overview.overdue_amount || 0)}</b> (
                  {overview.overdue_count || 0})
                </span>
              </div>
            </div>
            <table>
              <thead>
                <tr>
                  <th
                    className="clickable"
                    onClick={() => handleSort("first_name")}
                  >
                    Customer{" "}
                    {sortConfig.key === "first_name" &&
                      (sortConfig.direction === "asc" ? "↑" : "↓")}
                  </th>
                  <th
                    className="clickable"
                    onClick={() => handleSort("registration_number")}
                  >
                    Vehicle & Reg No{" "}
                    {sortConfig.key === "registration_number" &&
                      (sortConfig.direction === "asc" ? "↑" : "↓")}
                  </th>
                  <th
                    className="clickable"
                    onClick={() => handleSort("amount")}
                  >
                    Loan Details{" "}
                    {sortConfig.key === "amount" &&
                      (sortConfig.direction === "asc" ? "↑" : "↓")}
                  </th>
                  <th
                    className="clickable"
                    onClick={() => handleSort("total_paid")}
                  >
                    Payment Progress{" "}
                    {sortConfig.key === "total_paid" &&
                      (sortConfig.direction === "asc" ? "↑" : "↓")}
                  </th>
                  <th
                    className="clickable"
                    onClick={() => handleSort("due_date")}
                  >
                    Due Status{" "}
                    {sortConfig.key === "due_date" &&
                      (sortConfig.direction === "asc" ? "↑" : "↓")}
                  </th>
                  <th>EMI</th>
                </tr>
              </thead>
              <tbody>
                {dashboardLoans.map((l) => {
                  const todayStr = new Date().toISOString().slice(0, 10);
                  const dueStr = l.next_due_date
                    ? new Date(l.next_due_date).toISOString().slice(0, 10)
                    : "";
                  const isToday = dueStr === todayStr;
                  const isOverdue =
                    l.next_due_date &&
                    new Date(l.next_due_date) < new Date(todayStr);
                  const hasUpcoming = l.next_due_date && !isToday && !isOverdue;

                  // Monthly due amount calculation
                  const dashDue = (dashboardData.dueSchedules || []).find(
                    (d) => String(d.loan_id) === String(l.id),
                  );
                  const monthlyDueAmount = dashDue
                    ? (dashDue.remaining_emi_amount !== undefined ? Number(dashDue.remaining_emi_amount) : Math.max(0, Number(dashDue.total_emi || 0) - Number(dashDue.collected_amount || 0)))
                    : Number(l.next_emi_amount || 0);
                  const instNo = dashDue
                    ? dashDue.installment_number
                    : l.next_installment_number || "?";
                  const emiId = dashDue ? dashDue.id : l.next_emi_id;

                  return (
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
                        <small
                          style={{
                            display: "block",
                            color: "#64748b",
                            marginTop: "2px",
                          }}
                        >
                          {l.interest_rate}% ({l.interest_type || "FLAT"}) •{" "}
                          {l.tenure_months} Mo
                        </small>
                      </td>
                      <td>
                        <b className="greenText">{money(l.total_paid)}</b>
                        <small style={{ display: "block", marginTop: "2px" }}>
                          <span
                            style={{
                              color:
                                Number(l.pending_dues_count || 0) > 0
                                  ? "#c2410c"
                                  : "#047857",
                            }}
                          >
                            <Clock3
                              size={11}
                              style={{ verticalAlign: "middle" }}
                            />{" "}
                            {l.pending_dues_count || 0} Pending
                          </span>
                        </small>
                      </td>
                      <td>
                        {isToday || isOverdue ? (
                          <div
                            style={{
                              display: "flex",
                              flexDirection: "column",
                              alignItems: "flex-start",
                              gap: "4px",
                            }}
                          >
                            <span
                              className="tag"
                              style={{
                                background: isToday ? "#fff7ed" : "#fef2f2",
                                color: isToday ? "#c2410c" : "#b91c1c",
                                border: `1px solid ${isToday ? "#ffedd5" : "#fecaca"}`,
                                fontSize: "10px",
                                padding: "2px 6px",
                              }}
                            >
                              {isToday ? "DUE TODAY" : "OVERDUE"}
                            </span>
                            <b
                              style={{
                                color: isToday ? "#d97706" : "#dc2626",
                                fontSize: "13px",
                              }}
                            >
                              {money(monthlyDueAmount)}
                            </b>
                            <small
                              style={{ color: "#64748b", fontSize: "11px" }}
                            >
                              Inst #{instNo}
                            </small>
                          </div>
                        ) : hasUpcoming ? (
                          <div
                            style={{
                              display: "flex",
                              flexDirection: "column",
                              alignItems: "flex-start",
                              gap: "4px",
                            }}
                          >
                            <span
                              className="tag"
                              style={{
                                background: "#eff6ff",
                                color: "#1d4ed8",
                                border: "1px solid #dbeafe",
                                fontSize: "10px",
                                padding: "2px 6px",
                              }}
                            >
                              UPCOMING DUE
                            </span>
                            <b style={{ color: "#1e3a8a", fontSize: "13px" }}>
                              {money(monthlyDueAmount)}
                            </b>
                            <small
                              style={{ color: "#64748b", fontSize: "11px" }}
                            >
                              Due: {dateLabel(l.next_due_date)}
                            </small>
                          </div>
                        ) : (
                          <span
                            className="tag"
                            style={{
                              background: "#ecfdf5",
                              color: "#047857",
                              border: "1px solid #d1fae5",
                            }}
                          >
                            <CheckCircle2
                              size={13}
                              style={{
                                verticalAlign: "middle",
                                marginRight: "2px",
                              }}
                            />{" "}
                            UP TO DATE
                          </span>
                        )}
                      </td>
                      <td>
                        {(isToday || isOverdue || hasUpcoming) && emiId ? (
                          <button
                            className="payButton"
                            style={{
                              background: hasUpcoming ? "#3b82f6" : "#059669",
                              color: "#fff",
                              borderColor: hasUpcoming ? "#3b82f6" : "#059669",
                              fontWeight: "800",
                            }}
                            onClick={(e) => {
                              e.stopPropagation();
                              setPayEmiModal({
                                loanId: l.id,
                                emiId: emiId,
                                totalEmi: monthlyDueAmount,
                                instNo: instNo,
                              });
                              setPayForm({
                                amountPaid: monthlyDueAmount,
                                paymentMethod: "CASH",
                                referenceNumber: "",
                              });
                            }}
                          >
                            Collect EMI
                          </button>
                        ) : (
                          <button
                            className="payButton"
                            style={{
                              background: "#f1f5f9",
                              color: "#0f172a",
                              borderColor: "#cbd5e1",
                            }}
                            onClick={(e) => {
                              e.stopPropagation();
                              openLoanDetails(l.id);
                            }}
                          >
                            Details
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {!dashboardLoans.length && (
              <div className="empty">
                <div>
                  <CarFront size={28} />
                </div>
                <b>
                  No active vehicle loans found matching criteria. Click "+ New Vehicle Loan" above.
                </b>
              </div>
            )}
          </div>
        </section>
      )}

      {/* 1A. VEHICLE LOANS */}
      {activeMenu === "Customers" && (
        <section className="content">
          <div className="intro">
            <div>
              <span className="overline autoBadgeTag">CUSTOMERS</span>
              <h2>Auto Finance Customer Directory</h2>
              <p>Manage customer profiles, contact info, and loan histories.</p>
            </div>
          </div>

          <div className="filterBar" style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: "10px" }}>
            <input
              style={{ flex: 1, minWidth: "250px" }}
              placeholder="Search by customer name, phone, code..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <button className="primary autoBtn" style={{ background: "#059669", borderColor: "#059669" }} onClick={handleExportCustomers}>
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
      )}

      {selectedCustomer && (
        <AutoCustomerDetails
          customer={selectedCustomer}
          loans={loans.filter(
            (loan) => String(loan.customer_id) === String(selectedCustomer.id),
          )}
          close={() => setSelectedCustomer(null)}
        />
      )}

      {/* 3. LOAN TYPES */}
      {activeMenu === "Loan Schemes" && (
        <section className="content">
          <div className="intro">
            <div>
              <span className="overline autoBadgeTag">SCHEMES</span>
              <h2>Vehicle Loan Types & Rates</h2>
              <p>
                Configure loan interest rates, categories, and tenure limits.
              </p>
            </div>
            <button
              className="primary autoBtn"
              onClick={() => setShowAddLoanType(true)}
            >
              <Plus size={16} /> Add Loan Scheme
            </button>
          </div>

          <div className="card tableWrap">
            <table>
              <thead>
                <tr>
                  <th>Scheme Name</th>
                  <th>Interest Method</th>
                  <th>Base Rate (% p.a.)</th>
                  <th>Default Tenure</th>
                </tr>
              </thead>
              <tbody>
                {loanTypes.map((t) => (
                  <tr key={t.id}>
                    <td>
                      <b>{t.name}</b>
                    </td>
                    <td>
                      <b>{t.interest_type}</b>
                    </td>
                    <td className="greenText">{t.base_interest_rate}%</td>
                    <td>{t.default_tenure_months} Months</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!loanTypes.length && (
              <div className="empty">
                <div>
                  <Tags size={28} />
                </div>
                <b>No loan schemes configured. Create one to get started.</b>
              </div>
            )}
          </div>
        </section>
      )}

      {/* 4. VEHICLE LOANS */}
      {activeMenu === "Vehicle Loans" && (
        <section className="content">
          <div className="intro">
            <div>
              <span className="overline autoBadgeTag">VEHICLE LOANS PORTFOLIO</span>
              <h2>Vehicle Loans & Registered Assets</h2>
              <p>
                Comprehensive directory of all active and completed vehicle loan agreements, registered vehicles, and repayment status.
              </p>
            </div>
            <button
              className="primary autoBtn"
              onClick={() => setShowCreateLoan(true)}
            >
              <Plus size={16} /> Create Vehicle Loan
            </button>
          </div>

          {/* QUICK PORTFOLIO SUMMARY CARDS */}
          <div className="metricGrid" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", marginBottom: "22px" }}>
            <div className="metric autoMetric blue">
              <span>Total Disbursed</span>
              <b>{money(overview.total_disbursed || 0)}</b>
              <small style={{ color: "#64748b", fontSize: "11.5px", display: "block", marginTop: "4px" }}>{loans.length} Total Loans</small>
            </div>
            <div className="metric autoMetric green">
              <span>Active Loans</span>
              <b>{loans.filter(l => l.status === 'ACTIVE').length}</b>
              <small style={{ color: "#059669", fontSize: "11.5px", fontWeight: 600, display: "block", marginTop: "4px" }}>Ongoing Repayments</small>
            </div>
            <div className="metric autoMetric teal">
              <span>Completed Loans</span>
              <b>{loans.filter(l => l.status === 'COMPLETED').length}</b>
              <small style={{ color: "#0f766e", fontSize: "11.5px", fontWeight: 600, display: "block", marginTop: "4px" }}>Fully Settled</small>
            </div>
            <div className="metric autoMetric orange">
              <span>Total EMI Collected</span>
              <b>{money(overview.total_collected || 0)}</b>
              <small style={{ color: "#d97706", fontSize: "11.5px", fontWeight: 600, display: "block", marginTop: "4px" }}>{overview.recovery_rate || "0"}% Recovered</small>
            </div>
          </div>

          {/* ORGANIZED FILTER BAR: TABS + SEARCH + VEHICLE TYPE */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "12px", marginBottom: "16px" }}>
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

            <div style={{ display: "flex", gap: "10px", alignItems: "center", flex: 1, minWidth: "280px", maxWidth: "560px" }}>
              <input
                placeholder="Search by customer, phone, vehicle, or reg no..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                style={{ flex: 1, padding: "8px 14px", borderRadius: "8px", border: "1px solid #cbd5e1", fontSize: "13px", outline: "none" }}
              />
              <select
                value={vehicleTypeFilter}
                onChange={(e) => setVehicleTypeFilter(e.target.value)}
                style={{ padding: "8px 12px", borderRadius: "8px", border: "1px solid #cbd5e1", fontSize: "13px", background: "#ffffff", fontWeight: 600, color: "#334155" }}
              >
                <option value="ALL">All Vehicle Types</option>
                <option value="TWO_WHEELER">Two Wheeler</option>
                <option value="CAR">Car</option>
                <option value="COMMERCIAL">Commercial</option>
              </select>
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
      )}

      {/* 6. REPORTS */}
      {activeMenu === "Reports" && (
        <section className="content">
          <div className="intro">
            <div>
              <span className="overline autoBadgeTag">REPORTS</span>
              <h2>Auto Finance Financial Reports</h2>
              <p>
                Export & audit vehicle loan portfolios, disbursements, and
                collection schedules.
              </p>
            </div>
          </div>

          <div className="exportBar" style={{ display: "flex", gap: "12px", flexWrap: "wrap", marginBottom: "20px", alignItems: "center" }}>
            <button className="primary autoBtn" onClick={handleExportTotal}>Export Total Portfolio (Excel)</button>
            <div style={{ display: "flex", alignItems: "center", gap: "6px", background: "#f1f5f9", padding: "2px 8px", borderRadius: "6px", border: "1px solid #cbd5e1" }}>
              <input
                type="month"
                value={reportMonth}
                onChange={(e) => setReportMonth(e.target.value)}
                style={{ border: "none", background: "transparent", outline: "none", fontSize: "14px", cursor: "pointer", color: "#0f172a" }}
              />
              <button className="primary autoBtn" style={{ background: "#059669", borderColor: "#059669", padding: "4px 10px", fontSize: "12px" }} onClick={handleExportMonthly}>Export Monthly (Excel)</button>
            </div>
            <button onClick={() => window.print()}>Export PDF / Print</button>
          </div>

          <div className="metricGrid">
            <div className="metric autoMetric">
              <span>Total Financed Portfolio</span>
              <b>{money(overview.total_disbursed || 0)}</b>
            </div>
            <div className="metric autoMetric green">
              <span>Total EMI Recovered</span>
              <b>{money(overview.total_collected || 0)}</b>
            </div>
            <div className="metric autoMetric orange">
              <span>Active Vehicle Assets</span>
              <b>{overview.total_vehicles || loans.length || 0}</b>
            </div>
          </div>

          <div className="card tableWrap">
            <div className="cardHead">
              <h3>Portfolio Summary</h3>
            </div>
            <table>
              <thead>
                <tr>
                  <th>Customer</th>
                  <th>Vehicle</th>
                  <th>Loan Amount</th>
                  <th>Interest Rate</th>
                  <th>Tenure</th>
                  <th>Collected</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {loans.map((l) => (
                  <tr key={l.id}>
                    <td>
                      <b>
                        {l.first_name} {l.last_name}
                      </b>
                    </td>
                    <td>
                      {l.make} {l.model} ({l.registration_number})
                    </td>
                    <td>{money(l.loan_amount)}</td>
                    <td>{l.interest_rate}%</td>
                    <td>{l.tenure_months} Mo</td>
                    <td className="greenText">{money(l.total_paid)}</td>
                    <td>
                      <button
                        className="payButton"
                        style={{ padding: "4px 10px", fontSize: "11.5px", background: "#f1f5f9", color: "#0f172a", border: "1px solid #cbd5e1" }}
                        onClick={() => handleExportIndividualFromId(l.id)}
                      >
                        Export Full Details
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* MODAL: ADD LOAN SCHEME */}
      {showAddLoanType && (
        <div
          className="modal"
          onClick={(event) => {
            if (event.target === event.currentTarget) setShowAddLoanType(false);
          }}
        >
          <form
            className="formCard modalForm"
            onClick={(event) => event.stopPropagation()}
            onSubmit={handleAddLoanType}
          >
            <button
              type="button"
              className="close"
              onClick={() => setShowAddLoanType(false)}
            >
              <X size={18} />
            </button>
            <div className="formTitle">
              <span className="overline autoBadgeTag">LOAN SCHEME</span>
              <h2>Create Loan Scheme</h2>
            </div>
            <div className="formGrid">
              <label>
                Scheme Name
                <input
                  required
                  placeholder="e.g. Two Wheeler Flat Scheme"
                  value={typeForm.name}
                  onChange={(e) =>
                    setTypeForm({ ...typeForm, name: e.target.value })
                  }
                />
              </label>
              <label>
                Interest Type
                <select
                  value={typeForm.interestType}
                  onChange={(e) =>
                    setTypeForm({ ...typeForm, interestType: e.target.value })
                  }
                >
                  <option value="FLAT">Flat Interest</option>
                  <option value="REDUCING">Reducing Balance</option>
                </select>
              </label>
              <label>
                Base Interest Rate (% p.a.)
                <input
                  type="number"
                  step="0.1"
                  required
                  value={typeForm.baseInterestRate}
                  onChange={(e) =>
                    setTypeForm({
                      ...typeForm,
                      baseInterestRate: e.target.value,
                    })
                  }
                />
              </label>
              <label>
                Default Tenure (Months)
                <input
                  type="number"
                  required
                  value={typeForm.defaultTenureMonths}
                  onChange={(e) =>
                    setTypeForm({
                      ...typeForm,
                      defaultTenureMonths: e.target.value,
                    })
                  }
                />
              </label>
            </div>
            <button
              className="primary autoBtn full"
              style={{ marginTop: "16px" }}
            >
              Save Scheme
            </button>
          </form>
        </div>
      )}

      {/* MODAL: CREATE VEHICLE LOAN */}
      {showCreateLoan && (
        <div
          className="modal"
          onClick={(event) => {
            if (event.target === event.currentTarget) setShowCreateLoan(false);
          }}
        >
          <form
            className="formCard modalForm"
            onClick={(event) => event.stopPropagation()}
            onSubmit={handleCreateLoan}
          >
            <button
              type="button"
              className="close"
              onClick={() => setShowCreateLoan(false)}
            >
              <X size={18} />
            </button>
            <div className="formTitle">
              <span className="overline autoBadgeTag">NEW VEHICLE LOAN</span>
              <h2>Issue Vehicle Loan & Generate EMI</h2>
              <p>
                Link customer details, loan parameters, and vehicle registration
                info.
              </p>
            </div>

            <div className="formGrid">
              <div className="formSectionHeader">
                <UserRound size={15} /> Customer Selection
              </div>
              <SearchableSelect
                label="Search & Select Customer"
                placeholder="🔍 Select existing or leave blank to create new..."
                options={[{ value: "", label: "+ Create New Customer Inline", subtext: "" }, ...customerOptions]}
                value={loanForm.customerId}
                onChange={(val) => setLoanForm({ ...loanForm, customerId: val })}
                hint="Select an existing customer or leave empty to fill details below."
              />

              {!loanForm.customerId && (
                <>
                  <div className="formSectionHeader">
                    New Customer Details
                  </div>
                  <label>
                    First Name *
                    <input
                      required={!loanForm.customerId}
                      value={loanForm.firstName}
                      onChange={(e) =>
                        setLoanForm({ ...loanForm, firstName: e.target.value })
                      }
                    />
                  </label>
                  <label>
                    Last Name *
                    <input
                      required={!loanForm.customerId}
                      value={loanForm.lastName}
                      onChange={(e) =>
                        setLoanForm({ ...loanForm, lastName: e.target.value })
                      }
                    />
                  </label>
                  <label>
                    Phone Number *
                    <input
                      required={!loanForm.customerId}
                      value={loanForm.phone}
                      onChange={(e) =>
                        setLoanForm({ ...loanForm, phone: e.target.value })
                      }
                    />
                  </label>
                  <label>
                    Email
                    <input
                      type="email"
                      value={loanForm.email}
                      onChange={(e) =>
                        setLoanForm({ ...loanForm, email: e.target.value })
                      }
                    />
                  </label>
                  <label>
                    City
                    <input
                      value={loanForm.city}
                      onChange={(e) =>
                        setLoanForm({ ...loanForm, city: e.target.value })
                      }
                    />
                  </label>
                  <label>
                    State
                    <input
                      value={loanForm.state}
                      onChange={(e) =>
                        setLoanForm({ ...loanForm, state: e.target.value })
                      }
                    />
                  </label>
                  <label className="wide">
                    Full Address
                    <textarea
                      value={loanForm.address}
                      onChange={(e) =>
                        setLoanForm({ ...loanForm, address: e.target.value })
                      }
                    />
                  </label>
                </>
              )}

              <div className="formSectionHeader">
                Loan Scheme Configuration
              </div>
              <SearchableSelect
                label="Loan Scheme Template (Optional)"
                placeholder="🔍 Choose scheme template or custom..."
                options={schemeOptions}
                value={loanForm.loanTypeId}
                onChange={(val, opt) => {
                  const scheme = opt?.scheme;
                  setLoanForm({
                    ...loanForm,
                    loanTypeId: val,
                    interestType: scheme
                      ? scheme.interest_type
                      : loanForm.interestType,
                    interestRate: scheme
                      ? scheme.base_interest_rate
                      : loanForm.interestRate,
                    tenureMonths: scheme
                      ? scheme.default_tenure_months
                      : loanForm.tenureMonths,
                  });
                }}
                hint="Loads default rate, method & tenure. You can still modify any value below!"
              />

              <div className="formSectionHeader">
                💰 Loan Parameters & Calculations
              </div>

              <label>
                Interest Method / Type *
                <select
                  value={loanForm.interestType}
                  onChange={(e) =>
                    setLoanForm({ ...loanForm, interestType: e.target.value })
                  }
                >
                  <option value="FLAT">Flat Interest Rate</option>
                  <option value="REDUCING">Reducing Balance Rate</option>
                </select>
              </label>

              <label>
                Loan Amount (₹) *
                <input
                  type="number"
                  min="1000"
                  required
                  placeholder="e.g. 75000"
                  value={loanForm.loanAmount}
                  onChange={(e) =>
                    setLoanForm({ ...loanForm, loanAmount: e.target.value })
                  }
                />
              </label>

              <label>
                Interest Rate (% p.a.) *
                <input
                  type="number"
                  step="0.1"
                  required
                  placeholder="e.g. 12"
                  value={loanForm.interestRate}
                  onChange={(e) =>
                    setLoanForm({ ...loanForm, interestRate: e.target.value })
                  }
                />
              </label>

              <label>
                Tenure (Months) *
                <input
                  type="number"
                  min="1"
                  max="84"
                  required
                  placeholder="e.g. 12"
                  value={loanForm.tenureMonths}
                  onChange={(e) =>
                    setLoanForm({ ...loanForm, tenureMonths: e.target.value })
                  }
                />
              </label>

              <label>
                Loan Start Date *
                <input
                  type="date"
                  required
                  value={loanForm.startDate}
                  onChange={(e) =>
                    setLoanForm({ ...loanForm, startDate: e.target.value })
                  }
                />
              </label>

              <div className="formSectionHeader" style={{ marginTop: "24px" }}>
                💰 Deductions & Fees
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: "10px" }}>
                <label>Income Due <input type="number" className="autoInput" value={loanForm.incomeDue} onChange={(e) => setLoanForm({ ...loanForm, incomeDue: Number(e.target.value) })} /></label>
                <label>Document <input type="number" className="autoInput" value={loanForm.documentFee} onChange={(e) => setLoanForm({ ...loanForm, documentFee: Number(e.target.value) })} /></label>
                <label>Hire Purchase <input type="number" className="autoInput" value={loanForm.hirePurchase} onChange={(e) => setLoanForm({ ...loanForm, hirePurchase: Number(e.target.value) })} /></label>
                <label>Tax Amount <input type="number" className="autoInput" value={loanForm.taxAmount} onChange={(e) => setLoanForm({ ...loanForm, taxAmount: Number(e.target.value) })} /></label>
                <label>Insurance <input type="number" className="autoInput" value={loanForm.insurance} onChange={(e) => setLoanForm({ ...loanForm, insurance: Number(e.target.value) })} /></label>
                <label>Ins. Fine <input type="number" className="autoInput" value={loanForm.insuranceFine} onChange={(e) => setLoanForm({ ...loanForm, insuranceFine: Number(e.target.value) })} /></label>
                <label>Green Tax <input type="number" className="autoInput" value={loanForm.greenTax} onChange={(e) => setLoanForm({ ...loanForm, greenTax: Number(e.target.value) })} /></label>
                <label>Fine <input type="number" className="autoInput" value={loanForm.fine} onChange={(e) => setLoanForm({ ...loanForm, fine: Number(e.target.value) })} /></label>
                <label>National Tax <input type="number" className="autoInput" value={loanForm.nationalTax} onChange={(e) => setLoanForm({ ...loanForm, nationalTax: Number(e.target.value) })} /></label>
                <label>Permit <input type="number" className="autoInput" value={loanForm.permit} onChange={(e) => setLoanForm({ ...loanForm, permit: Number(e.target.value) })} /></label>
                <label>Brokerage (Cust.) <input type="number" className="autoInput" value={loanForm.brokerageCustomer} onChange={(e) => setLoanForm({ ...loanForm, brokerageCustomer: Number(e.target.value) })} /></label>
                <label>Brokerage (Hand) <input type="number" className="autoInput" value={loanForm.brokerageHand} onChange={(e) => setLoanForm({ ...loanForm, brokerageHand: Number(e.target.value) })} /></label>
              </div>

              {/* LIVE EMI CALCULATION PREVIEW BOX (FLAT & REDUCING) */}
              <div style={{ background: "#f8fafc", padding: "16px", borderRadius: "8px", border: "1px dashed #cbd5e1", marginTop: "12px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ color: "#64748b", fontWeight: 600 }}>Total Loan Amount:</span>
                  <b style={{ fontSize: "16px", color: "#0f172a" }}>₹{Number(loanForm.loanAmount || 0).toLocaleString()}</b>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "8px" }}>
                  <span style={{ color: "#ef4444", fontWeight: 600 }}>Total Deductions:</span>
                  <b style={{ fontSize: "15px", color: "#ef4444" }}>- ₹{(Number(loanForm.incomeDue || 0) + Number(loanForm.documentFee || 0) + Number(loanForm.hirePurchase || 0) + Number(loanForm.taxAmount || 0) + Number(loanForm.insurance || 0) + Number(loanForm.insuranceFine || 0) + Number(loanForm.greenTax || 0) + Number(loanForm.fine || 0) + Number(loanForm.nationalTax || 0) + Number(loanForm.permit || 0) + Number(loanForm.brokerageCustomer || 0)).toLocaleString()}</b>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "12px", borderTop: "1px solid #e2e8f0", paddingTop: "12px" }}>
                  <span style={{ color: "#059669", fontWeight: 700, fontSize: "16px" }}>In-Hand Amount (Disbursed):</span>
                  <b style={{ fontSize: "20px", color: "#059669" }}>₹{(Number(loanForm.loanAmount || 0) - (Number(loanForm.incomeDue || 0) + Number(loanForm.documentFee || 0) + Number(loanForm.hirePurchase || 0) + Number(loanForm.taxAmount || 0) + Number(loanForm.insurance || 0) + Number(loanForm.insuranceFine || 0) + Number(loanForm.greenTax || 0) + Number(loanForm.fine || 0) + Number(loanForm.nationalTax || 0) + Number(loanForm.permit || 0) + Number(loanForm.brokerageCustomer || 0))).toLocaleString()}</b>
                </div>
              </div>

              {Boolean(loanForm.loanAmount && loanForm.tenureMonths) &&
                (() => {
                  const P = parseFloat(loanForm.loanAmount || 0);
                  const rateVal = parseFloat(loanForm.interestRate || 0);
                  const n = parseInt(loanForm.tenureMonths || 12);
                  const isReducing = loanForm.interestType === "REDUCING";

                  let monthlyEmi = 0;
                  let totalInt = 0;
                  let totalPay = 0;

                  if (isReducing && rateVal > 0 && n > 0) {
                    const rMo = rateVal / 100 / 12;
                    monthlyEmi =
                      (P * rMo * Math.pow(1 + rMo, n)) /
                      (Math.pow(1 + rMo, n) - 1);
                    totalPay = monthlyEmi * n;
                    totalInt = totalPay - P;
                  } else {
                    totalInt = P * (rateVal / 100) * (n / 12);
                    totalPay = P + totalInt;
                    monthlyEmi = n > 0 ? totalPay / n : 0;
                  }

                  return (
                    <div className="breakdown">
                      <div>
                        <span>Monthly EMI ({loanForm.interestType})</span>
                        <b>{money(monthlyEmi)}</b>
                      </div>
                      <div>
                        <span>Total Interest</span>
                        <b>{money(totalInt)}</b>
                      </div>
                      <div>
                        <span>Principal</span>
                        <b>{money(P)}</b>
                      </div>
                      <div>
                        <span>Total Payable</span>
                        <b>{money(totalPay)}</b>
                      </div>
                    </div>
                  );
                })()}

              <div className="formSectionHeader">
                <CarFront size={15} /> Vehicle Specifications
              </div>

              <label>
                Vehicle Type
                <select
                  value={loanForm.vehicleType}
                  onChange={(e) =>
                    setLoanForm({ ...loanForm, vehicleType: e.target.value })
                  }
                >
                  <option value="TWO_WHEELER">
                    Two-Wheeler (Bike / Scooter)
                  </option>
                  <option value="CAR">Car / SUV</option>
                  <option value="COMMERCIAL">Commercial Vehicle</option>
                </select>
              </label>

              <label>
                Make / Brand
                <input
                  placeholder="e.g. Honda, Hero, Hyundai"
                  value={loanForm.make}
                  onChange={(e) =>
                    setLoanForm({ ...loanForm, make: e.target.value })
                  }
                />
              </label>

              <label>
                Model
                <input
                  placeholder="e.g. Activa 6G, Creta"
                  value={loanForm.model}
                  onChange={(e) =>
                    setLoanForm({ ...loanForm, model: e.target.value })
                  }
                />
              </label>

              <label>
                Registration Number
                <input
                  placeholder="e.g. TN-01-AB-1234"
                  value={loanForm.registrationNumber}
                  onChange={(e) =>
                    setLoanForm({
                      ...loanForm,
                      registrationNumber: e.target.value,
                    })
                  }
                />
              </label>

              <label>
                Chassis Number
                <input
                  placeholder="Chassis No"
                  value={loanForm.chassisNumber}
                  onChange={(e) =>
                    setLoanForm({ ...loanForm, chassisNumber: e.target.value })
                  }
                />
              </label>

              <label>
                Engine Number
                <input
                  placeholder="Engine No"
                  value={loanForm.engineNumber}
                  onChange={(e) =>
                    setLoanForm({ ...loanForm, engineNumber: e.target.value })
                  }
                />
              </label>
            </div>

            <button className="primary autoBtn full">
              Generate Loan & EMI Schedule
            </button>
          </form>
        </div>
      )}

      {/* MODAL: LOAN DETAILS & EMI SCHEDULE TABLE */}
      {selectedLoan && (
        <div
          className="modal"
          onClick={(event) => {
            if (event.target === event.currentTarget) setSelectedLoan(null);
          }}
        >
          <div
            className="detailsCard autoLoanDossier"
            onClick={(event) => event.stopPropagation()}
            style={{ width: "min(92vw, 1040px)", maxWidth: "1040px" }}
          >
            <button className="close" onClick={() => setSelectedLoan(null)}>
              <X size={18} />
            </button>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "flex-start",
                flexWrap: "wrap",
                gap: "10px",
              }}
            >
              <div>
                <span className="overline autoBadgeTag">
                  VEHICLE LOAN AGREEMENT &amp; BORROWER DETAILS
                </span>
                <h2 style={{ marginTop: "4px" }}>
                  {selectedLoan.loan.first_name} {selectedLoan.loan.last_name}
                </h2>
                <p style={{ margin: "2px 0 0", color: "#64748b" }}>
                  <IdCard size={13} /> Customer Code:{" "}
                  <b>{selectedLoan.loan.customer_code}</b> ·
                  <Phone size={13} /> Phone:{" "}
                  {selectedLoan.loan.phone ? (
                    <PhoneLink phone={selectedLoan.loan.phone} />
                  ) : (
                    <b>Not provided</b>
                  )}{" "}
                  {selectedLoan.loan.email ? (
                    <>
                      <Mail size={13} /> {selectedLoan.loan.email}
                    </>
                  ) : (
                    ""
                  )}
                </p>
                {selectedLoan.loan.address && (
                  <p
                    style={{
                      margin: "2px 0 0",
                      color: "#64748b",
                      fontSize: "13px",
                    }}
                  >
                    <MapPin size={13} /> Address: {selectedLoan.loan.address}
                  </p>
                )}
              </div>
              <span
                className="tag active"
                style={{ fontSize: "13px", padding: "6px 14px" }}
              >
                {selectedLoan.loan.status}
              </span>
            </div>

            {/* FINANCIAL SUMMARY */}
            <div className="loanSummaryGrid">
              <div className="loanSummaryMetric">
                <div className="loanSummaryLabel">
                  <span>
                    <Banknote size={15} />
                  </span>{" "}
                  Loan disbursed
                </div>
                <strong>{money(selectedLoan.loan.loan_amount)}</strong>
                <small>Principal amount</small>
              </div>
              <div className="loanSummaryMetric">
                <div className="loanSummaryLabel">
                  <span>
                    <Percent size={15} />
                  </span>{" "}
                  Interest rate
                </div>
                <strong>{selectedLoan.loan.interest_rate}%</strong>
                <small>
                  {selectedLoan.loan.interest_type || "FLAT"} interest
                </small>
              </div>
              <div className="loanSummaryMetric">
                <div className="loanSummaryLabel">
                  <span>
                    <CalendarClock size={15} />
                  </span>{" "}
                  Tenure
                </div>
                <strong>{selectedLoan.loan.tenure_months}</strong>
                <small>Months</small>
              </div>
              <div className="loanSummaryMetric collected">
                <div className="loanSummaryLabel">
                  <span>
                    <CircleDollarSign size={15} />
                  </span>{" "}
                  Total collected
                </div>
                <strong>
                  {money(
                    selectedLoan.schedules?.reduce(
                      (acc, s) => acc + parseFloat(s.total_cash_collected || s.collected_amount || 0),
                      0,
                    ),
                  )}
                </strong>
                <small>Paid installments</small>
              </div>
              <div className="loanSummaryMetric remaining">
                <div className="loanSummaryLabel">
                  <span>
                    <Banknote size={15} />
                  </span>{" "}
                  Remaining balance
                </div>
                <strong>
                  {money(
                    selectedLoan.schedules?.reduce(
                      (acc, s) => acc + parseFloat(s.remaining_emi_amount ?? s.total_emi ?? 0),
                      0,
                    ),
                  )}
                </strong>
                <small>Pending installments</small>
              </div>
            </div>

            {/* VEHICLE ASSET SPECIFICATIONS */}
            <div
              style={{
                background: "#f8fafc",
                padding: "14px 18px",
                borderRadius: "12px",
                border: "1px solid #e2e8f0",
                margin: "16px 0",
                fontSize: "13px",
                display: "flex",
                flexWrap: "wrap",
                gap: "16px 28px",
              }}
            >
              <div>
                <span>
                  <CarFront size={14} /> Vehicle:
                </span>{" "}
                <b>
                  {selectedLoan.loan.make} {selectedLoan.loan.model} (
                  {selectedLoan.loan.year || "2026"})
                </b>
              </div>
              <div>
                <span>
                  <Tags size={14} /> Type:
                </span>{" "}
                <b>{selectedLoan.loan.vehicle_type || "TWO_WHEELER"}</b>
              </div>
              <div>
                <span>
                  <IdCard size={14} /> Reg No:
                </span>{" "}
                <b className="autoRegNo">
                  {selectedLoan.loan.registration_number || "PENDING"}
                </b>
              </div>
              <div>
                <span>
                  <Wrench size={14} /> Chassis No:
                </span>{" "}
                <b>{selectedLoan.loan.chassis_number || "—"}</b>
              </div>
              <div>
                <span>
                  <Zap size={14} /> Engine No:
                </span>{" "}
                <b>{selectedLoan.loan.engine_number || "—"}</b>
              </div>
              {selectedLoan.loan.insurance_details && (
                <div>
                  <span>
                    <ShieldCheck size={14} /> Insurance:
                  </span>{" "}
                  <b>{selectedLoan.loan.insurance_details}</b>
                </div>
              )}
            </div>

            <div className="card tableWrap" style={{ marginTop: "16px" }}>
              <div className="cardHead" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "10px" }}>
                <h3>
                  EMI Installment Schedule (
                  {selectedLoan.schedules?.filter((s) => s.status === "PAID")
                    .length || 0}{" "}
                  / {selectedLoan.schedules?.length || 0} Paid)
                </h3>
                <div style={{ display: "flex", gap: "10px" }}>
                  {selectedLoan.loan.status !== 'COMPLETED' && (
                    <button
                      className="primary autoBtn"
                      style={{ padding: "4px 10px", fontSize: "12px", background: "#ef4444", borderColor: "#ef4444" }}
                      onClick={() => handleOpenCloseLoan(selectedLoan)}
                    >
                      Close Loan Early
                    </button>
                  )}
                  <button
                    className="primary autoBtn"
                    style={{ padding: "4px 10px", fontSize: "12px", background: "#3b82f6", borderColor: "#3b82f6" }}
                    onClick={() => handleExportIndividual(selectedLoan)}
                  >
                    Download Schedule (Excel)
                  </button>
                </div>
              </div>
              <table>
                <thead>
                  <tr>
                    <th>Inst #</th>
                    <th>Due Date</th>
                    <th>Principal</th>
                    <th>Interest</th>
                    <th>Total EMI</th>
                    <th>Status</th>
                    <th>EMI</th>
                  </tr>
                </thead>
                <tbody>
                  {(() => {
                    const earliestUnpaid = selectedLoan.schedules?.find(
                      (item) => item.status === "PENDING" || item.status === "PARTIAL"
                    );
                    return selectedLoan.schedules?.map((s) => {
                      const isEarliestDue = earliestUnpaid && earliestUnpaid.id === s.id;
                      const hasPriorUnpaid = earliestUnpaid && earliestUnpaid.installment_number < s.installment_number;

                      return (
                        <tr key={s.id}>
                          <td>
                            <b>#{s.installment_number}</b>
                          </td>
                          <td>{dateLabel(s.due_date)}</td>

                          {/* PRINCIPAL COLUMN */}
                          <td>
                            <b>{money(s.scheduled_principal)}</b>
                            {s.status === "PARTIAL" && Number(s.paid_principal || 0) > 0 && (
                              <small style={{ display: "block", color: "#059669", fontSize: "11px" }}>
                                Paid: {money(s.paid_principal)}
                              </small>
                            )}
                            {Number(s.extra_principal_paid || 0) > 0 && (
                              <small style={{ display: "block", color: "#16a34a", fontSize: "11px" }}>
                                Extra: {money(s.extra_principal_paid)}
                              </small>
                            )}
                            {s.status === "PARTIAL" && Number(s.remaining_principal || 0) > 0 && (
                              <small style={{ display: "block", color: "#dc2626", fontSize: "11px" }}>
                                Rem: {money(s.remaining_principal)}
                              </small>
                            )}
                          </td>

                          {/* INTEREST COLUMN */}
                          <td>
                            <b>{money(s.scheduled_interest)}</b>
                            {s.status === "PARTIAL" && Number(s.paid_interest || 0) > 0 && (
                              <small style={{ display: "block", color: "#059669", fontSize: "11px" }}>
                                Paid: {money(s.paid_interest)}
                              </small>
                            )}
                            {s.status === "PARTIAL" && Number(s.remaining_interest || 0) > 0 && (
                              <small style={{ display: "block", color: "#dc2626", fontSize: "11px" }}>
                                Rem: {money(s.remaining_interest)}
                              </small>
                            )}
                          </td>

                          {/* TOTAL EMI COLUMN */}
                          <td>
                            <b>{money(s.scheduled_emi)}</b>
                            {s.status === "PARTIAL" && (
                              <small style={{ display: "block", color: "#d97706", fontWeight: "bold", fontSize: "11px" }}>
                                Bal Due: {money(s.remaining_emi_amount)}
                              </small>
                            )}
                          </td>

                          {/* STATUS COLUMN */}
                          <td>
                            {s.status === "PAID" ? (
                              <div style={{ display: "flex", flexDirection: "column", gap: "3px" }}>
                                <span className="tag" style={{ background: "#dcfce7", color: "#15803d", borderColor: "#86efac", width: "fit-content" }}>
                                  PAID
                                </span>
                                {Number(s.extra_principal_paid || 0) > 0 && (
                                  <span style={{ fontSize: "11px", color: "#16a34a", fontWeight: "500" }}>
                                    Extra Principal: {money(s.extra_principal_paid)}
                                  </span>
                                )}
                                <span style={{ fontSize: "11px", fontWeight: "bold", color: "#0f172a" }}>
                                  Total Collected: {money(s.total_cash_collected)}
                                </span>
                              </div>
                            ) : s.status === "PARTIAL" ? (
                              <div style={{ display: "flex", flexDirection: "column", gap: "3px" }}>
                                <span className="tag" style={{ background: "#fef08a", color: "#854d0e", borderColor: "#fde047", width: "fit-content" }}>
                                  PARTIAL
                                </span>
                                <span style={{ fontSize: "11px", color: "#64748b" }}>
                                  Paid: {money(s.scheduled_amount_paid)}
                                </span>
                                {Number(s.extra_principal_paid || 0) > 0 && (
                                  <span style={{ fontSize: "11px", color: "#16a34a", fontWeight: "500" }}>
                                    Extra Principal: {money(s.extra_principal_paid)}
                                  </span>
                                )}
                              </div>
                            ) : s.status === "CANCELLED" ? (
                              <span className="tag" style={{ background: "#f1f5f9", color: "#64748b", borderColor: "#cbd5e1" }}>
                                CANCELLED
                              </span>
                            ) : (
                              <span className="tag">PENDING</span>
                            )}
                          </td>

                          {/* ACTION COLUMN */}
                          <td>
                            {selectedLoan.loan.status === "COMPLETED" || s.status === "CANCELLED" ? (
                              <div style={{ color: s.status === "PAID" ? "#047857" : "#94a3b8", fontWeight: s.status === "PAID" ? "bold" : "normal", fontSize: "12px" }}>
                                {s.status === "PAID" ? money(s.collected_amount || s.total_emi) : "Cancelled"}
                              </div>
                            ) : s.status !== "PAID" ? (
                              <button
                                className="payButton"
                                style={{
                                  background: isEarliestDue ? "#059669" : hasPriorUnpaid ? "#64748b" : "#2563eb",
                                  borderColor: isEarliestDue ? "#059669" : hasPriorUnpaid ? "#64748b" : "#2563eb",
                                  color: "#fff",
                                  fontWeight: "700",
                                }}
                                title={hasPriorUnpaid ? `Installment #${earliestUnpaid.installment_number} is unpaid and must be cleared first` : undefined}
                                onClick={() => {
                                  if (hasPriorUnpaid) {
                                    setNotice?.({
                                      type: "info",
                                      text: `Installment #${earliestUnpaid.installment_number} is pending. Auto-routed payment to Installment #${earliestUnpaid.installment_number} to maintain chronological order.`
                                    });
                                    setPayEmiModal({
                                      loanId: selectedLoan.loan.id,
                                      emiId: earliestUnpaid.id,
                                      totalEmi: earliestUnpaid.total_emi,
                                      instNo: earliestUnpaid.installment_number,
                                      remainingEmi: earliestUnpaid.status === "PARTIAL" ? earliestUnpaid.remaining_emi_amount : earliestUnpaid.total_emi,
                                    });
                                    setPayForm({
                                      amountPaid: earliestUnpaid.status === "PARTIAL" ? earliestUnpaid.remaining_emi_amount : earliestUnpaid.total_emi,
                                      paymentMethod: "CASH",
                                      referenceNumber: "",
                                    });
                                    return;
                                  }

                                  setPayEmiModal({
                                    loanId: selectedLoan.loan.id,
                                    emiId: s.id,
                                    totalEmi: s.total_emi,
                                    instNo: s.installment_number,
                                    remainingEmi: s.status === "PARTIAL" ? s.remaining_emi_amount : s.total_emi,
                                  });
                                  setPayForm({
                                    amountPaid: s.status === "PARTIAL" ? s.remaining_emi_amount : s.total_emi,
                                    paymentMethod: "CASH",
                                    referenceNumber: "",
                                  });
                                }}
                              >
                                {isEarliestDue ? "Collect EMI" : hasPriorUnpaid ? `Pay Due (#${earliestUnpaid.installment_number})` : "Pay Advance"}
                              </button>
                            ) : (
                              <div style={{ color: "#047857", fontWeight: "bold", fontSize: "13px" }}>
                                {money(s.collected_amount || s.total_emi)}
                              </div>
                            )}
                          </td>
                        </tr>
                      );
                    });
                  })()}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: PAY EMI */}
      {payEmiModal && (
        <div
          className="modal"
          onClick={(event) => {
            if (event.target === event.currentTarget) setPayEmiModal(null);
          }}
        >
          <form
            className="paymentCard"
            onClick={(event) => event.stopPropagation()}
            onSubmit={handlePayEmi}
          >
            <button
              type="button"
              className="close"
              onClick={() => setPayEmiModal(null)}
            >
              <X size={18} />
            </button>
            <span className="overline autoBadgeTag">COLLECT EMI</span>
            <h2>Installment #{payEmiModal.instNo}</h2>
            {payEmiModal.remainingEmi !== payEmiModal.totalEmi && (
              <p style={{ margin: "-5px 0 15px 0", fontSize: "13px", color: "#64748b" }}>
                Remaining Amount: <b style={{ color: "#ef4444" }}>{money(payEmiModal.remainingEmi)}</b>
              </p>
            )}
            <label>
              Amount (₹)
              <input
                type="number"
                required
                value={payForm.amountPaid}
                onChange={(e) =>
                  setPayForm({ ...payForm, amountPaid: e.target.value })
                }
              />
            </label>
            <label>
              Payment Method
              <select
                value={payForm.paymentMethod}
                onChange={(e) =>
                  setPayForm({ ...payForm, paymentMethod: e.target.value })
                }
              >
                <option value="CASH">Cash</option>
                <option value="UPI">UPI / GPay / PhonePe</option>
                <option value="BANK_TRANSFER">Bank Transfer</option>
              </select>
            </label>
            <label>
              Reference / UTR No
              <input
                placeholder="Transaction ID (optional)"
                value={payForm.referenceNumber}
                onChange={(e) =>
                  setPayForm({ ...payForm, referenceNumber: e.target.value })
                }
              />
            </label>
            <button
              className="primary autoBtn full"
              style={{ marginTop: "14px" }}
            >
              Confirm Payment
            </button>
          </form>
        </div>
      )}

      {closeLoanModal && (
        <div
          className="closeLoanOverlay"
          onClick={(event) => {
            if (event.target === event.currentTarget) {
              setCloseLoanModal(null);
            }
          }}
        >
          <form
            className="closeLoanCard"
            onClick={(e) => e.stopPropagation()}
            onSubmit={submitCloseLoan}
          >
            <div className="closeLoanHeader">
              <h3>
                <CheckCircle2 size={19} style={{ color: "#dc2626" }} />
                Close Loan Early
              </h3>
              <button
                type="button"
                className="closeLoanCloseBtn"
                onClick={() => setCloseLoanModal(null)}
                title="Cancel"
              >
                <X size={15} />
              </button>
            </div>

            <div className="closeLoanGrid">
              <div className="closeLoanField">
                <label className="closeLoanLabel">Principal (₹)</label>
                <div className="closeLoanInputWrap">
                  <span className="closeLoanPrefix">₹</span>
                  <input
                    type="number"
                    min="0"
                    required
                    className="closeLoanInput"
                    value={closeLoanModal.principalAmount}
                    onChange={(e) =>
                      setCloseLoanModal({
                        ...closeLoanModal,
                        principalAmount: Number(e.target.value),
                      })
                    }
                  />
                </div>
              </div>

              <div className="closeLoanField">
                <label className="closeLoanLabel">Interest (%)</label>
                <div className="closeLoanInputWrap">
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="0"
                    className="closeLoanInputPercent"
                    value={closeLoanModal.interestPercent === "" ? "" : closeLoanModal.interestPercent}
                    onChange={(e) =>
                      setCloseLoanModal({
                        ...closeLoanModal,
                        interestPercent: e.target.value === "" ? "" : Number(e.target.value),
                      })
                    }
                  />
                  <span className="closeLoanSuffix">%</span>
                </div>
              </div>
            </div>

            {(() => {
              const p = Number(closeLoanModal.principalAmount || 0);
              const pct = Number(closeLoanModal.interestPercent || 0);
              const interestAmt = Math.round((p * pct) / 100);
              const totalAmt = p + interestAmt;

              return (
                <div className="closeLoanSummaryBox">
                  <div>
                    <div className="closeLoanSummaryLabel">Total Settlement</div>
                    <div className="closeLoanSummarySub">
                      ₹{p.toLocaleString()} + {pct}% (₹{interestAmt.toLocaleString()})
                    </div>
                  </div>
                  <div className="closeLoanSummaryValue">
                    ₹{totalAmt.toLocaleString()}
                  </div>
                </div>
              );
            })()}

            <div className="closeLoanField" style={{ marginBottom: "10px" }}>
              <label className="closeLoanLabel">Payment Method</label>
              <div className="closeLoanSegmented">
                <button
                  type="button"
                  className={`closeLoanSegmentBtn ${closeLoanModal.paymentMethod === "CASH" ? "active" : ""}`}
                  onClick={() =>
                    setCloseLoanModal({ ...closeLoanModal, paymentMethod: "CASH" })
                  }
                >
                  Cash
                </button>
                <button
                  type="button"
                  className={`closeLoanSegmentBtn ${closeLoanModal.paymentMethod === "UPI" ? "active" : ""}`}
                  onClick={() =>
                    setCloseLoanModal({ ...closeLoanModal, paymentMethod: "UPI" })
                  }
                >
                  UPI
                </button>
                <button
                  type="button"
                  className={`closeLoanSegmentBtn ${closeLoanModal.paymentMethod === "BANK_TRANSFER" ? "active" : ""}`}
                  onClick={() =>
                    setCloseLoanModal({ ...closeLoanModal, paymentMethod: "BANK_TRANSFER" })
                  }
                >
                  Bank
                </button>
              </div>
            </div>

            <div className="closeLoanField">
              <label className="closeLoanLabel">Reference / UTR (Optional)</label>
              <input
                type="text"
                className="closeLoanTextInput"
                placeholder="UTR / Cheque / Txn ID"
                value={closeLoanModal.referenceNumber || ""}
                onChange={(e) =>
                  setCloseLoanModal({
                    ...closeLoanModal,
                    referenceNumber: e.target.value,
                  })
                }
              />
            </div>

            <div className="closeLoanActions">
              <button
                type="button"
                className="closeLoanCancelBtn"
                onClick={() => setCloseLoanModal(null)}
              >
                Cancel
              </button>
              <button type="submit" className="closeLoanSubmitBtn">
                Confirm &amp; Close
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}

function SearchableSelect({
  label,
  placeholder,
  options,
  value,
  onChange,
  required,
  hint,
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const dropdownRef = useRef(null);

  const selectedOption = options.find((o) => o.value === value);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const filteredOptions = useMemo(() => {
    if (!searchTerm) return options;
    return options.filter(
      (o) =>
        (o.label && o.label.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (o.subtext &&
          o.subtext.toLowerCase().includes(searchTerm.toLowerCase())),
    );
  }, [options, searchTerm]);

  return (
    <div className="searchableSelectWrap" ref={dropdownRef}>
      <label>
        {label} {required && "*"}
      </label>
      <div
        className={`searchableSelectControl ${isOpen ? "active" : ""}`}
        onClick={() => setIsOpen(!isOpen)}
      >
        <span>
          {selectedOption ? selectedOption.label : placeholder || "Select..."}
        </span>
        <i className="dropdownArrow">▾</i>
      </div>

      {isOpen && (
        <div className="searchableDropdownMenu">
          <div className="searchableSearchBox">
            <input
              autoFocus
              placeholder="🔍 Search option..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onClick={(e) => e.stopPropagation()}
            />
          </div>
          <div className="searchableOptionList">
            {filteredOptions.map((opt) => (
              <div
                key={opt.value}
                className={`searchableOptionItem ${opt.value === value ? "selected" : ""}`}
                onClick={(e) => {
                  e.stopPropagation();
                  onChange(opt.value, opt);
                  setIsOpen(false);
                  setSearchTerm("");
                }}
              >
                <b>{opt.label}</b>
                {opt.subtext && <small>{opt.subtext}</small>}
              </div>
            ))}
            {!filteredOptions.length && (
              <div className="noOptions">No matches found</div>
            )}
          </div>
        </div>
      )}
      {hint && <small className="fieldHint">{hint}</small>}
    </div>
  );
}

function AutoCustomerDetails({ customer, loans, close }) {
  const fullName =
    `${customer.first_name || ""} ${customer.last_name || ""}`.trim();
  return (
    <div
      className="modal"
      onClick={(event) => {
        if (event.target === event.currentTarget) close();
      }}
    >
      <div
        className="detailsCard customerProfileCard"
        onClick={(event) => event.stopPropagation()}
      >
        <button
          className="close"
          onClick={close}
          aria-label="Close customer details"
        >
          <X size={18} />
        </button>
        <div className="customerProfileHeader">
          <div>
            <span className="overline autoBadgeTag">AUTO FINANCE CUSTOMER</span>
            <h2>{fullName || "Customer details"}</h2>
            <span className="tag autoTag">
              {customer.customer_code || "NO CODE"}
            </span>
          </div>
        </div>
        <div className="customerProfileGrid">
          <div>
            <Phone size={16} />
            <span>
              Phone
              {customer.phone ? (
                <a className="phoneLink" href={`tel:${customer.phone}`}>
                  <strong>{customer.phone}</strong>
                </a>
              ) : (
                <strong>Not provided</strong>
              )}
            </span>
          </div>
          <div>
            <Mail size={16} />
            <span>
              Email<strong>{customer.email || "Not provided"}</strong>
            </span>
          </div>
          <div>
            <MapPin size={16} />
            <span>
              Location
              <strong>
                {customer.city
                  ? `${customer.city}, ${customer.state || ""}`
                  : "Not provided"}
              </strong>
            </span>
          </div>
          <div>
            <MapPin size={16} />
            <span>
              Address<strong>{customer.address || "Not provided"}</strong>
            </span>
          </div>
        </div>
        <div className="customerLoanSection">
          <div className="customerLoanSectionHead">
            <div>
              <span className="overline">LOAN PORTFOLIO</span>
              <h3>Vehicle loan details</h3>
            </div>
            <span className="tag autoTag">
              {loans.length} {loans.length === 1 ? "Loan" : "Loans"}
            </span>
          </div>
          {loans.length ? (
            loans.map((loan) => (
              <div className="customerLoanRow" key={loan.id}>
                <div className="customerLoanTitle">
                  <span className="customerLoanIcon">
                    <CarFront size={16} />
                  </span>
                  <div>
                    <strong>
                      {loan.make || "Vehicle loan"} {loan.model || ""}
                    </strong>
                    <small>
                      {loan.registration_number ||
                        loan.vehicle_type ||
                        "Vehicle details unavailable"}
                    </small>
                  </div>
                  <span className="tag">{loan.status || "ACTIVE"}</span>
                </div>
                <div className="customerLoanMeta">
                  <span>
                    <Banknote size={14} /> Amount
                    <strong>{money(loan.loan_amount)}</strong>
                  </span>
                  <span>
                    <Percent size={14} /> Rate
                    <strong>
                      {loan.interest_rate}% {loan.interest_type || "FLAT"}
                    </strong>
                  </span>
                  <span>
                    <CalendarClock size={14} /> Tenure
                    <strong>{loan.tenure_months} months</strong>
                  </span>
                  <span>
                    <Banknote size={14} /> Paid
                    <strong>{money(loan.total_paid)}</strong>
                  </span>
                </div>
              </div>
            ))
          ) : (
            <div className="customerLoanEmpty">
              No vehicle loans linked to this customer.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function PhoneLink({ phone, icon = false }) {
  return (
    <a
      className="phoneLink"
      href={`tel:${phone}`}
      onClick={(event) => event.stopPropagation()}
    >
      {icon && <Phone size={13} />} {phone}
    </a>
  );
}
