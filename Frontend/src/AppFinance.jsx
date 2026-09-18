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
  Tags,
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

export default function AppFinance() {
  const [appModule, setAppModule] = useState("DAILY"); // 'DAILY' | 'AUTO' | 'GLOBAL'
  const [page, setPage] = useState("Dashboard");
  const [entryDate, setEntryDate] = useState(today());
  const [notice, setNotice] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const dynamicTitle = useMemo(() => {
    const moduleLabel =
      appModule === "DAILY"
        ? "Daily Finance"
        : appModule === "AUTO"
        ? "Auto Finance"
        : "Global Capital";

    return `${page} · ${moduleLabel} | FinFlow`;
  }, [appModule, page]);

  useDocumentTitle(dynamicTitle);

  useEffect(() => {
    if (!notice) return undefined;
    const timeout = window.setTimeout(() => setNotice(null), 4200);
    return () => window.clearTimeout(timeout);
  }, [notice]);

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
    "Loan Schemes",
    "Vehicle Loans",
    "Reports",
  ];
  const globalMenus = [
    "Ledger Overview",
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
    "Loan Schemes": Tags,
    "Vehicle Loans": CarFront,
    "EMI Schedules": CalendarDays,
    Reports: FileText,
    "Ledger Overview": Globe,
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
            FinFlow
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

        <div className="sidebarBottom">
          <span>P</span>
          <div>
            Priyan Finance
            <small>Production Workspace</small>
          </div>
        </div>
      </aside>

      <main>
        <header>
          <div>
            <span>
              {appModule === "DAILY" && "Daily Finance Module"}
              {appModule === "AUTO" && "Auto Finance Module"}
              {appModule === "GLOBAL" && "Global Capital Module"}
            </span>
            <h1>{page}</h1>
          </div>

          <div className="headerRight">
            <span className="systemStatusBadge">
              <span className="livePulseDot" /> Live Systems Active
            </span>

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

            <span>{dateLabel(entryDate)}</span>
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
    </div>
  );
}
