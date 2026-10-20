const resolveApi = () => {
  const url =
    import.meta.env.VITE_API_URL ||
    (import.meta.env.VITE_BACKEND_URL
      ? `${import.meta.env.VITE_BACKEND_URL.replace(/\/$/, "")}/api/daily-finance`
      : "https://finance-application-1q00.onrender.com/api/daily-finance");
  const clean = url.replace(/\/$/, "");
  return clean.endsWith("/api/daily-finance") ? clean : `${clean}/api/daily-finance`;
};

const API = resolveApi();

export const today = () => new Date().toISOString().slice(0, 10);

export const money = (value) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(Number(value || 0));

export const dateLabel = (value) => {
  if (!value) return "—";
  try {
    if (value instanceof Date) {
      if (isNaN(value.getTime())) return "—";
      const day = String(value.getDate()).padStart(2, "0");
      const month = String(value.getMonth() + 1).padStart(2, "0");
      const year = value.getFullYear();
      return `${day}-${month}-${year}`;
    }
    const str = String(value).trim();
    const dateOnlyMatch = str.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (dateOnlyMatch) {
      const [, y, m, d] = dateOnlyMatch;
      return `${d}-${m}-${y}`;
    }
    if (/^\d{2}-\d{2}-\d{4}$/.test(str)) {
      return str;
    }
    const d = str.includes("T") ? new Date(str) : new Date(`${str}T00:00:00`);
    if (!isNaN(d.getTime())) {
      const day = String(d.getDate()).padStart(2, "0");
      const month = String(d.getMonth() + 1).padStart(2, "0");
      const year = d.getFullYear();
      return `${day}-${month}-${year}`;
    }
    const fallback = new Date(str);
    if (!isNaN(fallback.getTime())) {
      const day = String(fallback.getDate()).padStart(2, "0");
      const month = String(fallback.getMonth() + 1).padStart(2, "0");
      const year = fallback.getFullYear();
      return `${day}-${month}-${year}`;
    }
    return str;
  } catch (_) {
    return String(value);
  }
};

export const call = (path, options = {}) =>
  fetch(`${API}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...options,
  }).then(async (response) => {
    const json = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(json.error || "Request failed");
    return json;
  });

export const emptyFinance = {
  customerName: "",
  mobileNumber: "",
  address: "",
  notes: "",
  grossFinanceAmount: "",
  interestType: "PERCENT",
  interestValue: "",
  financeDate: today(),
};

export const dailyFinanceApi = {
  getDashboard: (date) => call(`/dashboard?date=${date || today()}`),
  getDailyEntry: (date) => call(`/daily-entry?date=${date || today()}`),
  getCollectionDates: () => call("/reports/collection-dates"),
  createFinance: (data) =>
    call("/customers-with-finance", {
      method: "POST",
      body: JSON.stringify({
        ...data,
        agreedTotalPayable: data.grossFinanceAmount,
        dailyAgreedDue: 0,
      }),
    }),
  createPayment: (body) =>
    call("/payments", {
      method: "POST",
      body: JSON.stringify(body),
    }),
  updatePayment: (paymentId, body) =>
    call(`/payments/${paymentId}`, {
      method: "PUT",
      body: JSON.stringify(body),
    }),
  getCustomerDetails: (customerId) => call(`/customers/${customerId}`),
  getReports: (params) => {
    const query = new URLSearchParams(params).toString();
    return call(`/reports/customers?${query}`);
  },
  closeLoan: (financeId, data) =>
    call(`/accounts/${financeId}/close`, {
      method: "POST",
      body: JSON.stringify(data),
    }),
  increaseLoanAmount: (financeId, data) =>
    call(`/accounts/${financeId}/increase-amount`, {
      method: "POST",
      body: JSON.stringify(data),
    }),
};
