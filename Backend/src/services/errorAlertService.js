import { pool } from "../../autoFinance/config/db.js";

const REDACTED = "[REDACTED]";
const SECRET_KEY = /(password|passwd|secret|token|authorization|cookie|api.?key|credential|aadhaar|aadhar|pan|ssn|document|file|image|signature)/i;
const MAX_VALUE_LENGTH = 12000;

function safeValue(value, key = "", depth = 0) {
  if (SECRET_KEY.test(key)) return REDACTED;
  if (depth > 7) return "[MAX DEPTH]";
  if (value == null || typeof value === "boolean" || typeof value === "number") return value;
  if (typeof value === "string") return value.length > 2000 ? `${value.slice(0, 2000)}…[TRUNCATED]` : value;
  if (Array.isArray(value)) return value.slice(0, 50).map((item) => safeValue(item, "", depth + 1));
  if (typeof value === "object") {
    return Object.fromEntries(Object.entries(value).slice(0, 100).map(([childKey, childValue]) => [childKey, safeValue(childValue, childKey, depth + 1)]));
  }
  return String(value);
}

function stringify(value) {
  const result = JSON.stringify(value, null, 2) ?? String(value ?? "");
  return result.length > MAX_VALUE_LENGTH ? `${result.slice(0, MAX_VALUE_LENGTH)}\n…[TRUNCATED]` : result;
}

