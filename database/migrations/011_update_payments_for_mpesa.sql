-- Update existing payments table for M-Pesa Daraja integration
-- Add missing columns for M-Pesa and SHA payments

-- Add payment status column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='payments' AND column_name='payment_status') THEN
        ALTER TABLE payments ADD COLUMN payment_status VARCHAR(20) DEFAULT 'COMPLETED' CHECK (payment_status IN ('PENDING', 'COMPLETED', 'FAILED', 'CANCELLED'));
    END IF;
END $$;

-- Add patient_id column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='payments' AND column_name='patient_id') THEN
        ALTER TABLE payments ADD COLUMN patient_id UUID REFERENCES patients(id);
    END IF;
END $$;

-- Add phone_number column for M-Pesa
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='payments' AND column_name='phone_number') THEN
        ALTER TABLE payments ADD COLUMN phone_number VARCHAR(20);
    END IF;
END $$;

-- Add M-Pesa transaction ID column
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='payments' AND column_name='mpesa_transaction_id') THEN
        ALTER TABLE payments ADD COLUMN mpesa_transaction_id VARCHAR(100);
    END IF;
END $$;

-- Add M-Pesa receipt number column (rename existing mpesa_reference if needed)
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='payments' AND column_name='mpesa_receipt_number') THEN
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='payments' AND column_name='mpesa_reference') THEN
            ALTER TABLE payments RENAME COLUMN mpesa_reference TO mpesa_receipt_number;
        ELSE
            ALTER TABLE payments ADD COLUMN mpesa_receipt_number VARCHAR(100);
        END IF;
    END IF;
END $$;

-- Add transaction_date column (rename received_at if needed)
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='payments' AND column_name='transaction_date') THEN
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='payments' AND column_name='received_at') THEN
            ALTER TABLE payments RENAME COLUMN received_at TO transaction_date;
        ELSE
            ALTER TABLE payments ADD COLUMN transaction_date TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP;
        END IF;
    END IF;
END $$;

-- Add recorded_by column (rename received_by if needed)
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='payments' AND column_name='recorded_by') THEN
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='payments' AND column_name='received_by') THEN
            ALTER TABLE payments RENAME COLUMN received_by TO recorded_by;
        ELSE
            ALTER TABLE payments ADD COLUMN recorded_by UUID REFERENCES users(id);
        END IF;
    END IF;
END $$;

-- Add recorded_at column
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='payments' AND column_name='recorded_at') THEN
        ALTER TABLE payments ADD COLUMN recorded_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP;
    END IF;
END $$;

-- Add evidence columns
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='payments' AND column_name='evidence_type') THEN
        ALTER TABLE payments ADD COLUMN evidence_type VARCHAR(20);
    END IF;
END $$;

DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='payments' AND column_name='evidence_data') THEN
        ALTER TABLE payments ADD COLUMN evidence_data JSONB;
    END IF;
END $$;

-- Add SHA specific columns
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='payments' AND column_name='sha_claim_number') THEN
        ALTER TABLE payments ADD COLUMN sha_claim_number VARCHAR(50);
    END IF;
END $$;

DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='payments' AND column_name='insurance_provider') THEN
        ALTER TABLE payments ADD COLUMN insurance_provider VARCHAR(100);
    END IF;
END $$;

-- Update payment_method check constraint to include SHA and INSURANCE
ALTER TABLE payments DROP CONSTRAINT IF EXISTS payments_payment_method_check;
ALTER TABLE payments ADD CONSTRAINT payments_payment_method_check 
    CHECK (payment_method IN ('CASH', 'MPESA', 'BANK_TRANSFER', 'SHA', 'INSURANCE', 'OTHER'));

-- Create indexes for new columns
CREATE INDEX IF NOT EXISTS idx_payments_patient_id ON payments(patient_id);
CREATE INDEX IF NOT EXISTS idx_payments_payment_status ON payments(payment_status);
CREATE INDEX IF NOT EXISTS idx_payments_mpesa_transaction_id ON payments(mpesa_transaction_id);
CREATE INDEX IF NOT EXISTS idx_payments_transaction_date ON payments(transaction_date);

