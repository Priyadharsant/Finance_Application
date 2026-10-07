import * as XLSX from "xlsx";

/**
 * Automatically calculates and sets optimal column widths for an XLSX worksheet.
 * Works seamlessly for JSON datasets (Array of Objects) and direct worksheet structures (AoA).
 */
export const autoFitColumns = (worksheet, data) => {
  if (!worksheet) return;

  // 1. If explicit array-of-objects data is passed, calculate from object keys and values
  if (Array.isArray(data) && data.length > 0 && typeof data[0] === "object" && !Array.isArray(data[0])) {
    const keys = Object.keys(data[0]);
    const wscols = keys.map((key) => {
      const maxDataLength = data.reduce((max, row) => {
        const val = row[key];
        const valLen = val != null ? String(val).split("\n")[0].length : 0;
        return Math.max(max, valLen);
      }, key.length);
      return { wch: Math.min(Math.max(maxDataLength + 4, 12), 48) };
    });
    worksheet["!cols"] = wscols;
    return;
  }

  // 2. Otherwise calculate directly from worksheet cell contents
  if (worksheet["!ref"]) {
    const range = XLSX.utils.decode_range(worksheet["!ref"]);
    const colWidths = [];
    for (let C = range.s.c; C <= range.e.c; ++C) {
      let maxLen = 8;
      for (let R = range.s.r; R <= range.e.r; ++R) {
        const cellAddress = XLSX.utils.encode_cell({ r: R, c: C });
        const cell = worksheet[cellAddress];
        if (cell && cell.v != null) {
          const valStr = String(cell.v).split("\n")[0];
          maxLen = Math.max(maxLen, Math.min(valStr.length, 45));
        }
      }
      colWidths[C] = { wch: Math.min(Math.max(maxLen + 4, 12), 48) };
    }
    worksheet["!cols"] = colWidths;
  }
};

/**
 * Downloads a single-sheet Excel workbook.
 */
export const downloadExcelFile = (data, sheetName, fileName) => {
  const worksheet = XLSX.utils.json_to_sheet(data);
  autoFitColumns(worksheet, data);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName || "Sheet1");
  XLSX.writeFile(workbook, `${fileName}.xlsx`);
};

/**
 * Export Partner Balances & Capital Report
 */
export const exportPartnerBalances = (partners = [], filterPartnerId = "ALL") => {
  let list = partners;
  if (filterPartnerId && filterPartnerId !== "ALL") {
    list = list.filter((p) => String(p.id) === String(filterPartnerId));
  }

  const rows = list.map((p, idx) => ({
    "S.No": idx + 1,
    "Partner Name": p.name || p.partner_name || "—",
    "Current Capital (₹)": Number(p.current_capital ?? p.currentCapital ?? p.base_capital ?? p.initial_contribution ?? 0),
    "Base / Initial Capital (₹)": Number(p.base_capital ?? p.initial_contribution ?? 0),
    "Total Contributed (₹)": Number(p.total_contributed ?? p.totalContributed ?? 0),
    "Total Withdrawn (₹)": Number(p.total_withdrawn ?? p.totalWithdrawn ?? 0),
    "Total Profit Credited (₹)": Number(p.profit_earned ?? p.total_profit_credited ?? p.totalProfitCredited ?? 0),
    "Status": p.status || "ACTIVE",
    "Phone": p.phone || "—",
    "Email": p.email || "—",
    "PAN Number": p.pan_number || p.pan || "—",
    "Joined Date": (p.created_at || p.effective_date) ? String(p.created_at || p.effective_date).slice(0, 10) : "—",
  }));

  downloadExcelFile(
    rows.length ? rows : [{ Message: "No partners found matching selection." }],
    "Partner Capital",
    `Partner_Capital_Balances_${new Date().toISOString().slice(0, 10)}`
  );
};

/**
 * Export a Single Selected Month Closing
 */
export const exportSingleMonthClosing = (monthData, year, month) => {
  const monthName =
    monthData?.monthName ||
    new Date(year, month - 1).toLocaleString("default", { month: "long" });

  const summary = [
    { Field: "Closing Period", Value: `${monthName} ${year}` },
    { Field: "Period Start", Value: monthData?.periodStart || `${year}-${String(month).padStart(2, "0")}-01` },
    { Field: "Period End", Value: monthData?.asOfDate || monthData?.periodEnd || "—" },
    { Field: "Total Revenue (₹)", Value: Number(monthData?.financials?.totalRevenue || 0) },
    { Field: "Auto Revenue (₹)", Value: Number(monthData?.financials?.autoRevenue || 0) },
    { Field: "Daily Revenue (₹)", Value: Number(monthData?.financials?.dailyRevenue || 0) },
    { Field: "Total Expenses (₹)", Value: Number(monthData?.financials?.expenses || 0) },
    { Field: "Net Operating Profit (₹)", Value: Number(monthData?.financials?.netProfit || 0) },
    { Field: "Distributable Profit (₹)", Value: Number(monthData?.expectedDistributableProfit ?? monthData?.distributableProfit ?? 0) },
    { Field: "Active Partners", Value: monthData?.allocations?.length || 0 },
    { Field: "Status", Value: monthData?.isCurrentMonth ? "Accumulating (Current Month)" : "Finalized / Closed" },
  ];

  const allocations = (monthData?.allocations || []).map((a, idx) => ({
    "S.No": idx + 1,
    "Partner Name": a.partnerName || a.partner_name || "—",
    "Opening Capital (₹)": Number(a.openingCapital || a.opening_capital || 0),
    "Closing Capital (₹)": Number(a.closingCapital || a.closing_capital || 0),
    "Profit Share %": `${(Number(a.profitRatio || a.profit_ratio || 0) * 100).toFixed(2)}%`,
    "Profit Earned / Allocated (₹)": Number(a.allocatedProfit || a.allocated_profit || 0),
    "Status": monthData?.isCurrentMonth ? "Accumulating" : "Credited to Capital",
  }));

  const workbook = XLSX.utils.book_new();

  const wsSummary = XLSX.utils.json_to_sheet(summary);
  autoFitColumns(wsSummary, summary);
  XLSX.utils.book_append_sheet(workbook, wsSummary, "Month Overview");

  const wsAlloc = XLSX.utils.json_to_sheet(
    allocations.length ? allocations : [{ Message: "No partner allocations for this month." }]
  );
  autoFitColumns(wsAlloc, allocations.length ? allocations : [{ Message: "No partner allocations for this month." }]);
  XLSX.utils.book_append_sheet(workbook, wsAlloc, "Partner Profit Shares");

  XLSX.writeFile(workbook, `Monthly_Closing_${monthName}_${year}.xlsx`);
};

/**
 * Export Year-Wise Monthly Closings & Partner Profit Shares Report
 */
export const exportYearWiseClosingReport = (year, monthsData = []) => {
  const summaryRows = [];
  const partnerProfitsMap = {};
  const partnerOpeningMap = {};
  const partnerClosingMap = {};

  let totalYearAutoRev = 0;
  let totalYearDailyRev = 0;
  let totalYearRev = 0;
  let totalYearExp = 0;
  let totalYearNetProfit = 0;
  let totalYearDistProfit = 0;

  monthsData.forEach((m, idx) => {
    const monthNum = m.month || idx + 1;
    const monthName =
      m.monthName ||
      new Date(year, monthNum - 1).toLocaleString("default", { month: "short" });

    const autoRev = Number(m.financials?.autoRevenue ?? m.revenue_breakdown?.autoRevenue ?? 0);
    const dailyRev = Number(m.financials?.dailyRevenue ?? m.revenue_breakdown?.dailyRevenue ?? 0);
    const totRev = Number(m.financials?.totalRevenue ?? m.revenue_breakdown?.totalRevenue ?? 0);
    const exp = Number(m.financials?.expenses ?? m.expenses_total ?? 0);
    const net = Number(m.financials?.netProfit ?? m.net_profit ?? 0);
    const dist = Number(m.expectedDistributableProfit ?? m.distributable_profit ?? m.distributableProfit ?? 0);

    totalYearAutoRev += autoRev;
    totalYearDailyRev += dailyRev;
    totalYearRev += totRev;
    totalYearExp += exp;
    totalYearNetProfit += net;
    totalYearDistProfit += dist;

    summaryRows.push({
      "Month": `${monthName} ${year}`,
      "Period Start": m.periodStart || m.period_start?.slice(0, 10) || `${year}-${String(monthNum).padStart(2, "0")}-01`,
      "Period End": m.asOfDate || m.periodEnd || m.period_end?.slice(0, 10) || "—",
      "Auto Revenue (₹)": autoRev,
      "Daily Revenue (₹)": dailyRev,
      "Total Revenue (₹)": totRev,
      "Total Expenses (₹)": exp,
      "Net Profit (₹)": net,
      "Distributable Profit (₹)": dist,
      "Active Partners": Number(m.allocations?.length ?? m.partner_count ?? 0),
      "Status": m.isCurrentMonth ? "Ongoing" : "Completed",
    });

    (m.allocations || []).forEach((a) => {
      const name = a.partnerName || a.partner_name || "Unknown Partner";
      if (!partnerProfitsMap[name]) {
        partnerProfitsMap[name] = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0, 7: 0, 8: 0, 9: 0, 10: 0, 11: 0, 12: 0, total: 0 };
        partnerOpeningMap[name] = Number(a.openingCapital || a.opening_capital || 0);
      }
      const pProfit = Number(a.allocatedProfit || a.allocated_profit || 0);
      partnerProfitsMap[name][monthNum] = pProfit;
      partnerProfitsMap[name].total += pProfit;
      partnerClosingMap[name] = Number(a.closingCapital || a.closing_capital || 0);
    });
  });

  summaryRows.push({
    "Month": `FULL YEAR ${year} TOTAL`,
    "Period Start": `${year}-01-01`,
    "Period End": `${year}-12-31`,
    "Auto Revenue (₹)": totalYearAutoRev,
    "Daily Revenue (₹)": totalYearDailyRev,
    "Total Revenue (₹)": totalYearRev,
    "Total Expenses (₹)": totalYearExp,
    "Net Profit (₹)": totalYearNetProfit,
    "Distributable Profit (₹)": totalYearDistProfit,
    "Active Partners": Object.keys(partnerProfitsMap).length,
    "Status": "ANNUAL TOTAL",
  });

  const monthNamesShort = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const partnerMatrixRows = Object.keys(partnerProfitsMap).map((name, idx) => {
    const row = {
      "S.No": idx + 1,
      "Partner Name": name,
      "Opening Capital (₹)": partnerOpeningMap[name] || 0,
      "Closing Capital (₹)": partnerClosingMap[name] || 0,
    };
    monthNamesShort.forEach((mName, i) => {
      row[`${mName} (₹)`] = partnerProfitsMap[name][i + 1] || 0;
    });
    row[`Total Profit ${year} (₹)`] = partnerProfitsMap[name].total;
    return row;
  });

  const workbook = XLSX.utils.book_new();

  const wsSummary = XLSX.utils.json_to_sheet(summaryRows);
  autoFitColumns(wsSummary, summaryRows);
  XLSX.utils.book_append_sheet(workbook, wsSummary, `${year} Monthly Summary`);

  const wsPartners = XLSX.utils.json_to_sheet(
    partnerMatrixRows.length ? partnerMatrixRows : [{ Message: `No partner profits recorded for year ${year}.` }]
  );
  autoFitColumns(wsPartners, partnerMatrixRows.length ? partnerMatrixRows : [{ Message: `No partner profits recorded for year ${year}.` }]);
  XLSX.utils.book_append_sheet(workbook, wsPartners, `${year} Partner Profit Matrix`);

  XLSX.writeFile(workbook, `Annual_Financial_Report_${year}.xlsx`);
};

/**
 * Export All Passed Months Closings & Partner Profit Shares Report
 */
