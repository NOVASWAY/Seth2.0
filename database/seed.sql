-- Seed data for Seth Medical Clinic

-- Insert default admin user (password: admin123)
INSERT INTO users (id, username, email, password_hash, role, is_active) VALUES 
('550e8400-e29b-41d4-a716-446655440000', 'admin', 'admin@sethclinic.com', '$2b$12$LQv3c1yqBwEHxv03kpDOCOYMvnK5UrDD.VGoj0x9Z.aO0LE5.dKK6', 'ADMIN', true);

-- Insert sample users for different roles
INSERT INTO users (username, password_hash, role, is_active) VALUES 
('receptionist1', '$2b$12$LQv3c1yqBwEHxv03kpDOCOYMvnK5UrDD.VGoj0x9Z.aO0LE5.dKK6', 'RECEPTIONIST', true),
('nurse1', '$2b$12$LQv3c1yqBwEHxv03kpDOCOYMvnK5UrDD.VGoj0x9Z.aO0LE5.dKK6', 'NURSE', true),
('clinicalofficer1', '$2b$12$LQv3c1yqBwEHxv03kpDOCOYMvnK5UrDD.VGoj0x9Z.aO0LE5.dKK6', 'CLINICAL_OFFICER', true),
('pharmacist1', '$2b$12$LQv3c1yqBwEHxv03kpDOCOYMvnK5UrDD.VGoj0x9Z.aO0LE5.dKK6', 'PHARMACIST', true),
('inventory1', '$2b$12$LQv3c1yqBwEHxv03kpDOCOYMvnK5UrDD.VGoj0x9Z.aO0LE5.dKK6', 'INVENTORY_MANAGER', true),
('claims1', '$2b$12$LQv3c1yqBwEHxv03kpDOCOYMvnK5UrDD.VGoj0x9Z.aO0LE5.dKK6', 'CLAIMS_MANAGER', true);

-- Insert sample inventory items
INSERT INTO inventory_items (name, generic_name, category, unit, reorder_level, max_level) VALUES 
('Paracetamol 500mg', 'Paracetamol', 'Analgesics', 'Tablets', 100, 1000),
('Amoxicillin 250mg', 'Amoxicillin', 'Antibiotics', 'Capsules', 50, 500),
('ORS Sachets', 'Oral Rehydration Salts', 'Electrolytes', 'Sachets', 20, 200),
('Ibuprofen 400mg', 'Ibuprofen', 'NSAIDs', 'Tablets', 50, 500),
('Metformin 500mg', 'Metformin', 'Antidiabetics', 'Tablets', 100, 1000),
('Amlodipine 5mg', 'Amlodipine', 'Antihypertensives', 'Tablets', 50, 500),
('Omeprazole 20mg', 'Omeprazole', 'Proton Pump Inhibitors', 'Capsules', 30, 300),
('Salbutamol Inhaler', 'Salbutamol', 'Bronchodilators', 'Inhalers', 10, 100);

-- Insert sample inventory batches
INSERT INTO inventory_batches (inventory_item_id, batch_number, quantity, original_quantity, unit_cost, selling_price, expiry_date, supplier_name, received_by) 
SELECT 
    i.id,
    'BATCH-' || LPAD((ROW_NUMBER() OVER())::text, 4, '0'),
    500,
    500,
    CASE 
        WHEN i.name LIKE '%Paracetamol%' THEN 2.50
        WHEN i.name LIKE '%Amoxicillin%' THEN 15.00
        WHEN i.name LIKE '%ORS%' THEN 5.00
        WHEN i.name LIKE '%Ibuprofen%' THEN 8.00
        WHEN i.name LIKE '%Metformin%' THEN 12.00
        WHEN i.name LIKE '%Amlodipine%' THEN 18.00
        WHEN i.name LIKE '%Omeprazole%' THEN 25.00
        WHEN i.name LIKE '%Salbutamol%' THEN 150.00
        ELSE 10.00
    END,
    CASE 
        WHEN i.name LIKE '%Paracetamol%' THEN 5.00
        WHEN i.name LIKE '%Amoxicillin%' THEN 25.00
        WHEN i.name LIKE '%ORS%' THEN 10.00
        WHEN i.name LIKE '%Ibuprofen%' THEN 15.00
        WHEN i.name LIKE '%Metformin%' THEN 20.00
        WHEN i.name LIKE '%Amlodipine%' THEN 30.00
        WHEN i.name LIKE '%Omeprazole%' THEN 40.00
        WHEN i.name LIKE '%Salbutamol%' THEN 250.00
        ELSE 20.00
    END,
    CURRENT_DATE + INTERVAL '2 years',
    'Kenya Medical Supplies',
    (SELECT id FROM users WHERE role = 'INVENTORY_MANAGER' LIMIT 1)
FROM inventory_items i;

-- Insert sample patients
INSERT INTO patients (op_number, first_name, last_name, date_of_birth, age, gender, phone_number, area, insurance_type, insurance_number) VALUES 
('OP-2024-001', 'John', 'Doe', '1985-05-15', 39, 'MALE', '+254712345678', 'Nairobi', 'SHA', 'SHA123456789'),
('OP-2024-002', 'Jane', 'Smith', '1990-08-22', 34, 'FEMALE', '+254723456789', 'Kiambu', 'PRIVATE', 'PVT987654321'),
('OP-2024-003', 'Peter', 'Mwangi', '1978-12-10', 45, 'MALE', '+254734567890', 'Thika', 'CASH', NULL),
('OP-2024-004', 'Mary', 'Wanjiku', '1995-03-18', 29, 'FEMALE', '+254745678901', 'Ruiru', 'SHA', 'SHA456789123'),
('OP-2024-005', 'David', 'Kimani', '1982-07-25', 42, 'MALE', '+254756789012', 'Kikuyu', 'CASH', NULL);

-- Insert sample visits for today
INSERT INTO visits (patient_id, op_number, visit_date, status, chief_complaint, triage_category) 
SELECT 
    p.id,
    p.op_number,
    CURRENT_DATE,
    'REGISTERED',
    CASE 
        WHEN p.op_number = 'OP-2024-001' THEN 'Headache and fever'
        WHEN p.op_number = 'OP-2024-002' THEN 'Cough and chest pain'
        WHEN p.op_number = 'OP-2024-003' THEN 'Stomach pain'
        WHEN p.op_number = 'OP-2024-004' THEN 'High blood pressure check'
        WHEN p.op_number = 'OP-2024-005' THEN 'Diabetes follow-up'
        ELSE 'General consultation'
    END,
    CASE 
        WHEN p.op_number IN ('OP-2024-001', 'OP-2024-002') THEN 'URGENT'
        ELSE 'NORMAL'
    END
FROM patients p;
