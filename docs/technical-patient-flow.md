# Technical Patient Flow - Database & API Interactions

## Complete Technical Journey: API Calls & Database Updates

### 1. **Patient Registration** 📝
**Staff**: Receptionist  
**API Endpoint**: `POST /api/patients`  
**Database Operations**:
```sql
-- Create new patient record
INSERT INTO patients (first_name, last_name, gender, insurance_type, age, phone_number, registration_type, registered_by, registration_date)
VALUES ('John', 'Doe', 'MALE', 'CASH', 30, '+254712345678', 'NEW_PATIENT', 'user_id', NOW());

-- Create visit record
INSERT INTO visits (patient_id, op_number, chief_complaint, triage_category, payment_type, payment_reference)
VALUES ('patient_id', 'OP12345', 'Fever and headache', 'NORMAL', 'CASH', NULL);

-- Log registration action
INSERT INTO audit_logs (user_id, action, resource, resource_id, details, ip_address)
VALUES ('user_id', 'CREATE', 'PATIENT', 'patient_id', 'New patient registered', '192.168.1.100');
```

---

### 2. **Triage Assessment** 🩺
**Staff**: Triage Nurse  
**API Endpoint**: `PUT /api/visits/:id`  
**Database Operations**:
```sql
-- Update visit with triage information
UPDATE visits 
SET triage_category = 'URGENT', 
    chief_complaint = 'Severe chest pain',
    updated_at = NOW()
WHERE id = 'visit_id';

-- Create patient encounter
INSERT INTO patient_encounters (patient_id, visit_id, encounter_type, provider_id, vital_signs, notes)
VALUES ('patient_id', 'visit_id', 'TRIAGE', 'nurse_id', 
        '{"blood_pressure": "140/90", "temperature": "38.5", "pulse": "95"}', 
        'Patient appears distressed, chest pain radiating to left arm');

-- Log triage action
INSERT INTO audit_logs (user_id, action, resource, resource_id, details)
VALUES ('nurse_id', 'UPDATE', 'VISIT', 'visit_id', 'Triage assessment completed');
```

---

### 3. **Clinical Consultation** 👨‍⚕️
**Staff**: Clinical Officer  
**API Endpoints**: 
- `PUT /api/visits/:id` (update visit status)
- `POST /api/patient-encounters` (create consultation)
- `POST /api/diagnoses` (add diagnosis)
- `POST /api/prescriptions` (prescribe medication)

**Database Operations**:
```sql
-- Update visit status
UPDATE visits 
SET status = 'IN_CONSULTATION',
    updated_at = NOW()
WHERE id = 'visit_id';

-- Create consultation encounter
INSERT INTO patient_encounters (patient_id, visit_id, encounter_type, provider_id, notes, findings, recommendations)
VALUES ('patient_id', 'visit_id', 'CONSULTATION', 'clinical_officer_id',
        'Patient complains of chest pain for 2 hours, no history of cardiac issues',
        'Chest pain, elevated blood pressure, no signs of MI on examination',
        'Prescribe pain medication, monitor vitals, follow-up in 3 days');

-- Add diagnosis
INSERT INTO diagnoses (patient_id, encounter_id, diagnosis_code, diagnosis_name, status, notes)
VALUES ('patient_id', 'encounter_id', 'R06.02', 'Shortness of breath', 'ACTIVE', 'Primary diagnosis');

-- Prescribe medication
INSERT INTO prescriptions (patient_id, encounter_id, medication_name, dosage, frequency, duration, instructions)
VALUES ('patient_id', 'encounter_id', 'Paracetamol', '500mg', '3 times daily', '5 days', 'Take with food');
```

---

### 4. **Laboratory Services** 🧪
**Staff**: Lab Technician  
**API Endpoints**:
- `POST /api/lab-requests` (create lab request)
- `PUT /api/lab-requests/:id` (update with results)