export const exportAllPassedMonthsClosings = (allMonthsData = []) => {
  const summaryRows = [];
  const detailedPartnerRows = [];

  allMonthsData.forEach((m, idx) => {
    summaryRows.push({
      "S.No": idx + 1,
      "Month": `${m.monthName || m.period_name || m.periodName || ""} (${m.year || m.period_start?.slice(0, 4) || ""})`,
      "Period Start": m.periodStart || m.period_start?.slice(0, 10) || "—",
      "Period End": m.asOfDate || m.periodEnd || m.period_end?.slice(0, 10) || "—",
      "Auto Revenue (₹)": Number(m.financials?.autoRevenue ?? m.revenue_breakdown?.autoRevenue ?? 0),
      "Daily Revenue (₹)": Number(m.financials?.dailyRevenue ?? m.revenue_breakdown?.dailyRevenue ?? 0),
      "Total Revenue (₹)": Number(m.financials?.totalRevenue ?? m.revenue_breakdown?.totalRevenue ?? 0),
      "Total Expenses (₹)": Number(m.financials?.expenses ?? m.expenses_total ?? 0),
      "Net Profit (₹)": Number(m.financials?.netProfit ?? m.net_profit ?? 0),
      "Distributable Profit (₹)": Number(m.expectedDistributableProfit ?? m.distributable_profit ?? m.distributableProfit ?? 0),
      "Total Partners": Number(m.allocations?.length ?? m.partner_count ?? 0),
      "Status": m.isCurrentMonth ? "Accumulating" : "Finalized",
    });

    const allocs = m.allocations || [];
    allocs.forEach((a) => {
      detailedPartnerRows.push({
        "Month": `${m.monthName || m.period_name || m.periodName || ""} (${m.year || m.period_start?.slice(0, 4) || ""})`,
        "Period": `${m.periodStart || m.period_start?.slice(0, 10)} to ${m.asOfDate || m.periodEnd || m.period_end?.slice(0, 10)}`,
        "Partner Name": a.partnerName || a.partner_name || "—",
        "Opening Capital (₹)": Number(a.openingCapital || a.opening_capital || 0),
        "Closing Capital (₹)": Number(a.closingCapital || a.closing_capital || 0),
        "Share %": `${(Number(a.profitRatio || a.profit_ratio || 0) * 100).toFixed(2)}%`,
        "Profit Allocated (₹)": Number(a.allocatedProfit || a.allocated_profit || 0),
        "Status": m.isCurrentMonth ? "Accumulating" : "Credited",
      });
    });
  });

  const workbook = XLSX.utils.book_new();

  const wsSummary = XLSX.utils.json_to_sheet(
    summaryRows.length ? summaryRows : [{ Message: "No monthly closing history available." }]
  );
  autoFitColumns(wsSummary, summaryRows.length ? summaryRows : [{ Message: "No monthly closing history available." }]);
  XLSX.utils.book_append_sheet(workbook, wsSummary, "All Passed Months Summary");

  if (detailedPartnerRows.length) {
    const wsDetails = XLSX.utils.json_to_sheet(detailedPartnerRows);
    autoFitColumns(wsDetails, detailedPartnerRows);
    XLSX.utils.book_append_sheet(workbook, wsDetails, "All Partner Profit Shares");
  }

  XLSX.writeFile(
    workbook,
    `All_Passed_Months_Closings_Report_${new Date().toISOString().slice(0, 10)}.xlsx`
  );
};

/**
 * Export Day-to-Day Calculation Logs (Single Month or Multi-Month)
 */
export const exportDayToDayLogs = (dailyLogsData, monthLabel = "") => {
  const logs = dailyLogsData?.logs || [];
  const rows = logs.map((l, idx) => ({
    "S.No": idx + 1,
    "Date": l.calcDate || "—",
    "Auto Revenue (₹)": Number(l.autoRevenue || 0),
    "Daily Revenue (₹)": Number(l.dailyRevenue || 0),
    "Total Revenue (₹)": Number(l.totalRevenue || 0),
    "Expenses (₹)": Number(l.expenses || 0),
    "Net Income / Loss (₹)": Number(l.netProfit || 0),
    "Active Capital (₹)": Number(l.totalActiveCapital || 0),
    "Active Partners": Number(l.partnersCount || l.allocations?.length || 0),
    "Status": l.netProfit >= 0 ? "Profit" : "Loss",
  }));

  if (dailyLogsData?.totals && rows.length) {
    rows.push({
      "S.No": "TOTAL",
      "Date": `Period Total (${dailyLogsData.count || rows.length} Days)`,
      "Auto Revenue (₹)": Number(dailyLogsData.totals.autoRevenue || 0),
      "Daily Revenue (₹)": Number(dailyLogsData.totals.dailyRevenue || 0),
      "Total Revenue (₹)": Number(dailyLogsData.totals.totalRevenue || 0),
      "Expenses (₹)": Number(dailyLogsData.totals.expenses || 0),
      "Net Income / Loss (₹)": Number(dailyLogsData.totals.netProfit || 0),
      "Active Capital (₹)": "—",
      "Active Partners": "—",
      "Status": "—",
    });
  }

  downloadExcelFile(
    rows.length ? rows : [{ Message: "No day-to-day calculation logs found." }],
    "Day-to-Day P&L",
    `Day_To_Day_Logs_${monthLabel ? monthLabel + "_" : ""}${new Date().toISOString().slice(0, 10)}`
  );
};

/**
 * Export Multi-Month Consolidated Day-to-Day Logs
 */
export const exportAllPassedMonthsDailyLogs = (allMonthLogs = []) => {
  const combinedRows = [];
  allMonthsLogsIter: for (const mData of allMonthLogs) {
    const logs = mData.logs || [];
    for (const l of logs) {
      combinedRows.push({
        "Date": l.calcDate || "—",
        "Month": mData.monthName || mData.startDate?.slice(0, 7) || "—",
        "Auto Revenue (₹)": Number(l.autoRevenue || 0),
        "Daily Revenue (₹)": Number(l.dailyRevenue || 0),
        "Total Revenue (₹)": Number(l.totalRevenue || 0),
        "Expenses (₹)": Number(l.expenses || 0),
        "Net Income / Loss (₹)": Number(l.netProfit || 0),
        "Active Capital (₹)": Number(l.totalActiveCapital || 0),
        "Status": l.netProfit >= 0 ? "Profit" : "Loss",
      });
    }
  }

  downloadExcelFile(
    combinedRows.length ? combinedRows : [{ Message: "No daily logs recorded across past months." }],
    "Daily P&L History",
    `All_Passed_Months_Daily_PL_Logs_${new Date().toISOString().slice(0, 10)}`
  );
};

/**
 * Export Capital Transactions (Filtered or All)
 */
export const exportCapitalTransactions = (transactions = [], filters = {}) => {
  let list = Array.isArray(transactions) ? [...transactions] : [];

  if (filters.partnerId && filters.partnerId !== "ALL") {
    list = list.filter((t) => String(t.partner_id) === String(filters.partnerId));
  }
  if (filters.type && filters.type !== "ALL") {
    if (filters.type === "CONTRIBUTION") {
      list = list.filter((t) => (t.transaction_type || t.type) === "CONTRIBUTION" || (t.transaction_type || t.type) === "ADJUSTMENT_INCREASE");
    } else if (filters.type === "WITHDRAWAL") {
      list = list.filter((t) => (t.transaction_type || t.type) === "WITHDRAWAL" || (t.transaction_type || t.type) === "ADJUSTMENT_DECREASE" || (t.transaction_type || t.type) === "CAPITAL_EXIT");
    } else {
      list = list.filter((t) => (t.transaction_type || t.type) === filters.type);
    }
  }
  if (filters.from) {
    list = list.filter((t) => {
      const d = String(t.effective_date || t.transaction_date || t.created_at || "").slice(0, 10);
      return !d || d >= filters.from;
    });
  }
  if (filters.to) {
    list = list.filter((t) => {
      const d = String(t.effective_date || t.transaction_date || t.created_at || "").slice(0, 10);
      return !d || d <= filters.to;
    });
  }
  if (filters.search && filters.search.trim()) {
    const q = filters.search.toLowerCase().trim();
    list = list.filter((tx) =>
      (tx.partner_name && tx.partner_name.toLowerCase().includes(q)) ||
      (tx.name && tx.name.toLowerCase().includes(q)) ||
      (tx.reference_number && tx.reference_number.toLowerCase().includes(q)) ||
      (tx.notes && tx.notes.toLowerCase().includes(q))
    );
  }

  const rows = list.map((tx, idx) => ({
    "S.No": idx + 1,
    "Date": (tx.effective_date || tx.transaction_date || tx.created_at) ? String(tx.effective_date || tx.transaction_date || tx.created_at).slice(0, 10) : "—",
    "Partner Name": tx.partner_name || tx.name || "—",
    "Transaction Type": tx.transaction_type || tx.type || "CONTRIBUTION",
    "Amount (₹)": Number(tx.amount || 0),
    "Payment Mode": tx.payment_mode || "BANK_TRANSFER",
    "Reference / UTR": tx.reference_number || tx.reference_id || tx.reference_type || "—",
    "Notes": tx.notes || "—",
    "Logged At": tx.created_at ? String(tx.created_at).slice(0, 16).replace("T", " ") : "—",
  }));

  downloadExcelFile(
    rows.length ? rows : [{ Message: "No capital transactions found matching filters." }],
    "Capital Transactions",
    `Capital_Transactions_Report_${filters.label ? filters.label + "_" : ""}${new Date().toISOString().slice(0, 10)}`
  );
};

/**
 * Export Business Expenses Report (All or Filtered)
 */
export const exportBusinessExpenses = (expenses = [], filters = {}) => {
  let list = Array.isArray(expenses) ? [...expenses] : [];

  if (filters.category && filters.category !== "ALL") {
    list = list.filter((e) => e.category === filters.category);
  }
  if (filters.module && filters.module !== "ALL") {
    list = list.filter((e) => (e.source_module || e.source || e.category || "GENERAL") === filters.module);
  }
  if (filters.from) {
    list = list.filter((e) => (e.expense_date || "") >= filters.from);
  }
  if (filters.to) {
    list = list.filter((e) => (e.expense_date || "") <= filters.to);
  }
  if (filters.search && filters.search.trim()) {
    const q = filters.search.toLowerCase().trim();
    list = list.filter((e) =>
      (e.description && e.description.toLowerCase().includes(q)) ||
      (e.title && e.title.toLowerCase().includes(q)) ||
      (e.expense_type && e.expense_type.toLowerCase().includes(q)) ||
      (e.auto_loan_reg && e.auto_loan_reg.toLowerCase().includes(q))
    );
  }

  const rows = list.map((exp, idx) => ({
    "S.No": idx + 1,
    "Date": exp.expense_date ? String(exp.expense_date).slice(0, 10) : "—",
    "Reason (Why)": exp.description || exp.title || "—",
    "Category": exp.category || "GENERAL",
    "Type": exp.expense_type || exp.source_module || "GENERAL",
    "Reference / Vehicle": exp.auto_loan_reg
      ? `${exp.auto_loan_reg} (${exp.auto_loan_vehicle || "Vehicle"})`
      : exp.loan_id
        ? `Auto Loan #${String(exp.loan_id).slice(0, 8)}`
        : exp.finance_id
          ? `Daily Finance #${String(exp.finance_id).slice(0, 8)}`
          : "—",
    "Amount (₹)": Number(exp.amount || 0),
    "Logged At": exp.created_at ? String(exp.created_at).slice(0, 16).replace("T", " ") : "—",
  }));

  downloadExcelFile(
    rows.length ? rows : [{ Message: "No expenses found for the selected period." }],
    "Business Expenses",
    `Business_Expenses_Report_${filters.label ? filters.label + "_" : ""}${new Date().toISOString().slice(0, 10)}`
  );
};

/**
 * Export Global Cash General Ledger
 */
