import React, { useState, useEffect, useMemo } from "react";
import {
  FileSpreadsheet,
  ChevronLeft,
  ChevronRight,
  Calendar,
  Search,
  CheckCircle2,
  Clock,
  Edit3,
  ArrowRight,
} from "lucide-react";
import { Metric, Empty, PhoneLink } from "./CommonComponents.jsx";
import { money, dateLabel } from "../services/dailyFinanceApi.js";
import { exportDailyCollectionsSheet } from "../services/dailyExportUtils.js";

function EntryRow({ customer, date, savePayment, onEditPayment, openDetails, busy }) {
  const isCollected = Number(customer.today_collection || 0) > 0;
  const remainingLoan = Number(customer.remaining || 0);
  const maxAllowed = Math.max(
    0,
    remainingLoan + (isCollected ? Number(customer.today_collection || 0) : 0),
  );

  const defaultAmount = isCollected
    ? customer.today_collection
    : (customer.daily_agreed_due > 0 ? Math.min(Number(customer.daily_agreed_due), maxAllowed) : "");

  const [amount, setAmount] = useState(defaultAmount);

  useEffect(() => {
    if (isCollected) {
      setAmount(customer.today_collection || "");
    } else {
      setAmount(customer.daily_agreed_due > 0 ? Math.min(Number(customer.daily_agreed_due), maxAllowed) : "");
    }
  }, [customer.today_collection, customer.daily_agreed_due, isCollected, maxAllowed]);

  const isExceeded = Number(amount || 0) > maxAllowed;

  const handleCollect = (event) => {
    if (event) event.preventDefault();
    const finalAmount = amount !== "" ? amount : customer.daily_agreed_due;
    if (!finalAmount || Number(finalAmount) <= 0 || isExceeded) return;
    savePayment(customer, finalAmount);
  };

  const handleOpenEditPopup = () => {
    if (!onEditPayment) return;
    onEditPayment({
      payment_id: customer.today_payment_id,
      customer_name: customer.customer_name,
      collectionDate: date,
      amount: customer.today_collection,
      paymentMethod: customer.today_payment_method || "CASH",
      notes: customer.notes || "",
      maxAllowed,
      agreedTotalPayable: customer.agreed_total_payable,
      remaining: customer.remaining,
    });
  };

  return (
    <tr
      style={{
        backgroundColor: isCollected ? "rgba(240, 253, 244, 0.4)" : "inherit",
        transition: "background-color 0.2s ease",
      }}
    >
      <td>
        <button
          type="button"
          className="linkButton"
          onClick={() => openDetails(customer.customer_id)}
          title="View complete customer loan dossier and collection ledger"
        >
          <b>{customer.customer_name}</b>
          <small>
            {customer.mobile_number ? (
              <PhoneLink phone={customer.mobile_number} />
            ) : (
              "Open customer details"
            )}
          </small>
        </button>
      </td>

      <td>
        <div style={{ fontWeight: "600" }}>{money(customer.agreed_total_payable)}</div>
        <small style={{ color: "#64748b" }}>Ret: {money(customer.total_collected)}</small>
      </td>

      <td className="redText" style={{ fontWeight: "700" }}>
        {money(customer.remaining)}
      </td>

      <td>
        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
          <span style={{ fontWeight: "700", color: "#0f766e" }}>
            {money(customer.daily_agreed_due || 0)}
          </span>
          {!isCollected && Number(customer.daily_agreed_due) > 0 && amount !== customer.daily_agreed_due && (
            <button
              type="button"
              onClick={() => setAmount(customer.daily_agreed_due)}
              title="Reset input to predicted daily due"
              style={{
                fontSize: "10.5px",
                padding: "2px 6px",
                borderRadius: "4px",
                background: "#f0fdf4",
                border: "1px solid #bbf7d0",
                color: "#16a34a",
                cursor: "pointer",
                fontWeight: "600",
              }}
            >
              Fill Due
            </button>
          )}
        </div>
      </td>

      {/* Collection Status & Inline Input */}
      <td>
        {isCollected ? (
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <span
              onClick={handleOpenEditPopup}
              title="Click to open popup and edit this collection"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "5px",
                background: "#dcfce7",
                color: "#15803d",
                padding: "5px 10px",
                borderRadius: "6px",
                fontWeight: "700",
                fontSize: "13px",
                cursor: "pointer",
                border: "1px solid #bbf7d0",
              }}
            >
              <CheckCircle2 size={15} color="#16a34a" />
              Collected {money(customer.today_collection)}
            </span>
            <small style={{ color: "#64748b", fontSize: "11px", fontWeight: "600" }}>
              ({customer.today_payment_method || "CASH"})
            </small>
          </div>
        ) : (
          <form onSubmit={handleCollect} style={{ display: "flex", flexDirection: "column", gap: "3px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              <div style={{ position: "relative", display: "inline-block" }}>
                <span
                  style={{
                    position: "absolute",
                    left: "8px",
                    top: "50%",
                    transform: "translateY(-50%)",
                    color: isExceeded ? "#ef4444" : "#64748b",
                    fontWeight: "600",
                    fontSize: "13px",
                    pointerEvents: "none",
                  }}
                >
                  ₹
                </span>
                <input
                  className="inlineInput"
                  type="number"
                  min="0"
                  max={maxAllowed}
                  step="0.01"
                  value={amount}
                  onChange={(event) => setAmount(event.target.value)}
                  placeholder={customer.daily_agreed_due || "0"}
                  style={{
                    paddingLeft: "22px",
                    width: "110px",
                    fontWeight: "600",
                    fontSize: "13.5px",
                    borderColor: isExceeded ? "#ef4444" : undefined,
                    backgroundColor: isExceeded ? "#fef2f2" : undefined,
                    color: isExceeded ? "#b91c1c" : undefined,
                  }}
                />
              </div>

              {maxAllowed > 0 && maxAllowed < Number(customer.daily_agreed_due) && (
                <button
                  type="button"
                  onClick={() => setAmount(maxAllowed)}
                  title="Loan finishing: Set exact remaining balance"
                  style={{
                    fontSize: "10.5px",
                    padding: "3px 6px",
                    borderRadius: "4px",
                    background: "#ecfdf5",
                    border: "1px solid #a7f3d0",
                    color: "#047857",
                    cursor: "pointer",
                    fontWeight: "700",
                  }}
                >
                  Final {money(maxAllowed)}
                </button>
              )}
            </div>

            {isExceeded && (
              <div style={{ color: "#dc2626", fontSize: "11px", fontWeight: "700", display: "flex", alignItems: "center", gap: "4px" }}>
                <span>⚠️ Max {money(maxAllowed)}</span>
                <button
                  type="button"
                  onClick={() => setAmount(maxAllowed)}
                  style={{
                    fontSize: "10px",
                    padding: "1px 5px",
                    borderRadius: "3px",
                    background: "#fee2e2",
                    border: "1px solid #fca5a5",
                    color: "#991b1b",
                    cursor: "pointer",
                    fontWeight: "700",
                  }}
                >
                  Set {money(maxAllowed)}
                </button>
              </div>
            )}
          </form>
        )}
      </td>

      {/* Action Button: "Collect" or "Edit Collection Popup" */}
      <td>
        {isCollected ? (
          <button
            type="button"
            className="payButton"
            style={{
              background: "#f1f5f9",
              color: "#334155",
              borderColor: "#cbd5e1",
              display: "inline-flex",
              alignItems: "center",
              gap: "5px",
              padding: "6px 12px",
              fontSize: "12px",
            }}
            onClick={handleOpenEditPopup}
            title="Open collection popup to edit amount, date, or method"
          >
            <Edit3 size={13} /> Edit
          </button>
        ) : (
          <button
            type="button"
            className="payButton"
            disabled={busy || !amount || Number(amount) <= 0 || isExceeded}
            onClick={handleCollect}
            style={{
              background: isExceeded ? "#94a3b8" : "#059669",
              color: "#ffffff",
              borderColor: isExceeded ? "#94a3b8" : "#059669",
              fontWeight: "700",
              boxShadow: isExceeded ? "none" : "0 2px 6px rgba(5, 150, 105, 0.25)",
              display: "inline-flex",
              alignItems: "center",
              gap: "4px",
              padding: "7px 16px",
              cursor: isExceeded ? "not-allowed" : "pointer",
            }}
            title={
              isExceeded
                ? `Collection cannot exceed remaining balance (Max: ₹${maxAllowed})`
                : `Collect ₹${amount || customer.daily_agreed_due || 0}`
            }
          >
            Collect {amount && Number(amount) > 0 && !isExceeded ? `₹${amount}` : ""}
          </button>
        )}
      </td>
    </tr>
  );
}

