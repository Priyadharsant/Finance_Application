import React, { useState, useEffect, useRef, useMemo } from "react";
import {
  Table,
  Save,
  RefreshCw,
  Search,
  ArrowLeft,
  Key,
  CheckCircle2,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  Database,
  X,
  FileSpreadsheet,
  Users,
  Landmark,
  UserRound,
  Calendar,
  Receipt,
  Globe,
  Lock,
  Trash2,
  Archive,
  CarFront,
  Eye,
  AlertTriangle,
} from "lucide-react";
import { getApiBaseUrl } from "../apiConfig.js";

// Core essential business fields per table
const ESSENTIAL_COLUMNS_MAP = {
  daily_finance_accounts: [
    "customer_name",
    "gross_finance_amount",
    "interest_value",
    "interest_type",
    "initial_deduction",
    "agreed_total_payable",
    "daily_agreed_due",
    "mobile_number",
    "finance_date",
    "status",
    "notes",
  ],
  daily_finance_payments: [
    "customer_name",
    "amount",
    "loan_remaining_balance",
    "loan_status",
    "collection_date",
    "payment_method",
    "loan_total_payable",
    "status",
    "notes",
  ],
  autofinance_loans: [
    "customer_name",
    "customer_phone",
    "registration_number",
    "loan_amount",
    "interest_rate",
    "total_amount",
    "tenure_months",
    "disbursement_date",
    "status",
  ],
  deleted_loans_archive: [
    "loan_id",
    "loan_type",
    "customer_name",
    "customer_phone",
    "principal_amount",
    "total_collected",
    "deleted_at",
    "deleted_by",
    "deletion_reason",
  ],
  autofinance_customers: [
    "customer_code",
    "first_name",
    "last_name",
    "phone",
    "city",
    "address",
    "alternate_phone",
  ],
  autofinance_emi_schedules: [
    "customer_name",
    "installment_number",
    "due_date",
    "total_emi",
    "collected_amount",
    "status",
  ],
  expenses: [
    "expense_date",
    "category",
    "expense_type",
    "amount",
    "description",
  ],
  partner_capital_amounts: [
    "partner_name",
    "fund_source_type",
    "lender_name",
    "amount",
    "interest_rate",
    "effective_date",
    "status",
    "notes",
  ],
  partner_capital_transactions: [
    "partner_name",
    "transaction_type",
    "fund_source_type",
    "lender_name",
    "amount",
    "effective_date",
    "status",
    "notes",
  ],
};

// Friendly column labels
const COLUMN_LABEL_MAP = {
  id: "ID",
  partner_name: "Partner Name",
  customer_name: "Customer Name",
  gross_finance_amount: "Total Loan Amount",
  fund_source_type: "Capital Source",
  lender_name: "Lender / Source",
  interest_rate: "Interest %",
  amount: "Amount",
  amount_paid: "Collected Amount",
  collected_amount: "Collected Amount",
  total_emi: "Total EMI",
  installment_number: "EMI #",
  due_date: "Due Date",
  payment_date: "Payment Date",
  collection_date: "Collection Date",
  finance_date: "Finance Date",
  customer_code: "Customer Code",
  first_name: "First Name",
  last_name: "Last Name",
  phone: "Phone",
  mobile_number: "Mobile Number",
  alternate_phone: "Alt Phone",
  city: "City",
  address: "Address",
  status: "Status",
  payment_method: "Payment Method",
  reference_number: "Ref Number",
  expense_date: "Expense Date",
  category: "Category",
  expense_type: "Expense Type",
  interest_value: "Interest Value",
  interest_type: "Interest Type",
  initial_deduction: "Upfront Interest (Pitipu)",
  agreed_total_payable: "Total Return",
  daily_agreed_due: "Daily Due",
  loan_amount: "Loan Amount",
  total_amount: "Total Return",
  loan_total_payable: "Total Payable",
  loan_remaining_balance: "Remaining Balance",
  loan_status: "Loan Status",
  tenure_months: "Tenure (Months)",
  disbursement_date: "Disbursed Date",
  customer_phone: "Phone",
  registration_number: "Reg Number",
  principal_component: "Principal Component",
  interest_component: "Interest Component",
  description: "Description",
  notes: "Notes",
  transaction_type: "Txn Type",
  transaction_date: "Txn Date",
  direction: "Direction",
  source_module: "Source Module",
  loan_id: "Loan ID",
  loan_type: "Loan Type",
  principal_amount: "Principal / Disbursed",
  total_collected: "Total Collected",
  deleted_at: "Deleted Date",
  deleted_by: "Deleted By",
  deletion_reason: "Reason",
  details_json: "Archived Details",
};

const getTableIcon = (tableName) => {
  switch (tableName) {
    case "daily_finance_accounts":
      return Users;
    case "daily_finance_payments":
      return Receipt;
    case "autofinance_customers":
      return UserRound;
    case "autofinance_emi_schedules":
      return Calendar;
    case "expenses":
      return Receipt;
    case "partner_capital_amounts":
      return Landmark;
    case "partner_capital_transactions":
      return Database;
    case "autofinance_loans":
      return CarFront;
    case "deleted_loans_archive":
      return Archive;
    default:
      return Table;
  }
};