export const exportGlobalLedger = (ledger = [], filters = {}) => {
  let list = [...ledger];

  // Sort chronological ascending to calculate running balance
  list.sort((a, b) => {
    const da = new Date(a.effective_date || a.transaction_date || a.created_at || 0).getTime();
    const db = new Date(b.effective_date || b.transaction_date || b.created_at || 0).getTime();
    return da - db;
  });

  let runningBal = 0;
  const computedList = list.map((item, idx) => {
    const isCredit =
      item.direction === "CREDIT" ||
      item.type === "CREDIT" ||
      item.type === "PARTNER_CONTRIBUTION" ||
      item.type === "AUTO_COLLECTION" ||
      item.type === "DAILY_COLLECTION" ||
      item.type === "ADJUSTMENT_INCREASE";

    const isDebit =
      item.direction === "DEBIT" ||
      item.type === "DEBIT" ||
      item.type === "PARTNER_WITHDRAWAL" ||
      item.type === "AUTO_LOAN_DISBURSEMENT" ||
      item.type === "DAILY_LOAN_DISBURSEMENT" ||
      item.type === "BUSINESS_EXPENSE" ||
      item.type === "PROFIT_PAYMENT" ||
      item.type === "ADJUSTMENT_DECREASE";

    const creditAmt = isCredit ? Number(item.amount || 0) : 0;
    const debitAmt = isDebit ? Number(item.amount || 0) : (!isCredit ? Number(item.amount || 0) : 0);

    runningBal += creditAmt - debitAmt;

    const dateStr = item.effective_date
      ? String(item.effective_date).slice(0, 10)
      : item.transaction_date
        ? String(item.transaction_date).slice(0, 10)
        : item.created_at
          ? String(item.created_at).slice(0, 10)
          : "—";

    return {
      ...item,
      computedDate: dateStr,
      creditAmt,
      debitAmt,
      calculatedBalance: item.balance_after ?? item.running_balance ?? runningBal,
    };
  });

  let filtered = computedList;
  if (filters.from) {
    filtered = filtered.filter((l) => (l.computedDate || "") >= filters.from);
  }
  if (filters.to) {
    filtered = filtered.filter((l) => (l.computedDate || "") <= filters.to);
  }
  if (filters.module && filters.module !== "ALL") {
    filtered = filtered.filter((l) => (l.source_module || l.module || "GLOBAL").toUpperCase() === filters.module);
  }
  if (filters.type && filters.type !== "ALL") {
    filtered = filtered.filter((l) => {
      if (filters.type === "CREDIT") return l.creditAmt > 0 || l.direction === "CREDIT";
      if (filters.type === "DEBIT") return l.debitAmt > 0 || l.direction === "DEBIT";
      return l.type === filters.type || l.direction === filters.type;
    });
  }
  if (filters.search && filters.search.trim()) {
    const q = filters.search.toLowerCase().trim();
    filtered = filtered.filter((l) =>
      (l.description && l.description.toLowerCase().includes(q)) ||
      (l.notes && l.notes.toLowerCase().includes(q)) ||
      (l.type && l.type.toLowerCase().includes(q)) ||
      (l.reference_id && String(l.reference_id).toLowerCase().includes(q))
    );
  }

  const rows = filtered.map((item, idx) => ({
    "Entry #": item.id || idx + 1,
    "Date": item.computedDate,
    "Category / Type": item.type || item.category || "GENERAL",
    "Direction": item.direction || (item.creditAmt > 0 ? "CREDIT" : "DEBIT"),
    "Description / Narration": item.notes || item.description || item.reference_type || item.type || "—",
    "Source Module": item.source_module || "GLOBAL",
    "Inflow / Credit (₹)": item.creditAmt,
    "Outflow / Debit (₹)": item.debitAmt,
    "Net Impact (₹)": item.creditAmt - item.debitAmt,
    "Running Balance (₹)": item.calculatedBalance,
    "Reference Details": item.reference_id
      ? `${item.reference_type || "REF"}: ${item.reference_id}`
      : item.reference_type || item.notes || "—",
  }));

  downloadExcelFile(
    rows.length ? rows : [{ Message: "No ledger transactions found matching filters." }],
    "Global Ledger",
    `Global_Cash_General_Ledger_${filters.label ? filters.label + "_" : ""}${new Date().toISOString().slice(0, 10)}`
  );
};

/**
 * Export Master Multi-Sheet All-In-One Financial Report Workbook with ALL passed months
 */
export const exportMasterFinancialReport = ({
  ledger = [],
  partners = [],
  transactions = [],
  expenses = [],
  closings = [],
  allPassedMonths = [],
  dailyLogs = [],
  autoLoans = [],
  dailyCustomers = [],
}) => {
  const workbook = XLSX.utils.book_new();

  // 1. Executive Summary Sheet
  const totalPartnerCapital = partners.reduce(
    (sum, p) => sum + Number(p.currentCapital ?? p.current_capital ?? p.initial_contribution ?? 0),
    0
  );
  const totalExpenses = expenses.reduce((sum, e) => sum + Number(e.amount || 0), 0);
  const totalContributed = transactions
    .filter((t) => t.transaction_type === "CONTRIBUTION")
    .reduce((sum, t) => sum + Number(t.amount || 0), 0);
  const totalWithdrawn = transactions
    .filter((t) => t.transaction_type === "WITHDRAWAL")
    .reduce((sum, t) => sum + Number(t.amount || 0), 0);

  const summarySheetData = [
    { Metric: "Report Generated On", Value: new Date().toLocaleString("en-IN") },
    { Metric: "Report Scope", Value: "All Modules (Auto Finance, Daily Finance, Global Capital)" },
    { Metric: "Total Active Partners", Value: partners.length },
    { Metric: "Total Active Capital Balance (₹)", Value: totalPartnerCapital },
    { Metric: "Total Capital Contributed (₹)", Value: totalContributed },
    { Metric: "Total Capital Withdrawn (₹)", Value: totalWithdrawn },
    { Metric: "Total Expenses Recorded (₹)", Value: totalExpenses },
    { Metric: "Total Passed Months Closed / Recorded", Value: allPassedMonths.length || closings.length },
    { Metric: "Total Vehicle Loans (Auto Finance)", Value: autoLoans.length },
    { Metric: "Total Daily Finance Accounts", Value: dailyCustomers.length },
    { Metric: "Total Ledger Audit Entries", Value: ledger.length },
  ];
  const wsSummary = XLSX.utils.json_to_sheet(summarySheetData);
  autoFitColumns(wsSummary, summarySheetData);
  XLSX.utils.book_append_sheet(workbook, wsSummary, "Executive Summary");

  // 2. All Passed Months Closings
  const monthsSource = allPassedMonths.length ? allPassedMonths : closings;
  if (monthsSource.length) {
    const closingRows = monthsSource.map((c, idx) => ({
      "S.No": idx + 1,
      "Month": `${c.monthName || c.period_name || c.periodName || ""} (${c.year || c.period_start?.slice(0, 4) || ""})`,
      "Period Start": c.periodStart || c.period_start?.slice(0, 10) || "—",
      "Period End": c.asOfDate || c.periodEnd || c.period_end?.slice(0, 10) || "—",
      "Distributable Profit (₹)": Number(c.expectedDistributableProfit ?? c.distributable_profit ?? c.distributableProfit ?? 0),
      "Auto Revenue (₹)": Number(c.financials?.autoRevenue ?? c.revenue_breakdown?.autoRevenue ?? 0),
      "Daily Revenue (₹)": Number(c.financials?.dailyRevenue ?? c.revenue_breakdown?.dailyRevenue ?? 0),
      "Total Expenses (₹)": Number(c.financials?.expenses ?? c.expenses_total ?? 0),
      "Status": c.isCurrentMonth ? "Accumulating" : "Finalized",
    }));
    const wsClosings = XLSX.utils.json_to_sheet(closingRows);
    autoFitColumns(wsClosings, closingRows);
    XLSX.utils.book_append_sheet(workbook, wsClosings, "All Passed Months Closings");
  }

  // 3. Partner Balances
  if (partners.length) {
    const partnerRows = partners.map((p, idx) => ({
      "S.No": idx + 1,
      "Partner Name": p.name || p.partner_name || "—",
      "Current Capital (₹)": Number(p.current_capital ?? p.currentCapital ?? p.base_capital ?? p.initial_contribution ?? 0),
      "Base / Initial Capital (₹)": Number(p.base_capital ?? p.initial_contribution ?? 0),
      "Total Contributed (₹)": Number(p.total_contributed ?? p.totalContributed ?? 0),
      "Total Withdrawn (₹)": Number(p.total_withdrawn ?? p.totalWithdrawn ?? 0),
      "Total Profit Credited (₹)": Number(p.profit_earned ?? p.total_profit_credited ?? p.totalProfitCredited ?? 0),
      "Status": p.status || "ACTIVE",
      "Phone": p.phone || "—",
      "PAN Number": p.pan_number || p.pan || "—",
    }));
    const wsPartners = XLSX.utils.json_to_sheet(partnerRows);
    autoFitColumns(wsPartners, partnerRows);
    XLSX.utils.book_append_sheet(workbook, wsPartners, "Partner Balances");
  }

  // 4. Day-to-Day Logs
  if (dailyLogs.length) {
    const dailyRows = dailyLogs.map((l, idx) => ({
      "S.No": idx + 1,
      "Date": l.calcDate || "—",
      "Auto Revenue (₹)": Number(l.autoRevenue || 0),
      "Daily Revenue (₹)": Number(l.dailyRevenue || 0),
      "Total Revenue (₹)": Number(l.totalRevenue || 0),
      "Expenses (₹)": Number(l.expenses || 0),
      "Net Income (₹)": Number(l.netProfit || 0),
      "Active Capital (₹)": Number(l.totalActiveCapital || 0),
    }));
    const wsDaily = XLSX.utils.json_to_sheet(dailyRows);
    autoFitColumns(wsDaily, dailyRows);
    XLSX.utils.book_append_sheet(workbook, wsDaily, "Day-to-Day Logs");
  }

  // 5. Capital Transactions
  if (transactions.length) {
    const txRows = transactions.map((t, idx) => ({
      "Tx ID": t.id || idx + 1,
      "Date": (t.effective_date || t.transaction_date || t.created_at) ? String(t.effective_date || t.transaction_date || t.created_at).slice(0, 10) : "—",
      "Partner Name": t.partner_name || t.name || "—",
      "Type": t.transaction_type || t.type || "CONTRIBUTION",
      "Amount (₹)": Number(t.amount || 0),
      "Payment Mode": t.payment_mode || "BANK_TRANSFER",
      "Reference / UTR": t.reference_number || t.reference_id || t.reference_type || "—",
      "Notes": t.notes || "—",
    }));
    const wsTx = XLSX.utils.json_to_sheet(txRows);
    autoFitColumns(wsTx, txRows);
    XLSX.utils.book_append_sheet(workbook, wsTx, "Capital Transactions");
  }

  // 6. Expenses
  if (expenses.length) {
    const expRows = expenses.map((e, idx) => ({
      "S.No": idx + 1,
      "Date": e.expense_date ? String(e.expense_date).slice(0, 10) : "—",
      "Description": e.title || e.description || "—",
      "Category": e.category || "GENERAL",
      "Module": e.source_module || "GENERAL",
      "Amount (₹)": Number(e.amount || 0),
      "Paid By": e.paid_by || "Company",
    }));
    const wsExp = XLSX.utils.json_to_sheet(expRows);
    autoFitColumns(wsExp, expRows);
    XLSX.utils.book_append_sheet(workbook, wsExp, "Business Expenses");
  }

  // 7. Global Cash Ledger
  if (ledger.length) {
    let runBal = 0;
    const sortedLedger = [...ledger].sort((a, b) => {
      const da = new Date(a.effective_date || a.transaction_date || a.created_at || 0).getTime();
      const db = new Date(b.effective_date || b.transaction_date || b.created_at || 0).getTime();
      return da - db;
    });

    const ledgerRows = sortedLedger.map((l, idx) => {
      const isCredit =
        l.direction === "CREDIT" ||
        l.type === "CREDIT" ||
        l.type === "PARTNER_CONTRIBUTION" ||
        l.type === "AUTO_COLLECTION" ||
        l.type === "DAILY_COLLECTION";
      const isDebit =
        l.direction === "DEBIT" ||
        l.type === "DEBIT" ||
        l.type === "PARTNER_WITHDRAWAL" ||
        l.type === "AUTO_LOAN_DISBURSEMENT" ||
        l.type === "DAILY_LOAN_DISBURSEMENT" ||
        l.type === "BUSINESS_EXPENSE" ||
        l.type === "PROFIT_PAYMENT";

      const creditAmt = isCredit ? Number(l.amount || 0) : 0;
      const debitAmt = isDebit ? Number(l.amount || 0) : (!isCredit ? Number(l.amount || 0) : 0);
      runBal += creditAmt - debitAmt;

      return {
        "Entry #": l.id || idx + 1,
        "Date": (l.effective_date || l.transaction_date || l.created_at) ? String(l.effective_date || l.transaction_date || l.created_at).slice(0, 10) : "—",
        "Category / Type": l.type || l.category || "GENERAL",
        "Direction": l.direction || (creditAmt > 0 ? "CREDIT" : "DEBIT"),
        "Description / Narration": l.notes || l.description || l.reference_type || l.type || "—",
        "Credit (₹)": creditAmt,
        "Debit (₹)": debitAmt,
        "Balance (₹)": l.balance_after ?? l.running_balance ?? runBal,
      };
    });
    const wsLedger = XLSX.utils.json_to_sheet(ledgerRows);
    autoFitColumns(wsLedger, ledgerRows);
    XLSX.utils.book_append_sheet(workbook, wsLedger, "Global Ledger");
  }

  // 8. Auto Loans
  if (autoLoans.length) {
    const loanRows = autoLoans.map((l, idx) => {
      let fees = {};
      try {
        fees = typeof l.fees_details === "string" ? JSON.parse(l.fees_details || "{}") : (l.fees_details || {});
      } catch (_) {
        fees = {};
      }

      const totalDeductions =
        Number(fees.incomeDue || 0) +
        Number(fees.documentFee || 0) +
        Number(fees.hirePurchase || 0) +
        Number(fees.taxAmount || 0) +
        Number(fees.insurance || 0) +
        Number(fees.insuranceFine || 0) +
        Number(fees.greenTax || 0) +
        Number(fees.fine || 0) +
        Number(fees.nationalTax || 0) +
        Number(fees.permit || 0) +
        Number(fees.brokerageCustomer || 0);

      const inHandAmount = Number(l.loan_amount || 0) - totalDeductions;

      return {
        "S.No": idx + 1,
        "Customer": `${l.first_name || ""} ${l.last_name || ""}`.trim(),
        "Reg No": l.registration_number || "PENDING",
        "Vehicle": `${l.make || ""} ${l.model || ""}`.trim(),
        "Loan Amount (₹)": Number(l.loan_amount || 0),
        "Total Deductions & Fees (₹)": totalDeductions,
        "Amount Given to Customer (After All Deductions) (₹)": inHandAmount,
        "Interest (%)": Number(l.interest_rate || 0),
        "Tenure (Mos)": Number(l.tenure_months || 0),
        "Total Paid (₹)": Number(l.total_paid || 0),
        "Status": l.status || "ACTIVE",
      };
    });
    const wsLoans = XLSX.utils.json_to_sheet(loanRows);
    autoFitColumns(wsLoans, loanRows);
    XLSX.utils.book_append_sheet(workbook, wsLoans, "Auto Finance Loans");
  }

  // 9. Daily Finance Accounts
  if (dailyCustomers.length) {
    const dailyCustRows = dailyCustomers.map((c, idx) => ({
      "S.No": idx + 1,
      "Customer": c.customer_name || "—",
      "Finance Date": c.finance_date?.slice(0, 10) || "—",
      "Amount Given (₹)": Number(c.net_disbursement || c.gross_finance_amount || 0),
      "Total Return (₹)": Number(c.agreed_total_payable || 0),
      "Collected (₹)": Number(c.total_collected || 0),
      "Remaining (₹)": Number(c.remaining || 0),
      "Profit (₹)": Number(c.initial_deduction || c.profit || 0),
      "Status": c.status || "ACTIVE",
    }));
    const wsDailyCust = XLSX.utils.json_to_sheet(dailyCustRows);
    autoFitColumns(wsDailyCust, dailyCustRows);
    XLSX.utils.book_append_sheet(workbook, wsDailyCust, "Daily Finance Accounts");
  }

  XLSX.writeFile(
    workbook,
    `MASTER_FINANCIAL_REPORT_ALL_PASSED_MONTHS_${new Date().toISOString().slice(0, 10)}.xlsx`
  );
};

