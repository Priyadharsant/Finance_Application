const BASE_API =
  (import.meta.env.VITE_API_URL
    ? import.meta.env.VITE_API_URL.replace("/daily-finance", "")
    : "http://localhost:3000") + "/api/global-cash";

export const API = BASE_API;

export const globalCapitalApi = {
  // 1. Ledger
  getLedger: async () => {
    const res = await fetch(`${API}/ledger`);
    if (!res.ok) throw new Error("Failed to fetch global cash ledger");
    return res.json();
  },

  getTransactionDetails: async (ledgerId) => {
    const res = await fetch(`${API}/transaction-details/${ledgerId}`);
    if (!res.ok) throw new Error("Failed to fetch transaction details");
    return res.json();
  },

  // 2. Partners
  getPartners: async () => {
    const res = await fetch(`${API}/partners`);
    if (!res.ok) throw new Error("Failed to fetch partners");
    return res.json();
  },

  createPartner: async (data) => {
    const res = await fetch(`${API}/partners`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || "Failed to register partner");
    return json;
  },

  getPartnerCurrentCapital: async (partnerId) => {
    const res = await fetch(`${API}/partners/${partnerId}/current-capital`);
    if (!res.ok) throw new Error("Failed to fetch partner current capital");
    return res.json();
  },

  // 3. Transactions (Contributions & Withdrawals)
  getPartnerTransactions: async () => {
    const res = await fetch(`${API}/partner-transactions`);
    if (!res.ok) throw new Error("Failed to fetch partner transactions");
    return res.json();
  },

  createContribution: async (data) => {
    const res = await fetch(`${API}/contributions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || "Failed to create contribution");
    return json;
  },

  createWithdrawal: async (data) => {
    const res = await fetch(`${API}/withdrawals`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || "Failed to create withdrawal");
    return json;
  },

  // 4. Expenses
  getExpenses: async (params = {}) => {
    const q = new URLSearchParams();
    if (params.year) q.set("year", params.year);
    if (params.month) q.set("month", params.month);
    if (params.category && params.category !== "ALL") q.set("category", params.category);
    if (params.search) q.set("search", params.search);
    const qs = q.toString() ? `?${q.toString()}` : "";

    const res = await fetch(`${API}/expenses${qs}`);
    if (!res.ok) throw new Error("Failed to fetch expenses");
    return res.json();
  },

  createExpense: async (data) => {
    const res = await fetch(`${API}/expenses`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || "Failed to record expense");
    return json;
  },

  deleteExpense: async (id) => {
    const res = await fetch(`${API}/expenses/${id}`, {
      method: "DELETE",
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || "Failed to delete expense");
    return json;
  },

  // 5. Monthly Closings & Estimates
  getMonthlyClosings: async () => {
    const res = await fetch(`${API}/monthly-closings`);
    if (!res.ok) throw new Error("Failed to fetch monthly closings");
    return res.json();
  },

  createDraftMonthlyClosing: async (data) => {
    const res = await fetch(`${API}/monthly-closings/draft`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || "Failed to generate closing draft");
    return json;
  },

  finalizeMonthlyClosing: async (id, data) => {
    const res = await fetch(`${API}/monthly-closings/${id}/finalize`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || "Failed to finalize closing");
    return json;
  },

  getCurrentMonthEstimate: async (year, month) => {
    let url = `${API}/this-month-estimate`;
    if (year && month) {
      url += `?year=${year}&month=${month}`;
    }
    const res = await fetch(url);
    if (!res.ok) throw new Error("Failed to fetch month estimate");
    return res.json();
  },

  // 6. Day-to-Day Calculation Logs
  getDailyProfitLogs: async (year, month) => {
    let url = `${API}/daily-profit-logs`;
    if (year && month) {
      url += `?year=${year}&month=${month}`;
    }
    const res = await fetch(url);
    if (!res.ok) throw new Error("Failed to fetch daily profit logs");
    return res.json();
  },

  // 7. Profit Calculations & Payouts
  getProfitCalculations: async () => {
    const res = await fetch(`${API}/profit-calculations`);
    if (!res.ok) throw new Error("Failed to fetch profit calculations");
    return res.json();
  },

  calculateFinancialsForPeriod: async (periodStart, periodEnd) => {
    const res = await fetch(`${API}/period-financials?periodStart=${periodStart}&periodEnd=${periodEnd}`);
    if (!res.ok) throw new Error("Failed to calculate period financials");
    return res.json();
  },

  previewProfitDistribution: async (data) => {
    const res = await fetch(`${API}/profit-calculations/preview`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || "Failed to preview profit distribution");
    return json;
  },

  saveProfitCalculation: async (data) => {
    const res = await fetch(`${API}/profit-calculations`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || "Failed to save profit calculation");
    return json;
  },

  finalizeProfitCalculation: async (id) => {
    const res = await fetch(`${API}/profit-calculations/${id}/finalize`, {
      method: "POST",
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || "Failed to finalize profit calculation");
    return json;
  },

  recordProfitPayment: async (data) => {
    const res = await fetch(`${API}/profit-calculations/payments`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || "Failed to record profit payment");
    return json;
  },

  // 8. Cron Management
  getCronStatus: async () => {
    const res = await fetch(`${API}/cron/status`);
    if (!res.ok) throw new Error("Failed to fetch cron status");
    return res.json();
  },

  runMonthlyClosing: async (data = {}) => {
    const res = await fetch(`${API}/cron/run-monthly-closing`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || "Failed to trigger monthly closing");
    return json;
  },

  runDailyCalculation: async (data = {}) => {
    const res = await fetch(`${API}/cron/run-daily-calculation`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || "Failed to run daily calculation");
    return json;
  },

  syncDailyLogs: async (data = {}) => {
    const res = await fetch(`${API}/cron/sync-daily-logs`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || "Failed to sync daily logs");
    return json;
  },
};
