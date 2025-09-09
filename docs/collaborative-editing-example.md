# Real-Time Collaborative Editing Example

## Scenario: Patient John Doe's Visit

### **Initial State** 🏥
```
Patient: John Doe (OP#12345)
Status: REGISTERED
Current Assignment: Triage Nurse (Sarah)
```

---

## **Step 1: Receptionist Registers Patient** 👩‍💼

### **What Happens:**
```typescript
// Receptionist (Alice) creates patient record
const patient = await createPatient({
  firstName: "John",
  lastName: "Doe",
  gender: "MALE",
  age: 35,
  phoneNumber: "+254712345678",
  insuranceType: "CASH"
})

// System automatically:
// 1. Creates visit record
// 2. Assigns to Triage Nurse
// 3. Broadcasts to all staff
```

### **Real-Time Notifications:**
```javascript
// WebSocket events sent to all connected users
socket.emit('patient_registered', {
  patientId: 'patient_123',
  opNumber: 'OP12345',
  assignedTo: 'nurse_sarah',
  registeredBy: 'alice_receptionist',
  timestamp: new Date()
})

// Triage Nurse (Sarah) receives notification
socket.emit('new_assignment', {
  type: 'patient_assignment',
  title: 'New Patient Assigned',
  message: 'John Doe (OP#12345) assigned for triage',
  patientId: 'patient_123',
  priority: 'NORMAL'
})
```

### **Database Updates:**
```sql
-- Patient record created
INSERT INTO patients (id, first_name, last_name, gender, age, phone_number, insurance_type)
VALUES ('patient_123', 'John', 'Doe', 'MALE', 35, '+254712345678', 'CASH');

-- Visit record created
INSERT INTO visits (id, patient_id, op_number, status, payment_type)
VALUES ('visit_456', 'patient_123', 'OP12345', 'REGISTERED', 'CASH');

-- Assignment created
INSERT INTO patient_assignments (id, patient_id, assigned_to_user_id, assignment_type, status)
VALUES ('assignment_789', 'patient_123', 'nurse_sarah', 'TRIAGE', 'ACTIVE');

-- Audit log
INSERT INTO audit_logs (user_id, action, resource, resource_id, details)
VALUES ('alice_receptionist', 'CREATE', 'PATIENT', 'patient_123', 'Patient registered and assigned to triage');
```

---

## **Step 2: Triage Nurse Assesses Patient** 🩺

### **What Happens:**
```typescript
// Triage Nurse (Sarah) opens patient record
socket.emit('entity_edit_start', {
  entityType: 'patient',
  entityId: 'patient_123'
})

// Other staff see: "Sarah is viewing John Doe's record"
```

### **Real-Time Collaboration:**
```javascript
// Sarah starts typing in vital signs field
socket.emit('typing_start', {
  patientId: 'patient_123',
  field: 'vital_signs',
  isTyping: true
})

// Other staff see: "Sarah is typing in vital signs"
```

### **Sarah Updates Vital Signs:**
```typescript
// Sarah updates vital signs
const update = await updatePatientEncounter('encounter_101', {
  vitalSigns: {
    bloodPressure: '140/90',
    temperature: '38.5°C',
    pulse: '95 bpm',
    respiratoryRate: '20/min'
  },
  triageCategory: 'URGENT',
  chiefComplaint: 'Severe chest pain for 2 hours'
})
```

### **Real-Time Broadcast:**
```javascript
// System broadcasts update to all relevant staff
socket.emit('patient_updated', {
  patientId: 'patient_123',
  updates: {
    vitalSigns: update.vitalSigns,
    triageCategory: 'URGENT',
    chiefComplaint: 'Severe chest pain for 2 hours'
  },
  updatedBy: 'nurse_sarah',
  timestamp: new Date()
})

// Clinical Officer (Dr. Smith) receives notification
socket.emit('patient_assignment_updated', {
  patientId: 'patient_123',
  message: 'John Doe triaged as URGENT - chest pain',
  priority: 'URGENT',
  assignedTo: 'dr_smith'
})
```

