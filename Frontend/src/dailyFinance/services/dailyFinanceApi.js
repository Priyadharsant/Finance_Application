const API =
  import.meta.env.VITE_API_URL || "http://localhost:3000/api/daily-finance";

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
      return isNaN(value.getTime()) ? "—" : value.toLocaleDateString("en-IN");
    }
    const str = String(value).trim();
    const d = str.includes("T") ? new Date(str) : new Date(`${str}T00:00:00`);
    if (isNaN(d.getTime())) {
      const fallback = new Date(str);
      return isNaN(fallback.getTime()) ? str.slice(0, 10) : fallback.toLocaleDateString("en-IN");
    }
    return d.toLocaleDateString("en-IN");
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
