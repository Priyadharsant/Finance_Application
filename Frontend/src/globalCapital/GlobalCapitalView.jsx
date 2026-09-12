import React, { useEffect, useState, useMemo } from "react";
import useDocumentTitle from "../hooks/useDocumentTitle.js";
import { globalCapitalApi } from "./services/globalCapitalApi.js";

// Tab Components
import LedgerOverview from "./components/LedgerOverview.jsx";
import PartnerManagement from "./components/PartnerManagement.jsx";
import CapitalTransactionsTab from "./components/CapitalTransactionsTab.jsx";
import ExpensesTab from "./components/ExpensesTab.jsx";
import MonthlyClosingTab from "./components/MonthlyClosingTab.jsx";

// Modals
import AddPartnerModal from "./modals/AddPartnerModal.jsx";
import CapitalTransactionModal from "./modals/CapitalTransactionModal.jsx";
import AddExpenseModal from "./modals/AddExpenseModal.jsx";
import DraftClosingModal from "./modals/DraftClosingModal.jsx";
import LedgerTransactionModal from "./modals/LedgerTransactionModal.jsx";
import GlobalRecordDetailsModal from "./modals/GlobalRecordDetailsModal.jsx";
import DailyPartnerBreakdownModal from "./modals/DailyPartnerBreakdownModal.jsx";
import SegmentBreakdownModal from "./modals/SegmentBreakdownModal.jsx";
import ProfitPaymentModal from "./modals/ProfitPaymentModal.jsx";
import PartnerDetailsModal from "./modals/PartnerDetailsModal.jsx";

