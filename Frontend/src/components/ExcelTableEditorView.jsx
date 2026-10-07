import React, { useState, useEffect, useRef, useMemo } from "react";
import {
  Table,
  Trash2,
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
  CarFront,
  UserRound,
  Calendar,
  Receipt,
  Globe,
  ChevronDown,
} from "lucide-react";
import { getApiBaseUrl } from "../apiConfig.js";

// Core 5-7 essential business fields per table (using person names instead of raw IDs)
const ESSENTIAL_COLUMNS_MAP = {
  global_partners: ["name", "phone", "email", "status", "notes"],
  partner_capital_transactions: [
    "partner_name",
    "transaction_type",
    "fund_source_type",
    "lender_name",
    "amount",
    "effective_date",
    "status",
  ],
  autofinance_loans: [
    "customer_name",
    "loan_amount",
    "interest_rate",
    "tenure_months",
    "start_date",
    "status",
  ],
  autofinance_customers: [
    "customer_code",
    "first_name",
    "last_name",
    "phone",
    "city",
    "address",
  ],
  daily_finance_customers: [
    "customer_name",
    "mobile_number",
    "address",
    "status",
    "notes",
  ],
  autofinance_emi_schedules: [
    "customer_name",
    "installment_number",
    "due_date",
    "total_emi",
    "collected_amount",
    "status",
  ],
  autofinance_payments: [
    "customer_name",
    "payment_date",
    "amount_paid",
    "payment_method",
    "reference_number",
  ],
  daily_finance_payments: [
    "customer_name",
    "collection_date",
    "amount",
    "payment_method",
    "status",
    "notes",
  ],
  global_cash_ledger: [
    "transaction_date",
    "type",
    "direction",
    "amount",
    "source_module",
    "notes",
  ],
  expenses: [
    "expense_date",
    "category",
    "expense_type",
    "amount",
    "description",
  ],
};

// Friendly column labels
const COLUMN_LABEL_MAP = {
  id: "ID",
  name: "Partner Name",
  partner_name: "Partner Name",
  customer_name: "Customer Name",
  phone: "Phone",
  email: "Email",
  status: "Status",
  notes: "Notes",
  partner_id: "Partner",
  transaction_type: "Type",
  fund_source_type: "Source (Own/Lend)",
  lender_name: "Lender Name",
  amount: "Amount",
  effective_date: "Date",
  customer_id: "Customer",
  loan_amount: "Loan Amount",
  interest_rate: "Interest %",
  tenure_months: "Tenure (Mo)",
  start_date: "Start Date",
  end_date: "End Date",
  customer_code: "Customer Code",
  first_name: "First Name",
  last_name: "Last Name",
  city: "City",
  address: "Address",
  mobile_number: "Mobile Number",
  loan_id: "Loan",
  installment_number: "EMI #",
  due_date: "Due Date",
  total_emi: "Total EMI",
  collected_amount: "Collected",
  payment_date: "Payment Date",
  amount_paid: "Amount Paid",
  payment_method: "Payment Method",
  reference_number: "Ref Number",
  collection_date: "Collection Date",
  transaction_date: "Txn Date",
  direction: "Direction",
  source_module: "Source Module",
  expense_date: "Expense Date",
  category: "Category",
  expense_type: "Expense Type",
  description: "Description",
};

