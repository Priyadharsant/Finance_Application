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

  const rows = report.customers.map((row, idx) => {
    const agreed = Number(row.agreed_total_payable || 0);
    const collected = Number(row.total_collected || 0);
    const progressPct = agreed > 0 ? ((collected / agreed) * 100).toFixed(1) + "%" : "0%";

    return {
      "S.No": idx + 1,
      "Customer Name": row.customer_name || "—",
      "Finance Date": dateLabel(row.finance_date),
      "Gross Finance (₹)": Number(row.gross_finance_amount || 0),
      "Upfront Interest (₹)": Number(row.initial_deduction || 0),
      "Amount Given / Disbursed (₹)": Number(row.net_disbursement || 0),
      "Total Agreed Return (₹)": agreed,
      "Period Collected (₹)": Number(row.period_collected || 0),
      "Total Collected To-Date (₹)": collected,
      "Remaining Receivable (₹)": Number(row.remaining || 0),
      "Recovery %": progressPct,
      "Profit Earned (₹)": Number(row.profit || 0),
      "Status": row.status || "ACTIVE",
    };
  });

  // Append Totals Summary Row
  if (report.totals) {
    const t = report.totals;
    const totalAgreed = Number(t.totalReturn || 0);
    const totalReturned = Number(t.returned || 0);
    const overallPct = totalAgreed > 0 ? ((totalReturned / totalAgreed) * 100).toFixed(1) + "%" : "0%";

    rows.push({
      "S.No": "TOTAL",
      "Customer Name": "SUMMARY TOTALS",
      "Finance Date": `${report.from} to ${report.to}`,
      "Gross Finance (₹)": Number(t.financeAmount || 0),
      "Upfront Interest (₹)": Number(t.profit || 0),
      "Amount Given / Disbursed (₹)": Number(t.given || 0),
      "Total Agreed Return (₹)": totalAgreed,
      "Period Collected (₹)": Number(t.periodCollected || 0),
      "Total Collected To-Date (₹)": totalReturned,
      "Remaining Receivable (₹)": Number(t.remaining || 0),
      "Recovery %": overallPct,
      "Profit Earned (₹)": Number(t.profit || 0),
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

  let totalGross = 0;
  let totalDeduction = 0;
  let totalDisbursed = 0;
  let totalAgreed = 0;
  let totalCollected = 0;
  let totalRemaining = 0;

  const rows = customers.map((c, idx) => {
    const gross = Number(c.gross_finance_amount || 0);
    const deduction = Number(c.initial_deduction || 0);
    const disbursed = Number(c.net_disbursement || 0);
    const agreed = Number(c.agreed_total_payable || 0);
    const collected = Number(c.total_collected || 0);
    const remaining = Number(c.outstanding_receivable ?? c.remaining ?? (agreed - collected));

    totalGross += gross;
    totalDeduction += deduction;
    totalDisbursed += disbursed;
    totalAgreed += agreed;
    totalCollected += collected;
    totalRemaining += remaining;

    const progressPct = agreed > 0 ? ((collected / agreed) * 100).toFixed(1) + "%" : "0%";

    return {
      "S.No": idx + 1,
      "Customer Name": c.customer_name || "—",
      "Mobile Number": c.mobile_number || "—",
      "Address": c.address || "—",
      "Finance Date": dateLabel(c.finance_date),
      "Gross Finance (₹)": gross,
      "Upfront Interest (₹)": deduction,
      "Net Disbursed (₹)": disbursed,
      "Agreed Total Return (₹)": agreed,
      "Total Collected (₹)": collected,
      "Remaining Balance (₹)": remaining,
      "Recovery %": progressPct,
      "Profit (₹)": deduction,
      "Status": c.status || "ACTIVE",
      "Notes": c.notes || "",
    };
  });

  // Summary Row
  rows.push({
    "S.No": "TOTAL",
    "Customer Name": "PORTFOLIO TOTALS",
    "Mobile Number": `Accounts: ${customers.length}`,
    "Address": "",
    "Finance Date": "",
    "Gross Finance (₹)": totalGross,
    "Upfront Interest (₹)": totalDeduction,
    "Net Disbursed (₹)": totalDisbursed,
    "Agreed Total Return (₹)": totalAgreed,
    "Total Collected (₹)": totalCollected,
    "Remaining Balance (₹)": totalRemaining,
    "Recovery %": totalAgreed > 0 ? ((totalCollected / totalAgreed) * 100).toFixed(1) + "%" : "0%",
    "Profit (₹)": totalDeduction,
    "Status": "ALL",
    "Notes": "",
  });

  const todayStr = new Date().toISOString().slice(0, 10);
  exportToExcel(rows, `Daily_Finance_Total_Portfolio_${todayStr}`, "Portfolio Summary");
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
    { Property: "Statement Export Date", Value: new Date().toLocaleDateString("en-IN") },
  ];

  // Sheet 2: Collections History
  const historyRows = collections.map((p, idx) => ({
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
  let totalRemainingDue = 0;

  const rows = dailyList.map((c, idx) => {
    const todayAmt = Number(c.today_collection || 0);
    const rem = Number(c.remaining || 0);
    totalCollectedToday += todayAmt;
    totalRemainingDue += rem;

    return {
      "S.No": idx + 1,
      "Customer Name": c.customer_name || "—",
      "Mobile Number": c.mobile_number || "—",
      "Total Agreed Return (₹)": Number(c.agreed_total_payable || 0),
      "Already Returned (₹)": Number(c.total_collected || 0),
      "Remaining Balance (₹)": rem,
      "Today's Collection (₹)": todayAmt,
      "Payment Status": todayAmt > 0 ? "PAID TODAY" : "PENDING",
    };
  });

  rows.push({
    "S.No": "TOTAL",
    "Customer Name": "DAY TOTALS",
    "Mobile Number": `Customers: ${dailyList.length}`,
    "Total Agreed Return (₹)": "",
    "Already Returned (₹)": "",
    "Remaining Balance (₹)": totalRemainingDue,
    "Today's Collection (₹)": totalCollectedToday,
    "Payment Status": "",
  });

  exportToExcel(rows, `Daily_Collections_${date}`, `Collections ${date}`);
};
