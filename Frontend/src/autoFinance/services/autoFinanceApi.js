export const API_BASE =
  import.meta.env.VITE_BACKEND_URL
    ? `${import.meta.env.VITE_BACKEND_URL.replace(/\/$/, "")}/api`
    : import.meta.env.VITE_API_URL
    ? import.meta.env.VITE_API_URL.replace(/\/daily-finance\/?$/, "")
    : "https://finance-application-1q00.onrender.com/api";

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
