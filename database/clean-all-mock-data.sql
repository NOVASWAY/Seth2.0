-- Clean all mock data from the database
-- This script removes all sample/test data while preserving the admin user

-- Delete sample patients (keep the table structure)
DELETE FROM patients WHERE op_number LIKE 'OP-2024-%' OR op_number LIKE 'OP-2023-%';

-- Delete sample visits
DELETE FROM visits WHERE patient_id IN (
  SELECT id FROM patients WHERE op_number LIKE 'OP-2024-%' OR op_number LIKE 'OP-2023-%'
);

-- Delete sample inventory batches
DELETE FROM inventory_batches WHERE inventory_item_id IN (
  SELECT id FROM inventory_items WHERE name IN (
    'Paracetamol 500mg',
    'Amoxicillin 250mg', 
    'ORS Sachets',
    'Ibuprofen 400mg',
    'Metformin 500mg',
    'Amlodipine 5mg',
    'Omeprazole 20mg',
    'Salbutamol Inhaler'
  )
);

-- Delete sample inventory items
DELETE FROM inventory_items WHERE name IN (
  'Paracetamol 500mg',
  'Amoxicillin 250mg',
  'ORS Sachets', 
  'Ibuprofen 400mg',
  'Metformin 500mg',
  'Amlodipine 5mg',
  'Omeprazole 20mg',
  'Salbutamol Inhaler'
);

-- Delete sample users (except admin)
DELETE FROM users WHERE username IN (
  'receptionist1',
  'nurse1', 
  'clinicalofficer1',
  'pharmacist1',
  'inventory1',
  'claims1',
  'reception.mary',
  'nurse.jones',
  'pharmacist.david',
  'inventory.jane'
);

-- Clean up any other sample data
DELETE FROM prescriptions WHERE patient_id IN (
  SELECT id FROM patients WHERE op_number LIKE 'OP-2024-%' OR op_number LIKE 'OP-2023-%'
);

DELETE FROM invoices WHERE patient_id IN (
  SELECT id FROM patients WHERE op_number LIKE 'OP-2024-%' OR op_number LIKE 'OP-2023-%'
);

DELETE FROM payments WHERE invoice_id IN (
  SELECT id FROM invoices WHERE patient_id IN (
    SELECT id FROM patients WHERE op_number LIKE 'OP-2024-%' OR op_number LIKE 'OP-2023-%'
  )
);

-- Clean up any sample data from other tables
DELETE FROM consultations WHERE patient_id IN (
  SELECT id FROM patients WHERE op_number LIKE 'OP-2024-%' OR op_number LIKE 'OP-2023-%'
);

DELETE FROM vitals WHERE visit_id IN (
  SELECT id FROM visits WHERE patient_id IN (
    SELECT id FROM patients WHERE op_number LIKE 'OP-2024-%' OR op_number LIKE 'OP-2023-%'
  )
);

-- Show remaining data counts
SELECT 
  'users' as table_name, COUNT(*) as count FROM users
UNION ALL
SELECT 
  'patients' as table_name, COUNT(*) as count FROM patients  
UNION ALL
SELECT 
  'inventory_items' as table_name, COUNT(*) as count FROM inventory_items
UNION ALL
SELECT 
  'visits' as table_name, COUNT(*) as count FROM visits;