export default function GlobalCapitalView({ activeMenu, setNotice }) {
  // 1. Data State
  const [ledgerData, setLedgerData] = useState({
    availableCapital: 0,
    totalCredits: 0,
    totalDebits: 0,
    netProfit: 0,
    revenue: { totalRevenue: 0, autoRevenue: 0, dailyRevenue: 0 },
    expenses: { totalExpenses: 0, autoExpenses: 0, dailyExpenses: 0, generalExpenses: 0 },
    ledger: [],
  });
  const [partners, setPartners] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [expenseServerSummary, setExpenseServerSummary] = useState(null);
  const [closings, setClosings] = useState([]);
  const [profitCalcs, setProfitCalcs] = useState([]);
  const [loading, setLoading] = useState(false);

  // 2. Monthly Closing & Time-Weighted State
  const now = new Date();
  const prevMonthDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const [historyYear, setHistoryYear] = useState(prevMonthDate.getFullYear());
  const [historyMonth, setHistoryMonth] = useState(prevMonthDate.getMonth() + 1);
  const [historyMonthData, setHistoryMonthData] = useState(null);
  const [loadingHistoryMonth, setLoadingHistoryMonth] = useState(false);

  const [currentMonthEstimate, setCurrentMonthEstimate] = useState(null);
  const [loadingEstimate, setLoadingEstimate] = useState(false);

  const [cronStatus, setCronStatus] = useState(null);
  const [runningCron, setRunningCron] = useState(false);

  // Day-to-Day Calculation State
  const [dailyLogsData, setDailyLogsData] = useState(null);
  const [loadingDailyLogs, setLoadingDailyLogs] = useState(false);
  const [runningDailyCalc, setRunningDailyCalc] = useState(false);

  // 3. Filter States
  const [txFilterType, setTxFilterType] = useState("ALL");
  const [expenseFilterYear, setExpenseFilterYear] = useState(now.getFullYear().toString());
  const [expenseFilterMonth, setExpenseFilterMonth] = useState((now.getMonth() + 1).toString());
  const [expenseFilterCategory, setExpenseFilterCategory] = useState("ALL");
  const [expenseSearch, setExpenseSearch] = useState("");

  // Passed 12 Months list for quick pills
  const passedMonthsList = useMemo(() => {
    const list = [];
    for (let i = 1; i <= 12; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      list.push({
        year: d.getFullYear(),
        month: d.getMonth() + 1,
        label: d.toLocaleString("default", { month: "short", year: "numeric" }),
      });
    }
    return list;
  }, []);

  // 4. Modal States
  const [showAddPartner, setShowAddPartner] = useState(false);
  const [partnerFormData, setPartnerFormData] = useState({
    name: "",
    phone: "",
    email: "",
    pan_number: "",
    address: "",
    notes: "",
    initialContribution: "",
    effectiveDate: new Date().toISOString().slice(0, 10),
  });

  const [showCapitalModal, setShowCapitalModal] = useState(false);
  const [capitalActionType, setCapitalActionType] = useState("CONTRIBUTION");
  const [capitalFormData, setCapitalFormData] = useState({
    partnerId: "",
    amount: "",
    effectiveDate: new Date().toISOString().slice(0, 10),
    notes: "",
  });

  const [showAddExpense, setShowAddExpense] = useState(false);
  const [expenseFormData, setExpenseFormData] = useState({
    amount: "",
    category: "GENERAL",
    expenseType: "OFFICE_EXPENSE",
    description: "",
    expenseDate: new Date().toISOString().slice(0, 10),
  });

  const [showDraftModal, setShowDraftModal] = useState(false);
  const [draftData, setDraftData] = useState({
    year: now.getFullYear(),
    month: now.getMonth() + 1,
  });

  const [selectedRecord, setSelectedRecord] = useState(null);
  const [selectedDailyDetail, setSelectedDailyDetail] = useState(null);
  const [segmentModalData, setSegmentModalData] = useState(null);
  const [profitPaymentModal, setProfitPaymentModal] = useState(null);
  const [profitPaymentForm, setProfitPaymentForm] = useState({
    amount: "",
    paymentDate: new Date().toISOString().slice(0, 10),
    reference: "",
    notes: "",
  });

  const dynamicTitle = useMemo(() => {
    if (selectedRecord?.type === "partner" && selectedRecord.record) {
      return `${selectedRecord.record.partner_name || "Partner"} · Partner Dossier · Global Capital | FinFlow`;
    }
    if (selectedRecord?.type === "ledger" && selectedRecord.record) {
      return `Ledger Transaction #${selectedRecord.record.transaction_id || ""} · Global Capital | FinFlow`;
    }
    if (selectedRecord?.record) {
      return `Record Details · Global Capital | FinFlow`;
    }
    if (profitPaymentModal?.partner_name) {
      return `Profit Settlement (${profitPaymentModal.partner_name}) · Global Capital | FinFlow`;
    }
    if (showAddPartner) {
      return `Add Business Partner · Global Capital | FinFlow`;
    }
    if (showCapitalModal) {
      return `${capitalActionType === "CONTRIBUTION" ? "Add Partner Capital" : "Withdraw Partner Capital"} · Global Capital | FinFlow`;
    }
    if (showAddExpense) {
      return `Record Expense · Global Capital | FinFlow`;
    }
    if (showDraftModal) {
      return `Draft Monthly Closing · Global Capital | FinFlow`;
    }
    if (selectedDailyDetail) {
      return `Daily Breakdown (${selectedDailyDetail.calculation_date}) · Global Capital | FinFlow`;
    }
    if (segmentModalData) {
      return `Time-Weighted Segments · Global Capital | FinFlow`;
    }
    return `${activeMenu || "Ledger Overview"} · Global Capital | FinFlow`;
  }, [
    activeMenu,
    selectedRecord,
    profitPaymentModal,
    showAddPartner,
    showCapitalModal,
    capitalActionType,
    showAddExpense,
    showDraftModal,
    selectedDailyDetail,
    segmentModalData,
  ]);

  useDocumentTitle(dynamicTitle);

  // ----------------------------------------------------
  // Fetch Functions
  // ----------------------------------------------------
  const fetchLedger = async () => {
    setLoading(true);
    try {
      const data = await globalCapitalApi.getLedger();
      setLedgerData(data);
    } catch {
      setNotice({ type: "error", text: "Failed to fetch global cash ledger" });
    } finally {
      setLoading(false);
    }
  };

  const fetchPartners = async () => {
    setLoading(true);
    try {
      const data = await globalCapitalApi.getPartners();
      setPartners(Array.isArray(data) ? data : []);
    } catch {
      setNotice({ type: "error", text: "Failed to fetch partners" });
    } finally {
      setLoading(false);
    }
  };

  const fetchTransactions = async () => {
    setLoading(true);
    try {
      const data = await globalCapitalApi.getPartnerTransactions();
      setTransactions(Array.isArray(data) ? data : []);
    } catch {
      setNotice({ type: "error", text: "Failed to fetch transactions" });
    } finally {
      setLoading(false);
    }
  };

  const fetchExpenses = async () => {
    setLoading(true);
    try {
      const data = await globalCapitalApi.getExpenses({
        year: expenseFilterYear,
        month: expenseFilterMonth,
        category: expenseFilterCategory,
        search: expenseSearch,
      });
      const list = Array.isArray(data)
        ? data
        : Array.isArray(data?.expenses)
        ? data.expenses
        : [];
      setExpenses(list);
      if (data?.summary) {
        setExpenseServerSummary(data.summary);
      }
    } catch {
      setNotice({ type: "error", text: "Failed to fetch expenses" });
    } finally {
      setLoading(false);
    }
  };

  const fetchClosings = async () => {
    try {
      const data = await globalCapitalApi.getMonthlyClosings();
      setClosings(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error(e);
    }
  };

  const fetchProfitCalcs = async () => {
    try {
      const data = await globalCapitalApi.getProfitCalculations();
      setProfitCalcs(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error(e);
    }
  };

  const fetchCurrentMonthEstimate = async () => {
    setLoadingEstimate(true);
    try {
      const data = await globalCapitalApi.getCurrentMonthEstimate();
      setCurrentMonthEstimate(data);
    } catch (e) {
      console.error("Failed to fetch current month estimate", e);
    } finally {
      setLoadingEstimate(false);
    }
  };

  const fetchHistoryMonthData = async (y, m) => {
    setLoadingHistoryMonth(true);
    try {
      const data = await globalCapitalApi.getCurrentMonthEstimate(y, m);
      setHistoryMonthData(data);
    } catch (e) {
      console.error("Failed to fetch history month data", e);
    } finally {
      setLoadingHistoryMonth(false);
    }
  };

  const fetchDailyLogs = async (y, m) => {
    setLoadingDailyLogs(true);
    try {
      const data = await globalCapitalApi.getDailyProfitLogs(y, m);
      setDailyLogsData(data);
    } catch (e) {
      console.error("Failed to fetch daily profit logs", e);
    } finally {
      setLoadingDailyLogs(false);
    }
  };

  const fetchCronStatus = async () => {
    try {
      const data = await globalCapitalApi.getCronStatus();
      setCronStatus(data);
    } catch (e) {
      console.error("Failed to fetch cron status", e);
    }
  };

  // ----------------------------------------------------
  // Lifecycle
  // ----------------------------------------------------
  useEffect(() => {
    if (activeMenu === "Ledger Overview") fetchLedger();
    if (activeMenu === "Partner Management") fetchPartners();
    if (activeMenu === "Capital Transactions") {
      fetchTransactions();
      fetchPartners();
    }
    if (activeMenu === "Expenses") fetchExpenses();
    if (activeMenu === "Monthly Closing") {
      fetchCurrentMonthEstimate();
      fetchDailyLogs();
      fetchHistoryMonthData(historyYear, historyMonth);
      fetchClosings();
      fetchProfitCalcs();
      fetchCronStatus();
    }
  }, [activeMenu, expenseFilterYear, expenseFilterMonth, expenseFilterCategory, expenseSearch]);

  // ----------------------------------------------------
  // Action Handlers
  // ----------------------------------------------------
  const handleAddPartner = async (e) => {
    e.preventDefault();
    try {
      const res = await globalCapitalApi.createPartner(partnerFormData);
      setNotice({ type: "success", text: "Partner registered successfully" });
      setShowAddPartner(false);
      setPartnerFormData({
        name: "",
        phone: "",
        email: "",
        pan_number: "",
        address: "",
        notes: "",
        initialContribution: "",
        effectiveDate: new Date().toISOString().slice(0, 10),
      });
      fetchPartners();
      if (partnerFormData.initialContribution) {
        fetchTransactions();
        fetchLedger();
      }
    } catch (err) {
      setNotice({ type: "error", text: err.message });
    }
  };

  const openCapitalAction = (partnerId = null, action = "CONTRIBUTION") => {
    setCapitalActionType(action);
    setCapitalFormData({
      partnerId: partnerId || "",
      amount: "",
      effectiveDate: new Date().toISOString().slice(0, 10),
      notes: "",
    });
    setShowCapitalModal(true);
  };

  const handleCapitalTransaction = async (e) => {
    e.preventDefault();
    try {
      if (capitalActionType === "WITHDRAWAL") {
        await globalCapitalApi.createWithdrawal({
          partnerId: capitalFormData.partnerId,
          amount: parseFloat(capitalFormData.amount),
          effectiveDate: capitalFormData.effectiveDate,
          notes: capitalFormData.notes,
        });
        setNotice({ type: "success", text: "Withdrawal recorded successfully" });
      } else {
        await globalCapitalApi.createContribution({
          partnerId: capitalFormData.partnerId,
          amount: parseFloat(capitalFormData.amount),
          effectiveDate: capitalFormData.effectiveDate,
          notes: capitalFormData.notes,
        });
        setNotice({ type: "success", text: "Capital contribution added successfully" });
      }
      setShowCapitalModal(false);
      fetchTransactions();
      fetchPartners();
      fetchLedger();
    } catch (err) {
      setNotice({ type: "error", text: err.message });
    }
  };

  const handleAddExpense = async (e) => {
    e.preventDefault();
    try {
      await globalCapitalApi.createExpense({
        ...expenseFormData,
        amount: parseFloat(expenseFormData.amount),
      });
      setNotice({ type: "success", text: "Expense recorded successfully" });
      setShowAddExpense(false);
      setExpenseFormData({
        amount: "",
        category: "GENERAL",
        expenseType: "OFFICE_EXPENSE",
        description: "",
        expenseDate: new Date().toISOString().slice(0, 10),
      });
      fetchExpenses();
      fetchLedger();
    } catch (err) {
      setNotice({ type: "error", text: err.message });
    }
  };

  const handleDeleteExpense = async (id) => {
    if (!window.confirm("Are you sure you want to delete this expense record?")) return;
    try {
      await globalCapitalApi.deleteExpense(id);
      setNotice({ type: "success", text: "Expense removed successfully" });
      fetchExpenses();
      fetchLedger();
    } catch (err) {
      setNotice({ type: "error", text: err.message });
    }
  };

  const handleRunDraft = async (e) => {
    e.preventDefault();
    try {
      await globalCapitalApi.createDraftMonthlyClosing({
        year: parseInt(draftData.year, 10),
        month: parseInt(draftData.month, 10),
      });
      setNotice({ type: "success", text: "Closing draft generated" });
      setShowDraftModal(false);
      fetchClosings();
    } catch (err) {
      setNotice({ type: "error", text: err.message });
    }
  };

  const handleTriggerCron = async () => {
    if (
      !window.confirm(
        "Trigger automated Date 1 monthly closing now? This calculates operational revenue & expenses for the previous month, allocates net profit via Time-Weighted Capital, and credits partner accounts automatically."
      )
    ) {
      return;
    }
    setRunningCron(true);
    try {
      const data = await globalCapitalApi.runMonthlyClosing({ force: true });
      if (data.success) {
        setNotice({ type: "success", text: data.message });
        fetchCurrentMonthEstimate();
        fetchHistoryMonthData(historyYear, historyMonth);
        fetchProfitCalcs();
        fetchCronStatus();
        fetchPartners();
        fetchLedger();
      } else {
        throw new Error(data.error || data.message || "Failed to execute cron closing");
      }
    } catch (e) {
      setNotice({ type: "error", text: e.message });
    } finally {
      setRunningCron(false);
    }
  };

  const handleRunDailyCalc = async (targetDate = null) => {
    setRunningDailyCalc(true);
    try {
      const data = await globalCapitalApi.runDailyCalculation(targetDate ? { date: targetDate } : {});
      if (data.success) {
        setNotice({ type: "success", text: data.message || "Daily calculation completed successfully." });
        fetchDailyLogs();
        fetchCurrentMonthEstimate();
        fetchCronStatus();
      } else {
        throw new Error(data.error || "Failed to run daily calculation");
      }
    } catch (e) {
      setNotice({ type: "error", text: e.message });
    } finally {
      setRunningDailyCalc(false);
    }
  };

  const handleProfitPaymentSubmit = async (e) => {
    e.preventDefault();
    if (!profitPaymentModal) return;
    try {
      await globalCapitalApi.recordProfitPayment({
        partnerId: profitPaymentModal.partner_id,
        allocationId: profitPaymentModal.id,
        amount: parseFloat(profitPaymentForm.amount),
        paymentDate: profitPaymentForm.paymentDate,
        reference: profitPaymentForm.reference,
        notes: profitPaymentForm.notes,
      });
      setNotice({ type: "success", text: "Profit settlement payment recorded" });
      setProfitPaymentModal(null);
      fetchProfitCalcs();
      fetchLedger();
    } catch (err) {
      setNotice({ type: "error", text: err.message });
    }
  };

  // ----------------------------------------------------
  // Derived Summaries
  // ----------------------------------------------------
  const totalCredits = useMemo(() => {
    return (
      ledgerData.ledger
        ?.filter((tx) => tx.direction === "CREDIT")
        .reduce((sum, tx) => sum + Number(tx.amount || 0), 0) || 0
    );
  }, [ledgerData.ledger]);

  const totalDebits = useMemo(() => {
    return (
      ledgerData.ledger
        ?.filter((tx) => tx.direction === "DEBIT")
        .reduce((sum, tx) => sum + Number(tx.amount || 0), 0) || 0
    );
  }, [ledgerData.ledger]);

  const expenseSummary = useMemo(() => {
    const list = Array.isArray(expenses) ? expenses : [];
    const totalFiltered =
      expenseServerSummary?.totalFiltered ??
      list.reduce((sum, e) => sum + Number(e.amount || 0), 0);
    const countFiltered =
      expenseServerSummary?.countFiltered ?? list.length;
    const allTimeTotal =
      expenseServerSummary?.allTimeTotal ??
      Number(ledgerData.expenses?.totalExpenses || totalFiltered);
    const allTimeCount =
      expenseServerSummary?.allTimeCount ?? list.length;

    const categoryBreakdown = expenseServerSummary?.categoryBreakdown || {
      AUTO: { total: 0, count: 0 },
      DAILY: { total: 0, count: 0 },
      GENERAL: { total: 0, count: 0 },
    };

    if (!expenseServerSummary?.categoryBreakdown) {
      list.forEach((e) => {
        const cat = e.category || "GENERAL";
        if (!categoryBreakdown[cat]) {
          categoryBreakdown[cat] = { total: 0, count: 0 };
        }
        categoryBreakdown[cat].total += Number(e.amount || 0);
        categoryBreakdown[cat].count += 1;
      });
    }

    return {
      totalFiltered,
      countFiltered,
      allTimeTotal,
      allTimeCount,
      categoryBreakdown,
    };
  }, [expenses, expenseServerSummary, ledgerData.expenses]);

  return (
    <>
      {/* ---------------- 1. LEDGER OVERVIEW (DASHBOARD) ---------------- */}
      {activeMenu === "Ledger Overview" && (
        <LedgerOverview
          ledgerData={ledgerData}
          totalCredits={totalCredits}
          totalDebits={totalDebits}
          onSelectRecord={setSelectedRecord}
        />
      )}

      {/* ---------------- 2. PARTNER MANAGEMENT ---------------- */}
      {activeMenu === "Partner Management" && (
        <PartnerManagement
          partners={partners}
          onOpenAddPartner={() => setShowAddPartner(true)}
          onOpenCapitalAction={openCapitalAction}
          onSelectRecord={setSelectedRecord}
        />
      )}

      {/* ---------------- 3. CAPITAL TRANSACTIONS ---------------- */}
      {activeMenu === "Capital Transactions" && (
        <CapitalTransactionsTab
          transactions={transactions}
          txFilterType={txFilterType}
          setTxFilterType={setTxFilterType}
          onOpenCapitalAction={openCapitalAction}
          onSelectRecord={setSelectedRecord}
        />
      )}

      {/* ---------------- 4. EXPENSES ---------------- */}
      {activeMenu === "Expenses" && (
        <ExpensesTab
          expenses={expenses}
          expenseSummary={expenseSummary}
          expenseFilterMonth={expenseFilterMonth}
          setExpenseFilterMonth={setExpenseFilterMonth}
          expenseFilterYear={expenseFilterYear}
          setExpenseFilterYear={setExpenseFilterYear}
          expenseFilterCategory={expenseFilterCategory}
          setExpenseFilterCategory={setExpenseFilterCategory}
          expenseSearch={expenseSearch}
          setExpenseSearch={setExpenseSearch}
          onOpenAddExpense={() => setShowAddExpense(true)}
          onDeleteExpense={handleDeleteExpense}
          onSelectRecord={setSelectedRecord}
        />
      )}

      {/* ---------------- 5. MONTHLY CLOSING & TIME-WEIGHTED CAPITAL ---------------- */}
      {activeMenu === "Monthly Closing" && (
        <MonthlyClosingTab
          currentMonthEstimate={currentMonthEstimate}
          loadingEstimate={loadingEstimate}
          onRefreshEstimate={fetchCurrentMonthEstimate}
          cronStatus={cronStatus}
          runningCron={runningCron}
          onTriggerCron={handleTriggerCron}
          dailyLogsData={dailyLogsData}
          loadingDailyLogs={loadingDailyLogs}
          runningDailyCalc={runningDailyCalc}
          onRefreshDailyLogs={fetchDailyLogs}
          onRunDailyCalc={handleRunDailyCalc}
          onViewDailyDetail={setSelectedDailyDetail}
          onOpenSegmentModal={setSegmentModalData}
          passedMonthsList={passedMonthsList}
          historyYear={historyYear}
          setHistoryYear={setHistoryYear}
          historyMonth={historyMonth}
          setHistoryMonth={setHistoryMonth}
          historyMonthData={historyMonthData}
          loadingHistoryMonth={loadingHistoryMonth}
          onFetchHistoryMonth={fetchHistoryMonthData}
        />
      )}

      {/* ---------------- MODALS ---------------- */}
      <AddPartnerModal
        show={showAddPartner}
        close={() => setShowAddPartner(false)}
        partnerFormData={partnerFormData}
        setPartnerFormData={setPartnerFormData}
        onSubmit={handleAddPartner}
      />

      <CapitalTransactionModal
        show={showCapitalModal}
        close={() => setShowCapitalModal(false)}
        capitalActionType={capitalActionType}
        setCapitalActionType={setCapitalActionType}
        capitalFormData={capitalFormData}
        setCapitalFormData={setCapitalFormData}
        partners={partners}
        onSubmit={handleCapitalTransaction}
      />

      <AddExpenseModal
        show={showAddExpense}
        close={() => setShowAddExpense(false)}
        expenseFormData={expenseFormData}
        setExpenseFormData={setExpenseFormData}
        onSubmit={handleAddExpense}
      />

      <DraftClosingModal
        show={showDraftModal}
        close={() => setShowDraftModal(false)}
        draftData={draftData}
        setDraftData={setDraftData}
        onSubmit={handleRunDraft}
      />

      {/* Transaction Details Modal */}
      {selectedRecord?.type === "ledger" && (
        <LedgerTransactionModal
          record={selectedRecord.record}
          close={() => setSelectedRecord(null)}
        />
      )}

      {/* Partner Dossier Modal */}
      {selectedRecord?.type === "partner" && (
        <PartnerDetailsModal
          partner={selectedRecord.record}
          close={() => setSelectedRecord(null)}
          onAddMoney={(pId) => {
            setSelectedRecord(null);
            openCapitalAction(pId, "CONTRIBUTION");
          }}
          onWithdraw={(pId) => {
            setSelectedRecord(null);
            openCapitalAction(pId, "WITHDRAWAL");
          }}
        />
      )}

      {/* Other Record Details Modal */}
      {selectedRecord &&
        selectedRecord.type !== "ledger" &&
        selectedRecord.type !== "partner" && (
          <GlobalRecordDetailsModal
            type={selectedRecord.type}
            record={selectedRecord.record}
            close={() => setSelectedRecord(null)}
          />
        )}

      {/* Daily Partner Breakdown Modal */}
      <DailyPartnerBreakdownModal
        record={selectedDailyDetail}
        close={() => setSelectedDailyDetail(null)}
      />

      {/* Segment Breakdown Modal */}
      <SegmentBreakdownModal
        data={segmentModalData}
        close={() => setSegmentModalData(null)}
      />

      {/* Profit Payment Modal */}
      <ProfitPaymentModal
        allocation={profitPaymentModal}
        form={profitPaymentForm}
        setForm={setProfitPaymentForm}
        submit={handleProfitPaymentSubmit}
        close={() => setProfitPaymentModal(null)}
      />
    </>
  );
}