function escapeHtml(value) {
  return String(value ?? "—")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function pretty(value) {
  return stringify(value ?? "Not provided");
}

function section(title, value) {
  if (value === undefined || value === null || value === "") return "";
  return `<tr><td style="padding:0 28px 20px"><div style="font:600 12px Arial,sans-serif;letter-spacing:.08em;text-transform:uppercase;color:#526174;margin:0 0 8px">${escapeHtml(title)}</div><pre style="white-space:pre-wrap;overflow-wrap:anywhere;background:#f5f7fa;border:1px solid #e5eaf0;border-radius:8px;padding:14px;margin:0;color:#182230;font:12px/1.55 Consolas,'Courier New',monospace">${escapeHtml(pretty(value))}</pre></td></tr>`;
}

function renderEmail(details) {
  const isServer = !details.method;
  const title = isServer ? "Server error report" : "API error report";
  const color = details.status >= 500 ? "#b42318" : "#b54708";
  const status = isServer ? escapeHtml(details.type || "Unhandled error") : `${escapeHtml(details.status)} ${escapeHtml(details.statusText || "Error")}`;
  const records = details.targetRecords?.records || [];
  const context = records.length
    ? records.map((record) => ({ customer: record.customer, loan: record.loan, vehicle: record.vehicle })).filter((record) => record.customer || record.loan || record.vehicle)
    : details.targetRecords;
  const summary = [
    ["Action", details.targetAction || details.type || "Server error"],
    ["Endpoint", details.method ? `${details.method} ${details.path}` : "Server process"],
    ["Time", details.timestamp],
    ["Environment", details.environment],
    ["User", details.user ? [details.user.email, details.user.role].filter(Boolean).join(" · ") : "Unauthenticated / unavailable"],
    ["Request ID", details.requestId],
    ["Client IP", details.clientIp],
  ].filter(([, value]) => value);
  const rows = summary.map(([label, value]) => `<tr><td style="padding:7px 0;color:#667085;font:13px Arial,sans-serif;width:132px;vertical-align:top">${escapeHtml(label)}</td><td style="padding:7px 0;color:#182230;font:13px Arial,sans-serif;overflow-wrap:anywhere">${escapeHtml(value)}</td></tr>`).join("");
  const html = `<!doctype html><html><body style="margin:0;background:#eef2f6;padding:24px 12px"><table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:680px;margin:0 auto;background:#fff;border:1px solid #e4e9ef;border-radius:12px;overflow:hidden"><tr><td style="background:#142337;padding:22px 28px"><div style="color:#a9b8ca;font:600 11px Arial,sans-serif;letter-spacing:.12em;text-transform:uppercase">Kambam Finance · Monitoring</div><div style="color:#fff;font:600 22px Arial,sans-serif;margin-top:7px">${title}</div></td></tr><tr><td style="padding:22px 28px 10px"><span style="display:inline-block;background:${color};color:#fff;border-radius:6px;padding:7px 11px;font:700 13px Arial,sans-serif">${status}</span><div style="font:600 17px Arial,sans-serif;color:#182230;margin-top:14px">${escapeHtml(details.targetAction || details.type || "Request failed")}</div></td></tr><tr><td style="padding:4px 28px 22px"><table role="presentation" width="100%" cellspacing="0" cellpadding="0">${rows}</table></td></tr>${section("Customer, loan and vehicle", context)}${section("Request data", details.requestData)}${section("Query parameters", details.query)}${section("Route parameters", details.params)}${section("Response data", details.response)}${section("Error details", details.error)}${section("Client details", { userAgent: details.userAgent, contentType: details.contentType })}<tr><td style="padding:4px 28px 24px;color:#667085;font:11px/1.5 Arial,sans-serif">Sensitive fields are redacted automatically. Request and response content may be truncated for email size.</td></tr></table></body></html>`;
  const text = `${title}\n\n${summary.map(([label, value]) => `${label}: ${value}`).join("\n")}\n\nCustomer, loan and vehicle:\n${pretty(context)}\n\nRequest data:\n${pretty(details.requestData)}\n\nQuery parameters:\n${pretty(details.query)}\n\nRoute parameters:\n${pretty(details.params)}\n\nResponse data:\n${pretty(details.response)}\n\nError details:\n${pretty(details.error)}\n\nClient details:\n${pretty({ userAgent: details.userAgent, contentType: details.contentType })}`;
  return { html, text };
}

function getTargetAction(req) {
  const method = req.method.toUpperCase();
  const path = (req.originalUrl || req.url || "").split("?")[0].toLowerCase();
  if (path.endsWith("/loans/pay-emi")) return "Collect Auto Loan EMI";
  if (path.endsWith("/loans") && method === "POST") return "Create Auto Loan";
  if (path.includes("/close")) return "Close Auto Loan";
  if (path.includes("/customers")) {
    const verb = method === "POST" ? "Create" : method === "PUT" || method === "PATCH" ? "Update" : method === "DELETE" ? "Delete" : "View";
    return `${verb} Customer`;
  }
  if (path.includes("/loans")) {
    const verb = method === "POST" ? "Create" : method === "PUT" || method === "PATCH" ? "Update" : method === "DELETE" ? "Delete" : "View";
    return `${verb} Auto Loan`;
  }
  if (path.includes("/daily-finance")) return `${method} Daily Finance`;
  if (path.includes("/global-cash")) return `${method} Global Cash`;
  if (path.includes("/auth/login")) return "Sign in";
  return `${method} ${path}`;
}

async function findTargetRecords(req) {
  const body = req.body || {};
  const params = req.params || {};
  const path = (req.originalUrl || req.url || "").split("?")[0];
  const pathId = path.match(/[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}/i)?.[0];
  const loanId = body.loanId || body.loan_id || params.id || params.loanId || (!path.includes("/customers") ? pathId : null);
  const emiId = body.emiId || body.emi_id || params.emiId;
  const customerId = body.customerId || body.customer_id || params.customerId || (path.includes("/customers") ? pathId : null);
  const customerCode = body.customerCode || body.customer_code;
  if (!loanId && !customerId && !customerCode) return { loan: null, customer: null, vehicle: null, installment: null };

  try {
    const loanResult = await pool.query(
      `SELECT l.id AS loan_id, l.status AS loan_status, l.loan_amount,
              l.interest_rate, l.interest_type, l.tenure_months, l.start_date,
              c.id AS customer_id, c.customer_code, c.first_name, c.last_name,
              c.phone, c.alternate_phone, c.email, c.address, c.city, c.state, c.pincode,
              v.vehicle_type, v.make, v.model, v.year, v.registration_number
       FROM autofinance_customers c
       LEFT JOIN autofinance_loans l ON l.customer_id = c.id
       LEFT JOIN autofinance_vehicles v ON v.loan_id = l.id
       WHERE ($1::uuid IS NOT NULL AND l.id = $1::uuid)
          OR ($2::uuid IS NOT NULL AND c.id = $2::uuid)
          OR ($3::text IS NOT NULL AND c.customer_code = $3::text)
       ORDER BY l.created_at DESC NULLS LAST LIMIT 10`,
      [loanId || null, customerId || null, customerCode || null],
    );
    const targets = loanResult.rows.map((row) => ({
      loan: row.loan_id ? {
        id: row.loan_id, status: row.loan_status, principal: row.loan_amount,
        interestRate: row.interest_rate, interestType: row.interest_type,
        tenureMonths: row.tenure_months, startDate: row.start_date,
      } : null,
      customer: {
        id: row.customer_id, code: row.customer_code,
        name: [row.first_name, row.last_name].filter(Boolean).join(" "),
        phone: row.phone, alternatePhone: row.alternate_phone, email: row.email,
        address: row.address, city: row.city, state: row.state, pincode: row.pincode,
      },
      vehicle: row.vehicle_type || row.make || row.model || row.registration_number ? {
        type: row.vehicle_type, make: row.make, model: row.model,
        year: row.year, registrationNumber: row.registration_number,
      } : null,
    }));
    let installment = null;
    if (emiId) {
      const emiResult = await pool.query(
        `SELECT id, loan_id, installment_number, due_date, status, principal_component,
                interest_component, total_emi, collected_amount, paid_principal, paid_interest,
                pending_amount, pending_amount_forwarded
         FROM autofinance_emi_schedules WHERE id = $1 LIMIT 1`,
        [emiId],
      );
      installment = emiResult.rows[0] || null;
    }
    return { records: targets, installment };
  } catch (error) {
    console.error("[API Error Alert] Could not load target customer/loan context:", error.message);
    return { lookupError: error.message, records: [], installment: null };
  }
}

export async function sendApiErrorAlert(details) {
  const apiKey = process.env.FINANCE_ERROR_RESEND_API_KEY;
  const from = process.env.FINANCE_ERROR_MAIL_FROM;
  const to = process.env.FINANCE_ERROR_MAIL_TO;
  if (!apiKey || !from || !to) {
    console.error("[API Error Alert] Not sent: FINANCE_ERROR_RESEND_API_KEY, FINANCE_ERROR_MAIL_FROM, or FINANCE_ERROR_MAIL_TO is missing.");
    return;
  }

  const safeDetails = safeValue(details);
  const email = renderEmail(safeDetails);
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from,
      to,
      subject: details.method
        ? `[KAMBAM FINANCE] ${details.status} ${details.method} ${String(details.path || "").split("?")[0]}`
        : `[KAMBAM FINANCE] SERVER ERROR · ${details.type || "Unhandled error"}`,
      html: email.html,
      text: email.text,
    }),
  });
  if (!response.ok) {
    const responseText = await response.text().catch(() => "");
    throw new Error(`Resend returned ${response.status}: ${responseText.slice(0, 500)}`);
  }
}

