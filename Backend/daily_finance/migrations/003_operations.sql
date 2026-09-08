CREATE TABLE IF NOT EXISTS daily_finance_daily_closings (
  closing_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  closing_date DATE NOT NULL UNIQUE,
  expected_collection NUMERIC(14,2) NOT NULL DEFAULT 0,
  actual_collection NUMERIC(14,2) NOT NULL DEFAULT 0,
  pending_collection NUMERIC(14,2) NOT NULL DEFAULT 0,
  finance_disbursement NUMERIC(14,2) NOT NULL DEFAULT 0,
  expenses NUMERIC(14,2) NOT NULL DEFAULT 0,
  status VARCHAR(20) NOT NULL DEFAULT 'OPEN',
  closed_by UUID NULL,
  closed_at TIMESTAMPTZ NULL,
  reopened_at TIMESTAMPTZ NULL,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_df_closings_date ON daily_finance_daily_closings(closing_date);