/**
 * Export Monthly Stats (Irupu / Carry-Forward Report) to Excel
 */
export const exportMonthlyStats = (stats = []) => {
  if (!stats.length) return;

  const rows = stats.map((s) => ({
    "Month": s.month,
    "Opening Balance (₹)": s.openingCash,
    "Closing Balance / Irupu (₹)": s.closingCash,
    "Global IN (Partner Contributions) (₹)": s.globalIn,
    "Global OUT (Withdrawals) (₹)": s.globalOut,
    "Auto Finance: Amount Collected (₹)": s.autoIn,
    "Auto Finance: Amount Disbursed (₹)": s.autoOut,
    "Auto Finance: Outstanding Investment (₹)": s.closingAutoInv,
    "Daily Finance: Amount Collected (₹)": s.dailyIn,
    "Daily Finance: Amount Disbursed (₹)": s.dailyOut,
    "Daily Finance: Outstanding Investment (₹)": s.closingDailyInv,
    "Total IN for Month (₹)": s.totalIn,
    "Total OUT for Month (₹)": s.totalOut,
    "Net Cash Flow (₹)": s.totalIn - s.totalOut,
    "Next Month Opening Investment (₹)": s.closingCash,
  }));

  const worksheet = XLSX.utils.json_to_sheet(rows);
  autoFitColumns(worksheet, rows);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Monthly Stats");
  XLSX.writeFile(workbook, `Monthly_Stats_Irupu_Report_${new Date().toISOString().slice(0, 10)}.xlsx`);
};

/**
 * 10. Master Business Reconciliation Ledger (Executive 4-Sheet Workbook)
 * Creates 4 sheets:
 * Sheet 1: Daily Finance & Master Portfolio Reconciliation
 * Sheet 2: Auto Finance & IRUPPU Reconciliation
 * Sheet 3: Partner Capital & Equity Balances
 * Sheet 4: Selavu Matrix (Itemized categorized operational expenses)
 */
export const exportMasterBusinessLedgerReport = (reportData, customFileName) => {
  if (!reportData) return;
  const workbook = XLSX.utils.book_new();

  // 1. SHEET 1: Daily Finance & Master Reconciliation
  const distinctMonths = reportData.distinctMonths || [];
  const dfLoans = reportData.dailyFinance?.loans || [];
  const dfTotals = reportData.dailyFinance?.totals || {};
  const autoTotals = reportData.autoFinance?.totals || {};
  const recon = reportData.reconciliation || {};
  const totalInvestment = Number(reportData.partners?.totalInvestment || 0);

  const totalDfLoan = dfLoans.reduce((s, r) => s + Number(r.loanAmount || 0), 0);
  const totalDfPitibu = dfLoans.reduce((s, r) => s + Number(r.pitibu || 0), 0);
  const totalDfIncome = dfLoans.reduce((s, r) => s + Number(r.income || 0), 0);
  const totalDfBal = dfLoans.reduce((s, r) => s + Number(r.balance || 0), 0);
  const totalDfByHand = dfLoans.reduce((s, r) => s + Number(r.byHand || (Number(r.loanAmount || 0) - Number(r.pitibu || 0))), 0);

  const sheet1Data = [];
  sheet1Data.push([
    "S.No", "Date", "Customer Name", "Loan Amount (₹)", "Pitibu / Deduction (₹)", "In Hand Disbursed (₹)",
    "Collection Matakku", ...distinctMonths.map(m => `${m.label || m.key} Vasul (₹)`), "Total Vasul Collected (₹)", "Balance Due (₹)"
  ]);

  dfLoans.forEach((r, idx) => {
    const monthCols = distinctMonths.map(m => Number(r.monthlyVasul?.[m.key] || 0));
    sheet1Data.push([
      idx + 1,
      r.date || "—",
      r.customerName || "—",
      Number(r.loanAmount || 0),
      Number(r.pitibu || 0),
      Number(r.byHand || (Number(r.loanAmount || 0) - Number(r.pitibu || 0))),
      r.matakku || "Daily",
      ...monthCols,
      Number(r.income || 0),
      Number(r.balance || 0)
    ]);
  });

  const dfMonthTotals = distinctMonths.map(m => {
    return dfLoans.reduce((sum, r) => sum + Number(r.monthlyVasul?.[m.key] || 0), 0);
  });
  sheet1Data.push([
    "", "", "TOTAL",
    dfTotals.totalLoan || totalDfLoan,
    dfTotals.pitipu || totalDfPitibu,
    dfTotals.distrubut || totalDfByHand,
    "",
    ...dfMonthTotals,
    dfTotals.income || totalDfIncome,
    dfTotals.balance || totalDfBal
  ]);

  sheet1Data.push([]);
  sheet1Data.push(["DAILY FINANCE RECONCILIATION SUMMARY", "AMOUNT (₹)"]);
  sheet1Data.push(["Total Daily Loan Sanctioned", Number(dfTotals.totalLoan || totalDfLoan)]);
  sheet1Data.push(["Total Pitibu Deductions", Number(dfTotals.pitipu || totalDfPitibu)]);
  sheet1Data.push(["Total Disbursed By Hand", Number(dfTotals.distrubut || totalDfByHand)]);
  sheet1Data.push(["Total Vasul Collected (Income)", Number(dfTotals.income || totalDfIncome)]);
  sheet1Data.push(["Total Remaining Balance", Number(dfTotals.balance || totalDfBal)]);
  sheet1Data.push(["Total Portfolio Book (Balance + Income)", Number(dfTotals.balance || totalDfBal) + Number(dfTotals.income || totalDfIncome)]);
  sheet1Data.push(["Operating Expenses (Selavu)", Number(dfTotals.selavu || 0)]);
  sheet1Data.push(["Closing Daily Cash in Hand (Kaieruppu)", Number(dfTotals.kaieruppu || 0)]);

  const currentDailyInHandMaster = Number(dfTotals.kaieruppu || totalDfIncome || 0);
  const nextMonthDailyProjMaster = currentDailyInHandMaster + Math.round(totalDfIncome / (distinctMonths.length || 1));
  sheet1Data.push([]);
  sheet1Data.push(["NEXT MONTH ESTIMATE", "AMOUNT (₹)"]);
  sheet1Data.push(["Current In-Hand Cash", currentDailyInHandMaster]);
  sheet1Data.push(["Next Month Estimated Total", nextMonthDailyProjMaster]);

  sheet1Data.push([]);
  sheet1Data.push(["CASH & CAPITAL SUMMARY", "AMOUNT (₹)"]);
  sheet1Data.push(["Daily Finance Cash in Hand (Kaieruppu)", Number(recon.dlKaieruppu || dfTotals.kaieruppu || 0)]);
  sheet1Data.push(["Auto Finance Cash in Hand (IRUPPU)", Number(recon.autoKaieruppu || autoTotals.iruppu || 0)]);
  sheet1Data.push(["Total Cash in Hand", Number(recon.totalKaieruppu || 0)]);
  sheet1Data.push(["Total Partner Investment", Number(recon.investment || totalInvestment || 0)]);
  sheet1Data.push(["Total Loans Given", Number(recon.loanDistribut || (Number(dfTotals.distrubut || 0) + Number(autoTotals.distribut || 0)))]);
  sheet1Data.push(["Capital Difference", Number(recon.difference || 0)]);
  sheet1Data.push(["Cash + Difference", Number(recon.kaiEruppuPlusDifference || 0)]);

  const wsSheet1 = XLSX.utils.aoa_to_sheet(sheet1Data);
  autoFitColumns(wsSheet1);
  XLSX.utils.book_append_sheet(workbook, wsSheet1, "Daily Finance & Reconciliation");

  // 2. SHEET 2: Auto Finance
  const autoLoans = reportData.autoFinance?.loans || [];
  const totalAutoLoan = autoLoans.reduce((s, r) => s + Number(r.loanAmount || 0), 0);
  const totalAutoRepayable = autoLoans.reduce((s, r) => s + Number(r.totalAmount || 0), 0);
  const totalAutoByHand = autoLoans.reduce((s, r) => s + Number(r.byHand || 0), 0);
  const totalAutoBroker = autoLoans.reduce((s, r) => s + Number(r.broker || 0), 0);
  const totalAutoDeductions = autoLoans.reduce((s, r) => s + Number(r.totalDeductions || 0), 0);
  const totalAutoIncome = autoLoans.reduce((s, r) => s + Number(r.incomeDue || r.incomeCollected || 0), 0);
  const totalAutoFc = autoLoans.reduce((s, r) => s + Number(r.selavuFcInsur || 0), 0);

  const sheet2Data = [];
  sheet2Data.push([
    "S.No", "Date", "Customer Name", "Vehicle Details", "Principal Loan (₹)", "Interest Rate (%)", "Total Repayable (₹)",
    "In Hand Disbursed (₹)", "Broker Name", "Brokerage (₹)", "Charges Description", "Doc Charges (₹)", "HP (₹)", "TA (₹)",
    "Insurance (₹)", "Fitness Cert (₹)", "GT (₹)", "Fine (₹)", "Name Transfer (₹)", "Permit (₹)", "Total Deductions (₹)", "FC Selavu (₹)", "Collected / Vasul (₹)"
  ]);

  autoLoans.forEach((r, idx) => {
    sheet2Data.push([
      idx + 1,
      r.date || "—",
      r.customerName || "—",
      r.vehicle || "—",
      Number(r.loanAmount || 0),
      r.interestRate || "—",
      Number(r.totalAmount || 0),
      Number(r.byHand || 0),
      r.brokerName || "—",
      Number(r.broker || 0),
      r.chargesDescription || "—",
      Number(r.document || 0),
      Number(r.hp || 0),
      Number(r.ta || 0),
      Number(r.insurance || 0),
      Number(r.if || 0),
      Number(r.gt || 0),
      Number(r.fine || 0),
      Number(r.nt || 0),
      Number(r.permit || 0),
      Number(r.totalDeductions || 0),
      Number(r.selavuFcInsur || 0),
      Number(r.incomeDue || r.incomeCollected || 0)
    ]);
  });

  sheet2Data.push([
    "", "", "TOTAL", "",
    autoTotals.totalLoan || totalAutoLoan,
    "",
    autoTotals.totalLoanWithInterest || totalAutoRepayable,
    autoTotals.distribut || totalAutoByHand,
    "",
    autoTotals.broker || totalAutoBroker,
    "",
    autoTotals.document || 0,
    autoTotals.hp || 0,
    autoTotals.ta || 0,
    autoTotals.insurance || 0,
    autoTotals.if || 0,
    autoTotals.gt || 0,
    autoTotals.fine || 0,
    autoTotals.nt || 0,
    autoTotals.permit || 0,
    autoTotals.totalCharges || totalAutoDeductions,
    autoTotals.fcSelavu || totalAutoFc,
    autoTotals.loanIncome || totalAutoIncome
  ]);

  sheet2Data.push([]);
  sheet2Data.push(["AUTO FINANCE RECONCILIATION SUMMARY", "AMOUNT (₹)"]);
  sheet2Data.push(["Total Auto Loans Sanctioned", Number(autoTotals.totalLoan || totalAutoLoan)]);
  sheet2Data.push(["Total Contractual Repayable Amount", Number(autoTotals.totalLoanWithInterest || totalAutoRepayable)]);
  sheet2Data.push(["Total Auto Interest Accrued", Number(autoTotals.autoInterest || 0)]);
  sheet2Data.push(["Total Loan Income Recovered", Number(autoTotals.loanIncome || totalAutoIncome)]);
  sheet2Data.push(["Total In-Hand Disbursed", Number(autoTotals.distribut || totalAutoByHand)]);
  sheet2Data.push(["Total Upfront Deductions (Doc, TA, HP, Ins, FC)", Number(autoTotals.dTaHpInsuFc || 0)]);
  sheet2Data.push(["Total FC & Insurance Expenses", Number(autoTotals.fcSelavu || totalAutoFc)]);
  sheet2Data.push(["Total Brokerage Commissions Paid", Number(autoTotals.broker || totalAutoBroker)]);
  sheet2Data.push(["Operating Overhead (Salary, Rent, Car)", Number(autoTotals.expensesSaleryRentCar || 0)]);
  sheet2Data.push(["Closing Cash in Hand (IRUPPU)", Number(autoTotals.iruppu || 0)]);

  const activeAutoLoansMaster = autoLoans.filter(l => (l.status || "ACTIVE").toUpperCase() === "ACTIVE");
  const nextEmisMaster = activeAutoLoansMaster.reduce((sum, l) => {
    const loanAmt = Number(l.loanAmount || 0);
    const totAmt = Number(l.totalAmount || loanAmt);
    const tenure = Number(l.tenureMonths || 0);
    const emi = Number(l.monthly_installment || l.emi_amount || (tenure > 0 ? Math.round(totAmt / tenure) : (loanAmt * 0.1)));
    return sum + emi;
  }, 0);
  const currentAutoInHandMaster = Number(autoTotals.iruppu || totalAutoIncome || 0);
  const nextMonthAutoProjMaster = currentAutoInHandMaster + nextEmisMaster;
  sheet2Data.push([]);
  sheet2Data.push(["FORWARD CASH FLOW & NEXT MONTH PROJECTIONS", "AMOUNT (₹)"]);
  sheet2Data.push(["Current In-Hand Cash (Opening balance for next month)", currentAutoInHandMaster]);
  sheet2Data.push(["Next Month Expected Active EMIs", nextEmisMaster]);
  sheet2Data.push(["Next Month Projected Amount (In-Hand + Next Month EMIs)", nextMonthAutoProjMaster]);

  const wsSheet2 = XLSX.utils.aoa_to_sheet(sheet2Data);
  autoFitColumns(wsSheet2);
  XLSX.utils.book_append_sheet(workbook, wsSheet2, "Auto Finance");

  // 3. SHEET 3: Partners Capital
  const partners = reportData.partners?.list || [];
  const sumBase = partners.reduce((s, p) => s + Number(p.base_capital ?? p.initial_contribution ?? 0), 0);
  const sumCurrent = partners.reduce((s, p) => s + Number(p.capital ?? p.current_capital ?? 0), 0);
  const sumContributed = partners.reduce((s, p) => s + Number(p.contributed ?? p.total_contributed ?? 0), 0);
  const sumWithdrawn = partners.reduce((s, p) => s + Number(p.withdrawn ?? p.total_withdrawn ?? 0), 0);
  const sumProfit = partners.reduce((s, p) => s + Number(p.profit ?? p.profit_earned ?? 0), 0);

  const sheet3Data = [];
  sheet3Data.push([
    "S.No", "Partner Name", "Base Capital (₹)", "Current Capital (₹)", "Total Contributed (₹)",
    "Total Withdrawn (₹)", "Status"
  ]);

  partners.forEach((p, idx) => {
    const pCap = Number(p.capital ?? p.current_capital ?? 0);
    sheet3Data.push([
      idx + 1,
      p.name || p.partner_name || "—",
      Number(p.base_capital ?? p.initial_contribution ?? 0),
      pCap,
      Number(p.contributed ?? p.total_contributed ?? 0),
      Number(p.withdrawn ?? p.total_withdrawn ?? 0),
      p.status || "ACTIVE"
    ]);
  });

  sheet3Data.push([
    "", "TOTAL", sumBase, totalInvestment || sumCurrent, sumContributed, sumWithdrawn, `${partners.length} Partners`
  ]);

  sheet3Data.push([]);
  sheet3Data.push(["CAPITAL POSITION SUMMARY", "AMOUNT (₹)"]);
  sheet3Data.push(["Total Active Capital Pool", Number(totalInvestment || sumCurrent)]);
  sheet3Data.push(["Total Initial Base Equity", Number(sumBase)]);
  sheet3Data.push(["Total Additional Injections", Number(sumContributed)]);
  sheet3Data.push(["Total Capital Withdrawals", Number(sumWithdrawn)]);
  sheet3Data.push(["Total Profits Credited", Number(sumProfit)]);
  sheet3Data.push(["Active Equity Partners Count", partners.length]);

  const wsSheet3 = XLSX.utils.aoa_to_sheet(sheet3Data);
  autoFitColumns(wsSheet3);
  XLSX.utils.book_append_sheet(workbook, wsSheet3, "Partner Capital");

  // 4. SHEET 4: Expenses (Selavu Matrix)
  const expenses = reportData.expenses?.items || [];
  const catTotals = reportData.expenses?.categoryTotals || {};
  const sheet4Data = [];
  sheet4Data.push([
    "S.No", "Date", "Description / Payee", "Category", "Shop Opening (₹)", "Tea & Refreshments (₹)", "Pooja & God (₹)",
    "Allowances & Travel (₹)", "Rent & EB (₹)", "Salary & Wages (₹)", "Interest Paid (₹)", "Other Expenses (₹)", "Total Row Expense (₹)"
  ]);

  expenses.forEach((e, idx) => {
    const amt = Number(e.amount || 0);
    sheet4Data.push([
      idx + 1,
      e.date || (e.expense_date ? String(e.expense_date).slice(0, 10) : "—"),
      e.description || e.title || "—",
      e.categoryLabel || e.category || "General",
      e.categoryKey === "shopOpen" ? amt : "",
      e.categoryKey === "tea" ? amt : "",
      e.categoryKey === "god" ? amt : "",
      e.categoryKey === "allowances" ? amt : "",
      e.categoryKey === "rentEb" ? amt : "",
      e.categoryKey === "salary" ? amt : "",
      e.categoryKey === "interest" ? amt : "",
      (e.categoryKey === "others" || !["shopOpen", "tea", "god", "allowances", "rentEb", "salary", "interest"].includes(e.categoryKey)) ? amt : "",
      amt
    ]);
  });

  const grandSelavu = Number(catTotals.totalSelavu || expenses.reduce((s, e) => s + Number(e.amount || 0), 0));

  sheet4Data.push([
    "", "", "TOTAL SELAVU", "",
    catTotals.shopOpen || 0,
    catTotals.tea || 0,
    catTotals.god || 0,
    catTotals.allowances || 0,
    catTotals.rentEb || 0,
    catTotals.salary || 0,
    catTotals.interest || 0,
    catTotals.others || 0,
    grandSelavu
  ]);

  sheet4Data.push([]);
  sheet4Data.push(["EXPENSES CATEGORY BREAKDOWN", "AMOUNT (₹)"]);
  sheet4Data.push(["Shop Opening", Number(catTotals.shopOpen || 0)]);
  sheet4Data.push(["Tea & Refreshments", Number(catTotals.tea || 0)]);
  sheet4Data.push(["Pooja & God", Number(catTotals.god || 0)]);
  sheet4Data.push(["Allowances & Travel", Number(catTotals.allowances || 0)]);
  sheet4Data.push(["Rent & Electricity (EB)", Number(catTotals.rentEb || 0)]);
  sheet4Data.push(["Salary & Wages", Number(catTotals.salary || 0)]);
  sheet4Data.push(["Interest Paid", Number(catTotals.interest || 0)]);
  sheet4Data.push(["Other Expenses", Number(catTotals.others || 0)]);
  sheet4Data.push(["GRAND TOTAL SELAVU", grandSelavu]);

  const wsSheet4 = XLSX.utils.aoa_to_sheet(sheet4Data);
  autoFitColumns(wsSheet4);
  XLSX.utils.book_append_sheet(workbook, wsSheet4, "Selavu (Expenses Matrix)");

  const fileName = customFileName || `Business_Reconciliation_Ledger_${new Date().toISOString().slice(0, 10)}`;
  XLSX.writeFile(workbook, `${fileName}.xlsx`);
};

