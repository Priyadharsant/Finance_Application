import React, { useState, useEffect, useMemo } from "react";
import {
  AlertCircle,
  Activity,
  CalendarDays,
  CarFront,
  CheckCircle2,
  FileText,
  LayoutDashboard,
  Menu,
  RefreshCw,
  LineChart,
  UserRound,
  WalletCards,
  X,
  Landmark,
  Users,
  Globe,
  Receipt,
  Lock,
  FileSpreadsheet,
} from "lucide-react";
import "./App.css";
import DailyFinanceView from "./DailyFinance.jsx";
import AutoFinanceView from "./AutoFinance.jsx";
import GlobalCapitalView from "./GlobalCapital.jsx";
import useDocumentTitle from "./hooks/useDocumentTitle.js";
import { dateLabel, today } from "./dailyFinance/services/dailyFinanceApi.js";
import VersionUpdateModal from "./components/VersionUpdateModal.jsx";
import { APP_VERSION, checkForAppUpdates } from "./version.js";
import AppLoginScreen from "./components/AppLoginScreen.jsx";
import ExcelTableEditorView from "./components/ExcelTableEditorView.jsx";
import { getApiBaseUrl } from "./apiConfig.js";

export default function AppFinance() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [showTableEditor, setShowTableEditor] = useState(false);
  const [appModule, setAppModule] = useState("DAILY"); // 'DAILY' | 'AUTO' | 'GLOBAL'
  const [page, setPage] = useState("Dashboard");
  const [entryDate, setEntryDate] = useState(today());
  const [notice, setNotice] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [showVersionModal, setShowVersionModal] = useState(false);
  const [updateAvailable, setUpdateAvailable] = useState(false);

  const dynamicTitle = useMemo(() => {
    const moduleLabel =
      appModule === "DAILY"
        ? "Daily Finance"
        : appModule === "AUTO"
        ? "Auto Finance"
        : "Global Capital";

    return `${page} · ${moduleLabel} | KAMBAM FINANCE`;
  }, [appModule, page]);

  useDocumentTitle(dynamicTitle);

  useEffect(() => {
    if (!notice) return undefined;
    const timeout = window.setTimeout(() => setNotice(null), 4200);
    return () => window.clearTimeout(timeout);
  }, [notice]);

  // Check auth state on startup
  useEffect(() => {
    const token = localStorage.getItem("kambam_finance_app_auth");
    if (!token) {
      setIsAuthenticated(false);
      setCheckingAuth(false);
      return;
    }

    const apiBase = getApiBaseUrl();
    fetch(`${apiBase}/app-auth/verify`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.authenticated) {
          setIsAuthenticated(true);
        } else {
          localStorage.removeItem("kambam_finance_app_auth");
          setIsAuthenticated(false);
        }
      })
      .catch(() => {
        setIsAuthenticated(Boolean(token));
      })
      .finally(() => {
        setCheckingAuth(false);
      });
  }, []);

  const handleLogout = () => {
    const apiBase = getApiBaseUrl();
    localStorage.removeItem("kambam_finance_app_auth");
    setIsAuthenticated(false);
    fetch(`${apiBase}/app-auth/logout`, { method: "POST" }).catch(() => {});
  };

  // Check for application updates on launch - enforce latest version
  useEffect(() => {
    let isMounted = true;
    checkForAppUpdates().then((res) => {
      if (isMounted && res?.hasUpdate) {
        setUpdateAvailable(true);
        setShowVersionModal(true);
      }
    });
    return () => {
      isMounted = false;
    };
  }, []);

  const handleModuleSwitch = (targetModule) => {
    setAppModule(targetModule);
    setPage(targetModule === "GLOBAL" ? "Ledger Overview" : "Dashboard");
  };

  const handleRefresh = () => {
    setRefreshKey((prev) => prev + 1);
  };

  const dailyMenus = ["Dashboard", "Customers", "Daily entry"];
  const autoMenus = [
    "Dashboard",
    "Customers",
    "Vehicle Loans",
  ];
  const globalMenus = [
    "Ledger Overview",
    "Monthly Stats",
    "Partner Management",
    "Capital Transactions",
    "Expenses",
    "Reports",
  ];

  const currentMenus =
    appModule === "DAILY"
      ? dailyMenus
      : appModule === "AUTO"
        ? autoMenus
        : globalMenus;

  const menuIcons = {
    Dashboard: LayoutDashboard,
    Customers: UserRound,
    "Daily entry": WalletCards,
    "Vehicle Loans": CarFront,
    "EMI Schedules": CalendarDays,
    Reports: FileText,
    "Ledger Overview": Globe,
    "Monthly Stats": LineChart,
    "Partner Management": Users,
    "Capital Transactions": Landmark,
    Expenses: Receipt,
  };

  const NoticeIcon = notice?.type === "error" ? AlertCircle : CheckCircle2;

  if (checkingAuth) {
    return (
      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: "#0f172a",
          color: "#94a3b8",
          gap: "12px",
          fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
        }}
      >
        <RefreshCw size={24} style={{ animation: "spin 1s linear infinite" }} />
        <span>Loading KAMBAM FINANCE...</span>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <AppLoginScreen onLoginSuccess={() => setIsAuthenticated(true)} />;
  }

  return (
    <div className="financeApp">
      <header className="topAppHeader">
        <div className="headerLeft">
          <div
            className="headerBrandLogo"
            onClick={() => setPage(appModule === "GLOBAL" ? "Ledger Overview" : "Dashboard")}
            title="KAMBAM FINANCE Home"
          >
            <b>
              {appModule === "DAILY" && <Activity size={20} strokeWidth={2.5} />}
              {appModule === "AUTO" && <CarFront size={20} strokeWidth={2.5} />}
              {appModule === "GLOBAL" && <Globe size={20} strokeWidth={2.5} />}
            </b>
            <div className="headerBrandText">
              <span>KAMBAM FINANCE</span>
              <small>
                {appModule === "DAILY" && "Daily Finance"}
                {appModule === "AUTO" && "Auto Finance"}
                {appModule === "GLOBAL" && "Global Capital"}
              </small>
            </div>
          </div>
        </div>

        <div className="headerCenter" style={{ flex: 1, textAlign: "center" }}>
          <span>
            {appModule === "DAILY" && "Daily Finance"}
            {appModule === "AUTO" && "Auto Finance"}
            {appModule === "GLOBAL" && "Global Capital"}
          </span>
          <h1>{page}</h1>
        </div>

        <div className="headerRight">
          <span style={{ color: "#94a3b8", fontSize: "13px" }}>{dateLabel(entryDate)}</span>
          <button className="iconTextButton" onClick={handleRefresh}>
            <RefreshCw size={15} /> Refresh
          </button>
          <button
            className="iconTextButton"
            onClick={handleLogout}
            title="Lock application and logout"
            style={{ color: "#f87171", borderColor: "rgba(239, 68, 68, 0.3)" }}
          >
            <Lock size={14} /> Lock App
          </button>
        </div>
      </header>

      <div className="financeLayout">
        <aside>
          {/* GLOBAL PORTAL BUTTON IN OLD DESIGN */}
          <div style={{ margin: "0 0 16px" }}>
            <button
              className={`globalPortalBtn ${appModule === "GLOBAL" ? "active" : ""}`}
              onClick={() => handleModuleSwitch("GLOBAL")}
            >
              <div className="globalPortalIcon">
                <Globe size={18} />
              </div>
              <div className="globalPortalText">
                <span>Global Capital</span>
                <small>Overview &amp; Ledgers</small>
              </div>
            </button>
          </div>

          {/* MODULE TOGGLE SWITCHER IN SIDEBAR */}
          <div className="moduleSwitcherContainer">
            <button
              className={`moduleToggleBtn ${appModule === "DAILY" ? "active" : ""}`}
              onClick={() => handleModuleSwitch("DAILY")}
            >
              <Activity size={15} /> <span>Daily Finance</span>
            </button>
            <button
              className={`moduleToggleBtn ${appModule === "AUTO" ? "active autoMode" : ""}`}
              onClick={() => handleModuleSwitch("AUTO")}
            >
              <CarFront size={15} /> <span>Auto Finance</span>
            </button>
          </div>

          <div className="menuTitle">
            {appModule === "DAILY" && "DAILY FINANCE MENU"}
            {appModule === "AUTO" && "AUTO FINANCE MENU"}
            {appModule === "GLOBAL" && "GLOBAL CAPITAL MENU"}
          </div>

          {currentMenus.map((item) => (
            <button
              key={item}
              className={`menuItemBtn ${page === item ? "active" : ""}`}
              onClick={() => setPage(item)}
            >
              <i>
                {(() => {
                  const Icon = menuIcons[item] || Menu;
                  return <Icon size={18} />;
                })()}
              </i>
              <span>{item}</span>
            </button>
          ))}

          <div className="sidebarBottom" style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            <button
              type="button"
              onClick={() => setShowVersionModal(true)}
              style={{
                background: updateAvailable ? "linear-gradient(135deg, #fef3c7, #fde68a)" : "rgba(255,255,255,0.06)",
                border: updateAvailable ? "1px solid #f59e0b" : "1px solid rgba(255,255,255,0.12)",
                borderRadius: "6px",
                padding: "5px 8px",
                fontSize: "11px",
                color: updateAvailable ? "#92400e" : "#94a3b8",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                width: "100%",
                fontWeight: 500,
                transition: "all 0.2s ease",
              }}
              title="Click to check version updates"
            >
              <span>v{APP_VERSION}</span>
              {updateAvailable ? (
                <span style={{ background: "#f59e0b", color: "#fff", padding: "1px 5px", borderRadius: "4px", fontSize: "9px", fontWeight: 700 }}>
                  UPDATE
                </span>
              ) : (
                <span style={{ opacity: 0.7, fontSize: "10px" }}>Check Updates</span>
              )}
            </button>

            {/* BUTTON BELOW CHECK UPDATES TO OPEN EXCEL TABLE EDITOR */}
            <button
              type="button"
              onClick={() => setShowTableEditor(true)}
              style={{
                background: "linear-gradient(135deg, rgba(56, 189, 248, 0.16), rgba(14, 165, 233, 0.08))",
                border: "1px solid rgba(56, 189, 248, 0.4)",
                borderRadius: "6px",
                padding: "6px 8px",
                fontSize: "11px",
                color: "#38bdf8",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "6px",
                width: "100%",
                fontWeight: 700,
                transition: "all 0.2s ease",
              }}
              title="Open Excel Table Editor to edit all database tables"
            >
              <FileSpreadsheet size={13} />
              <span>Edit Tables (Excel)</span>
            </button>

            <div
              style={{
                textAlign: "center",
                fontSize: "11px",
                fontWeight: 700,
                letterSpacing: "0.8px",
                color: "rgba(255, 255, 255, 0.5)",
                textTransform: "uppercase",
                padding: "2px 0 4px",
                userSelect: "none",
              }}
            >
              KAMBAM FINANCE
            </div>
          </div>
        </aside>

        <main>
          {notice && (
            <div className="toastViewport" aria-live="polite" aria-atomic="true">
              <div className={`toast ${notice.type}`} role="status">
                <span className
                
                ="toastIcon">
                  <NoticeIcon size={18} />
                </span>
                <span className="toastMessage">{notice.text}</span>
                <button
                  className="iconButton toastClose"
                  aria-label="Dismiss notification"
                  onClick={() => setNotice(null)}
                >
                  <X size={16} />
                </button>
                <span className="toastProgress" />
              </div>
            </div>
          )}

          {/* RENDER MODULE VIEWS */}
          {appModule === "AUTO" ? (
            <AutoFinanceView
              key={`auto-${refreshKey}`}
              activeMenu={page}
              setNotice={setNotice}
            />
          ) : appModule === "GLOBAL" ? (
            <GlobalCapitalView
              key={`global-${refreshKey}`}
              activeMenu={page}
              setNotice={setNotice}
            />
          ) : (
            <DailyFinanceView
              key={`daily-${refreshKey}`}
              activeMenu={page}
              setPage={setPage}
              setNotice={setNotice}
              entryDate={entryDate}
              setEntryDate={setEntryDate}
            />
          )}
        </main>
      </div>

      <VersionUpdateModal
        isOpen={showVersionModal}
        isMandatory={updateAvailable}
        onClose={() => {
          if (!updateAvailable) {
            setShowVersionModal(false);
          }
        }}
      />

      {showTableEditor && (
        <ExcelTableEditorView onClose={() => setShowTableEditor(false)} />
      )}
    </div>
  );
}