**Database Operations**:
```sql
-- Create lab request
INSERT INTO lab_requests (patient_id, visit_id, requested_by, test_type, urgency, status, notes)
VALUES ('patient_id', 'visit_id', 'clinical_officer_id', 'BLOOD_TEST', 'NORMAL', 'PENDING', 'Full blood count requested');

-- Update with results
UPDATE lab_requests 
SET status = 'COMPLETED',
    results = '{"hemoglobin": "14.2", "white_blood_cells": "7500", "platelets": "250000"}',
    completed_at = NOW(),
    completed_by = 'lab_technician_id'
WHERE id = 'lab_request_id';

-- Log lab completion
INSERT INTO audit_logs (user_id, action, resource, resource_id, details)
VALUES ('lab_technician_id', 'UPDATE', 'LAB_REQUEST', 'lab_request_id', 'Lab results completed');
```

---

### 5. **Pharmacy Services** 💊
**Staff**: Pharmacist  
**API Endpoints**:
- `GET /api/prescriptions/patient/:id` (get patient prescriptions)
- `PUT /api/prescriptions/:id` (update dispensing status)

**Database Operations**:
```sql
-- Update prescription status
UPDATE prescriptions 
SET status = 'DISPENSED',
    dispensed_at = NOW(),
    dispensed_by = 'pharmacist_id',
    dispensing_notes = 'Medication dispensed with counseling provided'
WHERE id = 'prescription_id';

-- Log dispensing action
INSERT INTO audit_logs (user_id, action, resource, resource_id, details)
VALUES ('pharmacist_id', 'UPDATE', 'PRESCRIPTION', 'prescription_id', 'Medication dispensed');
```

---

### 6. **Specialized Services** 🏥

#### **A. Immunization Services** 💉
**Staff**: Immunization Nurse  
**API Endpoint**: `POST /api/immunization/patients/:id/immunizations`

**Database Operations**:
```sql
-- Record immunization
INSERT INTO patient_immunizations (patient_id, vaccine_id, immunization_date, batch_number, site, route, dosage, status, notes, administered_by)
VALUES ('patient_id', 'vaccine_id', NOW(), 'BATCH001', 'Left arm', 'IM', '0.5ml', 'COMPLETED', 'No adverse reactions', 'nurse_id');

-- Log immunization
INSERT INTO audit_logs (user_id, action, resource, resource_id, details)
VALUES ('nurse_id', 'CREATE', 'IMMUNIZATION', 'immunization_id', 'Vaccine administered');
```

#### **B. Family Planning Services** 👨‍👩‍👧‍👦
**Staff**: Family Planning Counselor  
**API Endpoint**: `POST /api/family-planning/patients/:id/records`

**Database Operations**:
```sql
-- Create family planning record
INSERT INTO patient_family_planning (patient_id, method_id, start_date, counseling_provided, counseling_notes, status, notes, provider_id)
VALUES ('patient_id', 'method_id', NOW(), true, 'Comprehensive counseling provided on all methods', 'ACTIVE', 'Patient chose oral contraceptives', 'counselor_id');

-- Log family planning service
INSERT INTO audit_logs (user_id, action, resource, resource_id, details)
VALUES ('counselor_id', 'CREATE', 'FAMILY_PLANNING', 'record_id', 'Family planning service provided');
```

#### **C. MCH Services** 🤱
**Staff**: MCH Nurse  
**API Endpoint**: `POST /api/mch-services/patients/:id/services`

**Database Operations**:
```sql
-- Create MCH service record
INSERT INTO patient_mch_services (patient_id, service_id, service_date, service_details, findings, recommendations, status, notes, provider_id)
VALUES ('patient_id', 'service_id', NOW(), 
        '{"duration_minutes": 30, "weight": 65.5, "blood_pressure": "120/80"}',
        'Patient is healthy, normal weight gain',
        'Continue regular checkups, maintain healthy diet',
        'COMPLETED', 'Routine antenatal care', 'mch_nurse_id');

-- Log MCH service
INSERT INTO audit_logs (user_id, action, resource, resource_id, details)
VALUES ('mch_nurse_id', 'CREATE', 'MCH_SERVICE', 'service_record_id', 'MCH service provided');
```

---

### 7. **Payment Processing** 💰
**Staff**: Cashier/Billing Clerk  
**API Endpoints**:
- `POST /api/payments` (process payment)
- `POST /api/sha-invoices` (if SHA payment)