-- Create SHA invoices table if it doesn't exist
CREATE TABLE IF NOT EXISTS sha_invoices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    invoice_number VARCHAR(50) UNIQUE NOT NULL,
    patient_id UUID REFERENCES patients(id),
    patient_name VARCHAR(200) NOT NULL,
    patient_id_number VARCHAR(20) NOT NULL,
    sha_number VARCHAR(50) NOT NULL,
    
    -- Service details
    service_date DATE NOT NULL,
    services JSONB NOT NULL,
    total_amount DECIMAL(10,2) NOT NULL,
    
    -- Status tracking
    status VARCHAR(20) NOT NULL DEFAULT 'GENERATED' CHECK (status IN ('GENERATED', 'SUBMITTED', 'APPROVED', 'PAID', 'REJECTED')),
    
    -- Workflow timestamps
    generated_by UUID REFERENCES users(id),
    generated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    submitted_at TIMESTAMP WITH TIME ZONE,
    approved_at TIMESTAMP WITH TIME ZONE,
    paid_at TIMESTAMP WITH TIME ZONE,
    
    -- Batch management
    batch_id VARCHAR(50),
    
    -- Rejection handling
    rejection_reason TEXT,
    
    -- Audit trail
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create M-Pesa configuration table
CREATE TABLE IF NOT EXISTS mpesa_config (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    clinic_name VARCHAR(200) NOT NULL,
    business_shortcode VARCHAR(20) NOT NULL,
    till_number VARCHAR(20),
    paybill_number VARCHAR(20),
    environment VARCHAR(10) NOT NULL DEFAULT 'sandbox' CHECK (environment IN ('sandbox', 'production')),
    account_reference VARCHAR(100) NOT NULL DEFAULT 'SETH_CLINIC',
    transaction_desc VARCHAR(200) NOT NULL DEFAULT 'Medical Services Payment',
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Insert default M-Pesa configuration
INSERT INTO mpesa_config (
    clinic_name,
    business_shortcode,
    till_number,
    environment,
    account_reference,
    transaction_desc,
    created_by
) VALUES (
    'Seth Medical Clinic',
    '174379',
    '123456',
    'sandbox',
    'SETH_CLINIC',
    'Medical Services Payment',
    (SELECT id FROM users WHERE role = 'ADMIN' LIMIT 1)
) ON CONFLICT DO NOTHING;

-- Create indexes for SHA invoices
CREATE INDEX IF NOT EXISTS idx_sha_invoices_patient_id ON sha_invoices(patient_id);
CREATE INDEX IF NOT EXISTS idx_sha_invoices_status ON sha_invoices(status);
CREATE INDEX IF NOT EXISTS idx_sha_invoices_service_date ON sha_invoices(service_date);
CREATE INDEX IF NOT EXISTS idx_sha_invoices_batch_id ON sha_invoices(batch_id);
CREATE INDEX IF NOT EXISTS idx_sha_invoices_sha_number ON sha_invoices(sha_number);

-- Create payment summary view (updated for existing columns)
CREATE OR REPLACE VIEW payment_summary AS
SELECT 
    p.id,
    p.invoice_id,
    p.patient_id,
    COALESCE(pt.first_name || ' ' || pt.last_name, 'Unknown Patient') as patient_name,
    pt.op_number,
    p.amount,
    p.payment_method,
    COALESCE(p.payment_status, 'COMPLETED') as payment_status,
    p.mpesa_receipt_number,
    COALESCE(p.transaction_date, p.recorded_at) as transaction_date,
    p.recorded_by,
    u.username as recorded_by_name,
    p.recorded_at
FROM payments p
LEFT JOIN patients pt ON p.patient_id = pt.id
LEFT JOIN users u ON p.recorded_by = u.id;

-- Create SHA invoice summary view
CREATE OR REPLACE VIEW sha_invoice_summary AS
SELECT 
    si.id,
    si.invoice_number,
    si.patient_name,
    si.sha_number,
    si.service_date,
    si.total_amount,
    si.status,
    si.generated_at,
    si.submitted_at,
    u.username as generated_by_name,
    jsonb_array_length(si.services) as service_count
FROM sha_invoices si
LEFT JOIN users u ON si.generated_by = u.id;

-- Update existing payments to have default status if null
UPDATE payments SET payment_status = 'COMPLETED' WHERE payment_status IS NULL;

-- Grant permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON payments TO seth_clinic_user;
GRANT SELECT, INSERT, UPDATE, DELETE ON sha_invoices TO seth_clinic_user;
GRANT SELECT, INSERT, UPDATE, DELETE ON mpesa_config TO seth_clinic_user;
GRANT SELECT, INSERT, UPDATE, DELETE ON payment_evidence TO seth_clinic_user;

GRANT SELECT ON payment_summary TO seth_clinic_user;
GRANT SELECT ON sha_invoice_summary TO seth_clinic_user;