// ============================================================================
// 11. DEDICATED AUTO FINANCE REPORT (EXECUTIVE 4-SHEET WORKBOOK)
// ============================================================================
// HELPER: Sort Loans by Status (Active first, then Completed/Closed) then Name
// ============================================================================
export const sortLoansByStatusAndName = (loans = []) => {
  return [...loans].sort((a, b) => {
    const statusA = String(a.status || a.loan_status || a.account_status || "ACTIVE").toUpperCase();
    const statusB = String(b.status || b.loan_status || b.account_status || "ACTIVE").toUpperCase();
    const getPrio = (st) => (st === "ACTIVE" ? 1 : (st === "COMPLETED" ? 2 : 3));
    const pA = getPrio(statusA);
    const pB = getPrio(statusB);
    if (pA !== pB) return pA - pB;

    const nameA = String(
      a.customerName || a.customer_name || `${a.first_name || ""} ${a.last_name || ""}`.trim() || ""
    ).toLowerCase();
    const nameB = String(
      b.customerName || b.customer_name || `${b.first_name || ""} ${b.last_name || ""}`.trim() || ""
    ).toLowerCase();
    return nameA.localeCompare(nameB);
  });
};

const formatDate = (val) => {
  if (!val) return "—";
  try {
    const d = new Date(val);
    if (isNaN(d.getTime())) return String(val).slice(0, 10);
    return d.toISOString().slice(0, 10);
  } catch (_) {
    return String(val).slice(0, 10);
  }
};

