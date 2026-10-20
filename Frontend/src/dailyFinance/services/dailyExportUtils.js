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
      ["Unpaid Customers", dailyList.length - paidCustomers],
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

/**
 * Export every available collection date as a separate worksheet.
 * Each worksheet keeps the date rows on the left and its four-item summary on the right.
 */
export const exportAllDailyCollectionsSheets = (dateCollections = []) => {
  const validCollections = dateCollections.filter(({ dailyList }) => Array.isArray(dailyList) && dailyList.length);
  if (!validCollections.length) {
    alert("No collection records available to export.");
    return;
  }

  const workbook = XLSX.utils.book_new();

  validCollections.forEach(({ date, dailyList }) => {
    const sortedDailyList = [...dailyList].sort((a, b) => {
      const da = new Date(a.finance_date || 0).getTime();
      const db = new Date(b.finance_date || 0).getTime();
      if (da !== db) return da - db;
      return String(a.customer_name || "").localeCompare(String(b.customer_name || ""));
    });

    let totalCollected = 0;
    let paidCustomers = 0;
    const rows = sortedDailyList.map((customer, index) => {
      const amount = Number(customer.today_collection || 0);
      totalCollected += amount;
      if (amount > 0) paidCustomers += 1;

      return {
        "S.No": index + 1,
        "Collection Date": dateLabel(date),
        "Customer Name": customer.customer_name || "—",
        "Mobile Number": customer.mobile_number || "—",
        "Total Agreed Return (₹)": Number(customer.agreed_total_payable || 0),
        "Already Returned (₹)": Number(customer.total_collected || 0),
        "Remaining Balance (₹)": Number(customer.remaining || 0),
        "Today's Collection (₹)": amount,
        "Payment Status": amount > 0 ? "PAID TODAY" : "PENDING",
      };
    });

    const worksheet = XLSX.utils.json_to_sheet(rows);
    autoFitColumns(worksheet, rows);
    XLSX.utils.sheet_add_aoa(
      worksheet,
      [
        ["Selected Date Summary", ""],
        ["Collection Date", dateLabel(date)],
        ["Total Customers", dailyList.length],
        ["Paid Customers", paidCustomers],
        ["Unpaid Customers", dailyList.length - paidCustomers],
        ["Total Collection (₹)", totalCollected],
      ],
      { origin: "J1" },
    );

    const columnWidths = worksheet["!cols"] || [];
    columnWidths[0] = { wch: Math.max(columnWidths[0]?.wch || 12, 24) };
    columnWidths[1] = { wch: Math.max(columnWidths[1]?.wch || 12, 18) };
    columnWidths[9] = { wch: 24 };
    columnWidths[10] = { wch: 18 };
    worksheet["!cols"] = columnWidths;

    XLSX.utils.book_append_sheet(workbook, worksheet, `Collections ${date}`.slice(0, 31));
  });

  XLSX.writeFile(workbook, `All_Daily_Collections_${new Date().toISOString().slice(0, 10)}.xlsx`);
};

const getDailyCollectionRows = (dateCollections = []) => dateCollections.flatMap(({ date, dailyList = [] }) =>
  dailyList.map((customer, index) => ({
    "Collection Date": dateLabel(date),
    "S.No": index + 1,
    "Customer Name": customer.customer_name || "—",
    "Mobile Number": customer.mobile_number || "—",
    "Total Agreed Return (₹)": Number(customer.agreed_total_payable || 0),
    "Already Returned (₹)": Number(customer.total_collected || 0),
    "Remaining Balance (₹)": Number(customer.remaining || 0),
    "Collection (₹)": Number(customer.today_collection || 0),
    "Payment Status": Number(customer.today_collection || 0) > 0 ? "PAID" : "PENDING",
  })),
);

const getDailySummaryRows = (dateCollections = []) => dateCollections.map(({ date, dailyList = [] }) => {
  const paidCustomers = dailyList.filter((customer) => Number(customer.today_collection || 0) > 0).length;
  const totalCollection = dailyList.reduce((sum, customer) => sum + Number(customer.today_collection || 0), 0);
  return {
    "Collection Date": dateLabel(date),
    "Total Customers": dailyList.length,
    "Paid Customers": paidCustomers,
    "Unpaid Customers": dailyList.length - paidCustomers,
    "Total Collection (₹)": totalCollection,
  };
});

