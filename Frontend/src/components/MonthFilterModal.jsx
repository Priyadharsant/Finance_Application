import React, { useState } from "react";
import { X, Calendar, FileSpreadsheet, Loader2 } from "lucide-react";

export default function MonthFilterModal({
  isOpen,
  onClose,
  onExport,
  title = "Monthly Collections Report",
  subtitle = "Select month to download dedicated collections report (.xlsx) for that period.",
  themeColor = "#059669",
}) {
  const currentMonthStr = new Date().toISOString().slice(0, 7);
  const [selectedMonth, setSelectedMonth] = useState(currentMonthStr);
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleDownload = async (e) => {
    e.preventDefault();
    if (!selectedMonth) return;
    setLoading(true);
    try {
      await onExport(selectedMonth);
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
          maxWidth: "420px",
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
                width: "36px",
                height: "36px",
                borderRadius: "10px",
                backgroundColor: `${themeColor}15`,
                color: themeColor,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <FileSpreadsheet size={19} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: "16px", fontWeight: "700", color: "#0f172a" }}>
                {title}
              </h3>
              <p style={{ margin: "2px 0 0 0", fontSize: "12px", color: "#64748b" }}>
                Excel (.xlsx) Export
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              border: "none",
              background: "transparent",
              color: "#94a3b8",
              cursor: "pointer",
              padding: "4px",
              borderRadius: "6px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleDownload} style={{ padding: "22px" }}>
          <p style={{ margin: "0 0 16px 0", fontSize: "13px", color: "#475569", lineHeight: "1.5" }}>
            {subtitle}
          </p>

          <label
            style={{
              display: "block",
              fontSize: "12.5px",
              fontWeight: "600",
              color: "#334155",
              marginBottom: "6px",
            }}
          >
            Select Report Month
          </label>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              padding: "10px 14px",
              border: "1.5px solid #cbd5e1",
              borderRadius: "10px",
              backgroundColor: "#f8fafc",
            }}
          >
            <Calendar size={18} color={themeColor} />
            <input
              type="month"
              required
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              style={{
                border: "none",
                outline: "none",
                background: "transparent",
                width: "100%",
                fontSize: "14px",
                fontWeight: "600",
                color: "#1e293b",
                cursor: "pointer",
              }}
            />
          </div>

          {/* Actions */}
          <div
            style={{
              display: "flex",
              gap: "10px",
              marginTop: "24px",
              justifyContent: "flex-end",
            }}
          >
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              style={{
                padding: "9px 16px",
                border: "1px solid #cbd5e1",
                background: "#ffffff",
                color: "#475569",
                borderRadius: "8px",
                fontWeight: "600",
                fontSize: "13px",
                cursor: "pointer",
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || !selectedMonth}
              style={{
                padding: "9px 18px",
                border: "none",
                background: themeColor,
                color: "#ffffff",
                borderRadius: "8px",
                fontWeight: "700",
                fontSize: "13px",
                display: "inline-flex",
                alignItems: "center",
                gap: "8px",
                cursor: loading ? "not-allowed" : "pointer",
                boxShadow: `0 2px 8px ${themeColor}40`,
              }}
            >
              {loading ? (
                <>
                  <Loader2 size={15} className="spin" />
                  <span>Generating...</span>
                </>
              ) : (
                <>
                  <FileSpreadsheet size={15} />
                  <span>Download Report</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
