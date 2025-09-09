# Collaborative Patient Record Editing System

## How Multiple Staff Members Edit Patient Records

### 🔄 **The Challenge**
In a clinic, multiple staff members need to access and edit the same patient record throughout their journey:
- **Receptionist** → Registers patient
- **Triage Nurse** → Updates vital signs and triage category
- **Clinical Officer** → Adds diagnosis and prescriptions
- **Lab Technician** → Updates lab results
- **Pharmacist** → Updates prescription status
- **Cashier** → Processes payment

### 🛡️ **Solution: Multi-Layer Collaborative System**

## 1. **Role-Based Access Control** 🔐

### **Different Staff, Different Permissions**
```typescript
// Each role can only edit specific fields
const ROLE_PERMISSIONS = {
  RECEPTIONIST: [
    'patient.demographics',
    'patient.contact_info',
    'visit.payment_type',
    'visit.payment_reference'
  ],
  NURSE: [
    'visit.triage_category',
    'visit.chief_complaint',
    'encounter.vital_signs',
    'encounter.initial_assessment'
  ],
  CLINICAL_OFFICER: [
    'encounter.consultation_notes',
    'encounter.diagnosis',
    'encounter.prescriptions',
    'encounter.lab_orders',
    'visit.status'
  ],
  LAB_TECHNICIAN: [
    'lab_request.results',
    'lab_request.status',
    'lab_request.completed_at'
  ],
  PHARMACIST: [
    'prescription.dispensing_status',
    'prescription.dispensed_at',
    'prescription.dispensing_notes'
  ],
  CASHIER: [
    'visit.payment_status',
    'visit.total_amount',
    'payment.amount',
    'payment.status'
  ]
}
```

## 2. **Real-Time Collaboration Features** ⚡

### **A. User Presence Indicators**
```typescript
// Show who's currently viewing/editing the patient
interface UserPresence {
  userId: string
  username: string
  role: string
  status: 'viewing' | 'editing' | 'typing'
  currentPage: string
  lastSeen: Date
}
```

### **B. Typing Indicators**
```typescript
// Real-time typing notifications
socket.on('typing_start', (data) => {
  // Notify others that someone is typing
  socket.to(`patient:${patientId}`).emit('user_typing', {
    userId: socket.userId,
    username: socket.username,
    field: data.field, // e.g., 'chief_complaint', 'diagnosis'
    isTyping: true
  })
})
```

### **C. Entity-Specific Editing Rooms**
```typescript
// Each patient gets their own editing room
socket.on('entity_edit_start', (data) => {
  // Join patient-specific room
  socket.join(`entity:patient:${data.patientId}`)
  
  // Notify others in the room
  socket.to(`entity:patient:${data.patientId}`).emit('entity_edit_start', {
    userId: socket.userId,
    username: socket.username,
    entityType: 'patient',
    entityId: data.patientId,
    timestamp: new Date()
  })
})
```

## 3. **Conflict Resolution System** 🔧

### **A. Field-Level Locking**
```typescript
// Lock specific fields when being edited
interface FieldLock {
  field: string
  lockedBy: string
  lockedAt: Date
  expiresAt: Date
}

// Example: Only one person can edit diagnosis at a time
const lockField = async (patientId: string, field: string, userId: string) => {
  const lock = await redis.setex(
    `lock:patient:${patientId}:${field}`,
    300, // 5 minutes
    JSON.stringify({
      lockedBy: userId,
      lockedAt: new Date(),
      expiresAt: new Date(Date.now() + 300000)
    })
  )
  return lock
}
```

### **B. Optimistic Locking with Version Control**
```typescript
// Each record has a version number
interface PatientRecord {
  id: string
  version: number
  // ... other fields
}

// Update only if version matches
const updatePatient = async (patientId: string, updates: any, expectedVersion: number) => {
  const result = await pool.query(
    `UPDATE patients 
     SET ${Object.keys(updates).map((key, i) => `${key} = $${i + 2}`).join(', ')},
         version = version + 1,
         updated_at = NOW()
     WHERE id = $1 AND version = $${Object.keys(updates).length + 2}`,
    [patientId, ...Object.values(updates), expectedVersion]
  )
  
  if (result.rowCount === 0) {
    throw new Error('Record was modified by another user. Please refresh and try again.')
  }
}
```

## 4. **Patient Assignment System** 👥

### **A. Dynamic Patient Assignments**
```typescript
// Assign patients to specific staff members
interface PatientAssignment {
  id: string
  patientId: string
  assignedToUserId: string
  assignmentType: 'TRIAGE' | 'CONSULTATION' | 'LAB' | 'PHARMACY' | 'PAYMENT'
  status: 'ACTIVE' | 'COMPLETED' | 'TRANSFERRED'
  priority: 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT'
  assignedAt: Date
  dueDate?: Date
  notes?: string
}
```

