import * as XLSX from "xlsx";
import { dateLabel } from "./autoFinanceApi";

export const autoFitColumns = (worksheet, data) => {
  if (!data || !data.length) return;
  const keys = Object.keys(data[0]);
  const wscols = keys.map(key => {
    const maxDataLength = data.reduce((max, row) => {
      const val = row[key];
      const valLen = val ? val.toString().length : 0;
      return Math.max(max, valLen);
    }, key.length);
    return { wch: Math.min(maxDataLength + 2, 50) };
  });
  worksheet["!cols"] = wscols;
};

export const exportToExcel = (data, fileName) => {
  const worksheet = XLSX.utils.json_to_sheet(data);
  autoFitColumns(worksheet, data);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Sheet1");
  XLSX.writeFile(workbook, `${fileName}.xlsx`);
};

export const exportTotalPortfolio = (loans) => {
  const exportData = loans.map(l => ({
    "Customer Name": `${l.first_name} ${l.last_name}`,
    "Customer Code": l.customer_code,
    "Phone": l.phone || "",
    "Vehicle": `${l.make} ${l.model}`,
    "Reg No": l.registration_number,
    "Loan Amount": Number(l.loan_amount),
    "Interest Rate (%)": Number(l.interest_rate),
    "Tenure (Months)": Number(l.tenure_months),
    "Start Date": dateLabel(l.start_date),
    "End Date": dateLabel(l.end_date),
    "Total Collected": Number(l.total_paid || 0),
    "Pending Dues": Number(l.pending_dues_count || 0),
    "Status": l.status,
  }));
  exportToExcel(exportData, `Total_Portfolio_Report_${new Date().toISOString().slice(0, 10)}`);
};

export const exportCustomersList = (customers) => {
  const exportData = customers.map(c => ({
    "Customer Code": c.customer_code,
    "First Name": c.first_name,
    "Last Name": c.last_name,
    "Phone": c.phone || "",
    "Email": c.email || "",
    "City": c.city || "",
    "State": c.state || "",
    "Address": c.address || "",
  }));
  exportToExcel(exportData, `Auto_Customers_${new Date().toISOString().slice(0, 10)}`);
};

export const exportIndividualLoan = (loan) => {
  if (!loan || !loan.schedules) return;

  const totalCollected = loan.schedules.reduce(
    (acc, s) => acc + parseFloat(s.total_cash_collected || s.collected_amount || 0),
    0
  );

  const fees = loan.loan.fees_details || {};
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

  const detailsData = [
    { "Category": "Customer Name", "Value": `${loan.loan.first_name} ${loan.loan.last_name}` },
    { "Category": "Customer Code", "Value": loan.loan.customer_code || "" },
    { "Category": "Phone", "Value": loan.loan.phone || "" },
    { "Category": "Address", "Value": `${loan.loan.address || ""}, ${loan.loan.city || ""}, ${loan.loan.state || ""}`.replace(/^, | ,|, $/g, "") },
    { "Category": "Vehicle", "Value": `${loan.loan.make} ${loan.loan.model} (${loan.loan.year || "N/A"})` },
    { "Category": "Registration No", "Value": loan.loan.registration_number || "PENDING" },
    { "Category": "Chassis No", "Value": loan.loan.chassis_number || "N/A" },
    { "Category": "Engine No", "Value": loan.loan.engine_number || "N/A" },
    { "Category": "Loan Amount", "Value": Number(loan.loan.loan_amount) },
    { "Category": "Income Due", "Value": Number(fees.incomeDue || 0) },
    { "Category": "Document Fee", "Value": Number(fees.documentFee || 0) },
    { "Category": "Hire Purchase", "Value": Number(fees.hirePurchase || 0) },
    { "Category": "Tax Amount", "Value": Number(fees.taxAmount || 0) },
    { "Category": "Insurance", "Value": Number(fees.insurance || 0) },
    { "Category": "Insurance Fine", "Value": Number(fees.insuranceFine || 0) },
    { "Category": "Green Tax", "Value": Number(fees.greenTax || 0) },
    { "Category": "Fine", "Value": Number(fees.fine || 0) },
    { "Category": "National Tax", "Value": Number(fees.nationalTax || 0) },
    { "Category": "Permit", "Value": Number(fees.permit || 0) },
    { "Category": "Brokerage (Customer)", "Value": Number(fees.brokerageCustomer || 0) },
    { "Category": "Brokerage (By Hand)", "Value": Number(fees.brokerageHand || 0) },
    { "Category": "In-Hand Amount", "Value": Number(loan.loan.loan_amount) - totalDeductions },
    { "Category": "Interest Rate (%)", "Value": Number(loan.loan.interest_rate) },
    { "Category": "Tenure (Months)", "Value": Number(loan.loan.tenure_months) },
    { "Category": "Start Date", "Value": dateLabel(loan.loan.start_date) },
    { "Category": "End Date", "Value": dateLabel(loan.loan.end_date) },
    { "Category": "Total Collected", "Value": Number(totalCollected) },
  ];

  const scheduleData = loan.schedules.map(s => ({
    "Inst #": s.installment_number,
    "Due Date": dateLabel(s.due_date),
    "Principal": Number(s.principal_component),
    "Interest": Number(s.interest_component),
    "Total EMI": Number(s.total_emi),
    "Paid Amount": Number(s.collected_amount || 0),
    "Paid Principal": Number(s.paid_principal || 0),
    "Paid Interest": Number(s.paid_interest || 0),
    "Status": s.status,
  }));

  let paymentsData = [];
  if (loan.payments && loan.payments.length > 0) {
    paymentsData = loan.payments.map(p => ({
      "Payment ID": p.id,
      "Date": dateLabel(p.payment_date),
      "Amount": Number(p.amount_paid),
      "Principal Component": Number(p.principal_paid),
      "Interest Component": Number(p.interest_paid),
      "Extra Principal": Number(p.extra_principal_paid),
      "Method": p.payment_method,
      "Reference No": p.reference_number || "—",
    }));
  } else {
    paymentsData = [{ "Message": "No payments recorded yet." }];
  }

  const ws1 = XLSX.utils.json_to_sheet(detailsData);
  autoFitColumns(ws1, detailsData);
  const ws2 = XLSX.utils.json_to_sheet(scheduleData);
  autoFitColumns(ws2, scheduleData);
  const ws3 = XLSX.utils.json_to_sheet(paymentsData);
  autoFitColumns(ws3, paymentsData);

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, ws1, "Customer Details");
  XLSX.utils.book_append_sheet(workbook, ws2, "EMI Schedule");
  XLSX.utils.book_append_sheet(workbook, ws3, "Payment History");

  XLSX.writeFile(
    workbook,
    `Full_Report_${loan.loan.customer_code || "Loan"}_${loan.loan.registration_number || "Vehicle"}.xlsx`
  );
};