// ============================================================================
// 11. DEDICATED AUTO FINANCE REPORT (3 ESSENTIAL SHEETS)
// Sheet 1: Portfolio (Sl, Name, Total Loan, Pitibu, By hand, Income, Vasul, Balance, Status)
// Sheet 2: Collections (Sl, Name, Date, Collection Amount, Balance, Total)
// Sheet 3: Expenses (Auto expenses only)
// ============================================================================
export const exportAutoCategoryReport = (reportData, additionalData = {}, customFileName) => {
  const autoData = reportData?.autoFinance || {};
  const autoTotals = autoData.totals || {};
  const autoLoans = autoData.loans || additionalData.loans || [];
  const autoCollections = autoData.collections || additionalData.collections || [];
  const allExpenses = reportData?.expenses?.items || additionalData.expenses || [];

  const workbook = XLSX.utils.book_new();
  const sortedLoans = sortLoansByStatusAndName(autoLoans);

  const totalLoanAmt = sortedLoans.reduce((sum, l) => sum + Number(l.loanAmount || l.loan_amount || 0), 0);
  const totalRepayable = sortedLoans.reduce((sum, l) => sum + Number(l.totalAmount || l.total_payable || l.loanAmount || l.loan_amount || 0), 0);
  const totalRecovered = sortedLoans.reduce((sum, l) => sum + Number(l.incomeCollected || l.total_collected || l.total_paid || 0), 0);
  const totalDeductions = sortedLoans.reduce((sum, l) => sum + Number(l.totalDeductions || 0), 0);
  const totalInHand = sortedLoans.reduce((sum, l) => sum + Number(l.byHand || (Number(l.loanAmount || l.loan_amount || 0) - Number(l.totalDeductions || 0))), 0);
  const totalBalDue = Math.max(0, totalRepayable - totalRecovered);
  const totalBrokerage = sortedLoans.reduce((sum, l) => sum + Number(l.broker || 0), 0);

  const activeLoans = sortedLoans.filter(l => (l.status || "ACTIVE").toUpperCase() === "ACTIVE");
  const nextMonthActiveEmis = activeLoans.reduce((sum, l) => {
    const loanAmt = Number(l.loanAmount || l.loan_amount || 0);
    const totAmt = Number(l.totalAmount || l.total_payable || loanAmt);
    const tenure = Number(l.tenureMonths || l.tenure_months || 0);
    const scheduledEmi = tenure > 0 ? Math.round(totAmt / tenure) : 0;
    const emi = Number(l.monthly_installment || l.emi_amount || scheduledEmi || 0);
    return sum + emi;
  }, 0);

  // -------------------------------------------------------------
  // SHEET 1: Vehicle Loans Portfolio (Previous Portfolio Columns, NO ID column)
  // Columns: Sl, Disbursement Date, Customer Name, Mobile Number, Vehicle Make/Model,
  // Registration Number, Loan Principal (₹), Interest Rate (%), Tenure (Months),
  // Monthly EMI (₹), Agreed Total Amount (₹), Total Deductions (₹), In-Hand Disbursed (₹),
  // Total Recovered (₹), Balance Pending (₹), Broker Name, Brokerage (₹), Loan Status
  // -------------------------------------------------------------
  const portfolioRows = sortedLoans.map((l, idx) => {
    let fees = {};
    try {
      fees = typeof l.fees_details === "string" ? JSON.parse(l.fees_details || "{}") : (l.fees_details || {});
    } catch (_) {
      fees = {};
    }

    const incomeDue = Number(l.incomeDue ?? fees.incomeDue ?? 0);
    const documentFee = Number(l.document ?? fees.documentFee ?? 0);
    const hirePurchase = Number(l.hp ?? fees.hirePurchase ?? 0);
    const taxAmount = Number(l.ta ?? fees.taxAmount ?? 0);
    const insurance = Number(l.insurance ?? fees.insurance ?? 0);
    const insuranceFine = Number(l.if ?? fees.insuranceFine ?? 0);
    const greenTax = Number(l.gt ?? fees.greenTax ?? 0);
    const fine = Number(l.fine ?? fees.fine ?? 0);
    const nameTransfer = Number(l.nt ?? fees.nationalTax ?? 0);
    const permit = Number(l.permit ?? fees.permit ?? 0);
    const brokerageCustomer = Number(l.brokerCustomer ?? fees.brokerageCustomer ?? 0);
    const brokerageHand = Number(l.brokerHand ?? fees.brokerageHand ?? 0);

    const calcDeductions =
      incomeDue +
      documentFee +
      hirePurchase +
      taxAmount +
      insurance +
      insuranceFine +
      greenTax +
      fine +
      nameTransfer +
      permit +
      brokerageCustomer;

    const dedAmt = Number(l.totalDeductions ?? calcDeductions);
    const loanAmt = Number(l.loanAmount || l.loan_amount || 0);
    const totAmt = Number(l.totalAmount || l.total_payable || loanAmt);
    const recAmt = Number(l.incomeCollected || l.total_collected || l.total_paid || 0);
    const inHand = Number(l.byHand || (loanAmt - dedAmt));
    const balDue = Math.max(0, totAmt - recAmt);
    const tenure = Number(l.tenureMonths || l.tenure_months || 0);
    const scheduledEmi = tenure > 0 ? Math.round(totAmt / tenure) : 0;
    const emi = Number(l.monthly_installment || l.emi_amount || scheduledEmi || 0);
    const custName = l.customerName || `${l.first_name || ""} ${l.last_name || ""}`.trim() || "—";
    const brokerName = l.brokerName || fees.brokerName || "—";
    const brokerAmt = Number(l.broker || brokerageCustomer || brokerageHand || 0);

    return {
      "Sl": idx + 1,
      "Disbursement Date": formatDate(l.date || l.start_date),
      "Customer Name": custName,
      "Mobile Number": l.phone || l.mobile_number || "—",
      "Vehicle Make/Model": l.vehicle || `${l.make || ""} ${l.model || ""}`.trim() || "—",
      "Registration Number": l.regNo || l.registration_number || "PENDING",
      "Loan Principal (₹)": loanAmt,
      "Interest Rate (%)": Number(l.interestRate || l.interest_rate || 0),
      "Tenure (Months)": tenure,
      "Monthly EMI (₹)": emi,
      "Agreed Total Amount (₹)": totAmt,
      "Income Due (₹)": incomeDue,
      "Document Fee (₹)": documentFee,
      "Hire Purchase (₹)": hirePurchase,
      "Tax Amount (₹)": taxAmount,
      "Insurance (₹)": insurance,
      "Fitness Cert (₹)": insuranceFine,
      "Green Tax (₹)": greenTax,
      "Fine (₹)": fine,
      "Name Transfer (₹)": nameTransfer,
      "Permit (₹)": permit,
      "Brokerage Cust (₹)": brokerageCustomer,
      "Brokerage Hand (₹)": brokerageHand,
      "Total Deductions (₹)": dedAmt,
      "In-Hand Disbursed (₹)": inHand,
      "Total Recovered (₹)": recAmt,
      "Balance Pending (₹)": balDue,
      "Broker Name": brokerName,
      "Brokerage (₹)": brokerAmt,
      "Loan Status": l.status || "ACTIVE",
    };
  });

  const sheet1Data = [];
  sheet1Data.push([
    "Sl", "Disbursement Date", "Customer Name", "Mobile Number", "Vehicle Make/Model",
    "Registration Number", "Loan Principal (₹)", "Interest Rate (%)", "Tenure (Months)",
    "Monthly EMI (₹)", "Agreed Total Amount (₹)",
    "Income Due (₹)", "Document Fee (₹)", "Hire Purchase (₹)", "Tax Amount (₹)", "Insurance (₹)",
    "Fitness Cert (₹)", "Green Tax (₹)", "Fine (₹)", "Name Transfer (₹)", "Permit (₹)",
    "Brokerage Cust (₹)", "Brokerage Hand (₹)", "Total Deductions (₹)", "In-Hand Disbursed (₹)",
    "Total Recovered (₹)", "Balance Pending (₹)", "Broker Name", "Brokerage (₹)", "Loan Status"
  ]);

  portfolioRows.forEach((r) => {
    sheet1Data.push([
      r["Sl"], r["Disbursement Date"], r["Customer Name"], r["Mobile Number"], r["Vehicle Make/Model"],
      r["Registration Number"], r["Loan Principal (₹)"], r["Interest Rate (%)"], r["Tenure (Months)"],
      r["Monthly EMI (₹)"], r["Agreed Total Amount (₹)"],
      r["Income Due (₹)"], r["Document Fee (₹)"], r["Hire Purchase (₹)"], r["Tax Amount (₹)"], r["Insurance (₹)"],
      r["Fitness Cert (₹)"], r["Green Tax (₹)"], r["Fine (₹)"], r["Name Transfer (₹)"], r["Permit (₹)"],
      r["Brokerage Cust (₹)"], r["Brokerage Hand (₹)"], r["Total Deductions (₹)"], r["In-Hand Disbursed (₹)"],
      r["Total Recovered (₹)"], r["Balance Pending (₹)"], r["Broker Name"], r["Brokerage (₹)"], r["Loan Status"]
    ]);
  });

  if (portfolioRows.length > 0) {
    const sumIncomeDue = portfolioRows.reduce((s, r) => s + r["Income Due (₹)"], 0);
    const sumDoc = portfolioRows.reduce((s, r) => s + r["Document Fee (₹)"], 0);
    const sumHp = portfolioRows.reduce((s, r) => s + r["Hire Purchase (₹)"], 0);
    const sumTax = portfolioRows.reduce((s, r) => s + r["Tax Amount (₹)"], 0);
    const sumInsur = portfolioRows.reduce((s, r) => s + r["Insurance (₹)"], 0);
    const sumInsurFine = portfolioRows.reduce((s, r) => s + r["Fitness Cert (₹)"], 0);
    const sumGt = portfolioRows.reduce((s, r) => s + r["Green Tax (₹)"], 0);
    const sumFine = portfolioRows.reduce((s, r) => s + r["Fine (₹)"], 0);
    const sumNt = portfolioRows.reduce((s, r) => s + r["Name Transfer (₹)"], 0);
    const sumPermit = portfolioRows.reduce((s, r) => s + r["Permit (₹)"], 0);
    const sumBrokerCust = portfolioRows.reduce((s, r) => s + r["Brokerage Cust (₹)"], 0);
    const sumBrokerHand = portfolioRows.reduce((s, r) => s + r["Brokerage Hand (₹)"], 0);

    sheet1Data.push([
      "TOTAL", "", `${sortedLoans.length} Loans`, "", "",
      "", totalLoanAmt, "", "",
      nextMonthActiveEmis, totalRepayable,
      sumIncomeDue, sumDoc, sumHp, sumTax, sumInsur,
      sumInsurFine, sumGt, sumFine, sumNt, sumPermit,
      sumBrokerCust, sumBrokerHand, totalDeductions, totalInHand,
      totalRecovered, totalBalDue, "", totalBrokerage, ""
    ]);
  }

  // -------------------------------------------------------------
  // AUTO FINANCE RECONCILIATION SUMMARY (From Image 1)
  // -------------------------------------------------------------
  const fcSelavu = Number(autoTotals.fcSelavu || 0);
  const brokerSelavu = Number(autoTotals.broker || totalBrokerage || 0);
  const overheadSelavu = Number(autoTotals.expensesSaleryRentCar || 0);
  const totalAutoSelavu = Number(autoTotals.totalSelavu || (fcSelavu + brokerSelavu + overheadSelavu));
  const autoIruppu = Number(autoTotals.iruppu ?? (totalRecovered - totalAutoSelavu));

  sheet1Data.push([]);
  sheet1Data.push(["AUTO SUMMARY", "AMOUNT (₹)"]);
  sheet1Data.push(["Total Loan Principal", totalLoanAmt]);
  sheet1Data.push(["Total Loan + Interest", totalRepayable]);
  sheet1Data.push(["Auto Interest", Math.max(0, totalRepayable - totalLoanAmt)]);
  sheet1Data.push(["Loan Income (Recovered)", totalRecovered]);
  sheet1Data.push(["Total Deductions", totalDeductions]);
  sheet1Data.push(["Net Disbursed In-Hand", totalInHand]);
  sheet1Data.push(["FC Selavu", fcSelavu]);
  sheet1Data.push(["Brokerage Paid", brokerSelavu]);
  sheet1Data.push(["Overhead Expenses", overheadSelavu]);
  sheet1Data.push(["Total Auto Selavu", totalAutoSelavu]);
  sheet1Data.push(["Cash in Hand (Iruppu)", autoIruppu]);

  // -------------------------------------------------------------
  // FORWARD CASH FLOW & NEXT MONTH PROJECTIONS
  // -------------------------------------------------------------
  const currentInHandCash = autoIruppu;
  const nextMonthProjectedAmount = currentInHandCash + nextMonthActiveEmis;

  sheet1Data.push([]);
  sheet1Data.push(["NEXT MONTH ESTIMATE", "AMOUNT (₹)"]);
  sheet1Data.push(["Current In-Hand Cash", currentInHandCash]);
  sheet1Data.push(["Next Month EMI Collections", nextMonthActiveEmis]);
  sheet1Data.push(["Next Month Estimated Total", nextMonthProjectedAmount]);

  const ws1 = XLSX.utils.aoa_to_sheet(sheet1Data);
  autoFitColumns(ws1);
  XLSX.utils.book_append_sheet(workbook, ws1, "Vehicle Loans");

  // -------------------------------------------------------------
  // SHEET 2: Collections Sheet
  // Columns: Sl, Name, Date, Collection Amount, Balance, Total
  // ONLY show collected details! (No dummy rows, no 0 collection rows)
  // Name shown ONLY on first collection row per customer, then empty
  // -------------------------------------------------------------
  const collectionRows = [];
  let collSl = 1;
  let grandCollAmt = 0;

  sortedLoans.forEach((l) => {
    const custName = l.customerName || `${l.first_name || ""} ${l.last_name || ""}`.trim() || "—";
    const loanId = l.id || l.loan_id;
    const loanTotal = Number(l.totalAmount || l.total_payable || l.loanAmount || l.loan_amount || 0);

    // Find actual collections for this loan
    const custPayments = (autoCollections || []).filter(p => {
      const amt = Number(p.amount || p.amount_paid || 0);
      if (amt <= 0) return false;
      if (loanId && p.loan_id === loanId) return true;
      if (p.customer_name && custName && p.customer_name.trim().toLowerCase() === custName.trim().toLowerCase()) return true;
      return false;
    }).sort((a, b) => new Date(a.payment_date || 0) - new Date(b.payment_date || 0));

    if (custPayments.length > 0) {
      let runBal = loanTotal;
      custPayments.forEach((p, pIdx) => {
        const amt = Number(p.amount || p.amount_paid || 0);
        runBal = Math.max(0, runBal - amt);
        grandCollAmt += amt;

        collectionRows.push({
          "Sl": pIdx === 0 ? collSl++ : "",
          "Name": pIdx === 0 ? custName : "", // Name only on first collection row
          "Date": formatDate(p.payment_date),
          "Collection Amount": amt,
          "Balance": runBal,
          "Total": loanTotal,
        });
      });
    }
  });

  if (collectionRows.length > 0) {
    collectionRows.push({
      "Sl": "TOTAL",
      "Name": "",
      "Date": "",
      "Collection Amount": grandCollAmt,
      "Balance": "",
      "Total": "",
    });
  }

  const ws2 = XLSX.utils.json_to_sheet(collectionRows.length ? collectionRows : [{ Message: "No collections on record." }]);
  autoFitColumns(ws2, collectionRows);
  XLSX.utils.book_append_sheet(workbook, ws2, "Collections");

  // -------------------------------------------------------------
  // SHEET 3: Auto Expenses ONLY
  // Columns: Sl, Date, Description, Category, Amount
  // -------------------------------------------------------------
  const autoExpenses = allExpenses.filter(e => {
    const cat = (e.category || e.categoryLabel || "").toUpperCase();
    const desc = (e.description || e.title || "").toLowerCase();
    return cat === "AUTO" || cat.includes("AUTO") || cat.includes("CAR") || cat.includes("RTO") || cat.includes("FC") ||
      desc.includes("auto") || desc.includes("car") || desc.includes("rto") || desc.includes("fc") || desc.includes("broker");
  });

  let totAutoExp = 0;
  const expRows = autoExpenses.map((e, idx) => {
    const amt = Number(e.amount || 0);
    totAutoExp += amt;
    return {
      "Sl": idx + 1,
      "Date": formatDate(e.date || e.expense_date),
      "Description": e.description || e.title || "—",
      "Category": e.categoryLabel || e.category || "AUTO",
      "Amount": amt,
    };
  });

  if (expRows.length > 0) {
    expRows.push({
      "Sl": "TOTAL",
      "Date": "",
      "Description": "TOTAL AUTO EXPENSES",
      "Category": "",
      "Amount": totAutoExp,
    });
  }

  const ws3 = XLSX.utils.json_to_sheet(expRows.length ? expRows : [{ Message: "No auto expenses on record." }]);
  autoFitColumns(ws3, expRows);
  XLSX.utils.book_append_sheet(workbook, ws3, "Expenses");

  const fileName = customFileName || `Auto_Finance_Report_${new Date().toISOString().slice(0, 10)}`;
  XLSX.writeFile(workbook, `${fileName}.xlsx`);
};

