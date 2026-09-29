import React, { useState, useEffect } from "react";
import {
  X,
  Sparkles,
  ArrowUpCircle,
  CheckCircle2,
  Download,
  RefreshCw,
  ExternalLink,
  ShieldCheck,
  PackageCheck,
} from "lucide-react";
import { APP_VERSION, APP_BUILD_DATE, checkForAppUpdates } from "../version.js";

export default function VersionUpdateModal({ isOpen, onClose }) {
  const [checking, setChecking] = useState(false);
  const [updateData, setUpdateData] = useState(null);

  const fetchUpdateInfo = async () => {
    setChecking(true);
    try {
      const data = await checkForAppUpdates();
      setUpdateData(data);
    } finally {
      setChecking(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchUpdateInfo();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const hasUpdate = Boolean(updateData?.hasUpdate);
  const latestVersion = updateData?.latestVersion || APP_VERSION;
  const releaseNotes = updateData?.releaseNotes || [
    "Supabase Cloud Storage: Secure cloud uploads for Aadhaar, RC Book, and loan dossiers with instant previews",
    "Unified Categorized Excel Reports: Clean single-report exports for Auto Finance, Daily Finance, and Global Capital",
    "Live Financial Forecasting: Opening in-hand cash and next-month projected collection analytics",
    "Master Business Ledger: Multi-category unified audit trail and balance reconciliation",
  ];

  const handleDownload = () => {
    const url =
      updateData?.downloadUrl ||
      `https://raw.githubusercontent.com/Priyadharsant/Finance_Application/main/App/FinFlow-Setup-${latestVersion}.exe`;
    if (window.electronAPI?.openExternal) {
      window.electronAPI.openExternal(url);
    } else {
      window.open(url, "_blank", "noopener,noreferrer");
    }
  };

  return (
    <div
      className="modal"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      style={{ zIndex: 12000 }}
    >
      <div
        className="detailsCard"
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "min(92vw, 560px)",
          maxWidth: "560px",
          borderRadius: "16px",
          padding: "24px",
          background: "#ffffff",
          boxShadow: "0 20px 40px -15px rgba(0,0,0,0.15)",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "16px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <div
              style={{
                width: "42px",
                height: "42px",
                borderRadius: "12px",
                background: hasUpdate ? "#fef3c7" : "#ecfdf5",
                color: hasUpdate ? "#d97706" : "#059669",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              {hasUpdate ? <ArrowUpCircle size={24} /> : <PackageCheck size={24} />}
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: "18px", color: "#0f172a" }}>
                {hasUpdate ? "New Update Available!" : "FinFlow Up to Date"}
              </h3>
              <p style={{ margin: "2px 0 0 0", fontSize: "12px", color: "#64748b" }}>
                Current Version: <strong style={{ color: "#0f766e" }}>v{APP_VERSION}</strong> · Build: {APP_BUILD_DATE}
              </p>
            </div>
          </div>
          <button
            className="close"
            onClick={onClose}
            style={{
              background: "#f1f5f9",
              border: "none",
              borderRadius: "8px",
              padding: "6px",
              cursor: "pointer",
              color: "#475569",
            }}
          >
            <X size={16} />
          </button>
        </div>

        {/* STATUS CARD */}
        <div
          style={{
            padding: "14px 16px",
            borderRadius: "12px",
            background: hasUpdate ? "#fffbeb" : "#f0fdf4",
            border: `1px solid ${hasUpdate ? "#fde68a" : "#bbf7d0"}`,
            marginBottom: "20px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            {hasUpdate ? (
              <Sparkles size={20} color="#d97706" />
            ) : (
              <CheckCircle2 size={20} color="#16a34a" />
            )}
            <div>
              <div style={{ fontWeight: 600, fontSize: "13px", color: hasUpdate ? "#92400e" : "#166534" }}>
                {hasUpdate ? `Version v${latestVersion} is ready to install` : "You are on the latest official release"}
              </div>
              <small style={{ color: hasUpdate ? "#b45309" : "#15803d", fontSize: "11px" }}>
                {hasUpdate
                  ? "Update includes performance optimizations & new features."
                  : "All systems and accounting ledgers are running version v" + APP_VERSION}
              </small>
            </div>
          </div>
          <button
            type="button"
            onClick={fetchUpdateInfo}
            disabled={checking}
            style={{
              background: "#ffffff",
              border: "1px solid #cbd5e1",
              borderRadius: "8px",
              padding: "6px 10px",
              fontSize: "12px",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: "4px",
              color: "#334155",
            }}
          >
            <RefreshCw size={12} className={checking ? "spin" : ""} />
            {checking ? "Checking..." : "Check"}
          </button>
        </div>

        {/* RELEASE HIGHLIGHTS */}
        <div style={{ marginBottom: "20px" }}>
          <h4 style={{ margin: "0 0 10px 0", fontSize: "13px", color: "#334155", display: "flex", alignItems: "center", gap: "6px" }}>
            <ShieldCheck size={16} color="#0f766e" /> What's New & Included:
          </h4>
          <ul
            style={{
              margin: 0,
              paddingLeft: "18px",
              fontSize: "12px",
              color: "#475569",
              lineHeight: 1.6,
            }}
          >
            {releaseNotes.map((note, idx) => (
              <li key={idx} style={{ marginBottom: "6px" }}>
                {note}
              </li>
            ))}
          </ul>
        </div>

        {/* ACTIONS */}
        <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", paddingTop: "12px", borderTop: "1px solid #e2e8f0" }}>
          <button
            type="button"
            className="secondary autoBtn"
            onClick={onClose}
            style={{ padding: "8px 16px", fontSize: "13px", borderRadius: "8px" }}
          >
            Close
          </button>
          {hasUpdate ? (
            <button
              type="button"
              className="primary autoBtn"
              onClick={handleDownload}
              style={{
                padding: "8px 18px",
                fontSize: "13px",
                borderRadius: "8px",
                background: "#0f766e",
                borderColor: "#0f766e",
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
              }}
            >
              <Download size={15} /> Download Update (v{latestVersion})
            </button>
          ) : (
            <button
              type="button"
              className="secondary autoBtn"
              onClick={handleDownload}
              style={{
                padding: "8px 16px",
                fontSize: "13px",
                borderRadius: "8px",
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
              }}
            >
              <ExternalLink size={13} /> View Releases
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
