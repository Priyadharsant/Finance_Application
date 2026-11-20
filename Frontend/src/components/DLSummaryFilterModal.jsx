import React, { useState } from "react";
import { X, Calendar, FileSpreadsheet, Loader2 } from "lucide-react";

export default function DLSummaryFilterModal({
  isOpen,
  onClose,
  onExport,
  title = "DL Summary XL Export",
  themeColor = "#059669",
}) {
  const currentMonthStr = new Date().toISOString().slice(0, 7);
  const todayStr = new Date().toISOString().slice(0, 10);

  // 'month' or 'custom'
  const [filterMode, setFilterMode] = useState("month");
  const [selectedMonth, setSelectedMonth] = useState(currentMonthStr);
  const [startDate, setStartDate] = useState(todayStr);
  const [endDate, setEndDate] = useState(todayStr);
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleDownload = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (filterMode === "month") {
        if (!selectedMonth) {
          alert("Please select a month");
          setLoading(false);
          return;
        }
        // Calculate start and end date for that month
        const [year, month] = selectedMonth.split("-").map(Number);
        const start = `${selectedMonth}-01`;
        const lastDay = new Date(year, month, 0).getDate();
        const end = `${selectedMonth}-${String(lastDay).padStart(2, "0")}`;
        await onExport({ mode: "month", selectedMonth, startDate: start, endDate: end });
      } else {
        if (!startDate || !endDate) {
          alert("Please select both start and end date");
          setLoading(false);
          return;
        }
        if (startDate > endDate) {
          alert("Start date cannot be after End date");
          setLoading(false);
          return;
        }
        await onExport({ mode: "custom", startDate, endDate });
      }
      onClose();
    } catch (err) {
      console.error(err);
      alert("Export failed: " + (err.message || "Unknown error"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: "rgba(15, 23, 42, 0.65)",
        backdropFilter: "blur(4px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 9999,
        padding: "16px",
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: "#ffffff",
          borderRadius: "16px",
          width: "100%",
          maxWidth: "460px",
          boxShadow: "0 20px 40px -8px rgba(0, 0, 0, 0.25)",
          overflow: "hidden",
          border: "1px solid #e2e8f0",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          style={{
            padding: "18px 22px",
            borderBottom: "1px solid #f1f5f9",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <div
              style={{
                width: "38px",
                height: "38px",
                borderRadius: "10px",
                backgroundColor: `${themeColor}15`,
                color: themeColor,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <FileSpreadsheet size={20} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: "16px", fontWeight: "700", color: "#0f172a" }}>
                {title}
              </h3>
              <p style={{ margin: "2px 0 0 0", fontSize: "12px", color: "#64748b" }}>
                Loan Distribution &amp; Collections with Expenses
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              border: "none",
              background: "#f1f5f9",
              width: "32px",
              height: "32px",
              borderRadius: "50%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
              color: "#64748b",
            }}
          >
            <X size={16} />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleDownload} style={{ padding: "22px" }}>
          <label style={{ display: "block", fontSize: "13px", fontWeight: "600", color: "#334155", marginBottom: "10px" }}>
            Select Period Type:
          </label>

          {/* Mode Selector Radio / Tabs */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: "10px",
              marginBottom: "20px",
            }}
          >
            <label
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                padding: "10px 14px",
                borderRadius: "10px",
                border: filterMode === "month" ? `2px solid ${themeColor}` : "1px solid #cbd5e1",
                backgroundColor: filterMode === "month" ? `${themeColor}08` : "#f8fafc",
                cursor: "pointer",
                fontWeight: filterMode === "month" ? "600" : "500",
                fontSize: "13px",
                color: filterMode === "month" ? themeColor : "#475569",
              }}
            >
              <input
                type="radio"
                name="filterMode"
                value="month"
                checked={filterMode === "month"}
                onChange={() => setFilterMode("month")}
                style={{ accentColor: themeColor }}
              />
              Specific Month
            </label>

            <label
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                padding: "10px 14px",
                borderRadius: "10px",
                border: filterMode === "custom" ? `2px solid ${themeColor}` : "1px solid #cbd5e1",
                backgroundColor: filterMode === "custom" ? `${themeColor}08` : "#f8fafc",
                cursor: "pointer",
                fontWeight: filterMode === "custom" ? "600" : "500",
                fontSize: "13px",
                color: filterMode === "custom" ? themeColor : "#475569",
              }}
            >
              <input
                type="radio"
                name="filterMode"
                value="custom"
                checked={filterMode === "custom"}
                onChange={() => setFilterMode("custom")}
                style={{ accentColor: themeColor }}
              />
              Custom Date Range
            </label>
          </div>

          {/* Month Wise Input */}
          {filterMode === "month" ? (
            <div style={{ marginBottom: "20px" }}>
              <label style={{ display: "block", fontSize: "12px", fontWeight: "600", color: "#475569", marginBottom: "6px" }}>
                Select Month
              </label>
              <div style={{ position: "relative" }}>
                <input
                  type="month"
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(e.target.value)}
                  required
                  style={{
                    width: "100%",
                    padding: "10px 14px 10px 38px",
                    borderRadius: "8px",
                    border: "1px solid #cbd5e1",
                    fontSize: "14px",
                    fontWeight: "500",
                    color: "#0f172a",
                    boxSizing: "border-box",
                    outline: "none",
                  }}
                />
                <Calendar
                  size={16}
                  style={{
                    position: "absolute",
                    left: "12px",
                    top: "50%",
                    transform: "translateY(-50%)",
                    color: "#64748b",
                    pointerEvents: "none",
                  }}
                />
              </div>
            </div>
          ) : (
            /* Custom Date Range Inputs */
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginBottom: "20px" }}>
              <div>
                <label style={{ display: "block", fontSize: "12px", fontWeight: "600", color: "#475569", marginBottom: "6px" }}>
                  Start Date
                </label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  required
                  style={{
                    width: "100%",
                    padding: "10px 12px",
                    borderRadius: "8px",
                    border: "1px solid #cbd5e1",
                    fontSize: "13px",
                    fontWeight: "500",
                    color: "#0f172a",
                    boxSizing: "border-box",
                    outline: "none",
                  }}
                />
              </div>
              <div>
                <label style={{ display: "block", fontSize: "12px", fontWeight: "600", color: "#475569", marginBottom: "6px" }}>
                  End Date
                </label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  required
                  style={{
                    width: "100%",
                    padding: "10px 12px",
                    borderRadius: "8px",
                    border: "1px solid #cbd5e1",
                    fontSize: "13px",
                    fontWeight: "500",
                    color: "#0f172a",
                    boxSizing: "border-box",
                    outline: "none",
                  }}
                />
              </div>
            </div>
          )}

          <div
            style={{
              padding: "10px 14px",
              backgroundColor: "#f8fafc",
              borderRadius: "8px",
              fontSize: "12px",
              color: "#64748b",
              lineHeight: "1.4",
              marginBottom: "20px",
              border: "1px solid #e2e8f0",
            }}
          >
            ℹ️ Generates an Excel workbook with 2 sheets:
            <br />
            <strong>1. Loan Distribution</strong> (Loans granted in this period with bottom totals)
            <br />
            <strong>2. Collections &amp; Expenses</strong> (Grouped collections &amp; daily expenses)
          </div>

          {/* Action Buttons */}
          <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end" }}>
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              style={{
                padding: "9px 16px",
                borderRadius: "8px",
                border: "1px solid #cbd5e1",
                background: "#ffffff",
                color: "#475569",
                fontSize: "13px",
                fontWeight: "600",
                cursor: "pointer",
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                padding: "9px 20px",
                borderRadius: "8px",
                border: "none",
                background: themeColor,
                color: "#ffffff",
                fontSize: "13px",
                fontWeight: "600",
                cursor: loading ? "not-allowed" : "pointer",
                boxShadow: "0 2px 4px rgba(5, 150, 105, 0.2)",
              }}
            >
              {loading ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  Generating DL Summary...
                </>
              ) : (
                <>
                  <FileSpreadsheet size={16} />
                  Download DL Summary XL
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