/** Export option 1: one summary sheet plus one filterable customer-detail sheet. */
export const exportSummaryAndDetailCollections = (dateCollections = []) => {
  const detailRows = getDailyCollectionRows(dateCollections);
  const summaryRows = getDailySummaryRows(dateCollections);
  if (!detailRows.length) {
    alert("No collection records available to export.");
    return;
  }

  const overall = summaryRows.reduce(
    (total, row) => ({
      "Collection Date": "OVERALL TOTAL",
      "Total Customers": total["Total Customers"] + row["Total Customers"],
      "Paid Customers": total["Paid Customers"] + row["Paid Customers"],
      "Unpaid Customers": total["Unpaid Customers"] + row["Unpaid Customers"],
      "Total Collection (₹)": total["Total Collection (₹)"] + row["Total Collection (₹)"],
    }),
    { "Collection Date": "OVERALL TOTAL", "Total Customers": 0, "Paid Customers": 0, "Unpaid Customers": 0, "Total Collection (₹)": 0 },
  );

  const workbook = XLSX.utils.book_new();
  const summaryData = [...summaryRows, overall];
  const summarySheet = XLSX.utils.json_to_sheet(summaryData);
  autoFitColumns(summarySheet, summaryData);
  XLSX.utils.book_append_sheet(workbook, summarySheet, "Date Summary");

  const detailSheet = XLSX.utils.json_to_sheet(detailRows);
  autoFitColumns(detailSheet, detailRows);
  detailSheet["!autofilter"] = { ref: detailSheet["!ref"] };
  XLSX.utils.book_append_sheet(workbook, detailSheet, "All Collections");

  XLSX.writeFile(workbook, `Daily_Collections_Summary_Detail_${new Date().toISOString().slice(0, 10)}.xlsx`);
};

/** Export option 2: one filterable sheet with the overall summary above the table. */
export const exportFilterableCollections = (dateCollections = []) => {
  const detailRows = getDailyCollectionRows(dateCollections);
  const summaryRows = getDailySummaryRows(dateCollections);
  if (!detailRows.length) {
    alert("No collection records available to export.");
    return;
  }

  const filterableRows = detailRows.map((row) => ({
    ...row,
    "Paid Flag": row["Payment Status"] === "PAID" ? 1 : 0,
  }));

  const worksheet = XLSX.utils.aoa_to_sheet([
    ["All Date Collections", ""],
    ["Total Customers", ""],
    ["Paid Customers", ""],
    ["Unpaid Customers", ""],
    ["Total Collection (₹)", ""],
    [],
  ]);
  XLSX.utils.sheet_add_json(worksheet, filterableRows, { origin: "A7" });
  autoFitColumns(worksheet, filterableRows);

  const firstDataRow = 8;
  const lastDataRow = firstDataRow + filterableRows.length - 1;

  // Alternate the fill for each date group so date changes are easy to scan.
  let previousDate = null;
  let dateGroupIndex = -1;
  for (let rowNumber = firstDataRow; rowNumber <= lastDataRow; rowNumber += 1) {
    const dateCell = worksheet[`A${rowNumber}`];
    const rowDate = dateCell?.v;
    const isDateGroupStart = rowDate !== previousDate;
    if (rowDate !== previousDate) {
      previousDate = rowDate;
      dateGroupIndex += 1;
    }
    const fillColor = dateGroupIndex % 2 === 0 ? "EAF4FF" : "F0FDF4";
    for (let column = 0; column <= 8; column += 1) {
      const cellAddress = XLSX.utils.encode_cell({ r: rowNumber - 1, c: column });
      if (worksheet[cellAddress]) {
        worksheet[cellAddress].s = {
          fill: { patternType: "solid", fgColor: { rgb: fillColor } },
          border: isDateGroupStart
            ? { top: { style: "medium", color: { rgb: "2563EB" } } }
            : undefined,
        };
      }
    }
    if (dateCell) {
      dateCell.s = {
        fill: { patternType: "solid", fgColor: { rgb: fillColor } },
        font: { bold: true },
        border: isDateGroupStart
          ? { top: { style: "medium", color: { rgb: "2563EB" } } }
          : undefined,
      };
    }
  }

  // Keep a compact date-wise summary on the right without breaking the filterable table.
  worksheet.L1 = { t: "s", v: "Date-wise Summary" };
  XLSX.utils.sheet_add_json(worksheet, getDailySummaryRows(dateCollections), { origin: "L2" });

  worksheet.B2 = { t: "n", f: `SUBTOTAL(103,C${firstDataRow}:C${lastDataRow})` };
  worksheet.B3 = { t: "n", f: `SUBTOTAL(109,J${firstDataRow}:J${lastDataRow})` };
  worksheet.B4 = { t: "n", f: "B2-B3" };
  worksheet.B5 = { t: "n", f: `SUBTOTAL(109,H${firstDataRow}:H${lastDataRow})` };

  worksheet["!autofilter"] = { ref: `A7:J${lastDataRow}` };
  const columnWidths = worksheet["!cols"] || [];
  columnWidths[0] = { wch: Math.max(columnWidths[0]?.wch || 12, 18) };
  columnWidths[1] = { wch: Math.max(columnWidths[1]?.wch || 12, 8) };
  columnWidths[9] = { wch: 12, hidden: true };
  columnWidths[11] = { wch: 18 };
  columnWidths[12] = { wch: 16 };
  columnWidths[13] = { wch: 14 };
  columnWidths[14] = { wch: 16 };
  columnWidths[15] = { wch: 20 };
  worksheet["!cols"] = columnWidths;

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "All Collections");
  workbook.Workbook = workbook.Workbook || {};
  workbook.Workbook.CalcPr = { fullCalcOnLoad: true, forceFullCalc: true, calcMode: "auto" };
  XLSX.writeFile(workbook, `Daily_Collections_Filterable_${new Date().toISOString().slice(0, 10)}.xlsx`, { cellStyles: true });
};

