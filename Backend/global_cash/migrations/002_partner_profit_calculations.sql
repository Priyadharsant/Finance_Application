-- Migration 002: Partner Interest & Profit Calculation Module

-- 1. partner_profit_calculations
CREATE TABLE IF NOT EXISTS partner_profit_calculations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    period_start DATE NOT NULL,
    period_end DATE NOT NULL,
    distributable_profit NUMERIC(14,2) NOT NULL CHECK(distributable_profit >= 0),
    total_capital_weight NUMERIC(24,4) NOT NULL DEFAULT 0,
    status VARCHAR(50) DEFAULT 'DRAFT', -- DRAFT, FINALIZED, CANCELLED
    calculated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    finalized_at TIMESTAMPTZ,
    created_by VARCHAR(150),
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Index for period queries
CREATE INDEX IF NOT EXISTS idx_profit_calc_period ON partner_profit_calculations(period_start, period_end);

-- 2. partner_profit_allocations
CREATE TABLE IF NOT EXISTS partner_profit_allocations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    calculation_id UUID NOT NULL REFERENCES partner_profit_calculations(id) ON DELETE CASCADE,
    partner_id UUID NOT NULL REFERENCES global_partners(id),
    opening_capital NUMERIC(14,2) NOT NULL DEFAULT 0,
    closing_capital NUMERIC(14,2) NOT NULL DEFAULT 0,
    capital_weight NUMERIC(24,4) NOT NULL DEFAULT 0,
    profit_ratio NUMERIC(14,8) NOT NULL DEFAULT 0,
    allocated_profit NUMERIC(14,2) NOT NULL DEFAULT 0,
    payable_amount NUMERIC(14,2) NOT NULL DEFAULT 0,
    paid_amount NUMERIC(14,2) NOT NULL DEFAULT 0,
    status VARCHAR(50) DEFAULT 'ALLOCATED', -- ALLOCATED, PROFIT_PAYABLE, PARTIALLY_PAID, PAID
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_profit_alloc_calc ON partner_profit_allocations(calculation_id);
CREATE INDEX IF NOT EXISTS idx_profit_alloc_partner ON partner_profit_allocations(partner_id);

-- 3. partner_profit_payments
CREATE TABLE IF NOT EXISTS partner_profit_payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    partner_id UUID NOT NULL REFERENCES global_partners(id),
    allocation_id UUID NOT NULL REFERENCES partner_profit_allocations(id),
    amount NUMERIC(14,2) NOT NULL CHECK(amount > 0),
    payment_date DATE NOT NULL DEFAULT CURRENT_DATE,
    reference VARCHAR(150),
    global_cash_ledger_reference UUID,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_profit_payments_alloc ON partner_profit_payments(allocation_id);
CREATE INDEX IF NOT EXISTS idx_profit_payments_partner ON partner_profit_payments(partner_id);