export default function DailyEntryTab({
  date,
  setDate,
  daily = [],
  savePayment,
  openDetails,
  onEditPayment,
  busy,
}) {
  const [search, setSearch] = useState("");
  const [filterTab, setFilterTab] = useState("ALL"); // ALL | PENDING | COLLECTED

  // Quick Date Navigation
  const shiftDate = (days) => {
    const [y, m, d] = date.split("-").map(Number);
    const curr = new Date(y, m - 1, d);
    curr.setDate(curr.getDate() + days);
    const offset = curr.getTimezoneOffset();
    const nextIso = new Date(curr.getTime() - offset * 60000)
      .toISOString()
      .slice(0, 10);
    setDate(nextIso);
  };

  const goToday = () => {
    const now = new Date();
    const offset = now.getTimezoneOffset();
    const todayIso = new Date(now.getTime() - offset * 60000)
      .toISOString()
      .slice(0, 10);
    setDate(todayIso);
  };

  // KPIs & Calculations
  const predictedDayCollection = useMemo(
    () => daily.reduce((sum, c) => sum + Number(c.daily_agreed_due || 0), 0),
    [daily],
  );

  const totalCollectedToday = useMemo(
    () => daily.reduce((sum, c) => sum + Number(c.today_collection || 0), 0),
    [daily],
  );

  const pendingCollection = Math.max(predictedDayCollection - totalCollectedToday, 0);

  const collectedCount = useMemo(
    () => daily.filter((c) => Number(c.today_collection || 0) > 0).length,
    [daily],
  );

  const pendingCount = daily.length - collectedCount;
  const progressPercent =
    predictedDayCollection > 0
      ? Math.min(100, Math.round((totalCollectedToday / predictedDayCollection) * 100))
      : 0;

  // Filtered list
  const filteredList = useMemo(() => {
    return daily.filter((c) => {
      const q = (search || "").trim().toLowerCase();
      const matchSearch =
        !q ||
        (c.customer_name && c.customer_name.toLowerCase().includes(q)) ||
        (c.mobile_number && c.mobile_number.includes(q));

      const isPaid = Number(c.today_collection || 0) > 0;
      let matchTab = true;
      if (filterTab === "PENDING") matchTab = !isPaid;
      if (filterTab === "COLLECTED") matchTab = isPaid;

      return matchSearch && matchTab;
    });
  }, [daily, search, filterTab]);

  return (
    <section className="content">
      {/* Page Header */}
      <div className="intro">
        <div>
          <span className="overline">DAILY COLLECTION ENTRY</span>
          <h2>Daily Collections</h2>
          <p>Collect daily agreed dues, update entries, or export day collection sheets.</p>
        </div>

        {/* Date Navigator Controls */}
        <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              background: "#ffffff",
              border: "1px solid #cbd5e1",
              borderRadius: "8px",
              padding: "2px 4px",
              boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
            }}
          >
            <button
              type="button"
              onClick={() => shiftDate(-1)}
              title="Previous Day"
              style={{
                background: "transparent",
                border: 0,
                padding: "6px 8px",
                cursor: "pointer",
                borderRadius: "6px",
                display: "flex",
                alignItems: "center",
                color: "#475569",
              }}
            >
              <ChevronLeft size={16} />
            </button>

            <input
              type="date"
              value={date}
              onChange={(event) => setDate(event.target.value)}
              style={{
                border: 0,
                outline: "none",
                fontWeight: "700",
                fontSize: "13.5px",
                color: "#0f172a",
                padding: "4px 6px",
                cursor: "pointer",
              }}
            />

            <button
              type="button"
              onClick={() => shiftDate(1)}
              title="Next Day"
              style={{
                background: "transparent",
                border: 0,
                padding: "6px 8px",
                cursor: "pointer",
                borderRadius: "6px",
                display: "flex",
                alignItems: "center",
                color: "#475569",
              }}
            >
              <ChevronRight size={16} />
            </button>
          </div>

          <button
            type="button"
            onClick={goToday}
            style={{
              background: "#f1f5f9",
              border: "1px solid #cbd5e1",
              padding: "8px 12px",
              borderRadius: "8px",
              fontWeight: "700",
              fontSize: "12.5px",
              cursor: "pointer",
              color: "#334155",
            }}
          >
            Today
          </button>
        </div>
      </div>

      {/* KPI Cards: Total Collection & Predicted Day Collection */}
      <div className="metricGrid">
        <Metric
          title="Total collection"
          value={totalCollectedToday}
          tone="green"
        />
        <Metric
          title="Predicted day collection"
          value={predictedDayCollection}
          tone="blue"
        />
        <Metric
          title="Pending collection"
          value={pendingCollection}
          tone="orange"
        />
        <div className="card metricCard" style={{ padding: "18px 20px" }}>
          <div style={{ color: "#64748b", fontSize: "12.5px", fontWeight: "600", textTransform: "uppercase" }}>
            Collection progress
          </div>
          <div style={{ fontSize: "20px", fontWeight: "800", marginTop: "4px", color: "#0f172a" }}>
            {collectedCount} of {daily.length} Paid
          </div>
          <div
            style={{
              width: "100%",
              height: "6px",
              background: "#e2e8f0",
              borderRadius: "3px",
              marginTop: "8px",
              overflow: "hidden",
            }}
          >
            <div
              style={{
                width: `${progressPercent}%`,
                height: "100%",
                background: "#10b981",
                transition: "width 0.3s ease",
              }}
            />
          </div>
        </div>
      </div>

      {/* Table & Controls */}
      <div className="card tableWrap">
        <div
          className="cardHead"
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: "12px",
          }}
        >
          {/* Segment Filter Tabs */}
          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <button
              type="button"
              onClick={() => setFilterTab("ALL")}
              style={{
                padding: "6px 14px",
                borderRadius: "6px",
                fontSize: "12.5px",
                fontWeight: "700",
                cursor: "pointer",
                border: "1px solid",
                borderColor: filterTab === "ALL" ? "#0d9488" : "#cbd5e1",
                background: filterTab === "ALL" ? "#0d9488" : "#ffffff",
                color: filterTab === "ALL" ? "#ffffff" : "#475569",
              }}
            >
              All ({daily.length})
            </button>
            <button
              type="button"
              onClick={() => setFilterTab("PENDING")}
              style={{
                padding: "6px 14px",
                borderRadius: "6px",
                fontSize: "12.5px",
                fontWeight: "700",
                cursor: "pointer",
                border: "1px solid",
                borderColor: filterTab === "PENDING" ? "#ea580c" : "#cbd5e1",
                background: filterTab === "PENDING" ? "#ea580c" : "#ffffff",
                color: filterTab === "PENDING" ? "#ffffff" : "#475569",
              }}
            >
              Pending ({pendingCount})
            </button>
            <button
              type="button"
              onClick={() => setFilterTab("COLLECTED")}
              style={{
                padding: "6px 14px",
                borderRadius: "6px",
                fontSize: "12.5px",
                fontWeight: "700",
                cursor: "pointer",
                border: "1px solid",
                borderColor: filterTab === "COLLECTED" ? "#059669" : "#cbd5e1",
                background: filterTab === "COLLECTED" ? "#059669" : "#ffffff",
                color: filterTab === "COLLECTED" ? "#ffffff" : "#475569",
              }}
            >
              Collected ({collectedCount})
            </button>
          </div>

          {/* Search & Export Actions */}
          <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
            <div style={{ position: "relative" }}>
              <Search
                size={14}
                style={{
                  position: "absolute",
                  left: "9px",
                  top: "50%",
                  transform: "translateY(-50%)",
                  color: "#94a3b8",
                }}
              />
              <input
                placeholder="Search customer / phone..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                style={{
                  padding: "6px 10px 6px 28px",
                  borderRadius: "6px",
                  border: "1px solid #cbd5e1",
                  fontSize: "13px",
                  width: "190px",
                }}
              />
            </div>

            <button
              type="button"
              className="iconTextButton"
              style={{
                background: "#f8fafc",
                color: "#0f766e",
                border: "1.5px solid #cbd5e1",
                borderRadius: "8px",
                padding: "6px 12px",
                fontSize: "12.5px",
                fontWeight: "700",
                cursor: "pointer",
              }}
              onClick={() => exportDailyCollectionsSheet(date, daily)}
              title="Download collection sheet in Excel (.xlsx)"
            >
              <FileSpreadsheet size={14} /> Export Sheet (Excel)
            </button>
          </div>
        </div>

        <table>
          <thead>
            <tr>
              <th>Customer</th>
              <th>Total return</th>
              <th>Remaining</th>
              <th>Predicted daily due</th>
              <th>Today's collection</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {filteredList.map((customer) => (
              <EntryRow
                key={customer.finance_id}
                customer={customer}
                date={date}
                savePayment={savePayment}
                onEditPayment={onEditPayment}
                openDetails={openDetails}
                busy={busy}
              />
            ))}
          </tbody>
        </table>

        {!filteredList.length && (
          <div style={{ padding: "40px 20px", textAlign: "center", color: "#64748b" }}>
            <p style={{ fontWeight: "700", fontSize: "15px", marginBottom: "4px" }}>
              {daily.length === 0
                ? "No active finances require collection."
                : "No customers match your filter or search query."}
            </p>
            {daily.length > 0 && (
              <p style={{ fontSize: "13px", margin: 0 }}>
                Try switching between All, Pending, and Collected tabs, or clear your search query.
              </p>
            )}
          </div>
        )}
      </div>
    </section>
  );
}
