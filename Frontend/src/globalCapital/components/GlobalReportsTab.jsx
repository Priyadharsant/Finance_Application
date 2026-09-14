import React, { useState, useMemo } from "react";
import {
  FileSpreadsheet,
  Download,
  Calendar,
  Filter,
  CheckCircle2,
  RefreshCw,
  Sparkles,
  Layers,
  FileCheck,
  Building2,
  Users,
  Receipt,
  BookOpen,
  CarFront,
  WalletCards,
  ArrowDownCircle,
  CalendarRange,
  TableProperties,
} from "lucide-react";
import {
  exportPartnerBalances,
  exportSingleMonthClosing,
  exportYearWiseClosingReport,
  exportAllPassedMonthsClosings,
  exportDayToDayLogs,
  exportAllPassedMonthsDailyLogs,
  exportCapitalTransactions,
  exportBusinessExpenses,
  exportGlobalLedger,
  exportMasterFinancialReport,
  downloadExcelFile,
} from "../services/globalCapitalExportUtils.js";
import { globalCapitalApi } from "../services/globalCapitalApi.js";
import { apiCall } from "../../autoFinance/services/autoFinanceApi.js";

export default function GlobalReportsTab({
  ledgerData,
  partners = [],
  transactions = [],
  expenses = [],
  closings = [],
  dailyLogsData,
  setNotice,
}) {
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1;

  const [internalPartners, setInternalPartners] = useState(partners);

  React.useEffect(() => {
    if (partners && partners.length > 0) {
      setInternalPartners(partners);
    } else {
      globalCapitalApi
        .getPartners()
        .then((data) => setInternalPartners(Array.isArray(data) ? data : []))
        .catch(() => {});
    }
  }, [partners]);

  // 1. Core Selection: Report Type & Period Mode
  const [reportType, setReportType] = useState("MONTHLY_CLOSINGS");
  const [periodMode, setPeriodMode] = useState("MONTH_WISE"); // 'MONTH_WISE', 'YEAR_WISE', 'ALL_PASSED', 'CUSTOM_RANGE'

  // Parameters
  const [selectedMonth, setSelectedMonth] = useState(
    currentMonth === 1 ? 12 : currentMonth - 1
  );
  const [selectedYear, setSelectedYear] = useState(
    currentMonth === 1 ? currentYear - 1 : currentYear
  );
  const [passedMonthsCount, setPassedMonthsCount] = useState(12);

  // Optional Filters
  const [filterPartnerId, setFilterPartnerId] = useState("ALL");
  const [filterTxType, setFilterTxType] = useState("ALL");
  const [filterModule, setFilterModule] = useState("ALL");
  const [filterCategory, setFilterCategory] = useState("ALL");
  const [filterDateFrom, setFilterDateFrom] = useState("");
  const [filterDateTo, setFilterDateTo] = useState("");

  const [generating, setGenerating] = useState(false);
  const [statusMessage, setStatusMessage] = useState("");

  const monthsList = [
    { value: 1, name: "January" },
    { value: 2, name: "February" },
    { value: 3, name: "March" },
    { value: 4, name: "April" },
    { value: 5, name: "May" },
    { value: 6, name: "June" },
    { value: 7, name: "July" },
    { value: 8, name: "August" },
    { value: 9, name: "September" },
    { value: 10, name: "October" },
    { value: 11, name: "November" },
    { value: 12, name: "December" },
  ];

  const yearsList = [2024, 2025, 2026, 2027, 2028];

  // Helper to compile full 12 months for year-wise report
  const fetchYearMonthsData = async (targetYear) => {
    setStatusMessage(`Compiling full year ${targetYear} data (Jan to Dec)...`);
    const monthsData = [];
    for (let m = 1; m <= 12; m++) {
      try {
        const data = await globalCapitalApi.getCurrentMonthEstimate(targetYear, m);
        monthsData.push({
          ...data,
          year: targetYear,
          month: m,
        });
      } catch (e) {
        console.warn(`Could not load ${targetYear}-${m}:`, e);
      }
    }
    return monthsData;
  };

  // Helper to fetch multi-month daily profit logs for year-wise
  const fetchYearDailyLogs = async (targetYear) => {
    setStatusMessage(`Compiling daily P&L logs for year ${targetYear}...`);
    const allLogs = [];
    for (let m = 1; m <= 12; m++) {
      try {
        const res = await globalCapitalApi.getDailyProfitLogs(targetYear, m);
        if (res && res.logs && res.logs.length) {
          allLogs.push({
            ...res,
            monthName: new Date(targetYear, m - 1).toLocaleString("default", {
              month: "short",
              year: "numeric",
            }),
          });
        }
      } catch (e) {}
    }
    return allLogs;
  };

  // Helper to fetch passed months history
  const fetchPassedMonthsHistory = async (count = 12) => {
    setStatusMessage(`Compiling records for last ${count} passed months...`);
    const results = [];
    const baseDate = new Date();

    for (let i = 1; i <= count; i++) {
      const d = new Date(baseDate.getFullYear(), baseDate.getMonth() - i, 1);
      const y = d.getFullYear();
      const m = d.getMonth() + 1;
      try {
        const monthEstimate = await globalCapitalApi.getCurrentMonthEstimate(y, m);
        results.push({
          ...monthEstimate,
          year: y,
          month: m,
          isCurrentMonth: false,
        });
      } catch (e) {
        console.warn(`Could not load estimate for ${y}-${m}:`, e);
      }
    }
    return results;
  };

  // Main Generate and Download Handler
  const handleGenerateReport = async () => {
    try {
      setGenerating(true);
      setStatusMessage("Gathering report parameters & data...");

      switch (reportType) {
        // ----------------------------------------------------
        // 1. Monthly Closings & Profit Shares
        // ----------------------------------------------------
        case "MONTHLY_CLOSINGS": {
          if (periodMode === "MONTH_WISE") {
            setStatusMessage(`Fetching closing data for ${selectedMonth}/${selectedYear}...`);
            const monthData = await globalCapitalApi.getCurrentMonthEstimate(
              selectedYear,
              selectedMonth
            );
            exportSingleMonthClosing(monthData, selectedYear, selectedMonth);
          } else if (periodMode === "YEAR_WISE") {
            const yearData = await fetchYearMonthsData(selectedYear);
            exportYearWiseClosingReport(selectedYear, yearData);
          } else {
            // ALL_PASSED
            const passedData = await fetchPassedMonthsHistory(Number(passedMonthsCount) || 12);
            exportAllPassedMonthsClosings(passedData);
          }
          break;
        }

        // ----------------------------------------------------
        // 2. Day-to-Day Calculation Logs
        // ----------------------------------------------------
        case "DAY_TO_DAY_LOGS": {
          if (periodMode === "MONTH_WISE") {
            setStatusMessage(`Fetching daily logs for ${selectedMonth}/${selectedYear}...`);
            const logsData = await globalCapitalApi.getDailyProfitLogs(
              selectedYear,
              selectedMonth
            );
            exportDayToDayLogs(logsData, `${selectedYear}_${String(selectedMonth).padStart(2, "0")}`);
          } else if (periodMode === "YEAR_WISE") {
            const yearDailyLogs = await fetchYearDailyLogs(selectedYear);
            exportAllPassedMonthsDailyLogs(yearDailyLogs);
          } else {
            // ALL_PASSED
            const passedDailyLogs = await fetchPassedMonthsHistory(Number(passedMonthsCount) || 6);
            exportAllPassedMonthsDailyLogs(passedDailyLogs);
          }
          break;
        }

        // ----------------------------------------------------
        // 3. Partner Capital Accounts & Balances
        // ----------------------------------------------------
        case "PARTNER_BALANCES": {
          setStatusMessage("Exporting partner capital balances...");
          let currentPartners = internalPartners?.length ? internalPartners : partners;
          if (!currentPartners || currentPartners.length === 0) {
            const fresh = await globalCapitalApi.getPartners();
            currentPartners = Array.isArray(fresh) ? fresh : [];
            setInternalPartners(currentPartners);
          }
          exportPartnerBalances(currentPartners, filterPartnerId);
          break;
        }

        // ----------------------------------------------------
        // 4. Capital Transactions Ledger
        // ----------------------------------------------------
        case "CAPITAL_TRANSACTIONS": {
          setStatusMessage("Filtering and formatting capital transactions...");
          let currentTxs = transactions;
          if (!currentTxs || currentTxs.length === 0) {
            const fresh = await globalCapitalApi.getPartnerTransactions();
            currentTxs = Array.isArray(fresh) ? fresh : [];
          }
          const filters = {
            partnerId: filterPartnerId,
            type: filterTxType,
          };
          if (periodMode === "MONTH_WISE") {
            const start = `${selectedYear}-${String(selectedMonth).padStart(2, "0")}-01`;
            const lastDay = new Date(selectedYear, selectedMonth, 0).getDate();
            const end = `${selectedYear}-${String(selectedMonth).padStart(2, "0")}-${lastDay}`;
            filters.from = start;
            filters.to = end;
          } else if (periodMode === "YEAR_WISE") {
            filters.from = `${selectedYear}-01-01`;
            filters.to = `${selectedYear}-12-31`;
          } else if (periodMode === "CUSTOM_RANGE") {
            filters.from = filterDateFrom;
            filters.to = filterDateTo;
          }
          exportCapitalTransactions(currentTxs, filters);
          break;
        }

        // ----------------------------------------------------
        // 5. Business Expenses
        // ----------------------------------------------------
        case "BUSINESS_EXPENSES": {
          setStatusMessage("Querying business operating expenses...");
          const queryParams = {};
          if (periodMode === "MONTH_WISE") {
            queryParams.year = selectedYear.toString();
            queryParams.month = selectedMonth.toString();
          } else if (periodMode === "YEAR_WISE") {
            queryParams.year = selectedYear.toString();
          } else if (periodMode === "CUSTOM_RANGE") {
            queryParams.from = filterDateFrom;
            queryParams.to = filterDateTo;
          }
          if (filterCategory !== "ALL") queryParams.category = filterCategory;

          const res = await globalCapitalApi.getExpenses(queryParams);
          const list = res?.expenses || expenses || [];
          exportBusinessExpenses(list, {
            category: filterCategory,
            module: filterModule,
            label:
              periodMode === "MONTH_WISE"
                ? `${selectedYear}_${selectedMonth}`
                : periodMode === "YEAR_WISE"
                ? `Year_${selectedYear}`
                : "All_Time",
          });
          break;
        }

        // ----------------------------------------------------
        // 6. Global Cash General Ledger
        // ----------------------------------------------------
        case "GLOBAL_LEDGER": {
          setStatusMessage("Preparing general ledger entries...");
          let currentLedger = ledgerData?.ledger;
          if (!currentLedger || currentLedger.length === 0) {
            const fresh = await globalCapitalApi.getLedger();
            currentLedger = fresh?.ledger || [];
          }
          const filters = { type: filterTxType };
          if (periodMode === "MONTH_WISE") {
            const start = `${selectedYear}-${String(selectedMonth).padStart(2, "0")}-01`;
            const lastDay = new Date(selectedYear, selectedMonth, 0).getDate();
            filters.from = start;
            filters.to = `${selectedYear}-${String(selectedMonth).padStart(2, "0")}-${lastDay}`;
          } else if (periodMode === "YEAR_WISE") {
            filters.from = `${selectedYear}-01-01`;
            filters.to = `${selectedYear}-12-31`;
          } else if (periodMode === "CUSTOM_RANGE") {
            filters.from = filterDateFrom;
            filters.to = filterDateTo;
          }
          exportGlobalLedger(currentLedger, filters);
          break;
        }

        // ----------------------------------------------------
        // 7. Auto Finance Loans
        // ----------------------------------------------------
        case "AUTO_LOANS": {
          setStatusMessage("Fetching vehicle loans portfolio...");
          const res = await apiCall("/loans");
          const loans = Array.isArray(res)
            ? res
            : Array.isArray(res?.data)
            ? res.data
            : Array.isArray(res?.loans)
            ? res.loans
            : [];

          const rows = loans.map((l, idx) => {
            let fees = {};
            try {
              fees = typeof l.fees_details === "string" ? JSON.parse(l.fees_details || "{}") : (l.fees_details || {});
            } catch (_) {
              fees = {};
            }

            const incomeDue = Number(fees.incomeDue || 0);
            const documentFee = Number(fees.documentFee || 0);
            const hirePurchase = Number(fees.hirePurchase || 0);
            const taxAmount = Number(fees.taxAmount || 0);
            const insurance = Number(fees.insurance || 0);
            const insuranceFine = Number(fees.insuranceFine || 0);
            const greenTax = Number(fees.greenTax || 0);
            const fine = Number(fees.fine || 0);
            const nationalTax = Number(fees.nationalTax || 0);
            const permit = Number(fees.permit || 0);
            const brokerageCustomer = Number(fees.brokerageCustomer || 0);
            const brokerageHand = Number(fees.brokerageHand || 0);

            const totalDeductions =
              incomeDue +
              documentFee +
              hirePurchase +
              taxAmount +
              insurance +
              insuranceFine +
              greenTax +
              fine +
              nationalTax +
              permit +
              brokerageCustomer;

            const inHandAmount = Number(l.loan_amount || 0) - totalDeductions;

            return {
              "S.No": idx + 1,
              "Customer Code": l.customer_code || "—",
              "Customer Name": `${l.first_name || ""} ${l.last_name || ""}`.trim(),
              "Phone": l.phone || "—",
              "Vehicle": `${l.make || ""} ${l.model || ""}`.trim(),
              "Reg No": l.registration_number || "PENDING",
              "Loan Amount (₹)": Number(l.loan_amount || 0),
              "Income Due (₹)": incomeDue,
              "Document Fee (₹)": documentFee,
              "Hire Purchase (₹)": hirePurchase,
              "Tax Amount (₹)": taxAmount,
              "Insurance (₹)": insurance,
              "Insurance Fine (₹)": insuranceFine,
              "Green Tax (₹)": greenTax,
              "Fine (₹)": fine,
              "National Tax (₹)": nationalTax,
              "Permit (₹)": permit,
              "Brokerage (Customer) (₹)": brokerageCustomer,
              "Brokerage (By Hand) (₹)": brokerageHand,
              "Total Deductions & Fees (₹)": totalDeductions,
              "Amount Given to Customer (After All Deductions) (₹)": inHandAmount,
              "Interest Rate (%)": Number(l.interest_rate || 0),
              "Tenure (Months)": Number(l.tenure_months || 0),
              "Total Collected (₹)": Number(l.total_paid || 0),
              "Pending Dues": Number(l.pending_dues_count || 0),
              "Status": l.status || "ACTIVE",
            };
          });

          downloadExcelFile(
            rows.length ? rows : [{ Message: "No vehicle loans found." }],
            "Auto Loans",
            `Auto_Finance_Loans_Portfolio_${new Date().toISOString().slice(0, 10)}`
          );
          break;
        }

        // ----------------------------------------------------
        // 8. Daily Finance Accounts
        // ----------------------------------------------------
        case "DAILY_FINANCE": {
          setStatusMessage("Fetching daily finance accounts...");
          const res = await fetch("http://localhost:3000/api/daily-finance/dashboard");
          if (!res.ok) throw new Error("Failed to fetch daily finance customers");
          const data = await res.json();
          const customers = data.customers || [];

          const rows = customers.map((c, idx) => ({
            "S.No": idx + 1,
            "Customer Name": c.customer_name || "—",
            "Mobile Number": c.mobile_number || "—",
            "Finance Date": c.finance_date ? c.finance_date.slice(0, 10) : "—",
            "Amount Disbursed (₹)": Number(c.net_disbursement || c.gross_finance_amount || 0),
            "Total Return (₹)": Number(c.agreed_total_payable || 0),
            "Collected (₹)": Number(c.total_collected || 0),
            "Remaining (₹)": Number(c.remaining || 0),
            "Initial Profit (₹)": Number(c.initial_deduction || 0),
            "Status": c.status || "ACTIVE",
          }));

          downloadExcelFile(
            rows.length ? rows : [{ Message: "No daily finance customers found." }],
            "Daily Finance",
            `Daily_Finance_Customers_Report_${new Date().toISOString().slice(0, 10)}`
          );
          break;
        }

        // ----------------------------------------------------
        // 9. Master Comprehensive Workbook
        // ----------------------------------------------------
        case "MASTER_REPORT": {
          setStatusMessage(`Compiling Master Multi-Sheet Workbook (${periodMode === "YEAR_WISE" ? `Year ${selectedYear}` : "All Passed Months"})...`);
          const passedMonths =
            periodMode === "YEAR_WISE"
              ? await fetchYearMonthsData(selectedYear)
              : await fetchPassedMonthsHistory(Number(passedMonthsCount) || 12);

          let autoLoans = [];
          try {
            const autoRes = await apiCall("/loans");
            autoLoans = Array.isArray(autoRes)
              ? autoRes
              : Array.isArray(autoRes?.data)
              ? autoRes.data
              : Array.isArray(autoRes?.loans)
              ? autoRes.loans
              : [];
          } catch (_) {}

          let dailyCust = [];
          try {
            const dailyRes = await fetch("http://localhost:3000/api/daily-finance/dashboard");
            if (dailyRes.ok) {
              const d = await dailyRes.json();
              dailyCust = Array.isArray(d?.customers) ? d.customers : Array.isArray(d) ? d : [];
            }
          } catch (_) {}

          let currentPartners = internalPartners?.length ? internalPartners : partners;
          if (!currentPartners || currentPartners.length === 0) {
            try {
              const fresh = await globalCapitalApi.getPartners();
              currentPartners = Array.isArray(fresh) ? fresh : [];
              setInternalPartners(currentPartners);
            } catch (_) {}
          }

          let currentTransactions = transactions;
          if (!currentTransactions || currentTransactions.length === 0) {
            try {
              const fresh = await globalCapitalApi.getPartnerTransactions();
              currentTransactions = Array.isArray(fresh) ? fresh : [];
            } catch (_) {}
          }

          let currentLedger = ledgerData?.ledger;
          if (!currentLedger || currentLedger.length === 0) {
            try {
              const fresh = await globalCapitalApi.getLedger();
              currentLedger = fresh?.ledger || [];
            } catch (_) {}
          }

          let currentExpenses = expenses;
          if (!currentExpenses || currentExpenses.length === 0) {
            try {
              const fresh = await globalCapitalApi.getExpenses();
              currentExpenses = fresh?.expenses || [];
            } catch (_) {}
          }

          let allLogs = dailyLogsData?.logs || [];
          if (!allLogs.length) {
            try {
              const res = await globalCapitalApi.getDailyProfitLogs();
              allLogs = res?.logs || [];
            } catch (_) {}
          }

          exportMasterFinancialReport({
            ledger: currentLedger || [],
            partners: currentPartners || [],
            transactions: currentTransactions || [],
            expenses: currentExpenses || [],
            closings: closings || [],
            allPassedMonths: passedMonths,
            dailyLogs: allLogs,
            autoLoans: autoLoans,
            dailyCustomers: dailyCust,
          });
          break;
        }

        default:
          throw new Error("Please select a valid report type.");
      }

      if (setNotice) {
        setNotice({
          type: "success",
          text: "Excel report (.xlsx) generated and downloaded successfully!",
        });
      }
    } catch (err) {
      console.error("Report generation error:", err);
      if (setNotice) {
        setNotice({
          type: "error",
          text: err.message || "Failed to generate report",
        });
      }
    } finally {
      setGenerating(false);
      setStatusMessage("");
    }
  };

  const selectedMonthName =
    monthsList.find((m) => m.value === selectedMonth)?.name || "Month";

  // Dynamic preview metadata
  const reportMeta = useMemo(() => {
    let modeText = "";
    if (periodMode === "MONTH_WISE") {
      modeText = `Month: ${selectedMonthName} ${selectedYear}`;
    } else if (periodMode === "YEAR_WISE") {
      modeText = `Full Year ${selectedYear} (12 Months Annual)`;
    } else if (periodMode === "ALL_PASSED") {
      modeText = `All Passed ${passedMonthsCount} Months`;
    } else {
      modeText = "Custom Date Range";
    }

    switch (reportType) {
      case "MONTHLY_CLOSINGS":
        if (periodMode === "MONTH_WISE") {
          return {
            title: `Monthly Closing & Partner Shares: ${selectedMonthName} ${selectedYear}`,
            description: "Financial performance, revenue, expenses, net profit, and itemized partner profit shares for this selected month.",
            sheets: "2 Sheets",
            sheetList: ["Month Overview", "Partner Allocations"],
            fileName: `Monthly_Closing_${selectedMonthName}_${selectedYear}.xlsx`,
            coverage: modeText,
          };
        } else if (periodMode === "YEAR_WISE") {
          return {
            title: `Annual Financial & Partner Profit Matrix (${selectedYear})`,
            description: `Consolidates all 12 months of ${selectedYear} with monthly comparisons, annual totals, and an itemized partner profit matrix.`,
            sheets: "2 Sheets",
            sheetList: [`${selectedYear} Monthly Summary`, `${selectedYear} Partner Profit Matrix`],
            fileName: `Annual_Financial_Report_${selectedYear}.xlsx`,
            coverage: modeText,
          };
        } else {
          return {
            title: `All Passed Months Closings & Partner Profit Shares`,
            description: `Complete historical audit across all passed ${passedMonthsCount} months with monthly summaries and partner profit distributions.`,
            sheets: "2 Sheets",
            sheetList: ["All Passed Summary", "All Partner Shares"],
            fileName: `All_Passed_Months_Closings_${now.toISOString().slice(0, 10)}.xlsx`,
            coverage: modeText,
          };
        }

      case "DAY_TO_DAY_LOGS":
        return {
          title: `Day-to-Day Calculation Logs (${modeText})`,
          description: "Nightly automated calculation logs: Auto revenue, Daily revenue, expenses, net income/loss, and active capital days.",
          sheets: "1 Sheet",
          sheetList: ["Day-to-Day P&L Logs"],
          fileName: `Day_To_Day_Logs_${periodMode === "MONTH_WISE" ? `${selectedYear}_${selectedMonth}` : periodMode === "YEAR_WISE" ? `Year_${selectedYear}` : "All_Passed_Months"}.xlsx`,
          coverage: modeText,
        };

      case "PARTNER_BALANCES":
        return {
          title: "Partner Capital Accounts & Balances Report",
          description: "Live partner capital positions: Initial contributions, deposits, withdrawals, profit credited, status, and contact info.",
          sheets: "1 Sheet",
          sheetList: ["Partner Capital Balances"],
          fileName: `Partner_Capital_Balances_${now.toISOString().slice(0, 10)}.xlsx`,
          coverage: "Complete All-Time Balances",
        };

      case "CAPITAL_TRANSACTIONS":
        return {
          title: `Capital Transactions Ledger (${modeText})`,
          description: "Chronological ledger of partner capital investments, withdrawals, and payouts with payment mode and UTR notes.",
          sheets: "1 Sheet",
          sheetList: ["Capital Transactions"],
          fileName: `Capital_Transactions_${now.toISOString().slice(0, 10)}.xlsx`,
          coverage: modeText,
        };

      case "BUSINESS_EXPENSES":
        return {
          title: `Business Operating Expenses (${modeText})`,
          description: "Categorized business expenses across Auto Finance, Daily Finance, and General office operations.",
          sheets: "1 Sheet",
          sheetList: ["Business Expenses"],
          fileName: `Business_Expenses_${now.toISOString().slice(0, 10)}.xlsx`,
          coverage: modeText,
        };

      case "GLOBAL_LEDGER":
        return {
          title: `Global Cash General Ledger (${modeText})`,
          description: "Comprehensive double-entry cash flow ledger with date, description, inflow (credit), outflow (debit), and running balance.",
          sheets: "1 Sheet",
          sheetList: ["General Cash Ledger"],
          fileName: `Global_Cash_General_Ledger_${now.toISOString().slice(0, 10)}.xlsx`,
          coverage: modeText,
        };

      case "AUTO_LOANS":
        return {
          title: "Auto Finance Vehicle Loans Portfolio",
          description: "Complete vehicle loan schedule: customer codes, vehicle details, registration numbers, EMIs, dues, deductions, and recovery status.",
          sheets: "1 Sheet",
          sheetList: ["Auto Vehicle Loans"],
          fileName: `Auto_Loans_Portfolio_${now.toISOString().slice(0, 10)}.xlsx`,
          coverage: "Active & Closed Vehicle Loans",
        };

      case "DAILY_FINANCE":
        return {
          title: "Daily Finance Customer Accounts Report",
          description: "All customer finance positions: Disbursed amount, total return, collected, remaining balance, and initial profit.",
          sheets: "1 Sheet",
          sheetList: ["Daily Finance Accounts"],
          fileName: `Daily_Finance_Customers_${now.toISOString().slice(0, 10)}.xlsx`,
          coverage: "All Customer Accounts",
        };

      case "MASTER_REPORT":
        return {
          title: `Master All-in-One Financial Report (${modeText})`,
          description: "Complete multi-tab audit workbook covering Executive Summary, Closings, Partner Balances, Daily P&L, Transactions, Expenses, General Ledger, Auto Loans, and Daily Finance.",
          sheets: "9 Sheets",
          sheetList: [
            "Executive Summary",
            "Passed Closings",
            "Partner Balances",
            "Daily Logs",
            "Transactions",
            "Expenses",
            "Global Ledger",
            "Auto Loans",
            "Daily Finance",
          ],
          fileName: `MASTER_FINANCIAL_REPORT_${periodMode === "YEAR_WISE" ? `YEAR_${selectedYear}` : "ALL_PASSED_MONTHS"}.xlsx`,
          coverage: modeText,
        };

      default:
        return {
          title: "Financial Report",
          description: "Export data to formatted Excel spreadsheet.",
          sheets: "1 Sheet",
          sheetList: ["Report"],
          fileName: "Report.xlsx",
          coverage: modeText,
        };
    }
  }, [reportType, periodMode, selectedMonth, selectedYear, passedMonthsCount, selectedMonthName]);

  return (
    <div className="globalReportsContainer">
      {/* 1. Hero Header Banner */}
      <div className="reportsHeroBanner">
        <div>
          <div className="reportsHeroBadge">
            <Sparkles size={13} />
            <span>ENTERPRISE EXCEL ENGINE</span>
          </div>
          <h2 className="reportsHeroTitle">Financial Reports & Data Exports</h2>
          <p className="reportsHeroSubtitle">
            Generate customized, audit-grade Excel (.xlsx) workbooks with dynamic multi-sheet compilation, month-wise, and year-wise filters.
          </p>
        </div>

        <div className="reportsFeatureCluster">
          <div className="reportsFeaturePill live">
            <span className="pulsingDot" />
            <span>Live Data Sync</span>
          </div>
          <div className="reportsFeaturePill">
            <FileSpreadsheet size={13} color="#059669" />
            <span>XLSX OpenXML</span>
          </div>
          <div className="reportsFeaturePill">
            <Layers size={13} color="#0284c7" />
            <span>Multi-Sheet Ready</span>
          </div>
        </div>
      </div>

      {/* Pro Tip Banner */}
      <div
        style={{
          padding: "10px 14px",
          background: "#f0fdf4",
          border: "1px solid #bbf7d0",
          borderRadius: "10px",
          marginBottom: "18px",
          display: "flex",
          alignItems: "center",
          gap: "10px",
          fontSize: "12.5px",
          color: "#166534",
        }}
      >
        <span style={{ fontSize: "16px" }}>💡</span>
        <span>
          <strong>Direct Reports Available:</strong> You can also export dedicated reports for <strong>Partner Balances</strong>, <strong>Capital Transactions</strong>, <strong>Company Expenses</strong>, and <strong>Monthly Closings</strong> directly from their respective tabs!
        </span>
      </div>

      {/* 2. Main Two-Column Form Layout */}
      <div className="reportFormLayout">
        {/* Left Column: Form Controls */}
        <div className="reportFormCard">
          <div className="formCardHeader">
            <div className="formCardHeaderLeft">
              <div className="formCardHeaderIconBox">
                <Filter size={18} />
              </div>
              <div>
                <h3>Configure Report Parameters</h3>
                <small style={{ color: "#64748b", fontSize: "12px" }}>
                  Select your target dataset, frequency scope, and filters
                </small>
              </div>
            </div>
          </div>

          {/* STEP 1: Report Type & Domain */}
          <div className="formSectionBlock">
            <div className="formSectionHeader">
              <span className="formStepBadge">1</span>
              <span className="formSectionHeaderTitle">Report Type & Domain</span>
            </div>

            <div className="formFieldGroup" style={{ marginBottom: "6px" }}>
              <label className="formLabel">
                <span>Select Target Report <span style={{ color: "#e11d48" }}>*</span></span>
              </label>
              <select
                value={reportType}
                onChange={(e) => setReportType(e.target.value)}
                className="formSelectInput"
                style={{ fontWeight: "700" }}
              >
                <optgroup label="🌟 Consolidated Cross-Platform Global Reports">
                  <option value="MASTER_REPORT">
                    👑 Master All-In-One Comprehensive Financial Report (9 Sheets)
                  </option>
                  <option value="MONTHLY_CLOSINGS">
                    📊 Monthly Closings & Partner Profit Shares
                  </option>
                  <option value="DAY_TO_DAY_LOGS">
                    📈 Day-to-Day Calculation Logs (Daily P&L)
                  </option>
                  <option value="GLOBAL_LEDGER">
                    📖 Global Cash General Ledger
                  </option>
                </optgroup>

                <optgroup label="💼 Operational Modules (Also exportable in tabs)">
                  <option value="PARTNER_BALANCES">
                    👥 Partner Capital Accounts & Balances
                  </option>
                  <option value="CAPITAL_TRANSACTIONS">
                    💰 Capital Transactions Ledger
                  </option>
                  <option value="BUSINESS_EXPENSES">
                    🧾 Business Operating Expenses
                  </option>
                  <option value="AUTO_LOANS">
                    🚗 Auto Finance Vehicle Loans Portfolio
                  </option>
                  <option value="DAILY_FINANCE">
                    💵 Daily Finance Customer Accounts
                  </option>
                </optgroup>
              </select>
            </div>
          </div>

          {/* STEP 2: Time Scope & Horizon */}
          {(reportType === "MONTHLY_CLOSINGS" ||
            reportType === "DAY_TO_DAY_LOGS" ||
            reportType === "BUSINESS_EXPENSES" ||
            reportType === "CAPITAL_TRANSACTIONS" ||
            reportType === "GLOBAL_LEDGER" ||
            reportType === "MASTER_REPORT") && (
            <div className="formSectionBlock">
              <div className="formSectionHeader">
                <span className="formStepBadge">2</span>
                <span className="formSectionHeaderTitle">Time Horizon & Period Scope</span>
              </div>

              {/* Segmented Pill Selector for Instant Mode Switching */}
              <div className="periodPillSelector">
                <button
                  type="button"
                  className={`periodSegmentBtn ${periodMode === "MONTH_WISE" ? "active" : ""}`}
                  onClick={() => setPeriodMode("MONTH_WISE")}
                >
                  <Calendar size={13} />
                  <span>Month-wise</span>
                </button>
                <button
                  type="button"
                  className={`periodSegmentBtn ${periodMode === "YEAR_WISE" ? "active" : ""}`}
                  onClick={() => setPeriodMode("YEAR_WISE")}
                >
                  <CalendarRange size={13} />
                  <span>Year-wise (Annual)</span>
                </button>
                <button
                  type="button"
                  className={`periodSegmentBtn ${periodMode === "ALL_PASSED" ? "active" : ""}`}
                  onClick={() => setPeriodMode("ALL_PASSED")}
                >
                  <Layers size={13} />
                  <span>All Passed Months</span>
                </button>
                {(reportType === "CAPITAL_TRANSACTIONS" ||
                  reportType === "BUSINESS_EXPENSES" ||
                  reportType === "GLOBAL_LEDGER") && (
                  <button
                    type="button"
                    className={`periodSegmentBtn ${periodMode === "CUSTOM_RANGE" ? "active" : ""}`}
                    onClick={() => setPeriodMode("CUSTOM_RANGE")}
                  >
                    <Filter size={13} />
                    <span>Custom Range</span>
                  </button>
                )}
              </div>

              {/* Sub-parameters based on selected mode */}
              {periodMode === "MONTH_WISE" && (
                <div className="formRow">
                  <div className="formFieldGroup" style={{ flex: 1.3, marginBottom: 0 }}>
                    <label className="formLabel">Select Target Month</label>
                    <select
                      value={selectedMonth}
                      onChange={(e) => setSelectedMonth(Number(e.target.value))}
                      className="formSelectInput"
                    >
                      {monthsList.map((m) => (
                        <option key={m.value} value={m.value}>
                          {m.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="formFieldGroup" style={{ flex: 1, marginBottom: 0 }}>
                    <label className="formLabel">Select Year</label>
                    <select
                      value={selectedYear}
                      onChange={(e) => setSelectedYear(Number(e.target.value))}
                      className="formSelectInput"
                    >
                      {yearsList.map((y) => (
                        <option key={y} value={y}>
                          {y}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              )}

              {periodMode === "YEAR_WISE" && (
                <div className="formFieldGroup" style={{ marginBottom: 0 }}>
                  <label className="formLabel">Select Year for Annual Workbook</label>
                  <select
                    value={selectedYear}
                    onChange={(e) => setSelectedYear(Number(e.target.value))}
                    className="formSelectInput"
                    style={{ fontWeight: "700", color: "#0f766e" }}
                  >
                    {yearsList.map((y) => (
                      <option key={y} value={y}>
                        Year {y} (Full 12 Months: January – December)
                      </option>
                    ))}
                  </select>
                  <small className="formHelpText">
                    Consolidates month-by-month financial performance columns, annual totals, and itemized partner profit shares into 2 sheets.
                  </small>
                </div>
              )}

              {periodMode === "ALL_PASSED" && (
                <div className="formFieldGroup" style={{ marginBottom: 0 }}>
                  <label className="formLabel">Historical Lookback Depth</label>
                  <select
                    value={passedMonthsCount}
                    onChange={(e) => setPassedMonthsCount(Number(e.target.value))}
                    className="formSelectInput"
                  >
                    <option value={6}>Past 6 Months</option>
                    <option value={12}>Past 12 Months (Full 1-Year History)</option>
                    <option value={18}>Past 18 Months (1.5-Year History)</option>
                    <option value={24}>Past 24 Months (2-Year Comprehensive Audit)</option>
                  </select>
                  <small className="formHelpText">
                    Iterates through past months chronologically to create an audit-grade comparative multi-month workbook.
                  </small>
                </div>
              )}

              {periodMode === "CUSTOM_RANGE" && (
                <div className="formRow">
                  <div className="formFieldGroup" style={{ flex: 1, marginBottom: 0 }}>
                    <label className="formLabel">Start Date (From)</label>
                    <input
                      type="date"
                      value={filterDateFrom}
                      onChange={(e) => setFilterDateFrom(e.target.value)}
                      className="formSelectInput"
                    />
                  </div>
                  <div className="formFieldGroup" style={{ flex: 1, marginBottom: 0 }}>
                    <label className="formLabel">End Date (To)</label>
                    <input
                      type="date"
                      value={filterDateTo}
                      onChange={(e) => setFilterDateTo(e.target.value)}
                      className="formSelectInput"
                    />
                  </div>
                </div>
              )}
            </div>
          )}

          {/* STEP 3: Optional Granular Filters */}
          {(reportType === "PARTNER_BALANCES" ||
            reportType === "CAPITAL_TRANSACTIONS" ||
            reportType === "GLOBAL_LEDGER" ||
            reportType === "BUSINESS_EXPENSES") && (
            <div className="formSectionBlock">
              <div className="formSectionHeader">
                <span className="formStepBadge">3</span>
                <span className="formSectionHeaderTitle">Granular Dataset Filters</span>
              </div>

              {/* Filter by Partner */}
              {(reportType === "PARTNER_BALANCES" ||
                reportType === "CAPITAL_TRANSACTIONS") && (
                <div className="formFieldGroup">
                  <label className="formLabel">
                    <span>Filter by Partner</span>
                    <span style={{ fontSize: "11px", color: "#64748b", fontWeight: "600" }}>
                      {internalPartners.length} registered
                    </span>
                  </label>
                  <select
                    value={filterPartnerId}
                    onChange={(e) => setFilterPartnerId(e.target.value)}
                    className="formSelectInput"
                  >
                    <option value="ALL">All Partners (Consolidated)</option>
                    {internalPartners.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name || p.partner_name || "Partner"} ({p.phone || "No phone"})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Filter by Transaction Type */}
              {(reportType === "CAPITAL_TRANSACTIONS" ||
                reportType === "GLOBAL_LEDGER") && (
                <div className="formFieldGroup">
                  <label className="formLabel">Transaction Direction & Type</label>
                  <select
                    value={filterTxType}
                    onChange={(e) => setFilterTxType(e.target.value)}
                    className="formSelectInput"
                  >
                    <option value="ALL">All Transactions</option>
                    {reportType === "CAPITAL_TRANSACTIONS" ? (
                      <>
                        <option value="CONTRIBUTION">Capital Contributions (Deposits)</option>
                        <option value="WITHDRAWAL">Capital Withdrawals</option>
                      </>
                    ) : (
                      <>
                        <option value="CREDIT">Inflow / Credits Only</option>
                        <option value="DEBIT">Outflow / Debits Only</option>
                      </>
                    )}
                  </select>
                </div>
              )}

              {/* Filter by Expense Category & Module */}
              {reportType === "BUSINESS_EXPENSES" && (
                <div className="formRow">
                  <div className="formFieldGroup" style={{ flex: 1, marginBottom: 0 }}>
                    <label className="formLabel">Expense Category</label>
                    <select
                      value={filterCategory}
                      onChange={(e) => setFilterCategory(e.target.value)}
                      className="formSelectInput"
                    >
                      <option value="ALL">All Categories</option>
                      <option value="OFFICE">Office & Rent</option>
                      <option value="SALARY">Staff Salaries</option>
                      <option value="COMMISSION">Commission / Brokerage</option>
                      <option value="LEGAL">Legal & Documentation</option>
                      <option value="FUEL">Fuel & Travel</option>
                      <option value="MARKETING">Marketing</option>
                      <option value="MISC">Miscellaneous</option>
                    </select>
                  </div>

                  <div className="formFieldGroup" style={{ flex: 1, marginBottom: 0 }}>
                    <label className="formLabel">Source Module</label>
                    <select
                      value={filterModule}
                      onChange={(e) => setFilterModule(e.target.value)}
                      className="formSelectInput"
                    >
                      <option value="ALL">All Modules</option>
                      <option value="GENERAL">General Business</option>
                      <option value="AUTO">Auto Finance</option>
                      <option value="DAILY">Daily Finance</option>
                    </select>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right Column: Live Recap & Download Action Card */}
        <div className="reportActionCard">
          <div className="reportActionHeader">
            <span className="reportFormatBadge">
              <FileSpreadsheet size={12} />
              <span>EXCEL (.XLSX)</span>
            </span>
            <span className="reportLiveReadyPill">
              <span className="pulsingDot" />
              <span>Ready to compile</span>
            </span>
          </div>

          <h3 className="reportActionTitle">{reportMeta.title}</h3>
          <p className="reportActionDescription">{reportMeta.description}</p>

          {/* Worksheets in this workbook */}
          {reportMeta.sheetList?.length > 0 && (
            <div className="sheetTabsPreviewBox">
              <div className="sheetTabsPreviewLabel">
                <TableProperties size={12} />
                <span>Worksheets in this Workbook ({reportMeta.sheetList.length})</span>
              </div>
              <div className="sheetTabsChips">
                {reportMeta.sheetList.map((sName, i) => (
                  <span key={i} className="sheetTabChip">
                    <FileSpreadsheet size={11} color="#0d9488" />
                    <span>{sName}</span>
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Key-Value Specifications */}
          <div className="reportDetailBox">
            <div className="reportDetailRow">
              <span>Report Mode:</span>
              <strong style={{ color: "#0f766e" }}>
                {periodMode === "MONTH_WISE"
                  ? "📅 Month-wise"
                  : periodMode === "YEAR_WISE"
                  ? "📆 Year-wise (Annual)"
                  : periodMode === "ALL_PASSED"
                  ? "🌐 All Passed Months"
                  : "⏱️ Custom Range"}
              </strong>
            </div>
            <div className="reportDetailRow">
              <span>Time Coverage:</span>
              <strong>{reportMeta.coverage}</strong>
            </div>
            <div className="reportDetailRow">
              <span>Target File:</span>
              <strong className="targetFileNamePill">
                {reportMeta.fileName}
              </strong>
            </div>
            <div className="reportDetailRow">
              <span>Output Format:</span>
              <strong>OpenXML Spreadsheet (.xlsx)</strong>
            </div>
          </div>

          {statusMessage && (
            <div className="reportProgressNote">
              <RefreshCw size={14} className="spin" />
              <span>{statusMessage}</span>
            </div>
          )}

          <div style={{ marginTop: "auto", paddingTop: "24px" }}>
            <button
              type="button"
              className="generateReportActionBtn"
              disabled={generating}
              onClick={handleGenerateReport}
            >
              {generating ? (
                <RefreshCw size={19} className="spin" />
              ) : (
                <Download size={19} />
              )}
              <span>
                {generating
                  ? "Building Excel File..."
                  : `Download Excel Report (${periodMode === "YEAR_WISE" ? `Year ${selectedYear}` : periodMode === "MONTH_WISE" ? `${selectedMonthName} ${selectedYear}` : "All Months"})`}
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
