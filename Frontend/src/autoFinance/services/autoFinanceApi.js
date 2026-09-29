export const API_BASE =
  import.meta.env.VITE_BACKEND_URL
    ? `${import.meta.env.VITE_BACKEND_URL.replace(/\/$/, "")}/api`
    : import.meta.env.VITE_API_URL
    ? import.meta.env.VITE_API_URL.replace(/\/daily-finance\/?$/, "")
    : "https://finance-application-y6oo.onrender.com/api";

export const money = (value) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(Number(value || 0));

export const dateLabel = (value) =>
  value ? new Date(value).toLocaleDateString("en-IN") : "—";

export async function apiCall(endpoint, options = {}) {
  const res = await fetch(`${API_BASE}${endpoint}`, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok)
    throw new Error(data.message || data.error || "API Request Failed");
  return data;
}
