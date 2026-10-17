/**
 * Utility formatters for Global Capital module
 */

export function money(val, fallback = "₹0.00") {
  if (val === null || val === undefined || isNaN(val)) return fallback;
  return `₹${Number(val).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export function formatDate(val) {
  if (!val) return "—";
  try {
    if (val instanceof Date) {
      if (isNaN(val.getTime())) return "—";
      const day = String(val.getDate()).padStart(2, "0");
      const month = String(val.getMonth() + 1).padStart(2, "0");
      const year = val.getFullYear();
      return `${day}-${month}-${year}`;
    }
    const str = String(val).trim();
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
  } catch {
    return String(val);
  }
}

export function formatTxNotes(notes) {
  if (!notes) return "-";
  const str = String(notes);
  const match = str.match(/Automated Net Profit Share for (\d{4}-\d{2}-\d{2}) to (\d{4}-\d{2}-\d{2})/i);
  if (match) {
    try {
      const parts = match[1].split("-");
      const d = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, 1);
      const monthYear = d.toLocaleString("default", { month: "long", year: "numeric" });
      return `Auto Profit Share — ${monthYear}`;
    } catch {
      return "Auto Profit Share";
    }
  }
  return str;
}