**Database Operations**:
```sql
-- Process payment
INSERT INTO payments (visit_id, amount, payment_type, payment_reference, status, processed_by, processed_at)
VALUES ('visit_id', 500.00, 'CASH', NULL, 'COMPLETED', 'cashier_id', NOW());

-- Update visit payment status
UPDATE visits 
SET payment_status = 'PAID',
    total_amount = 500.00,
    updated_at = NOW()
WHERE id = 'visit_id';

-- If SHA payment, create SHA invoice
INSERT INTO sha_invoices (visit_id, patient_id, invoice_number, sha_number, client_number, service_given, amount_charged, diagnosis, status, created_by)
VALUES ('visit_id', 'patient_id', 'INV001', 'SHA123456', 'OP12345', 'Consultation and medication', 500.00, 'Upper respiratory infection', 'PENDING', 'cashier_id');

-- Log payment
INSERT INTO audit_logs (user_id, action, resource, resource_id, details)
VALUES ('cashier_id', 'CREATE', 'PAYMENT', 'payment_id', 'Payment processed');
```

---

### 8. **Discharge & Follow-up** 📋
**Staff**: Clinical Officer  
**API Endpoint**: `PUT /api/visits/:id`

**Database Operations**:
```sql
-- Complete visit
UPDATE visits 
SET status = 'COMPLETED',
    discharge_notes = 'Patient stable, medication prescribed, follow-up in 3 days',
    completed_at = NOW(),
    updated_at = NOW()
WHERE id = 'visit_id';

-- Schedule follow-up appointment
INSERT INTO appointments (patient_id, appointment_date, appointment_type, provider_id, notes, status, created_by)
VALUES ('patient_id', NOW() + INTERVAL '3 days', 'FOLLOW_UP', 'clinical_officer_id', 'Follow-up for chest pain', 'SCHEDULED', 'clinical_officer_id');

-- Log discharge
INSERT INTO audit_logs (user_id, action, resource, resource_id, details)
VALUES ('clinical_officer_id', 'UPDATE', 'VISIT', 'visit_id', 'Patient discharged');
```

---

## Real-Time Synchronization Events

### **WebSocket Events Broadcasted**:
```javascript
// Patient registration
socket.emit('patient:registered', {
  patientId: 'patient_id',
  opNumber: 'OP12345',
  timestamp: new Date()
});

// Visit status change
socket.emit('visit:status_changed', {
  visitId: 'visit_id',
  status: 'IN_CONSULTATION',
  updatedBy: 'clinical_officer_id'
});

// Lab results available
socket.emit('lab:results_ready', {
  patientId: 'patient_id',
  labRequestId: 'lab_request_id',
  results: labResults
});

// Prescription ready
socket.emit('prescription:ready', {
  patientId: 'patient_id',
  prescriptionId: 'prescription_id'
});
```

---

## System Integration Points

### **External System Integrations**:
1. **SHA Portal**: Submit claims and invoices
2. **NHIF System**: Verify coverage and submit claims
3. **Insurance APIs**: Verify coverage and submit claims
4. **SMS Gateway**: Send appointment reminders
5. **Email Service**: Send lab results and reports

### **Data Flow Summary**:
```
Patient Registration → Triage → Consultation → Lab/Pharmacy → Specialized Services → Payment → Discharge
        ↓              ↓           ↓              ↓                ↓              ↓         ↓
    Database        Database   Database      Database         Database      Database   Database
    Updates         Updates    Updates       Updates          Updates       Updates    Updates
        ↓              ↓           ↓              ↓                ↓              ↓         ↓
    WebSocket      WebSocket  WebSocket     WebSocket        WebSocket      WebSocket  WebSocket
    Events         Events     Events        Events           Events         Events     Events
        ↓              ↓           ↓              ↓                ↓              ↓         ↓
    Real-time      Real-time  Real-time     Real-time        Real-time      Real-time  Real-time
    Updates        Updates    Updates       Updates          Updates        Updates    Updates
```

This technical flow ensures data integrity, real-time collaboration, and comprehensive audit trails throughout the patient's journey in the clinic system.
