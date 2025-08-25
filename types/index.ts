// Shared types between frontend and backend
export interface User {
  id: string
  username: string
  email?: string
  role: UserRole
  isActive: boolean
  isLocked: boolean
  failedLoginAttempts: number
  lastLoginAt?: Date
  createdAt: Date
  updatedAt: Date
}

export enum UserRole {
  ADMIN = "ADMIN",
  RECEPTIONIST = "RECEPTIONIST",
  NURSE = "NURSE",
  CLINICAL_OFFICER = "CLINICAL_OFFICER",
  PHARMACIST = "PHARMACIST",
  INVENTORY_MANAGER = "INVENTORY_MANAGER",
  CLAIMS_MANAGER = "CLAIMS_MANAGER",
  LAB_TECHNICIAN = "LAB_TECHNICIAN", // 🆕 NEW: Lab technician role
}

export interface Patient {
  id: string
  opNumber: string // Primary identifier
  firstName: string
  lastName: string
  dateOfBirth?: Date
  age?: number
  gender: "MALE" | "FEMALE" | "OTHER"
  phoneNumber?: string
  area?: string
  nextOfKin?: string
  nextOfKinPhone?: string
  insuranceType: "SHA" | "PRIVATE" | "CASH"
  insuranceNumber?: string
  createdAt: Date
  updatedAt: Date
}

export interface Visit {
  id: string
  patientId: string
  opNumber: string
  visitDate: Date
  status: VisitStatus
  chiefComplaint?: string
  triageCategory: "EMERGENCY" | "URGENT" | "NORMAL"
  createdAt: Date
  updatedAt: Date
}

export enum VisitStatus {
  REGISTERED = "REGISTERED",
  TRIAGED = "TRIAGED",
  WAITING_CONSULTATION = "WAITING_CONSULTATION",
  IN_CONSULTATION = "IN_CONSULTATION",
  WAITING_LAB = "WAITING_LAB",
  LAB_RESULTS_READY = "LAB_RESULTS_READY",
  WAITING_PHARMACY = "WAITING_PHARMACY",
  COMPLETED = "COMPLETED",
  CANCELLED = "CANCELLED",
}

export interface Vitals {
  id: string
  visitId: string
  temperature?: number
  bloodPressureSystolic?: number
  bloodPressureDiastolic?: number
  heartRate?: number
  respiratoryRate?: number
  oxygenSaturation?: number
  weight?: number
  height?: number
  bmi?: number
  recordedBy: string
  recordedAt: Date
}

export interface Consultation {
  id: string
  visitId: string
  patientId: string
  clinicianId: string
  presentingComplaint: string
  historyOfPresentingComplaint?: string
  pastMedicalHistory?: string
  examination?: string
  diagnosis: string
  treatmentPlan?: string
  followUpInstructions?: string
  consultationDate: Date
  createdAt: Date
  updatedAt: Date
}

// 🆕 NEW: Diagnostics System Types

export interface LabTest {
  id: string
  testCode: string
  testName: string
  testCategory: string
  description?: string
  specimenType: string
  turnaroundTime: number // in hours
  price: number
  isActive: boolean
  referenceRanges?: Record<string, any>
  instructions?: string
  createdAt: Date
  updatedAt: Date
}

export interface LabRequest {
  id: string
  visitId: string
  patientId: string
  requestedBy: string
  testType: string
  testName: string
  urgency: "ROUTINE" | "URGENT" | "STAT"
  status: "REQUESTED" | "SAMPLE_COLLECTED" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED"
  clinicalNotes?: string
  specimenCollectedAt?: Date
  collectedBy?: string
  expectedCompletionAt?: Date
  requestedAt: Date
  createdAt: Date
  updatedAt: Date
}

export interface LabResult {
  id: string
  labRequestId: string
  resultData: Record<string, any> // Flexible structure for different test types
  referenceRanges?: Record<string, any>
  abnormalFlags?: Record<string, boolean>
  technicianNotes?: string
  verifiedBy?: string
  verifiedAt?: Date
  reportedAt: Date
  createdAt: Date
}

