-- Migration: Add Dynamic Payment Types and Health Services
-- Date: 2025-01-08
-- Description: Add support for dynamic payment types per visit and health services (immunization, family planning, MCH)

-- =============================================================================
-- 1. DYNAMIC PAYMENT TYPES PER VISIT
-- =============================================================================

-- Add payment_type to visits table (overrides patient's default insurance_type)
ALTER TABLE visits ADD COLUMN payment_type VARCHAR(20) CHECK (payment_type IN ('SHA', 'PRIVATE', 'CASH', 'NHIF', 'OTHER'));
ALTER TABLE visits ADD COLUMN payment_reference VARCHAR(100); -- For insurance numbers, NHIF numbers, etc.

-- Add payment_type to patient_encounters table
ALTER TABLE patient_encounters ADD COLUMN payment_type VARCHAR(20) CHECK (payment_type IN ('SHA', 'PRIVATE', 'CASH', 'NHIF', 'OTHER'));
ALTER TABLE patient_encounters ADD COLUMN payment_reference VARCHAR(100);

-- =============================================================================
-- 2. SERVICE CATEGORIES
-- =============================================================================

-- Create service_categories table
CREATE TABLE service_categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insert default service categories
INSERT INTO service_categories (name, description) VALUES
('GENERAL_CONSULTATION', 'General medical consultation services'),
('IMMUNIZATION', 'Child and adult immunization services'),
('FAMILY_PLANNING', 'Family planning and contraceptive services'),
('MCH_SERVICES', 'Maternal and Child Health services'),
('LABORATORY', 'Laboratory and diagnostic services'),
('PHARMACY', 'Pharmacy and medication services'),
('EMERGENCY', 'Emergency medical services'),
('SPECIALIST', 'Specialist consultation services');

-- =============================================================================
-- 3. IMMUNIZATION SYSTEM
-- =============================================================================

-- Create immunization_schedules table
CREATE TABLE immunization_schedules (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL,
    description TEXT,
    age_group VARCHAR(50), -- e.g., '0-2 months', '2-4 months', etc.
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create immunization_vaccines table
CREATE TABLE immunization_vaccines (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL,
    vaccine_code VARCHAR(20) UNIQUE NOT NULL,
    description TEXT,
    manufacturer VARCHAR(100),
    dosage VARCHAR(50),
    route VARCHAR(50), -- e.g., 'IM', 'SC', 'Oral'
    storage_requirements TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create immunization_schedule_vaccines table (many-to-many)
CREATE TABLE immunization_schedule_vaccines (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    schedule_id UUID NOT NULL REFERENCES immunization_schedules(id) ON DELETE CASCADE,
    vaccine_id UUID NOT NULL REFERENCES immunization_vaccines(id) ON DELETE CASCADE,
    recommended_age_days INTEGER NOT NULL, -- Age in days when vaccine should be given
    is_required BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(schedule_id, vaccine_id)
);

-- Create patient_immunizations table
CREATE TABLE patient_immunizations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
    visit_id UUID REFERENCES visits(id),
    vaccine_id UUID NOT NULL REFERENCES immunization_vaccines(id),
    immunization_date DATE NOT NULL DEFAULT CURRENT_DATE,
    age_at_immunization_days INTEGER, -- Patient's age in days when vaccinated
    batch_number VARCHAR(50),
    expiry_date DATE,
    administered_by UUID NOT NULL REFERENCES users(id),
    site VARCHAR(50), -- e.g., 'Left arm', 'Right thigh'
    route VARCHAR(50), -- e.g., 'IM', 'SC', 'Oral'
    dosage VARCHAR(50),
    adverse_reactions TEXT,
    next_due_date DATE,
    status VARCHAR(20) DEFAULT 'COMPLETED' CHECK (status IN ('SCHEDULED', 'COMPLETED', 'MISSED', 'CONTRAINDICATED')),
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =============================================================================
-- 4. FAMILY PLANNING SYSTEM
-- =============================================================================

-- Create family_planning_methods table
CREATE TABLE family_planning_methods (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL,
    method_code VARCHAR(20) UNIQUE NOT NULL,
    category VARCHAR(50) NOT NULL, -- e.g., 'HORMONAL', 'BARRIER', 'IUD', 'STERILIZATION', 'NATURAL'
    description TEXT,
    effectiveness_rate DECIMAL(5,2), -- Effectiveness percentage
    duration_months INTEGER, -- How long the method lasts
    side_effects TEXT,
    contraindications TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create patient_family_planning table
CREATE TABLE patient_family_planning (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
    visit_id UUID REFERENCES visits(id),
    method_id UUID NOT NULL REFERENCES family_planning_methods(id),
    start_date DATE NOT NULL DEFAULT CURRENT_DATE,
    end_date DATE,
    provider_id UUID NOT NULL REFERENCES users(id),
    counseling_provided BOOLEAN DEFAULT false,
    counseling_notes TEXT,
    side_effects_experienced TEXT,
    satisfaction_rating INTEGER CHECK (satisfaction_rating >= 1 AND satisfaction_rating <= 5),
    follow_up_date DATE,
    status VARCHAR(20) DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'DISCONTINUED', 'COMPLETED', 'SWITCHED')),
    discontinuation_reason TEXT,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =============================================================================
-- 5. MCH (MATERNAL AND CHILD HEALTH) SERVICES
-- =============================================================================

-- Create mch_services table
CREATE TABLE mch_services (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL,
    service_code VARCHAR(20) UNIQUE NOT NULL,
    category VARCHAR(50) NOT NULL, -- e.g., 'ANTENATAL', 'POSTNATAL', 'CHILD_HEALTH', 'NUTRITION'
    description TEXT,
    target_population VARCHAR(100), -- e.g., 'Pregnant women', 'Children under 5', 'Lactating mothers'
    frequency VARCHAR(50), -- e.g., 'Monthly', 'Every 3 months', 'As needed'
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create patient_mch_services table
CREATE TABLE patient_mch_services (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
    visit_id UUID REFERENCES visits(id),
    service_id UUID NOT NULL REFERENCES mch_services(id),
    service_date DATE NOT NULL DEFAULT CURRENT_DATE,
    provider_id UUID NOT NULL REFERENCES users(id),
    service_details JSONB, -- Flexible storage for service-specific data
    findings TEXT,
    recommendations TEXT,
    next_appointment_date DATE,
    status VARCHAR(20) DEFAULT 'COMPLETED' CHECK (status IN ('SCHEDULED', 'COMPLETED', 'CANCELLED', 'NO_SHOW')),
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =============================================================================
-- 6. UPDATE SERVICES TABLE TO INCLUDE CATEGORIES
-- =============================================================================

-- Add category_id to services table if it doesn't exist
ALTER TABLE services ADD COLUMN IF NOT EXISTS category_id UUID REFERENCES service_categories(id);
ALTER TABLE services ADD COLUMN IF NOT EXISTS service_type VARCHAR(50) DEFAULT 'GENERAL';

-- =============================================================================
-- 7. INSERT DEFAULT DATA
-- =============================================================================

-- Insert default immunization schedules
INSERT INTO immunization_schedules (name, description, age_group) VALUES
('BCG Schedule', 'Bacillus Calmette-Guérin vaccination schedule', 'At birth'),
('DPT Schedule', 'Diphtheria, Pertussis, Tetanus vaccination schedule', '6 weeks - 18 months'),
('Polio Schedule', 'Polio vaccination schedule', '6 weeks - 18 months'),
('Measles Schedule', 'Measles vaccination schedule', '9-15 months'),
('Hepatitis B Schedule', 'Hepatitis B vaccination schedule', 'At birth - 6 months');

-- Insert default vaccines
INSERT INTO immunization_vaccines (name, vaccine_code, description, manufacturer, dosage, route) VALUES
('BCG', 'BCG', 'Bacillus Calmette-Guérin', 'Various', '0.05ml', 'ID'),
('DPT', 'DPT', 'Diphtheria, Pertussis, Tetanus', 'Various', '0.5ml', 'IM'),
('Polio', 'OPV', 'Oral Polio Vaccine', 'Various', '2 drops', 'Oral'),
('Measles', 'MR', 'Measles-Rubella', 'Various', '0.5ml', 'SC'),
('Hepatitis B', 'HBV', 'Hepatitis B Vaccine', 'Various', '0.5ml', 'IM'),
('Pentavalent', 'PENTA', 'DPT + Hepatitis B + Hib', 'Various', '0.5ml', 'IM');

-- Insert default family planning methods
INSERT INTO family_planning_methods (name, method_code, category, description, effectiveness_rate, duration_months) VALUES
('Combined Oral Contraceptive', 'COC', 'HORMONAL', 'Daily pill containing estrogen and progestin', 99.7, 1),
('Progestin-Only Pill', 'POP', 'HORMONAL', 'Daily pill containing only progestin', 99.5, 1),
('Injectable Contraceptive', 'DMPA', 'HORMONAL', 'Depot medroxyprogesterone acetate injection', 99.7, 3),
('Implant', 'IMPLANT', 'HORMONAL', 'Subdermal contraceptive implant', 99.9, 36),
('IUD Copper', 'IUD_CU', 'IUD', 'Intrauterine device with copper', 99.2, 120),
('IUD Hormonal', 'IUD_H', 'IUD', 'Intrauterine device with hormones', 99.8, 60),
('Male Condom', 'CONDOM_M', 'BARRIER', 'Male latex or polyurethane condom', 98.0, 0),
('Female Condom', 'CONDOM_F', 'BARRIER', 'Female polyurethane condom', 95.0, 0),
('Natural Family Planning', 'NFP', 'NATURAL', 'Fertility awareness-based methods', 76.0, 0);

-- Insert default MCH services
INSERT INTO mch_services (name, service_code, category, description, target_population, frequency) VALUES
('Antenatal Care', 'ANC', 'ANTENATAL', 'Prenatal care and monitoring', 'Pregnant women', 'Monthly'),
('Postnatal Care', 'PNC', 'POSTNATAL', 'Post-delivery care and monitoring', 'Postpartum women', 'Weekly'),
('Child Health Check', 'CHC', 'CHILD_HEALTH', 'Regular health monitoring for children', 'Children under 5', 'Monthly'),
('Growth Monitoring', 'GM', 'CHILD_HEALTH', 'Weight and height monitoring', 'Children under 5', 'Monthly'),
('Nutrition Counseling', 'NC', 'NUTRITION', 'Nutritional guidance and support', 'Pregnant women and children', 'As needed'),
('Breastfeeding Support', 'BFS', 'NUTRITION', 'Lactation support and counseling', 'Lactating mothers', 'As needed'),
('Family Planning Counseling', 'FPC', 'FAMILY_PLANNING', 'Contraceptive counseling and education', 'Women of reproductive age', 'As needed');

-- =============================================================================
-- 8. CREATE INDEXES
-- =============================================================================

-- Indexes for performance
CREATE INDEX idx_visits_payment_type ON visits(payment_type);
CREATE INDEX idx_patient_encounters_payment_type ON patient_encounters(payment_type);
CREATE INDEX idx_patient_immunizations_patient_id ON patient_immunizations(patient_id);
CREATE INDEX idx_patient_immunizations_vaccine_id ON patient_immunizations(vaccine_id);
CREATE INDEX idx_patient_immunizations_date ON patient_immunizations(immunization_date);
CREATE INDEX idx_patient_family_planning_patient_id ON patient_family_planning(patient_id);
CREATE INDEX idx_patient_family_planning_method_id ON patient_family_planning(method_id);
CREATE INDEX idx_patient_family_planning_status ON patient_family_planning(status);
CREATE INDEX idx_patient_mch_services_patient_id ON patient_mch_services(patient_id);
CREATE INDEX idx_patient_mch_services_service_id ON patient_mch_services(service_id);
CREATE INDEX idx_patient_mch_services_date ON patient_mch_services(service_date);

-- =============================================================================
-- 9. CREATE TRIGGERS
-- =============================================================================

-- Triggers for updated_at columns
CREATE TRIGGER update_service_categories_updated_at BEFORE UPDATE ON service_categories FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_immunization_schedules_updated_at BEFORE UPDATE ON immunization_schedules FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_immunization_vaccines_updated_at BEFORE UPDATE ON immunization_vaccines FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_patient_immunizations_updated_at BEFORE UPDATE ON patient_immunizations FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_family_planning_methods_updated_at BEFORE UPDATE ON family_planning_methods FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_patient_family_planning_updated_at BEFORE UPDATE ON patient_family_planning FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_mch_services_updated_at BEFORE UPDATE ON mch_services FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_patient_mch_services_updated_at BEFORE UPDATE ON patient_mch_services FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