### **B. Assignment Workflow**
```typescript
// 1. Receptionist assigns to Triage Nurse
await createAssignment({
  patientId: 'patient_123',
  assignedToUserId: 'nurse_456',
  assignmentType: 'TRIAGE',
  priority: 'NORMAL'
})

// 2. Triage Nurse completes, assigns to Clinical Officer
await updateAssignment('assignment_789', { status: 'COMPLETED' })
await createAssignment({
  patientId: 'patient_123',
  assignedToUserId: 'clinical_officer_789',
  assignmentType: 'CONSULTATION',
  priority: 'NORMAL'
})

// 3. Clinical Officer orders lab, assigns to Lab Technician
await createAssignment({
  patientId: 'patient_123',
  assignedToUserId: 'lab_tech_101',
  assignmentType: 'LAB',
  priority: 'NORMAL'
})
```

## 5. **Real-Time Synchronization** 🔄

### **A. WebSocket Events**
```typescript
// Broadcast changes to all relevant users
const broadcastPatientUpdate = async (patientId: string, updates: any, userId: string) => {
  const wsService = getWebSocketService()
  
  // Send to all users viewing this patient
  wsService.io.to(`entity:patient:${patientId}`).emit('patient_updated', {
    patientId,
    updates,
    updatedBy: userId,
    timestamp: new Date()
  })
  
  // Send to role-specific rooms
  wsService.io.to('role:CLINICAL_OFFICER').emit('patient_updated', {
    patientId,
    updates,
    updatedBy: userId,
    timestamp: new Date()
  })
}
```

### **B. Sync Service Integration**
```typescript
// Centralized sync service
export class SyncService {
  public async syncPatientUpdate(
    patient: any,
    action: 'create' | 'update' | 'delete',
    userId: string,
    username: string
  ): Promise<void> {
    // Broadcast to all connected users
    await this.broadcastSyncEvent({
      type: 'patient_update',
      entityId: patient.id,
      entityType: 'patient',
      action,
      data: patient,
      userId,
      username,
      timestamp: new Date()
    })
    
    // Send notifications to assigned staff
    const assignments = await PatientAssignmentModel.findByPatientId(patient.id)
    for (const assignment of assignments) {
      if (assignment.assigned_to_user_id !== userId) {
        await this.sendNotification({
          type: 'patient_update',
          title: 'Patient Record Updated',
          message: `${username} updated patient ${patient.first_name} ${patient.last_name}`,
          data: patient
        }, { users: [assignment.assigned_to_user_id] })
      }
    }
  }
}
```

## 6. **Audit Trail & Change Tracking** 📊

### **A. Complete Change History**
```typescript
// Every change is logged
interface AuditLog {
  id: string
  userId: string
  username: string
  action: 'CREATE' | 'UPDATE' | 'DELETE'
  resource: 'PATIENT' | 'VISIT' | 'ENCOUNTER' | 'PRESCRIPTION' | 'LAB_REQUEST'
  resourceId: string
  changes: {
    field: string
    oldValue: any
    newValue: any
  }[]
  timestamp: Date
  ipAddress: string
  userAgent: string
}
```

### **B. Change Tracking Example**
```typescript
// When updating patient record
const updatePatientRecord = async (patientId: string, updates: any, userId: string) => {
  const client = await pool.connect()
  
  try {
    await client.query('BEGIN')
    
    // Get current values
    const current = await client.query('SELECT * FROM patients WHERE id = $1', [patientId])
    
    // Update record
    const updated = await client.query(/* update query */)
    
    // Log changes
    const changes = Object.keys(updates).map(field => ({
      field,
      oldValue: current.rows[0][field],
      newValue: updates[field]
    }))
    
    await client.query(
      `INSERT INTO audit_logs (user_id, action, resource, resource_id, changes, timestamp)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [userId, 'UPDATE', 'PATIENT', patientId, JSON.stringify(changes), new Date()]
    )
    
    await client.query('COMMIT')
    
    // Broadcast changes
    await syncService.syncPatientUpdate(updated.rows[0], 'update', userId, username)
    
  } catch (error) {
    await client.query('ROLLBACK')
    throw error
  } finally {
    client.release()
  }
}
```

## 7. **Frontend Collaborative Features** 💻

### **A. Real-Time UI Updates**
```typescript
// React component with real-time updates
const PatientRecord = ({ patientId }: { patientId: string }) => {
  const [patient, setPatient] = useState(null)
  const [editingUsers, setEditingUsers] = useState([])
  const [typingUsers, setTypingUsers] = useState([])
  
  useEffect(() => {
    // Listen for real-time updates
    socket.on('patient_updated', (data) => {
      if (data.patientId === patientId) {
        setPatient(prev => ({ ...prev, ...data.updates }))
      }
    })
    
    socket.on('user_typing', (data) => {
      setTypingUsers(prev => [...prev.filter(u => u.userId !== data.userId), data])
    })
    
    socket.on('entity_edit_start', (data) => {
      setEditingUsers(prev => [...prev, data])
    })
    
    return () => {
      socket.off('patient_updated')
      socket.off('user_typing')
      socket.off('entity_edit_start')
    }
  }, [patientId])
  
  return (
    <div>
      {/* Show who's editing */}
      {editingUsers.length > 0 && (
        <div className="editing-indicator">
          {editingUsers.map(user => (
            <span key={user.userId}>
              {user.username} is editing
            </span>
          ))}
        </div>
      )}
      
      {/* Show typing indicators */}
      {typingUsers.length > 0 && (
        <div className="typing-indicator">
          {typingUsers.map(user => (
            <span key={user.userId}>
              {user.username} is typing in {user.field}
            </span>
          ))}
        </div>
      )}
      
      {/* Patient record form */}
      <PatientForm patient={patient} onUpdate={handleUpdate} />
    </div>
  )
}
```

### **B. Field-Level Permissions**
```typescript
// Show/hide fields based on user role
const PatientForm = ({ patient, onUpdate }: { patient: any, onUpdate: (updates: any) => void }) => {
  const { user } = useAuthStore()
  
  return (
    <form>
      {/* Receptionist can edit */}
      {user.role === 'RECEPTIONIST' && (
        <div>
          <label>First Name</label>
          <input 
            value={patient.first_name} 
            onChange={(e) => onUpdate({ first_name: e.target.value })}
          />
        </div>
      )}
      
      {/* Nurse can edit */}
      {user.role === 'NURSE' && (
        <div>
          <label>Triage Category</label>
          <select 
            value={patient.triage_category} 
            onChange={(e) => onUpdate({ triage_category: e.target.value })}
          >
            <option value="NORMAL">Normal</option>
            <option value="URGENT">Urgent</option>
            <option value="EMERGENCY">Emergency</option>
          </select>
        </div>
      )}
      
      {/* Clinical Officer can edit */}
      {user.role === 'CLINICAL_OFFICER' && (
        <div>
          <label>Diagnosis</label>
          <textarea 
            value={patient.diagnosis} 
            onChange={(e) => onUpdate({ diagnosis: e.target.value })}
          />
        </div>
      )}
    </form>
  )
}
```

## 8. **Example Patient Journey** 🚀

### **Step-by-Step Collaborative Editing**

```
09:00 - Receptionist registers patient
       ├── Creates patient record
       ├── Assigns to Triage Nurse
       └── Broadcasts: "New patient registered"