### **Assignment Transfer:**
```typescript
// Sarah completes triage and assigns to Clinical Officer
await updateAssignment('assignment_789', { status: 'COMPLETED' })
await createAssignment({
  patientId: 'patient_123',
  assignedToUserId: 'dr_smith',
  assignmentType: 'CONSULTATION',
  priority: 'URGENT'
})
```

---

## **Step 3: Clinical Officer Consultation** 👨‍⚕️

### **What Happens:**
```typescript
// Dr. Smith opens patient record
socket.emit('entity_edit_start', {
  entityType: 'patient',
  entityId: 'patient_123'
})

// System shows: "Dr. Smith is viewing John Doe's record"
// Sarah sees: "Dr. Smith is now handling John Doe"
```

### **Dr. Smith Adds Diagnosis:**
```typescript
// Dr. Smith starts typing diagnosis
socket.emit('typing_start', {
  patientId: 'patient_123',
  field: 'diagnosis',
  isTyping: true
})

// Other staff see: "Dr. Smith is typing in diagnosis"
```

### **Diagnosis Added:**
```typescript
const diagnosis = await addDiagnosis('patient_123', {
  diagnosisCode: 'I21.9',
  diagnosisName: 'Acute myocardial infarction, unspecified',
  status: 'ACTIVE',
  notes: 'Patient presents with chest pain, elevated troponins expected'
})
```

### **Prescription Added:**
```typescript
const prescription = await addPrescription('patient_123', {
  medicationName: 'Aspirin',
  dosage: '325mg',
  frequency: 'Once daily',
  duration: '30 days',
  instructions: 'Take with food to prevent stomach upset'
})
```

### **Lab Order Created:**
```typescript
const labOrder = await createLabRequest('patient_123', {
  testType: 'CARDIAC_ENZYMES',
  urgency: 'URGENT',
  notes: 'Check troponin levels for MI confirmation'
})
```

### **Real-Time Updates:**
```javascript
// Multiple updates broadcast simultaneously
socket.emit('patient_updated', {
  patientId: 'patient_123',
  updates: {
    diagnosis: diagnosis,
    prescriptions: [prescription],
    labRequests: [labOrder]
  },
  updatedBy: 'dr_smith',
  timestamp: new Date()
})

// Lab Technician receives notification
socket.emit('new_lab_request', {
  patientId: 'patient_123',
  testType: 'CARDIAC_ENZYMES',
  urgency: 'URGENT',
  requestedBy: 'dr_smith'
})
```

---

## **Step 4: Lab Technician Processes Tests** 🧪

### **What Happens:**
```typescript
// Lab Technician (Mike) receives assignment
await createAssignment({
  patientId: 'patient_123',
  assignedToUserId: 'mike_lab_tech',
  assignmentType: 'LAB',
  priority: 'URGENT'
})
```

### **Lab Results Updated:**
```typescript
const labResults = await updateLabRequest('lab_request_202', {
  status: 'COMPLETED',
  results: {
    troponinI: '2.5 ng/mL', // Elevated - confirms MI
    ckMB: '45 U/L',
    myoglobin: '180 ng/mL'
  },
  completedAt: new Date(),
  notes: 'Results confirm acute myocardial infarction'
})
```

### **Real-Time Notification:**
```javascript
// Dr. Smith receives urgent notification
socket.emit('lab_results_ready', {
  patientId: 'patient_123',
  labRequestId: 'lab_request_202',
  results: labResults,
  urgency: 'URGENT',
  message: 'URGENT: Lab results confirm MI diagnosis'
})

// Pharmacist receives notification
socket.emit('prescription_ready', {
  patientId: 'patient_123',
  prescriptionId: prescription.id,
  medicationName: 'Aspirin',
  status: 'READY_FOR_DISPENSING'
})
```

---

## **Step 5: Pharmacist Dispenses Medication** 💊

### **What Happens:**
```typescript
// Pharmacist (Lisa) receives assignment
await createAssignment({
  patientId: 'patient_123',
  assignedToUserId: 'lisa_pharmacist',
  assignmentType: 'PHARMACY',
  priority: 'URGENT'
})
```

### **Medication Dispensed:**
```typescript
const dispensing = await updatePrescription(prescription.id, {
  status: 'DISPENSED',
  dispensedAt: new Date(),
  dispensedBy: 'lisa_pharmacist',
  dispensingNotes: 'Patient counseled on aspirin therapy and MI symptoms'
})
```

