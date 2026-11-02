ALTER TABLE daily_finance_accounts ADD COLUMN IF NOT EXISTS closed_date DATE NULL;

UPDATE daily_finance_accounts a
SET closed_date = COALESCE(
  (SELECT MAX(p.collection_date) FROM daily_finance_payments p WHERE p.finance_id = a.finance_id AND p.status <> 'VOID'),
  a.updated_at::date
)
WHERE a.status IN ('COMPLETED', 'CLOSED') AND a.closed_date IS NULL;
