-- Migration: Add currency configuration
-- Description: Adds currency configuration table and enforces KES currency
-- Date: 2024-01-01

-- Create currency configuration table if it doesn't exist
CREATE TABLE IF NOT EXISTS currency_config (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    currency_code VARCHAR(3) NOT NULL DEFAULT 'KES',
    currency_symbol VARCHAR(10) NOT NULL DEFAULT 'KES',
    locale VARCHAR(10) NOT NULL DEFAULT 'en-KE',
    decimal_places INTEGER NOT NULL DEFAULT 2,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT unique_active_currency UNIQUE (is_active) DEFERRABLE INITIALLY DEFERRED
);

-- Insert default KES currency configuration if none exists
INSERT INTO currency_config (currency_code, currency_symbol, locale, decimal_places, is_active) 
SELECT 'KES', 'KES', 'en-KE', 2, true
WHERE NOT EXISTS (SELECT 1 FROM currency_config WHERE is_active = true);

-- Add comments to existing monetary fields to indicate KES currency
COMMENT ON COLUMN inventory_batches.unit_cost IS 'Cost in KES';
COMMENT ON COLUMN inventory_batches.selling_price IS 'Price in KES';
COMMENT ON COLUMN invoice_items.unit_price IS 'Price in KES';
COMMENT ON COLUMN invoice_items.total_price IS 'Total in KES';
COMMENT ON COLUMN invoices.subtotal IS 'Subtotal in KES';
COMMENT ON COLUMN invoices.tax_amount IS 'Tax in KES';
COMMENT ON COLUMN invoices.discount_amount IS 'Discount in KES';
COMMENT ON COLUMN invoices.total_amount IS 'Total in KES';
COMMENT ON COLUMN invoices.amount_paid IS 'Paid amount in KES';
COMMENT ON COLUMN invoices.balance_amount IS 'Balance in KES';
COMMENT ON COLUMN payments.amount IS 'Payment amount in KES';
COMMENT ON COLUMN accounts_receivable.original_amount IS 'Original amount in KES';
COMMENT ON COLUMN accounts_receivable.remaining_amount IS 'Remaining amount in KES';
COMMENT ON COLUMN sha_claims.claim_amount IS 'Claim amount in KES';
COMMENT ON COLUMN sha_claims.approved_amount IS 'Approved amount in KES';
COMMENT ON COLUMN sha_claims.paid_amount IS 'Paid amount in KES';
COMMENT ON COLUMN sha_claims.balance_variance IS 'Variance in KES';
COMMENT ON COLUMN sha_claim_items.unit_price IS 'Price in KES';
COMMENT ON COLUMN sha_claim_items.total_amount IS 'Amount in KES';
COMMENT ON COLUMN sha_claim_items.approved_unit_price IS 'Approved price in KES';
COMMENT ON COLUMN sha_claim_items.approved_amount IS 'Approved amount in KES';
COMMENT ON COLUMN sha_invoices.total_amount IS 'Total amount in KES';
COMMENT ON COLUMN sha_claim_batches.total_amount IS 'Total amount in KES';
COMMENT ON COLUMN visits.total_charges IS 'Total charges in KES';
COMMENT ON COLUMN cash_reconciliations.opening_float IS 'Opening float in KES';
COMMENT ON COLUMN cash_reconciliations.expected_cash IS 'Expected cash in KES';
COMMENT ON COLUMN cash_reconciliations.actual_cash IS 'Actual cash in KES';
COMMENT ON COLUMN cash_reconciliations.variance IS 'Variance in KES';

-- Create a function to get the current currency configuration
CREATE OR REPLACE FUNCTION get_currency_config()
RETURNS TABLE (
    currency_code VARCHAR(3),
    currency_symbol VARCHAR(10),
    locale VARCHAR(10),
    decimal_places INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        cc.currency_code,
        cc.currency_symbol,
        cc.locale,
        cc.decimal_places
    FROM currency_config cc
    WHERE cc.is_active = true
    LIMIT 1;
END;
$$ LANGUAGE plpgsql;

-- Create a function to format currency amounts
CREATE OR REPLACE FUNCTION format_currency(amount DECIMAL)
RETURNS TEXT AS $$
DECLARE
    config_record RECORD;
BEGIN
    SELECT * INTO config_record FROM get_currency_config();
    
    IF config_record IS NULL THEN
        -- Fallback to KES if no config found
        RETURN 'KES ' || TO_CHAR(amount, 'FM999,999,999,990.00');
    END IF;
    
    RETURN config_record.currency_symbol || ' ' || TO_CHAR(amount, 'FM999,999,999,990.' || REPEAT('0', config_record.decimal_places));
END;
$$ LANGUAGE plpgsql;
