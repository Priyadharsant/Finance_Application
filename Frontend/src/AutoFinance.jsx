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

  // Modals
  const [showAddCustomer, setShowAddCustomer] = useState(false);
  const [showAddLoanType, setShowAddLoanType] = useState(false);
  const [showCreateLoan, setShowCreateLoan] = useState(false);
  const [payEmiModal, setPayEmiModal] = useState(null);

  // Form states
  const [custForm, setCustForm] = useState({
    firstName: "",
    lastName: "",
    phone: "",
    email: "",
    city: "",
    state: "",
    address: "",
  });
  const [typeForm, setTypeForm] = useState({
    name: "",
    interestType: "FLAT",
    baseInterestRate: "12",
    defaultTenureMonths: "12",
  });
  const [loanForm, setLoanForm] = useState({
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
  });
  const [payForm, setPayForm] = useState({
    amountPaid: "",
    paymentMethod: "CASH",
    referenceNumber: "",
  });

  // Filters
  const [search, setSearch] = useState("");

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
  const handleAddCustomer = async (e) => {
    e.preventDefault();
    try {
      await apiCall("/customers", {
        method: "POST",
        body: JSON.stringify(custForm),
      });
      setNotice?.({
        type: "success",
        text: "Auto Finance customer created successfully!",
      });
      setShowAddCustomer(false);
      setCustForm({
        firstName: "",
        lastName: "",
        phone: "",
        email: "",
        city: "",
        state: "",
        address: "",
      });
      loadData();
    } catch (err) {
      setNotice?.({ type: "error", text: err.message });
    }
  };

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

  const openLoanDetails = async (loanId) => {
    try {
      const res = await apiCall(`/loans/${loanId}`);
      if (res.success) setSelectedLoan(res.data);
    } catch (err) {
      setNotice?.({ type: "error", text: err.message });
    }
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

  const filteredLoans = useMemo(() => {
    return loans.filter(
      (l) =>
        !search ||
        `${l.first_name} ${l.last_name}`
          .toLowerCase()
          .includes(search.toLowerCase()) ||
        (l.registration_number &&
          l.registration_number.toLowerCase().includes(search.toLowerCase())) ||
        (l.make && l.make.toLowerCase().includes(search.toLowerCase())) ||
        (l.model && l.model.toLowerCase().includes(search.toLowerCase())),
    );
  }, [loans, search]);

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

          {/* 10 EXECUTIVE KPI METRIC CARDS INCLUDING TODAY & OVERDUE DUES */}
          <div
            className="metricGrid"
            style={{
              gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))",
            }}
          >
            {/* 1. TODAY'S DUE */}
            <div className="metric autoMetric orange">
              <span>Today's EMI Due</span>
              <b style={{ color: "#d97706" }}>
                {money(overview.today_due_amount || 0)}
              </b>
              <small
                style={{
                  color: "#d97706",
                  fontWeight: 700,
                  fontSize: "11.5px",
                  marginTop: "4px",
                  display: "block",
                }}
              >
                <CalendarDays size={14} /> {overview.today_due_count || 0} EMIs
                Due Today
              </small>
            </div>

            {/* 2. OUTSTANDING OVERDUE */}
            <div className="metric autoMetric red">
              <span>Outstanding Overdue</span>
              <b style={{ color: "#dc2626" }}>
                {money(overview.overdue_amount || 0)}
              </b>
              <small
                style={{
                  color: "#dc2626",
                  fontWeight: 700,
                  fontSize: "11.5px",
                  marginTop: "4px",
                  display: "block",
                }}
              >
                <AlertTriangle size={14} /> {overview.overdue_count || 0} EMIs
                Due / Overdue
              </small>
            </div>

            {/* 3. TOTAL DISBURSED */}
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

            {/* 4. TOTAL EXPECTED RETURN */}
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

            {/* 5. TOTAL EMI COLLECTED */}
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

            {/* 6. OUTSTANDING RECEIVABLE */}
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

            {/* 7. PROJECTED PROFIT */}
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

            {/* 8. RECOVERY EFFICIENCY RATE */}
            <div className="metric autoMetric purple">
              <span>Recovery Efficiency</span>
              <b style={{ color: "#4f46e5" }}>
                {overview.recovery_rate || "0.0"}%
              </b>
              <small
                style={{
                  color: "#64748b",
                  fontSize: "11.5px",
                  marginTop: "4px",
                  display: "block",
                }}
              >
                {overview.paid_installments || 0} of{" "}
                {Number(overview.paid_installments || 0) +
                  Number(overview.pending_installments || 0)}{" "}
                EMIs paid
              </small>
            </div>

            {/* 9. ACTIVE ACCOUNTS */}
            <div className="metric autoMetric">
              <span>Active Accounts</span>
              <b>
                {overview.active_loans ||
                  loans.filter((l) => l.status === "ACTIVE").length ||
                  0}
              </b>
              <small
                style={{
                  color: "#64748b",
                  fontSize: "11.5px",
                  marginTop: "4px",
                  display: "block",
                }}
              >
                {overview.completed_loans || 0} Completed Accounts
              </small>
            </div>

            {/* 10. VEHICLES FINANCED */}
            <div className="metric autoMetric orange">
              <span>Vehicles Financed</span>
              <b>{overview.total_vehicles || loans.length || 0}</b>
              <small
                style={{
                  color: "#64748b",
                  fontSize: "11.5px",
                  marginTop: "4px",
                  display: "block",
                }}
              >
                Registered asset count
              </small>
            </div>
          </div>

          {/* VISUAL PORTFOLIO RECOVERY BANNER & VEHICLE FLEET DISTRIBUTION */}
          <div
            className="dashboardAnalyticsRow"
            style={{
              display: "grid",
              gridTemplateColumns: "1.4fr 1fr",
              gap: "22px",
              marginBottom: "28px",
            }}
          >
            {/* CARD 1: RECOVERY PROGRESS & INSTALLMENT HEALTH */}
            <div className="analyticsBanner" style={{ marginBottom: 0 }}>
              <div className="analyticsBannerHead">
                <div>
                  <span className="overline" style={{ color: "#0d9488" }}>
                    PORTFOLIO RECOVERY PERFORMANCE
                  </span>
                  <h4 style={{ marginTop: "4px" }}>
                    EMI Recovery & Installments Progress
                  </h4>
                </div>
                <span className="systemStatusBadge">
                  <span className="livePulseDot"></span>{" "}
                  {overview.recovery_rate || "0"}% Recovered
                </span>
              </div>

              <div
                className="progressBarTrack"
                style={{ height: "14px", marginTop: "16px" }}
              >
                <div
                  className="progressBarFill"
                  style={{
                    width: `${Math.min(100, Math.max(0, parseFloat(overview.recovery_rate || 0)))}%`,
                  }}
                />
              </div>

              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  fontSize: "12px",
                  fontWeight: "700",
                  color: "#64748b",
                  marginTop: "6px",
                }}
              >
                <span>
                  Collected:{" "}
                  <strong style={{ color: "#059669" }}>
                    {money(overview.total_collected || 0)}
                  </strong>
                </span>
                <span>
                  Remaining:{" "}
                  <strong style={{ color: "#dc2626" }}>
                    {money(overview.remaining || 0)}
                  </strong>
                </span>
                <span>
                  Expected Total:{" "}
                  <strong style={{ color: "#0f172a" }}>
                    {money(overview.total_expected || 0)}
                  </strong>
                </span>
              </div>

              <div className="analyticsPillGrid" style={{ marginTop: "20px" }}>
                <div
                  className="analyticsPill"
                  style={{
                    background: "#ecfdf5",
                    borderColor: "#a7f3d0",
                    color: "#047857",
                  }}
                >
                  <CheckCircle2 size={15} />{" "}
                  <b>{overview.paid_installments || 0}</b> Paid EMIs
                </div>
                <div
                  className="analyticsPill"
                  style={{
                    background: "#fff7ed",
                    borderColor: "#ffedd5",
                    color: "#c2410c",
                  }}
                >
                  <Clock3 size={15} />{" "}
                  <b>{overview.pending_installments || 0}</b> Pending EMIs
                </div>
                <div
                  className="analyticsPill"
                  style={{
                    background: "#f0f9ff",
                    borderColor: "#bae6fd",
                    color: "#0369a1",
                  }}
                >
                  <UserRound size={15} /> <b>{overview.total_customers || 0}</b>{" "}
                  Customers
                </div>
                <div
                  className="analyticsPill"
                  style={{
                    background: "#f5f3ff",
                    borderColor: "#ddd6fe",
                    color: "#6d28d9",
                  }}
                >
                  <CarFront size={15} /> <b>{overview.total_vehicles || 0}</b>{" "}
                  Vehicles
                </div>
              </div>
            </div>

            {/* CARD 2: FINANCED VEHICLE ASSETS BREAKDOWN */}
            <div className="analyticsBanner" style={{ marginBottom: 0 }}>
              <div className="analyticsBannerHead">
                <div>
                  <span className="overline" style={{ color: "#0284c7" }}>
                    ASSET CLASS BREAKDOWN
                  </span>
                  <h4 style={{ marginTop: "4px" }}>Financed Vehicle Types</h4>
                </div>
              </div>

              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "14px",
                  marginTop: "16px",
                }}
              >
                {/* Two Wheelers */}
                <div>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      fontSize: "13px",
                      fontWeight: "700",
                      marginBottom: "4px",
                    }}
                  >
                    <span>
                      <Bike size={15} /> Two-Wheelers (Bikes & Scooters)
                    </span>
                    <span>
                      <b>{overview.two_wheeler_count || 0}</b> Units
                    </span>
                  </div>
                  <div
                    className="progressBarTrack"
                    style={{
                      height: "8px",
                      margin: "4px 0",
                      background: "#f1f5f9",
                    }}
                  >
                    <div
                      className="progressBarFill"
                      style={{
                        width: `${Number(overview.total_vehicles || 0) > 0 ? (Number(overview.two_wheeler_count || 0) / Number(overview.total_vehicles || 1)) * 100 : 0}%`,
                        background: "linear-gradient(90deg, #10b981, #059669)",
                      }}
                    />
                  </div>
                </div>

                {/* Cars */}
                <div>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      fontSize: "13px",
                      fontWeight: "700",
                      marginBottom: "4px",
                    }}
                  >
                    <span>
                      <CarFront size={15} /> Cars & SUVs
                    </span>
                    <span>
                      <b>{overview.car_count || 0}</b> Units
                    </span>
                  </div>
                  <div
                    className="progressBarTrack"
                    style={{
                      height: "8px",
                      margin: "4px 0",
                      background: "#f1f5f9",
                    }}
                  >
                    <div
                      className="progressBarFill"
                      style={{
                        width: `${Number(overview.total_vehicles || 0) > 0 ? (Number(overview.car_count || 0) / Number(overview.total_vehicles || 1)) * 100 : 0}%`,
                        background: "linear-gradient(90deg, #3b82f6, #1d4ed8)",
                      }}
                    />
                  </div>
                </div>

                {/* Commercial */}
                <div>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      fontSize: "13px",
                      fontWeight: "700",
                      marginBottom: "4px",
                    }}
                  >
                    <span>
                      <Truck size={15} /> Commercial Vehicles
                    </span>
                    <span>
                      <b>{overview.commercial_count || 0}</b> Units
                    </span>
                  </div>
                  <div
                    className="progressBarTrack"
                    style={{
                      height: "8px",
                      margin: "4px 0",
                      background: "#f1f5f9",
                    }}
                  >
                    <div
                      className="progressBarFill"
                      style={{
                        width: `${Number(overview.total_vehicles || 0) > 0 ? (Number(overview.commercial_count || 0) / Number(overview.total_vehicles || 1)) * 100 : 0}%`,
                        background: "linear-gradient(90deg, #f59e0b, #d97706)",
                      }}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* ACTIONABLE TODAY & OUTSTANDING DUE INSTALLMENTS TABLE */}
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
                <span className="overline" style={{ color: "#d97706" }}>
                  ACTIONABLE DUE COLLECTIONS
                </span>
                <h3 style={{ marginTop: "2px" }}>
                  <Zap size={17} /> Today & Outstanding Due Installments
                </h3>
                <p>
                  Installments due today or overdue. Click "Collect EMI" to
                  record collection.
                </p>
              </div>
              <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
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
                  <th>Due Status</th>
                  <th>Customer</th>
                  <th>Vehicle & Reg No</th>
                  <th>Inst #</th>
                  <th>Due Date</th>
                  <th>Outstanding Dues</th>
                  <th>Total EMI Due</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {(dashboardData.dueSchedules || []).map((due) => {
                  const todayStr = new Date().toISOString().slice(0, 10);
                  const dueStr = due.due_date
                    ? new Date(due.due_date).toISOString().slice(0, 10)
                    : "";
                  const isToday = dueStr === todayStr;

                  return (
                    <tr
                      key={due.id}
                      className="clickable"
                      onClick={() => openLoanDetails(due.loan_id)}
                    >
                      <td>
                        {isToday ? (
                          <span
                            className="tag"
                            style={{ background: "#fff7ed", color: "#c2410c" }}
                          >
                            DUE TODAY
                          </span>
                        ) : (
                          <span
                            className="tag"
                            style={{ background: "#fef2f2", color: "#b91c1c" }}
                          >
                            OVERDUE
                          </span>
                        )}
                      </td>
                      <td>
                        <div className="customerNameCell">
                          <div className="customerAvatar">
                            {(due.first_name || "C").charAt(0)}
                          </div>
                          <div>
                            <b>
                              {due.first_name} {due.last_name}
                            </b>
                            <small>
                              <Phone size={13} />{" "}
                              {due.phone || due.customer_code}
                            </small>
                          </div>
                        </div>
                      </td>
                      <td>
                        <b>
                          {due.make} {due.model}
                        </b>
                        <small
                          className="autoRegNo"
                          style={{ display: "inline-block", marginTop: "2px" }}
                        >
                          {due.registration_number}
                        </small>
                      </td>
                      <td>
                        <b>#{due.installment_number}</b>{" "}
                        <small>
                          of {due.total_dues_count || due.tenure_months}
                        </small>
                      </td>
                      <td>
                        <b>{dateLabel(due.due_date)}</b>
                      </td>
                      <td>
                        <span
                          className="tag"
                          style={{
                            background: isToday ? "#fff7ed" : "#fef2f2",
                            color: isToday ? "#c2410c" : "#b91c1c",
                            border: `1px solid ${isToday ? "#ffedd5" : "#fecaca"}`,
                          }}
                        >
                          <AlertTriangle size={13} />{" "}
                          {due.outstanding_due_count || 1}{" "}
                          {Number(due.outstanding_due_count || 1) === 1
                            ? "Due"
                            : "Dues"}{" "}
                          Outstanding
                        </span>
                      </td>
                      <td>
                        <b
                          style={{
                            color: isToday ? "#d97706" : "#dc2626",
                            fontSize: "15px",
                          }}
                        >
                          {money(due.total_emi)}
                        </b>
                      </td>
                      <td>
                        <button
                          className="payButton"
                          style={{
                            background: "#059669",
                            color: "#fff",
                            borderColor: "#059669",
                            fontWeight: "800",
                          }}
                          onClick={(e) => {
                            e.stopPropagation();
                            setPayEmiModal({
                              loanId: due.loan_id,
                              emiId: due.id,
                              totalEmi: due.total_emi,
                              instNo: due.installment_number,
                            });
                            setPayForm({
                              amountPaid: due.total_emi,
                              paymentMethod: "CASH",
                              referenceNumber: "",
                            });
                          }}
                        >
                          Collect EMI
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {!(dashboardData.dueSchedules || []).length && (
              <div className="empty">
                <div>🎉</div>
                <b>
                  No outstanding overdue or today's EMI installments! All due
                  payments are up to date.
                </b>
              </div>
            )}
          </div>

          <div className="dashboardGrid autoPortfolioGrid">
            <div className="card tableWrap">
              <div className="cardHead">
                <div>
                  <h3>Recent Vehicle Loans Portfolio</h3>
                  <p>
                    Click any vehicle loan to inspect detailed EMI schedule &
                    payment history.
                  </p>
                </div>
              </div>
              <table>
                <thead>
                  <tr>
                    <th>Customer</th>
                    <th>Vehicle</th>
                    <th>Loan Amount</th>
                    <th>Interest Rate</th>
                    <th>Tenure</th>
                    <th>Total Paid</th>
                    <th>Pending Dues</th>
                  </tr>
                </thead>
                <tbody>
                  {loans.map((l) => (
                    <tr
                      key={l.id}
                      className="clickable"
                      onClick={() => openLoanDetails(l.id)}
                    >
                      <td>
                        <div className="customerNameCell">
                          <div className="customerAvatar">
                            {(l.first_name || "C").charAt(0)}
                          </div>
                          <div>
                            <b>
                              {l.first_name} {l.last_name}
                            </b>
                            <small>{l.phone || l.customer_code}</small>
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
                      </td>
                      <td>
                        <b>{l.interest_rate}%</b>{" "}
                        <small>({l.interest_type || "FLAT"})</small>
                      </td>
                      <td>{l.tenure_months} Months</td>
                      <td className="greenText">{money(l.total_paid)}</td>
                      <td>
                        <span
                          className="tag"
                          style={{
                            background:
                              Number(l.pending_dues_count || 0) > 0
                                ? "#fff7ed"
                                : "#ecfdf5",
                            color:
                              Number(l.pending_dues_count || 0) > 0
                                ? "#c2410c"
                                : "#047857",
                            border: "1px solid #ffedd5",
                          }}
                        >
                          <Clock3 size={13} /> {l.pending_dues_count || 0} Dues
                          Pending ({l.paid_dues_count || 0}/
                          {l.total_dues_count || l.tenure_months} Paid)
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {!loans.length && (
                <div className="empty">
                  <div>
                    <CarFront size={28} />
                  </div>
                  <b>
                    No vehicle loans registered yet. Click "+ New Vehicle Loan"
                    above.
                  </b>
                </div>
              )}
            </div>
          </div>
        </section>
      )}

      {/* 2. CUSTOMERS */}
      {activeMenu === "Customers" && (
        <section className="content">
          <div className="intro">
            <div>
              <span className="overline autoBadgeTag">CUSTOMERS</span>
              <h2>Auto Finance Customer Directory</h2>
              <p>Manage customer profiles, contact info, and loan histories.</p>
            </div>
            <button
              className="primary autoBtn"
              onClick={() => setShowAddCustomer(true)}
            >
              <Plus size={16} /> Add Customer
            </button>
          </div>

          <div className="filterBar">
            <input
              placeholder="Search by customer name, phone, code..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
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
                        <div className="customerAvatar">
                          {(c.first_name || "C").charAt(0)}
                        </div>
                        <b>
                          {c.first_name} {c.last_name}
                        </b>
                      </div>
                    </td>
                    <td>{c.phone}</td>
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
              <span className="overline autoBadgeTag">VEHICLE LOANS</span>
              <h2>Active Vehicle Loans & Assets</h2>
              <p>
                Browse loan agreements linked with vehicle registrations,
                chassis numbers, and EMIs.
              </p>
            </div>
            <button
              className="primary autoBtn"
              onClick={() => setShowCreateLoan(true)}
            >
              <Plus size={16} /> Create Vehicle Loan
            </button>
          </div>

          <div className="filterBar">
            <input
              placeholder="Search by vehicle reg no, make, model, or customer..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <div className="card tableWrap">
            <table>
              <thead>
                <tr>
                  <th>Vehicle</th>
                  <th>Reg Number</th>
                  <th>Customer</th>
                  <th>Loan Amount</th>
                  <th>Rate</th>
                  <th>Tenure</th>
                  <th>Start Date</th>
                  <th>Total Collected</th>
                  <th>Pending Dues</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredLoans.map((l) => (
                  <tr
                    key={l.id}
                    className="clickable"
                    onClick={() => openLoanDetails(l.id)}
                  >
                    <td>
                      <b>
                        {l.make || "Vehicle"} {l.model}
                      </b>
                      <small>{l.vehicle_type}</small>
                    </td>
                    <td>
                      <b className="autoRegNo">
                        {l.registration_number || "PENDING"}
                      </b>
                    </td>
                    <td>
                      <b>
                        {l.first_name} {l.last_name}
                      </b>
                    </td>
                    <td>
                      <b>{money(l.loan_amount)}</b>
                    </td>
                    <td>{l.interest_rate}%</td>
                    <td>{l.tenure_months} Mo</td>
                    <td>{dateLabel(l.start_date)}</td>
                    <td className="greenText">{money(l.total_paid)}</td>
                    <td>
                      <span
                        className="tag"
                        style={{
                          background:
                            Number(l.pending_dues_count || 0) > 0
                              ? "#fff7ed"
                              : "#ecfdf5",
                          color:
                            Number(l.pending_dues_count || 0) > 0
                              ? "#c2410c"
                              : "#047857",
                          border: "1px solid #ffedd5",
                        }}
                      >
                        <Clock3 size={13} /> {l.pending_dues_count || 0} Dues
                        Pending ({l.paid_dues_count || 0}/
                        {l.total_dues_count || l.tenure_months} Paid)
                      </span>
                    </td>
                    <td>
                      <button
                        className="payButton"
                        onClick={(e) => {
                          e.stopPropagation();
                          openLoanDetails(l.id);
                        }}
                      >
                        Details & EMI
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!filteredLoans.length && (
              <div className="empty">
                <div>
                  <CarFront size={28} />
                </div>
                <b>No vehicle loans found.</b>
              </div>
            )}
          </div>
        </section>
      )}

      {/* 5. EMI SCHEDULES */}
      {activeMenu === "EMI Schedules" && (
        <section className="content">
          <div className="intro">
            <div>
              <span className="overline autoBadgeTag">
                EMI SCHEDULES & COLLECTIONS
              </span>
              <h2>Monthly EMI Tracking & Due Collections</h2>
              <p>
                Monitor today's due EMIs, outstanding overdue balances, and
                complete installment schedules.
              </p>
            </div>
          </div>

          <div
            className="metricGrid"
            style={{
              gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
              marginBottom: "24px",
            }}
          >
            <div className="metric autoMetric orange">
              <span>Today's EMI Due</span>
              <b style={{ color: "#d97706" }}>
                {money(overview.today_due_amount || 0)}
              </b>
              <small
                style={{
                  color: "#d97706",
                  fontWeight: 700,
                  fontSize: "11.5px",
                  marginTop: "4px",
                  display: "block",
                }}
              >
                <CalendarDays size={14} /> {overview.today_due_count || 0} EMIs
                Due Today
              </small>
            </div>

            <div className="metric autoMetric red">
              <span>Outstanding Overdue</span>
              <b style={{ color: "#dc2626" }}>
                {money(overview.overdue_amount || 0)}
              </b>
              <small
                style={{
                  color: "#dc2626",
                  fontWeight: 700,
                  fontSize: "11.5px",
                  marginTop: "4px",
                  display: "block",
                }}
              >
                <AlertTriangle size={14} /> {overview.overdue_count || 0} EMIs
                Due / Overdue
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

            <div className="metric autoMetric blue">
              <span>Pending Installments</span>
              <b>{overview.pending_installments || 0}</b>
              <small
                style={{
                  color: "#64748b",
                  fontSize: "11.5px",
                  marginTop: "4px",
                  display: "block",
                }}
              >
                {overview.paid_installments || 0} EMIs Paid
              </small>
            </div>
          </div>

          {/* ACTIONABLE TODAY & OVERDUE TABLE */}
          {(dashboardData.dueSchedules || []).length > 0 && (
            <div className="card tableWrap" style={{ marginBottom: "24px" }}>
              <div className="cardHead">
                <span className="overline" style={{ color: "#d97706" }}>
                  ACTIONABLE DUE COLLECTIONS
                </span>
                <h3 style={{ marginTop: "2px" }}>
                  <Zap size={17} /> Today & Outstanding Due Installments
                </h3>
                <p>
                  Pending EMIs scheduled for today or overdue. Click "Collect
                  EMI" to record collection.
                </p>
              </div>
              <table>
                <thead>
                  <tr>
                    <th>Due Status</th>
                    <th>Customer</th>
                    <th>Vehicle & Reg No</th>
                    <th>Inst #</th>
                    <th>Due Date</th>
                    <th>Outstanding Dues</th>
                    <th>Total EMI Due</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {(dashboardData.dueSchedules || []).map((due) => {
                    const todayStr = new Date().toISOString().slice(0, 10);
                    const dueStr = due.due_date
                      ? new Date(due.due_date).toISOString().slice(0, 10)
                      : "";
                    const isToday = dueStr === todayStr;

                    return (
                      <tr
                        key={due.id}
                        className="clickable"
                        onClick={() => openLoanDetails(due.loan_id)}
                      >
                        <td>
                          {isToday ? (
                            <span
                              className="tag"
                              style={{
                                background: "#fff7ed",
                                color: "#c2410c",
                              }}
                            >
                              DUE TODAY
                            </span>
                          ) : (
                            <span
                              className="tag"
                              style={{
                                background: "#fef2f2",
                                color: "#b91c1c",
                              }}
                            >
                              OVERDUE
                            </span>
                          )}
                        </td>
                        <td>
                          <div className="customerNameCell">
                            <div className="customerAvatar">
                              {(due.first_name || "C").charAt(0)}
                            </div>
                            <div>
                              <b>
                                {due.first_name} {due.last_name}
                              </b>
                              <small>
                                <Phone size={13} />{" "}
                                {due.phone || due.customer_code}
                              </small>
                            </div>
                          </div>
                        </td>
                        <td>
                          <b>
                            {due.make} {due.model}
                          </b>
                          <small
                            className="autoRegNo"
                            style={{
                              display: "inline-block",
                              marginTop: "2px",
                            }}
                          >
                            {due.registration_number}
                          </small>
                        </td>
                        <td>
                          <b>#{due.installment_number}</b>{" "}
                          <small>
                            of {due.total_dues_count || due.tenure_months}
                          </small>
                        </td>
                        <td>
                          <b>{dateLabel(due.due_date)}</b>
                        </td>
                        <td>
                          <span
                            className="tag"
                            style={{
                              background: isToday ? "#fff7ed" : "#fef2f2",
                              color: isToday ? "#c2410c" : "#b91c1c",
                              border: `1px solid ${isToday ? "#ffedd5" : "#fecaca"}`,
                            }}
                          >
                            <AlertTriangle size={13} />{" "}
                            {due.outstanding_due_count || 1}{" "}
                            {Number(due.outstanding_due_count || 1) === 1
                              ? "Due"
                              : "Dues"}{" "}
                            Outstanding
                          </span>
                        </td>
                        <td>
                          <b
                            style={{
                              color: isToday ? "#d97706" : "#dc2626",
                              fontSize: "15px",
                            }}
                          >
                            {money(due.total_emi)}
                          </b>
                        </td>
                        <td>
                          <button
                            className="payButton"
                            style={{
                              background: "#059669",
                              color: "#fff",
                              borderColor: "#059669",
                              fontWeight: "800",
                            }}
                            onClick={(e) => {
                              e.stopPropagation();
                              setPayEmiModal({
                                loanId: due.loan_id,
                                emiId: due.id,
                                totalEmi: due.total_emi,
                                instNo: due.installment_number,
                              });
                              setPayForm({
                                amountPaid: due.total_emi,
                                paymentMethod: "CASH",
                                referenceNumber: "",
                              });
                            }}
                          >
                            Collect EMI
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          <div className="card tableWrap">
            <div className="cardHead">
              <h3>Select a Vehicle Loan to view Full EMI Schedule</h3>
            </div>
            <table>
              <thead>
                <tr>
                  <th>Vehicle & Reg No</th>
                  <th>Customer</th>
                  <th>Loan Amount</th>
                  <th>Pending Dues</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {loans.map((l) => (
                  <tr
                    key={l.id}
                    className="clickable"
                    onClick={() => openLoanDetails(l.id)}
                  >
                    <td>
                      <b>
                        {l.make} {l.model}
                      </b>
                      <small>{l.registration_number}</small>
                    </td>
                    <td>
                      <b>
                        {l.first_name} {l.last_name}
                      </b>
                    </td>
                    <td>{money(l.loan_amount)}</td>
                    <td>
                      <span
                        className="tag"
                        style={{
                          background:
                            Number(l.pending_dues_count || 0) > 0
                              ? "#fff7ed"
                              : "#ecfdf5",
                          color:
                            Number(l.pending_dues_count || 0) > 0
                              ? "#c2410c"
                              : "#047857",
                          border: "1px solid #ffedd5",
                        }}
                      >
                        <Clock3 size={13} /> {l.pending_dues_count || 0} Dues
                        Pending ({l.paid_dues_count || 0}/
                        {l.total_dues_count || l.tenure_months} Paid)
                      </span>
                    </td>
                    <td>
                      <button
                        className="payButton"
                        onClick={(e) => {
                          e.stopPropagation();
                          openLoanDetails(l.id);
                        }}
                      >
                        View Schedule
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
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

          <div className="exportBar">
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
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* MODAL: ADD CUSTOMER */}
      {showAddCustomer && (
        <div
          className="modal"
          onClick={(event) => {
            if (event.target === event.currentTarget) setShowAddCustomer(false);
          }}
        >
          <form
            className="formCard modalForm"
            onClick={(event) => event.stopPropagation()}
            onSubmit={handleAddCustomer}
          >
            <button
              type="button"
              className="close"
              onClick={() => setShowAddCustomer(false)}
            >
              <X size={18} />
            </button>
            <div className="formTitle">
              <span className="overline autoBadgeTag">
                AUTO FINANCE CUSTOMER
              </span>
              <h2>Add New Customer</h2>
            </div>
            <div className="formGrid">
              <label>
                First Name
                <input
                  required
                  value={custForm.firstName}
                  onChange={(e) =>
                    setCustForm({ ...custForm, firstName: e.target.value })
                  }
                />
              </label>
              <label>
                Last Name
                <input
                  value={custForm.lastName}
                  onChange={(e) =>
                    setCustForm({ ...custForm, lastName: e.target.value })
                  }
                />
              </label>
              <label>
                Phone Number
                <input
                  required
                  value={custForm.phone}
                  onChange={(e) =>
                    setCustForm({ ...custForm, phone: e.target.value })
                  }
                />
              </label>
              <label>
                Email
                <input
                  type="email"
                  value={custForm.email}
                  onChange={(e) =>
                    setCustForm({ ...custForm, email: e.target.value })
                  }
                />
              </label>
              <label>
                City
                <input
                  value={custForm.city}
                  onChange={(e) =>
                    setCustForm({ ...custForm, city: e.target.value })
                  }
                />
              </label>
              <label>
                State
                <input
                  value={custForm.state}
                  onChange={(e) =>
                    setCustForm({ ...custForm, state: e.target.value })
                  }
                />
              </label>
              <label className="wide">
                Full Address
                <textarea
                  value={custForm.address}
                  onChange={(e) =>
                    setCustForm({ ...custForm, address: e.target.value })
                  }
                />
              </label>
            </div>
            <button
              className="primary autoBtn full"
              style={{ marginTop: "16px" }}
            >
              Save Customer
            </button>
          </form>
        </div>
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
                <UserRound size={15} /> Customer & Scheme Selection
              </div>

              <SearchableSelect
                label="Search & Select Customer"
                placeholder="🔍 Type customer name, phone, code..."
                options={customerOptions}
                value={loanForm.customerId}
                required
                onChange={(val) =>
                  setLoanForm({ ...loanForm, customerId: val })
                }
                hint="Select existing customer or add new via Customers page"
              />

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

              {/* LIVE EMI CALCULATION PREVIEW BOX (FLAT & REDUCING) */}
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
            className="detailsCard"
            onClick={(event) => event.stopPropagation()}
            style={{ maxWidth: "1020px" }}
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
                  VEHICLE LOAN AGREEMENT & BORROWER DOSSIER
                </span>
                <h2 style={{ marginTop: "4px" }}>
                  {selectedLoan.loan.first_name} {selectedLoan.loan.last_name}
                </h2>
                <p style={{ margin: "2px 0 0", color: "#64748b" }}>
                  <IdCard size={13} /> Customer Code:{" "}
                  <b>{selectedLoan.loan.customer_code}</b> ·
                  <Phone size={13} /> Phone: <b>{selectedLoan.loan.phone}</b>{" "}
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
                    selectedLoan.schedules
                      ?.filter((s) => s.status === "PAID")
                      .reduce(
                        (acc, s) => acc + parseFloat(s.total_emi || 0),
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
                    selectedLoan.schedules
                      ?.filter((s) => s.status === "PENDING")
                      .reduce(
                        (acc, s) => acc + parseFloat(s.total_emi || 0),
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
              <div className="cardHead">
                <h3>
                  EMI Installment Schedule (
                  {selectedLoan.schedules?.filter((s) => s.status === "PAID")
                    .length || 0}{" "}
                  / {selectedLoan.schedules?.length || 0} Paid)
                </h3>
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
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedLoan.schedules?.map((s) => (
                    <tr key={s.id}>
                      <td>
                        <b>#{s.installment_number}</b>
                      </td>
                      <td>{dateLabel(s.due_date)}</td>
                      <td>{money(s.principal_component)}</td>
                      <td>{money(s.interest_component)}</td>
                      <td>
                        <b>{money(s.total_emi)}</b>
                      </td>
                      <td>
                        <span
                          className={`tag ${s.status === "PAID" ? "active" : ""}`}
                        >
                          {s.status}
                        </span>
                      </td>
                      <td>
                        {s.status !== "PAID" && (
                          <button
                            className="payButton"
                            onClick={() => {
                              setPayEmiModal({
                                loanId: selectedLoan.loan.id,
                                emiId: s.id,
                                totalEmi: s.total_emi,
                                instNo: s.installment_number,
                              });
                              setPayForm({
                                amountPaid: s.total_emi,
                                paymentMethod: "CASH",
                                referenceNumber: "",
                              });
                            }}
                          >
                            Collect EMI
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
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
          <div className="customerAvatar customerProfileAvatar">
            {(customer.first_name || "C").charAt(0)}
          </div>
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
              Phone<strong>{customer.phone || "Not provided"}</strong>
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
