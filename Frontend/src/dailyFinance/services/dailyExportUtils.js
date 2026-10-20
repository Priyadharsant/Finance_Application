import * as XLSX from "xlsx";
import { dateLabel } from "./dailyFinanceApi.js";

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
export const exportToExcel = (data, fileName, sheetName = "Sheet1") => {
  const worksheet = XLSX.utils.json_to_sheet(data);
  autoFitColumns(worksheet, data);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
  XLSX.writeFile(workbook, `${fileName}.xlsx`);
};

/**
 * Export Filtered Period Report (Excel)
 */
export const exportDailyFinancePeriodReport = (report) => {
  if (!report || !report.customers || !report.customers.length) {
    alert("No report data available to export.");
    return;
  }

  const sortedCustomers = [...(report.customers || [])].sort((a, b) => {
    const da = new Date(a.finance_date || 0).getTime();
    const db = new Date(b.finance_date || 0).getTime();
    if (da !== db) return da - db;
    const ca = new Date(a.created_at || a.account_created_at || 0).getTime();
    const cb = new Date(b.created_at || b.account_created_at || 0).getTime();
    return ca - cb;
  });

  const rows = sortedCustomers.map((row, idx) => {
    const agreed = Number(row.agreed_total_payable || 0);
    const collected = Number(row.total_collected || 0);
    const progressPct = agreed > 0 ? ((collected / agreed) * 100).toFixed(1) + "%" : "0%";

    return {
      "S.No": idx + 1,
      "Finance Date": dateLabel(row.finance_date),
      "Customer Name": row.customer_name || "—",
      "Finance Amount (₹)": Number(row.gross_finance_amount || 0),
      "Interest (₹)": Number(row.initial_deduction || 0),
      "Amount Given (₹)": Number(row.net_disbursement || 0),
      "Total Return (₹)": agreed,
      "Collected (₹)": collected,
      "Remaining (₹)": Number(row.remaining || 0),
      "Profit (₹)": Number(row.profit || row.initial_deduction || 0),
      "Status": row.status || "ACTIVE",
    };
  });

  // Append Totals Summary Row
  if (report.totals) {
    const t = report.totals;
    const totalAgreed = Number(t.totalReturn || 0);
    const totalReturned = Number(t.returned || 0);

    rows.push({
      "S.No": "TOTAL",
      "Finance Date": `${dateLabel(report.from)} to ${dateLabel(report.to)}`,
      "Customer Name": `SUMMARY TOTALS (${sortedCustomers.length} Customers)`,
      "Finance Amount (₹)": Number(t.financeAmount || 0),
      "Interest (₹)": Number(t.profit || 0),
      "Amount Given (₹)": Number(t.given || 0),
      "Total Return (₹)": totalAgreed,
      "Collected (₹)": totalReturned,
      "Remaining (₹)": Number(t.remaining || 0),
      "Profit (₹)": Number(t.profit || 0),
      "Status": "SUMMARY",
    });
  }

  const fileName = `Daily_Finance_Report_${report.from}_to_${report.to}`;
  exportToExcel(rows, fileName, "Period Report");
};

/**
 * Export Total Daily Portfolio (Excel)
 */