export function apiErrorAlertMiddleware(req, res, next) {
  let responseBody;
  let alertQueued = false;
  const originalJson = res.json.bind(res);
  const originalSend = res.send.bind(res);

  const capture = (body) => {
    responseBody = body;
    if (res.statusCode < 400 || alertQueued) return;
    alertQueued = true;
    const details = {
      timestamp: new Date().toISOString(),
      targetAction: getTargetAction(req),
      method: req.method,
      path: req.originalUrl || req.url,
      status: res.statusCode,
      statusText: res.statusMessage,
      requestId: req.headers["x-request-id"] || req.headers["x-correlation-id"],
      environment: process.env.RENDER_SERVICE_NAME ? `Render · ${process.env.RENDER_SERVICE_NAME}` : process.env.NODE_ENV || "unknown",
      clientIp: req.headers["x-forwarded-for"] || req.socket?.remoteAddress || "unknown",
      userAgent: req.headers["user-agent"] || "unknown",
      contentType: req.headers["content-type"],
      user: req.user ? { id: req.user.id, email: req.user.email, role: req.user.role } : undefined,
      params: req.params,
      query: req.query,
      requestData: req.body,
      response: body,
    };
    setImmediate(async () => {
      details.targetRecords = await findTargetRecords(req);
      sendApiErrorAlert(details).catch((error) => {
        console.error("[API Error Alert] Failed to send alert email:", error.message);
      });
    });
  };

  res.json = (body) => {
    capture(body);
    return originalJson(body);
  };
  res.send = (body) => {
    if (responseBody === undefined) capture(body);
    return originalSend(body);
  };
  next();
}