### **Real-Time Update:**
```javascript
// All staff see medication dispensed
socket.emit('prescription_updated', {
  patientId: 'patient_123',
  prescriptionId: prescription.id,
  status: 'DISPENSED',
  dispensedBy: 'lisa_pharmacist',
  timestamp: new Date()
})

// Cashier receives notification
socket.emit('patient_ready_for_payment', {
  patientId: 'patient_123',
  totalAmount: 500.00,
  paymentType: 'CASH',
  services: ['Consultation', 'Lab Tests', 'Medication']
})
```

---

## **Step 6: Cashier Processes Payment** 💰

### **What Happens:**
```typescript
// Cashier (Tom) receives assignment
await createAssignment({
  patientId: 'patient_123',
  assignedToUserId: 'tom_cashier',
  assignmentType: 'PAYMENT',
  priority: 'NORMAL'
})
```

### **Payment Processed:**
```typescript
const payment = await processPayment('visit_456', {
  amount: 500.00,
  paymentType: 'CASH',
  status: 'COMPLETED',
  processedBy: 'tom_cashier'
})
```

### **Visit Completed:**
```typescript
const completedVisit = await updateVisit('visit_456', {
  status: 'COMPLETED',
  paymentStatus: 'PAID',
  totalAmount: 500.00,
  completedAt: new Date(),
  dischargeNotes: 'Patient stable, medication dispensed, follow-up in 1 week'
})
```

### **Final Notifications:**
```javascript
// All assigned staff receive completion notification
socket.emit('visit_completed', {
  patientId: 'patient_123',
  visitId: 'visit_456',
  completedBy: 'tom_cashier',
  totalAmount: 500.00,
  duration: '2 hours 30 minutes',
  message: 'John Doe visit completed successfully'
})

// Dr. Smith receives follow-up reminder
socket.emit('follow_up_scheduled', {
  patientId: 'patient_123',
  appointmentDate: '2024-01-15',
  appointmentType: 'FOLLOW_UP',
  notes: 'Post-MI follow-up appointment'
})
```

---

## **Real-Time Collaboration Summary** 📊

### **What Each Staff Member Saw:**

#### **Receptionist (Alice):**
- ✅ Patient registered successfully
- ✅ Assigned to Triage Nurse
- ✅ Visit completed and paid

#### **Triage Nurse (Sarah):**
- 🔔 New patient assignment notification
- 👁️ Saw Dr. Smith viewing patient record
- ✅ Completed triage assessment
- 🔔 Patient assigned to Clinical Officer

#### **Clinical Officer (Dr. Smith):**
- 🔔 Urgent patient assignment notification
- 👁️ Saw Sarah's triage assessment
- ⌨️ Saw Mike typing lab results
- 🔔 Urgent lab results notification
- ✅ Completed diagnosis and treatment

#### **Lab Technician (Mike):**
- 🔔 Urgent lab request notification
- ✅ Processed cardiac enzyme tests
- 🔔 Results sent to Dr. Smith

#### **Pharmacist (Lisa):**
- 🔔 Prescription ready notification
- ✅ Dispensed medication
- 🔔 Patient ready for payment

#### **Cashier (Tom):**
- 🔔 Patient ready for payment
- ✅ Processed payment
- ✅ Completed visit

### **System Features Demonstrated:**

1. **Real-Time Notifications** - All staff received relevant updates
2. **User Presence** - Staff could see who was viewing/editing records
3. **Typing Indicators** - Staff knew when others were making changes
4. **Assignment Workflow** - Clear handoffs between staff members
5. **Conflict Prevention** - No data loss or overwrites
6. **Audit Trail** - Complete record of all changes
7. **Role-Based Access** - Each staff member only saw relevant information

### **Database Changes Tracked:**
```sql
-- 15+ database updates tracked in audit_logs
-- 6 patient assignments created and updated
-- 3 real-time WebSocket rooms managed
-- 12+ notifications sent to staff members
-- 0 conflicts or data loss incidents
```

This collaborative system ensures smooth patient care while maintaining data integrity and providing excellent visibility for all staff members! 🎉
