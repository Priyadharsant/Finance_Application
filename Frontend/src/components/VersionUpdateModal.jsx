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
  AlertTriangle,
  Lock,
} from "lucide-react";
import { APP_VERSION, APP_BUILD_DATE, checkForAppUpdates } from "../version.js";

export default function VersionUpdateModal({ isOpen, onClose, isMandatory: propMandatory }) {
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
  const isMandatory = hasUpdate || propMandatory || Boolean(updateData?.isMandatory);
  const latestVersion = updateData?.latestVersion || APP_VERSION;
  const releaseNotes = updateData?.releaseNotes || [
    "Strict Version Enforcement: Exe operates exclusively on latest verified releases",
    "Supabase Cloud Storage: Secure cloud uploads for Aadhaar, RC Book, and loan dossiers with instant previews",
    "Unified Categorized Excel Reports: Clean single-report exports for Auto Finance, Daily Finance, and Global Capital",
    "Live Financial Forecasting: Opening in-hand cash and next-month projected collection analytics",
    "Master Business Ledger: Multi-category unified audit trail and balance reconciliation",
  ];

  const handleDownload = () => {
    const url =
      updateData?.downloadUrl ||
      `https://github.com/Priyadharsant/Finance_Application/releases/download/v${latestVersion}/FinFlow-Setup-${latestVersion}.exe`;
    if (window.electronAPI?.openExternal) {
      window.electronAPI.openExternal(url);
    } else {
      window.open(url, "_blank", "noopener,noreferrer");
    }
  };

  const handleModalClose = () => {
    // If update is required, do NOT allow closing!
    if (isMandatory && hasUpdate) return;
    if (onClose) onClose();
  };

  return (
    <div
      className="modal"
      onClick={(e) => {
        if (e.target === e.currentTarget && (!isMandatory || !hasUpdate)) {
          handleModalClose();
        }
      }}
      style={{
        zIndex: 999999,
        position: "fixed",
        inset: 0,
        backgroundColor: isMandatory && hasUpdate ? "rgba(15, 23, 42, 0.88)" : "rgba(15, 23, 42, 0.6)",
        backdropFilter: "blur(8px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <div
        className="detailsCard"
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "min(92vw, 560px)",
          maxWidth: "560px",
          borderRadius: "16px",
          padding: "26px",
          background: "#ffffff",
          boxShadow: isMandatory && hasUpdate ? "0 25px 50px -12px rgba(220, 38, 38, 0.25)" : "0 20px 40px -15px rgba(0,0,0,0.15)",
          border: isMandatory && hasUpdate ? "2px solid #ef4444" : "1px solid #e2e8f0",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "16px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <div
              style={{
                width: "46px",
                height: "46px",
                borderRadius: "12px",
                background: hasUpdate ? "#fee2e2" : "#ecfdf5",
                color: hasUpdate ? "#dc2626" : "#059669",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              {hasUpdate ? <Lock size={24} /> : <PackageCheck size={24} />}
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: "19px", color: "#0f172a", fontWeight: 700 }}>
                {hasUpdate ? "Update Required to Continue" : "FinFlow Up to Date"}
              </h3>
              <p style={{ margin: "3px 0 0 0", fontSize: "12px", color: "#64748b" }}>
                Installed Version: <strong style={{ color: hasUpdate ? "#dc2626" : "#0f766e" }}>v{APP_VERSION}</strong> · Build: {APP_BUILD_DATE}
              </p>
            </div>
          </div>

          {/* Close button only visible if NO mandatory update required */}
          {(!hasUpdate || !isMandatory) && (
            <button
              className="close"
              onClick={handleModalClose}
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
          )}
        </div>

        {/* STATUS BANNER */}
        <div
          style={{
            padding: "14px 16px",
            borderRadius: "12px",
            background: hasUpdate ? "#fef2f2" : "#f0fdf4",
            border: `1px solid ${hasUpdate ? "#fecaca" : "#bbf7d0"}`,
            marginBottom: "20px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            {hasUpdate ? (
              <AlertTriangle size={22} color="#dc2626" />
            ) : (
              <CheckCircle2 size={20} color="#16a34a" />
            )}
            <div>
              <div style={{ fontWeight: 700, fontSize: "13px", color: hasUpdate ? "#991b1b" : "#166534" }}>
                {hasUpdate
                  ? `FinFlow v${latestVersion} is required to use this application`
                  : "You are on the latest official release"}
              </div>
              <small style={{ color: hasUpdate ? "#b91c1c" : "#15803d", fontSize: "11px", display: "block", marginTop: "2px" }}>
                {hasUpdate
                  ? "For database security and ledger reconciliation accuracy, older versions cannot proceed. Please update immediately."
                  : "All daily finance, vehicle loans, and capital ledgers are synchronized."}
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
              fontWeight: 600,
            }}
          >
            <RefreshCw size={12} className={checking ? "spin" : ""} />
            {checking ? "Checking..." : "Re-check"}
          </button>
        </div>

        {/* RELEASE HIGHLIGHTS */}
        <div style={{ marginBottom: "20px" }}>
          <h4 style={{ margin: "0 0 10px 0", fontSize: "13px", color: "#334155", display: "flex", alignItems: "center", gap: "6px" }}>
            <ShieldCheck size={16} color="#0f766e" /> Latest Release Features (v{latestVersion}):
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
        <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", paddingTop: "14px", borderTop: "1px solid #e2e8f0" }}>
          {(!hasUpdate || !isMandatory) ? (
            <>
              <button
                type="button"
                className="secondary autoBtn"
                onClick={handleModalClose}
                style={{ padding: "8px 16px", fontSize: "13px", borderRadius: "8px" }}
              >
                Close
              </button>
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
            </>
          ) : (
            <>
              <button
                type="button"
                className="secondary autoBtn"
                onClick={fetchUpdateInfo}
                disabled={checking}
                style={{
                  padding: "9px 16px",
                  fontSize: "13px",
                  borderRadius: "8px",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "6px",
                  cursor: "pointer",
                }}
              >
                <RefreshCw size={14} className={checking ? "spin" : ""} />
                Re-check After Install
              </button>
              <button
                type="button"
                className="primary autoBtn"
                onClick={handleDownload}
                style={{
                  padding: "9px 20px",
                  fontSize: "13px",
                  borderRadius: "8px",
                  background: "#dc2626",
                  borderColor: "#dc2626",
                  color: "#ffffff",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "8px",
                  fontWeight: 700,
                  boxShadow: "0 4px 12px rgba(220, 38, 38, 0.3)",
                }}
              >
                <Download size={16} /> Download & Install v{latestVersion}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