/** Export all collections grouped by month, with clearly separated date sections. */
export const exportMonthlyGroupedCollections = (dateCollections = []) => {
  const validCollections = dateCollections.filter(({ dailyList = [] }) => dailyList.length);
  if (!validCollections.length) {
    alert("No collection records available to export.");
    return;
  }

  const monthGroups = validCollections.reduce((groups, collection) => {
    const monthKey = String(collection.date).slice(0, 7);
    if (!groups[monthKey]) groups[monthKey] = [];
    groups[monthKey].push(collection);
    return groups;
  }, {});

  const workbook = XLSX.utils.book_new();
  Object.entries(monthGroups).sort(([a], [b]) => a.localeCompare(b)).forEach(([monthKey, collections]) => {
    const sheetRows = [
      ["Monthly Daily Collections", monthKey],
      ["Report Month", monthKey],
      [],
      ["Date", "Total Customers", "Paid Customers", "Unpaid Customers", "Total Collection (₹)"],
    ];

    const monthSummary = { customers: 0, paid: 0, pending: 0, collection: 0 };
    collections.sort((a, b) => String(a.date).localeCompare(String(b.date)));

    collections.forEach(({ date, dailyList = [] }) => {
      const paidCustomers = dailyList.filter((customer) => Number(customer.today_collection || 0) > 0).length;
      const totalCollection = dailyList.reduce((sum, customer) => sum + Number(customer.today_collection || 0), 0);
      monthSummary.customers += dailyList.length;
      monthSummary.paid += paidCustomers;
      monthSummary.pending += dailyList.length - paidCustomers;
      monthSummary.collection += totalCollection;

      sheetRows.push([]);
      sheetRows.push([`COLLECTION DATE: ${dateLabel(date)}`, "", "", "", ""]);
      sheetRows.push([
        "S.No",
        "Customer Name",
        "Mobile Number",
        "Total Agreed Return (₹)",
        "Already Returned (₹)",
        "Remaining Balance (₹)",
        "Collection (₹)",
        "Payment Status",
      ]);

      dailyList.forEach((customer, index) => {
        const amount = Number(customer.today_collection || 0);
        sheetRows.push([
          index + 1,
          customer.customer_name || "—",
          customer.mobile_number || "—",
          Number(customer.agreed_total_payable || 0),
          Number(customer.total_collected || 0),
          Number(customer.remaining || 0),
          amount,
          amount > 0 ? "PAID" : "PENDING",
        ]);
      });

      sheetRows.push([
        "DATE TOTAL",
        `${dailyList.length} customers`,
        `Paid: ${paidCustomers} | Unpaid: ${dailyList.length - paidCustomers}`,
        "",
        "",
        "",
        totalCollection,
        "",
      ]);
    });

    sheetRows[0] = [
      "MONTH TOTAL",
      `${monthSummary.customers} customers | Paid: ${monthSummary.paid} | Unpaid: ${monthSummary.pending}`,
      "",
      "",
      monthSummary.collection,
    ];

    const worksheet = XLSX.utils.aoa_to_sheet(sheetRows);
    const rightSummaryRows = Array.from({ length: sheetRows.length }, () => ["", ""]);
    rightSummaryRows[0] = ["DATE-WISE SUMMARY", ""];
    let summaryIndex = 0;
    const mergedRanges = [];
    sheetRows.forEach((row, rowIndex) => {
      if (typeof row[0] !== "string" || !row[0].startsWith("COLLECTION DATE:")) return;
      const { date, dailyList = [] } = collections[summaryIndex++];
      const paidCustomers = dailyList.filter((customer) => Number(customer.today_collection || 0) > 0).length;
      const totalCollection = dailyList.reduce((sum, customer) => sum + Number(customer.today_collection || 0), 0);
      rightSummaryRows[rowIndex] = [`DATE: ${dateLabel(date)}`, ""];
      rightSummaryRows[rowIndex + 1] = ["Total customers", dailyList.length];
      rightSummaryRows[rowIndex + 2] = ["Paid customers", paidCustomers];
      rightSummaryRows[rowIndex + 3] = ["Unpaid customers", dailyList.length - paidCustomers];
      rightSummaryRows[rowIndex + 4] = ["Total collection (₹)", totalCollection];
      mergedRanges.push(
        { s: { r: rowIndex, c: 0 }, e: { r: rowIndex, c: 7 } },
        { s: { r: rowIndex, c: 9 }, e: { r: rowIndex, c: 10 } },
      );
    });
    XLSX.utils.sheet_add_aoa(worksheet, rightSummaryRows, { origin: "J1" });
    worksheet["!merges"] = mergedRanges;

    let dateSectionIndex = -1;
    let activeDate = null;
    sheetRows.forEach((row, rowIndex) => {
      const firstValue = row[0];
      const isDateHeading = typeof firstValue === "string" && firstValue.startsWith("COLLECTION DATE:");
      const isTableHeader = firstValue === "S.No";
      const isDateTotal = firstValue === "DATE TOTAL";
      if (isDateHeading) {
        activeDate = firstValue;
        dateSectionIndex += 1;
      }

      const fillColor = dateSectionIndex % 2 === 0 ? "EAF4FF" : "F0FDF4";
      let rowStyle = null;
      if (rowIndex === 0) rowStyle = { fill: "1D4ED8", fontColor: "FFFFFF", bold: true };
      if (isDateHeading) rowStyle = { fill: "BFDBFE", fontColor: "1E3A8A", bold: true, fontSize: 16, centered: true };
      if (isTableHeader) rowStyle = { fill: "DBEAFE", fontColor: "1E3A8A", bold: true };
      if (isDateTotal) rowStyle = { fill: "DCFCE7", fontColor: "166534", bold: true };
      if (!rowStyle && activeDate && typeof firstValue === "number") {
        rowStyle = { fill: fillColor, fontColor: "0F172A", bold: false };
      }

      if (rowStyle) {
        for (let column = 0; column < 8; column += 1) {
          const address = XLSX.utils.encode_cell({ r: rowIndex, c: column });
          if (worksheet[address]) {
            worksheet[address].s = {
              fill: { patternType: "solid", fgColor: { rgb: rowStyle.fill } },
              font: { bold: rowStyle.bold, sz: rowStyle.fontSize || 11, color: { rgb: rowStyle.fontColor } },
              alignment: rowStyle.centered ? { horizontal: "center", vertical: "center" } : undefined,
              border: isDateHeading ? { top: { style: "medium", color: { rgb: "2563EB" } } } : undefined,
            };
          }
        }
      }
      if (isDateHeading) {
        const rightDateCell = worksheet[`J${rowIndex + 1}`];
        if (rightDateCell) {
          rightDateCell.s = {
            fill: { patternType: "solid", fgColor: { rgb: "BFDBFE" } },
            font: { bold: true, sz: 14, color: { rgb: "1E3A8A" } },
            alignment: { horizontal: "center", vertical: "center" },
          };
        }
        worksheet["!rows"] = worksheet["!rows"] || [];
        worksheet["!rows"][rowIndex] = { hpt: 28 };
      }
    });

    worksheet["J1"].s = {
      fill: { patternType: "solid", fgColor: { rgb: "1D4ED8" } },
      font: { bold: true, sz: 13, color: { rgb: "FFFFFF" } },
      alignment: { horizontal: "center", vertical: "center" },
    };

    worksheet["!cols"] = [
      { wch: 16 },
      { wch: 28 },
      { wch: 18 },
      { wch: 24 },
      { wch: 24 },
      { wch: 24 },
      { wch: 18 },
      { wch: 16 },
      { wch: 3 },
      { wch: 24 },
      { wch: 18 },
    ];
    XLSX.utils.book_append_sheet(workbook, worksheet, `Collections ${monthKey}`.slice(0, 31));
  });

  XLSX.writeFile(workbook, `Monthly_Grouped_Collections_${new Date().toISOString().slice(0, 10)}.xlsx`, { cellStyles: true });
};
