ALTER TABLE daily_finance_accounts ADD COLUMN IF NOT EXISTS interest_type VARCHAR(10) NOT NULL DEFAULT 'AMOUNT' CHECK (interest_type IN ('PERCENT','AMOUNT'));
ALTER TABLE daily_finance_accounts ADD COLUMN IF NOT EXISTS interest_value NUMERIC(14,2) NOT NULL DEFAULT 0 CHECK (interest_value>=0);
CREATE INDEX IF NOT EXISTS idx_df_accounts_interest ON daily_finance_accounts(interest_type);
