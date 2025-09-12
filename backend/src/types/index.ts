export enum UserRole {
  ADMIN = 'ADMIN',
  RECEPTIONIST = 'RECEPTIONIST',
  NURSE = 'NURSE',
  CLINICAL_OFFICER = 'CLINICAL_OFFICER',
  PHARMACIST = 'PHARMACIST',
  INVENTORY_MANAGER = 'INVENTORY_MANAGER',
  CLAIMS_MANAGER = 'CLAIMS_MANAGER',
  LAB_TECHNICIAN = 'LAB_TECHNICIAN',
  CASHIER = 'CASHIER'
}

export interface AuthenticatedRequest {
  user?: {
    id: string
    username: string
    email?: string
    role: UserRole
    isActive: boolean
  }
}

export interface User {
  id: string
  username: string
  email?: string
  role: UserRole
  is_active: boolean
  created_at: Date
  updated_at: Date
}

// Patient types
export interface Patient {
  id: string
  op_number: string
  first_name: string
  last_name: string
  phone_number: string
  email?: string
  date_of_birth?: Date
  gender?: 'male' | 'female' | 'other'
  address?: string
  emergency_contact?: string
  insurance_provider?: string
  insurance_number?: string
  created_at: Date
  updated_at: Date
  opNumber?: string
}

// Visit types
export enum VisitStatus {
  SCHEDULED = 'SCHEDULED',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
  NO_SHOW = 'NO_SHOW',
  TRIAGED = 'TRIAGED',
  REGISTERED = 'REGISTERED',
  WAITING_CONSULTATION = 'WAITING_CONSULTATION',
  IN_CONSULTATION = 'IN_CONSULTATION',
  WAITING_PHARMACY = 'WAITING_PHARMACY',
  WAITING_LAB = 'WAITING_LAB',
  LAB_RESULTS_READY = 'LAB_RESULTS_READY'
}

export interface Visit {
  id: string
  patient_id: string
  op_number: string
  visit_date: Date
  status: VisitStatus
  chief_complaint?: string
  diagnosis?: string
  treatment_plan?: string
  notes?: string
  created_by: string
  created_at: Date
  updated_at: Date
  visitDate?: Date
  patientId?: string
}

export interface QueueItem {
  id: string
  patient_id: string
  op_number: string
  priority: number
  status: 'waiting' | 'in_progress' | 'completed'
  created_at: Date
}

// Inventory types
export interface InventoryItem {
  id: string
  name: string
  category: string
  unit: string
  reorder_level: number
  max_level: number
  created_at: Date
  updated_at: Date
}

export interface InventoryBatch {
  id: string
  item_id: string
  batch_number: string
  quantity: number
  expiry_date: Date
  purchase_price: number
  supplier: string
  created_at: Date
  inventoryItemId?: string
  unitCost?: number
  batchNumber?: string
}

export interface InventoryMovement {
  id: string
  item_id: string
  batch_id: string
  movement_type: 'in' | 'out' | 'adjustment'
  quantity: number
  reference_type?: string
  reference_id?: string
  notes?: string
  created_by: string
  created_at: Date
}

// Lab types
export interface LabTest {
  id: string
  name: string
  code: string
  category: string
  price: number
  turnaround_time: string
  is_active: boolean
  created_at: Date
  updated_at: Date
  test_code?: string
  test_name?: string
  testCategory?: string
  description?: string
  specimenType?: string
  turnaroundTime?: string
  isActive?: boolean
  referenceRanges?: any
  instructions?: string
  createdAt?: Date
  updatedAt?: Date
}

export interface LabRequest {
  id: string
  patient_id: string
  op_number: string
  request_date: Date
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled'
  priority: 'routine' | 'urgent' | 'emergency'
  notes?: string
  created_by: string
  created_at: Date
  updated_at: Date
  visit_id?: string
  requestedBy?: string
  testType?: string
  testName?: string
  urgency?: string
  clinicalNotes?: string
  specimenCollectedAt?: Date
  collectedBy?: string
  expectedCompletionAt?: Date
  requestedAt?: Date
  createdAt?: Date
  updatedAt?: Date
}

export interface LabRequestItem {
  id: string
  request_id: string
  test_id: string
  quantity: number
  price: number
  notes?: string
  created_at: Date
  lab_request_id?: string
  testName?: string
  testCode?: string
  specimenType?: string
  urgency?: string
  status?: string
  clinicalNotes?: string
  resultData?: any
  referenceRanges?: any
  abnormalFlags?: any
  technicianNotes?: string
  verifiedBy?: string
  verifiedAt?: Date
  reportedAt?: Date
}

// Prescription types
export interface Prescription {
  id: string
  patient_id: string
  op_number: string
  prescription_date: Date
  diagnosis?: string
  notes?: string
  status: 'active' | 'completed' | 'cancelled'
  created_by: string
  created_at: Date
  updated_at: Date
}

export interface PrescriptionItem {
  id: string
  prescription_id: string
  medication_name: string
  dosage: string
  frequency: string
  duration: string
  quantity: number
  instructions?: string
  created_at: Date
}
