import React, { useState, useEffect, useMemo } from "react";
import useDocumentTitle from "../hooks/useDocumentTitle.js";
import {
  dailyFinanceApi,
  today,
  emptyFinance,
} from "./services/dailyFinanceApi.js";
import "./dailyFinance.css";

// Tab Components
import DailyDashboard from "./components/DailyDashboard.jsx";
import DailyCustomers from "./components/DailyCustomers.jsx";
import DailyEntryTab from "./components/DailyEntryTab.jsx";
import DailyReports from "./components/DailyReports.jsx";

// Modals
import FinanceFormModal from "./modals/FinanceFormModal.jsx";
import CustomerDetailsModal from "./modals/CustomerDetailsModal.jsx";
import PaymentEditorModal from "./modals/PaymentEditorModal.jsx";
import CloseLoanModal from "./modals/CloseLoanModal.jsx";
import IncreaseLoanModal from "./modals/IncreaseLoanModal.jsx";

export default function DailyFinanceView({
  activeMenu = "Dashboard",
  setPage,
  setNotice,
  entryDate: externalEntryDate,
  setEntryDate: externalSetEntryDate,
}) {
  const [internalEntryDate, setInternalEntryDate] = useState(today());
  const entryDate = externalEntryDate !== undefined ? externalEntryDate : internalEntryDate;
  const setEntryDate = externalSetEntryDate || setInternalEntryDate;

  const [dashboard, setDashboard] = useState({
    position: {},
    customers: [],
    recentPayments: [],
  });
  const [daily, setDaily] = useState({ date: today(), customers: [] });
  const [report, setReport] = useState(null);
  const [reportRange, setReportRange] = useState({
    from: today(),
    to: today(),
  });
  const [reportCustomerId, setReportCustomerId] = useState("");
  const [reportStatus, setReportStatus] = useState("");
  const [reportSearch, setReportSearch] = useState("");
  const [reportScope, setReportScope] = useState("all");
  const [customerSearch, setCustomerSearch] = useState("");
  const [customerStatus, setCustomerStatus] = useState("");
  const [details, setDetails] = useState(null);
  const [editingPayment, setEditingPayment] = useState(null);
  const [closingCustomer, setClosingCustomer] = useState(null);
  const [increasingCustomer, setIncreasingCustomer] = useState(null);
  const [finance, setFinance] = useState(emptyFinance);
  const [showAdd, setShowAdd] = useState(false);
  const [busy, setBusy] = useState(false);

  // Dynamic document title
  const dynamicTitle = useMemo(() => {
    if (details?.customer?.customer_name) {
      return `${details.customer.customer_name} · Customer Details | FinFlow`;
    }
    if (showAdd) {
      return `New Customer Finance · Daily Finance | FinFlow`;
    }
    if (editingPayment) {
      return `Edit Payment · Daily Finance | FinFlow`;
    }
    return `${activeMenu} · Daily Finance | FinFlow`;
  }, [activeMenu, details, showAdd, editingPayment]);

  useDocumentTitle(dynamicTitle);

  const loadDashboard = () =>
    dailyFinanceApi
      .getDashboard(entryDate)
      .then(setDashboard)
      .catch((error) => setNotice?.({ type: "error", text: error.message }));

  const loadDaily = () =>
    dailyFinanceApi
      .getDailyEntry(entryDate)
      .then(setDaily)
      .catch((error) => setNotice?.({ type: "error", text: error.message }));

  useEffect(() => {
    loadDashboard();
    loadDaily();
  }, [entryDate]);

  const submitFinance = async (event) => {
    event.preventDefault();
    setBusy(true);
    try {
      await dailyFinanceApi.createFinance(finance);
      setFinance(emptyFinance);
      setShowAdd(false);
      setPage?.("Customers");
      setNotice?.({ type: "success", text: "Finance saved successfully" });
      await loadDashboard();
    } catch (error) {
      setNotice?.({ type: "error", text: error.message });
    } finally {
      setBusy(false);
    }
  };

  const savePayment = async (customer, amount) => {
    if (!amount || Number(amount) < 0) return;
    setBusy(true);
    try {
      if (customer.today_payment_id) {
        await dailyFinanceApi.updatePayment(customer.today_payment_id, {
          collectionDate: entryDate,
          amount,
        });
      } else {
        await dailyFinanceApi.createPayment({
          customerId: customer.customer_id,
          financeId: customer.finance_id,
          collectionDate: entryDate,
          amount,
        });
      }
      setNotice?.({
        type: "success",
        text: customer.today_payment_id
          ? "Collection updated"
          : "Collection saved",
      });
      await Promise.all([loadDashboard(), loadDaily()]);
    } catch (error) {
      setNotice?.({ type: "error", text: error.message });
    } finally {
      setBusy(false);
    }
  };

  const updatePayment = async (event) => {
    event.preventDefault();
    setBusy(true);
    try {
      await dailyFinanceApi.updatePayment(
        editingPayment.payment_id,
        editingPayment,
      );
      setEditingPayment(null);
      setNotice?.({ type: "success", text: "Collection updated" });
      await Promise.all([loadDashboard(), loadDaily()]);
      if (details) openDetails(details.customer.customer_id);
    } catch (error) {
      setNotice?.({ type: "error", text: error.message });
    } finally {
      setBusy(false);
    }
  };

  const handleCloseLoan = async (payload) => {
    setBusy(true);
    try {
      await dailyFinanceApi.closeLoan(payload.financeId, payload);
      setClosingCustomer(null);
      setNotice?.({ type: "success", text: "Loan closed successfully" });
      await Promise.all([loadDashboard(), loadDaily()]);
      if (details) openDetails(details.customer.customer_id);
    } catch (error) {
      setNotice?.({ type: "error", text: error.message });
    } finally {
      setBusy(false);
    }
  };

  const handleIncreaseLoan = async (payload) => {
    setBusy(true);
    try {
      await dailyFinanceApi.increaseLoanAmount(payload.financeId, payload);
      setIncreasingCustomer(null);
      setNotice?.({ type: "success", text: "Loan amount increased successfully" });
      await Promise.all([loadDashboard(), loadDaily()]);
      if (details) openDetails(details.customer.customer_id);
    } catch (error) {
      setNotice?.({ type: "error", text: error.message });
    } finally {
      setBusy(false);
    }
  };

  const openDetails = async (customerId) => {
    try {
      const data = await dailyFinanceApi.getCustomerDetails(customerId);
      setDetails(data);
    } catch (error) {
      setNotice?.({ type: "error", text: error.message });
    }
  };

  const runReport = async (overrideRange, overrideScope) => {
    try {
      const activeRange = overrideRange || reportRange;
      const activeScope = overrideScope !== undefined ? overrideScope : reportScope;
      const params = {
        from: activeRange.from,
        to: activeRange.to,
        scope: activeScope,
      };
      if (reportCustomerId) params.customerId = reportCustomerId;
      if (reportStatus) params.status = reportStatus;
      if (reportSearch) params.search = reportSearch;
      const data = await dailyFinanceApi.getReports(params);
      setReport(data);
    } catch (error) {
      setNotice?.({ type: "error", text: error.message });
    }
  };

  useEffect(() => {
    if (activeMenu === "Reports" && !report) {
      runReport();
    }
  }, [activeMenu]);

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

  return (
    <>
      {activeMenu === "Dashboard" && (
        <DailyDashboard
          position={position}
          customers={dashboard.customers}
          recent={dashboard.recentPayments}
          setPage={setPage}
          openDetails={openDetails}
        />
      )}

      {activeMenu === "Customers" && (
        <DailyCustomers
          customers={filteredCustomers}
          search={customerSearch}
          setSearch={setCustomerSearch}
          status={customerStatus}
          setStatus={setCustomerStatus}
          setShowAdd={setShowAdd}
          openDetails={openDetails}
          onOpenCloseLoan={setClosingCustomer}
          onOpenIncreaseLoan={setIncreasingCustomer}
        />
      )}

      {activeMenu === "Daily entry" && (
        <DailyEntryTab
          date={entryDate}
          setDate={setEntryDate}
          daily={daily.customers}
          savePayment={savePayment}
          openDetails={openDetails}
          onEditPayment={setEditingPayment}
          busy={busy}
        />
      )}

      {activeMenu === "Reports" && (
        <DailyReports
          report={report}
          runReport={runReport}
          range={reportRange}
          setRange={setReportRange}
          scope={reportScope}
          setScope={setReportScope}
          customers={dashboard.customers}
          customerId={reportCustomerId}
          setCustomerId={setReportCustomerId}
          status={reportStatus}
          setStatus={setReportStatus}
          search={reportSearch}
          setSearch={setReportSearch}
        />
      )}

      {/* Modals */}
      {showAdd && (
        <FinanceFormModal
          finance={finance}
          setFinance={setFinance}
          submit={submitFinance}
          busy={busy}
          close={() => setShowAdd(false)}
        />
      )}

      {details && (
        <CustomerDetailsModal
          data={details}
          close={() => setDetails(null)}
          editPayment={setEditingPayment}
          onOpenCloseLoan={setClosingCustomer}
          onOpenIncreaseLoan={setIncreasingCustomer}
        />
      )}

      {editingPayment && (
        <PaymentEditorModal
          payment={editingPayment}
          setPayment={setEditingPayment}
          submit={updatePayment}
          close={() => setEditingPayment(null)}
          busy={busy}
        />
      )}

      {closingCustomer && (
        <CloseLoanModal
          customer={closingCustomer}
          onClose={() => setClosingCustomer(null)}
          onSubmit={handleCloseLoan}
          busy={busy}
        />
      )}

      {increasingCustomer && (
        <IncreaseLoanModal
          customer={increasingCustomer}
          onClose={() => setIncreasingCustomer(null)}
          onSubmit={handleIncreaseLoan}
          busy={busy}
        />
      )}
    </>
  );
}