const getTableIcon = (tableName) => {
  switch (tableName) {
    case "global_partners":
      return Users;
    case "partner_capital_transactions":
      return Landmark;
    case "autofinance_loans":
      return CarFront;
    case "autofinance_customers":
    case "daily_finance_customers":
      return UserRound;
    case "autofinance_emi_schedules":
      return Calendar;
    case "autofinance_payments":
    case "daily_finance_payments":
      return Receipt;
    case "global_cash_ledger":
      return Globe;
    case "expenses":
      return Receipt;
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
  const [notification, setNotification] = useState(null);
  const editInputRef = useRef(null);

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
          const defaultTbl = data.tables.find((t) => t.name === "partner_capital_transactions") || data.tables[0];
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

  // Compute visible columns: ALWAYS ESSENTIAL, ordered with Person Name first, excluding 'id'
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
      matched.sort((a, b) => orderMap.get(a.column_name.toLowerCase()) - orderMap.get(b.column_name.toLowerCase()));
      return matched.length > 0 ? matched : columnsWithoutId;
    }

    return columnsWithoutId.slice(0, 7);
  }, [tableData, selectedTable]);

  // Cell editing (Person Names and PKs are read-only references; operational fields are editable)
  const handleCellClick = (rowId, colName) => {
    const colDef = tableData?.columns.find((c) => c.column_name === colName);
    if (colDef?.is_primary || colName === "partner_name" || colName === "customer_name") return;
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

  // Save single row
  const saveRow = async (row) => {
    const pkCol = tableData?.primaryKey || "id";
    const rowId = row[pkCol];
    const changes = modifiedRows[rowId];
    if (!changes || Object.keys(changes).length === 0) return;

    setSavingRows((prev) => ({ ...prev, [rowId]: true }));
    try {
      const apiBase = getApiBaseUrl();
      const res = await fetch(`${apiBase}/table-editor/data/${selectedTable}/${encodeURIComponent(rowId)}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${getAuthToken()}`,
        },
        body: JSON.stringify(changes),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Save failed");
      }

      setTableData((prev) => ({
        ...prev,
        rows: prev.rows.map((r) => (r[pkCol] === rowId ? { ...r, ...data.updatedRow } : r)),
      }));

      setModifiedRows((prev) => {
        const next = { ...prev };
        delete next[rowId];
        return next;
      });

      showNotice("success", `Row updated in ${selectedTable}`);
    } catch (err) {
      showNotice("error", `Failed to save: ${err.message}`);
    } finally {
      setSavingRows((prev) => ({ ...prev, [rowId]: false }));
    }
  };

  // Save all modified rows
  const saveAllChanges = async () => {
    const rowIds = Object.keys(modifiedRows);
    if (rowIds.length === 0) return;

    for (const rId of rowIds) {
      const row = tableData.rows.find((r) => String(r[tableData.primaryKey || "id"]) === String(rId));
      if (row) {
        await saveRow(row);
      }
    }
  };

  // Delete row
  const deleteRow = async (row) => {
    const pkCol = tableData?.primaryKey || "id";
    const rowId = row[pkCol];
    if (!window.confirm(`Are you sure you want to delete this row (${pkCol} = ${rowId})? This action cannot be undone.`)) {
      return;
    }

    try {
      const apiBase = getApiBaseUrl();
      const res = await fetch(`${apiBase}/table-editor/data/${selectedTable}/${encodeURIComponent(rowId)}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${getAuthToken()}` },
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Delete failed");
      }

      setTableData((prev) => ({
        ...prev,
        rows: prev.rows.filter((r) => r[pkCol] !== rowId),
        totalCount: Math.max(0, prev.totalCount - 1),
      }));
      showNotice("success", "Row deleted successfully");
    } catch (err) {
      showNotice("error", `Failed to delete row: ${err.message}`);
    }
  };

  // Group tables by module
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
      colName.includes("interest_component");

    if (isAmountCol && !isNaN(Number(val)) && val !== "") {
      const num = Number(val);
      return {
        text: "₹ " + num.toLocaleString("en-IN", { minimumFractionDigits: num % 1 === 0 ? 0 : 2 }),
        isAmount: true,
      };
    }

    // Format dates
    if (dataType === "date" || (colName.includes("date") && !colName.includes("time"))) {
      if (str.length >= 10) return { text: str.slice(0, 10), isDate: true };
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
            <span style={{ fontWeight: "800", fontSize: "13.5px", letterSpacing: "-0.2px", color: "#ffffff" }}>
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

        {/* Right Side: Search, Save, Refresh, Close */}
        <div style={{ display: "flex", alignItems: "center", gap: "7px", flexShrink: 0 }}>
          {/* SEARCH INPUT */}
          <form onSubmit={handleSearchSubmit} style={{ display: "flex", alignItems: "center" }}>
            <div style={{ position: "relative" }}>
              <input
                type="text"
                placeholder="Search..."
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
              disabled={loading}
              onClick={saveAllChanges}
              style={{
                background: "linear-gradient(135deg, #10b981, #059669)",
                border: "none",
                color: "#ffffff",
                borderRadius: "7px",
                padding: "5px 11px",
                fontSize: "12px",
                fontWeight: "700",
                cursor: loading ? "not-allowed" : "pointer",
                display: "flex",
                alignItems: "center",
                gap: "5px",
                boxShadow: "0 0 10px rgba(16, 185, 129, 0.5)",
              }}
            >
              <Save size={14} /> Save ({totalModified})
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
            title="Refresh"
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
        {/* COMPACT LEFT SIDEBAR: STRICTLY 210px WIDTH, NEVER OVERFLOWS OR OVERLAPS TABLE */}
        <div
          className="studioSidebarNav"
          style={{
            position: "relative",
            width: "210px",
            minWidth: "210px",
            maxWidth: "210px",
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
            {loading && <RefreshCw size={11} style={{ animation: "spin 0.8s linear infinite", color: "#38bdf8" }} />}
          </div>

          <div style={{ padding: "8px 6px", display: "flex", flexDirection: "column", gap: "10px" }}>
            {Object.entries(groupedTables).map(([moduleName, tList]) => (
              <div key={moduleName}>
                <div
                  style={{
                    fontSize: "9.5px",
                    fontWeight: "800",
                    color: "#64748b",
                    textTransform: "uppercase",
                    letterSpacing: "0.5px",
                    padding: "2px 6px 4px",
                  }}
                >
                  {moduleName}
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
                        <div style={{ display: "flex", alignItems: "center", gap: "6px", overflow: "hidden", minWidth: 0 }}>
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
                              fontSize: "11.5px",
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

        {/* RIGHT AREA: SPREADSHEET TABLE GRID CONTAINER (FLEX: 1, MINWIDTH: 0) */}
        <div
          style={{
            flex: 1,
            minWidth: 0,
            width: "calc(100% - 210px)",
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

                    {/* Actions Header */}
                    <th
                      style={{
                        padding: "8px 9px",
                        width: "74px",
                        textAlign: "center",
                        borderRight: "1px solid #243044",
                        color: "#94a3b8",
                        fontSize: "10.5px",
                        fontWeight: "700",
                        userSelect: "none",
                        background: "#101624",
                      }}
                    >
                      Actions
                    </th>

                    {/* Data Columns */}
                    {visibleColumns.map((col) => {
                      const label = COLUMN_LABEL_MAP[col.column_name] || col.column_name;
                      const isAmount = col.column_name.includes("amount") || col.column_name.includes("total_emi");
                      const isPerson = col.column_name === "partner_name" || col.column_name === "customer_name";

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
                            {col.is_primary && <Key size={11} color="#f59e0b" title="Primary Key" />}
                            {isPerson && <UserRound size={11} color="#38bdf8" title="Person Identity" />}
                            <span
                              style={{
                                fontWeight: "700",
                                color: col.is_primary ? "#fbbf24" : isPerson ? "#38bdf8" : "#f1f5f9",
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
                        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "8px" }}>
                          <Table size={32} color="#334155" />
                          <span style={{ fontSize: "13px", fontWeight: "600", color: "#94a3b8" }}>
                            No records in `{selectedTable}`
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

                      return (
                        <tr
                          key={rowId || idx}
                          style={{
                            background: hasChanges
                              ? "rgba(16, 185, 129, 0.12)"
                              : idx % 2 === 0
                              ? "#090f1a"
                              : "#0c1322",
                            borderBottom: "1px solid rgba(255, 255, 255, 0.04)",
                            transition: "background 0.1s ease",
                          }}
                        >
                          {/* Row Index */}
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

                          {/* Row Actions */}
                          <td
                            style={{
                              textAlign: "center",
                              borderRight: "1px solid rgba(255, 255, 255, 0.04)",
                              padding: "3px",
                            }}
                          >
                            <div style={{ display: "inline-flex", gap: "4px", alignItems: "center" }}>
                              {hasChanges && (
                                <button
                                  type="button"
                                  onClick={() => saveRow(row)}
                                  disabled={isSaving}
                                  style={{
                                    background: "#10b981",
                                    border: "none",
                                    color: "#ffffff",
                                    borderRadius: "4px",
                                    padding: "2px 6px",
                                    cursor: "pointer",
                                    fontSize: "10.5px",
                                    fontWeight: "700",
                                  }}
                                  title="Save row"
                                >
                                  {isSaving ? "..." : <Save size={12} />}
                                </button>
                              )}
                              <button
                                type="button"
                                onClick={() => deleteRow(row)}
                                style={{
                                  background: "rgba(239, 68, 68, 0.12)",
                                  border: "1px solid rgba(239, 68, 68, 0.25)",
                                  color: "#f87171",
                                  borderRadius: "4px",
                                  padding: "2px 5px",
                                  cursor: "pointer",
                                }}
                                title="Delete row"
                              >
                                <Trash2 size={12} />
                              </button>
                            </div>
                          </td>

                          {/* Editable Cells */}
                          {visibleColumns.map((col) => {
                            const colName = col.column_name;
                            const isPK = col.is_primary;
                            const isEditing = editingCell?.rowId === rowId && editingCell?.colName === colName;
                            const isModified = modifiedRows[rowId] && colName in modifiedRows[rowId];
                            const currentValue = isModified
                              ? modifiedRows[rowId][colName]
                              : row[colName];

                            const formatted = formatCellValue(currentValue, colName, col.data_type);

                            // Status pill styling
                            const isStatus = colName === "status";
                            const statusUpper = String(currentValue || "").toUpperCase();
                            const isGood = ["ACTIVE", "APPROVED", "PAID", "COMPLETED", "SUCCESS"].includes(statusUpper);
                            const isWarning = ["PENDING", "DUE", "PARTIAL", "WAITING"].includes(statusUpper);
                            const isBad = ["INACTIVE", "REJECTED", "OVERDUE", "FAILED", "CANCELLED"].includes(statusUpper);

                            const isAmount = colName.includes("amount") || colName.includes("total_emi");
                            const isPerson = (colName === "partner_name" || colName === "customer_name") && !formatted.isNull;

                            return (
                              <td
                                key={colName}
                                onDoubleClick={() => !isPK && !isPerson && handleCellClick(rowId, colName)}
                                style={{
                                  padding: isEditing ? "2px" : "6px 12px",
                                  borderRight: "1px solid rgba(255, 255, 255, 0.04)",
                                  cursor: isPK || isPerson ? "default" : "cell",
                                  background: isModified ? "rgba(16, 185, 129, 0.16)" : undefined,
                                  color: formatted.isNull ? "#475569" : "#e2e8f0",
                                  fontStyle: formatted.isNull ? "italic" : "normal",
                                  textAlign: isAmount ? "right" : "left",
                                  fontFamily:
                                    isPK || isAmount || col.data_type.includes("numeric") || col.data_type.includes("integer")
                                      ? "'JetBrains Mono', monospace"
                                      : "inherit",
                                }}
                                title={
                                  isPK
                                    ? "Primary Key"
                                    : isPerson
                                    ? "Person Identity (Read-only reference)"
                                    : "Double-click to edit cell"
                                }
                              >
                                {isEditing ? (
                                  <input
                                    ref={editInputRef}
                                    type="text"
                                    value={currentValue === null ? "" : currentValue}
                                    onChange={(e) => handleCellChange(rowId, colName, e.target.value)}
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
                                    {isStatus && !formatted.isNull ? (
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
                                        title={`${colName === "partner_name" ? "Partner" : "Customer"}: ${formatted.text}`}
                                      >
                                        <UserRound size={11} style={{ flexShrink: 0, opacity: 0.85 }} />
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
      </div>
    </div>
  );
}
