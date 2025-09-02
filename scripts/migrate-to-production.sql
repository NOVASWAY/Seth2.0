-- =============================================================================
-- Seth Medical Clinic CMS - Production Data Migration Script
-- =============================================================================
-- This script helps you migrate from test data to real production data
-- Run this after setting up your production environment
-- =============================================================================

-- Step 1: Clear test data (keep structure)
-- =============================================================================

-- Clear test users (keep admin for now)
DELETE FROM users WHERE username IN (
    'receptionist1', 'nurse1', 'clinicalofficer1', 
    'pharmacist1', 'inventory1', 'claims1'
);

-- Clear test patients
DELETE FROM patients WHERE op_number LIKE 'OP-2024-%';

-- Clear test inventory items
DELETE FROM inventory_items WHERE name LIKE '%Test%';

-- Clear test prescriptions
DELETE FROM prescriptions WHERE notes LIKE '%test%';

-- Clear test visits
DELETE FROM visits WHERE patient_id NOT IN (SELECT id FROM patients);

-- Clear test lab tests
DELETE FROM lab_tests WHERE notes LIKE '%test%';

-- Clear test invoices
DELETE FROM invoices WHERE notes LIKE '%test%';

-- =============================================================================
-- Step 2: Create real clinic staff accounts
-- =============================================================================

-- Insert real clinic staff (UPDATE THESE WITH REAL NAMES AND EMAILS)
INSERT INTO users (username, email, password_hash, role, is_active, first_name, last_name) VALUES 
-- Replace these with actual clinic staff information
('dr.smith', 'dr.smith@yourclinic.com', '$2b$12$uU4Nw8bKO4xCTiKft2lEjeoYlRTFdypvUlYAPrkrFfB5LV/PnYHiK', 'CLINICAL_OFFICER', true, 'Dr. John', 'Smith'),
('nurse.jones', 'nurse.jones@yourclinic.com', '$2b$12$uU4Nw8bKO4xCTiKft2lEjeoYlRTFdypvUlYAPrkrFfB5LV/PnYHiK', 'NURSE', true, 'Nurse Sarah', 'Jones'),
('reception.mary', 'reception.mary@yourclinic.com', '$2b$12$uU4Nw8bKO4xCTiKft2lEjeoYlRTFdypvUlYAPrkrFfB5LV/PnYHiK', 'RECEPTIONIST', true, 'Mary', 'Johnson'),
('pharmacist.david', 'pharmacist.david@yourclinic.com', '$2b$12$uU4Nw8bKO4xCTiKft2lEjeoYlRTFdypvUlYAPrkrFfB5LV/PnYHiK', 'PHARMACIST', true, 'David', 'Wilson'),
('inventory.jane', 'inventory.jane@yourclinic.com', '$2b$12$uU4Nw8bKO4xCTiKft2lEjeoYlRTFdypvUlYAPrkrFfB5LV/PnYHiK', 'INVENTORY_MANAGER', true, 'Jane', 'Brown');

-- =============================================================================
-- Step 3: Insert real inventory items
-- =============================================================================

-- Insert real medicines (UPDATE THESE WITH ACTUAL INVENTORY)
INSERT INTO inventory_items (name, generic_name, category, unit, reorder_level, max_level, description) VALUES 
-- Common medicines - update with your actual inventory
('Paracetamol 500mg', 'Paracetamol', 'Analgesics', 'Tablets', 100, 1000, 'Pain relief and fever reduction'),
('Amoxicillin 250mg', 'Amoxicillin', 'Antibiotics', 'Capsules', 50, 500, 'Broad-spectrum antibiotic'),
('Ibuprofen 400mg', 'Ibuprofen', 'NSAIDs', 'Tablets', 50, 500, 'Anti-inflammatory pain relief'),
('Metformin 500mg', 'Metformin', 'Antidiabetics', 'Tablets', 100, 1000, 'Diabetes management'),
('Amlodipine 5mg', 'Amlodipine', 'Antihypertensives', 'Tablets', 50, 500, 'Blood pressure control'),
('Omeprazole 20mg', 'Omeprazole', 'Proton Pump Inhibitors', 'Capsules', 30, 300, 'Acid reflux treatment'),
('Salbutamol Inhaler', 'Salbutamol', 'Bronchodilators', 'Inhalers', 10, 100, 'Asthma relief'),
('ORS Sachets', 'Oral Rehydration Salts', 'Electrolytes', 'Sachets', 20, 200, 'Dehydration treatment');

-- =============================================================================
-- Step 4: Create inventory batches for real stock
-- =============================================================================

