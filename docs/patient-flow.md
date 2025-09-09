# Patient Flow Through Clinic System

## Complete Patient Journey: Arrival to Departure

### 1. **Patient Arrival & Registration** 🏥
**Staff Role**: Receptionist/Registration Clerk
**System Actions**:
- Patient arrives at clinic
- Check if patient exists in system
- If new patient: Register with demographic data
- If existing patient: Verify identity and update contact info
- Generate/assign OP Number
- Collect payment information (Cash, Insurance, SHA, NHIF)
- Create visit record with payment type

**Database Updates**:
- `patients` table (if new patient)
- `visits` table (new visit record)
- `audit_logs` table (registration action)

---

### 2. **Triage & Initial Assessment** 🩺
**Staff Role**: Triage Nurse
**System Actions**:
- Assess patient's chief complaint
- Determine triage category (EMERGENCY, URGENT, NORMAL)
- Record vital signs if needed
- Update visit record with triage information
- Assign priority level for consultation

**Database Updates**:
- `visits` table (triage_category, chief_complaint)
- `patient_encounters` table (vital signs, initial assessment)

---

### 3. **Waiting Room Management** ⏳
**Staff Role**: Receptionist/Nurse
**System Actions**:
- Patient enters waiting queue
- System displays patient in appropriate queue based on triage
- Real-time updates to staff dashboard
- Notify when consultation room is available

**System Features**:
- Live patient queue display
- Estimated wait times
- Priority-based queue management

---

### 4. **Clinical Consultation** 👨‍⚕️
**Staff Role**: Clinical Officer/Doctor
**System Actions**:
- Access patient's medical history
- Record consultation notes
- Add diagnosis codes
- Prescribe medications
- Order laboratory tests if needed
- Schedule follow-up appointments
- Update visit status

**Database Updates**:
- `patient_encounters` table (consultation details)
- `diagnoses` table (diagnosis codes)
- `prescriptions` table (medications prescribed)
- `lab_requests` table (if lab tests ordered)

---

### 5. **Laboratory Services** 🧪
**Staff Role**: Lab Technician (if tests ordered)
**System Actions**:
- Process lab requests
- Record test results
- Update lab request status
- Notify clinical officer of results
- Generate lab reports

**Database Updates**:
- `lab_requests` table (test results, status)
- `lab_results` table (detailed results)

---

### 6. **Pharmacy Services** 💊
**Staff Role**: Pharmacist
**System Actions**:
- Review prescribed medications
- Check drug interactions
- Dispense medications
- Record dispensing details
- Provide medication counseling
- Update prescription status

**Database Updates**:
- `prescriptions` table (dispensing status, notes)
- `medication_dispensings` table (dispensing records)

---

### 7. **Specialized Services** 🏥
**Staff Role**: Various Specialists

#### **A. Immunization Services** 💉
- **Staff**: Immunization Nurse
- **Actions**: 
  - Check immunization schedule
  - Administer vaccines
  - Record immunization details
  - Schedule next vaccination
- **Database**: `patient_immunizations` table

#### **B. Family Planning Services** 👨‍👩‍👧‍👦
- **Staff**: Family Planning Counselor
- **Actions**:
  - Provide counseling
  - Record method selection
  - Schedule follow-up
  - Track method effectiveness
- **Database**: `patient_family_planning` table

#### **C. MCH Services** 🤱
- **Staff**: MCH Nurse/Midwife
- **Actions**:
  - Provide antenatal/postnatal care
  - Record service details
  - Schedule next appointment
  - Track maternal/child health
- **Database**: `patient_mch_services` table

---

### 8. **Payment Processing** 💰
**Staff Role**: Cashier/Billing Clerk
**System Actions**:
- Calculate total charges
- Process payment based on type:
  - **Cash**: Direct payment
  - **Insurance**: Verify coverage, submit claims
  - **SHA**: Generate SHA invoice, submit to SHA portal
  - **NHIF**: Process NHIF card, submit claims
- Generate receipt
- Update payment status

**Database Updates**:
- `visits` table (payment_status, total_amount)
- `payments` table (payment details)
- `sha_invoices` table (if SHA payment)

---

### 9. **Discharge & Follow-up** 📋
**Staff Role**: Clinical Officer/Nurse
**System Actions**:
- Complete discharge summary
- Provide patient education materials
- Schedule follow-up appointments
- Update visit status to "COMPLETED"
- Generate discharge instructions

**Database Updates**:
- `visits` table (status: COMPLETED, discharge_notes)
- `appointments` table (follow-up appointments)

---

## Real-Time System Features

### **Synchronization & Collaboration** 🔄
- **Live Updates**: All staff see real-time patient status changes
- **User Presence**: See which staff members are online
- **Typing Indicators**: Know when someone is updating patient records
- **Conflict Resolution**: Handle simultaneous edits gracefully
- **Notifications**: Alert relevant staff of status changes

### **Role-Based Access Control** 🔐
- **Receptionist**: Patient registration, payment processing
- **Nurse**: Triage, vital signs, basic care
- **Clinical Officer**: Consultations, diagnoses, prescriptions
- **Lab Technician**: Lab requests and results
- **Pharmacist**: Medication dispensing
- **Specialists**: Immunization, family planning, MCH services
- **Admin**: System management, staff oversight

### **Audit Trail** 📊
Every action is logged with:
- User who performed the action
- Timestamp
- Patient affected
- Action type
- Before/after values (for updates)

---

## Example Patient Flow Timeline

```
09:00 - Patient arrives → Receptionist registers → OP#12345 assigned
09:05 - Triage Nurse assesses → Chief complaint: "Fever" → Category: NORMAL
09:10 - Patient in waiting queue → Estimated wait: 30 minutes
09:40 - Clinical Officer calls patient → Consultation begins
10:00 - Diagnosis: "Upper respiratory infection" → Prescription: Antibiotics
10:05 - Lab test ordered → Lab Technician processes → Results: Normal
10:15 - Pharmacist dispenses medication → Patient counseling provided
10:20 - Cashier processes payment → Cash payment: KES 500
10:25 - Clinical Officer completes discharge → Follow-up in 3 days
10:30 - Patient leaves clinic → Visit status: COMPLETED
```

---

## Key System Benefits

1. **Seamless Handoffs**: Clear transition between staff members
2. **Real-time Visibility**: All staff see current patient status
3. **Comprehensive Records**: Complete patient journey documented
4. **Flexible Payment**: Support for multiple payment types
5. **Specialized Services**: Integrated immunization, family planning, MCH
6. **Audit Compliance**: Complete audit trail for all actions
7. **Role-based Security**: Appropriate access levels for each staff type

This flow ensures efficient patient care while maintaining data integrity and providing excellent user experience for all clinic staff members.
