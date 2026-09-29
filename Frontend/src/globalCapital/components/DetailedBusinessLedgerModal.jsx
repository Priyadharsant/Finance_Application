import React, { useState, useEffect, useMemo } from "react";
import {
  FileSpreadsheet,
  Download,
  RefreshCw,
  X,
  Search,
  WalletCards,
  CarFront,
  Users,
  Receipt,
  CheckCircle2,
  AlertCircle,
  Scale,
  ArrowRight,
  TrendingUp,
  DollarSign,
  ShieldCheck,
  Calendar,
  Globe,
} from "lucide-react";
import { globalCapitalApi } from "../services/globalCapitalApi.js";
import {
  exportMasterBusinessLedgerReport,
  exportAutoCategoryReport,
  exportDailyCategoryReport,
  exportGlobalCategoryReport,
} from "../services/globalCapitalExportUtils.js";

const money = (val) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(Number(val || 0));

export default function DetailedBusinessLedgerModal({ isOpen, onClose }) {
  const [activeSubTab, setActiveSubTab] = useState("daily"); // 'daily' | 'auto' | 'partners' | 'expenses' | 'reconciliation'
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [downloading, setDownloading] = useState(false);

  const fetchLedgerData = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await globalCapitalApi.getMasterBusinessLedger();
      setData(res);
    } catch (err) {
      console.error("Failed to load business ledger:", err);
      setError(err.message || "Failed to load master ledger data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchLedgerData();
    }
  }, [isOpen]);

  const handleExport = () => {
    if (!data) return;
    setDownloading(true);
    try {
      exportMasterBusinessLedgerReport(data, `Business_Reconciliation_Ledger_${new Date().toISOString().slice(0, 10)}`);
    } catch (err) {
      console.error("Export error:", err);
      alert("Failed to export Excel: " + err.message);
    } finally {
      setDownloading(false);
    }
  };

  const handleExportAuto = () => {
    if (!data) return;
    setDownloading(true);
    try {
      exportAutoCategoryReport(data);
    } catch (err) {
      console.error("Auto export error:", err);
      alert("Failed to export Auto Finance report: " + err.message);
    } finally {
      setDownloading(false);
    }
  };

  const handleExportDaily = () => {
    if (!data) return;
    setDownloading(true);
    try {
      exportDailyCategoryReport(data);
    } catch (err) {
      console.error("Daily export error:", err);
      alert("Failed to export Daily Finance report: " + err.message);
    } finally {
      setDownloading(false);
    }
  };

  const handleExportGlobal = () => {
    if (!data) return;
    setDownloading(true);
    try {
      exportGlobalCategoryReport(data);
    } catch (err) {
      console.error("Global export error:", err);
      alert("Failed to export Global Capital report: " + err.message);
    } finally {
      setDownloading(false);
    }
  };

  const filteredDailyLoans = useMemo(() => {
    if (!data?.dailyFinance?.loans) return [];
    if (!searchTerm.trim()) return data.dailyFinance.loans;
    const q = searchTerm.toLowerCase();
    return data.dailyFinance.loans.filter(
      (l) =>
        (l.customerName && l.customerName.toLowerCase().includes(q)) ||
        (l.mobileNumber && l.mobileNumber.includes(q)) ||
        (l.date && l.date.includes(q))
    );
  }, [data, searchTerm]);

  const filteredAutoLoans = useMemo(() => {
    if (!data?.autoFinance?.loans) return [];
    if (!searchTerm.trim()) return data.autoFinance.loans;
    const q = searchTerm.toLowerCase();
    return data.autoFinance.loans.filter(
      (l) =>
        (l.customerName && l.customerName.toLowerCase().includes(q)) ||
        (l.vehicle && l.vehicle.toLowerCase().includes(q)) ||
        (l.regNo && l.regNo.toLowerCase().includes(q)) ||
        (l.brokerName && l.brokerName.toLowerCase().includes(q))
    );
  }, [data, searchTerm]);

  const filteredExpenses = useMemo(() => {
    if (!data?.expenses?.items) return [];
    if (!searchTerm.trim()) return data.expenses.items;
    const q = searchTerm.toLowerCase();
    return data.expenses.items.filter(
      (e) =>
        (e.description && e.description.toLowerCase().includes(q)) ||
        (e.categoryLabel && e.categoryLabel.toLowerCase().includes(q)) ||
        (e.date && e.date.includes(q))
    );
  }, [data, searchTerm]);

  if (!isOpen) return null;

  const dfTotals = data?.dailyFinance?.totals || {};
  const autoTotals = data?.autoFinance?.totals || {};
  const recon = data?.reconciliation || {};
  const distinctMonths = data?.distinctMonths || [];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/80 backdrop-blur-md overflow-hidden animate-fadeIn">
      <div className="relative flex flex-col w-full max-w-7xl h-[94vh] bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-4 px-6 py-4 bg-slate-900/90 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-gradient-to-tr from-emerald-500/20 to-teal-500/20 border border-emerald-500/30 text-emerald-400">
              <FileSpreadsheet className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-bold text-white tracking-tight">
                  Detailed Business Ledger & Reconciliation
                </h2>
                <span className="px-2 py-0.5 text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-full">
                  latest.xlsx Format
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Complete 4-sheet multi-dimensional reconciliation matching the business owner spreadsheet
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Category Report Quick Downloads */}
            <button
              onClick={handleExportAuto}
              disabled={!data || downloading}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-sky-200 bg-sky-950/70 hover:bg-sky-900 border border-sky-700/60 rounded-xl transition-all disabled:opacity-50 cursor-pointer shadow-sm"
              title="Download Dedicated Auto Finance Report (4 Essential Sheets · latest.xlsx)"
            >
              <CarFront className="w-3.5 h-3.5 text-sky-400" />
              <span>Auto (4 Sheets)</span>
            </button>

            <button
              onClick={handleExportDaily}
              disabled={!data || downloading}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-emerald-200 bg-emerald-950/70 hover:bg-emerald-900 border border-emerald-700/60 rounded-xl transition-all disabled:opacity-50 cursor-pointer shadow-sm"
              title="Download Dedicated Daily Finance Report (4 Essential Sheets · latest.xlsx)"
            >
              <WalletCards className="w-3.5 h-3.5 text-emerald-400" />
              <span>Daily (4 Sheets)</span>
            </button>

            <button
              onClick={handleExportGlobal}
              disabled={!data || downloading}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-teal-200 bg-teal-950/70 hover:bg-teal-900 border border-teal-700/60 rounded-xl transition-all disabled:opacity-50 cursor-pointer shadow-sm"
              title="Download Dedicated Global Capital Report (4 Essential Sheets · latest.xlsx)"
            >
              <Globe className="w-3.5 h-3.5 text-teal-400" />
              <span>Global (4 Sheets)</span>
            </button>

            <button
              onClick={handleExport}
              disabled={!data || downloading}
              className="inline-flex items-center gap-2 px-3.5 py-1.5 text-xs font-semibold text-white bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 rounded-xl shadow-lg shadow-emerald-900/30 transition-all disabled:opacity-50 cursor-pointer"
              title="Download Complete 4-Sheet Master Business Ledger"
            >
              <Download className="w-3.5 h-3.5" />
              <span>{downloading ? "Generating..." : "Master (4 Sheets)"}</span>
            </button>

            <button
              onClick={fetchLedgerData}
              disabled={loading}
              className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl border border-slate-700/60 transition-colors cursor-pointer"
              title="Refresh Data"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin text-emerald-400" : ""}`} />
            </button>

            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-xl border border-slate-700/60 transition-colors cursor-pointer"
              title="Close Modal"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Sub-Tabs Navigation */}
        <div className="flex flex-wrap items-center justify-between gap-3 px-6 py-2.5 bg-slate-900/60 border-b border-slate-800/80">
          <div className="flex items-center gap-1.5 p-1 bg-slate-950/60 border border-slate-800 rounded-xl">
            <button
              onClick={() => setActiveSubTab("daily")}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${activeSubTab === "daily"
                  ? "bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20 font-bold"
                  : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/50"
                }`}
            >
              <WalletCards className="w-3.5 h-3.5" />
              Sheet 1: Daily Finance ({data?.dailyFinance?.loans?.length || 0})
            </button>

            <button
              onClick={() => setActiveSubTab("auto")}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${activeSubTab === "auto"
                  ? "bg-blue-500 text-slate-950 shadow-md shadow-blue-500/20 font-bold"
                  : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/50"
                }`}
            >
              <CarFront className="w-3.5 h-3.5" />
              Sheet 2: Auto Finance ({data?.autoFinance?.loans?.length || 0})
            </button>

            <button
              onClick={() => setActiveSubTab("partners")}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${activeSubTab === "partners"
                  ? "bg-purple-500 text-slate-950 shadow-md shadow-purple-500/20 font-bold"
                  : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/50"
                }`}
            >
              <Users className="w-3.5 h-3.5" />
              Sheet 3: Partner Capital ({data?.partners?.list?.length || 0})
            </button>

            <button
              onClick={() => setActiveSubTab("expenses")}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${activeSubTab === "expenses"
                  ? "bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20 font-bold"
                  : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/50"
                }`}
            >
              <Receipt className="w-3.5 h-3.5" />
              Sheet 4: Selavu ({data?.expenses?.items?.length || 0})
            </button>

            <button
              onClick={() => setActiveSubTab("reconciliation")}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${activeSubTab === "reconciliation"
                  ? "bg-indigo-500 text-slate-950 shadow-md shadow-indigo-500/20 font-bold"
                  : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/50"
                }`}
            >
              <Scale className="w-3.5 h-3.5" />
              Executive Reconciliation
            </button>
          </div>

          <div className="relative w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500" />
            <input
              type="text"
              placeholder="Search records..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 bg-slate-950/80 border border-slate-800 text-slate-200 text-xs rounded-xl focus:outline-none focus:border-emerald-500/60 placeholder:text-slate-600 transition-colors"
            />
          </div>
        </div>

        {/* Content Body */}
        <div className="flex-1 p-6 overflow-y-auto space-y-6">
          {loading && (
            <div className="flex flex-col items-center justify-center py-20 gap-3 text-slate-400">
              <RefreshCw className="w-8 h-8 animate-spin text-emerald-400" />
              <p className="text-sm font-medium">Compiling master business ledger across modules...</p>
            </div>
          )}

          {error && (
            <div className="flex items-center gap-3 p-4 bg-rose-500/10 border border-rose-500/20 rounded-xl text-rose-400">
              <AlertCircle className="w-5 h-5 shrink-0" />
              <p className="text-sm">{error}</p>
            </div>
          )}

          {!loading && !error && data && (
            <>
              {/* ========================================================= */}
              {/* TAB 1: DAILY FINANCE LEDGER */}
              {/* ========================================================= */}
              {activeSubTab === "daily" && (
                <div className="space-y-4">
                  {/* Summary Metric Pills */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
                    <div className="p-3 bg-slate-950/60 border border-slate-800 rounded-xl">
                      <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Total Loan</p>
                      <p className="text-base font-bold text-white mt-1">{money(dfTotals.totalLoan)}</p>
                    </div>
                    <div className="p-3 bg-slate-950/60 border border-slate-800 rounded-xl">
                      <p className="text-[11px] font-semibold text-amber-400 uppercase tracking-wider">Pitibu (Upfront)</p>
                      <p className="text-base font-bold text-amber-300 mt-1">{money(dfTotals.pitipu)}</p>
                    </div>
                    <div className="p-3 bg-slate-950/60 border border-slate-800 rounded-xl">
                      <p className="text-[11px] font-semibold text-cyan-400 uppercase tracking-wider">By Hand (Dist)</p>
                      <p className="text-base font-bold text-cyan-300 mt-1">{money(dfTotals.distrubut)}</p>
                    </div>
                    <div className="p-3 bg-slate-950/60 border border-slate-800 rounded-xl">
                      <p className="text-[11px] font-semibold text-emerald-400 uppercase tracking-wider">Income (Collected)</p>
                      <p className="text-base font-bold text-emerald-300 mt-1">{money(dfTotals.income)}</p>
                    </div>
                    <div className="p-3 bg-slate-950/60 border border-slate-800 rounded-xl">
                      <p className="text-[11px] font-semibold text-rose-400 uppercase tracking-wider">Balance (Due)</p>
                      <p className="text-base font-bold text-rose-300 mt-1">{money(dfTotals.balance)}</p>
                    </div>
                    <div className="p-3 bg-slate-950/60 border border-slate-800 rounded-xl">
                      <p className="text-[11px] font-semibold text-red-400 uppercase tracking-wider">Selavu (Expenses)</p>
                      <p className="text-base font-bold text-red-300 mt-1">{money(dfTotals.selavu)}</p>
                    </div>
                    <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl">
                      <p className="text-[11px] font-semibold text-emerald-400 uppercase tracking-wider">Kaieruppu (In Hand)</p>
                      <p className="text-base font-bold text-emerald-300 mt-1">{money(dfTotals.kaieruppu)}</p>
                    </div>
                  </div>

                  {/* Table */}
                  <div className="border border-slate-800 rounded-xl overflow-x-auto bg-slate-950/40">
                    <table className="w-full text-xs text-left border-collapse">
                      <thead>
                        <tr className="bg-slate-900/90 text-slate-300 font-semibold border-b border-slate-800">
                          <th className="py-2.5 px-3 whitespace-nowrap">#</th>
                          <th className="py-2.5 px-3 whitespace-nowrap">DATE</th>
                          <th className="py-2.5 px-3 whitespace-nowrap">NAME</th>
                          <th className="py-2.5 px-3 whitespace-nowrap text-right">LOAN AMOUNT</th>
                          <th className="py-2.5 px-3 whitespace-nowrap text-right">PITIBU</th>
                          <th className="py-2.5 px-3 whitespace-nowrap text-right">BY HAND</th>
                          <th className="py-2.5 px-3 whitespace-nowrap text-right">INCOME</th>
                          <th className="py-2.5 px-3 whitespace-nowrap text-right">BALANCE</th>
                          <th className="py-2.5 px-3 whitespace-nowrap text-right">MATAKKU</th>
                          {distinctMonths.map((m) => (
                            <th key={m.key} className="py-2.5 px-3 whitespace-nowrap text-right text-emerald-400">
                              {m.label.toUpperCase()} VASUL
                            </th>
                          ))}
                          <th className="py-2.5 px-3 whitespace-nowrap text-center">STATUS</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/60 font-mono">
                        {filteredDailyLoans.map((row) => (
                          <tr key={row.financeId} className="hover:bg-slate-800/40 transition-colors">
                            <td className="py-2.5 px-3 text-slate-500">{row.sNo}</td>
                            <td className="py-2.5 px-3 text-slate-300">{row.date}</td>
                            <td className="py-2.5 px-3 text-white font-sans font-medium">{row.customerName}</td>
                            <td className="py-2.5 px-3 text-right text-white font-semibold">{money(row.loanAmount)}</td>
                            <td className="py-2.5 px-3 text-right text-amber-300">{money(row.pitibu)}</td>
                            <td className="py-2.5 px-3 text-right text-cyan-300">{money(row.byHand)}</td>
                            <td className="py-2.5 px-3 text-right text-emerald-300">{money(row.income)}</td>
                            <td className="py-2.5 px-3 text-right text-rose-300">{money(row.balance)}</td>
                            <td className="py-2.5 px-3 text-right text-slate-400">{row.matakku ? money(row.matakku) : "—"}</td>
                            {distinctMonths.map((m) => {
                              const amt = row.monthlyVasul?.[m.key] || 0;
                              return (
                                <td key={m.key} className="py-2.5 px-3 text-right text-slate-200">
                                  {amt > 0 ? money(amt) : "—"}
                                </td>
                              );
                            })}
                            <td className="py-2.5 px-3 text-center">
                              <span
                                className={`px-2 py-0.5 text-[10px] font-sans font-semibold rounded-full border ${row.status === "COMPLETED"
                                    ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
                                    : "bg-blue-500/10 text-blue-400 border-blue-500/30"
                                  }`}
                              >
                                {row.status}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot>
                        <tr className="bg-slate-900/95 font-bold text-white border-t-2 border-slate-700">
                          <td colSpan={3} className="py-3 px-3 text-emerald-400 uppercase tracking-wider">
                            TOTAL
                          </td>
                          <td className="py-3 px-3 text-right">{money(dfTotals.totalLoan)}</td>
                          <td className="py-3 px-3 text-right text-amber-300">{money(dfTotals.pitipu)}</td>
                          <td className="py-3 px-3 text-right text-cyan-300">{money(dfTotals.distrubut)}</td>
                          <td className="py-3 px-3 text-right text-emerald-300">{money(dfTotals.income)}</td>
                          <td className="py-3 px-3 text-right text-rose-300">{money(dfTotals.balance)}</td>
                          <td className="py-3 px-3 text-right text-slate-400">—</td>
                          {distinctMonths.map((m) => {
                            const colSum = filteredDailyLoans.reduce(
                              (sum, r) => sum + Number(r.monthlyVasul?.[m.key] || 0),
                              0
                            );
                            return (
                              <td key={m.key} className="py-3 px-3 text-right text-emerald-400">
                                {money(colSum)}
                              </td>
                            );
                          })}
                          <td></td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                </div>
              )}

              {/* ========================================================= */}
              {/* TAB 2: AUTO FINANCE LEDGER */}
              {/* ========================================================= */}
              {activeSubTab === "auto" && (
                <div className="space-y-4">
                  {/* Summary Metric Pills */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
                    <div className="p-3 bg-slate-950/60 border border-slate-800 rounded-xl">
                      <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Total Principal</p>
                      <p className="text-base font-bold text-white mt-1">{money(autoTotals.totalLoan)}</p>
                    </div>
                    <div className="p-3 bg-slate-950/60 border border-slate-800 rounded-xl">
                      <p className="text-[11px] font-semibold text-purple-400 uppercase tracking-wider">With Interest</p>
                      <p className="text-base font-bold text-purple-300 mt-1">{money(autoTotals.totalLoanWithInterest)}</p>
                    </div>
                    <div className="p-3 bg-slate-950/60 border border-slate-800 rounded-xl">
                      <p className="text-[11px] font-semibold text-cyan-400 uppercase tracking-wider">By Hand (Disb)</p>
                      <p className="text-base font-bold text-cyan-300 mt-1">{money(autoTotals.distribut)}</p>
                    </div>
                    <div className="p-3 bg-slate-950/60 border border-slate-800 rounded-xl">
                      <p className="text-[11px] font-semibold text-emerald-400 uppercase tracking-wider">Income Due (EMI)</p>
                      <p className="text-base font-bold text-emerald-300 mt-1">{money(autoTotals.loanIncome)}</p>
                    </div>
                    <div className="p-3 bg-slate-950/60 border border-slate-800 rounded-xl">
                      <p className="text-[11px] font-semibold text-amber-400 uppercase tracking-wider">Total Charges</p>
                      <p className="text-base font-bold text-amber-300 mt-1">{money(autoTotals.totalCharges)}</p>
                    </div>
                    <div className="p-3 bg-slate-950/60 border border-slate-800 rounded-xl">
                      <p className="text-[11px] font-semibold text-blue-400 uppercase tracking-wider">Broker Commission</p>
                      <p className="text-base font-bold text-blue-300 mt-1">{money(autoTotals.broker)}</p>
                    </div>
                    <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl">
                      <p className="text-[11px] font-semibold text-emerald-400 uppercase tracking-wider">Auto Iruppu</p>
                      <p className="text-base font-bold text-emerald-300 mt-1">{money(autoTotals.iruppu)}</p>
                    </div>
                  </div>

                  {/* Table */}
                  <div className="border border-slate-800 rounded-xl overflow-x-auto bg-slate-950/40">
                    <table className="w-full text-xs text-left border-collapse">
                      <thead>
                        <tr className="bg-slate-900/90 text-slate-300 font-semibold border-b border-slate-800">
                          <th className="py-2.5 px-3 whitespace-nowrap">#</th>
                          <th className="py-2.5 px-3 whitespace-nowrap">DATE</th>
                          <th className="py-2.5 px-3 whitespace-nowrap">NAME</th>
                          <th className="py-2.5 px-3 whitespace-nowrap">VEHICLE</th>
                          <th className="py-2.5 px-3 whitespace-nowrap text-right">LOAN</th>
                          <th className="py-2.5 px-3 whitespace-nowrap text-right">TOTAL AMT</th>
                          <th className="py-2.5 px-3 whitespace-nowrap text-right">BY HAND</th>
                          <th className="py-2.5 px-3 whitespace-nowrap text-right">BROKER</th>
                          <th className="py-2.5 px-3 whitespace-nowrap">BROKER NAME</th>
                          <th className="py-2.5 px-3 whitespace-nowrap">CHARGES DESC</th>
                          <th className="py-2.5 px-3 whitespace-nowrap text-right">INCME DUE</th>
                          <th className="py-2.5 px-3 whitespace-nowrap text-right">DOC</th>
                          <th className="py-2.5 px-3 whitespace-nowrap text-right">HP</th>
                          <th className="py-2.5 px-3 whitespace-nowrap text-right">TA</th>
                          <th className="py-2.5 px-3 whitespace-nowrap text-right">INSU</th>
                          <th className="py-2.5 px-3 whitespace-nowrap text-right">IF</th>
                          <th className="py-2.5 px-3 whitespace-nowrap text-right">G.T</th>
                          <th className="py-2.5 px-3 whitespace-nowrap text-right">F</th>
                          <th className="py-2.5 px-3 whitespace-nowrap text-right">N.T</th>
                          <th className="py-2.5 px-3 whitespace-nowrap text-right">PERMIT</th>
                          <th className="py-2.5 px-3 whitespace-nowrap text-right">TOTAL DED</th>
                          <th className="py-2.5 px-3 whitespace-nowrap text-right">SELAVU FC</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/60 font-mono">
                        {filteredAutoLoans.map((row) => (
                          <tr key={row.id} className="hover:bg-slate-800/40 transition-colors">
                            <td className="py-2.5 px-3 text-slate-500">{row.sNo}</td>
                            <td className="py-2.5 px-3 text-slate-300">{row.date}</td>
                            <td className="py-2.5 px-3 text-white font-sans font-medium whitespace-nowrap">{row.customerName}</td>
                            <td className="py-2.5 px-3 text-slate-300 font-sans whitespace-nowrap">{row.vehicle}</td>
                            <td className="py-2.5 px-3 text-right text-white font-semibold">{money(row.loanAmount)}</td>
                            <td className="py-2.5 px-3 text-right text-purple-300">{money(row.totalAmount)}</td>
                            <td className="py-2.5 px-3 text-right text-cyan-300">{money(row.byHand)}</td>
                            <td className="py-2.5 px-3 text-right text-amber-300">{row.broker ? money(row.broker) : "—"}</td>
                            <td className="py-2.5 px-3 text-slate-400 font-sans">{row.brokerName}</td>
                            <td className="py-2.5 px-3 text-slate-400 font-sans text-[11px] max-w-xs truncate" title={row.chargesDescription}>
                              {row.chargesDescription}
                            </td>
                            <td className="py-2.5 px-3 text-right text-emerald-300">{row.incomeDue ? money(row.incomeDue) : "—"}</td>
                            <td className="py-2.5 px-3 text-right text-slate-300">{row.document ? money(row.document) : "—"}</td>
                            <td className="py-2.5 px-3 text-right text-slate-300">{row.hp ? money(row.hp) : "—"}</td>
                            <td className="py-2.5 px-3 text-right text-slate-300">{row.ta ? money(row.ta) : "—"}</td>
                            <td className="py-2.5 px-3 text-right text-slate-300">{row.insurance ? money(row.insurance) : "—"}</td>
                            <td className="py-2.5 px-3 text-right text-slate-300">{row.if ? money(row.if) : "—"}</td>
                            <td className="py-2.5 px-3 text-right text-slate-300">{row.gt ? money(row.gt) : "—"}</td>
                            <td className="py-2.5 px-3 text-right text-slate-300">{row.fine ? money(row.fine) : "—"}</td>
                            <td className="py-2.5 px-3 text-right text-slate-300">{row.nt ? money(row.nt) : "—"}</td>
                            <td className="py-2.5 px-3 text-right text-slate-300">{row.permit ? money(row.permit) : "—"}</td>
                            <td className="py-2.5 px-3 text-right text-amber-400 font-bold">{money(row.totalDeductions)}</td>
                            <td className="py-2.5 px-3 text-right text-rose-300">{row.selavuFcInsur ? money(row.selavuFcInsur) : "—"}</td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot>
                        <tr className="bg-slate-900/95 font-bold text-white border-t-2 border-slate-700">
                          <td colSpan={4} className="py-3 px-3 text-blue-400 uppercase tracking-wider">
                            TOTAL
                          </td>
                          <td className="py-3 px-3 text-right">{money(autoTotals.totalLoan)}</td>
                          <td className="py-3 px-3 text-right text-purple-300">{money(autoTotals.totalLoanWithInterest)}</td>
                          <td className="py-3 px-3 text-right text-cyan-300">{money(autoTotals.distribut)}</td>
                          <td className="py-3 px-3 text-right text-amber-300">{money(autoTotals.broker)}</td>
                          <td colSpan={2}></td>
                          <td className="py-3 px-3 text-right text-emerald-300">{money(autoTotals.loanIncome)}</td>
                          <td className="py-3 px-3 text-right">{money(autoTotals.document)}</td>
                          <td className="py-3 px-3 text-right">{money(autoTotals.hp)}</td>
                          <td className="py-3 px-3 text-right">{money(autoTotals.ta)}</td>
                          <td className="py-3 px-3 text-right">{money(autoTotals.insurance)}</td>
                          <td className="py-3 px-3 text-right">{money(autoTotals.if)}</td>
                          <td className="py-3 px-3 text-right">{money(autoTotals.gt)}</td>
                          <td className="py-3 px-3 text-right">{money(autoTotals.fine)}</td>
                          <td className="py-3 px-3 text-right">{money(autoTotals.nt)}</td>
                          <td className="py-3 px-3 text-right">{money(autoTotals.permit)}</td>
                          <td className="py-3 px-3 text-right text-amber-400">{money(autoTotals.totalCharges)}</td>
                          <td className="py-3 px-3 text-right text-rose-300">{money(autoTotals.fcSelavu)}</td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                </div>
              )}

              {/* ========================================================= */}
              {/* TAB 3: PARTNER CAPITAL */}
              {/* ========================================================= */}
              {activeSubTab === "partners" && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 bg-gradient-to-r from-purple-950/40 via-slate-900 to-slate-900 border border-purple-500/20 rounded-xl">
                    <div>
                      <p className="text-xs font-semibold text-purple-400 uppercase tracking-wider">
                        Total Investment Capital
                      </p>
                      <p className="text-2xl font-bold text-white mt-1">
                        {money(data.partners?.totalInvestment)}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-slate-400">Total Partners Active</p>
                      <p className="text-xl font-bold text-purple-300 mt-1">
                        {data.partners?.list?.length || 0}
                      </p>
                    </div>
                  </div>

                  <div className="border border-slate-800 rounded-xl overflow-hidden bg-slate-950/40">
                    <table className="w-full text-xs text-left border-collapse">
                      <thead>
                        <tr className="bg-slate-900/90 text-slate-300 font-semibold border-b border-slate-800">
                          <th className="py-3 px-4">#</th>
                          <th className="py-3 px-4">PARTNER NAME</th>
                          <th className="py-3 px-4 text-right">CURRENT CAPITAL</th>
                          <th className="py-3 px-4 text-right">TOTAL CONTRIBUTED</th>
                          <th className="py-3 px-4 text-right">TOTAL WITHDRAWN</th>
                          <th className="py-3 px-4 text-right">PROFIT EARNED</th>
                          <th className="py-3 px-4 text-center">STATUS</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/60 font-mono">
                        {data.partners?.list?.map((p) => (
                          <tr key={p.id} className="hover:bg-slate-800/40 transition-colors">
                            <td className="py-3 px-4 text-slate-500">{p.sNo}</td>
                            <td className="py-3 px-4 font-sans font-semibold text-white">{p.name}</td>
                            <td className="py-3 px-4 text-right text-emerald-400 font-bold">{money(p.capital)}</td>
                            <td className="py-3 px-4 text-right text-cyan-300">{money(p.contributed)}</td>
                            <td className="py-3 px-4 text-right text-rose-300">{money(p.withdrawn)}</td>
                            <td className="py-3 px-4 text-right text-amber-300">{money(p.profit)}</td>
                            <td className="py-3 px-4 text-center">
                              <span className="px-2 py-0.5 text-[10px] font-sans font-semibold rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                                {p.status || "ACTIVE"}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot>
                        <tr className="bg-slate-900/95 font-bold text-white border-t-2 border-slate-700">
                          <td colSpan={2} className="py-3 px-4 text-purple-400 uppercase tracking-wider">
                            TOTAL CAPITAL
                          </td>
                          <td className="py-3 px-4 text-right text-emerald-400">
                            {money(data.partners?.totalInvestment)}
                          </td>
                          <td colSpan={4}></td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                </div>
              )}

              {/* ========================================================= */}
              {/* TAB 4: EXPENSES (SELAVU) */}
              {/* ========================================================= */}
              {activeSubTab === "expenses" && (
                <div className="space-y-4">
                  {/* Category totals grid */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2.5">
                    {data.expenses?.categories?.map((cat) => {
                      const amt = data.expenses?.categoryTotals?.[cat.key] || 0;
                      return (
                        <div key={cat.key} className="p-3 bg-slate-950/60 border border-slate-800 rounded-xl">
                          <p className="text-[10px] font-semibold text-slate-400 uppercase truncate" title={cat.label}>
                            {cat.label}
                          </p>
                          <p className="text-sm font-bold text-white mt-1">{money(amt)}</p>
                        </div>
                      );
                    })}
                  </div>

                  <div className="p-4 bg-gradient-to-r from-red-950/30 to-slate-900 border border-red-500/20 rounded-xl flex items-center justify-between">
                    <div>
                      <p className="text-xs font-semibold text-red-400 uppercase tracking-wider">Total Selavu (Expenses)</p>
                      <p className="text-2xl font-bold text-white mt-1">{money(data.expenses?.categoryTotals?.totalSelavu)}</p>
                    </div>
                    <span className="text-xs text-slate-400">
                      {filteredExpenses.length} expense transactions recorded
                    </span>
                  </div>

                  {/* Expenses Table */}
                  <div className="border border-slate-800 rounded-xl overflow-hidden bg-slate-950/40">
                    <table className="w-full text-xs text-left border-collapse">
                      <thead>
                        <tr className="bg-slate-900/90 text-slate-300 font-semibold border-b border-slate-800">
                          <th className="py-3 px-4">#</th>
                          <th className="py-3 px-4">DATE</th>
                          <th className="py-3 px-4">DESCRIPTION</th>
                          <th className="py-3 px-4">CATEGORY</th>
                          <th className="py-3 px-4 text-right">AMOUNT</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/60 font-mono">
                        {filteredExpenses.map((e) => (
                          <tr key={e.id} className="hover:bg-slate-800/40 transition-colors">
                            <td className="py-2.5 px-4 text-slate-500">{e.sNo}</td>
                            <td className="py-2.5 px-4 text-slate-300">{e.date}</td>
                            <td className="py-2.5 px-4 text-white font-sans">{e.description}</td>
                            <td className="py-2.5 px-4">
                              <span className="px-2 py-0.5 text-[10px] font-sans font-semibold rounded-full bg-slate-800 text-slate-300 border border-slate-700">
                                {e.categoryLabel}
                              </span>
                            </td>
                            <td className="py-2.5 px-4 text-right text-rose-300 font-bold">{money(e.amount)}</td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot>
                        <tr className="bg-slate-900/95 font-bold text-white border-t-2 border-slate-700">
                          <td colSpan={4} className="py-3 px-4 text-red-400 uppercase tracking-wider">
                            TOTAL SELAVU
                          </td>
                          <td className="py-3 px-4 text-right text-red-400 font-bold">
                            {money(data.expenses?.categoryTotals?.totalSelavu)}
                          </td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                </div>
              )}

              {/* ========================================================= */}
              {/* TAB 5: EXECUTIVE RECONCILIATION */}
              {/* ========================================================= */}
              {activeSubTab === "reconciliation" && (
                <div className="space-y-6">
                  {/* High Level Reconciled Cards */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="p-5 bg-gradient-to-br from-emerald-950/40 to-slate-900 border border-emerald-500/30 rounded-2xl">
                      <p className="text-xs font-semibold text-emerald-400 uppercase tracking-wider">Total Cash in Hand (Iruppu)</p>
                      <p className="text-3xl font-extrabold text-white mt-2">{money(recon.totalKaieruppu)}</p>
                      <div className="mt-3 pt-3 border-t border-slate-800/80 text-xs text-slate-400 space-y-1">
                        <div className="flex justify-between">
                          <span>DL Kaieruppu:</span>
                          <span className="font-mono text-emerald-300 font-semibold">{money(recon.dlKaieruppu)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Auto Iruppu:</span>
                          <span className="font-mono text-blue-300 font-semibold">{money(recon.autoKaieruppu)}</span>
                        </div>
                      </div>
                    </div>

                    <div className="p-5 bg-gradient-to-br from-blue-950/40 to-slate-900 border border-blue-500/30 rounded-2xl">
                      <p className="text-xs font-semibold text-blue-400 uppercase tracking-wider">Total Loans Distributed</p>
                      <p className="text-3xl font-extrabold text-white mt-2">{money(recon.totalDistribut)}</p>
                      <div className="mt-3 pt-3 border-t border-slate-800/80 text-xs text-slate-400 space-y-1">
                        <div className="flex justify-between">
                          <span>DL Disbursed:</span>
                          <span className="font-mono text-cyan-300 font-semibold">{money(recon.dlDistribut)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Auto Disbursed:</span>
                          <span className="font-mono text-blue-300 font-semibold">{money(recon.autoDistribut)}</span>
                        </div>
                      </div>
                    </div>

                    <div className="p-5 bg-gradient-to-br from-purple-950/40 to-slate-900 border border-purple-500/30 rounded-2xl">
                      <p className="text-xs font-semibold text-purple-400 uppercase tracking-wider">Investment vs Distributed</p>
                      <p className={`text-3xl font-extrabold mt-2 ${recon.difference >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                        {money(recon.difference)}
                      </p>
                      <div className="mt-3 pt-3 border-t border-slate-800/80 text-xs text-slate-400 space-y-1">
                        <div className="flex justify-between">
                          <span>Total Investment:</span>
                          <span className="font-mono text-purple-300 font-semibold">{money(recon.investment)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Kai Eruppu + Difference:</span>
                          <span className="font-mono text-amber-300 font-semibold">{money(recon.kaiEruppuPlusDifference)}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Reconciled Ledger Breakdown (Matching Sheet1 rows 54-85 in latest.xlsx) */}
                  <div className="border border-slate-800 rounded-2xl bg-slate-950/50 p-6 space-y-6">
                    <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                      <ShieldCheck className="w-4 h-4 text-emerald-400" />
                      Complete Master Financial Reconciliation Statement
                    </h3>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs">
                      {/* Daily Finance Reconcile Block */}
                      <div className="p-4 bg-slate-900/60 border border-slate-800 rounded-xl space-y-2">
                        <h4 className="font-bold text-emerald-400 border-b border-slate-800 pb-2">
                          Daily Finance Position
                        </h4>
                        <div className="flex justify-between py-1 border-b border-slate-800/40">
                          <span className="text-slate-400">Total Loans Granted</span>
                          <span className="font-mono font-bold text-white">{money(dfTotals.totalLoan)}</span>
                        </div>
                        <div className="flex justify-between py-1 border-b border-slate-800/40">
                          <span className="text-slate-400">Total Pitipu (Upfront Deduction)</span>
                          <span className="font-mono text-amber-300 font-semibold">{money(dfTotals.pitipu)}</span>
                        </div>
                        <div className="flex justify-between py-1 border-b border-slate-800/40">
                          <span className="text-slate-400">Collections Received (Income)</span>
                          <span className="font-mono text-emerald-300 font-semibold">{money(dfTotals.income)}</span>
                        </div>
                        <div className="flex justify-between py-1 border-b border-slate-800/40">
                          <span className="text-slate-400">Outstanding Principal (Balance)</span>
                          <span className="font-mono text-rose-300 font-semibold">{money(dfTotals.balance)}</span>
                        </div>
                        <div className="flex justify-between py-1 border-b border-slate-800/40">
                          <span className="text-slate-400">Net Disbursed (By Hand)</span>
                          <span className="font-mono text-cyan-300 font-semibold">{money(dfTotals.distrubut)}</span>
                        </div>
                        <div className="flex justify-between py-1 border-b border-slate-800/40">
                          <span className="text-slate-400">Total Expenses (Selavu)</span>
                          <span className="font-mono text-red-400 font-semibold">{money(dfTotals.selavu)}</span>
                        </div>
                        <div className="flex justify-between py-1.5 pt-2 font-bold text-emerald-400 text-sm">
                          <span>DL Kaieruppu (Net In Hand)</span>
                          <span className="font-mono">{money(dfTotals.kaieruppu)}</span>
                        </div>
                      </div>

                      {/* Auto Finance Reconcile Block */}
                      <div className="p-4 bg-slate-900/60 border border-slate-800 rounded-xl space-y-2">
                        <h4 className="font-bold text-blue-400 border-b border-slate-800 pb-2">
                          Auto Finance Position
                        </h4>
                        <div className="flex justify-between py-1 border-b border-slate-800/40">
                          <span className="text-slate-400">Total Loan Principal</span>
                          <span className="font-mono font-bold text-white">{money(autoTotals.totalLoan)}</span>
                        </div>
                        <div className="flex justify-between py-1 border-b border-slate-800/40">
                          <span className="text-slate-400">Total with Agreed Interest</span>
                          <span className="font-mono text-purple-300 font-semibold">{money(autoTotals.totalLoanWithInterest)}</span>
                        </div>
                        <div className="flex justify-between py-1 border-b border-slate-800/40">
                          <span className="text-slate-400">Auto Interest Component</span>
                          <span className="font-mono text-purple-300 font-semibold">{money(autoTotals.autoInterest)}</span>
                        </div>
                        <div className="flex justify-between py-1 border-b border-slate-800/40">
                          <span className="text-slate-400">EMI Collections (Loan Income)</span>
                          <span className="font-mono text-emerald-300 font-semibold">{money(autoTotals.loanIncome)}</span>
                        </div>
                        <div className="flex justify-between py-1 border-b border-slate-800/40">
                          <span className="text-slate-400">Net Distributed to Borrowers</span>
                          <span className="font-mono text-cyan-300 font-semibold">{money(autoTotals.distribut)}</span>
                        </div>
                        <div className="flex justify-between py-1 border-b border-slate-800/40">
                          <span className="text-slate-400">RTO & Processing Fees (D, TA, HP, INSU, FC)</span>
                          <span className="font-mono text-amber-300 font-semibold">{money(autoTotals.dTaHpInsuFc)}</span>
                        </div>
                        <div className="flex justify-between py-1 border-b border-slate-800/40">
                          <span className="text-slate-400">FC & Insurance Office Expense</span>
                          <span className="font-mono text-rose-300 font-semibold">{money(autoTotals.fcSelavu)}</span>
                        </div>
                        <div className="flex justify-between py-1 border-b border-slate-800/40">
                          <span className="text-slate-400">Broker Commissions</span>
                          <span className="font-mono text-blue-300 font-semibold">{money(autoTotals.broker)}</span>
                        </div>
                        <div className="flex justify-between py-1.5 pt-2 font-bold text-blue-400 text-sm">
                          <span>Auto Iruppu (Net In Hand)</span>
                          <span className="font-mono">{money(autoTotals.iruppu)}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
