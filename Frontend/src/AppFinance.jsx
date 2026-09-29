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
} from "lucide-react";
import "./App.css";
import DailyFinanceView from "./DailyFinance.jsx";
import AutoFinanceView from "./AutoFinance.jsx";
import GlobalCapitalView from "./GlobalCapital.jsx";
import useDocumentTitle from "./hooks/useDocumentTitle.js";
import { dateLabel, today } from "./dailyFinance/services/dailyFinanceApi.js";
import VersionUpdateModal from "./components/VersionUpdateModal.jsx";
import { APP_VERSION, checkForAppUpdates } from "./version.js";

export default function AppFinance() {
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

    return `${page} · ${moduleLabel} | Fin Tracker`;
  }, [appModule, page]);

  useDocumentTitle(dynamicTitle);

  useEffect(() => {
    if (!notice) return undefined;
    const timeout = window.setTimeout(() => setNotice(null), 4200);
    return () => window.clearTimeout(timeout);
  }, [notice]);

  // Check for application updates on launch
  useEffect(() => {
    let isMounted = true;
    checkForAppUpdates().then((res) => {
      if (isMounted && res?.hasUpdate) {
        setUpdateAvailable(true);
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

  const dailyMenus = ["Dashboard", "Customers", "Daily entry", "Reports"];
  const autoMenus = [
    "Dashboard",
    "Customers",
    "Vehicle Loans",
    "Reports",
  ];
  const globalMenus = [
    "Ledger Overview",
    "Monthly Stats",
    "Partner Management",
    "Capital Transactions",
    "Expenses",
    "Monthly Closing",
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
    "Monthly Closing": FileText,
  };

  const NoticeIcon = notice?.type === "error" ? AlertCircle : CheckCircle2;

  return (
    <div className="financeApp">
      <aside>
        <div className="financeLogo">
          <b>
            {appModule === "DAILY" && <Activity size={21} strokeWidth={2.5} />}
            {appModule === "AUTO" && <CarFront size={21} strokeWidth={2.5} />}
            {appModule === "GLOBAL" && <Globe size={21} strokeWidth={2.5} />}
          </b>
          <div>
            Fin Tracker
            <small>
              {appModule === "DAILY" && "Daily Finance"}
              {appModule === "AUTO" && "Auto Finance"}
              {appModule === "GLOBAL" && "Global Capital"}
            </small>
          </div>
        </div>

        {/* GLOBAL PORTAL BUTTON */}
        <div style={{ margin: "0 10px 15px" }}>
          <button
            className={`globalPortalBtn ${appModule === "GLOBAL" ? "active" : ""}`}
            onClick={() => handleModuleSwitch("GLOBAL")}
          >
            <div className="globalPortalIcon">
              <Globe size={18} />
            </div>
            <div className="globalPortalText">
              <span>Global Capital</span>
              <small>Overview & Ledgers</small>
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
        </div>
      </aside>

      <main>
        <header>
          <div style={{ flex: 1, textAlign: "center" }}>
            <span>
              {appModule === "DAILY" && "Daily Finance"}
              {appModule === "AUTO" && "Auto Finance"}
              {appModule === "GLOBAL" && "Global Capital"}
            </span>
            <h1>{page}</h1>
          </div>

          <div className="headerRight">
            <span className="systemStatusBadge">
              <span className="livePulseDot" /> Live Systems Active
            </span>

            <button
              type="button"
              className="headerToggleBtn"
              onClick={() => setShowVersionModal(true)}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "5px",
                fontSize: "11px",
                padding: "3px 8px",
                borderRadius: "6px",
                border: updateAvailable ? "1px solid #f59e0b" : "1px solid #cbd5e1",
                background: updateAvailable ? "#fef3c7" : "#fff",
                color: updateAvailable ? "#92400e" : "#475569",
                cursor: "pointer",
                fontWeight: 600,
              }}
              title="Application version and update manager"
            >
              <span>v{APP_VERSION}</span>
              {updateAvailable && <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: "#f59e0b" }} />}
            </button>

            {/* Quick module switchers in header */}
            <div className="headerToggleSwitch">
              <button
                className={`headerToggleBtn ${appModule === "DAILY" ? "active" : ""}`}
                onClick={() => handleModuleSwitch("DAILY")}
              >
                Daily
              </button>
              <button
                className={`headerToggleBtn ${appModule === "AUTO" ? "active autoMode" : ""}`}
                onClick={() => handleModuleSwitch("AUTO")}
              >
                Auto
              </button>
              <button
                className={`headerToggleBtn ${appModule === "GLOBAL" ? "active globalMode" : ""}`}
                onClick={() => handleModuleSwitch("GLOBAL")}
              >
                Global
              </button>
            </div>

            <span style={{ color: "#94a3b8", fontSize: "13px" }}>{dateLabel(entryDate)}</span>
            <button className="iconTextButton" onClick={handleRefresh}>
              <RefreshCw size={15} /> Refresh
            </button>
          </div>
        </header>

        {notice && (
          <div className="toastViewport" aria-live="polite" aria-atomic="true">
            <div className={`toast ${notice.type}`} role="status">
              <span className="toastIcon">
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

      <VersionUpdateModal
        isOpen={showVersionModal}
        onClose={() => setShowVersionModal(false)}
      />
    </div>
  );
}