09:05 - Triage Nurse receives notification
       ├── Opens patient record
       ├── Sees "Receptionist is viewing"
       ├── Updates vital signs
       ├── Assigns to Clinical Officer
       └── Broadcasts: "Vital signs updated"

09:40 - Clinical Officer receives notification
       ├── Opens patient record
       ├── Sees "Triage Nurse completed assessment"
       ├── Adds diagnosis and prescriptions
       ├── Orders lab tests
       ├── Assigns to Lab Technician
       └── Broadcasts: "Diagnosis added, lab ordered"

10:05 - Lab Technician receives notification
       ├── Opens patient record
       ├── Sees "Lab tests ordered by Clinical Officer"
       ├── Updates lab results
       ├── Assigns to Pharmacist
       └── Broadcasts: "Lab results ready"

10:15 - Pharmacist receives notification
       ├── Opens patient record
       ├── Sees "Prescriptions ready for dispensing"
       ├── Updates dispensing status
       ├── Assigns to Cashier
       └── Broadcasts: "Medications dispensed"

10:20 - Cashier receives notification
       ├── Opens patient record
       ├── Sees "Ready for payment"
       ├── Processes payment
       ├── Completes visit
       └── Broadcasts: "Payment processed, visit completed"
```

## 9. **Key Benefits** ✅

1. **No Data Loss**: Optimistic locking prevents overwrites
2. **Real-Time Collaboration**: All staff see changes instantly
3. **Role-Based Security**: Each role can only edit relevant fields
4. **Complete Audit Trail**: Every change is tracked and logged
5. **Conflict Resolution**: System handles simultaneous edits gracefully
6. **User Experience**: Clear indicators of who's editing what
7. **Scalability**: Works with multiple staff members simultaneously

## 10. **Technical Implementation** 🔧

### **Database Schema**
```sql
-- Patient assignments table
CREATE TABLE patient_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES patients(id),
  assigned_to_user_id UUID NOT NULL REFERENCES users(id),
  assignment_type VARCHAR(50) NOT NULL,
  status VARCHAR(20) DEFAULT 'ACTIVE',
  priority VARCHAR(20) DEFAULT 'NORMAL',
  assigned_at TIMESTAMP DEFAULT NOW(),
  completed_at TIMESTAMP,
  notes TEXT
);

-- Audit logs table
CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id),
  action VARCHAR(20) NOT NULL,
  resource VARCHAR(50) NOT NULL,
  resource_id UUID NOT NULL,
  changes JSONB,
  timestamp TIMESTAMP DEFAULT NOW(),
  ip_address INET,
  user_agent TEXT
);

-- User presence table
CREATE TABLE user_presence (
  user_id UUID PRIMARY KEY REFERENCES users(id),
  status VARCHAR(20) DEFAULT 'offline',
  current_page VARCHAR(255),
  current_activity VARCHAR(255),
  is_typing BOOLEAN DEFAULT FALSE,
  typing_entity_id UUID,
  typing_entity_type VARCHAR(50),
  last_seen TIMESTAMP DEFAULT NOW()
);
```

This collaborative editing system ensures that multiple staff members can work on the same patient record efficiently, safely, and with full visibility of each other's actions! 🎉
