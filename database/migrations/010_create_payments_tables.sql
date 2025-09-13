-- Create payments table for recording all payment transactions
CREATE TABLE IF NOT EXISTS payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    invoice_id UUID REFERENCES invoices(id),
    patient_id UUID REFERENCES patients(id),
    amount DECIMAL(10,2) NOT NULL,
    payment_method VARCHAR(20) NOT NULL CHECK (payment_method IN ('CASH', 'MPESA', 'SHA', 'INSURANCE')),
    payment_status VARCHAR(20) NOT NULL CHECK (payment_status IN ('PENDING', 'COMPLETED', 'FAILED', 'CANCELLED')),
    
    -- M-Pesa specific fields
    mpesa_receipt_number VARCHAR(50),
    mpesa_transaction_id VARCHAR(100),
    phone_number VARCHAR(20),
    
    -- SHA specific fields
    sha_claim_number VARCHAR(50),
    sha_batch_id VARCHAR(50),
    
    -- Insurance specific fields
    insurance_provider VARCHAR(100),
    insurance_claim_number VARCHAR(50),
    
    -- Evidence and audit
    evidence_type VARCHAR(20),
    evidence_data JSONB,
    
    -- Timestamps and tracking
    transaction_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    recorded_by UUID REFERENCES users(id),
    recorded_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- Indexes for performance
    CONSTRAINT unique_mpesa_receipt UNIQUE (mpesa_receipt_number),
    CONSTRAINT unique_sha_claim UNIQUE (sha_claim_number)
);

-- Create SHA invoices table for insurance claim management
CREATE TABLE IF NOT EXISTS sha_invoices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    invoice_number VARCHAR(50) UNIQUE NOT NULL,
    patient_id UUID REFERENCES patients(id),
    patient_name VARCHAR(200) NOT NULL,
    patient_id_number VARCHAR(20) NOT NULL,
    sha_number VARCHAR(50) NOT NULL,
    
    -- Service details
    service_date DATE NOT NULL,
    services JSONB NOT NULL, -- Array of services with codes and amounts
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

-- Create M-Pesa configuration table for clinic-specific settings
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
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- Ensure only one active config
    CONSTRAINT unique_active_config UNIQUE (is_active) DEFERRABLE INITIALLY DEFERRED
);

-- Create payment evidence table for storing payment proofs
CREATE TABLE IF NOT EXISTS payment_evidence (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    payment_id UUID REFERENCES payments(id),
    evidence_type VARCHAR(50) NOT NULL,
    document_url VARCHAR(500),
    receipt_number VARCHAR(100) NOT NULL,
    amount DECIMAL(10,2) NOT NULL,
    transaction_date TIMESTAMP WITH TIME ZONE NOT NULL,
    additional_data JSONB,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_payments_invoice_id ON payments(invoice_id);
CREATE INDEX IF NOT EXISTS idx_payments_patient_id ON payments(patient_id);
CREATE INDEX IF NOT EXISTS idx_payments_method_status ON payments(payment_method, payment_status);
CREATE INDEX IF NOT EXISTS idx_payments_transaction_date ON payments(transaction_date);
CREATE INDEX IF NOT EXISTS idx_payments_mpesa_transaction ON payments(mpesa_transaction_id);

CREATE INDEX IF NOT EXISTS idx_sha_invoices_patient_id ON sha_invoices(patient_id);
CREATE INDEX IF NOT EXISTS idx_sha_invoices_status ON sha_invoices(status);
CREATE INDEX IF NOT EXISTS idx_sha_invoices_service_date ON sha_invoices(service_date);
CREATE INDEX IF NOT EXISTS idx_sha_invoices_batch_id ON sha_invoices(batch_id);
CREATE INDEX IF NOT EXISTS idx_sha_invoices_sha_number ON sha_invoices(sha_number);

CREATE INDEX IF NOT EXISTS idx_payment_evidence_payment_id ON payment_evidence(payment_id);
CREATE INDEX IF NOT EXISTS idx_payment_evidence_receipt_number ON payment_evidence(receipt_number);

-- Create triggers for updated_at timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_payments_updated_at BEFORE UPDATE ON payments
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_sha_invoices_updated_at BEFORE UPDATE ON sha_invoices
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_mpesa_config_updated_at BEFORE UPDATE ON mpesa_config
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert default M-Pesa configuration for Seth Clinic
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
    '174379', -- Default test shortcode
    '123456', -- Default test till number
    'sandbox',
    'SETH_CLINIC',
    'Medical Services Payment',
    (SELECT id FROM users WHERE role = 'ADMIN' LIMIT 1)
) ON CONFLICT DO NOTHING;

-- Create view for payment summary
CREATE OR REPLACE VIEW payment_summary AS
SELECT 
    p.id,
    p.invoice_id,
    p.patient_id,
    pt.first_name || ' ' || pt.last_name as patient_name,
    pt.op_number,
    p.amount,
    p.payment_method,
    p.payment_status,
    p.mpesa_receipt_number,
    p.transaction_date,
    p.recorded_by,
    u.username as recorded_by_name,
    p.recorded_at
FROM payments p
LEFT JOIN patients pt ON p.patient_id = pt.id
LEFT JOIN users u ON p.recorded_by = u.id;

-- Create view for SHA invoice summary
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
    COUNT(s.service_code) as service_count
FROM sha_invoices si
LEFT JOIN users u ON si.generated_by = u.id
LEFT JOIN LATERAL jsonb_array_elements(si.services) s(service_code) ON true
GROUP BY si.id, si.invoice_number, si.patient_name, si.sha_number, 
         si.service_date, si.total_amount, si.status, si.generated_at, 
         si.submitted_at, u.username;