export interface LabRequestItem {
  id: string
  labRequestId: string
  testId: string
  testName: string
  testCode: string
  specimenType: string
  urgency: "ROUTINE" | "URGENT" | "STAT"
  status: "REQUESTED" | "SAMPLE_COLLECTED" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED"
  clinicalNotes?: string
  resultData?: Record<string, any>
  referenceRanges?: Record<string, any>
  abnormalFlags?: Record<string, boolean>
  technicianNotes?: string
  verifiedBy?: string
  verifiedAt?: Date
  reportedAt?: Date
}

// 🆕 NEW: Diagnostics Form Types
export interface DiagnosticsFormData {
  patientId?: string
  visitId?: string
  consultationId?: string
  clinicalNotes?: string
  urgency?: "ROUTINE" | "URGENT" | "STAT"
  items?: DiagnosticsItemData[]
}

export interface DiagnosticsItemData {
  testId?: string
  testName?: string
  testCode?: string
  specimenType?: string
  clinicalNotes?: string
}

export interface AvailableTest {
  id: string
  testCode: string
  testName: string
  testCategory: string
  specimenType: string
  turnaroundTime: number
  price: number
  isActive: boolean
  description?: string
}

// Enhanced SHA Types for comprehensive invoice management
export interface SHAInvoice {
  id: string
  invoice_number: string
  claim_id: string
  patient_id: string
  op_number: string
  visit_id: string
  invoice_date: Date
  due_date: Date
  total_amount: number
  status: "draft" | "generated" | "printed" | "submitted" | "paid"
  generated_at?: Date
  generated_by: string
  printed_at?: Date
  printed_by?: string
  submitted_at?: Date
  submitted_by?: string
  sha_reference?: string
  batch_reference?: string
  compliance_status: "pending" | "verified" | "approved" | "rejected"
  audit_notes?: string
  created_at: Date
  updated_at: Date
}

export interface SHACompliance {
  id: string
  claim_id: string
  invoice_id: string
  compliance_type: "invoice_generation" | "submission" | "payment" | "audit"
  status: "pending" | "verified" | "approved" | "rejected"
  verification_date?: Date
  verified_by?: string
  notes?: string
  required_actions?: string[]
  next_review_date?: Date
  created_at: Date
  updated_at: Date
}

export interface SHAAuditTrail {
  id: string
  claim_id: string
  invoice_id?: string
  action: string
  performed_by: string
  performed_at: Date
  details: Record<string, any>
  ip_address?: string
  user_agent?: string
  compliance_check: boolean
  audit_notes?: string
  created_at: Date
}

export interface SHABatch {
  id: string
  batch_number: string
  batch_date: Date
  batch_type: "weekly" | "monthly" | "custom"
  total_claims: number
  total_amount: number
  status: "draft" | "submitted" | "processing" | "completed" | "failed"
  submission_date?: Date
  completion_date?: Date
  sha_batch_reference?: string
  created_by: string
  invoice_generated: boolean
  invoice_generated_at?: Date
  printed_invoices: boolean
  printed_at?: Date
  printed_by?: string
  created_at: Date
  updated_at: Date
}

export interface Prescription {
  id: string
  consultationId: string
  visitId: string
  patientId: string
  prescribedBy: string
  status: "PENDING" | "PARTIALLY_DISPENSED" | "FULLY_DISPENSED" | "CANCELLED"
  createdAt: Date
  updatedAt: Date
}

export interface PrescriptionItem {
  id: string
  prescriptionId: string
  inventoryItemId: string
  itemName: string
  dosage: string
  frequency: string
  duration: string
  quantityPrescribed: number
  quantityDispensed: number
  instructions?: string
}

export interface InventoryItem {
  id: string
  name: string
  genericName?: string
  category: string
  unit: string
  reorderLevel: number
  maxLevel: number
  isActive: boolean
  createdAt: Date
  updatedAt: Date
}

export interface InventoryBatch {
  id: string
  inventoryItemId: string
  batchNumber: string
  quantity: number
  originalQuantity: number
  unitCost: number
  sellingPrice: number
  expiryDate: Date
  supplierName?: string
  receivedDate: Date
  receivedBy: string
  isExpired: boolean
  createdAt: Date
  updatedAt: Date
}