// ============================================================================
// 11B. AUTO FINANCE MONTHLY COLLECTION REPORT
// ============================================================================
export const exportAutoMonthlyCollectionReport = (reportData, additionalData = {}, selectedMonth, customFileName) => {
  const autoData = reportData?.autoFinance || {};
  const autoLoans = autoData.loans || additionalData.loans || [];
  const autoCollections = autoData.collections || additionalData.collections || [];

  const targetMonth = selectedMonth || new Date().toISOString().slice(0, 7);
  const workbook = XLSX.utils.book_new();
  const sortedLoans = sortLoansByStatusAndName(autoLoans);

  const collectionRows = [];
  let collSl = 1;
  let grandCollAmt = 0;

  sortedLoans.forEach((l) => {
    const custName = l.customerName || `${l.first_name || ""} ${l.last_name || ""}`.trim() || "—";
    const loanId = l.id || l.loan_id;
    const loanTotal = Number(l.totalAmount || l.total_payable || l.loanAmount || l.loan_amount || 0);

    // Filter payments to selected targetMonth with amount > 0
    const custPayments = (autoCollections || []).filter(p => {
      const amt = Number(p.amount || p.amount_paid || 0);
      if (amt <= 0) return false;
      const pDate = p.payment_date ? String(p.payment_date).slice(0, 7) : "";
      if (pDate !== targetMonth) return false;
      if (loanId && p.loan_id === loanId) return true;
      if (p.customer_name && custName && p.customer_name.trim().toLowerCase() === custName.trim().toLowerCase()) return true;
      return false;
    }).sort((a, b) => new Date(a.payment_date || 0) - new Date(b.payment_date || 0));

    if (custPayments.length > 0) {
      let runBal = loanTotal;
      custPayments.forEach((p, pIdx) => {
        const amt = Number(p.amount || p.amount_paid || 0);
        runBal = Math.max(0, runBal - amt);
        grandCollAmt += amt;

        collectionRows.push({
          "Sl": pIdx === 0 ? collSl++ : "",
          "Name": pIdx === 0 ? custName : "", // Name only on first collection row
          "Date": formatDate(p.payment_date),
          "Collection Amount": amt,
          "Balance": runBal,
          "Total": loanTotal,
        });
      });
    }
  });

  if (collectionRows.length > 0) {
    collectionRows.push({
      "Sl": "TOTAL",
      "Name": "",
      "Date": "",
      "Collection Amount": grandCollAmt,
      "Balance": "",
      "Total": "",
    });
  }

  const ws = XLSX.utils.json_to_sheet(collectionRows.length ? collectionRows : [{ Message: `No collections recorded for month ${targetMonth}.` }]);
  autoFitColumns(ws, collectionRows);
  XLSX.utils.book_append_sheet(workbook, ws, `Collections (${targetMonth})`);

  const fileName = customFileName || `Auto_Finance_Collections_${targetMonth.replace("-", "_")}`;
  XLSX.writeFile(workbook, `${fileName}.xlsx`);
};

// ============================================================================
// 12. DEDICATED DAILY FINANCE REPORT (3 ESSENTIAL SHEETS)
// Sheet 1: Portfolio (Sl, Name, Total Loan, Pitibu, By hand, Income, Vasul, Balance, Status)
// Sheet 2: Collections (Sl, Name, Date, Collection Amount, Balance, Total)
// Sheet 3: Expenses (Daily expenses only)
// ============================================================================
export const exportDailyCategoryReport = (reportData, additionalData = {}, customFileName) => {
  const dfData = reportData?.dailyFinance || {};
  const dfLoans = dfData.loans || additionalData.customers || [];
  const dfCollections = dfData.collections || additionalData.collections || [];
  const allExpenses = reportData?.expenses?.items || additionalData.expenses || [];

  const workbook = XLSX.utils.book_new();
  const sortedLoans = sortLoansByStatusAndName(dfLoans);

  // -------------------------------------------------------------
  // SHEET 1: Portfolio Table (Replacing Ledger, removing 2nd portfolio)
  // Columns: Sl, Name, Total Loan, Pitibu, By hand, Income, Vasul, Balance, Status
  // -------------------------------------------------------------
  let totLoanSum = 0;
  let totPitibuSum = 0;
  let totByHandSum = 0;
  let totIncomeSum = 0;
  let totVasulSum = 0;
  let totBalanceSum = 0;

  const portfolioRows = sortedLoans.map((l, idx) => {
    const custName = l.customerName || l.customer_name || "—";
    const gross = Number(l.loanAmount || l.gross_finance_amount || 0);
    const pitibu = Number(l.pitibu || l.initial_deduction || 0);
    const byHand = Number(l.byHand || l.net_disbursement || (gross - pitibu));
    const income = Number(l.agreed_total_payable || gross);
    const vasul = Number(l.total_collected ?? l.vasul ?? (l.income !== undefined && l.income !== income ? l.income : 0) ?? 0);
    const balance = Number(l.balance ?? l.remaining ?? Math.max(0, income - vasul));
    const status = l.status || "ACTIVE";

    totLoanSum += gross;
    totPitibuSum += pitibu;
    totByHandSum += byHand;
    totIncomeSum += income;
    totVasulSum += vasul;
    totBalanceSum += balance;

    return {
      "Sl": idx + 1,
      "Name": custName,
      "Total Loan": gross,
      "Pitibu": pitibu,
      "By hand": byHand,
      "Income": income,
      "Vasul": vasul,
      "Balance": balance,
      "Status": status,
    };
  });

  const sheet1Data = [];
  sheet1Data.push(["Sl", "Name", "Total Loan", "Pitibu", "By hand", "Income", "Vasul", "Balance", "Status"]);

  portfolioRows.forEach((r) => {
    sheet1Data.push([
      r["Sl"], r["Name"], r["Total Loan"], r["Pitibu"], r["By hand"], r["Income"], r["Vasul"], r["Balance"], r["Status"]
    ]);
  });

  if (portfolioRows.length > 0) {
    sheet1Data.push([
      "TOTAL", `${sortedLoans.length} Customers`, totLoanSum, totPitibuSum, totByHandSum, totIncomeSum, totVasulSum, totBalanceSum, ""
    ]);
  }

  // Pre-calculate daily expenses for reconciliation summary
  const dailyExpensesPre = allExpenses.filter(e => {
    const cat = (e.category || e.categoryLabel || "").toUpperCase();
    const desc = (e.description || e.title || "").toLowerCase();
    return cat === "DAILY" || cat.includes("DAILY") || desc.includes("daily") || desc.includes("tea") || desc.includes("vasul") || desc.includes("petrol") || desc.includes("collection");
  });
  const totDailyExpPre = dailyExpensesPre.reduce((s, e) => s + Number(e.amount || 0), 0);
  const dfSelavu = Number(dfData.totals?.selavu || totDailyExpPre);
  const dfKaieruppu = Number(dfData.totals?.kaieruppu ?? (totVasulSum - dfSelavu));

  // -------------------------------------------------------------
  // DAILY FINANCE SUMMARY
  // -------------------------------------------------------------
  sheet1Data.push([]);
  sheet1Data.push(["DAILY SUMMARY", "AMOUNT (₹)"]);
  sheet1Data.push(["Total Loan", totLoanSum]);
  sheet1Data.push(["Pitibu", totPitibuSum]);
  sheet1Data.push(["Income (Vasul)", totVasulSum]);
  sheet1Data.push(["Balance", totBalanceSum]);
  sheet1Data.push(["Distribut (By Hand)", totByHandSum]);
  sheet1Data.push(["Balance + Income", totBalanceSum + totVasulSum]);
  sheet1Data.push(["Selavu (Expenses)", dfSelavu]);
  sheet1Data.push(["Cash in Hand (Kaieruppu)", dfKaieruppu]);

  // -------------------------------------------------------------
  // FORWARD CASH FLOW & NEXT MONTH PROJECTIONS
  // -------------------------------------------------------------
  const activeDailyLoans = sortedLoans.filter(l => (l.status || "ACTIVE").toUpperCase() === "ACTIVE");
  const currentDailyInHand = dfKaieruppu;
  const nextMonthDailyProj = currentDailyInHand + Math.round(totVasulSum);

  sheet1Data.push([]);
  sheet1Data.push(["NEXT MONTH ESTIMATE", "AMOUNT (₹)"]);
  sheet1Data.push(["Current In-Hand Cash", currentDailyInHand]);
  sheet1Data.push(["Next Month Collections", Math.round(totVasulSum)]);
  sheet1Data.push(["Next Month Estimated Total", nextMonthDailyProj]);

  const ws1 = XLSX.utils.aoa_to_sheet(sheet1Data);
  autoFitColumns(ws1);
  XLSX.utils.book_append_sheet(workbook, ws1, "Daily Loans");

  // -------------------------------------------------------------
  // SHEET 2: Collections Sheet
  // Columns: Sl, Name, Date, Collection Amount, Balance, Total
  // Name shown ONLY on first collection row per customer, then empty
  // -------------------------------------------------------------
  const collectionRows = [];
  let collSl = 1;
  let grandCollAmt = 0;

  sortedLoans.forEach((l) => {
    const custName = l.customerName || l.customer_name || "—";
    const fId = l.financeId || l.finance_id;
    const loanTotal = Number(l.agreed_total_payable || l.loanAmount || l.gross_finance_amount || 0);

    // Find actual collection payments for this customer / finance account
    const custPayments = (dfCollections || []).filter(p => {
      const amt = Number(p.amount || 0);
      if (amt <= 0) return false;
      if (fId && p.finance_id === fId) return true;
      if (p.customer_name && custName && p.customer_name.trim().toLowerCase() === custName.trim().toLowerCase()) return true;
      return false;
    }).sort((a, b) => new Date(a.collection_date || 0) - new Date(b.collection_date || 0));

    if (custPayments.length > 0) {
      let runBal = loanTotal;
      custPayments.forEach((p, pIdx) => {
        const amt = Number(p.amount || 0);
        runBal = Math.max(0, runBal - amt);
        grandCollAmt += amt;

        collectionRows.push({
          "Sl": pIdx === 0 ? collSl++ : "",
          "Name": pIdx === 0 ? custName : "", // Name only on first collection row
          "Date": formatDate(p.collection_date),
          "Collection Amount": amt,
          "Balance": runBal,
          "Total": loanTotal,
        });
      });
    }
  });

  if (collectionRows.length > 0) {
    collectionRows.push({
      "Sl": "TOTAL",
      "Name": "",
      "Date": "",
      "Collection Amount": grandCollAmt,
      "Balance": "",
      "Total": "",
    });
  }

  const ws2 = XLSX.utils.json_to_sheet(collectionRows.length ? collectionRows : [{ Message: "No collections on record." }]);
  autoFitColumns(ws2, collectionRows);
  XLSX.utils.book_append_sheet(workbook, ws2, "Collections");

  // -------------------------------------------------------------
  // SHEET 3: Daily Expenses ONLY
  // Columns: Sl, Date, Description, Category, Amount
  // -------------------------------------------------------------
  const dailyExpenses = allExpenses.filter(e => {
    const cat = (e.category || e.categoryLabel || "").toUpperCase();
    const desc = (e.description || e.title || "").toLowerCase();
    return cat === "DAILY" || cat.includes("DAILY") || desc.includes("daily") || desc.includes("tea") || desc.includes("vasul") || desc.includes("petrol") || desc.includes("collection");
  });

  let totDailyExp = 0;
  const expRows = dailyExpenses.map((e, idx) => {
    const amt = Number(e.amount || 0);
    totDailyExp += amt;
    return {
      "Sl": idx + 1,
      "Date": formatDate(e.date || e.expense_date),
      "Description": e.description || e.title || "—",
      "Category": e.categoryLabel || e.category || "DAILY",
      "Amount": amt,
    };
  });

  if (expRows.length > 0) {
    expRows.push({
      "Sl": "TOTAL",
      "Date": "",
      "Description": "TOTAL DAILY EXPENSES",
      "Category": "",
      "Amount": totDailyExp,
    });
  }

  const ws3 = XLSX.utils.json_to_sheet(expRows.length ? expRows : [{ Message: "No daily expenses on record." }]);
  autoFitColumns(ws3, expRows);
  XLSX.utils.book_append_sheet(workbook, ws3, "Expenses");

  const fileName = customFileName || `Daily_Finance_Report_${new Date().toISOString().slice(0, 10)}`;
  XLSX.writeFile(workbook, `${fileName}.xlsx`);
};

