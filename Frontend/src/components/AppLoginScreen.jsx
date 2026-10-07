import React, { useState } from "react";
import { Lock, Eye, EyeOff, ShieldCheck, AlertCircle, ArrowRight } from "lucide-react";
import { APP_VERSION } from "../version.js";
import { getApiBaseUrl } from "../apiConfig.js";

export default function AppLoginScreen({ onLoginSuccess }) {
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    if (e) e.preventDefault();
    if (!password.trim()) {
      setError("Please enter the password");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const apiBase = getApiBaseUrl();
      const response = await fetch(`${apiBase}/app-auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: password.trim() }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.message || "Invalid password. Access denied.");
      }

      // Store auth token in localStorage
      localStorage.setItem("kambam_finance_app_auth", data.token);
      if (onLoginSuccess) {
        onLoginSuccess();
      }
    } catch (err) {
      setError(err.message || "Authentication failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 99999,
        background: "radial-gradient(ellipse at top, #1e293b 0%, #0f172a 60%, #020617 100%)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "20px",
        fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: "420px",
          background: "rgba(30, 41, 59, 0.75)",
          backdropFilter: "blur(16px)",
          WebkitBackdropFilter: "blur(16px)",
          border: "1px solid rgba(255, 255, 255, 0.12)",
          borderRadius: "20px",
          padding: "36px 32px",
          boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(255, 255, 255, 0.05)",
          color: "#f8fafc",
          textAlign: "center",
          animation: "fadeIn 0.3s ease-out",
        }}
      >
        {/* Brand Icon & Heading */}
        <div
          style={{
            width: "60px",
            height: "60px",
            margin: "0 auto 18px",
            background: "linear-gradient(135deg, #0ea5e9, #0284c7)",
            borderRadius: "16px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            boxShadow: "0 10px 25px -5px rgba(14, 165, 233, 0.4)",
          }}
        >
          <Lock size={30} color="#ffffff" strokeWidth={2.2} />
        </div>

        <h2
          style={{
            margin: "0 0 6px",
            fontSize: "22px",
            fontWeight: "800",
            letterSpacing: "-0.5px",
            color: "#ffffff",
          }}
        >
          KAMBAM FINANCE
        </h2>
        <p
          style={{
            margin: "0 0 26px",
            fontSize: "13px",
            color: "#94a3b8",
            lineHeight: "1.5",
          }}
        >
          Protected System · Enter password to continue
        </p>

        {/* Error Alert */}
        {error && (
          <div
            style={{
              background: "rgba(239, 68, 68, 0.15)",
              border: "1px solid rgba(239, 68, 68, 0.3)",
              color: "#fca5a5",
              padding: "10px 14px",
              borderRadius: "10px",
              fontSize: "12.5px",
              fontWeight: "500",
              marginBottom: "18px",
              display: "flex",
              alignItems: "center",
              gap: "8px",
              textAlign: "left",
            }}
          >
            <AlertCircle size={16} style={{ flexShrink: 0 }} />
            <span>{error}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} style={{ position: "relative" }}>
          {/* Loading Screen Overlay */}
          {loading && (
            <div
              style={{
                position: "absolute",
                inset: "-12px",
                background: "rgba(15, 23, 42, 0.88)",
                borderRadius: "16px",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                gap: "10px",
                zIndex: 20,
                backdropFilter: "blur(4px)",
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
              <span style={{ fontSize: "13px", fontWeight: "600", color: "#38bdf8" }}>
                Verifying Credentials...
              </span>
            </div>
          )}

          <div style={{ position: "relative", marginBottom: "20px" }}>
            <input
              type={showPassword ? "text" : "password"}
              autoFocus
              disabled={loading}
              placeholder="Enter App Password"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                if (error) setError("");
              }}
              style={{
                width: "100%",
                padding: "13px 44px 13px 16px",
                background: "rgba(15, 23, 42, 0.8)",
                border: error ? "1.5px solid #ef4444" : "1.5px solid rgba(255, 255, 255, 0.15)",
                borderRadius: "12px",
                color: "#ffffff",
                fontSize: "15px",
                outline: "none",
                transition: "all 0.2s ease",
                boxSizing: "border-box",
                letterSpacing: showPassword ? "normal" : "2px",
                opacity: loading ? 0.6 : 1,
              }}
            />
            <button
              type="button"
              disabled={loading}
              onClick={() => setShowPassword(!showPassword)}
              style={{
                position: "absolute",
                right: "12px",
                top: "50%",
                transform: "translateY(-50%)",
                background: "none",
                border: "none",
                color: "#94a3b8",
                cursor: loading ? "not-allowed" : "pointer",
                padding: "4px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
              title={showPassword ? "Hide password" : "Show password"}
            >
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>

          <button
            type="submit"
            disabled={loading}
            style={{
              width: "100%",
              padding: "13px 20px",
              background: loading
                ? "#0369a1"
                : "linear-gradient(135deg, #0284c7, #0369a1)",
              border: "none",
              borderRadius: "12px",
              color: "#ffffff",
              fontSize: "14.5px",
              fontWeight: "700",
              cursor: loading ? "not-allowed" : "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "8px",
              boxShadow: "0 10px 20px -5px rgba(2, 132, 199, 0.4)",
              transition: "all 0.2s ease",
              opacity: loading ? 0.7 : 1,
            }}
          >
            {loading ? (
              <span style={{ display: "inline-flex", alignItems: "center", gap: "8px" }}>
                <span>Unlocking...</span>
              </span>
            ) : (
              <>
                <span>Unlock Application</span>
                <ArrowRight size={17} />
              </>
            )}
          </button>
        </form>

        <div
          style={{
            marginTop: "24px",
            paddingTop: "18px",
            borderTop: "1px solid rgba(255, 255, 255, 0.08)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            fontSize: "11.5px",
            color: "#64748b",
          }}
        >
          <span style={{ display: "inline-flex", alignItems: "center", gap: "4px" }}>
            <ShieldCheck size={14} color="#0ea5e9" /> Secure App Auth
          </span>
          <span>v{APP_VERSION}</span>
        </div>
      </div>
    </div>
  );
}
