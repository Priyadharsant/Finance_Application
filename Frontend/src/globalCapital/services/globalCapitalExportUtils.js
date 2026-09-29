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
    { Metric: "Report Scope", Value: "Complete Multi-Module Audit (All Passed Months & Active Portfolios)" },
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
  sheet1Data.push(["FORWARD CASH FLOW & NEXT MONTH PROJECTIONS", "AMOUNT (₹)"]);
  sheet1Data.push(["Current In-Hand Cash (Opening balance for next month)", currentDailyInHandMaster]);
  sheet1Data.push(["Next Month Projected Amount (In-Hand + Next Month Vasul)", nextMonthDailyProjMaster]);

  sheet1Data.push([]);
  sheet1Data.push(["MASTER PORTFOLIO RECONCILIATION", "AMOUNT (₹)"]);
  sheet1Data.push(["Daily Finance Cash in Hand (Kaieruppu)", Number(recon.dlKaieruppu || dfTotals.kaieruppu || 0)]);
  sheet1Data.push(["Auto Finance Cash in Hand (IRUPPU)", Number(recon.autoKaieruppu || autoTotals.iruppu || 0)]);
  sheet1Data.push(["Total Combined Physical Cash", Number(recon.totalKaieruppu || 0)]);
  sheet1Data.push(["Total Active Partner Investment", Number(recon.investment || totalInvestment || 0)]);
  sheet1Data.push(["Total Capital Disbursed Across Loans", Number(recon.loanDistribut || (Number(dfTotals.distrubut || 0) + Number(autoTotals.distribut || 0)))]);
  sheet1Data.push(["Capital Deployment Variance / Difference", Number(recon.difference || 0)]);
  sheet1Data.push(["Liquid Cash + Capital Variance", Number(recon.kaiEruppuPlusDifference || 0)]);

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
    "Insurance (₹)", "IF (₹)", "GT (₹)", "Fine (₹)", "NT (₹)", "Permit (₹)", "Total Deductions (₹)", "FC Selavu (₹)", "Collected / Vasul (₹)"
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
    "Total Withdrawn (₹)", "Profit Credited (₹)", "Equity Share (%)", "Status"
  ]);

  partners.forEach((p, idx) => {
    const pCap = Number(p.capital ?? p.current_capital ?? 0);
    const pool = totalInvestment > 0 ? totalInvestment : sumCurrent;
    const share = pool > 0 ? ((pCap / pool) * 100).toFixed(2) + "%" : "0.00%";
    sheet3Data.push([
      idx + 1,
      p.name || p.partner_name || "—",
      Number(p.base_capital ?? p.initial_contribution ?? 0),
      pCap,
      Number(p.contributed ?? p.total_contributed ?? 0),
      Number(p.withdrawn ?? p.total_withdrawn ?? 0),
      Number(p.profit ?? p.profit_earned ?? 0),
      share,
      p.status || "ACTIVE"
    ]);
  });

  sheet3Data.push([
    "", "TOTAL", sumBase, totalInvestment || sumCurrent, sumContributed, sumWithdrawn, sumProfit, "100.00%", `${partners.length} Partners`
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
export const exportAutoCategoryReport = (reportData, additionalData = {}, customFileName) => {
  const autoData = reportData?.autoFinance || {};
  const autoLoans = autoData.loans || additionalData.loans || [];
  const autoTotals = autoData.totals || {};
  const allExpenses = reportData?.expenses?.items || additionalData.expenses || [];

  const workbook = XLSX.utils.book_new();

  const totalLoanAmt = autoLoans.reduce((sum, l) => sum + Number(l.loanAmount || l.loan_amount || 0), 0);
  const totalRepayable = autoLoans.reduce((sum, l) => sum + Number(l.totalAmount || l.total_payable || l.loanAmount || 0), 0);
  const totalRecovered = autoLoans.reduce((sum, l) => sum + Number(l.incomeCollected || l.total_collected || l.total_paid || 0), 0);
  const totalDeductions = autoLoans.reduce((sum, l) => sum + Number(l.totalDeductions || 0), 0);
  const totalInHand = autoLoans.reduce((sum, l) => sum + Number(l.byHand || (Number(l.loanAmount || 0) - Number(l.totalDeductions || 0))), 0);
  const totalInterest = Math.max(0, totalRepayable - totalLoanAmt);
  const totalBrokerage = autoLoans.reduce((sum, l) => sum + Number(l.broker || 0), 0);

  // -------------------------------------------------------------
  // SHEET 1: Auto Finance Ledger & Reconciliation
  // -------------------------------------------------------------
  const sheetData = [];
  sheetData.push([
    "S.No", "Date", "Customer Name", "Vehicle Details", "Principal Loan (₹)", "Interest Rate (%)", "Total Repayable (₹)",
    "In Hand Disbursed (₹)", "Broker Name", "Brokerage (₹)", "Charges Description", "Doc Charges (₹)", "HP Charges (₹)",
    "TA Charges (₹)", "Insurance (₹)", "IF (₹)", "GT (₹)", "Fine (₹)", "NT (₹)", "Permit (₹)", "Total Deductions (₹)",
    "FC & Insurance Selavu (₹)", "Collected / Recovered (₹)", "Balance Due (₹)"
  ]);

  autoLoans.forEach((r, idx) => {
    const lPrincipal = Number(r.loanAmount || r.loan_amount || 0);
    const lTotal = Number(r.totalAmount || r.total_payable || lPrincipal);
    const lCollected = Number(r.incomeDue || r.incomeCollected || r.total_collected || 0);
    const lBalance = Math.max(0, lTotal - lCollected);
    sheetData.push([
      idx + 1,
      r.date || "—",
      r.customerName || `${r.first_name || ""} ${r.last_name || ""}`.trim() || "—",
      r.vehicle || `${r.make || ""} ${r.model || ""}`.trim() || "—",
      lPrincipal,
      r.interestRate || r.interest_rate || "—",
      lTotal,
      Number(r.byHand || (lPrincipal - Number(r.totalDeductions || 0))),
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
      lCollected,
      lBalance
    ]);
  });

  const totalBalDue = Math.max(0, totalRepayable - totalRecovered);
  sheetData.push([
    "", "", "TOTAL", "",
    autoTotals.totalLoan || totalLoanAmt,
    "",
    autoTotals.totalLoanWithInterest || totalRepayable,
    autoTotals.distribut || totalInHand,
    "",
    autoTotals.broker || totalBrokerage,
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
    autoTotals.totalCharges || totalDeductions,
    autoTotals.fcSelavu || 0,
    autoTotals.loanIncome || totalRecovered,
    totalBalDue
  ]);

  sheetData.push([]);
  sheetData.push(["AUTO FINANCE CASH FLOW & IRUPPU RECONCILIATION", "AMOUNT (₹)", "DETAILS / FORMULA"]);
  sheetData.push(["Total Loan Principal Sanctioned", Number(autoTotals.totalLoan || totalLoanAmt), "Gross principal approved across portfolio"]);
  sheetData.push(["Total Contractual Repayable Amount", Number(autoTotals.totalLoanWithInterest || totalRepayable), "Principal plus total interest receivables"]);
  sheetData.push(["Total Auto Interest Accrued", Number(autoTotals.autoInterest || totalInterest), "Contractual interest earnings"]);
  sheetData.push(["Total Net Disbursed (In Hand)", Number(autoTotals.distribut || totalInHand), "Actual liquid cash handed to borrowers"]);
  sheetData.push(["Total Upfront Fees & Deductions", Number(autoTotals.totalCharges || totalDeductions), "Document, HP, TA, insurance, and permit deductions"]);
  sheetData.push(["Total Loan Income Recovered", Number(autoTotals.loanIncome || totalRecovered), "Liquid cash recovered from customer dues"]);
  sheetData.push(["Total FC & Insurance Expenses", Number(autoTotals.fcSelavu || 0), "Direct vehicle clearance operational expenses"]);
  sheetData.push(["Total Brokerage Paid", Number(autoTotals.broker || totalBrokerage), "Direct commission paid to auto brokers"]);
  sheetData.push(["Operating Overhead (Salary, Rent, Car)", Number(autoTotals.expensesSaleryRentCar || 0), "Auto operational overhead disbursements"]);
  sheetData.push(["Closing Cash in Hand (IRUPPU)", Number(autoTotals.iruppu || 0), "Net verified physical and bank cash in hand"]);

  const activeLoans = autoLoans.filter(l => (l.status || "ACTIVE").toUpperCase() === "ACTIVE");
  const nextMonthActiveEmis = activeLoans.reduce((sum, l) => {
    const loanAmt = Number(l.loanAmount || l.loan_amount || 0);
    const totAmt = Number(l.totalAmount || l.total_payable || loanAmt);
    const tenure = Number(l.tenureMonths || l.tenure_months || 0);
    const scheduledEmi = tenure > 0 ? Math.round(totAmt / tenure) : 0;
    const emi = Number(l.monthly_installment || l.emi_amount || scheduledEmi || (loanAmt * 0.1));
    return sum + emi;
  }, 0);

  // Exact metrics as shown on Auto Dashboard:
  // "Current In-Hand Cash" (Opening balance for next month)
  const currentInHandCash = Number(totalRecovered || autoTotals.iruppu || 0);
  // "Next Month Projected Amount" (In-Hand + Next Month EMIs)
  const nextMonthProjectedAmount = currentInHandCash + nextMonthActiveEmis;

  sheetData.push([]);
  sheetData.push(["FORWARD CASH FLOW & NEXT MONTH PROJECTIONS", "AMOUNT (₹)", "DETAILS / SUBTITLE"]);
  sheetData.push(["Current In-Hand Cash", currentInHandCash, "Opening balance for next month"]);
  sheetData.push(["Next Month Active EMIs Recovery", nextMonthActiveEmis, `${activeLoans.length} Active vehicle loans monthly EMI expected`]);
  sheetData.push(["Next Month Projected Amount", nextMonthProjectedAmount, "In-Hand + Next Month EMIs"]);

  const ws1 = XLSX.utils.aoa_to_sheet(sheetData);
  autoFitColumns(ws1);
  XLSX.utils.book_append_sheet(workbook, ws1, "Auto Finance Ledger");

  // -------------------------------------------------------------
  // SHEET 2: Vehicle Loans Portfolio
  // -------------------------------------------------------------
  const portfolioRows = autoLoans.map((l, idx) => {
    const loanAmt = Number(l.loanAmount || l.loan_amount || 0);
    const totAmt = Number(l.totalAmount || l.total_payable || loanAmt);
    const recAmt = Number(l.incomeCollected || l.total_collected || l.total_paid || 0);
    const dedAmt = Number(l.totalDeductions || 0);
    const inHand = Number(l.byHand || (loanAmt - dedAmt));
    const balDue = Math.max(0, totAmt - recAmt);
    const tenure = Number(l.tenureMonths || l.tenure_months || 0);
    const scheduledEmi = tenure > 0 ? Math.round(totAmt / tenure) : 0;
    const emi = Number(l.monthly_installment || l.emi_amount || scheduledEmi || 0);

    return {
      "S.No": idx + 1,
      "Loan ID": l.id || l.loan_id || `AL-${idx + 1}`,
      "Disbursement Date": l.date || l.start_date || "—",
      "Customer Name": l.customerName || `${l.first_name || ""} ${l.last_name || ""}`.trim() || "—",
      "Mobile Number": l.phone || l.mobile_number || "—",
      "Vehicle Make/Model": l.vehicle || `${l.make || ""} ${l.model || ""}`.trim() || "—",
      "Registration Number": l.regNo || l.registration_number || "PENDING",
      "Loan Principal (₹)": loanAmt,
      "Interest Rate (%)": Number(l.interestRate || l.interest_rate || 0),
      "Tenure (Months)": tenure,
      "Monthly EMI (₹)": emi,
      "Agreed Total Amount (₹)": totAmt,
      "Total Deductions (₹)": dedAmt,
      "In-Hand Disbursed (₹)": inHand,
      "Total Recovered (₹)": recAmt,
      "Balance Pending (₹)": balDue,
      "Broker Name": l.brokerName || "—",
      "Brokerage (₹)": Number(l.broker || 0),
      "Loan Status": l.status || "ACTIVE",
    };
  });

  if (portfolioRows.length > 0) {
    portfolioRows.push({
      "S.No": "",
      "Loan ID": "TOTAL",
      "Disbursement Date": "",
      "Customer Name": `${autoLoans.length} Loans`,
      "Mobile Number": "",
      "Vehicle Make/Model": "",
      "Registration Number": "",
      "Loan Principal (₹)": totalLoanAmt,
      "Interest Rate (%)": "",
      "Tenure (Months)": "",
      "Monthly EMI (₹)": nextMonthActiveEmis,
      "Agreed Total Amount (₹)": totalRepayable,
      "Total Deductions (₹)": totalDeductions,
      "In-Hand Disbursed (₹)": totalInHand,
      "Total Recovered (₹)": totalRecovered,
      "Balance Pending (₹)": totalBalDue,
      "Broker Name": "",
      "Brokerage (₹)": totalBrokerage,
      "Loan Status": "",
    });
  }

  const ws2 = XLSX.utils.json_to_sheet(portfolioRows.length ? portfolioRows : [{ Message: "No vehicle loans on record." }]);
  autoFitColumns(ws2, portfolioRows);
  XLSX.utils.book_append_sheet(workbook, ws2, "Vehicle Loans Portfolio");

  // -------------------------------------------------------------
  // SHEET 3: EMI Recovery Schedule
  // -------------------------------------------------------------
  let totalEmiSum = 0;
  let totalRecSum = 0;
  let totalPendSum = 0;

  const emiRows = autoLoans.map((l, idx) => {
    const loanAmt = Number(l.loanAmount || l.loan_amount || 0);
    const totAmt = Number(l.totalAmount || l.total_payable || loanAmt);
    const tenure = Number(l.tenureMonths || l.tenure_months || 1);
    const emi = tenure > 0 ? Math.round(totAmt / tenure) : 0;
    const recAmt = Number(l.incomeCollected || l.total_collected || l.total_paid || 0);
    const duesPaid = emi > 0 ? Math.floor(recAmt / emi) : 0;
    const duesPending = Math.max(0, tenure - duesPaid);
    const pendAmt = Math.max(0, totAmt - recAmt);

    totalEmiSum += emi;
    totalRecSum += recAmt;
    totalPendSum += pendAmt;

    return {
      "S.No": idx + 1,
      "Loan ID": l.id || l.loan_id || `AL-${idx + 1}`,
      "Customer Name": l.customerName || `${l.first_name || ""} ${l.last_name || ""}`.trim() || "—",
      "Vehicle": l.vehicle || `${l.make || ""} ${l.model || ""}`.trim() || "—",
      "Reg No": l.regNo || l.registration_number || "—",
      "Monthly EMI (₹)": emi,
      "Tenure (Months)": tenure,
      "Dues Paid": duesPaid,
      "Dues Pending": duesPending,
      "Total Collected (₹)": recAmt,
      "Total Pending (₹)": pendAmt,
      "Recovery Status": l.status || "ACTIVE",
    };
  });

  if (emiRows.length > 0) {
    emiRows.push({
      "S.No": "",
      "Loan ID": "TOTAL",
      "Customer Name": "",
      "Vehicle": "",
      "Reg No": "",
      "Monthly EMI (₹)": totalEmiSum,
      "Tenure (Months)": "",
      "Dues Paid": "",
      "Dues Pending": "",
      "Total Collected (₹)": totalRecSum,
      "Total Pending (₹)": totalPendSum,
      "Recovery Status": "",
    });
    emiRows.push({
      "S.No": "",
      "Loan ID": "PROJECTION",
      "Customer Name": "Current In-Hand Cash (Opening balance for next month)",
      "Vehicle": "",
      "Reg No": "",
      "Monthly EMI (₹)": currentInHandCash,
      "Tenure (Months)": "",
      "Dues Paid": "",
      "Dues Pending": "",
      "Total Collected (₹)": currentInHandCash,
      "Total Pending (₹)": "",
      "Recovery Status": "IN-HAND CASH",
    });
    emiRows.push({
      "S.No": "",
      "Loan ID": "PROJECTION",
      "Customer Name": "Next Month Projected Amount (In-Hand + Next Month EMIs)",
      "Vehicle": "",
      "Reg No": "",
      "Monthly EMI (₹)": nextMonthProjectedAmount,
      "Tenure (Months)": "",
      "Dues Paid": "",
      "Dues Pending": "",
      "Total Collected (₹)": nextMonthProjectedAmount,
      "Total Pending (₹)": "",
      "Recovery Status": "PROJECTED LIQUIDITY",
    });
  }

  const ws3 = XLSX.utils.json_to_sheet(emiRows.length ? emiRows : [{ Message: "No schedule data available." }]);
  autoFitColumns(ws3, emiRows);
  XLSX.utils.book_append_sheet(workbook, ws3, "EMI Recovery Schedule");


  // -------------------------------------------------------------
  // SHEET 4: Auto Expenses & Selavu
  // -------------------------------------------------------------
  const autoExpenses = allExpenses.filter(e => {
    const desc = (e.description || e.title || "").toLowerCase();
    const cat = (e.category || e.categoryLabel || "").toLowerCase();
    return cat.includes("auto") || cat.includes("car") || cat.includes("rto") || cat.includes("fc") ||
      desc.includes("auto") || desc.includes("car") || desc.includes("rto") || desc.includes("fc") || desc.includes("broker");
  });

  const expensesToUse = autoExpenses.length ? autoExpenses : allExpenses;
  let totalAutoExpAmt = 0;

  const expRows = expensesToUse.map((e, idx) => {
    const amt = Number(e.amount || 0);
    totalAutoExpAmt += amt;
    return {
      "S.No": idx + 1,
      "Date": e.date || (e.expense_date ? String(e.expense_date).slice(0, 10) : "—"),
      "Description": e.description || e.title || "—",
      "Category": e.categoryLabel || e.category || "GENERAL",
      "Amount (₹)": amt,
    };
  });

  if (expRows.length > 0) {
    expRows.push({
      "S.No": "",
      "Date": "",
      "Description": "TOTAL AUTO EXPENSES",
      "Category": "",
      "Amount (₹)": totalAutoExpAmt,
    });
  }

  const ws4 = XLSX.utils.json_to_sheet(expRows.length ? expRows : [{ Message: "No expenses on record." }]);
  autoFitColumns(ws4, expRows);
  XLSX.utils.book_append_sheet(workbook, ws4, "Auto Expenses & Selavu");

  const fileName = customFileName || `Auto_Finance_Report_${new Date().toISOString().slice(0, 10)}`;
  XLSX.writeFile(workbook, `${fileName}.xlsx`);
};

// ============================================================================
// 12. DEDICATED DAILY FINANCE REPORT (EXECUTIVE 4-SHEET WORKBOOK)
// ============================================================================
export const exportDailyCategoryReport = (reportData, additionalData = {}, customFileName) => {
  const dfData = reportData?.dailyFinance || {};
  const dfLoans = dfData.loans || additionalData.customers || [];
  const dfTotals = dfData.totals || {};
  const distinctMonths = reportData?.distinctMonths || additionalData.distinctMonths || [];
  const dailyLogs = additionalData.dailyLogs || [];
  const allExpenses = reportData?.expenses?.items || additionalData.expenses || [];

  const workbook = XLSX.utils.book_new();

  const totalLoanAmt = dfLoans.reduce((sum, l) => sum + Number(l.loanAmount || l.gross_finance_amount || 0), 0);
  const totalPitibu = dfLoans.reduce((sum, l) => sum + Number(l.pitibu || l.initial_deduction || 0), 0);
  const totalNetGiven = dfLoans.reduce((sum, l) => sum + Number(l.byHand || l.net_disbursement || (Number(l.loanAmount || 0) - Number(l.pitibu || 0))), 0);
  const totalIncomeCollected = dfLoans.reduce((sum, l) => sum + Number(l.income || l.total_collected || 0), 0);
  const totalBal = dfLoans.reduce((sum, l) => sum + Number(l.balance || l.remaining || 0), 0);

  // -------------------------------------------------------------
  // SHEET 1: Daily Finance Ledger & Reconciliation
  // -------------------------------------------------------------
  const sheetData = [];
  sheetData.push([
    "S.No", "Date", "Customer Name", "Gross Loan Amount (₹)", "Pitibu / Deduction (₹)", "Net Disbursed (By Hand) (₹)",
    "Collection Matakku", ...distinctMonths.map(m => `${m.label || m.key} Vasul (₹)`), "Total Vasul Collected (₹)", "Remaining Balance (₹)"
  ]);

  dfLoans.forEach((r, idx) => {
    const monthCols = distinctMonths.map(m => Number(r.monthlyVasul?.[m.key] || 0));
    sheetData.push([
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

  sheetData.push([
    "", "", "TOTAL",
    dfTotals.totalLoan || totalLoanAmt,
    dfTotals.pitipu || totalPitibu,
    dfTotals.distrubut || totalNetGiven,
    "",
    ...dfMonthTotals,
    dfTotals.income || totalIncomeCollected,
    dfTotals.balance || totalBal
  ]);

  sheetData.push([]);
  sheetData.push(["DAILY FINANCE CASH FLOW & KAIERUPPU RECONCILIATION", "AMOUNT (₹)", "DETAILS / FORMULA"]);
  sheetData.push(["Total Gross Loan Sanctioned", Number(dfTotals.totalLoan || totalLoanAmt), "Gross sanctioned daily loans across portfolio"]);
  sheetData.push(["Total Pitibu (Upfront Deduction)", Number(dfTotals.pitipu || totalPitibu), "Processing deductions / upfront interest retained"]);
  sheetData.push(["Total Net Disbursed (By Hand)", Number(dfTotals.distrubut || totalNetGiven), "Actual liquid cash handed to borrowers"]);
  sheetData.push(["Total Vasul Collected (Income)", Number(dfTotals.income || totalIncomeCollected), "Total daily collections received to date"]);
  sheetData.push(["Total Outstanding Customer Balance", Number(dfTotals.balance || totalBal), "Uncollected balance remaining across borrower accounts"]);
  sheetData.push(["Total Portfolio Book (Balance + Income)", Number(dfTotals.balance || totalBal) + Number(dfTotals.income || totalIncomeCollected), "Aggregate collectible book value"]);
  sheetData.push(["Daily Operating Expenses (Selavu)", Number(dfTotals.selavu || 0), "Routine operational and collection expenses"]);
  sheetData.push(["Closing Cash in Hand (KAIERUPPU)", Number(dfTotals.kaieruppu || 0), "Net verified physical daily cash in hand"]);

  const currentDailyInHand = Number(dfTotals.kaieruppu || totalIncomeCollected || 0);
  const nextMonthDailyProjectedVasul = Math.round(totalIncomeCollected > 0 ? (totalIncomeCollected / (distinctMonths.length || 1)) : 0);
  const nextMonthDailyProjectedAmount = currentDailyInHand + nextMonthDailyProjectedVasul;

  sheetData.push([]);
  sheetData.push(["FORWARD CASH FLOW & NEXT MONTH PROJECTIONS", "AMOUNT (₹)", "DETAILS / SUBTITLE"]);
  sheetData.push(["Current In-Hand Cash", currentDailyInHand, "Opening balance for next month"]);
  sheetData.push(["Next Month Projected Vasul / Inflow", nextMonthDailyProjectedVasul, "Expected monthly vasul collections"]);
  sheetData.push(["Next Month Projected Amount", nextMonthDailyProjectedAmount, "In-Hand + Next Month Vasul"]);

  const ws1 = XLSX.utils.aoa_to_sheet(sheetData);
  autoFitColumns(ws1);
  XLSX.utils.book_append_sheet(workbook, ws1, "Daily Finance Ledger");

  // -------------------------------------------------------------
  // SHEET 2: Customer Loans Portfolio
  // -------------------------------------------------------------
  let totCustGross = 0;
  let totCustPitibu = 0;
  let totCustByHand = 0;
  let totCustTarget = 0;
  let totCustCollected = 0;
  let totCustBalance = 0;

  const custRows = dfLoans.map((l, idx) => {
    const gross = Number(l.loanAmount || l.gross_finance_amount || 0);
    const pitibu = Number(l.pitibu || l.initial_deduction || 0);
    const byHand = Number(l.byHand || l.net_disbursement || (gross - pitibu));
    const targetReturn = Number(l.agreed_total_payable || (gross + pitibu) || gross);
    const collected = Number(l.income || l.total_collected || 0);
    const balance = Number(l.balance || l.remaining || Math.max(0, targetReturn - collected));

    totCustGross += gross;
    totCustPitibu += pitibu;
    totCustByHand += byHand;
    totCustTarget += targetReturn;
    totCustCollected += collected;
    totCustBalance += balance;

    return {
      "S.No": idx + 1,
      "Finance ID": l.financeId || l.id || `DF-${idx + 1}`,
      "Disbursement Date": l.date || l.finance_date || "—",
      "Customer Name": l.customerName || l.customer_name || "—",
      "Mobile Number": l.mobileNumber || l.mobile_number || "—",
      "Gross Finance Amount (₹)": gross,
      "Pitibu / Upfront Deduction (₹)": pitibu,
      "Net Given By Hand (₹)": byHand,
      "Agreed Total Return (₹)": targetReturn,
      "Total Collected / Vasul (₹)": collected,
      "Pending Balance (₹)": balance,
      "Loan Status": l.status || "ACTIVE",
    };
  });

  if (custRows.length > 0) {
    custRows.push({
      "S.No": "",
      "Finance ID": "TOTAL",
      "Disbursement Date": "",
      "Customer Name": `${dfLoans.length} Customers`,
      "Mobile Number": "",
      "Gross Finance Amount (₹)": totCustGross,
      "Pitibu / Upfront Deduction (₹)": totCustPitibu,
      "Net Given By Hand (₹)": totCustByHand,
      "Agreed Total Return (₹)": totCustTarget,
      "Total Collected / Vasul (₹)": totCustCollected,
      "Pending Balance (₹)": totCustBalance,
      "Loan Status": "",
    });
  }

  const ws2 = XLSX.utils.json_to_sheet(custRows.length ? custRows : [{ Message: "No customer accounts on record." }]);
  autoFitColumns(ws2, custRows);
  XLSX.utils.book_append_sheet(workbook, ws2, "Customer Loans Portfolio");

  // -------------------------------------------------------------
  // SHEET 3: Daily Collection Logs
  // -------------------------------------------------------------
  let totLogAutoRev = 0;
  let totLogDailyRev = 0;
  let totLogInflow = 0;
  let totLogExp = 0;
  let totLogNet = 0;

  const logRows = dailyLogs.map((l, idx) => {
    const aRev = Number(l.autoRevenue || 0);
    const dRev = Number(l.dailyRevenue || 0);
    const tRev = Number(l.totalRevenue || 0);
    const exp = Number(l.expenses || 0);
    const net = Number(l.netProfit || 0);

    totLogAutoRev += aRev;
    totLogDailyRev += dRev;
    totLogInflow += tRev;
    totLogExp += exp;
    totLogNet += net;

    return {
      "S.No": idx + 1,
      "Date": l.calcDate || l.date || "—",
      "Auto Revenue (₹)": aRev,
      "Daily Revenue (Vasul) (₹)": dRev,
      "Total Daily Inflow (₹)": tRev,
      "Operating Expenses (₹)": exp,
      "Net Daily Income (₹)": net,
      "Active Capital (₹)": Number(l.totalActiveCapital || 0),
    };
  });

  if (logRows.length > 0) {
    logRows.push({
      "S.No": "",
      "Date": "TOTAL",
      "Auto Revenue (₹)": totLogAutoRev,
      "Daily Revenue (Vasul) (₹)": totLogDailyRev,
      "Total Daily Inflow (₹)": totLogInflow,
      "Operating Expenses (₹)": totLogExp,
      "Net Daily Income (₹)": totLogNet,
      "Active Capital (₹)": "",
    });
  }

  const ws3 = XLSX.utils.json_to_sheet(logRows.length ? logRows : [{ Message: "No daily logs recorded yet." }]);
  autoFitColumns(ws3, logRows);
  XLSX.utils.book_append_sheet(workbook, ws3, "Daily Collection Logs");

  // -------------------------------------------------------------
  // SHEET 4: Daily Operating Expenses
  // -------------------------------------------------------------
  const dailyExpenses = allExpenses.filter(e => {
    const desc = (e.description || e.title || "").toLowerCase();
    const cat = (e.category || e.categoryLabel || "").toLowerCase();
    return cat.includes("daily") || cat.includes("tea") || cat.includes("travel") || cat.includes("petrol") ||
      desc.includes("daily") || desc.includes("tea") || desc.includes("vasul") || desc.includes("collection");
  });

  const expensesToUse = dailyExpenses.length ? dailyExpenses : allExpenses;
  let totDailyExpAmt = 0;

  const expRows = expensesToUse.map((e, idx) => {
    const amt = Number(e.amount || 0);
    totDailyExpAmt += amt;
    return {
      "S.No": idx + 1,
      "Date": e.date || (e.expense_date ? String(e.expense_date).slice(0, 10) : "—"),
      "Description": e.description || e.title || "—",
      "Category": e.categoryLabel || e.category || "GENERAL",
      "Amount (₹)": amt,
    };
  });

  if (expRows.length > 0) {
    expRows.push({
      "S.No": "",
      "Date": "",
      "Description": "TOTAL DAILY EXPENSES",
      "Category": "",
      "Amount (₹)": totDailyExpAmt,
    });
  }

  const ws4 = XLSX.utils.json_to_sheet(expRows.length ? expRows : [{ Message: "No expenses on record." }]);
  autoFitColumns(ws4, expRows);
  XLSX.utils.book_append_sheet(workbook, ws4, "Daily Operating Expenses");

  const fileName = customFileName || `Daily_Finance_Report_${new Date().toISOString().slice(0, 10)}`;
  XLSX.writeFile(workbook, `${fileName}.xlsx`);
};

// ============================================================================
// 13. DEDICATED GLOBAL CAPITAL REPORT (EXECUTIVE 4-SHEET WORKBOOK)
// ============================================================================
export const exportGlobalCategoryReport = (reportData, additionalData = {}, customFileName) => {
  const partners = reportData?.partners?.list || additionalData.partners || [];
  const totalInvestment = Number(reportData?.partners?.totalInvestment || additionalData.totalInvestment || partners.reduce((s, p) => s + Number(p.capital || p.current_capital || 0), 0));
  const allExpenses = reportData?.expenses?.items || additionalData.expenses || [];
  const catTotals = reportData?.expenses?.categoryTotals || {};
  const closings = additionalData.closings || [];
  const transactions = additionalData.transactions || [];
  const ledger = additionalData.ledger || [];

  const workbook = XLSX.utils.book_new();

  // -------------------------------------------------------------
  // SHEET 1: Partner Capital & Equity Ledger
  // -------------------------------------------------------------
  const sumBase = partners.reduce((s, p) => s + Number(p.base_capital ?? p.initial_contribution ?? 0), 0);
  const sumCurrent = partners.reduce((s, p) => s + Number(p.capital ?? p.current_capital ?? 0), 0);
  const sumContributed = partners.reduce((s, p) => s + Number(p.contributed ?? p.total_contributed ?? 0), 0);
  const sumWithdrawn = partners.reduce((s, p) => s + Number(p.withdrawn ?? p.total_withdrawn ?? 0), 0);
  const sumProfit = partners.reduce((s, p) => s + Number(p.profit ?? p.profit_earned ?? 0), 0);

  const sheet1Data = [];
  sheet1Data.push([
    "S.No", "Partner Name", "Phone", "Email", "Base Capital (₹)", "Current Capital (₹)",
    "Total Contributed (₹)", "Total Withdrawn (₹)", "Profit Credited (₹)", "Equity Share (%)", "Status"
  ]);

  partners.forEach((p, idx) => {
    const pCap = Number(p.capital ?? p.current_capital ?? 0);
    const pool = totalInvestment > 0 ? totalInvestment : sumCurrent;
    const share = pool > 0 ? ((pCap / pool) * 100).toFixed(2) + "%" : "0.00%";
    sheet1Data.push([
      idx + 1,
      p.name || p.partner_name || "—",
      p.phone || "—",
      p.email || "—",
      Number(p.base_capital ?? p.initial_contribution ?? 0),
      pCap,
      Number(p.contributed ?? p.total_contributed ?? 0),
      Number(p.withdrawn ?? p.total_withdrawn ?? 0),
      Number(p.profit ?? p.profit_earned ?? 0),
      share,
      p.status || "ACTIVE"
    ]);
  });

  sheet1Data.push([
    "", "TOTAL", "", "",
    sumBase,
    totalInvestment || sumCurrent,
    sumContributed,
    sumWithdrawn,
    sumProfit,
    "100.00%",
    `${partners.length} Active Partners`
  ]);

  sheet1Data.push([]);
  sheet1Data.push(["GLOBAL CAPITAL POSITION SUMMARY", "AMOUNT / VALUE (₹)", "DESCRIPTION"]);
  sheet1Data.push(["Total Active Operating Capital Deployed", Number(totalInvestment || sumCurrent), "Current active capital pool deployed in operations"]);
  sheet1Data.push(["Total Initial Base Equity Committed", Number(sumBase), "Initial equity contributed by founders/partners"]);
  sheet1Data.push(["Total Lifetime Capital Contributed", Number(sumContributed), "Additional capital deposits injected by partners"]);
  sheet1Data.push(["Total Lifetime Capital Withdrawn", Number(sumWithdrawn), "Capital drawdowns taken by partners"]);
  sheet1Data.push(["Total Cumulative Profits Credited", Number(sumProfit), "Total profit allocations credited to partner accounts"]);
  sheet1Data.push(["Total Active Equity Partners", partners.length, "Number of participating equity partners"]);

  const ws1 = XLSX.utils.aoa_to_sheet(sheet1Data);
  autoFitColumns(ws1);
  XLSX.utils.book_append_sheet(workbook, ws1, "Partner Capital");

  // -------------------------------------------------------------
  // SHEET 2: Categorized Selavu (Expenses Matrix)
  // -------------------------------------------------------------
  const sheet2Data = [];
  sheet2Data.push([
    "S.No", "Date", "Description / Payee", "Category", "Shop Opening (₹)", "Tea & Refreshments (₹)", "Pooja & God (₹)",
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

  const calcPct = (val) => grandSelavu > 0 ? `${((Number(val || 0) / grandSelavu) * 100).toFixed(2)}%` : "0.00%";

  sheet2Data.push([]);
  sheet2Data.push(["CATEGORY-WISE SELAVU BREAKDOWN", "TOTAL AMOUNT (₹)", "% OF TOTAL SELAVU"]);
  sheet2Data.push(["Shop Opening", Number(catTotals.shopOpen || 0), calcPct(catTotals.shopOpen)]);
  sheet2Data.push(["Tea & Refreshments", Number(catTotals.tea || 0), calcPct(catTotals.tea)]);
  sheet2Data.push(["Pooja & God", Number(catTotals.god || 0), calcPct(catTotals.god)]);
  sheet2Data.push(["Allowances & Travel", Number(catTotals.allowances || 0), calcPct(catTotals.allowances)]);
  sheet2Data.push(["Rent & Electricity (EB)", Number(catTotals.rentEb || 0), calcPct(catTotals.rentEb)]);
  sheet2Data.push(["Salary & Wages", Number(catTotals.salary || 0), calcPct(catTotals.salary)]);
  sheet2Data.push(["Interest Paid", Number(catTotals.interest || 0), calcPct(catTotals.interest)]);
  sheet2Data.push(["Other Expenses", Number(catTotals.others || 0), calcPct(catTotals.others)]);
  sheet2Data.push(["GRAND TOTAL SELAVU", grandSelavu, "100.00%"]);

  const ws2 = XLSX.utils.aoa_to_sheet(sheet2Data);
  autoFitColumns(ws2);
  XLSX.utils.book_append_sheet(workbook, ws2, "Selavu (Expenses Matrix)");

  // -------------------------------------------------------------
  // SHEET 3: Monthly Closings & Partner Shares
  // -------------------------------------------------------------
  let totCloseAutoRev = 0;
  let totCloseDailyRev = 0;
  let totCloseGrossRev = 0;
  let totCloseExp = 0;
  let totCloseNet = 0;
  let totClosePool = 0;
  let totCloseComp = 0;

  const closingRows = closings.map((c, idx) => {
    const aRev = Number(c.financials?.autoRevenue ?? c.auto_revenue ?? 0);
    const dRev = Number(c.financials?.dailyRevenue ?? c.daily_revenue ?? 0);
    const gRev = Number(c.financials?.grossRevenue ?? c.gross_revenue ?? (aRev + dRev));
    const exp = Number(c.financials?.expenses ?? c.expenses_total ?? 0);
    const net = Number(c.financials?.netProfit ?? c.net_profit ?? (gRev - exp));
    const pool = Number(c.financials?.partnerPoolProfit ?? c.partner_pool_profit ?? (net * 0.7));
    const comp = Number(c.financials?.companyProfit ?? c.company_profit ?? (net - pool));

    totCloseAutoRev += aRev;
    totCloseDailyRev += dRev;
    totCloseGrossRev += gRev;
    totCloseExp += exp;
    totCloseNet += net;
    totClosePool += pool;
    totCloseComp += comp;

    return {
      "S.No": idx + 1,
      "Period / Month": c.monthName || `${c.year}-${String(c.month).padStart(2, "0")}`,
      "Auto Revenue (₹)": aRev,
      "Daily Revenue (₹)": dRev,
      "Total Gross Revenue (₹)": gRev,
      "Operating Expenses (₹)": exp,
      "Net Operating Profit (₹)": net,
      "Partner Pool Profit (₹)": pool,
      "Company Retained (₹)": comp,
      "Active Partners": Number(c.allocations?.length ?? c.partner_count ?? partners.length),
      "Status": c.isCurrentMonth ? "In Progress" : "Finalized",
    };
  });

  if (closingRows.length > 0) {
    closingRows.push({
      "S.No": "",
      "Period / Month": "TOTAL",
      "Auto Revenue (₹)": totCloseAutoRev,
      "Daily Revenue (₹)": totCloseDailyRev,
      "Total Gross Revenue (₹)": totCloseGrossRev,
      "Operating Expenses (₹)": totCloseExp,
      "Net Operating Profit (₹)": totCloseNet,
      "Partner Pool Profit (₹)": totClosePool,
      "Company Retained (₹)": totCloseComp,
      "Active Partners": "",
      "Status": "",
    });
  }

  const ws3 = XLSX.utils.json_to_sheet(closingRows.length ? closingRows : [{ Message: "No finalized closings on record." }]);
  autoFitColumns(ws3, closingRows);
  XLSX.utils.book_append_sheet(workbook, ws3, "Monthly Closings & Shares");

  // -------------------------------------------------------------
  // SHEET 4: Capital Transactions & General Ledger
  // -------------------------------------------------------------
  const txSource = transactions.length ? transactions : ledger;
  let totTxAmt = 0;

  const txRows = txSource.map((t, idx) => {
    const amt = Number(t.amount || 0);
    totTxAmt += amt;
    return {
      "Entry #": t.id || idx + 1,
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
      "Entry #": "TOTAL",
      "Date": "",
      "Partner / Account": `${txRows.length} Entries`,
      "Transaction Type": "",
      "Description / Narration": "",
      "Amount (₹)": totTxAmt,
      "Payment Mode": "",
      "Reference / UTR": "",
    });
  }

  const ws4 = XLSX.utils.json_to_sheet(txRows.length ? txRows : [{ Message: "No transactions recorded." }]);
  autoFitColumns(ws4, txRows);
  XLSX.utils.book_append_sheet(workbook, ws4, "Capital Transactions & Ledger");

  const fileName = customFileName || `Global_Capital_Report_${new Date().toISOString().slice(0, 10)}`;
  XLSX.writeFile(workbook, `${fileName}.xlsx`);
};


