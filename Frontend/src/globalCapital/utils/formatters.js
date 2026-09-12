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
  if (!val) return "-";
  try {
    const d = new Date(val);
    if (isNaN(d.getTime())) return String(val).slice(0, 10);
    return d.toISOString().slice(0, 10);
  } catch {
    return String(val).slice(0, 10);
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
