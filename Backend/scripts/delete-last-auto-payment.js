/**
 * Safely preview or delete the latest Auto Finance payment for a customer code.
 *
 * Preview (default):
 *   node scripts/delete-last-auto-payment.js --loan-code AUTO-...
 * Delete only after reviewing the preview:
 *   node scripts/delete-last-auto-payment.js --loan-code AUTO-... \
 *     --confirm-payment-id <payment-uuid> --i-understand
 *
 * The script refuses local databases. It removes the matching ledger row and
 * recalculates the affected installment totals in the same transaction.
 */
import dotenv from "dotenv";
import pg from "pg";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { rescheduleFutureEMIs } from "../autoFinance/services/loanService.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, "../.env"), quiet: true });
dotenv.config({ path: path.resolve(__dirname, "../../.env"), quiet: true });

function arg(name) {
  const prefix = `${name}=`;
  const inline = process.argv.find((value) => value.startsWith(prefix));
  if (inline) return inline.slice(prefix.length);
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : undefined;
}

const customerCode = arg("--loan-code");
const confirmedPaymentId = arg("--confirm-payment-id");
const confirmed = process.argv.includes("--i-understand");
if (!customerCode) {
  console.error("Usage: node scripts/delete-last-auto-payment.js --loan-code AUTO-... [--confirm-payment-id UUID --i-understand]");
  process.exit(2);
}

const connectionString = process.env.FINANCE_DATABASE_URL || process.env.POSTGRES_URL || process.env.DATABASE_URL;
if (!connectionString) throw new Error("Set FINANCE_DATABASE_URL (recommended) or POSTGRES_URL/DATABASE_URL.");
const host = new URL(connectionString).hostname;
if (["localhost", "127.0.0.1", "::1"].includes(host)) {
  throw new Error("Refusing to run against localhost. Set FINANCE_DATABASE_URL to the intended cloud database.");
}

const { Pool } = pg;
const pool = new Pool({
  connectionString,
  ssl: process.env.PGSSLMODE === "disable" ? undefined : { rejectUnauthorized: false },
  max: 1,
  connectionTimeoutMillis: 15000,
});

const latestPaymentSql = `
  SELECT p.id AS payment_id, p.loan_id, p.emi_id, p.payment_date, p.created_at,
         p.amount_paid, p.fine_amount, p.principal_paid, p.interest_paid,
         p.extra_principal_paid, p.payment_method, p.reference_number,
         p.receipt_number, c.customer_code,
         TRIM(CONCAT_WS(' ', c.first_name, c.last_name)) AS customer_name,
         s.installment_number, s.due_date
  FROM autofinance_customers c
  JOIN autofinance_loans l ON l.customer_id = c.id
  JOIN autofinance_payments p ON p.loan_id = l.id
  LEFT JOIN autofinance_emi_schedules s ON s.id = p.emi_id
  WHERE c.customer_code = $1
  ORDER BY p.payment_date DESC, p.created_at DESC NULLS LAST, p.id DESC
  LIMIT 1`;

try {
  const preview = await pool.query(latestPaymentSql, [customerCode]);
  if (!preview.rows.length) {
    console.log(`No Auto Finance payment found for customer code ${customerCode}. No changes made.`);
    process.exitCode = 1;
  } else {
    const payment = preview.rows[0];
    console.log("Latest payment preview (read-only):");
    console.log(JSON.stringify(payment, null, 2));

    if (!confirmedPaymentId || !confirmed) {
      console.log("\nNo deletion performed. Review the preview, then pass its payment_id with --confirm-payment-id and add --i-understand.");
    } else if (confirmedPaymentId !== payment.payment_id) {
      throw new Error("Confirmation payment ID does not match the latest payment. No changes made.");
    } else {
      const client = await pool.connect();
      try {
        await client.query("BEGIN");
        await client.query("SET TRANSACTION ISOLATION LEVEL SERIALIZABLE");
        const locked = await client.query(`${latestPaymentSql.replace("LIMIT 1", "LIMIT 1 FOR UPDATE OF p, l")}`, [customerCode]);
        const current = locked.rows[0];
        if (!current || current.payment_id !== confirmedPaymentId) {
          throw new Error("Latest payment changed after preview. No changes made; preview again.");
        }

        await client.query(`ALTER TABLE autofinance_emi_schedules ADD COLUMN IF NOT EXISTS pending_amount NUMERIC(14,2) NOT NULL DEFAULT 0`);
        await client.query(`ALTER TABLE autofinance_emi_schedules ADD COLUMN IF NOT EXISTS pending_amount_forwarded NUMERIC(14,2) NOT NULL DEFAULT 0`);
        const carries = await client.query(
          `SELECT COUNT(*)::int AS count FROM autofinance_emi_schedules
           WHERE loan_id = $1 AND (COALESCE(pending_amount, 0) <> 0 OR COALESCE(pending_amount_forwarded, 0) <> 0)`,
          [current.loan_id],
        );
        const carriedPart = Number(current.amount_paid || 0)
          - Number(current.principal_paid || 0)
          - Number(current.interest_paid || 0)
          - Number(current.extra_principal_paid || 0);
        if (carries.rows[0].count > 0 || carriedPart > 0.01) {
          throw new Error("This loan has carried/forwarded dues. Automatic deletion is blocked to avoid corrupting installment balances; review and reverse those carry amounts manually.");
        }
        if (!current.emi_id) {
          throw new Error("This payment is not linked to an EMI schedule. Automatic deletion is blocked for manual review.");
        }

        await client.query(
          `DELETE FROM global_cash_ledger
           WHERE reference_type = 'AUTO_PAYMENT' AND reference_id = $1`,
          [current.payment_id],
        );
        const deleted = await client.query(
          `DELETE FROM autofinance_payments WHERE id = $1 AND loan_id = $2 RETURNING id`,
          [current.payment_id, current.loan_id],
        );
        if (!deleted.rowCount) throw new Error("Payment was not deleted; it may have changed concurrently.");

        await client.query(
          `WITH totals AS (
             SELECT COALESCE(SUM(principal_paid), 0) AS principal_paid,
                    COALESCE(SUM(interest_paid), 0) AS interest_paid,
                    COALESCE(SUM(extra_principal_paid), 0) AS extra_principal_paid,
                    COALESCE(SUM(amount_paid - COALESCE(extra_principal_paid, 0)), 0) AS collected_amount
             FROM autofinance_payments WHERE emi_id = $1
           )
           UPDATE autofinance_emi_schedules s SET
             paid_principal = totals.principal_paid,
             paid_interest = totals.interest_paid,
             extra_principal_paid = totals.extra_principal_paid,
             collected_amount = totals.collected_amount,
             status = CASE
               WHEN totals.principal_paid >= s.principal_component
                AND totals.interest_paid >= s.interest_component THEN 'PAID'
               WHEN totals.principal_paid > 0 OR totals.interest_paid > 0 THEN 'PARTIAL'
               ELSE 'PENDING'
             END
           FROM totals WHERE s.id = $1`,
          [current.emi_id],
        );
        await rescheduleFutureEMIs(client, current.loan_id);
        await client.query("COMMIT");
        console.log(`Deleted payment ${current.payment_id}; removed linked AUTO_PAYMENT ledger entry and recalculated installment ${current.installment_number}.`);
      } catch (error) {
        await client.query("ROLLBACK").catch(() => {});
        throw error;
      } finally {
        client.release();
      }
    }
  }
} finally {
  await pool.end();
}
