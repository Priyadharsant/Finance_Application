import { useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  Activity,
  CalendarDays,
  CarFront,
  CheckCircle2,
  FileText,
  LayoutDashboard,
  Menu,
  Plus,
  RefreshCw,
  Tags,
  UserRound,
  WalletCards,
  X,
  Landmark,
  Users,
  Globe,
} from "lucide-react";
import "./Finance.css";
import AutoFinanceView from "./AutoFinance.jsx";
import GlobalCapitalView from "./GlobalCapital.jsx";

const API =
  import.meta.env.VITE_API_URL || "http://localhost:3000/api/daily-finance";
const today = () => new Date().toISOString().slice(0, 10);
const money = (value) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(Number(value || 0));
const dateLabel = (value) =>
  value ? new Date(`${value}T00:00:00`).toLocaleDateString("en-IN") : "—";
const call = (path, options = {}) =>
  fetch(`${API}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...options,
  }).then(async (response) => {
    const json = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(json.error || "Request failed");
    return json;
  });
const emptyFinance = {
  customerName: "",
  mobileNumber: "",
  address: "",
  notes: "",
  grossFinanceAmount: "",
  interestType: "PERCENT",
  interestValue: "",
  financeDate: today(),
};

export default function AppFinance() {
  const [appModule, setAppModule] = useState("DAILY"); // 'DAILY' or 'AUTO'
  const [page, setPage] = useState("Dashboard");
  const [dashboard, setDashboard] = useState({
    position: {},
    customers: [],
    recentPayments: [],
  });
  const [entryDate, setEntryDate] = useState(today());
  const [daily, setDaily] = useState({ date: today(), customers: [] });
  const [report, setReport] = useState(null);
  const [reportRange, setReportRange] = useState({
    from: today(),
    to: today(),
  });
  const [reportCustomerId, setReportCustomerId] = useState("");
  const [reportStatus, setReportStatus] = useState("");
  const [reportSearch, setReportSearch] = useState("");
  const [customerSearch, setCustomerSearch] = useState("");
  const [customerStatus, setCustomerStatus] = useState("");
  const [details, setDetails] = useState(null);
  const [editingPayment, setEditingPayment] = useState(null);
  const [finance, setFinance] = useState(emptyFinance);
  const [showAdd, setShowAdd] = useState(false);
  const [notice, setNotice] = useState(null);
  const [busy, setBusy] = useState(false);

  const loadDashboard = () =>
    call(`/dashboard?date=${entryDate}`)
      .then(setDashboard)
      .catch((error) => setNotice({ type: "error", text: error.message }));
  const loadDaily = () =>
    call(`/daily-entry?date=${entryDate}`)
      .then(setDaily)
      .catch((error) => setNotice({ type: "error", text: error.message }));

  useEffect(() => {
    if (appModule === "DAILY") {
      loadDashboard();
      loadDaily();
    }
  }, [entryDate, appModule]);

  useEffect(() => {
    if (!notice) return undefined;
    const timeout = window.setTimeout(() => setNotice(null), 4200);
    return () => window.clearTimeout(timeout);
  }, [notice]);

  const handleModuleSwitch = (targetModule) => {
    setAppModule(targetModule);
    setPage(targetModule === "GLOBAL" ? "Ledger Overview" : "Dashboard");
  };

  const submitFinance = async (event) => {
    event.preventDefault();
    setBusy(true);
    try {
      await call("/customers-with-finance", {
        method: "POST",
        body: JSON.stringify({
          ...finance,
          agreedTotalPayable: finance.grossFinanceAmount,
          dailyAgreedDue: 0,
        }),
      });
      setFinance(emptyFinance);
      setShowAdd(false);
      setPage("Customers");
      setNotice({ type: "success", text: "Finance saved successfully" });
      await loadDashboard();
    } catch (error) {
      setNotice({ type: "error", text: error.message });
    } finally {
      setBusy(false);
    }
  };
  const savePayment = async (customer, amount) => {
    if (!amount || Number(amount) < 0) return;
    setBusy(true);
    try {
      const path = customer.today_payment_id
        ? `/payments/${customer.today_payment_id}`
        : "/payments";
      const body = customer.today_payment_id
        ? { collectionDate: entryDate, amount }
        : {
            customerId: customer.customer_id,
            financeId: customer.finance_id,
            collectionDate: entryDate,
            amount,
          };
      await call(path, {
        method: customer.today_payment_id ? "PUT" : "POST",
        body: JSON.stringify(body),
      });
      setNotice({
        type: customer.today_payment_id ? "success" : "success",
        text: customer.today_payment_id
          ? "Collection updated"
          : "Collection saved",
      });
      await Promise.all([loadDashboard(), loadDaily()]);
    } catch (error) {
      setNotice({ type: "error", text: error.message });
    } finally {
      setBusy(false);
    }
  };
  const updatePayment = async (event) => {
    event.preventDefault();
    setBusy(true);
    try {
      await call(`/payments/${editingPayment.payment_id}`, {
        method: "PUT",
        body: JSON.stringify(editingPayment),
      });
      setEditingPayment(null);
      setNotice({ type: "success", text: "Collection updated" });
      await Promise.all([loadDashboard(), loadDaily()]);
      if (details) openDetails(details.customer.customer_id);
    } catch (error) {
      setNotice({ type: "error", text: error.message });
    } finally {
      setBusy(false);
    }
  };
  const openDetails = async (customerId) => {
    try {
      setDetails(await call(`/customers/${customerId}`));
    } catch (error) {
      setNotice({ type: "error", text: error.message });
    }
  };
  const runReport = async () => {
    try {
      const params = new URLSearchParams({
        from: reportRange.from,
        to: reportRange.to,
      });
      if (reportCustomerId) params.set("customerId", reportCustomerId);
      if (reportStatus) params.set("status", reportStatus);
      if (reportSearch) params.set("search", reportSearch);
      setReport(await call(`/reports/customers?${params.toString()}`));
    } catch (error) {
      setNotice({ type: "error", text: error.message });
    }
  };
  const filteredCustomers = useMemo(
    () =>
      dashboard.customers.filter(
        (customer) =>
          (!customerSearch ||
            customer.customer_name
              .toLowerCase()
              .includes(customerSearch.toLowerCase())) &&
          (!customerStatus || customer.status === customerStatus),
      ),
    [dashboard.customers, customerSearch, customerStatus],
  );
  const position = dashboard.position || {};

  const dailyMenus = ["Dashboard", "Customers", "Daily entry", "Reports"];
  const autoMenus = [
    "Dashboard",
    "Customers",
    "Loan Schemes",
    "Vehicle Loans",
    "Reports",
  ];
  const globalMenus = [
    "Ledger Overview",
    "Partner Management",
    "Capital Transactions",
    "Monthly Closing",
  ];

  const currentMenus =
    appModule === "DAILY"
      ? dailyMenus
      : appModule === "AUTO"
        ? autoMenus
        : globalMenus;

  const menuIcons = {
    Dashboard: LayoutDashboard,
    Customers: UserRound,
    "Daily entry": WalletCards,
    "Loan Schemes": Tags,
    "Vehicle Loans": CarFront,
    "EMI Schedules": CalendarDays,
    Reports: FileText,
    "Ledger Overview": Globe,
    "Partner Management": Users,
    "Capital Transactions": Landmark,
    "Monthly Closing": FileText,
  };
  const NoticeIcon = notice?.type === "error" ? AlertCircle : CheckCircle2;

  return (
    <div className="financeApp">
      <aside>
        <div className="financeLogo">
          <b>
            {appModule === "DAILY" && <Activity size={21} strokeWidth={2.5} />}
            {appModule === "AUTO" && <CarFront size={21} strokeWidth={2.5} />}
            {appModule === "GLOBAL" && <Globe size={21} strokeWidth={2.5} />}
          </b>
          <div>
            FinFlow
            <small>
              {appModule === "DAILY" && "Daily Finance"}
              {appModule === "AUTO" && "Auto Finance"}
              {appModule === "GLOBAL" && "Global Capital"}
            </small>
          </div>
        </div>

        {/* GLOBAL PORTAL BUTTON */}
        <div style={{ margin: "0 10px 15px" }}>
          <button
            className={`globalPortalBtn ${appModule === "GLOBAL" ? "active" : ""}`}
            onClick={() => handleModuleSwitch("GLOBAL")}
          >
            <div className="globalPortalIcon">
              <Globe size={18} />
            </div>
            <div className="globalPortalText">
              <span>Global Capital</span>
              <small>Overview & Ledgers</small>
            </div>
          </button>
        </div>

        {/* MODULE TOGGLE SWITCHER IN SIDEBAR */}
        <div className="moduleSwitcherContainer">
          <button
            className={`moduleToggleBtn ${appModule === "DAILY" ? "active" : ""}`}
            onClick={() => handleModuleSwitch("DAILY")}
          >
            <Activity size={15} /> <span>Daily Finance</span>
          </button>
          <button
            className={`moduleToggleBtn ${appModule === "AUTO" ? "active autoMode" : ""}`}
            onClick={() => handleModuleSwitch("AUTO")}
          >
            <CarFront size={15} /> <span>Auto Finance</span>
          </button>
        </div>

        <div className="menuTitle">
          {appModule === "DAILY" && "DAILY FINANCE MENU"}
          {appModule === "AUTO" && "AUTO FINANCE MENU"}
          {appModule === "GLOBAL" && "GLOBAL CAPITAL MENU"}
        </div>
        {currentMenus.map((item) => (
          <button
            key={item}
            className={`menuItemBtn ${page === item ? "active" : ""}`}
            onClick={() => setPage(item)}
          >
            <i>
              {(() => {
                const Icon = menuIcons[item] || Menu;
                return <Icon size={18} strokeWidth={2} />;
              })()}
            </i>
            <span>{item}</span>
          </button>
        ))}

        <div className="sidebarBottom">
          <span>A</span>
          <div>
            Administrator<small>Finance manager</small>
          </div>
        </div>
      </aside>

      <main>
        <header>
          <div>
            <span>
              <span className="livePulseDot"></span>
              {appModule === "DAILY"
                ? "DAILY FINANCE MODULE"
                : appModule === "AUTO"
                  ? "AUTO FINANCE MODULE"
                  : "GLOBAL CAPITAL MODULE"}
            </span>
            <h1>{page}</h1>
          </div>
          <div className="headerRight">
            {/* HEADER TOGGLE SWITCH */}
            <div className="headerToggleSwitch">
              <button
                className={`headerToggleBtn ${appModule === "DAILY" ? "active" : ""}`}
                onClick={() => handleModuleSwitch("DAILY")}
              >
                Daily Finance
              </button>
              <button
                className={`headerToggleBtn ${appModule === "AUTO" ? "active autoMode" : ""}`}
                onClick={() => handleModuleSwitch("AUTO")}
              >
                <CarFront size={15} /> Auto Finance
              </button>
              <button
                className={`headerToggleBtn ${appModule === "GLOBAL" ? "active globalMode" : ""}`}
                onClick={() => handleModuleSwitch("GLOBAL")}
              >
                <Globe size={15} /> Global Capital
              </button>
            </div>
            <span>{dateLabel(entryDate)}</span>
            <button
              className="iconTextButton"
              onClick={() => {
                if (appModule === "DAILY") {
                  loadDashboard();
                  loadDaily();
                }
              }}
            >
              <RefreshCw size={15} /> Refresh
            </button>
          </div>
        </header>

        {notice && (
          <div className="toastViewport" aria-live="polite" aria-atomic="true">
            <div className={`toast ${notice.type}`} role="status">
              <span className="toastIcon">
                <NoticeIcon size={18} />
              </span>
              <span className="toastMessage">{notice.text}</span>
              <button
                className="iconButton toastClose"
                aria-label="Dismiss notification"
                onClick={() => setNotice(null)}
              >
                <X size={16} />
              </button>
              <span className="toastProgress" />
            </div>
          </div>
        )}

        {/* RENDER MODULE VIEWS */}
        {appModule === "AUTO" ? (
          <AutoFinanceView activeMenu={page} setNotice={setNotice} />
        ) : appModule === "GLOBAL" ? (
          <GlobalCapitalView activeMenu={page} setNotice={setNotice} />
        ) : (
          <>
            {page === "Dashboard" && (
              <Dashboard
                position={position}
                customers={dashboard.customers}
                recent={dashboard.recentPayments}
                setPage={setPage}
                openDetails={openDetails}
              />
            )}
            {page === "Customers" && (
              <Customers
                customers={filteredCustomers}
                search={customerSearch}
                setSearch={setCustomerSearch}
                status={customerStatus}
                setStatus={setCustomerStatus}
                setShowAdd={setShowAdd}
                openDetails={openDetails}
              />
            )}
            {page === "Daily entry" && (
              <DailyEntry
                date={entryDate}
                setDate={setEntryDate}
                daily={daily.customers}
                savePayment={savePayment}
                openDetails={openDetails}
                busy={busy}
              />
            )}
            {page === "Reports" && (
              <Reports
                report={report}
                runReport={runReport}
                range={reportRange}
                setRange={setReportRange}
                customers={dashboard.customers}
                customerId={reportCustomerId}
                setCustomerId={setReportCustomerId}
                status={reportStatus}
                setStatus={setReportStatus}
                search={reportSearch}
                setSearch={setReportSearch}
              />
            )}
            {page === "Customers" && showAdd && (
              <FinanceForm
                finance={finance}
                setFinance={setFinance}
                submit={submitFinance}
                busy={busy}
                close={() => setShowAdd(false)}
              />
            )}
            {details && (
              <CustomerDetails
                data={details}
                close={() => setDetails(null)}
                editPayment={setEditingPayment}
              />
            )}
            {editingPayment && (
              <PaymentEditor
                payment={editingPayment}
                setPayment={setEditingPayment}
                submit={updatePayment}
                close={() => setEditingPayment(null)}
                busy={busy}
              />
            )}
          </>
        )}
      </main>
    </div>
  );
}

function Metric({ title, value, tone = "", count = false }) {
  return (
    <div className={`metric ${tone}`}>
      <span>{title}</span>
      <b>{count ? Number(value || 0) : money(value)}</b>
    </div>
  );
}
function Dashboard({ position, customers, recent, setPage, openDetails }) {
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

function Customers({
  customers,
  search,
  setSearch,
  status,
  setStatus,
  setShowAdd,
  openDetails,
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
              <th>Customer</th>
              <th>Finance amount</th>
              <th>Interest</th>
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
              </tr>
            ))}
          </tbody>
        </table>
        {!customers.length && <Empty text="No matching customers." />}
      </div>
    </section>
  );
}

function DailyEntry({ date, setDate, daily, savePayment, openDetails, busy }) {
  return (
    <section className="content">
      <div className="intro">
        <div>
          <span className="overline">DAILY ENTRY</span>
          <h2>Record collections</h2>
          <p>Enter any amount received. Previous dates are supported.</p>
        </div>
        <label className="datePicker">
          Collection date
          <input
            type="date"
            value={date}
            onChange={(event) => setDate(event.target.value)}
          />
        </label>
      </div>
      <div className="card tableWrap">
        <div className="cardHead">
          <div>
            <h3>Collections for {dateLabel(date)}</h3>
            <p>Zero payment days need no special calculation.</p>
          </div>
        </div>
        <table>
          <thead>
            <tr>
              <th>Customer</th>
              <th>Total return</th>
              <th>Already returned</th>
              <th>Remaining</th>
              <th>Today's collection</th>
              <th>Save</th>
            </tr>
          </thead>
          <tbody>
            {daily.map((customer) => (
              <EntryRow
                key={customer.finance_id}
                customer={customer}
                savePayment={savePayment}
                openDetails={openDetails}
                busy={busy}
              />
            ))}
          </tbody>
        </table>
        {!daily.length && (
          <Empty text="No active finances require collection." />
        )}
      </div>
    </section>
  );
}
function EntryRow({ customer, savePayment, openDetails, busy }) {
  const [amount, setAmount] = useState(customer.today_collection || "");
  useEffect(
    () => setAmount(customer.today_collection || ""),
    [customer.today_collection],
  );
  return (
    <tr>
      <td>
        <button
          className="linkButton"
          onClick={() => openDetails(customer.customer_id)}
        >
          <b>{customer.customer_name}</b>
          <small>
            {customer.mobile_number ? (
              <PhoneLink phone={customer.mobile_number} />
            ) : (
              "Open details"
            )}
          </small>
        </button>
      </td>
      <td>{money(customer.agreed_total_payable)}</td>
      <td>{money(customer.total_collected)}</td>
      <td className="redText">{money(customer.remaining)}</td>
      <td>
        <input
          className="inlineInput"
          type="number"
          min="0"
          step="0.01"
          value={amount}
          onChange={(event) => setAmount(event.target.value)}
          placeholder="0"
        />
      </td>
      <td>
        <button
          className="payButton"
          disabled={busy || amount === ""}
          onClick={() => savePayment(customer, amount)}
        >
          Save
        </button>
      </td>
    </tr>
  );
}

function FinanceForm({ finance, setFinance, submit, busy, close }) {
  const interest =
    finance.interestType === "PERCENT"
      ? (Number(finance.grossFinanceAmount || 0) *
          Number(finance.interestValue || 0)) /
        100
      : Number(finance.interestValue || 0);
  const amountGiven = Math.max(
    0,
    Number(finance.grossFinanceAmount || 0) - interest,
  );
  const set = (key) => (event) =>
    setFinance({ ...finance, [key]: event.target.value });
  return (
    <div
      className="modal"
      onClick={(event) => {
        if (event.target === event.currentTarget) close();
      }}
    >
      <form className="formCard modalForm" onSubmit={submit}>
        <button type="button" className="close" onClick={close}>
          <X size={18} />
        </button>
        <div className="formTitle">
          <span className="overline">ADD CUSTOMER / FINANCE</span>
          <h2>Create a finance record</h2>
          <p>Interest is deducted at the beginning and becomes the profit.</p>
        </div>
        <div className="formGrid">
          <label>
            Customer name
            <input
              required
              value={finance.customerName}
              onChange={set("customerName")}
            />
          </label>
          <label>
            Phone number
            <input
              value={finance.mobileNumber}
              onChange={set("mobileNumber")}
            />
          </label>
          <label className="wide">
            Address
            <input value={finance.address} onChange={set("address")} />
          </label>
          <label>
            Finance date
            <input
              type="date"
              required
              value={finance.financeDate}
              onChange={set("financeDate")}
            />
          </label>
          <label>
            Finance amount
            <input
              type="number"
              min="0.01"
              step="0.01"
              required
              value={finance.grossFinanceAmount}
              onChange={set("grossFinanceAmount")}
            />
          </label>
          <label>
            Interest type
            <select value={finance.interestType} onChange={set("interestType")}>
              <option value="PERCENT">Percentage</option>
              <option value="AMOUNT">Fixed amount</option>
            </select>
          </label>
          <label>
            Interest value
            <input
              type="number"
              min="0"
              step="0.01"
              required
              value={finance.interestValue}
              onChange={set("interestValue")}
            />
          </label>
          <label className="wide">
            Notes
            <textarea value={finance.notes} onChange={set("notes")} />
          </label>
        </div>
        <div className="breakdown">
          <span>
            Interest amount<b>{money(interest)}</b>
          </span>
          <span>
            Amount given<b>{money(amountGiven)}</b>
          </span>
          <span>
            Total return<b>{money(finance.grossFinanceAmount)}</b>
          </span>
          <span>
            Profit<b>{money(interest)}</b>
          </span>
        </div>
        <button className="primary full" disabled={busy}>
          Save finance
        </button>
      </form>
    </div>
  );
}

function CustomerDetails({ data, close, editPayment }) {
  const customer = data.customer;
  return (
    <div
      className="modal"
      onClick={(event) => {
        if (event.target === event.currentTarget) close();
      }}
    >
      <div className="detailsCard" onClick={(event) => event.stopPropagation()}>
        <button className="close" onClick={close}>
          <X size={18} />
        </button>
        <span className="overline">CUSTOMER DETAILS</span>
        <h2>{customer.customer_name}</h2>
        <p>
          {customer.mobile_number ? (
            <a className="phoneLink" href={`tel:${customer.mobile_number}`}>
              {customer.mobile_number}
            </a>
          ) : (
            "No phone"
          )}{" "}
          · {customer.address || "No address"}
        </p>
        <div className="detailGrid">
          <Metric
            title="Finance amount"
            value={customer.gross_finance_amount}
          />
          <Metric title="Interest" value={customer.initial_deduction} />
          <Metric title="Amount given" value={customer.net_disbursement} />
          <Metric title="Total return" value={customer.agreed_total_payable} />
          <Metric
            title="Collected"
            value={customer.total_collected}
            tone="green"
          />
          <Metric title="Remaining" value={customer.remaining} tone="orange" />
          <Metric
            title="Profit"
            value={customer.initial_deduction}
            tone="green"
          />
        </div>
        <div className="card tableWrap">
          <div className="cardHead">
            <h3>Collection history</h3>
          </div>
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Amount collected</th>
                <th>Total collected</th>
                <th>Remaining</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {data.collections.map((payment) => (
                <tr key={payment.payment_id}>
                  <td>{dateLabel(payment.collection_date)}</td>
                  <td>{money(payment.amount)}</td>
                  <td>{money(payment.total_collected)}</td>
                  <td>{money(payment.remaining)}</td>
                  <td>
                    <button
                      className="payButton"
                      onClick={() =>
                        editPayment({
                          ...payment,
                          collectionDate: payment.collection_date,
                          amount: payment.amount,
                        })
                      }
                    >
                      Edit
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!data.collections.length && (
            <Empty text="No collections recorded." />
          )}
        </div>
      </div>
    </div>
  );
}
function PaymentEditor({ payment, setPayment, submit, close, busy }) {
  const set = (key) => (event) =>
    setPayment({ ...payment, [key]: event.target.value });
  return (
    <div
      className="modal"
      onClick={(event) => {
        if (event.target === event.currentTarget) close();
      }}
    >
      <form className="paymentCard" onSubmit={submit}>
        <button type="button" className="close" onClick={close}>
          <X size={18} />
        </button>
        <span className="overline">EDIT COLLECTION</span>
        <h2>Update daily entry</h2>
        <label>
          Collection date
          <input
            type="date"
            required
            value={payment.collectionDate}
            onChange={set("collectionDate")}
          />
        </label>
        <label>
          Amount collected
          <input
            type="number"
            min="0"
            step="0.01"
            required
            value={payment.amount}
            onChange={set("amount")}
          />
        </label>
        <label>
          Notes
          <textarea value={payment.notes || ""} onChange={set("notes")} />
        </label>
        <button className="primary full" disabled={busy}>
          Save changes
        </button>
      </form>
    </div>
  );
}

function Reports({
  report,
  runReport,
  range,
  setRange,
  customers,
  customerId,
  setCustomerId,
  status,
  setStatus,
  search,
  setSearch,
}) {
  const preset = (kind) => {
    const end = new Date();
    const start = new Date(end);
    if (kind === "week") start.setDate(end.getDate() - 6);
    if (kind === "month") start.setDate(1);
    if (kind === "year") {
      start.setMonth(0);
      start.setDate(1);
    }
    const iso = (date) => {
      const offset = date.getTimezoneOffset();
      return new Date(date.getTime() - offset * 60000)
        .toISOString()
        .slice(0, 10);
    };
    setRange({ from: iso(start), to: iso(end) });
  };
  const exportCsv = () => {
    if (!report) return;
    const rows = [
      [
        "Customer",
        "Finance Amount",
        "Interest",
        "Amount Given",
        "Total Return",
        "Period Collected",
        "Total Collected",
        "Remaining",
        "Profit",
        "Status",
      ],
      ...report.customers.map((row) => [
        row.customer_name,
        row.gross_finance_amount,
        row.initial_deduction,
        row.net_disbursement,
        row.agreed_total_payable,
        row.period_collected,
        row.total_collected,
        row.remaining,
        row.profit,
        row.status,
      ]),
    ];
    const csv = rows
      .map((row) =>
        row
          .map((value) => `"${String(value ?? "").replaceAll('"', '""')}"`)
          .join(","),
      )
      .join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `finance-report-${report.from}-to-${report.to}.csv`;
    link.click();
    URL.revokeObjectURL(link.href);
  };
  return (
    <section className="content">
      <div className="intro">
        <div>
          <span className="overline">REPORTS</span>
          <h2>Clear finance reports</h2>
          <p>Period collections and lifetime totals are shown separately.</p>
        </div>
      </div>
      <div className="reportBar">
        <div className="presetButtons">
          <button onClick={() => preset("day")}>Daily</button>
          <button onClick={() => preset("week")}>Weekly</button>
          <button onClick={() => preset("month")}>Monthly</button>
          <button onClick={() => preset("year")}>Yearly</button>
        </div>
        <input
          placeholder="Search customer"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />
        <select
          value={customerId}
          onChange={(event) => setCustomerId(event.target.value)}
        >
          <option value="">All customers</option>
          {customers.map((customer) => (
            <option key={customer.customer_id} value={customer.customer_id}>
              {customer.customer_name}
            </option>
          ))}
        </select>
        <select
          value={status}
          onChange={(event) => setStatus(event.target.value)}
        >
          <option value="">All statuses</option>
          <option value="ACTIVE">Active</option>
          <option value="COMPLETED">Completed</option>
        </select>
        <label>
          From
          <input
            type="date"
            value={range.from}
            onChange={(event) =>
              setRange({ ...range, from: event.target.value })
            }
          />
        </label>
        <label>
          To
          <input
            type="date"
            value={range.to}
            onChange={(event) => setRange({ ...range, to: event.target.value })}
          />
        </label>
        <button className="primary" onClick={runReport}>
          Generate report
        </button>
      </div>
      {report ? (
        <>
          <div className="metricGrid">
            <Metric
              title="Finance amount"
              value={report.totals.financeAmount}
            />
            <Metric title="Amount given" value={report.totals.given} />
            <Metric
              title="Total return"
              value={report.totals.totalReturn}
              tone="orange"
            />
            <Metric
              title="Period collection"
              value={report.totals.periodCollected}
              tone="green"
            />
            <Metric
              title="Total collected"
              value={report.totals.returned}
              tone="green"
            />
            <Metric
              title="Remaining"
              value={report.totals.remaining}
              tone="orange"
            />
            <Metric title="Profit" value={report.totals.profit} tone="green" />
          </div>
          <div className="exportBar">
            <button onClick={exportCsv}>Export Excel (CSV)</button>
            <button onClick={() => window.print()}>Export PDF / Print</button>
          </div>
          <div className="card tableWrap">
            <div className="cardHead">
              <div>
                <h3>Finance report</h3>
                <p>
                  {report.from} to {report.to}
                  {customerId ? " · Individual customer" : ""}
                </p>
              </div>
            </div>
            <table>
              <thead>
                <tr>
                  <th>Customer</th>
                  <th>Finance amount</th>
                  <th>Interest</th>
                  <th>Amount given</th>
                  <th>Total return</th>
                  <th>Period collected</th>
                  <th>Total collected</th>
                  <th>Remaining</th>
                  <th>Profit</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {report.customers.map((row) => (
                  <tr key={row.finance_id}>
                    <td>
                      <b>{row.customer_name}</b>
                      <small>{dateLabel(row.finance_date)}</small>
                    </td>
                    <td>{money(row.gross_finance_amount)}</td>
                    <td>{money(row.initial_deduction)}</td>
                    <td>{money(row.net_disbursement)}</td>
                    <td>{money(row.agreed_total_payable)}</td>
                    <td>{money(row.period_collected)}</td>
                    <td>{money(row.total_collected)}</td>
                    <td className="redText">{money(row.remaining)}</td>
                    <td className="greenText">{money(row.profit)}</td>
                    <td>
                      <span className={`tag ${row.status.toLowerCase()}`}>
                        {row.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      ) : (
        <Empty text="Choose a period and generate a report." />
      )}
    </section>
  );
}
function Empty({ text }) {
  return (
    <div className="empty">
      <div>
        <Plus size={22} />
      </div>
      <b>{text}</b>
    </div>
  );
}

function PhoneLink({ phone }) {
  return (
    <a
      className="phoneLink"
      href={`tel:${phone}`}
      onClick={(event) => event.stopPropagation()}
    >
      {phone}
    </a>
  );
}
