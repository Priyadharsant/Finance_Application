import React, { useState, useEffect, useMemo, useRef } from "react";
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

// Modals
import FinanceFormModal from "./modals/FinanceFormModal.jsx";
import CustomerDetailsModal from "./modals/CustomerDetailsModal.jsx";
import PaymentEditorModal from "./modals/PaymentEditorModal.jsx";
import CloseLoanModal from "./modals/CloseLoanModal.jsx";
import IncreaseLoanModal from "./modals/IncreaseLoanModal.jsx";
import { X, Loader2 } from "lucide-react";

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
  const [customerSearch, setCustomerSearch] = useState("");
  const [customerStatus, setCustomerStatus] = useState("");
  const [details, setDetails] = useState(null);
  const [editingPayment, setEditingPayment] = useState(null);
  const [closingCustomer, setClosingCustomer] = useState(null);
  const [increasingCustomer, setIncreasingCustomer] = useState(null);
  const [finance, setFinance] = useState(emptyFinance);
  const [showAdd, setShowAdd] = useState(false);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(null);
  const [loadingDetails, setLoadingDetails] = useState(null);
  const customerCacheRef = useRef(new Map());

  // Dynamic document title
  const dynamicTitle = useMemo(() => {
    if (details?.customer?.customer_name) {
      return `${details.customer.customer_name} · Customer Details | KAMBAM FINANCE`;
    }
    if (showAdd) {
      return `New Customer Finance · Daily Finance | KAMBAM FINANCE`;
    }
    if (editingPayment) {
      return `Edit Payment · Daily Finance | KAMBAM FINANCE`;
    }
    return `${activeMenu} · Daily Finance | KAMBAM FINANCE`;
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

  const loadInitialData = async (showLoading = true) => {
    if (showLoading) setLoading(true);
    try {
      await Promise.allSettled([
        dailyFinanceApi.getDashboard(entryDate).then(setDashboard),
        dailyFinanceApi.getDailyEntry(entryDate).then(setDaily),
      ]);
    } catch (error) {
      setNotice?.({ type: "error", text: error.message });
    } finally {
      if (showLoading) setLoading(false);
    }
  };

  useEffect(() => {
    loadInitialData();
  }, [entryDate, activeMenu]);

  const submitFinance = async (event) => {
    event.preventDefault();
    if (busy || actionLoading) return;
    setBusy(true);
    setActionLoading("Saving New Customer Finance...");
    try {
      await dailyFinanceApi.createFinance(finance);
      setFinance(emptyFinance);
      setShowAdd(false);
      setBusy(false);
      setActionLoading(null);
      setPage?.("Customers");
      setNotice?.({ type: "success", text: "Finance saved successfully" });
      customerCacheRef.current.clear();
      loadDashboard();
    } catch (error) {
      setNotice?.({ type: "error", text: error.message });
      setBusy(false);
      setActionLoading(null);
    }
  };

  const savePayment = async (customer, amount) => {
    if (busy || actionLoading || !amount || Number(amount) < 0) return;
    setBusy(true);
    setActionLoading("Recording Daily Collection...");
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
      setBusy(false);
      setActionLoading(null);
      setNotice?.({
        type: "success",
        text: customer.today_payment_id
          ? "Collection updated"
          : "Collection saved",
      });
      customerCacheRef.current.delete(customer.customer_id);
      Promise.all([loadDashboard(), loadDaily()]);
    } catch (error) {
      setNotice?.({ type: "error", text: error.message });
      setBusy(false);
      setActionLoading(null);
    }
  };

  const updatePayment = async (event) => {
    event.preventDefault();
    if (busy || actionLoading) return;
    setBusy(true);
    setActionLoading("Updating Collection Record...");
    try {
      await dailyFinanceApi.updatePayment(
        editingPayment.payment_id,
        editingPayment,
      );
      const custId = details?.customer?.customer_id;
      setEditingPayment(null);
      setBusy(false);
      setActionLoading(null);
      setNotice?.({ type: "success", text: "Collection updated" });
      customerCacheRef.current.clear();
      Promise.all([loadDashboard(), loadDaily()]);
      if (custId) openDetails(custId);
    } catch (error) {
      setNotice?.({ type: "error", text: error.message });
      setBusy(false);
      setActionLoading(null);
    }
  };

  const handleCloseLoan = async (payload) => {
    if (busy || actionLoading) return;
    setBusy(true);
    setActionLoading("Closing Loan Account...");
    try {
      await dailyFinanceApi.closeLoan(payload.financeId, payload);
      const custId = details?.customer?.customer_id;
      setClosingCustomer(null);
      setBusy(false);
      setActionLoading(null);
      setNotice?.({ type: "success", text: "Loan closed successfully" });
      customerCacheRef.current.clear();
      Promise.all([loadDashboard(), loadDaily()]);
      if (custId) openDetails(custId);
    } catch (error) {
      setNotice?.({ type: "error", text: error.message });
      setBusy(false);
      setActionLoading(null);
    }
  };

  const handleIncreaseLoan = async (payload) => {
    if (busy || actionLoading) return;
    setBusy(true);
    setActionLoading("Closing previous loan & starting new loan...");
    try {
      const res = await dailyFinanceApi.increaseLoanAmount(payload.financeId, payload);
      const custId = details?.customer?.customer_id || payload.customerId;
      setIncreasingCustomer(null);
      setBusy(false);
      setActionLoading(null);
      setNotice?.({
        type: "success",
        text: res.message || "Previous loan closed and new loan started successfully",
      });
      customerCacheRef.current.clear();
      Promise.all([loadDashboard(), loadDaily()]);
      if (custId) openDetails(custId);
    } catch (error) {
      setNotice?.({ type: "error", text: error.message });
      setBusy(false);
      setActionLoading(null);
    }
  };

  const openDetails = async (customerId, preloaded = null) => {
    // 1. Instant return if already cached
    const cached = customerCacheRef.current.get(customerId);
    if (cached) {
      setDetails(cached);
      // Revalidate in background silently
      dailyFinanceApi.getCustomerDetails(customerId).then((fresh) => {
        customerCacheRef.current.set(customerId, fresh);
        setDetails(fresh);
      }).catch(() => {});
      return;
    }

    const preloadedCustomer = preloaded && typeof preloaded === "object" ? preloaded : null;
    const customerName = preloadedCustomer?.customer_name || (typeof preloaded === "string" ? preloaded : "");

    // 2. Optimistically open modal INSTANTLY if customer summary is available from table row!
    if (preloadedCustomer && (preloadedCustomer.gross_finance_amount !== undefined || preloadedCustomer.finance_id)) {
      setDetails({
        customer: preloadedCustomer,
        collections: [],
        accounts: [preloadedCustomer],
        isLoadingCollections: true,
      });
    } else {
      setLoadingDetails({ id: customerId, name: customerName });
    }

    try {
      const data = await dailyFinanceApi.getCustomerDetails(customerId);
      customerCacheRef.current.set(customerId, data);
      setDetails({ ...data, isLoadingCollections: false });
    } catch (error) {
      setNotice?.({ type: "error", text: error.message });
      if (preloadedCustomer) setDetails(null);
    } finally {
      setLoadingDetails(null);
    }
  };

  const filteredCustomers = useMemo(
    () =>
      dashboard.customers
        .filter(
          (customer) =>
            (!customerSearch ||
              customer.customer_name
                .toLowerCase()
                .includes(customerSearch.toLowerCase())) &&
            (!customerStatus || customer.status === customerStatus),
        )
        .sort((a, b) => {
          const da = new Date(a.finance_date || 0).getTime();
          const db = new Date(b.finance_date || 0).getTime();
          if (da !== db) return da - db;
          const ca = new Date(a.created_at || a.account_created_at || 0).getTime();
          const cb = new Date(b.created_at || b.account_created_at || 0).getTime();
          return ca - cb;
        }),
    [dashboard.customers, customerSearch, customerStatus],
  );

  const position = dashboard.position || {};

  return (
    <div className="dailyFinanceContainer">
      {/* IN-PAGE DATA LOADING ANIMATION (NO BLOCKING POPUP) */}
      {loading ? (
        <div className="inPageDataLoader">
          <div className="inPageDataSpinner" />
          <h3>Loading Daily Finance Records...</h3>
          <p>Fetching daily accounts, payments, and customer records...</p>
        </div>
      ) : (
        <>
          {activeMenu === "Dashboard" && (
            <DailyDashboard
              position={position}
              customers={dashboard.customers}
              recent={dashboard.recentPayments}
              setPage={setPage}
              openDetails={openDetails}
              loadingDetailsId={loadingDetails?.id}
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
              loadingDetailsId={loadingDetails?.id}
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
              loadingDetailsId={loadingDetails?.id}
              onEditPayment={setEditingPayment}
              busy={busy}
            />
          )}
        </>
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

      {/* Customer Details Fetching Loading Dialog */}
      {loadingDetails && (
        <div
          className="modal"
          onClick={() => setLoadingDetails(null)}
          style={{
            zIndex: 1100,
            background: "rgba(15, 23, 42, 0.4)",
            backdropFilter: "blur(3px)",
            animation: "autoFadeIn 0.2s ease-out",
          }}
        >
          <div
            className="formCard modalForm"
            onClick={(e) => e.stopPropagation()}
            style={{
              width: "min(400px, 92vw)",
              textAlign: "center",
              padding: "36px 24px 28px",
              borderRadius: "16px",
              boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              position: "relative",
            }}
          >
            <button
              type="button"
              className="close"
              onClick={() => setLoadingDetails(null)}
              title="Cancel"
            >
              <X size={18} />
            </button>

            <div
              className="inPageDataSpinner"
              style={{
                width: "46px",
                height: "46px",
                borderWidth: "4px",
                borderTopColor: "#0d9488",
                marginBottom: "16px",
              }}
            />

            <span
              className="overline"
              style={{
                color: "#0d9488",
                fontWeight: "700",
                letterSpacing: "0.08em",
                marginBottom: "4px",
              }}
            >
              FETCHING DETAILS
            </span>

            <h3
              style={{
                margin: "0 0 6px 0",
                fontSize: "17px",
                fontWeight: "800",
                color: "#0f172a",
              }}
            >
              {loadingDetails.name ? loadingDetails.name : "Customer Details"}
            </h3>

            <p style={{ margin: 0, fontSize: "13px", color: "#64748b" }}>
              Loading loan accounts, collections & statements...
            </p>

            <div
              style={{
                marginTop: "20px",
                width: "100%",
                height: "5px",
                background: "#e2e8f0",
                borderRadius: "999px",
                overflow: "hidden",
                position: "relative",
              }}
            >
              <div
                style={{
                  position: "absolute",
                  top: 0,
                  left: 0,
                  width: "40%",
                  height: "100%",
                  background: "linear-gradient(90deg, #0d9488, #0ea5e9)",
                  borderRadius: "999px",
                  animation: "shimmerProgress 1.4s infinite ease-in-out",
                }}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
