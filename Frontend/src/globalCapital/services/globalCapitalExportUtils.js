import * as XLSX from "xlsx";

/**
 * Automatically calculates and sets optimal column widths for an XLSX worksheet.
 */
export const autoFitColumns = (worksheet, data) => {
  if (!data || !data.length) return;
  const keys = Object.keys(data[0]);
  const wscols = keys.map((key) => {
    const maxDataLength = data.reduce((max, row) => {
      const val = row[key];
      const valLen = val != null ? val.toString().length : 0;
      return Math.max(max, valLen);
    }, key.length);
    return { wch: Math.min(Math.max(maxDataLength + 3, 12), 48) };
  });
  worksheet["!cols"] = wscols;
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