export const exportTotalDailyPortfolio = (customers = []) => {
  if (!customers || !customers.length) {
    alert("No customer records found to export.");
    return;
  }

  // Sort by date older to newest, then created_at, then alphabet
  const sorted = [...customers].sort((a, b) => {
    const da = new Date(a.finance_date || 0).getTime();
    const db = new Date(b.finance_date || 0).getTime();
    if (da !== db) return da - db;
    const ca = new Date(a.created_at || a.account_created_at || 0).getTime();
    const cb = new Date(b.created_at || b.account_created_at || 0).getTime();
    if (ca !== cb) return ca - cb;
    const nameA = String(a.customer_name || "").toLowerCase();
    const nameB = String(b.customer_name || "").toLowerCase();
    return nameA.localeCompare(nameB);
  });

  let totalGross = 0;
  let totalDeduction = 0;
  let totalDisbursed = 0;
  let totalAgreed = 0;
  let totalCollected = 0;
  let totalRemaining = 0;

  const rows = sorted.map((c, idx) => {
    const gross = Number(c.gross_finance_amount || 0);
    const deduction = Number(c.initial_deduction || 0);
    const disbursed = Number(c.net_disbursement || (gross - deduction));
    const agreed = Number(c.agreed_total_payable || gross);
    const collected = Number(c.total_collected || 0);
    const remaining = Number(c.outstanding_receivable ?? c.remaining ?? Math.max(0, agreed - collected));

    totalGross += gross;
    totalDeduction += deduction;
    totalDisbursed += disbursed;
    totalAgreed += agreed;
    totalCollected += collected;
    totalRemaining += remaining;

    return {
      "S.No": idx + 1,
      "Finance Date": dateLabel(c.finance_date),
      "Name": c.customer_name || "—",
      "Total Loan": gross,
      "Pitibu": deduction,
      "By hand": disbursed,
      "Income": agreed,
      "Vasul": collected,
      "Balance": remaining,
      "Profit": deduction,
      "Status": c.status || "ACTIVE",
    };
  });

  // Summary Row
  rows.push({
    "S.No": "TOTAL",
    "Finance Date": "",
    "Name": `${sorted.length} Customers`,
    "Total Loan": totalGross,
    "Pitibu": totalDeduction,
    "By hand": totalDisbursed,
    "Income": totalAgreed,
    "Vasul": totalCollected,
    "Balance": totalRemaining,
    "Profit": totalDeduction,
    "Status": "",
  });

  const todayStr = new Date().toISOString().slice(0, 10);
  exportToExcel(rows, `Daily_Finance_Total_Loans_${todayStr}`, "Daily Loans");
};

/**
 * Export Individual Customer Dossier & Statement (Excel Multi-Sheet)
 */
export const exportCustomerStatement = (customer, collections = []) => {
  if (!customer) return;

  const gross = Number(customer.gross_finance_amount || 0);
  const deduction = Number(customer.initial_deduction || 0);
  const disbursed = Number(customer.net_disbursement || 0);
  const agreed = Number(customer.agreed_total_payable || 0);
  const collected = Number(customer.total_collected || 0);
  const remaining = Number(customer.remaining ?? customer.outstanding_receivable ?? (agreed - collected));

  // Sheet 1: Customer Overview
  const overviewData = [
    { Property: "Customer Name", Value: customer.customer_name || "—" },
    { Property: "Mobile Number", Value: customer.mobile_number || "—" },
    { Property: "Address", Value: customer.address || "—" },
    { Property: "Finance Start Date", Value: dateLabel(customer.finance_date) },
    { Property: "Account Status", Value: customer.status || "ACTIVE" },
    { Property: "Gross Finance Amount (₹)", Value: gross },
    { Property: "Upfront Interest / Deduction (₹)", Value: deduction },
    { Property: "Net Amount Given to Customer (₹)", Value: disbursed },
    { Property: "Agreed Total Return (₹)", Value: agreed },
    { Property: "Total Amount Collected (₹)", Value: collected },
    { Property: "Remaining Balance Due (₹)", Value: remaining },
    { Property: "Recovery Percentage", Value: agreed > 0 ? ((collected / agreed) * 100).toFixed(1) + "%" : "0%" },
    { Property: "Profit Earned (₹)", Value: deduction },
    { Property: "Total Payments Recorded", Value: collections.length },
    { Property: "Statement Export Date", Value: dateLabel(new Date()) },
  ];

  // Sheet 2: Collections History
  const sortedCollections = [...(collections || [])].sort((a, b) => {
    const da = new Date(a.collection_date || 0).getTime();
    const db = new Date(b.collection_date || 0).getTime();
    if (da !== db) return da - db;
    const ca = new Date(a.created_at || 0).getTime();
    const cb = new Date(b.created_at || 0).getTime();
    return ca - cb;
  });

  const historyRows = sortedCollections.map((p, idx) => ({
    "S.No": idx + 1,
    "Collection Date": dateLabel(p.collection_date),
    "Amount Collected (₹)": Number(p.amount || 0),
    "Total Collected To-Date (₹)": Number(p.total_collected || 0),
    "Remaining Balance (₹)": Number(p.remaining || 0),
    "Payment Method": p.payment_method || "CASH",
    "Notes": p.notes || "—",
  }));

  if (!historyRows.length) {
    historyRows.push({
      "S.No": 1,
      "Collection Date": "—",
      "Amount Collected (₹)": 0,
      "Total Collected To-Date (₹)": 0,
      "Remaining Balance (₹)": remaining,
      "Payment Method": "—",
      "Notes": "No collections recorded yet.",
    });
  }

  const wsOverview = XLSX.utils.json_to_sheet(overviewData);
  autoFitColumns(wsOverview, overviewData);

  const wsHistory = XLSX.utils.json_to_sheet(historyRows);
  autoFitColumns(wsHistory, historyRows);

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, wsOverview, "Loan Summary");
  XLSX.utils.book_append_sheet(wb, wsHistory, "Collection History");

  const sanitizedName = String(customer.customer_name || "Customer").replace(/[^a-zA-Z0-9_-]/g, "_");
  const todayStr = new Date().toISOString().slice(0, 10);
  XLSX.writeFile(wb, `Customer_Statement_${sanitizedName}_${todayStr}.xlsx`);
};