export default function ExcelTableEditorView({ onClose }) {
  const [tables, setTables] = useState([]);
  const [selectedTable, setSelectedTable] = useState("");
  const [tableData, setTableData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(50);
  const [sortBy, setSortBy] = useState(null);
  const [sortOrder, setSortOrder] = useState("asc");

  // Editing state: { [rowId]: { [colName]: newValue } }
  const [modifiedRows, setModifiedRows] = useState({});
  const [editingCell, setEditingCell] = useState(null); // { rowId, colName }
  const [savingRows, setSavingRows] = useState({});
  const [isSavingAll, setIsSavingAll] = useState(false);
  const [notification, setNotification] = useState(null);
  const editInputRef = useRef(null);
  const [deleteModal, setDeleteModal] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteReason, setDeleteReason] = useState("");
  const [viewArchiveModal, setViewArchiveModal] = useState(null);
  const [violationModal, setViolationModal] = useState(null);

  const getAuthToken = () => localStorage.getItem("kambam_finance_app_auth") || "";

  // 1. Fetch tables list
  useEffect(() => {
    fetchTables();
  }, []);

  const fetchTables = async () => {
    try {
      const apiBase = getApiBaseUrl();
      const res = await fetch(`${apiBase}/table-editor/tables`, {
        headers: { Authorization: `Bearer ${getAuthToken()}` },
      });
      const data = await res.json();
      if (data.success && data.tables?.length > 0) {
        setTables(data.tables);
        if (!selectedTable) {
          const defaultTbl =
            data.tables.find((t) => t.name === "daily_finance_accounts") || data.tables[0];
          setSelectedTable(defaultTbl.name);
        }
      }
    } catch (err) {
      showNotice("error", "Failed to load database tables: " + err.message);
    }
  };

  // 2. Fetch data for selected table
  useEffect(() => {
    if (selectedTable) {
      loadTableData(selectedTable, page, limit, search, sortBy, sortOrder);
    }
  }, [selectedTable, page, limit, sortBy, sortOrder]);

  const loadTableData = async (tableName, p, l, s, sb, so) => {
    setLoading(true);
    setModifiedRows({});
    setEditingCell(null);
    try {
      const params = new URLSearchParams({
        page: p,
        limit: l,
      });
      if (s) params.append("search", s);
      if (sb) {
        params.append("sortBy", sb);
        params.append("sortOrder", so);
      }

      const apiBase = getApiBaseUrl();
      const res = await fetch(`${apiBase}/table-editor/data/${tableName}?${params.toString()}`, {
        headers: { Authorization: `Bearer ${getAuthToken()}` },
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to load table data");
      }
      setTableData(data);
    } catch (err) {
      showNotice("error", err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setPage(1);
    loadTableData(selectedTable, 1, limit, search, sortBy, sortOrder);
  };

  const showNotice = (type, text) => {
    setNotification({ type, text });
    setTimeout(() => setNotification(null), 3500);
  };

  // Sort toggle
  const handleSort = (colName) => {
    if (sortBy === colName) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortBy(colName);
      setSortOrder("asc");
    }
  };

  // Compute visible columns: ALWAYS ESSENTIAL, ordered logically, excluding 'id'
  const visibleColumns = useMemo(() => {
    if (!tableData?.columns) return [];

    const columnsWithoutId = tableData.columns.filter(
      (c) => c.column_name.toLowerCase() !== "id" && !c.is_primary
    );

    const essentialList = ESSENTIAL_COLUMNS_MAP[selectedTable];
    if (essentialList) {
      const orderMap = new Map();
      essentialList.forEach((colName, idx) => orderMap.set(colName.toLowerCase(), idx));

      const matched = columnsWithoutId.filter((c) => orderMap.has(c.column_name.toLowerCase()));
      matched.sort(
        (a, b) => orderMap.get(a.column_name.toLowerCase()) - orderMap.get(b.column_name.toLowerCase())
      );
      return matched.length > 0 ? matched : columnsWithoutId;
    }

    return columnsWithoutId.slice(0, 8);
  }, [tableData, selectedTable]);

  // Check if a cell is editable
  const isCellEditable = (colName, isPK, row) => {
    if (isPK) return false;
    if (selectedTable === "deleted_loans_archive") return false;
    if (
      colName === "id" ||
      colName === "customer_code" ||
      colName === "installment_number" ||
      colName === "net_disbursement" ||
      colName === "loan_remaining_balance" ||
      colName === "loan_total_payable" ||
      colName === "loan_status"
    ) {
      return false;
    }

    if (
      colName === "partner_name" &&
      selectedTable !== "partner_capital_amounts" &&
      selectedTable !== "global_partners"
    ) {
      return false;
    }
    if (
      selectedTable === "partner_capital_amounts" &&
      colName === "fund_source_type"
    ) {
      return false;
    }
    if (
      selectedTable === "partner_capital_amounts" &&
      colName === "lender_name" &&
      row?.fund_source_type === "OWN"
    ) {
      return false;
    }
    return true;
  };

  const handleCellClick = (rowId, colName, row) => {
    const colDef = tableData?.columns.find((c) => c.column_name === colName);
    const targetRow =
      row || tableData?.rows.find((r) => String(r[tableData.primaryKey || "id"]) === String(rowId));
    if (!isCellEditable(colName, colDef?.is_primary, targetRow)) return;
    setEditingCell({ rowId, colName });
  };

  useEffect(() => {
    if (editingCell && editInputRef.current) {
      editInputRef.current.focus();
      editInputRef.current.select();
    }
  }, [editingCell]);

  const handleCellChange = (rowId, colName, value) => {
    setModifiedRows((prev) => ({
      ...prev,
      [rowId]: {
        ...prev[rowId],
        [colName]: value,
      },
    }));
  };

  const handleCellBlur = () => {
    setEditingCell(null);
  };

  const handleCellKeyDown = (e, rowId, colName) => {
    if (e.key === "Enter") {
      setEditingCell(null);
    } else if (e.key === "Escape") {
      setModifiedRows((prev) => {
        const next = { ...prev };
        if (next[rowId]) {
          delete next[rowId][colName];
          if (Object.keys(next[rowId]).length === 0) delete next[rowId];
        }
        return next;
      });
      setEditingCell(null);
    }
  };

  // Save / Update single row
  const saveRow = async (row) => {
    const pkCol = tableData?.primaryKey || "id";
    const rowId = row[pkCol];
    if (savingRows[rowId]) return;
    const changes = modifiedRows[rowId];
    if (!changes || Object.keys(changes).length === 0) return;

    // Validate daily collection amount against remaining loan balance
    if (selectedTable === "daily_finance_payments" && changes.amount !== undefined) {
      const remaining = Number(row.loan_remaining_balance || 0);
      const curAmt = Number(row.amount || 0);
      const maxAllowed = remaining + curAmt;
      const newAmt = Number(changes.amount);

      if (newAmt < 0) {
        setViolationModal({
          title: "Violation: Negative Amount Not Permitted",
          message: "Daily collection payment amount cannot be negative.",
          details: [
            { label: "Customer Name", value: row.customer_name || row.finance_id || `#${rowId}` },
            { label: "Field", value: "Collection Amount (₹)" },
            { label: "Entered Value", value: `₹${newAmt}` }
          ],
          hint: "Please enter ₹0 or a positive collection value.",
          onRevert: () => {
            setModifiedRows((prev) => {
              const next = { ...prev };
              if (next[rowId]) {
                delete next[rowId].amount;
                if (Object.keys(next[rowId]).length === 0) delete next[rowId];
              }
              return next;
            });
            setViolationModal(null);
          }
        });
        showNotice("error", "Violation: Payment amount cannot be negative.");
        return;
      }

      if (newAmt > maxAllowed + 0.001) {
        setViolationModal({
          title: "Violation Prevented: Payment Exceeds Remaining Balance",
          message: `The entered payment amount (₹${newAmt.toLocaleString("en-IN")}) exceeds the total remaining balance of this loan.`,
          details: [
            { label: "Customer Name", value: row.customer_name || row.finance_id || `#${rowId}` },
            { label: "Current Recorded Value", value: `₹${curAmt.toLocaleString("en-IN")}` },
            { label: "Loan Remaining Balance", value: `₹${remaining.toLocaleString("en-IN")}` },
            { label: "Maximum Allowed Collection", value: `₹${maxAllowed.toLocaleString("en-IN")}` },
            { label: "Attempted Collection", value: `₹${newAmt.toLocaleString("en-IN")}` }
          ],
          hint: `Collections cannot exceed the outstanding balance of a loan. The maximum amount you can collect on this loan is ₹${maxAllowed.toLocaleString("en-IN")}.`,
          onRevert: () => {
            setModifiedRows((prev) => {
              const next = { ...prev };
              if (next[rowId]) {
                delete next[rowId].amount;
                if (Object.keys(next[rowId]).length === 0) delete next[rowId];
              }
              return next;
            });
            setViolationModal(null);
          }
        });
        showNotice("error", `Violation: Amount exceeds maximum allowed (₹${maxAllowed.toLocaleString("en-IN")})`);
        return;
      }
    }

    if (selectedTable === "daily_finance_accounts" && changes.gross_finance_amount !== undefined) {
      const gross = Number(changes.gross_finance_amount);
      if (gross <= 0) {
        setViolationModal({
          title: "Violation: Invalid Loan Amount",
          message: "Total loan amount must be greater than zero.",
          details: [
            { label: "Customer Name", value: row.customer_name || `#${rowId}` },
            { label: "Entered Loan Amount", value: `₹${gross}` }
          ],
          hint: "Please provide a valid loan disbursement principal (₹1 or higher).",
          onRevert: () => {
            setModifiedRows((prev) => {
              const next = { ...prev };
              if (next[rowId]) {
                delete next[rowId].gross_finance_amount;
                if (Object.keys(next[rowId]).length === 0) delete next[rowId];
              }
              return next;
            });
            setViolationModal(null);
          }
        });
        showNotice("error", "Violation: Loan amount must be greater than ₹0.");
        return;
      }
    }

    setSavingRows((prev) => ({ ...prev, [rowId]: true }));
    try {
      const apiBase = getApiBaseUrl();
      const res = await fetch(
        `${apiBase}/table-editor/data/${selectedTable}/${encodeURIComponent(rowId)}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${getAuthToken()}`,
            "x-admin-password": localStorage.getItem("kambam_finance_app_password") || "kambam@2k26",
          },
          body: JSON.stringify(changes),
        }
      );
      const data = await res.json();
      if (!res.ok || !data.success) {
        const errMsg = data.error || "Save failed";
        setViolationModal({
          title: "Constraint Violation Prevented",
          message: errMsg,
          details: [
            { label: "Table", value: selectedTable },
            { label: "Record Key", value: String(rowId) },
            { label: "Server Status", value: `HTTP ${res.status}` }
          ],
          hint: "The database rejected this update to protect ledger balance consistency. Please adjust the entered value.",
          onRevert: () => {
            setModifiedRows((prev) => {
              const next = { ...prev };
              delete next[rowId];
              return next;
            });
            setViolationModal(null);
          }
        });
        throw new Error(errMsg);
      }

      setTableData((prev) => ({
        ...prev,
        rows: prev.rows.map((r) => {
          if (String(r[pkCol]) === String(rowId)) {
            return { ...r, ...data.updatedRow };
          }
          if (
            selectedTable === "partner_capital_amounts" &&
            data.updatedRow?.partner_name &&
            r.partner_id &&
            data.updatedRow?.partner_id &&
            String(r.partner_id) === String(data.updatedRow.partner_id)
          ) {
            return { ...r, partner_name: data.updatedRow.partner_name };
          }
          return r;
        }),
      }));

      setModifiedRows((prev) => {
        const next = { ...prev };
        delete next[rowId];
        return next;
      });

      const updatedRemaining = Number(data.updatedRow?.loan_remaining_balance || 0);
      if (selectedTable === "daily_finance_payments" && updatedRemaining <= 0) {
        showNotice("success", "Saved! Remaining balance reached ₹0 — Loan marked as COMPLETED.");
      } else {
        showNotice("success", `Row updated successfully`);
      }

      // Reload to refresh joined loan balances and statuses
      if (selectedTable === "daily_finance_payments" || selectedTable === "daily_finance_accounts") {
        loadTableData(selectedTable, page, limit, search, sortBy, sortOrder);
      }
    } catch (err) {
      showNotice("error", `Failed to save: ${err.message}`);
    } finally {
      setSavingRows((prev) => ({ ...prev, [rowId]: false }));
    }
  };

  // Delete Loan handler (cascade all payments & revert capital)
  const handleDeleteLoanConfirm = async () => {
    if (!deleteModal || isDeleting) return;
    const { row, tableName } = deleteModal;
    const pkCol = tableData?.primaryKey || (tableName === "daily_finance_accounts" ? "finance_id" : "id");
    const rowId = row[pkCol];

    setIsDeleting(true);
    try {
      const apiBase = getApiBaseUrl();
      const res = await fetch(
        `${apiBase}/table-editor/loan/${tableName}/${encodeURIComponent(rowId)}`,
        {
          method: "DELETE",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${getAuthToken()}`,
            "x-admin-password": localStorage.getItem("kambam_finance_app_password") || "kambam@2k26",
          },
          body: JSON.stringify({ reason: deleteReason.trim() || "Deleted via Table Studio" }),
        }
      );
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Delete loan failed");
      }

      showNotice("success", data.message || "Loan successfully deleted and capital reverted.");
      setDeleteModal(null);
      setDeleteReason("");
      loadTableData(selectedTable, page, limit, search, sortBy, sortOrder);
    } catch (err) {
      showNotice("error", `Failed to delete loan: ${err.message}`);
    } finally {
      setIsDeleting(false);
    }
  };

  // Save / Update all modified rows
  const saveAllChanges = async () => {
    if (isSavingAll) return;
    const rowIds = Object.keys(modifiedRows);
    if (rowIds.length === 0) return;

    setIsSavingAll(true);
    try {
      for (const rId of rowIds) {
        const row = tableData.rows.find(
          (r) => String(r[tableData.primaryKey || "id"]) === String(rId)
        );
        if (row) {
          await saveRow(row);
        }
      }
    } finally {
      setIsSavingAll(false);
    }
  };

  // Group partner_capital_amounts table rows by partner:
  // Merges Sl No and Partner Name across OWN row (1st) and all associated LEND rows
  const partnerGroups = useMemo(() => {
    if (selectedTable !== "partner_capital_amounts" || !tableData?.rows) {
      return null;
    }

    const groups = [];
    let currentGroup = null;

    tableData.rows.forEach((row, rowIndex) => {
      const partnerKey = String(row.partner_id || row.partner_name || rowIndex);
      if (!currentGroup || currentGroup.partnerKey !== partnerKey) {
        currentGroup = {
          partnerKey,
          partnerName: row.partner_name,
          startIndex: rowIndex,
          count: 1,
          slNo: (page - 1) * limit + groups.length + 1,
          rows: [row],
        };
        groups.push(currentGroup);
      } else {
        currentGroup.count++;
        currentGroup.rows.push(row);
      }
    });

    const rowMeta = {};
    groups.forEach((g) => {
      g.rows.forEach((r, idxInGroup) => {
        const globalIdx = g.startIndex + idxInGroup;
        rowMeta[globalIdx] = {
          isFirstInGroup: idxInGroup === 0,
          isLastInGroup: idxInGroup === g.count - 1,
          count: g.count,
          slNo: g.slNo,
          idxInGroup,
          group: g,
        };
      });
    });

    return { groups, rowMeta };
  }, [selectedTable, tableData?.rows, page, limit]);

  // Group tables strictly by module
  const groupedTables = tables.reduce((acc, t) => {
    acc[t.module] = acc[t.module] || [];
    acc[t.module].push(t);
    return acc;
  }, {});

  const currentTableMeta = tables.find((t) => t.name === selectedTable);
  const totalModified = Object.keys(modifiedRows).length;

  // Helper formatter for cell values
  const formatCellValue = (val, colName, dataType) => {
    if (val === null || val === undefined) return { text: "—", isNull: true };
    const str = String(val);

    // Format currency / amounts
    const isAmountCol =
      colName.includes("amount") ||
      colName.includes("fee") ||
      colName.includes("balance") ||
      colName.includes("interest_amount") ||
      colName.includes("total_emi") ||
      colName.includes("principal_component") ||
      colName.includes("interest_component") ||
      colName.includes("daily_agreed_due") ||
      colName.includes("agreed_total_payable");

    if (isAmountCol && !isNaN(Number(val)) && val !== "") {
      const num = Number(val);
      return {
        text: "₹ " + num.toLocaleString("en-IN", { minimumFractionDigits: num % 1 === 0 ? 0 : 2 }),
        isAmount: true,
      };
    }

    // Format dates as dd-mm-yyyy
    if (dataType === "date" || (colName.includes("date") && !colName.includes("time"))) {
      if (!str) return { text: "—", isDate: true };
      const dateOnlyMatch = str.match(/^(\d{4})-(\d{2})-(\d{2})/);
      if (dateOnlyMatch) {
        const [, y, m, d] = dateOnlyMatch;
        return { text: `${d}-${m}-${y}`, isDate: true };
      }
      if (/^\d{2}-\d{2}-\d{4}$/.test(str)) {
        return { text: str, isDate: true };
      }
      const d = str.includes("T") ? new Date(str) : new Date(`${str}T00:00:00`);
      if (!isNaN(d.getTime())) {
        const day = String(d.getDate()).padStart(2, "0");
        const month = String(d.getMonth() + 1).padStart(2, "0");
        const year = d.getFullYear();
        return { text: `${day}-${month}-${year}`, isDate: true };
      }
      return { text: str.slice(0, 10), isDate: true };
    }

    return { text: str };
  };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 10000,
        background: "#070b12",
        color: "#f8fafc",
        display: "flex",
        flexDirection: "column",
        width: "100vw",
        height: "100vh",
        fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
        overflow: "hidden",
      }}
    >
      {/* ========================================================================= */}
      {/* 1. TOP TOOLBAR HEADER */}
      {/* ========================================================================= */}
      <header
        style={{
          background: "linear-gradient(180deg, #131b2b 0%, #0c1322 100%)",
          borderBottom: "1px solid rgba(255, 255, 255, 0.08)",
          padding: "8px 16px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "10px",
          flexShrink: 0,
          height: "52px",
          boxSizing: "border-box",
        }}
      >
        {/* Left Side: Back, App Title, Active Table Badge */}
        <div style={{ display: "flex", alignItems: "center", gap: "10px", minWidth: 0 }}>
          <button
            type="button"
            onClick={onClose}
            style={{
              background: "rgba(255, 255, 255, 0.06)",
              border: "1px solid rgba(255, 255, 255, 0.12)",
              color: "#e2e8f0",
              borderRadius: "7px",
              padding: "5px 10px",
              fontSize: "12px",
              fontWeight: "600",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: "5px",
            }}
          >
            <ArrowLeft size={14} /> Back
          </button>

          <div style={{ display: "flex", alignItems: "center", gap: "7px" }}>
            <div
              style={{
                width: "26px",
                height: "26px",
                borderRadius: "7px",
                background: "linear-gradient(135deg, #0284c7, #0369a1)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <FileSpreadsheet size={15} color="#ffffff" />
            </div>
            <span
              style={{
                fontWeight: "800",
                fontSize: "13.5px",
                letterSpacing: "-0.2px",
                color: "#ffffff",
              }}
            >
              Table Studio
            </span>
          </div>

          {currentTableMeta && (
            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
                background: "rgba(14, 165, 233, 0.12)",
                border: "1px solid rgba(14, 165, 233, 0.28)",
                padding: "3px 9px",
                borderRadius: "16px",
                fontSize: "11.5px",
                color: "#38bdf8",
                fontWeight: "600",
              }}
            >
              <span>{currentTableMeta.label}</span>
              <span
                style={{
                  background: "#0284c7",
                  color: "#ffffff",
                  padding: "1px 6px",
                  borderRadius: "8px",
                  fontSize: "10px",
                  fontWeight: "700",
                }}
              >
                {tableData?.totalCount ?? currentTableMeta.rowCount}
              </span>
            </div>
          )}
        </div>

        {/* Right Side: Search, Save All, Refresh, Close (NO INSERT, NO DELETE) */}
        <div style={{ display: "flex", alignItems: "center", gap: "7px", flexShrink: 0 }}>
          {/* SEARCH INPUT */}
          <form onSubmit={handleSearchSubmit} style={{ display: "flex", alignItems: "center" }}>
            <div style={{ position: "relative" }}>
              <input
                type="text"
                placeholder="Search table values, IDs, names, phones, and linked details..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                style={{
                  background: "#070b12",
                  border: "1px solid rgba(255, 255, 255, 0.15)",
                  borderRadius: "7px",
                  padding: "5px 24px 5px 8px",
                  color: "#ffffff",
                  fontSize: "12px",
                  width: "130px",
                  outline: "none",
                }}
              />
              <button
                type="submit"
                style={{
                  position: "absolute",
                  right: "5px",
                  top: "50%",
                  transform: "translateY(-50%)",
                  background: "none",
                  border: "none",
                  color: "#94a3b8",
                  cursor: "pointer",
                  padding: "0",
                }}
              >
                <Search size={13} />
              </button>
            </div>
          </form>

          {/* SAVE ALL BUTTON */}
          {totalModified > 0 && (
            <button
              type="button"
              disabled={loading || isSavingAll}
              onClick={saveAllChanges}
              style={{
                background: isSavingAll ? "#047857" : "linear-gradient(135deg, #10b981, #059669)",
                border: "none",
                color: "#ffffff",
                borderRadius: "7px",
                padding: "5px 12px",
                fontSize: "12px",
                fontWeight: "700",
                cursor: loading || isSavingAll ? "not-allowed" : "pointer",
                opacity: loading || isSavingAll ? 0.65 : 1,
                pointerEvents: isSavingAll ? "none" : "auto",
                display: "flex",
                alignItems: "center",
                gap: "5px",
                boxShadow: isSavingAll ? "none" : "0 0 10px rgba(16, 185, 129, 0.5)",
              }}
            >
              <Save size={14} className={isSavingAll ? "animate-spin" : ""} />
              <span>{isSavingAll ? "Updating..." : `Update All (${totalModified})`}</span>
            </button>
          )}

          {/* REFRESH */}
          <button
            type="button"
            disabled={loading}
            onClick={() => loadTableData(selectedTable, page, limit, search, sortBy, sortOrder)}
            style={{
              background: "rgba(255, 255, 255, 0.06)",
              border: "1px solid rgba(255, 255, 255, 0.12)",
              color: "#cbd5e1",
              borderRadius: "7px",
              padding: "5px 8px",
              fontSize: "11.5px",
              cursor: loading ? "not-allowed" : "pointer",
            }}
            title="Refresh table"
          >
            <RefreshCw size={13} className={loading ? "animate-spin" : ""} />
          </button>

          {/* CLOSE */}
          <button
            type="button"
            onClick={onClose}
            style={{
              background: "transparent",
              border: "none",
              color: "#94a3b8",
              cursor: "pointer",
              padding: "4px",
            }}
            title="Close"
          >
            <X size={17} />
          </button>
        </div>
      </header>

      {/* NOTIFICATION TOAST */}
      {notification && (
        <div
          style={{
            background: notification.type === "error" ? "#7f1d1d" : "#065f46",
            color: "#ffffff",
            padding: "6px 16px",
            fontSize: "12px",
            fontWeight: "600",
            display: "flex",
            alignItems: "center",
            gap: "7px",
            borderBottom: "1px solid rgba(255, 255, 255, 0.1)",
            flexShrink: 0,
          }}
        >
          {notification.type === "error" ? <AlertCircle size={14} /> : <CheckCircle2 size={14} />}
          <span>{notification.text}</span>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 2. SPLIT LAYOUT: FIXED COMPACT SIDEBAR + FULL HORIZONTAL SCROLL TABLE */}
      {/* ========================================================================= */}
      <div
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "row",
          minHeight: 0,
          minWidth: 0,
          width: "100%",
          height: "calc(100vh - 52px)",
          overflow: "hidden",
          position: "relative",
          boxSizing: "border-box",
        }}
      >
        {/* COMPACT LEFT SIDEBAR: STRICTLY 230px WIDTH */}
        <div
          className="studioSidebarNav"
          style={{
            position: "relative",
            width: "230px",
            minWidth: "230px",
            maxWidth: "230px",
            flexShrink: 0,
            height: "100%",
            background: "#0c1322",
            borderRight: "1px solid rgba(255, 255, 255, 0.08)",
            display: "flex",
            flexDirection: "column",
            overflowY: "auto",
            overflowX: "hidden",
            userSelect: "none",
            boxSizing: "border-box",
            padding: 0,
            margin: 0,
            zIndex: 2,
          }}
        >
          <div
            style={{
              padding: "9px 12px",
              borderBottom: "1px solid rgba(255, 255, 255, 0.06)",
              fontSize: "10.5px",
              fontWeight: "800",
              letterSpacing: "0.8px",
              color: "#94a3b8",
              textTransform: "uppercase",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              background: "rgba(0, 0, 0, 0.2)",
            }}
          >
            <span>Tables ({tables.length})</span>
            {loading && (
              <RefreshCw size={11} style={{ animation: "spin 0.8s linear infinite", color: "#38bdf8" }} />
            )}
          </div>

          <div style={{ padding: "8px 6px", display: "flex", flexDirection: "column", gap: "10px" }}>
            {Object.entries(groupedTables).map(([moduleName, tList]) => (
              <div key={moduleName}>
                <div
                  style={{
                    fontSize: "9.5px",
                    fontWeight: "800",
                    color:
                      moduleName === "Daily Finance"
                        ? "#38bdf8"
                        : moduleName === "Auto Finance"
                        ? "#fbbf24"
                        : "#34d399",
                    textTransform: "uppercase",
                    letterSpacing: "0.5px",
                    padding: "3px 6px 4px",
                    display: "flex",
                    alignItems: "center",
                    gap: "5px",
                  }}
                >
                  <span>{moduleName}</span>
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
                  {tList.map((t) => {
                    const isSelected = selectedTable === t.name;
                    const IconComp = getTableIcon(t.name);

                    return (
                      <button
                        key={t.name}
                        type="button"
                        disabled={loading}
                        onClick={() => {
                          if (selectedTable !== t.name) {
                            setSelectedTable(t.name);
                            setPage(1);
                            setSearch("");
                            setSortBy(null);
                          }
                        }}
                        style={{
                          width: "100%",
                          textAlign: "left",
                          padding: "6px 8px",
                          borderRadius: "6px",
                          border: isSelected
                            ? "1px solid rgba(56, 189, 248, 0.4)"
                            : "1px solid transparent",
                          background: isSelected
                            ? "linear-gradient(135deg, rgba(14, 165, 233, 0.22), rgba(2, 132, 199, 0.15))"
                            : "transparent",
                          color: isSelected ? "#ffffff" : "#cbd5e1",
                          cursor: loading ? "not-allowed" : "pointer",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          gap: "6px",
                          transition: "all 0.12s ease",
                        }}
                        title={t.description || t.label}
                      >
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "6px",
                            overflow: "hidden",
                            minWidth: 0,
                          }}
                        >
                          <div
                            style={{
                              width: "20px",
                              height: "20px",
                              borderRadius: "4px",
                              background: isSelected ? "#0284c7" : "rgba(255, 255, 255, 0.05)",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              color: isSelected ? "#ffffff" : "#94a3b8",
                              flexShrink: 0,
                            }}
                          >
                            <IconComp size={12} />
                          </div>

                          <div
                            style={{
                              fontSize: "11px",
                              fontWeight: isSelected ? "700" : "500",
                              color: isSelected ? "#ffffff" : "#cbd5e1",
                              whiteSpace: "nowrap",
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                            }}
                          >
                            {t.label}
                          </div>
                        </div>

                        <span
                          style={{
                            background: isSelected ? "#0284c7" : "rgba(255, 255, 255, 0.06)",
                            color: isSelected ? "#ffffff" : "#94a3b8",
                            fontSize: "10px",
                            fontWeight: "700",
                            padding: "1px 5px",
                            borderRadius: "8px",
                            flexShrink: 0,
                          }}
                        >
                          {t.rowCount}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* RIGHT AREA: SPREADSHEET TABLE GRID CONTAINER */}
        <div
          style={{
            flex: 1,
            minWidth: 0,
            width: "calc(100% - 230px)",
            height: "100%",
            display: "flex",
            flexDirection: "column",
            overflow: "hidden",
            background: "#070b12",
            boxSizing: "border-box",
          }}
        >
          {/* SCROLLABLE TABLE AREA */}
          <div
            style={{
              flex: 1,
              minHeight: 0,
              minWidth: 0,
              width: "100%",
              overflow: "auto",
              position: "relative",
            }}
          >
            {/* Loading Overlay */}
            {loading && (
              <div
                style={{
                  position: "absolute",
                  inset: 0,
                  zIndex: 20,
                  background: "rgba(7, 11, 18, 0.8)",
                  backdropFilter: "blur(2px)",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "10px",
                }}
              >
                <div
                  style={{
                    width: "32px",
                    height: "32px",
                    border: "3px solid rgba(56, 189, 248, 0.2)",
                    borderTopColor: "#38bdf8",
                    borderRadius: "50%",
                    animation: "spin 0.8s linear infinite",
                  }}
                />
                <span style={{ fontSize: "12.5px", fontWeight: "600", color: "#38bdf8" }}>
                  Loading `{selectedTable}` records...
                </span>
              </div>
            )}

            {tableData && (
              <table
                style={{
                  minWidth: "100%",
                  borderCollapse: "collapse",
                  fontSize: "12px",
                  color: "#e2e8f0",
                  whiteSpace: "nowrap",
                }}
              >
                {/* TABLE HEADER */}
                <thead
                  style={{
                    position: "sticky",
                    top: 0,
                    zIndex: 10,
                    background: "#131b2b",
                    boxShadow: "0 2px 6px rgba(0,0,0,0.35)",
                  }}
                >
                  <tr style={{ borderBottom: "2px solid #243044" }}>
                    {/* Row Index Column Header */}
                    <th
                      style={{
                        padding: "8px 9px",
                        width: "42px",
                        textAlign: "center",
                        borderRight: "1px solid #243044",
                        color: "#64748b",
                        fontSize: "10.5px",
                        fontWeight: "700",
                        userSelect: "none",
                        background: "#101624",
                      }}
                    >
                      #
                    </th>

                    {/* Action Header */}
                    <th
                      style={{
                        padding: "8px 9px",
                        width: selectedTable === "daily_finance_accounts" || selectedTable === "autofinance_loans" || selectedTable === "deleted_loans_archive" ? "130px" : "60px",
                        textAlign: "center",
                        borderRight: "1px solid #243044",
                        color: "#94a3b8",
                        fontSize: "10.5px",
                        fontWeight: "700",
                        userSelect: "none",
                        background: "#101624",
                      }}
                    >
                      Action
                    </th>

                    {/* Data Columns */}
                    {visibleColumns.map((col) => {
                      const label = COLUMN_LABEL_MAP[col.column_name] || col.column_name;
                      const isAmount =
                        col.column_name.includes("amount") ||
                        col.column_name.includes("total_emi") ||
                        col.column_name.includes("agreed_total_payable") ||
                        col.column_name.includes("daily_agreed_due");
                      const isPerson =
                        col.column_name === "partner_name" || col.column_name === "customer_name";

                      return (
                        <th
                          key={col.column_name}
                          onClick={() => handleSort(col.column_name)}
                          style={{
                            padding: "8px 12px",
                            textAlign: isAmount ? "right" : "left",
                            borderRight: "1px solid #243044",
                            cursor: "pointer",
                            userSelect: "none",
                            background: sortBy === col.column_name ? "#1b2538" : "inherit",
                          }}
                          title={`Sort by ${col.column_name} (${col.data_type})`}
                        >
                          <div
                            style={{
                              display: "flex",
                              alignItems: "center",
                              justifyContent: isAmount ? "flex-end" : "flex-start",
                              gap: "5px",
                            }}
                          >
                            {col.is_primary && (
                              <Key size={11} color="#f59e0b" title="Primary Key" />
                            )}
                            {isPerson && (
                              <UserRound size={11} color="#38bdf8" title="Person Identity" />
                            )}
                            {selectedTable === "autofinance_emi_schedules" && col.column_name === "total_emi" && (
                              <Lock size={11} color="#94a3b8" title="Scheduled EMI (Locked / Read-Only)" />
                            )}
                            {selectedTable === "autofinance_emi_schedules" && col.column_name === "collected_amount" && (
                              <span style={{ color: "#34d399", fontSize: "11px", fontWeight: "900" }} title="Editable Collected Amount">✎</span>
                            )}
                            <span
                              style={{
                                fontWeight: "700",
                                color: col.is_primary
                                  ? "#fbbf24"
                                  : isPerson
                                  ? "#38bdf8"
                                  : selectedTable === "autofinance_emi_schedules" && col.column_name === "collected_amount"
                                  ? "#34d399"
                                  : selectedTable === "autofinance_emi_schedules" && col.column_name === "total_emi"
                                  ? "#94a3b8"
                                  : "#f1f5f9",
                                fontSize: "11.5px",
                              }}
                            >
                              {label}
                            </span>
                            {sortBy === col.column_name && (
                              <span style={{ color: "#38bdf8", fontSize: "10px" }}>
                                {sortOrder === "asc" ? "▲" : "▼"}
                              </span>
                            )}
                          </div>
                        </th>
                      );
                    })}
                  </tr>
                </thead>

                {/* TABLE ROWS */}
                <tbody>
                  {tableData.rows.length === 0 ? (
                    <tr>
                      <td
                        colSpan={visibleColumns.length + 2}
                        style={{ textAlign: "center", padding: "40px 16px", color: "#64748b" }}
                      >
                        <div
                          style={{
                            display: "flex",
                            flexDirection: "column",
                            alignItems: "center",
                            gap: "8px",
                          }}
                        >
                          <Table size={32} color="#334155" />
                          <span style={{ fontSize: "13px", fontWeight: "600", color: "#94a3b8" }}>
                            {selectedTable === "autofinance_emi_schedules"
                              ? "No collected installments recorded yet in Auto Finance"
                              : `No records found in \`${selectedTable}\``}
                          </span>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    tableData.rows.map((row, idx) => {
                      const pkCol = tableData.primaryKey || "id";
                      const rowId = row[pkCol];
                      const hasChanges = Boolean(modifiedRows[rowId]);
                      const isSaving = Boolean(savingRows[rowId]);

                      const pGroupMeta = partnerGroups?.rowMeta[idx];
                      const isChildRow = Boolean(pGroupMeta && pGroupMeta.idxInGroup > 0);
                      const isLastInGroup = Boolean(pGroupMeta ? pGroupMeta.isLastInGroup : true);

                      return (
                        <tr
                          key={rowId || idx}
                          style={{
                            background: hasChanges
                              ? "rgba(16, 185, 129, 0.12)"
                              : isChildRow
                              ? "rgba(139, 92, 246, 0.04)"
                              : idx % 2 === 0
                              ? "#090f1a"
                              : "#0c1322",
                            borderBottom: pGroupMeta
                              ? isLastInGroup
                                ? "2px solid rgba(56, 189, 248, 0.3)"
                                : "1px dashed rgba(255, 255, 255, 0.08)"
                              : "1px solid rgba(255, 255, 255, 0.04)",
                            transition: "background 0.1s ease",
                          }}
                        >
                          {/* Row Index / Merged Sl No */}
                          {pGroupMeta ? (
                            pGroupMeta.isFirstInGroup ? (
                              <td
                                rowSpan={pGroupMeta.count}
                                style={{
                                  textAlign: "center",
                                  color: "#38bdf8",
                                  fontSize: "11px",
                                  fontWeight: "800",
                                  borderRight: "1px solid #243044",
                                  borderBottom: "2px solid rgba(56, 189, 248, 0.3)",
                                  userSelect: "none",
                                  background:
                                    "linear-gradient(180deg, rgba(14, 165, 233, 0.14) 0%, rgba(14, 165, 233, 0.04) 100%)",
                                  verticalAlign: "middle",
                                  padding: "8px 4px",
                                }}
                              >
                                <div
                                  style={{
                                    display: "flex",
                                    flexDirection: "column",
                                    alignItems: "center",
                                    gap: "3px",
                                  }}
                                >
                                  <span style={{ fontSize: "13px", fontWeight: "900", color: "#38bdf8" }}>
                                    {pGroupMeta.slNo}
                                  </span>
                                  {pGroupMeta.count > 1 && (
                                    <span
                                      style={{
                                        fontSize: "8.5px",
                                        color: "#94a3b8",
                                        fontWeight: "700",
                                        background: "rgba(255, 255, 255, 0.06)",
                                        padding: "1px 5px",
                                        borderRadius: "6px",
                                        whiteSpace: "nowrap",
                                      }}
                                      title={`1 OWN + ${pGroupMeta.count - 1} LEND`}
                                    >
                                      1 OWN + {pGroupMeta.count - 1} LEND
                                    </span>
                                  )}
                                </div>
                              </td>
                            ) : null
                          ) : (
                            <td
                              style={{
                                textAlign: "center",
                                color: "#475569",
                                fontSize: "10.5px",
                                borderRight: "1px solid rgba(255, 255, 255, 0.04)",
                                userSelect: "none",
                                background: hasChanges ? "rgba(16, 185, 129, 0.15)" : undefined,
                              }}
                            >
                              {(page - 1) * limit + idx + 1}
                            </td>
                          )}

                          {/* Row Action Column */}
                          <td
                            style={{
                              textAlign: "center",
                              borderRight: "1px solid rgba(255, 255, 255, 0.04)",
                              borderBottom: pGroupMeta
                                ? isLastInGroup
                                  ? "2px solid rgba(56, 189, 248, 0.3)"
                                  : "1px dashed rgba(255, 255, 255, 0.08)"
                                : undefined,
                              padding: "3px 6px",
                              verticalAlign: "middle",
                              whiteSpace: "nowrap",
                            }}
                          >
                            <div style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", gap: "6px" }}>
                              {hasChanges && (
                                <button
                                  type="button"
                                  onClick={() => saveRow(row)}
                                  disabled={isSaving || isSavingAll}
                                  style={{
                                    background: isSaving ? "#475569" : "#10b981",
                                    border: "none",
                                    color: "#ffffff",
                                    borderRadius: "4px",
                                    padding: "2px 7px",
                                    cursor: isSaving || isSavingAll ? "not-allowed" : "pointer",
                                    opacity: isSaving || isSavingAll ? 0.6 : 1,
                                    fontSize: "11px",
                                    fontWeight: "700",
                                    display: "inline-flex",
                                    alignItems: "center",
                                    gap: "3px",
                                    boxShadow: isSaving ? "none" : "0 0 6px rgba(16, 185, 129, 0.4)",
                                  }}
                                  title={isSaving ? "Saving changes..." : "Save / Update row changes"}
                                >
                                  <Save size={12} className={isSaving ? "animate-spin" : ""} />
                                  <span>{isSaving ? "..." : "Save"}</span>
                                </button>
                              )}

                              {(selectedTable === "daily_finance_accounts" || selectedTable === "autofinance_loans") && (
                                <button
                                  type="button"
                                  onClick={() => setDeleteModal({ row, tableName: selectedTable })}
                                  style={{
                                    background: "rgba(239, 68, 68, 0.15)",
                                    border: "1px solid rgba(239, 68, 68, 0.4)",
                                    color: "#f87171",
                                    borderRadius: "4px",
                                    padding: "2px 7px",
                                    cursor: "pointer",
                                    fontSize: "11px",
                                    fontWeight: "600",
                                    display: "inline-flex",
                                    alignItems: "center",
                                    gap: "3px",
                                  }}
                                  title="Delete Loan (cascades collections & reverts capital)"
                                >
                                  <Trash2 size={12} />
                                  <span>Delete Loan</span>
                                </button>
                              )}

                              {selectedTable === "deleted_loans_archive" && (
                                <button
                                  type="button"
                                  onClick={() => setViewArchiveModal(row)}
                                  style={{
                                    background: "rgba(14, 165, 233, 0.15)",
                                    border: "1px solid rgba(14, 165, 233, 0.4)",
                                    color: "#38bdf8",
                                    borderRadius: "4px",
                                    padding: "2px 7px",
                                    cursor: "pointer",
                                    fontSize: "11px",
                                    fontWeight: "600",
                                    display: "inline-flex",
                                    alignItems: "center",
                                    gap: "3px",
                                  }}
                                  title="View archived loan & payment snapshot"
                                >
                                  <Eye size={12} />
                                  <span>Snapshot</span>
                                </button>
                              )}

                              {!hasChanges && selectedTable !== "daily_finance_accounts" && selectedTable !== "autofinance_loans" && selectedTable !== "deleted_loans_archive" && (
                                <span style={{ color: "#334155", fontSize: "11px" }}>—</span>
                              )}
                            </div>
                          </td>

                          {/* Editable Cells */}
                          {visibleColumns.map((col) => {
                            const colName = col.column_name;
                            const isPK = col.is_primary;
                            const isPartnerNameMerged = Boolean(pGroupMeta && colName === "partner_name");

                            if (isPartnerNameMerged && !pGroupMeta.isFirstInGroup) {
                              return null; // Merged via rowSpan on first row
                            }

                            const isEditing =
                              editingCell?.rowId === rowId && editingCell?.colName === colName;
                            const isModified =
                              modifiedRows[rowId] && colName in modifiedRows[rowId];
                            const currentValue = isModified
                              ? modifiedRows[rowId][colName]
                              : row[colName];

                            const formatted = formatCellValue(currentValue, colName, col.data_type);

                            // Check editable status
                            const editable = isCellEditable(colName, isPK, row);

                            // Status pill styling
                            const isStatus = colName === "status";
                            const statusUpper = String(currentValue || "").toUpperCase();
                            const isGood = [
                              "ACTIVE",
                              "APPROVED",
                              "PAID",
                              "COMPLETED",
                              "SUCCESS",
                              "CONFIRMED",
                            ].includes(statusUpper);
                            const isWarning = [
                              "PENDING",
                              "DUE",
                              "PARTIAL",
                              "WAITING",
                            ].includes(statusUpper);
                            const isBad = [
                              "INACTIVE",
                              "REJECTED",
                              "OVERDUE",
                              "FAILED",
                              "CANCELLED",
                              "VOID",
                            ].includes(statusUpper);

                            const isAmount =
                              colName.includes("amount") ||
                              colName.includes("total_emi") ||
                              colName.includes("agreed_total_payable") ||
                              colName.includes("daily_agreed_due");
                            const isPerson =
                              (colName === "partner_name" || colName === "customer_name") &&
                              !formatted.isNull;
                            const isFundSource = colName === "fund_source_type";
                            const isLenderName = colName === "lender_name";

                            const cellRowSpan = isPartnerNameMerged ? pGroupMeta.count : undefined;

                            return (
                              <td
                                key={colName}
                                rowSpan={cellRowSpan}
                                onDoubleClick={() => editable && handleCellClick(rowId, colName, row)}
                                style={{
                                  padding: isEditing ? "2px" : "6px 12px",
                                  borderRight: "1px solid rgba(255, 255, 255, 0.04)",
                                  borderBottom: isPartnerNameMerged
                                    ? "2px solid rgba(56, 189, 248, 0.3)"
                                    : pGroupMeta
                                    ? isLastInGroup
                                      ? "2px solid rgba(56, 189, 248, 0.3)"
                                      : "1px dashed rgba(255, 255, 255, 0.08)"
                                    : "1px solid rgba(255, 255, 255, 0.04)",
                                  verticalAlign: isPartnerNameMerged ? "middle" : "inherit",
                                  cursor: editable ? "cell" : "default",
                                  background: isModified
                                    ? "rgba(16, 185, 129, 0.16)"
                                    : isPartnerNameMerged
                                    ? "rgba(14, 165, 233, 0.03)"
                                    : undefined,
                                  color: formatted.isNull ? "#475569" : "#e2e8f0",
                                  fontStyle: formatted.isNull ? "italic" : "normal",
                                  textAlign: isAmount ? "right" : "left",
                                  fontFamily:
                                    isPK ||
                                    isAmount ||
                                    col.data_type.includes("numeric") ||
                                    col.data_type.includes("integer")
                                      ? "'JetBrains Mono', monospace"
                                      : "inherit",
                                }}
                                title={
                                  isPK
                                    ? "Primary Key"
                                    : !editable
                                    ? "Reference identity"
                                    : "Double-click to edit cell"
                                }
                              >
                                {isEditing ? (
                                  <input
                                    ref={editInputRef}
                                    type="text"
                                    value={currentValue === null ? "" : currentValue}
                                    onChange={(e) =>
                                      handleCellChange(rowId, colName, e.target.value)
                                    }
                                    onBlur={handleCellBlur}
                                    onKeyDown={(e) => handleCellKeyDown(e, rowId, colName)}
                                    style={{
                                      width: "100%",
                                      padding: "3px 6px",
                                      background: "#0284c7",
                                      color: "#ffffff",
                                      border: "1.5px solid #38bdf8",
                                      borderRadius: "4px",
                                      fontSize: "12px",
                                      outline: "none",
                                      boxSizing: "border-box",
                                    }}
                                  />
                                ) : (
                                  <div
                                    style={{
                                      display: "flex",
                                      alignItems: "center",
                                      justifyContent: isAmount ? "flex-end" : "space-between",
                                      gap: "6px",
                                    }}
                                  >
                                    {isFundSource && !formatted.isNull ? (
                                      <span
                                        style={{
                                          display: "inline-flex",
                                          alignItems: "center",
                                          gap: "4px",
                                          padding: "2px 8px",
                                          borderRadius: "6px",
                                          fontSize: "10.5px",
                                          fontWeight: "800",
                                          letterSpacing: "0.4px",
                                          background:
                                            String(currentValue).toUpperCase() === "OWN"
                                              ? "rgba(16, 185, 129, 0.18)"
                                              : "rgba(139, 92, 246, 0.18)",
                                          border:
                                            String(currentValue).toUpperCase() === "OWN"
                                              ? "1px solid rgba(16, 185, 129, 0.4)"
                                              : "1px solid rgba(139, 92, 246, 0.4)",
                                          color:
                                            String(currentValue).toUpperCase() === "OWN"
                                              ? "#34d399"
                                              : "#c084fc",
                                        }}
                                      >
                                        {String(currentValue).toUpperCase() === "OWN"
                                          ? "👑 OWN (1st Row)"
                                          : "🤝 LEND"}
                                      </span>
                                    ) : isLenderName ? (
                                      row.fund_source_type === "OWN" ? (
                                        <span
                                          style={{
                                            color: "#94a3b8",
                                            fontStyle: "italic",
                                            fontSize: "11px",
                                          }}
                                        >
                                          Own Funds
                                        </span>
                                      ) : (
                                        <span
                                          style={{
                                            color: "#c084fc",
                                            fontWeight: "600",
                                            fontSize: "12px",
                                            display: "inline-flex",
                                            alignItems: "center",
                                            gap: "4px",
                                          }}
                                        >
                                          <span style={{ color: "#a855f7", fontSize: "13px", fontWeight: "900" }}>↳</span>
                                          <span>{formatted.text}</span>
                                        </span>
                                      )
                                    ) : isStatus && !formatted.isNull ? (
                                      <span
                                        style={{
                                          padding: "1px 7px",
                                          borderRadius: "10px",
                                          fontSize: "10.5px",
                                          fontWeight: "700",
                                          background: isGood
                                            ? "rgba(16, 185, 129, 0.18)"
                                            : isWarning
                                            ? "rgba(245, 158, 11, 0.18)"
                                            : isBad
                                            ? "rgba(239, 68, 68, 0.18)"
                                            : "rgba(255, 255, 255, 0.08)",
                                          color: isGood
                                            ? "#34d399"
                                            : isWarning
                                            ? "#fbbf24"
                                            : isBad
                                            ? "#f87171"
                                            : "#cbd5e1",
                                          border: isGood
                                            ? "1px solid rgba(16, 185, 129, 0.3)"
                                            : isWarning
                                            ? "1px solid rgba(245, 158, 11, 0.3)"
                                            : isBad
                                            ? "1px solid rgba(239, 68, 68, 0.3)"
                                            : "1px solid rgba(255, 255, 255, 0.12)",
                                        }}
                                      >
                                        {formatted.text}
                                      </span>
                                    ) : isPerson ? (
                                      <span
                                        style={{
                                          display: "inline-flex",
                                          alignItems: "center",
                                          gap: "5px",
                                          background: "rgba(14, 165, 233, 0.12)",
                                          border: "1px solid rgba(56, 189, 248, 0.25)",
                                          color: "#38bdf8",
                                          padding: "1px 7px",
                                          borderRadius: "6px",
                                          fontWeight: "600",
                                          fontSize: "11.5px",
                                          maxWidth: "220px",
                                          overflow: "hidden",
                                          textOverflow: "ellipsis",
                                          whiteSpace: "nowrap",
                                        }}
                                        title={`${
                                          colName === "partner_name" ? "Partner" : "Borrower"
                                        }: ${formatted.text} (Double-click to edit)`}
                                      >
                                        <UserRound
                                          size={11}
                                          style={{ flexShrink: 0, opacity: 0.85 }}
                                        />
                                        <span>{formatted.text}</span>
                                      </span>
                                    ) : (
                                      <span
                                        style={{
                                          overflow: "hidden",
                                          textOverflow: "ellipsis",
                                          maxWidth: "280px",
                                          color: formatted.isAmount ? "#38bdf8" : undefined,
                                          fontWeight: formatted.isAmount ? "600" : undefined,
                                        }}
                                      >
                                        {formatted.text}
                                      </span>
                                    )}

                                    {isModified && (
                                      <span
                                        style={{
                                          width: "5px",
                                          height: "5px",
                                          borderRadius: "50%",
                                          background: "#10b981",
                                          flexShrink: 0,
                                        }}
                                      />
                                    )}
                                  </div>
                                )}
                              </td>
                            );
                          })}
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            )}
          </div>

          {/* ========================================================================= */}
          {/* 3. FOOTER BAR */}
          {/* ========================================================================= */}
          <footer
            style={{
              background: "#0c1322",
              borderTop: "1px solid rgba(255, 255, 255, 0.08)",
              padding: "6px 16px",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              fontSize: "11.5px",
              color: "#94a3b8",
              flexShrink: 0,
              height: "40px",
              boxSizing: "border-box",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
              <span>
                Total: <strong style={{ color: "#38bdf8" }}>{tableData?.totalCount || 0}</strong>
                {partnerGroups && (
                  <span style={{ color: "#a855f7", marginLeft: "6px", fontWeight: "700" }}>
                    ({partnerGroups.groups.length} Partners)
                  </span>
                )}
              </span>
              <span>
                Showing: <strong style={{ color: "#e2e8f0" }}>{visibleColumns.length}</strong> columns
              </span>
              {totalModified > 0 && (
                <span style={{ color: "#10b981", fontWeight: "700" }}>
                  ● {totalModified} unsaved row(s)
                </span>
              )}
            </div>

            {/* PAGINATION */}
            {tableData && (
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "5px" }}>
                  <span>Rows:</span>
                  <select
                    value={limit}
                    onChange={(e) => {
                      setLimit(Number(e.target.value));
                      setPage(1);
                    }}
                    style={{
                      background: "#070b12",
                      color: "#ffffff",
                      border: "1px solid rgba(255, 255, 255, 0.15)",
                      borderRadius: "5px",
                      padding: "2px 4px",
                      fontSize: "11px",
                    }}
                  >
                    <option value={25}>25</option>
                    <option value={50}>50</option>
                    <option value={100}>100</option>
                  </select>
                </div>

                <span>
                  Page {tableData.page} / {Math.max(1, tableData.totalPages)}
                </span>

                <div style={{ display: "inline-flex", gap: "3px" }}>
                  <button
                    type="button"
                    disabled={page <= 1}
                    onClick={() => setPage(page - 1)}
                    style={{
                      background: "rgba(255, 255, 255, 0.06)",
                      border: "1px solid rgba(255, 255, 255, 0.12)",
                      color: page <= 1 ? "#475569" : "#ffffff",
                      borderRadius: "5px",
                      padding: "3px 6px",
                      cursor: page <= 1 ? "not-allowed" : "pointer",
                    }}
                  >
                    <ChevronLeft size={13} />
                  </button>
                  <button
                    type="button"
                    disabled={page >= tableData.totalPages}
                    onClick={() => setPage(page + 1)}
                    style={{
                      background: "rgba(255, 255, 255, 0.06)",
                      border: "1px solid rgba(255, 255, 255, 0.12)",
                      color: page >= tableData.totalPages ? "#475569" : "#ffffff",
                      borderRadius: "5px",
                      padding: "3px 6px",
                      cursor: page >= tableData.totalPages ? "not-allowed" : "pointer",
                    }}
                  >
                    <ChevronRight size={13} />
                  </button>
                </div>
              </div>
            )}
          </footer>
        </div>

        {/* ========================================================================= */}
        {/* DELETE LOAN CONFIRMATION MODAL */}
        {/* ========================================================================= */}
        {deleteModal && (
          <div
            style={{
              position: "fixed",
              inset: 0,
              zIndex: 99999,
              background: "rgba(0, 0, 0, 0.78)",
              backdropFilter: "blur(6px)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: "16px",
            }}
            onClick={() => !isDeleting && setDeleteModal(null)}
          >
            <div
              style={{
                background: "#0f172a",
                border: "1px solid rgba(239, 68, 68, 0.4)",
                boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.7), 0 0 25px rgba(239, 68, 68, 0.15)",
                borderRadius: "14px",
                width: "480px",
                maxWidth: "100%",
                overflow: "hidden",
                color: "#ffffff",
              }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Modal Header */}
              <div
                style={{
                  padding: "14px 18px",
                  background: "linear-gradient(90deg, rgba(239, 68, 68, 0.18), rgba(15, 23, 42, 0.9))",
                  borderBottom: "1px solid rgba(239, 68, 68, 0.2)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                  <div
                    style={{
                      background: "rgba(239, 68, 68, 0.2)",
                      border: "1px solid rgba(239, 68, 68, 0.4)",
                      padding: "6px",
                      borderRadius: "8px",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <AlertTriangle size={18} color="#ef4444" />
                  </div>
                  <div>
                    <h3 style={{ margin: 0, fontSize: "15px", fontWeight: "700", color: "#f87171" }}>
                      Delete Loan & Revert Capital
                    </h3>
                    <p style={{ margin: 0, fontSize: "11px", color: "#94a3b8" }}>
                      Permanent cascading deletion with capital refund
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  disabled={isDeleting}
                  onClick={() => setDeleteModal(null)}
                  style={{
                    background: "transparent",
                    border: "none",
                    color: "#94a3b8",
                    cursor: "pointer",
                    padding: "4px",
                    borderRadius: "4px",
                  }}
                >
                  <X size={16} />
                </button>
              </div>

              {/* Modal Content */}
              <div style={{ padding: "18px 20px" }}>
                <div
                  style={{
                    background: "rgba(239, 68, 68, 0.08)",
                    border: "1px solid rgba(239, 68, 68, 0.2)",
                    borderRadius: "8px",
                    padding: "12px",
                    marginBottom: "16px",
                    fontSize: "12px",
                    lineHeight: "1.5",
                    color: "#fca5a5",
                  }}
                >
                  <strong>Warning:</strong> This will completely remove this loan, all its linked collection payments, and foreign-key relational records. The disbursed capital will be <strong>reverted back into your Capital Ledger</strong>.
                </div>

                {/* Loan Info Summary Card */}
                <div
                  style={{
                    background: "#1e293b",
                    borderRadius: "8px",
                    border: "1px solid rgba(255, 255, 255, 0.08)",
                    padding: "12px 14px",
                    marginBottom: "16px",
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr",
                    gap: "10px",
                    fontSize: "12px",
                  }}
                >
                  <div>
                    <span style={{ color: "#64748b", fontSize: "10.5px", display: "block" }}>Borrower / Customer</span>
                    <strong style={{ color: "#38bdf8" }}>{deleteModal.row?.customer_name || "—"}</strong>
                  </div>
                  <div>
                    <span style={{ color: "#64748b", fontSize: "10.5px", display: "block" }}>Phone Number</span>
                    <span style={{ color: "#e2e8f0" }}>{deleteModal.row?.mobile_number || deleteModal.row?.customer_phone || "—"}</span>
                  </div>
                  <div>
                    <span style={{ color: "#64748b", fontSize: "10.5px", display: "block" }}>Loan Principal</span>
                    <strong style={{ color: "#10b981", fontSize: "13px" }}>
                      ₹{Number(deleteModal.row?.gross_finance_amount || deleteModal.row?.loan_amount || 0).toLocaleString("en-IN")}
                    </strong>
                  </div>
                  <div>
                    <span style={{ color: "#64748b", fontSize: "10.5px", display: "block" }}>Disbursement Date</span>
                    <span style={{ color: "#e2e8f0" }}>
                      {deleteModal.row?.finance_date ? String(deleteModal.row.finance_date).split("T")[0] : deleteModal.row?.start_date ? String(deleteModal.row.start_date).split("T")[0] : "—"}
                    </span>
                  </div>
                </div>

                {/* Deletion Reason Input */}
                <div style={{ marginBottom: "6px" }}>
                  <label style={{ display: "block", fontSize: "11.5px", color: "#94a3b8", marginBottom: "6px" }}>
                    Reason for Deletion (recorded in audit archive):
                  </label>
                  <input
                    type="text"
                    value={deleteReason}
                    onChange={(e) => setDeleteReason(e.target.value)}
                    placeholder="e.g., entered by mistake, customer canceled, duplicate..."
                    style={{
                      width: "100%",
                      background: "#0b1120",
                      border: "1px solid rgba(255, 255, 255, 0.15)",
                      borderRadius: "6px",
                      padding: "8px 12px",
                      color: "#ffffff",
                      fontSize: "12px",
                      boxSizing: "border-box",
                      outline: "none",
                    }}
                  />
                </div>
              </div>

              {/* Modal Actions */}
              <div
                style={{
                  padding: "12px 20px",
                  background: "#0b1120",
                  borderTop: "1px solid rgba(255, 255, 255, 0.08)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "flex-end",
                  gap: "10px",
                }}
              >
                <button
                  type="button"
                  disabled={isDeleting}
                  onClick={() => {
                    setDeleteModal(null);
                    setDeleteReason("");
                  }}
                  style={{
                    background: "rgba(255, 255, 255, 0.08)",
                    border: "1px solid rgba(255, 255, 255, 0.15)",
                    color: "#cbd5e1",
                    borderRadius: "6px",
                    padding: "7px 14px",
                    fontSize: "12px",
                    fontWeight: "600",
                    cursor: isDeleting ? "not-allowed" : "pointer",
                  }}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={isDeleting}
                  onClick={handleDeleteLoanConfirm}
                  style={{
                    background: isDeleting ? "rgba(239, 68, 68, 0.5)" : "#dc2626",
                    border: "none",
                    color: "#ffffff",
                    borderRadius: "6px",
                    padding: "7px 16px",
                    fontSize: "12px",
                    fontWeight: "700",
                    cursor: isDeleting ? "not-allowed" : "pointer",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "6px",
                    boxShadow: "0 2px 8px rgba(220, 38, 38, 0.4)",
                  }}
                >
                  <Trash2 size={13} className={isDeleting ? "animate-spin" : ""} />
                  <span>{isDeleting ? "Deleting & Reverting..." : "Confirm & Delete Loan"}</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* VIEW ARCHIVE SNAPSHOT MODAL */}
        {/* ========================================================================= */}
        {viewArchiveModal && (
          <div
            style={{
              position: "fixed",
              inset: 0,
              zIndex: 99999,
              background: "rgba(0, 0, 0, 0.78)",
              backdropFilter: "blur(6px)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: "16px",
            }}
            onClick={() => setViewArchiveModal(null)}
          >
            <div
              style={{
                background: "#0f172a",
                border: "1px solid rgba(56, 189, 248, 0.4)",
                boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.7), 0 0 25px rgba(56, 189, 248, 0.15)",
                borderRadius: "14px",
                width: "600px",
                maxWidth: "100%",
                maxHeight: "85vh",
                display: "flex",
                flexDirection: "column",
                overflow: "hidden",
                color: "#ffffff",
              }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Modal Header */}
              <div
                style={{
                  padding: "14px 18px",
                  background: "linear-gradient(90deg, rgba(56, 189, 248, 0.18), rgba(15, 23, 42, 0.9))",
                  borderBottom: "1px solid rgba(56, 189, 248, 0.2)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                  <div
                    style={{
                      background: "rgba(56, 189, 248, 0.2)",
                      border: "1px solid rgba(56, 189, 248, 0.4)",
                      padding: "6px",
                      borderRadius: "8px",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <Archive size={18} color="#38bdf8" />
                  </div>
                  <div>
                    <h3 style={{ margin: 0, fontSize: "15px", fontWeight: "700", color: "#38bdf8" }}>
                      Archived Loan Snapshot
                    </h3>
                    <p style={{ margin: 0, fontSize: "11px", color: "#94a3b8" }}>
                      Immutable historical record preserved upon deletion
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setViewArchiveModal(null)}
                  style={{
                    background: "transparent",
                    border: "none",
                    color: "#94a3b8",
                    cursor: "pointer",
                    padding: "4px",
                    borderRadius: "4px",
                  }}
                >
                  <X size={16} />
                </button>
              </div>

              {/* Modal Body */}
              <div style={{ padding: "18px 20px", overflowY: "auto", flex: 1 }}>
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr",
                    gap: "12px",
                    background: "#1e293b",
                    borderRadius: "8px",
                    padding: "14px",
                    marginBottom: "16px",
                    fontSize: "12px",
                  }}
                >
                  <div>
                    <span style={{ color: "#64748b", fontSize: "10.5px", display: "block" }}>Borrower / Customer</span>
                    <strong style={{ color: "#38bdf8", fontSize: "13px" }}>{viewArchiveModal.customer_name || "—"}</strong>
                  </div>
                  <div>
                    <span style={{ color: "#64748b", fontSize: "10.5px", display: "block" }}>Phone Number</span>
                    <span style={{ color: "#e2e8f0" }}>{viewArchiveModal.customer_phone || "—"}</span>
                  </div>
                  <div>
                    <span style={{ color: "#64748b", fontSize: "10.5px", display: "block" }}>Loan Module</span>
                    <span style={{ color: "#facc15", fontWeight: "700" }}>{viewArchiveModal.loan_type}</span>
                  </div>
                  <div>
                    <span style={{ color: "#64748b", fontSize: "10.5px", display: "block" }}>Original Loan ID</span>
                    <span style={{ color: "#94a3b8", fontFamily: "monospace", fontSize: "11px" }}>{viewArchiveModal.loan_id}</span>
                  </div>
                  <div>
                    <span style={{ color: "#64748b", fontSize: "10.5px", display: "block" }}>Principal Disbursed</span>
                    <strong style={{ color: "#10b981", fontSize: "13px" }}>
                      ₹{Number(viewArchiveModal.principal_amount || 0).toLocaleString("en-IN")}
                    </strong>
                  </div>
                  <div>
                    <span style={{ color: "#64748b", fontSize: "10.5px", display: "block" }}>Total Collected Before Deletion</span>
                    <strong style={{ color: "#a855f7", fontSize: "13px" }}>
                      ₹{Number(viewArchiveModal.total_collected || 0).toLocaleString("en-IN")}
                    </strong>
                  </div>
                  <div>
                    <span style={{ color: "#64748b", fontSize: "10.5px", display: "block" }}>Deleted By</span>
                    <span style={{ color: "#cbd5e1" }}>{viewArchiveModal.deleted_by || "Admin"}</span>
                  </div>
                  <div>
                    <span style={{ color: "#64748b", fontSize: "10.5px", display: "block" }}>Deleted Date</span>
                    <span style={{ color: "#cbd5e1" }}>
                      {viewArchiveModal.deleted_at ? new Date(viewArchiveModal.deleted_at).toLocaleString("en-IN") : "—"}
                    </span>
                  </div>
                </div>

                {viewArchiveModal.deletion_reason && (
                  <div
                    style={{
                      background: "rgba(255, 255, 255, 0.04)",
                      border: "1px solid rgba(255, 255, 255, 0.08)",
                      borderRadius: "8px",
                      padding: "10px 14px",
                      marginBottom: "16px",
                      fontSize: "12px",
                    }}
                  >
                    <span style={{ color: "#64748b", fontSize: "10.5px", display: "block", marginBottom: "3px" }}>Deletion Reason</span>
                    <span style={{ color: "#e2e8f0" }}>{viewArchiveModal.deletion_reason}</span>
                  </div>
                )}

                {/* Details Snapshot JSON preview if present */}
                {viewArchiveModal.details_json && (
                  <div>
                    <span style={{ color: "#64748b", fontSize: "11px", fontWeight: "600", display: "block", marginBottom: "6px" }}>
                      Archived Details Snapshot:
                    </span>
                    <pre
                      style={{
                        background: "#080d1a",
                        border: "1px solid rgba(255, 255, 255, 0.08)",
                        borderRadius: "8px",
                        padding: "10px",
                        fontSize: "11px",
                        color: "#94a3b8",
                        maxHeight: "180px",
                        overflow: "auto",
                        whiteSpace: "pre-wrap",
                        wordBreak: "break-all",
                      }}
                    >
                      {typeof viewArchiveModal.details_json === "string"
                        ? viewArchiveModal.details_json
                        : JSON.stringify(viewArchiveModal.details_json, null, 2)}
                    </pre>
                  </div>
                )}
              </div>

              {/* Modal Footer */}
              <div
                style={{
                  padding: "10px 20px",
                  background: "#0b1120",
                  borderTop: "1px solid rgba(255, 255, 255, 0.08)",
                  display: "flex",
                  justifyContent: "flex-end",
                }}
              >
                <button
                  type="button"
                  onClick={() => setViewArchiveModal(null)}
                  style={{
                    background: "rgba(56, 189, 248, 0.15)",
                    border: "1px solid rgba(56, 189, 248, 0.4)",
                    color: "#38bdf8",
                    borderRadius: "6px",
                    padding: "6px 14px",
                    fontSize: "12px",
                    fontWeight: "600",
                    cursor: "pointer",
                  }}
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Rule Violation Prevention Popup Modal */}
        {violationModal && (
          <div
            style={{
              position: "fixed",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: "rgba(0, 0, 0, 0.78)",
              backdropFilter: "blur(6px)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              zIndex: 9999,
              padding: "16px",
            }}
          >
            <div
              style={{
                background: "#0f172a",
                border: "1px solid rgba(239, 68, 68, 0.4)",
                boxShadow: "0 25px 50px -12px rgba(239, 68, 68, 0.3)",
                borderRadius: "14px",
                width: "100%",
                maxWidth: "500px",
                overflow: "hidden",
                animation: "scaleIn 0.15s ease-out",
              }}
            >
              {/* Modal Header */}
              <div
                style={{
                  padding: "16px 20px",
                  background: "linear-gradient(135deg, rgba(239, 68, 68, 0.2), rgba(15, 23, 42, 0.95))",
                  borderBottom: "1px solid rgba(239, 68, 68, 0.3)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                  <div
                    style={{
                      width: "36px",
                      height: "36px",
                      borderRadius: "10px",
                      background: "rgba(239, 68, 68, 0.2)",
                      border: "1px solid rgba(239, 68, 68, 0.5)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <AlertTriangle size={20} color="#ef4444" />
                  </div>
                  <div>
                    <h3 style={{ margin: 0, fontSize: "15px", fontWeight: "700", color: "#f87171" }}>
                      {violationModal.title || "Rule Violation Prevented"}
                    </h3>
                    <p style={{ margin: "2px 0 0 0", fontSize: "11px", color: "#94a3b8" }}>
                      Financial Ledger Safeguard System
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setViolationModal(null)}
                  style={{
                    background: "none",
                    border: "none",
                    color: "#94a3b8",
                    cursor: "pointer",
                    padding: "4px",
                    display: "flex",
                    borderRadius: "4px",
                  }}
                >
                  <X size={18} />
                </button>
              </div>

              {/* Modal Content */}
              <div style={{ padding: "20px" }}>
                <p style={{ margin: "0 0 16px 0", fontSize: "13px", lineHeight: "1.5", color: "#e2e8f0" }}>
                  {violationModal.message}
                </p>

                {/* Details Breakdown Grid */}
                {Array.isArray(violationModal.details) && violationModal.details.length > 0 && (
                  <div
                    style={{
                      background: "rgba(15, 23, 42, 0.8)",
                      border: "1px solid rgba(255, 255, 255, 0.08)",
                      borderRadius: "8px",
                      padding: "12px 14px",
                      marginBottom: "16px",
                      display: "grid",
                      gap: "8px",
                    }}
                  >
                    {violationModal.details.map((d, i) => (
                      <div
                        key={i}
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          fontSize: "12px",
                          borderBottom: i < violationModal.details.length - 1 ? "1px solid rgba(255, 255, 255, 0.04)" : "none",
                          paddingBottom: i < violationModal.details.length - 1 ? "6px" : 0,
                        }}
                      >
                        <span style={{ color: "#94a3b8", fontWeight: "500" }}>{d.label}:</span>
                        <span style={{ color: "#f1f5f9", fontWeight: "600", fontFamily: "monospace" }}>
                          {d.value}
                        </span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Guidance / Hint Box */}
                {violationModal.hint && (
                  <div
                    style={{
                      background: "rgba(245, 158, 11, 0.1)",
                      border: "1px solid rgba(245, 158, 11, 0.25)",
                      borderRadius: "8px",
                      padding: "10px 14px",
                      fontSize: "12px",
                      color: "#fbbf24",
                      lineHeight: "1.4",
                    }}
                  >
                    💡 <strong>Notice:</strong> {violationModal.hint}
                  </div>
                )}
              </div>

              {/* Modal Footer */}
              <div
                style={{
                  padding: "12px 20px",
                  background: "#0b1120",
                  borderTop: "1px solid rgba(255, 255, 255, 0.08)",
                  display: "flex",
                  justifyContent: "flex-end",
                  gap: "10px",
                }}
              >
                {violationModal.onRevert && (
                  <button
                    type="button"
                    onClick={violationModal.onRevert}
                    style={{
                      background: "rgba(239, 68, 68, 0.15)",
                      border: "1px solid rgba(239, 68, 68, 0.4)",
                      color: "#f87171",
                      borderRadius: "6px",
                      padding: "7px 14px",
                      fontSize: "12px",
                      fontWeight: "600",
                      cursor: "pointer",
                    }}
                  >
                    Revert Invalid Value
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setViolationModal(null)}
                  style={{
                    background: "#2563eb",
                    border: "none",
                    color: "#ffffff",
                    borderRadius: "6px",
                    padding: "7px 18px",
                    fontSize: "12px",
                    fontWeight: "600",
                    cursor: "pointer",
                  }}
                >
                  Understood & Close
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