// ============================================================================
// 12B. DAILY FINANCE MONTHLY COLLECTION REPORT
// ============================================================================
export const exportDailyMonthlyCollectionReport = (reportData, additionalData = {}, selectedMonth, customFileName) => {
  const dfData = reportData?.dailyFinance || {};
  const dfLoans = dfData.loans || additionalData.customers || [];
  const dfCollections = dfData.collections || additionalData.collections || [];

  const targetMonth = selectedMonth || new Date().toISOString().slice(0, 7);
  const workbook = XLSX.utils.book_new();
  const sortedLoans = sortLoansByStatusAndName(dfLoans);

  const collectionRows = [];
  let collSl = 1;
  let grandCollAmt = 0;

  sortedLoans.forEach((l) => {
    const custName = l.customerName || l.customer_name || "—";
    const fId = l.financeId || l.finance_id;
    const loanTotal = Number(l.agreed_total_payable || l.loanAmount || l.gross_finance_amount || 0);

    // Filter actual collections with amount > 0 to selected targetMonth
    const custPayments = (dfCollections || []).filter(p => {
      const amt = Number(p.amount || 0);
      if (amt <= 0) return false;
      const pDate = p.collection_date ? String(p.collection_date).slice(0, 7) : "";
      if (pDate !== targetMonth) return false;
      if (fId && p.finance_id === fId) return true;
      if (p.customer_name && custName && p.customer_name.trim().toLowerCase() === custName.trim().toLowerCase()) return true;
      return false;
    }).sort((a, b) => new Date(a.collection_date || 0) - new Date(b.collection_date || 0));

    if (custPayments.length > 0) {
      let runBal = loanTotal;
      custPayments.forEach((p, pIdx) => {
        const amt = Number(p.amount || 0);
        runBal = Math.max(0, runBal - amt);
        grandCollAmt += amt;

        collectionRows.push({
          "Sl": pIdx === 0 ? collSl++ : "",
          "Name": pIdx === 0 ? custName : "", // Name only on first collection row
          "Date": formatDate(p.collection_date),
          "Collection Amount": amt,
          "Balance": runBal,
          "Total": loanTotal,
        });
      });
    }
  });

  if (collectionRows.length > 0) {
    collectionRows.push({
      "Sl": "TOTAL",
      "Name": "",
      "Date": "",
      "Collection Amount": grandCollAmt,
      "Balance": "",
      "Total": "",
    });
  }

  const ws = XLSX.utils.json_to_sheet(collectionRows.length ? collectionRows : [{ Message: `No collections recorded for month ${targetMonth}.` }]);
  autoFitColumns(ws, collectionRows);
  XLSX.utils.book_append_sheet(workbook, ws, `Collections (${targetMonth})`);

  const fileName = customFileName || `Daily_Finance_Collections_${targetMonth.replace("-", "_")}`;
  XLSX.writeFile(workbook, `${fileName}.xlsx`);
};

// ============================================================================
// 13. DEDICATED GLOBAL CAPITAL REPORT (3 ESSENTIAL SHEETS)
// Sheet 1: Partner Name and Share
// Sheet 2: All Expenses
// Sheet 3: Partner Transactions
// (NO ID column in any sheet!)
// ============================================================================
export const exportGlobalCategoryReport = (reportData, additionalData = {}, customFileName) => {
  const partners = reportData?.partners?.list || additionalData.partners || [];
  const totalInvestment = Number(reportData?.partners?.totalInvestment || additionalData.totalInvestment || partners.reduce((s, p) => s + Number(p.capital || p.current_capital || 0), 0));
  const allExpenses = reportData?.expenses?.items || additionalData.expenses || [];
  const catTotals = reportData?.expenses?.categoryTotals || {};
  const transactions = additionalData.transactions || [];
  const ledger = additionalData.ledger || [];

  const workbook = XLSX.utils.book_new();

  // -------------------------------------------------------------
  // SHEET 1: Partner Capital (No share detection, only Name and Capital)
  // Columns: Sl, Name, Capital
  // (NO ID column!)
  // -------------------------------------------------------------
  const sumCurrent = partners.reduce((s, p) => s + Number(p.capital ?? p.current_capital ?? 0), 0);

  const sheet1Data = [];
  sheet1Data.push(["Sl", "Name", "Capital"]);

  partners.forEach((p, idx) => {
    const pCap = Number(p.capital ?? p.current_capital ?? 0);
    sheet1Data.push([
      idx + 1,
      p.name || p.partner_name || "—",
      pCap
    ]);
  });

  sheet1Data.push([
    "TOTAL",
    `${partners.length} Partners`,
    totalInvestment || sumCurrent
  ]);

  // -------------------------------------------------------------
  // MASTER CASH & CAPITAL RECONCILIATION (From Image 1)
  // -------------------------------------------------------------
  const recon = reportData?.reconciliation || {};
  const dlKaieruppu = Number(recon.dlKaieruppu || reportData?.dailyFinance?.totals?.kaieruppu || 0);
  const autoKaieruppu = Number(recon.autoKaieruppu || reportData?.autoFinance?.totals?.iruppu || 0);
  const totalKaieruppu = Number(recon.totalKaieruppu || (dlKaieruppu + autoKaieruppu));

  const dlDist = Number(recon.dlDistrubut || reportData?.dailyFinance?.totals?.distrubut || 0);
  const autoDist = Number(recon.autoDist || reportData?.autoFinance?.totals?.distribut || 0);
  const totalDist = Number(recon.totalDist || (dlDist + autoDist));

  const investment = Number(recon.investment || totalInvestment || sumCurrent || 0);
  const loanDist = Number(recon.loanDistribut || totalDist);
  const diff = Number(recon.difference || (investment - loanDist));
  const netVariance = Number(recon.kaiEruppuPlusDifference || (totalKaieruppu + diff));

  sheet1Data.push([]);
  sheet1Data.push(["MASTER CASH & CAPITAL RECONCILIATION", "AMOUNT (₹)"]);
  sheet1Data.push(["Daily Finance Kaieruppu", dlKaieruppu]);
  sheet1Data.push(["Auto Finance IRUPPU", autoKaieruppu]);
  sheet1Data.push(["Total Combined Kaieruppu", totalKaieruppu]);
  sheet1Data.push(["Daily Loan Distribut", dlDist]);
  sheet1Data.push(["Auto Loan Distribut", autoDist]);
  sheet1Data.push(["Total Combined Loans Distributed", totalDist]);
  sheet1Data.push(["Total Partner Investment", investment]);
  sheet1Data.push(["Capital Difference / Gap", diff]);
  sheet1Data.push(["Kaieruppu + Difference", netVariance]);

  const ws1 = XLSX.utils.aoa_to_sheet(sheet1Data);
  autoFitColumns(ws1);
  XLSX.utils.book_append_sheet(workbook, ws1, "Partners");

  // -------------------------------------------------------------
  // SHEET 2: All Expenses
  // Columns: Sl, Date, Description / Payee, Category, Amount (₹)
  // (NO ID column!)
  // -------------------------------------------------------------
  const sheet2Data = [];
  sheet2Data.push([
    "Sl", "Date", "Description / Payee", "Category", "Shop Opening (₹)", "Tea & Refreshments (₹)", "Pooja & God (₹)",
    "Allowances & Travel (₹)", "Rent & EB (₹)", "Salary & Wages (₹)", "Interest Paid (₹)", "Other Expenses (₹)", "Total Expense (₹)"
  ]);

  allExpenses.forEach((e, idx) => {
    const amt = Number(e.amount || 0);
    sheet2Data.push([
      idx + 1,
      e.date || (e.expense_date ? String(e.expense_date).slice(0, 10) : "—"),
      e.description || e.title || "—",
      e.categoryLabel || e.category || "General",
      e.categoryKey === "shopOpen" ? amt : "",
      e.categoryKey === "tea" ? amt : "",
      e.categoryKey === "god" ? amt : "",
      e.categoryKey === "allowances" ? amt : "",
      e.categoryKey === "rentEb" ? amt : "",
      e.categoryKey === "salary" ? amt : "",
      e.categoryKey === "interest" ? amt : "",
      (e.categoryKey === "others" || !["shopOpen", "tea", "god", "allowances", "rentEb", "salary", "interest"].includes(e.categoryKey)) ? amt : "",
      amt
    ]);
  });

  const grandSelavu = Number(catTotals.totalSelavu || allExpenses.reduce((s, e) => s + Number(e.amount || 0), 0));

  sheet2Data.push([
    "TOTAL", "", "", "",
    catTotals.shopOpen || 0,
    catTotals.tea || 0,
    catTotals.god || 0,
    catTotals.allowances || 0,
    catTotals.rentEb || 0,
    catTotals.salary || 0,
    catTotals.interest || 0,
    catTotals.others || 0,
    grandSelavu
  ]);

  const ws2 = XLSX.utils.aoa_to_sheet(sheet2Data);
  autoFitColumns(ws2);
  XLSX.utils.book_append_sheet(workbook, ws2, "All Expenses");

  // -------------------------------------------------------------
  // SHEET 3: Partner Transactions
  // Columns: Sl, Date, Partner / Account, Transaction Type, Description / Narration, Amount (₹), Payment Mode, Reference / UTR
  // (NO ID column / Entry # removed!)
  // -------------------------------------------------------------
  // Filter transactions to only partner contributions and withdrawals (no share)
  const txSource = (transactions.length ? transactions : ledger).filter(t => {
    const type = (t.transaction_type || t.type || "").toUpperCase();
    if (type.includes("PROFIT") || type.includes("SHARE")) return false;
    return true;
  });
  let totTxAmt = 0;

  const txRows = txSource.map((t, idx) => {
    const amt = Number(t.amount || 0);
    totTxAmt += amt;
    return {
      "Sl": idx + 1,
      "Date": (t.effective_date || t.transaction_date || t.created_at) ? String(t.effective_date || t.transaction_date || t.created_at).slice(0, 10) : "—",
      "Partner / Account": t.partner_name || t.name || t.source || "Company",
      "Transaction Type": t.transaction_type || t.type || "CONTRIBUTION",
      "Description / Narration": t.notes || t.description || t.reference_type || "—",
      "Amount (₹)": amt,
      "Payment Mode": t.payment_mode || "BANK_TRANSFER",
      "Reference / UTR": t.reference_number || t.reference_id || "—",
    };
  });

  if (txRows.length > 0) {
    txRows.push({
      "Sl": "TOTAL",
      "Date": "",
      "Partner / Account": `${txRows.length} Entries`,
      "Transaction Type": "",
      "Description / Narration": "",
      "Amount (₹)": totTxAmt,
      "Payment Mode": "",
      "Reference / UTR": "",
    });
  }

  const ws3 = XLSX.utils.json_to_sheet(txRows.length ? txRows : [{ Message: "No transactions recorded." }]);
  autoFitColumns(ws3, txRows);
  XLSX.utils.book_append_sheet(workbook, ws3, "Partner Transactions");

  const fileName = customFileName || `Global_Capital_Report_${new Date().toISOString().slice(0, 10)}`;
  XLSX.writeFile(workbook, `${fileName}.xlsx`);
};