-- Insert real inventory batches (UPDATE WITH ACTUAL STOCK LEVELS)
INSERT INTO inventory_batches (inventory_item_id, batch_number, quantity, original_quantity, unit_cost, selling_price, expiry_date, supplier_name, received_by) 
SELECT 
    i.id,
    'BATCH-' || LPAD((ROW_NUMBER() OVER())::text, 4, '0'),
    500, -- Update with actual stock levels
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
    CURRENT_DATE + INTERVAL '2 years', -- Update with actual expiry dates
    'Your Supplier Name', -- Update with actual supplier
    (SELECT id FROM users WHERE role = 'INVENTORY_MANAGER' LIMIT 1)
FROM inventory_items i;

-- =============================================================================
-- Step 5: Update admin user with real information
-- =============================================================================

-- Update admin user with real clinic information
UPDATE users SET 
    email = 'admin@yourclinic.com',
    first_name = 'Clinic',
    last_name = 'Administrator'
WHERE username = 'admin';

-- =============================================================================
-- Step 6: Create clinic configuration
-- =============================================================================

-- Insert clinic configuration (UPDATE WITH REAL CLINIC INFO)
INSERT INTO clinic_config (clinic_name, address, phone, email, license_number, operating_hours) VALUES 
('Your Clinic Name', 'Your Clinic Address', '+254700000000', 'info@yourclinic.com', 'CLINIC001', 'Mon-Fri: 8AM-6PM, Sat: 9AM-1PM');

-- =============================================================================
-- Step 7: Set up insurance providers
-- =============================================================================

-- Insert insurance providers (UPDATE WITH REAL PROVIDERS)
INSERT INTO insurance_providers (name, code, api_url, api_key, is_active) VALUES 
('SHA Insurance', 'SHA', 'https://api.sha.go.ke', 'YOUR_SHA_API_KEY', true),
('Private Insurance', 'PRIVATE', 'https://api.private.com', 'YOUR_PRIVATE_API_KEY', true);

-- =============================================================================
-- Step 8: Create lab test catalog
-- =============================================================================

-- Insert lab tests (UPDATE WITH ACTUAL TESTS OFFERED)
INSERT INTO lab_tests (name, category, price, turnaround_time, is_active) VALUES 
('Complete Blood Count (CBC)', 'Hematology', 1500.00, '24 hours', true),
('Blood Glucose (FBS)', 'Biochemistry', 800.00, '4 hours', true),
('Malaria Test (RDT)', 'Microbiology', 500.00, '30 minutes', true),
('HIV Test', 'Serology', 1000.00, '24 hours', true),
('Pregnancy Test', 'Serology', 300.00, '30 minutes', true),
('Urinalysis', 'Urine Analysis', 600.00, '2 hours', true);

-- =============================================================================
-- Step 9: Set up payment methods
-- =============================================================================

-- Insert payment methods
INSERT INTO payment_methods (name, code, is_active, requires_verification) VALUES 
('Cash', 'CASH', true, false),
('M-Pesa', 'MPESA', true, true),
('Bank Transfer', 'BANK', true, true),
('Insurance', 'INSURANCE', true, true);

-- =============================================================================
-- Step 10: Create audit trail
-- =============================================================================

-- Insert initial audit entry
INSERT INTO audit_logs (action, table_name, record_id, user_id, old_values, new_values, ip_address) VALUES 
('MIGRATION', 'SYSTEM', NULL, (SELECT id FROM users WHERE username = 'admin'), 
 '{"message": "Production migration started"}', 
 '{"message": "Production migration completed"}', 
 '127.0.0.1');

-- =============================================================================
-- Migration Complete
-- =============================================================================

-- Verify migration
SELECT 
    'Users' as table_name, COUNT(*) as count FROM users
UNION ALL
SELECT 'Inventory Items', COUNT(*) FROM inventory_items
UNION ALL
SELECT 'Lab Tests', COUNT(*) FROM lab_tests
UNION ALL
SELECT 'Insurance Providers', COUNT(*) FROM insurance_providers
UNION ALL
SELECT 'Payment Methods', COUNT(*) FROM payment_methods;

-- Display next steps
\echo ''
\echo '============================================================================='
\echo 'PRODUCTION MIGRATION COMPLETE!'
\echo '============================================================================='
\echo ''
\echo 'Next Steps:'
\echo '1. Update clinic staff information with real names and emails'
\echo '2. Import actual patient data from your existing system'
\echo '3. Update inventory with real stock levels and suppliers'
\echo '4. Configure real insurance provider API credentials'
\echo '5. Set up M-Pesa production credentials'
\echo '6. Test all systems with real data'
\echo '7. Train staff on the new system'
\echo '8. Go live!'
\echo ''
\echo 'Remember to:'
\echo '- Change default passwords for all users'
\echo '- Set up automated backups'
\echo '- Configure monitoring and alerting'
\echo '- Test disaster recovery procedures'
\echo '============================================================================='
