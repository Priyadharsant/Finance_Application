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

function getTargetAction(req) {
  const method = req.method.toUpperCase();
  const path = (req.originalUrl || req.url || "").split("?")[0].toLowerCase();
  if (path.endsWith("/loans/pay-emi")) return "Collect Auto Loan EMI";
  if (path.endsWith("/loans") && method === "POST") return "Provide / create Auto Loan";
  if (path.includes("/close")) return "Close Auto Loan";
  if (path.includes("/customers") && method === "POST") return "Create Customer";
  if (path.includes("/customers") && method === "PUT") return "Update Customer";
  if (path.includes("/loans") && method === "GET") return "View Auto Loan";
  if (path.includes("/loans") && method === "PUT") return "Update Auto Loan";
  return `${method} ${path}`;
}

async function findTargetRecords(req) {
  const body = req.body || {};
  const params = req.params || {};
  const loanId = body.loanId || body.loan_id || params.id || params.loanId;
  const emiId = body.emiId || body.emi_id || params.emiId;
  const customerId = body.customerId || body.customer_id || params.customerId;
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
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from,
      to,
      subject: details.method
        ? `[KAMBAM FINANCE API ERROR] ${details.status} ${details.method} ${details.path}`
        : `[KAMBAM FINANCE SERVER ERROR] ${details.type || "Unhandled error"}`,
      text: `KAMBAM FINANCE API ERROR\n\n${stringify(safeDetails)}`,
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
      clientIp: req.headers["x-forwarded-for"] || req.socket?.remoteAddress || "unknown",
      userAgent: req.headers["user-agent"] || "unknown",
      user: req.user ? { id: req.user.id, email: req.user.email, role: req.user.role } : undefined,
      customerOrLoanContext: {
        params: req.params,
        query: req.query,
        request: req.body,
      },
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