export interface InventoryMovement {
  id: string
  inventoryItemId: string
  batchId?: string
  movementType: "RECEIVE" | "DISPENSE" | "ADJUST" | "EXPIRE" | "TRANSFER"
  quantity: number
  unitCost?: number
  reference?: string // Invoice ID, adjustment reason, etc.
  performedBy: string
  performedAt: Date
  notes?: string
}

export interface Invoice {
  id: string
  invoiceNumber: string
  patientId?: string
  opNumber?: string
  buyerName?: string // For walk-in sales
  buyerPhone?: string
  invoiceType: "PRESCRIPTION" | "WALK_IN" | "CONSULTATION" | "LAB"
  subtotal: number
  taxAmount: number
  discountAmount: number
  totalAmount: number
  amountPaid: number
  balanceAmount: number
  status: "PAID" | "PARTIAL" | "UNPAID"
  paymentDueDate?: Date
  createdBy: string
  createdAt: Date
  updatedAt: Date
}

export interface InvoiceItem {
  id: string
  invoiceId: string
  inventoryItemId?: string
  serviceType?: string
  itemName: string
  quantity: number
  unitPrice: number
  totalPrice: number
  batchId?: string
}

export interface Payment {
  id: string
  invoiceId: string
  amount: number
  paymentMethod: "CASH" | "MPESA" | "BANK_TRANSFER" | "OTHER"
  mpesaReference?: string
  bankReference?: string
  receivedBy: string
  receivedAt: Date
  reconciled: boolean
  reconciledAt?: Date
  notes?: string
}

export interface AccountsReceivable {
  id: string
  invoiceId: string
  patientId?: string
  opNumber?: string
  originalAmount: number
  remainingAmount: number
  dueDate: Date
  agingBucket: "0-30" | "31-60" | "61-90" | "90+"
  status: "CURRENT" | "OVERDUE" | "SETTLED"
  lastReminderSent?: Date
  createdAt: Date
  updatedAt: Date
}

export interface SHAClaim {
  id: string
  claimNumber: string
  patientId: string
  opNumber: string
  visitId: string
  claimAmount: number
  status: "DRAFT" | "READY_TO_SUBMIT" | "SUBMITTED" | "PAID" | "REJECTED" | "PARTIALLY_PAID"
  submittedAt?: Date
  paidAt?: Date
  rejectionReason?: string
  shaReference?: string
  batchId?: string
  createdBy: string
  createdAt: Date
  updatedAt: Date
}

export interface SHAClaimItem {
  id: string
  claimId: string
  serviceType: string
  serviceCode?: string
  description: string
  quantity: number
  unitPrice: number
  totalAmount: number
  approvedAmount?: number
}

export interface AuditLog {
  id: string
  userId: string
  username: string
  action: string
  targetType: string
  targetId?: string
  opNumber?: string
  details: Record<string, any>
  ipAddress?: string
  userAgent?: string
  timestamp: Date
  checksum: string
}

export interface CashReconciliation {
  id: string
  shiftDate: Date
  openingFloat: number
  expectedCash: number
  actualCash: number
  variance: number
  notes?: string
  reconciledBy: string
  reconciledAt: Date
}

export interface MigrationJob {
  id: string
  fileName: string
  fileSize: number
  status: "PENDING" | "PROCESSING" | "COMPLETED" | "FAILED"
  totalRecords: number
  processedRecords: number
  successfulRecords: number
  failedRecords: number
  errorLog?: string
  startedAt?: Date
  completedAt?: Date
  createdBy: string
  createdAt: Date
}

// API Response types
export interface ApiResponse<T = any> {
  success: boolean
  data?: T
  message?: string
  errors?: string[]
}

export interface PaginatedResponse<T> {
  data: T[]
  total: number
  page: number
  limit: number
  totalPages: number
}

// Queue management types
export interface QueueItem {
  id: string
  patientId: string
  opNumber: string
  patientName: string
  visitId: string
  status: VisitStatus
  priority: "HIGH" | "MEDIUM" | "LOW"
  estimatedWaitTime?: number
  queuePosition: number
  createdAt: Date
}
