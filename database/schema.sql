-- Seth Medical Clinic Database Schema
-- PostgreSQL Database Schema

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(255),
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL CHECK (role IN ('ADMIN', 'RECEPTIONIST', 'NURSE', 'CLINICAL_OFFICER', 'PHARMACIST', 'INVENTORY_MANAGER', 'CLAIMS_MANAGER')),
    is_active BOOLEAN DEFAULT true,
    is_locked BOOLEAN DEFAULT false,
    failed_login_attempts INTEGER DEFAULT 0,
    last_login_at TIMESTAMP,
    totp_secret VARCHAR(255), -- Encrypted TOTP secret for MFA
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- User sessions table
CREATE TABLE user_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    refresh_token VARCHAR(500) NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Patients table
CREATE TABLE patients (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    op_number VARCHAR(20) UNIQUE NOT NULL, -- Primary identifier
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    date_of_birth DATE,
    age INTEGER,
    gender VARCHAR(10) CHECK (gender IN ('MALE', 'FEMALE', 'OTHER')),
    phone_number VARCHAR(20),
    area VARCHAR(100),
    next_of_kin VARCHAR(200),
    next_of_kin_phone VARCHAR(20),
    insurance_type VARCHAR(20) NOT NULL CHECK (insurance_type IN ('SHA', 'PRIVATE', 'CASH')),
    insurance_number VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Visits table
CREATE TABLE visits (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    patient_id UUID NOT NULL REFERENCES patients(id),
    op_number VARCHAR(20) NOT NULL,
    visit_date DATE NOT NULL DEFAULT CURRENT_DATE,
    status VARCHAR(30) NOT NULL DEFAULT 'REGISTERED' CHECK (status IN ('REGISTERED', 'TRIAGED', 'WAITING_CONSULTATION', 'IN_CONSULTATION', 'WAITING_LAB', 'LAB_RESULTS_READY', 'WAITING_PHARMACY', 'COMPLETED', 'CANCELLED')),
    chief_complaint TEXT,
    triage_category VARCHAR(20) DEFAULT 'NORMAL' CHECK (triage_category IN ('EMERGENCY', 'URGENT', 'NORMAL')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Vitals table
CREATE TABLE vitals (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    visit_id UUID NOT NULL REFERENCES visits(id),
    temperature DECIMAL(4,1),
    blood_pressure_systolic INTEGER,
    blood_pressure_diastolic INTEGER,
    heart_rate INTEGER,
    respiratory_rate INTEGER,
    oxygen_saturation INTEGER,
    weight DECIMAL(5,2),
    height DECIMAL(5,2),
    bmi DECIMAL(4,1),
    recorded_by UUID NOT NULL REFERENCES users(id),
    recorded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Consultations table
CREATE TABLE consultations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    visit_id UUID NOT NULL REFERENCES visits(id),
    patient_id UUID NOT NULL REFERENCES patients(id),
    clinician_id UUID NOT NULL REFERENCES users(id),
    presenting_complaint TEXT NOT NULL,
    history_of_presenting_complaint TEXT,
    past_medical_history TEXT,
    examination TEXT,
    diagnosis TEXT NOT NULL,
    treatment_plan TEXT,
    follow_up_instructions TEXT,
    consultation_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Prescriptions table
CREATE TABLE prescriptions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    consultation_id UUID NOT NULL REFERENCES consultations(id),
    visit_id UUID NOT NULL REFERENCES visits(id),
    patient_id UUID NOT NULL REFERENCES patients(id),
    prescribed_by UUID NOT NULL REFERENCES users(id),
    status VARCHAR(30) DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'PARTIALLY_DISPENSED', 'FULLY_DISPENSED', 'CANCELLED')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Prescription items table
CREATE TABLE prescription_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    prescription_id UUID NOT NULL REFERENCES prescriptions(id),
    inventory_item_id UUID NOT NULL,
    item_name VARCHAR(200) NOT NULL,
    dosage VARCHAR(100) NOT NULL,
    frequency VARCHAR(100) NOT NULL,
    duration VARCHAR(100) NOT NULL,
    quantity_prescribed INTEGER NOT NULL,
    quantity_dispensed INTEGER DEFAULT 0,
    instructions TEXT
);

-- Inventory items table
CREATE TABLE inventory_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(200) NOT NULL,
    generic_name VARCHAR(200),
    category VARCHAR(100) NOT NULL,
    unit VARCHAR(50) NOT NULL,
    reorder_level INTEGER DEFAULT 0,
    max_level INTEGER DEFAULT 1000,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Inventory batches table
CREATE TABLE inventory_batches (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    inventory_item_id UUID NOT NULL REFERENCES inventory_items(id),
    batch_number VARCHAR(100) NOT NULL,
    quantity INTEGER NOT NULL,
    original_quantity INTEGER NOT NULL,
    unit_cost DECIMAL(10,2) NOT NULL,
    selling_price DECIMAL(10,2) NOT NULL,
    expiry_date DATE NOT NULL,
    supplier_name VARCHAR(200),
    received_date DATE DEFAULT CURRENT_DATE,
    received_by UUID NOT NULL REFERENCES users(id),
    is_expired BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(inventory_item_id, batch_number)
);

-- Inventory movements table
CREATE TABLE inventory_movements (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    inventory_item_id UUID NOT NULL REFERENCES inventory_items(id),
    batch_id UUID REFERENCES inventory_batches(id),
    movement_type VARCHAR(20) NOT NULL CHECK (movement_type IN ('RECEIVE', 'DISPENSE', 'ADJUST', 'EXPIRE', 'TRANSFER')),
    quantity INTEGER NOT NULL,
    unit_cost DECIMAL(10,2),
    reference VARCHAR(200), -- Invoice ID, adjustment reason, etc.
    performed_by UUID NOT NULL REFERENCES users(id),
    performed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    notes TEXT
);

-- Invoices table
CREATE TABLE invoices (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    invoice_number VARCHAR(50) UNIQUE NOT NULL,
    patient_id UUID REFERENCES patients(id),
    op_number VARCHAR(20),
    buyer_name VARCHAR(200), -- For walk-in sales
    buyer_phone VARCHAR(20),
    invoice_type VARCHAR(20) NOT NULL CHECK (invoice_type IN ('PRESCRIPTION', 'WALK_IN', 'CONSULTATION', 'LAB')),
    subtotal DECIMAL(10,2) NOT NULL,
    tax_amount DECIMAL(10,2) DEFAULT 0,
    discount_amount DECIMAL(10,2) DEFAULT 0,
    total_amount DECIMAL(10,2) NOT NULL,
    amount_paid DECIMAL(10,2) DEFAULT 0,
    balance_amount DECIMAL(10,2) NOT NULL,
    status VARCHAR(20) DEFAULT 'UNPAID' CHECK (status IN ('PAID', 'PARTIAL', 'UNPAID')),
    payment_due_date DATE,
    created_by UUID NOT NULL REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Invoice items table
CREATE TABLE invoice_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    invoice_id UUID NOT NULL REFERENCES invoices(id),
    inventory_item_id UUID REFERENCES inventory_items(id),
    service_type VARCHAR(100), -- For non-inventory services
    item_name VARCHAR(200) NOT NULL,
    quantity INTEGER NOT NULL,
    unit_price DECIMAL(10,2) NOT NULL,
    total_price DECIMAL(10,2) NOT NULL,
    batch_id UUID REFERENCES inventory_batches(id)
);

-- Payments table
CREATE TABLE payments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    invoice_id UUID NOT NULL REFERENCES invoices(id),
    amount DECIMAL(10,2) NOT NULL,
    payment_method VARCHAR(20) NOT NULL CHECK (payment_method IN ('CASH', 'MPESA', 'BANK_TRANSFER', 'OTHER')),
    mpesa_reference VARCHAR(100),
    bank_reference VARCHAR(100),
    received_by UUID NOT NULL REFERENCES users(id),
    received_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    reconciled BOOLEAN DEFAULT false,
    reconciled_at TIMESTAMP,
    notes TEXT
);

-- Accounts receivable table
CREATE TABLE accounts_receivable (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    invoice_id UUID NOT NULL REFERENCES invoices(id),
    patient_id UUID REFERENCES patients(id),
    op_number VARCHAR(20),
    original_amount DECIMAL(10,2) NOT NULL,
    remaining_amount DECIMAL(10,2) NOT NULL,
    due_date DATE NOT NULL,
    aging_bucket VARCHAR(10) NOT NULL CHECK (aging_bucket IN ('0-30', '31-60', '61-90', '90+')),
    status VARCHAR(20) DEFAULT 'CURRENT' CHECK (status IN ('CURRENT', 'OVERDUE', 'SETTLED')),
    last_reminder_sent TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- SHA claims table (enhanced for comprehensive compliance)
CREATE TABLE sha_claims (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    claim_number VARCHAR(50) UNIQUE NOT NULL,
    patient_id UUID NOT NULL REFERENCES patients(id),
    op_number VARCHAR(20) NOT NULL,
    visit_id UUID NOT NULL REFERENCES visits(id),
    
    -- Patient Information (SHA Requirements)
    patient_name VARCHAR(200) NOT NULL,
    sha_beneficiary_id VARCHAR(50) NOT NULL,
    national_id VARCHAR(20),
    phone_number VARCHAR(20),
    visit_date DATE NOT NULL,
    
    -- Diagnosis Information (ICD-10/SHA Codes)
    primary_diagnosis_code VARCHAR(20) NOT NULL,
    primary_diagnosis_description TEXT NOT NULL,
    secondary_diagnosis_codes VARCHAR(200)[], -- Array for multiple diagnoses
    secondary_diagnosis_descriptions TEXT[],
    
    -- Provider Information
    provider_code VARCHAR(50) NOT NULL,
    provider_name VARCHAR(200) NOT NULL,
    facility_level VARCHAR(20) CHECK (facility_level IN ('Level1', 'Level2', 'Level3', 'Level4', 'Level5', 'Level6')),
    
    -- Financial Information
    claim_amount DECIMAL(10,2) NOT NULL,
    approved_amount DECIMAL(10,2),
    paid_amount DECIMAL(10,2) DEFAULT 0,
    balance_variance DECIMAL(10,2) DEFAULT 0,
    
    -- Status Tracking (Enhanced)
    status VARCHAR(30) DEFAULT 'DRAFT' CHECK (status IN ('DRAFT', 'READY_TO_SUBMIT', 'INVOICE_GENERATED', 'SUBMITTED', 'APPROVED', 'REJECTED', 'PARTIALLY_PAID', 'PAID')),
    submission_date TIMESTAMP,
    approval_date TIMESTAMP,
    rejection_date TIMESTAMP,
    payment_date TIMESTAMP,
    
    -- SHA References
    sha_reference VARCHAR(100),
    sha_transaction_reference VARCHAR(100),
    sha_payment_reference VARCHAR(100),
    batch_id VARCHAR(100),
    
    -- Compliance & Audit
    rejection_reason TEXT,
    compliance_notes TEXT,
    requires_documents BOOLEAN DEFAULT false,
    documents_attached INTEGER DEFAULT 0,
    last_reviewed_at TIMESTAMP,
    reviewed_by UUID REFERENCES users(id),
    
    -- System Tracking
    created_by UUID NOT NULL REFERENCES users(id),
    submitted_by UUID REFERENCES users(id),
    approved_by UUID REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- SHA claim items table (enhanced for comprehensive service tracking)
CREATE TABLE sha_claim_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    claim_id UUID NOT NULL REFERENCES sha_claims(id),
    
    -- Service Details (SHA Requirements)
    service_type VARCHAR(100) NOT NULL CHECK (service_type IN ('CONSULTATION', 'DIAGNOSTIC', 'LABORATORY', 'PHARMACY', 'PROCEDURE', 'INPATIENT', 'EMERGENCY', 'DENTAL', 'OPTICAL')),
    service_code VARCHAR(50) NOT NULL,
    service_description TEXT NOT NULL,
    service_date DATE NOT NULL,
    
    -- Pricing Information
    quantity INTEGER NOT NULL DEFAULT 1,
    unit_price DECIMAL(10,2) NOT NULL,
    total_amount DECIMAL(10,2) NOT NULL,
    
    -- SHA Processing
    sha_service_code VARCHAR(50),
    sha_service_category VARCHAR(100),
    sha_tariff_code VARCHAR(50),
    approved_quantity INTEGER,
    approved_unit_price DECIMAL(10,2),
    approved_amount DECIMAL(10,2),
    rejection_reason TEXT,
    
    -- Clinical Information
    prescription_notes TEXT,
    treatment_notes TEXT,
    dosage_instructions TEXT,
    diagnosis_justification TEXT,
    
    -- Provider Information
    provided_by UUID REFERENCES users(id),
    department VARCHAR(100),
    facility_level VARCHAR(20),
    
    -- Audit & Compliance
    is_emergency BOOLEAN DEFAULT false,
    requires_pre_authorization BOOLEAN DEFAULT false,
    pre_authorization_number VARCHAR(100),
    compliance_verified BOOLEAN DEFAULT false,
    verification_notes TEXT,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- SHA invoices table (enhanced for compliance)
CREATE TABLE sha_invoices (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    invoice_number VARCHAR(50) UNIQUE NOT NULL,
    claim_id UUID NOT NULL REFERENCES sha_claims(id),
    patient_id UUID NOT NULL REFERENCES patients(id),
    op_number VARCHAR(20) NOT NULL,
    visit_id UUID REFERENCES visits(id),
    invoice_date DATE NOT NULL,
    due_date DATE NOT NULL,
    total_amount DECIMAL(10,2) NOT NULL,
    status VARCHAR(20) DEFAULT 'draft' CHECK (status IN ('draft', 'generated', 'printed', 'submitted', 'paid')),
    generated_at TIMESTAMP,
    generated_by UUID NOT NULL REFERENCES users(id),
    printed_at TIMESTAMP,
    printed_by UUID REFERENCES users(id),
    submitted_at TIMESTAMP,
    submitted_by UUID REFERENCES users(id),
    sha_reference VARCHAR(100),
    batch_reference VARCHAR(100),
    compliance_status VARCHAR(20) DEFAULT 'pending' CHECK (compliance_status IN ('pending', 'verified', 'approved', 'rejected')),
    audit_notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- SHA compliance tracking table
CREATE TABLE sha_compliance (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    claim_id UUID NOT NULL REFERENCES sha_claims(id),
    invoice_id UUID NOT NULL REFERENCES sha_invoices(id),
    compliance_type VARCHAR(30) NOT NULL CHECK (compliance_type IN ('invoice_generation', 'submission', 'payment', 'audit')),
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'verified', 'approved', 'rejected')),
    verification_date TIMESTAMP,
    verified_by UUID REFERENCES users(id),
    notes TEXT,
    required_actions TEXT[],
    next_review_date DATE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- SHA audit trail table (immutable for compliance)
CREATE TABLE sha_audit_trail (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    claim_id UUID NOT NULL REFERENCES sha_claims(id),
    invoice_id UUID REFERENCES sha_invoices(id),
    action VARCHAR(100) NOT NULL,
    performed_by UUID NOT NULL REFERENCES users(id),
    performed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    details JSONB NOT NULL,
    ip_address INET,
    user_agent TEXT,
    compliance_check BOOLEAN DEFAULT false,
    audit_notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- SHA batch management table (enhanced)
CREATE TABLE sha_claim_batches (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    batch_number VARCHAR(50) UNIQUE NOT NULL,
    batch_date DATE NOT NULL,
    batch_type VARCHAR(20) DEFAULT 'custom' CHECK (batch_type IN ('weekly', 'monthly', 'custom')),
    total_claims INTEGER NOT NULL,
    total_amount DECIMAL(10,2) NOT NULL,
    status VARCHAR(20) DEFAULT 'draft' CHECK (status IN ('draft', 'submitted', 'processing', 'completed', 'failed')),
    submission_date TIMESTAMP,
    completion_date TIMESTAMP,
    sha_batch_reference VARCHAR(100),
    created_by UUID NOT NULL REFERENCES users(id),
    invoice_generated BOOLEAN DEFAULT false,
    invoice_generated_at TIMESTAMP,
    printed_invoices BOOLEAN DEFAULT false,
    printed_at TIMESTAMP,
    printed_by UUID REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- SHA submission logs table (enhanced)
CREATE TABLE sha_submission_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    claim_id UUID REFERENCES sha_claims(id),
    batch_id UUID REFERENCES sha_claim_batches(id),
    invoice_id UUID REFERENCES sha_invoices(id),
    submission_type VARCHAR(20) NOT NULL CHECK (submission_type IN ('single', 'batch')),
    submission_method VARCHAR(20) DEFAULT 'api' CHECK (submission_method IN ('api', 'portal', 'manual')),
    request_payload JSONB,
    response_payload JSONB,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'success', 'failed', 'retry')),
    error_message TEXT,
    retry_count INTEGER DEFAULT 0,
    next_retry_at TIMESTAMP,
    compliance_check BOOLEAN DEFAULT false,
    audit_notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Document attachments table for SHA compliance
CREATE TABLE sha_document_attachments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    claim_id UUID NOT NULL REFERENCES sha_claims(id),
    invoice_id UUID REFERENCES sha_invoices(id),
    
    -- Document Information
    document_type VARCHAR(50) NOT NULL CHECK (document_type IN ('LAB_RESULTS', 'DISCHARGE_SUMMARY', 'PRESCRIPTION', 'REFERRAL_LETTER', 'MEDICAL_REPORT', 'IMAGING_REPORT', 'CONSENT_FORM', 'INSURANCE_CARD', 'IDENTIFICATION', 'OTHER')),
    document_name VARCHAR(255) NOT NULL,
    document_description TEXT,
    file_path VARCHAR(500) NOT NULL,
    file_size BIGINT NOT NULL,
    mime_type VARCHAR(100) NOT NULL,
    
    -- SHA Compliance
    is_required BOOLEAN DEFAULT false,
    compliance_verified BOOLEAN DEFAULT false,
    verification_date TIMESTAMP,
    verification_notes TEXT,
    sha_document_reference VARCHAR(100),
    
    -- Audit Information
    uploaded_by UUID NOT NULL REFERENCES users(id),
    uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    access_count INTEGER DEFAULT 0,
    last_accessed_at TIMESTAMP,
    last_accessed_by UUID REFERENCES users(id),
    
    -- Security & Retention
    encryption_status VARCHAR(20) DEFAULT 'encrypted' CHECK (encryption_status IN ('encrypted', 'unencrypted')),
    retention_period INTEGER DEFAULT 2555, -- 7 years in days
    deletion_scheduled_date DATE,
    is_archived BOOLEAN DEFAULT false,
    archived_at TIMESTAMP,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Patient encounter tracking table (for automatic invoice generation)
CREATE TABLE patient_encounters (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    patient_id UUID NOT NULL REFERENCES patients(id),
    visit_id UUID NOT NULL REFERENCES visits(id),
    
    -- Encounter Information
    encounter_type VARCHAR(50) NOT NULL CHECK (encounter_type IN ('CONSULTATION', 'LAB', 'PHARMACY', 'INPATIENT', 'EMERGENCY', 'FOLLOW_UP', 'PROCEDURE')),
    encounter_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    completion_date TIMESTAMP,
    
    -- Clinical Information
    chief_complaint TEXT,
    diagnosis_codes VARCHAR(20)[],
    diagnosis_descriptions TEXT[],
    treatment_summary TEXT,
    
    -- Service Information
    services_provided JSONB, -- Array of service objects
    medications_prescribed JSONB, -- Array of prescription objects
    lab_tests_ordered JSONB, -- Array of lab test objects
    procedures_performed JSONB, -- Array of procedure objects
    
    -- Provider Information
    primary_provider UUID NOT NULL REFERENCES users(id),
    consulting_providers UUID[] DEFAULT '{}',
    department VARCHAR(100),
    location VARCHAR(100),
    
    -- Financial Information
    total_charges DECIMAL(10,2) DEFAULT 0,
    insurance_eligible BOOLEAN DEFAULT false,
    sha_eligible BOOLEAN DEFAULT false,
    private_pay BOOLEAN DEFAULT false,
    
    -- Status Tracking
    status VARCHAR(30) DEFAULT 'IN_PROGRESS' CHECK (status IN ('IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'INVOICE_GENERATED', 'BILLED')),
    completion_triggered_invoice BOOLEAN DEFAULT false,
    invoice_id UUID REFERENCES invoices(id),
    sha_claim_id UUID REFERENCES sha_claims(id),
    
    -- Audit Information
    created_by UUID NOT NULL REFERENCES users(id),
    completed_by UUID REFERENCES users(id),
    billed_by UUID REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- SHA export logs table (for PDF/Excel exports)
CREATE TABLE sha_export_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Export Information
    export_type VARCHAR(20) NOT NULL CHECK (export_type IN ('PDF', 'EXCEL', 'CSV', 'JSON')),
    export_scope VARCHAR(20) NOT NULL CHECK (export_scope IN ('SINGLE_INVOICE', 'BATCH', 'DATE_RANGE', 'CUSTOM_FILTER')),
    
    -- Filter Criteria
    date_from DATE,
    date_to DATE,
    patient_ids UUID[],
    claim_statuses VARCHAR(30)[],
    invoice_ids UUID[],
    batch_ids UUID[],
    
    -- Export Results
    total_records INTEGER NOT NULL,
    file_path VARCHAR(500),
    file_size BIGINT,
    download_count INTEGER DEFAULT 0,
    
    -- SHA Compliance
    export_reason VARCHAR(200) NOT NULL,
    audit_trail_reference VARCHAR(100),
    compliance_approved BOOLEAN DEFAULT false,
    approved_by UUID REFERENCES users(id),
    approval_date TIMESTAMP,
    
    -- System Information
    exported_by UUID NOT NULL REFERENCES users(id),
    exported_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP, -- Auto-delete after X days
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- SHA workflow instances table (for tracking claim processing workflows)
CREATE TABLE sha_workflow_instances (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    claim_id UUID NOT NULL REFERENCES sha_claims(id),
    workflow_type VARCHAR(50) NOT NULL CHECK (workflow_type IN ('CLAIM_SUBMISSION', 'INVOICE_GENERATION', 'DOCUMENT_ATTACHMENT', 'COMPLIANCE_REVIEW', 'PAYMENT_PROCESSING')),
    overall_status VARCHAR(30) NOT NULL DEFAULT 'INITIATED' CHECK (overall_status IN ('INITIATED', 'IN_PROGRESS', 'COMPLETED', 'FAILED', 'CANCELLED')),
    current_step VARCHAR(50) NOT NULL,
    total_steps INTEGER NOT NULL DEFAULT 1,
    completed_steps INTEGER NOT NULL DEFAULT 0,
    step_details JSONB NOT NULL DEFAULT '{}',
    error_message TEXT,
    retry_count INTEGER DEFAULT 0,
    max_retries INTEGER DEFAULT 3,
    initiated_by UUID NOT NULL REFERENCES users(id),
    completed_by UUID REFERENCES users(id),
    initiated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP,
    expires_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- SHA workflow steps table (for detailed step tracking within workflows)
CREATE TABLE sha_workflow_steps (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    workflow_id UUID NOT NULL REFERENCES sha_workflow_instances(id) ON DELETE CASCADE,
    step_name VARCHAR(100) NOT NULL,
    step_order INTEGER NOT NULL,
    step_type VARCHAR(50) NOT NULL CHECK (step_type IN ('VALIDATION', 'PROCESSING', 'NOTIFICATION', 'APPROVAL', 'DOCUMENTATION')),
    status VARCHAR(30) NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'IN_PROGRESS', 'COMPLETED', 'FAILED', 'SKIPPED')),
    input_data JSONB,
    output_data JSONB,
    error_message TEXT,
    started_at TIMESTAMP,
    completed_at TIMESTAMP,
    duration_ms INTEGER,
    retry_count INTEGER DEFAULT 0,
    max_retries INTEGER DEFAULT 3,
    executed_by UUID REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Clinical diagnosis codes table (ICD-10 codes for autocomplete)
CREATE TABLE clinical_diagnosis_codes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code VARCHAR(20) UNIQUE NOT NULL,
    description TEXT NOT NULL,
    category VARCHAR(100),
    subcategory VARCHAR(100),
    is_active BOOLEAN DEFAULT true,
    usage_count INTEGER DEFAULT 0,
    search_keywords TEXT[],
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Clinical medications table (for prescription autocomplete)
CREATE TABLE clinical_medications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(200) NOT NULL,
    generic_name VARCHAR(200),
    dosage_form VARCHAR(50),
    strength VARCHAR(50),
    manufacturer VARCHAR(100),
    is_active BOOLEAN DEFAULT true,
    usage_count INTEGER DEFAULT 0,
    search_keywords TEXT[],
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Clinical lab tests table (for diagnostics autocomplete)
CREATE TABLE clinical_lab_tests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    test_code VARCHAR(50) UNIQUE NOT NULL,
    test_name VARCHAR(200) NOT NULL,
    test_category VARCHAR(100),
    specimen_type VARCHAR(100),
    turnaround_time VARCHAR(50),
    is_active BOOLEAN DEFAULT true,
    usage_count INTEGER DEFAULT 0,
    search_keywords TEXT[],
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Clinical procedures table (for procedure autocomplete)
CREATE TABLE clinical_procedures (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    procedure_code VARCHAR(50) UNIQUE NOT NULL,
    procedure_name VARCHAR(200) NOT NULL,
    procedure_category VARCHAR(100),
    complexity VARCHAR(20) CHECK (complexity IN ('SIMPLE', 'MODERATE', 'COMPLEX')),
    is_active BOOLEAN DEFAULT true,
    usage_count INTEGER DEFAULT 0,
    search_keywords TEXT[],
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Clinical symptoms table (for symptom autocomplete)
CREATE TABLE clinical_symptoms (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    symptom_name VARCHAR(200) NOT NULL,
    symptom_category VARCHAR(100),
    severity_level VARCHAR(20) CHECK (severity_level IN ('MILD', 'MODERATE', 'SEVERE')),
    is_active BOOLEAN DEFAULT true,
    usage_count INTEGER DEFAULT 0,
    search_keywords TEXT[],
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Audit logs table (immutable)
CREATE TABLE audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id),
    username VARCHAR(50) NOT NULL,
    action VARCHAR(100) NOT NULL,
    target_type VARCHAR(50) NOT NULL,
    target_id VARCHAR(100),
    op_number VARCHAR(20),
    details JSONB NOT NULL,
    ip_address INET,
    user_agent TEXT,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    checksum VARCHAR(64) NOT NULL -- SHA-256 hash for tamper detection
);

-- Cash reconciliation table
CREATE TABLE cash_reconciliations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    shift_date DATE NOT NULL,
    opening_float DECIMAL(10,2) NOT NULL,
    expected_cash DECIMAL(10,2) NOT NULL,
    actual_cash DECIMAL(10,2) NOT NULL,
    variance DECIMAL(10,2) NOT NULL,
    notes TEXT,
    reconciled_by UUID NOT NULL REFERENCES users(id),
    reconciled_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Migration jobs table
CREATE TABLE migration_jobs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    file_name VARCHAR(255) NOT NULL,
    file_size BIGINT NOT NULL,
    status VARCHAR(20) DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED')),
    total_records INTEGER DEFAULT 0,
    processed_records INTEGER DEFAULT 0,
    successful_records INTEGER DEFAULT 0,
    failed_records INTEGER DEFAULT 0,
    error_log TEXT,
    started_at TIMESTAMP,
    completed_at TIMESTAMP,
    created_by UUID NOT NULL REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Lab requests table
CREATE TABLE lab_requests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    visit_id UUID NOT NULL REFERENCES visits(id),
    patient_id UUID NOT NULL REFERENCES patients(id),
    requested_by UUID NOT NULL REFERENCES users(id),
    test_type VARCHAR(100) NOT NULL,
    test_name VARCHAR(200) NOT NULL,
    urgency VARCHAR(20) DEFAULT 'ROUTINE' CHECK (urgency IN ('ROUTINE', 'URGENT', 'STAT')),
    status VARCHAR(30) DEFAULT 'REQUESTED' CHECK (status IN ('REQUESTED', 'SAMPLE_COLLECTED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED')),
    clinical_notes TEXT,
    requested_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Lab results table
CREATE TABLE lab_results (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    lab_request_id UUID NOT NULL REFERENCES lab_requests(id),
    result_data JSONB NOT NULL, -- Flexible structure for different test types
    reference_ranges JSONB,
    abnormal_flags JSONB,
    technician_notes TEXT,
    verified_by UUID REFERENCES users(id),
    verified_at TIMESTAMP,
    reported_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for performance
CREATE INDEX idx_patients_op_number ON patients(op_number);
CREATE INDEX idx_visits_patient_id ON visits(patient_id);
CREATE INDEX idx_visits_status ON visits(status);
CREATE INDEX idx_visits_date ON visits(visit_date);
CREATE INDEX idx_inventory_batches_expiry ON inventory_batches(expiry_date);
CREATE INDEX idx_inventory_batches_item_id ON inventory_batches(inventory_item_id);
CREATE INDEX idx_invoices_patient_id ON invoices(patient_id);
CREATE INDEX idx_invoices_status ON invoices(status);
CREATE INDEX idx_payments_invoice_id ON payments(invoice_id);
CREATE INDEX idx_audit_logs_timestamp ON audit_logs(timestamp);
CREATE INDEX idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_op_number ON audit_logs(op_number);
CREATE INDEX idx_sha_claims_status ON sha_claims(status);
CREATE INDEX idx_user_sessions_user_id ON user_sessions(user_id);
CREATE INDEX idx_user_sessions_expires_at ON user_sessions(expires_at);

-- Enhanced SHA indexes for performance
CREATE INDEX idx_sha_invoices_claim ON sha_invoices(claim_id);
CREATE INDEX idx_sha_invoices_patient ON sha_invoices(patient_id);
CREATE INDEX idx_sha_invoices_number ON sha_invoices(invoice_number);
CREATE INDEX idx_sha_invoices_status ON sha_invoices(status);
CREATE INDEX idx_sha_invoices_date ON sha_invoices(invoice_date);
CREATE INDEX idx_sha_invoices_due_date ON sha_invoices(due_date);
CREATE INDEX idx_sha_invoices_sha_ref ON sha_invoices(sha_reference);
CREATE INDEX idx_sha_compliance_claim ON sha_compliance(claim_id);
CREATE INDEX idx_sha_compliance_invoice ON sha_compliance(invoice_id);
CREATE INDEX idx_sha_compliance_type ON sha_compliance(compliance_type);
CREATE INDEX idx_sha_compliance_status ON sha_compliance(status);
CREATE INDEX idx_sha_audit_claim ON sha_audit_trail(claim_id);
CREATE INDEX idx_sha_audit_invoice ON sha_audit_trail(invoice_id);
CREATE INDEX idx_sha_audit_action ON sha_audit_trail(action);
CREATE INDEX idx_sha_audit_user ON sha_audit_trail(performed_by);
CREATE INDEX idx_sha_audit_date ON sha_audit_trail(performed_at);
CREATE INDEX idx_sha_batches_number ON sha_claim_batches(batch_number);
CREATE INDEX idx_sha_batches_type ON sha_claim_batches(batch_type);
CREATE INDEX idx_sha_batches_status ON sha_claim_batches(status);
CREATE INDEX idx_sha_batches_date ON sha_claim_batches(batch_date);
CREATE INDEX idx_sha_submission_claim ON sha_submission_logs(claim_id);
CREATE INDEX idx_sha_submission_batch ON sha_submission_logs(batch_id);
CREATE INDEX idx_sha_submission_invoice ON sha_submission_logs(invoice_id);
CREATE INDEX idx_sha_submission_status ON sha_submission_logs(status);
CREATE INDEX idx_sha_submission_date ON sha_submission_logs(created_at);

-- Triggers for updated_at timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_patients_updated_at BEFORE UPDATE ON patients FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_visits_updated_at BEFORE UPDATE ON visits FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_consultations_updated_at BEFORE UPDATE ON consultations FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_prescriptions_updated_at BEFORE UPDATE ON prescriptions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_inventory_items_updated_at BEFORE UPDATE ON inventory_items FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_inventory_batches_updated_at BEFORE UPDATE ON inventory_batches FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_invoices_updated_at BEFORE UPDATE ON invoices FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_accounts_receivable_updated_at BEFORE UPDATE ON accounts_receivable FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_sha_claims_updated_at BEFORE UPDATE ON sha_claims FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_sha_invoices_updated_at BEFORE UPDATE ON sha_invoices FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_sha_compliance_updated_at BEFORE UPDATE ON sha_compliance FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_sha_claim_batches_updated_at BEFORE UPDATE ON sha_claim_batches FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_sha_submission_logs_updated_at BEFORE UPDATE ON sha_submission_logs FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_lab_requests_updated_at BEFORE UPDATE ON lab_requests FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Additional indexes for enhanced SHA tables
CREATE INDEX idx_sha_claims_beneficiary ON sha_claims(sha_beneficiary_id);
CREATE INDEX idx_sha_claims_national_id ON sha_claims(national_id);
CREATE INDEX idx_sha_claims_visit_date ON sha_claims(visit_date);
CREATE INDEX idx_sha_claims_provider_code ON sha_claims(provider_code);
CREATE INDEX idx_sha_claims_facility_level ON sha_claims(facility_level);

CREATE INDEX idx_sha_claim_items_service_date ON sha_claim_items(service_date);
CREATE INDEX idx_sha_claim_items_provided_by ON sha_claim_items(provided_by);
CREATE INDEX idx_sha_claim_items_department ON sha_claim_items(department);
CREATE INDEX idx_sha_claim_items_emergency ON sha_claim_items(is_emergency);

CREATE INDEX idx_sha_documents_claim_id ON sha_document_attachments(claim_id);
CREATE INDEX idx_sha_documents_type ON sha_document_attachments(document_type);
CREATE INDEX idx_sha_documents_uploaded_by ON sha_document_attachments(uploaded_by);
CREATE INDEX idx_sha_documents_uploaded_at ON sha_document_attachments(uploaded_at);
CREATE INDEX idx_sha_documents_required ON sha_document_attachments(is_required);

CREATE INDEX idx_patient_encounters_patient ON patient_encounters(patient_id);
CREATE INDEX idx_patient_encounters_visit ON patient_encounters(visit_id);
CREATE INDEX idx_patient_encounters_type ON patient_encounters(encounter_type);
CREATE INDEX idx_patient_encounters_status ON patient_encounters(status);
CREATE INDEX idx_patient_encounters_date ON patient_encounters(encounter_date);
CREATE INDEX idx_patient_encounters_completion ON patient_encounters(completion_date);
CREATE INDEX idx_patient_encounters_provider ON patient_encounters(primary_provider);
CREATE INDEX idx_patient_encounters_sha_eligible ON patient_encounters(sha_eligible);

CREATE INDEX idx_sha_exports_type ON sha_export_logs(export_type);
CREATE INDEX idx_sha_exports_scope ON sha_export_logs(export_scope);
CREATE INDEX idx_sha_exports_exported_by ON sha_export_logs(exported_by);
CREATE INDEX idx_sha_exports_exported_at ON sha_export_logs(exported_at);
CREATE INDEX idx_sha_exports_date_from ON sha_export_logs(date_from);
CREATE INDEX idx_sha_exports_date_to ON sha_export_logs(date_to);

-- Workflow indexes
CREATE INDEX idx_sha_workflow_instances_claim_id ON sha_workflow_instances(claim_id);
CREATE INDEX idx_sha_workflow_instances_status ON sha_workflow_instances(overall_status);
CREATE INDEX idx_sha_workflow_instances_initiated_by ON sha_workflow_instances(initiated_by);
CREATE INDEX idx_sha_workflow_instances_created_at ON sha_workflow_instances(created_at);

CREATE INDEX idx_sha_workflow_steps_workflow_id ON sha_workflow_steps(workflow_id);
CREATE INDEX idx_sha_workflow_steps_status ON sha_workflow_steps(status);
-- CREATE INDEX idx_sha_workflow_steps_assigned_to ON sha_workflow_steps(assigned_to);
CREATE INDEX idx_sha_workflow_steps_step_order ON sha_workflow_steps(step_order);

-- CREATE INDEX idx_sha_workflow_activity_workflow_id ON sha_workflow_activity_log(workflow_id);
-- CREATE INDEX idx_sha_workflow_activity_performed_by ON sha_workflow_activity_log(performed_by);
-- CREATE INDEX idx_sha_workflow_activity_performed_at ON sha_workflow_activity_log(performed_at);

-- CREATE INDEX idx_sha_payment_tracking_claim_id ON sha_payment_tracking(claim_id);
-- CREATE INDEX idx_sha_payment_tracking_status ON sha_payment_tracking(payment_status);
-- CREATE INDEX idx_sha_payment_tracking_next_check ON sha_payment_tracking(next_check_at);
-- CREATE INDEX idx_sha_payment_tracking_auto_check ON sha_payment_tracking(auto_check_enabled);

-- Triggers for new tables
CREATE TRIGGER update_sha_claim_items_updated_at BEFORE UPDATE ON sha_claim_items FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_sha_document_attachments_updated_at BEFORE UPDATE ON sha_document_attachments FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_patient_encounters_updated_at BEFORE UPDATE ON patient_encounters FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_sha_workflow_instances_updated_at BEFORE UPDATE ON sha_workflow_instances FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_sha_workflow_steps_updated_at BEFORE UPDATE ON sha_workflow_steps FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
-- CREATE TRIGGER update_sha_payment_tracking_updated_at BEFORE UPDATE ON sha_payment_tracking FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_clinical_diagnosis_codes_updated_at BEFORE UPDATE ON clinical_diagnosis_codes FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_clinical_medications_updated_at BEFORE UPDATE ON clinical_medications FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_clinical_lab_tests_updated_at BEFORE UPDATE ON clinical_lab_tests FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_clinical_procedures_updated_at BEFORE UPDATE ON clinical_procedures FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_clinical_symptoms_updated_at BEFORE UPDATE ON clinical_symptoms FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
-- CREATE TRIGGER update_user_clinical_favorites_updated_at BEFORE UPDATE ON user_clinical_favorites FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Clinical data indexes for fast autocomplete search
CREATE INDEX idx_clinical_diagnosis_codes_code ON clinical_diagnosis_codes(code);
CREATE INDEX idx_clinical_diagnosis_codes_description ON clinical_diagnosis_codes USING gin(to_tsvector('english', description));
CREATE INDEX idx_clinical_diagnosis_codes_category ON clinical_diagnosis_codes(category);
CREATE INDEX idx_clinical_diagnosis_codes_active ON clinical_diagnosis_codes(is_active);
CREATE INDEX idx_clinical_diagnosis_codes_usage ON clinical_diagnosis_codes(usage_count DESC);
CREATE INDEX idx_clinical_diagnosis_codes_keywords ON clinical_diagnosis_codes USING gin(search_keywords);

CREATE INDEX idx_clinical_medications_generic ON clinical_medications USING gin(to_tsvector('english', generic_name));
-- CREATE INDEX idx_clinical_medications_brands ON clinical_medications USING gin(brand_names);
-- CREATE INDEX idx_clinical_medications_class ON clinical_medications(drug_class);
CREATE INDEX idx_clinical_medications_active ON clinical_medications(is_active);
CREATE INDEX idx_clinical_medications_usage ON clinical_medications(usage_count DESC);
CREATE INDEX idx_clinical_medications_keywords ON clinical_medications USING gin(search_keywords);

CREATE INDEX idx_clinical_lab_tests_code ON clinical_lab_tests(test_code);
CREATE INDEX idx_clinical_lab_tests_name ON clinical_lab_tests USING gin(to_tsvector('english', test_name));
CREATE INDEX idx_clinical_lab_tests_category ON clinical_lab_tests(test_category);
CREATE INDEX idx_clinical_lab_tests_active ON clinical_lab_tests(is_active);
CREATE INDEX idx_clinical_lab_tests_usage ON clinical_lab_tests(usage_count DESC);
CREATE INDEX idx_clinical_lab_tests_keywords ON clinical_lab_tests USING gin(search_keywords);

CREATE INDEX idx_clinical_procedures_code ON clinical_procedures(procedure_code);
CREATE INDEX idx_clinical_procedures_name ON clinical_procedures USING gin(to_tsvector('english', procedure_name));
CREATE INDEX idx_clinical_procedures_category ON clinical_procedures(procedure_category);
CREATE INDEX idx_clinical_procedures_active ON clinical_procedures(is_active);
CREATE INDEX idx_clinical_procedures_usage ON clinical_procedures(usage_count DESC);
CREATE INDEX idx_clinical_procedures_keywords ON clinical_procedures USING gin(search_keywords);

CREATE INDEX idx_clinical_symptoms_name ON clinical_symptoms USING gin(to_tsvector('english', symptom_name));
-- CREATE INDEX idx_clinical_symptoms_system ON clinical_symptoms(body_system);
CREATE INDEX idx_clinical_symptoms_active ON clinical_symptoms(is_active);
CREATE INDEX idx_clinical_symptoms_usage ON clinical_symptoms(usage_count DESC);
CREATE INDEX idx_clinical_symptoms_keywords ON clinical_symptoms USING gin(search_keywords);

-- CREATE INDEX idx_user_clinical_favorites_user ON user_clinical_favorites(user_id);
-- CREATE INDEX idx_user_clinical_favorites_type ON user_clinical_favorites(item_type);
-- CREATE INDEX idx_user_clinical_favorites_usage ON user_clinical_favorites(usage_frequency DESC);
-- CREATE INDEX idx_user_clinical_favorites_last_used ON user_clinical_favorites(last_used_at DESC);

-- CREATE INDEX idx_clinical_search_analytics_user ON clinical_search_analytics(user_id);
-- CREATE INDEX idx_clinical_search_analytics_type ON clinical_search_analytics(search_type);
-- CREATE INDEX idx_clinical_search_analytics_term ON clinical_search_analytics(search_term);
-- CREATE INDEX idx_clinical_search_analytics_created ON clinical_search_analytics(created_at);