/**
 * Export Today's Daily Collections Entry Sheet (Excel)
 */
export const exportDailyCollectionsSheet = (date, dailyList = []) => {
  if (!dailyList || !dailyList.length) {
    alert("No collection records for this date to export.");
    return;
  }

  let totalCollectedToday = 0;
  let paidCustomers = 0;

  const sortedDailyList = [...dailyList].sort((a, b) => {
    const da = new Date(a.finance_date || 0).getTime();
    const db = new Date(b.finance_date || 0).getTime();
    if (da !== db) return da - db;
    const ca = new Date(a.created_at || a.account_created_at || 0).getTime();
    const cb = new Date(b.created_at || b.account_created_at || 0).getTime();
    if (ca !== cb) return ca - cb;
    return String(a.customer_name || "").localeCompare(String(b.customer_name || ""));
  });

  const rows = sortedDailyList.map((c, idx) => {
    const todayAmt = Number(c.today_collection || 0);
    totalCollectedToday += todayAmt;
    if (todayAmt > 0) paidCustomers += 1;

    return {
      "S.No": idx + 1,
      "Collection Date": dateLabel(date),
      "Customer Name": c.customer_name || "—",
      "Mobile Number": c.mobile_number || "—",
      "Total Agreed Return (₹)": Number(c.agreed_total_payable || 0),
      "Already Returned (₹)": Number(c.total_collected || 0),
      "Remaining Balance (₹)": Number(c.remaining || 0),
      "Today's Collection (₹)": todayAmt,
      "Payment Status": todayAmt > 0 ? "PAID TODAY" : "PENDING",
    };
  });

  const worksheet = XLSX.utils.json_to_sheet(rows);
  autoFitColumns(worksheet, rows);

  const summaryStartRow = rows.length + 2;
  XLSX.utils.sheet_add_aoa(
    worksheet,
    [
      ["Selected Date Summary", ""],
      ["Collection Date", dateLabel(date)],
      ["Total Customers", dailyList.length],
      ["Paid Customers", paidCustomers],
      ["Pending Customers", dailyList.length - paidCustomers],
      ["Total Collection (₹)", totalCollectedToday],
    ],
    { origin: `A${summaryStartRow}` },
  );

  // Keep the appended summary readable as well as the detail table.
  const columnWidths = worksheet["!cols"] || [];
  columnWidths[0] = { wch: Math.max(columnWidths[0]?.wch || 12, 24) };
  columnWidths[1] = { wch: Math.max(columnWidths[1]?.wch || 12, 18) };
  worksheet["!cols"] = columnWidths;

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, `Collections ${date}`);
  XLSX.writeFile(workbook, `Daily_Collections_${date}.xlsx`);
};
