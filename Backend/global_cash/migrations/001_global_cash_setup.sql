-- 1. global_partners
CREATE TABLE IF NOT EXISTS global_partners (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(150) NOT NULL,
    status VARCHAR(50) DEFAULT 'ACTIVE', -- ACTIVE, EXIT_REQUESTED, EXITED
    exit_effective_date DATE,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 2. partner_exit_requests
CREATE TABLE IF NOT EXISTS partner_exit_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    partner_id UUID NOT NULL REFERENCES global_partners(id),
    request_date DATE NOT NULL DEFAULT CURRENT_DATE,
    effective_exit_date DATE NOT NULL,
    status VARCHAR(50) DEFAULT 'REQUESTED', -- REQUESTED, APPROVED, EFFECTIVE, SETTLEMENT_PENDING, PARTIALLY_SETTLED, SETTLED, CANCELLED
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 3. partner_capital_transactions (Immutable Ledger)
CREATE TABLE IF NOT EXISTS partner_capital_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    partner_id UUID NOT NULL REFERENCES global_partners(id),
    transaction_type VARCHAR(50) NOT NULL, -- CONTRIBUTION, WITHDRAWAL, ADJUSTMENT_INCREASE, ADJUSTMENT_DECREASE, CAPITAL_EXIT, REVERSAL
    amount NUMERIC(14,2) NOT NULL CHECK(amount >= 0),
    effective_date DATE NOT NULL,
    transaction_timestamp TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    status VARCHAR(50) DEFAULT 'COMPLETED', -- PENDING, COMPLETED, REVERSED
    reference_type VARCHAR(100),
    reference_id UUID,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 4. global_cash_ledger (Immutable Ledger)
CREATE TABLE IF NOT EXISTS global_cash_ledger (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    transaction_date TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    effective_date DATE NOT NULL,
    type VARCHAR(100) NOT NULL, -- PARTNER_CONTRIBUTION, PARTNER_WITHDRAWAL, AUTO_LOAN_DISBURSEMENT, DAILY_LOAN_DISBURSEMENT, AUTO_COLLECTION, DAILY_COLLECTION, BUSINESS_EXPENSE, PROFIT_PAYMENT, ADJUSTMENT
    amount NUMERIC(14,2) NOT NULL CHECK(amount >= 0),
    direction VARCHAR(20) NOT NULL, -- CREDIT, DEBIT
    source_module VARCHAR(50) NOT NULL, -- GLOBAL, AUTO, DAILY
    reference_type VARCHAR(100),
    reference_id UUID,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 5. monthly_closings
CREATE TABLE IF NOT EXISTS monthly_closings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    period_label VARCHAR(20) NOT NULL UNIQUE, -- e.g. '2026-01'
    status VARCHAR(50) DEFAULT 'DRAFT', -- DRAFT, CALCULATING, REVIEWED, CLOSED, REOPENED
    calculated_company_profit NUMERIC(14,2) DEFAULT 0,
    calculated_company_loss NUMERIC(14,2) DEFAULT 0,
    manual_adjustment NUMERIC(14,2) DEFAULT 0,
    adjustment_reason TEXT,
    final_company_profit NUMERIC(14,2) DEFAULT 0,
    final_company_loss NUMERIC(14,2) DEFAULT 0,
    closed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 6. partner_monthly_allocations
CREATE TABLE IF NOT EXISTS partner_monthly_allocations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    closing_id UUID NOT NULL REFERENCES monthly_closings(id) ON DELETE CASCADE,
    partner_id UUID NOT NULL REFERENCES global_partners(id),
    opening_capital NUMERIC(14,2) DEFAULT 0,
    closing_capital NUMERIC(14,2) DEFAULT 0,
    weighted_capital NUMERIC(20,4) DEFAULT 0,
    ownership_ratio NUMERIC(10,6) DEFAULT 0, -- e.g. 0.450000 for 45%
    profit_amount NUMERIC(14,2) DEFAULT 0,
    loss_amount NUMERIC(14,2) DEFAULT 0,
    status VARCHAR(50) DEFAULT 'PROFIT_ALLOCATED', -- PROFIT_ALLOCATED, PROFIT_PAYABLE, PARTIALLY_PAID, PAID
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);
