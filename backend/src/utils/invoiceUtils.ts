import { pool } from "../config/database"

// Generate unique invoice number for SHA claims
export async function generateInvoiceNumber(prefix: string = "SHA"): Promise<string> {
  const year = new Date().getFullYear()
  const month = String(new Date().getMonth() + 1).padStart(2, '0')
  
  // Get the latest invoice number for this month
  const result = await pool.query(
    `SELECT invoice_number FROM sha_invoices 
     WHERE invoice_number LIKE $1 
     ORDER BY created_at DESC LIMIT 1`,
    [`${prefix}-${year}${month}-%`]
  )

  let sequence = 1
  if (result.rows.length > 0) {
    const lastNumber = result.rows[0].invoice_number
    const lastSequence = parseInt(lastNumber.split('-').pop() || "0")
    sequence = lastSequence + 1
  }

  return `${prefix}-${year}${month}-${String(sequence).padStart(6, '0')}`
}

// Generate unique batch number
export async function generateBatchNumber(type: string = "BATCH"): Promise<string> {
  const year = new Date().getFullYear()
  const month = String(new Date().getMonth() + 1).padStart(2, '0')
  const day = String(new Date().getDate()).padStart(2, '0')
  
  // Get the latest batch number for today
  const result = await pool.query(
    `SELECT batch_number FROM claim_batches 
     WHERE batch_number LIKE $1 
     ORDER BY created_at DESC LIMIT 1`,
    [`${type}-${year}${month}${day}-%`]
  )

  let sequence = 1
  if (result.rows.length > 0) {
    const lastNumber = result.rows[0].batch_number
    const lastSequence = parseInt(lastNumber.split('-').pop() || "0")
    sequence = lastSequence + 1
  }

  return `${type}-${year}${month}${day}-${String(sequence).padStart(4, '0')}`
}

// Generate claim number
export async function generateClaimNumber(): Promise<string> {
  const year = new Date().getFullYear()
  const month = String(new Date().getMonth() + 1).padStart(2, '0')
  
  // Get the latest claim number for this month
  const result = await pool.query(
    `SELECT claim_number FROM claims 
     WHERE claim_number LIKE $1 
     ORDER BY created_at DESC LIMIT 1`,
    [`CLM-${year}${month}-%`]
  )

  let sequence = 1
  if (result.rows.length > 0) {
    const lastNumber = result.rows[0].claim_number
    const lastSequence = parseInt(lastNumber.split('-').pop() || "0")
    sequence = lastSequence + 1
  }

  return `CLM-${year}${month}-${String(sequence).padStart(6, '0')}`
}

// Validate SHA member number format
export function validateSHAMemberNumber(memberNumber: string): boolean {
  // SHA member number format: XXXXXXXXX (9 digits)
  const shaPattern = /^\d{9}$/
  return shaPattern.test(memberNumber)
}

// Get SHA service codes mapping
export function getSHAServiceCode(serviceType: string, itemType: string): string {
  const serviceCodes: Record<string, Record<string, string>> = {
    consultation: {
      general: "CON001",
      specialist: "CON002",
      emergency: "CON003"
    },
    medication: {
      tablet: "MED001",
      injection: "MED002",
      syrup: "MED003",
      ointment: "MED004"
    },
    lab_test: {
      blood: "LAB001",
      urine: "LAB002",
      stool: "LAB003",
      xray: "LAB004",
      ultrasound: "LAB005"
    },
    procedure: {
      minor: "PRO001",
      major: "PRO002",
      surgical: "PRO003"
    }
  }

  return serviceCodes[serviceType]?.[itemType] || "OTH001"
}

// Format currency for SHA invoices
export function formatSHACurrency(amount: number): string {
  return new Intl.NumberFormat('en-KE', {
    style: 'currency',
    currency: 'KES',
    minimumFractionDigits: 2
  }).format(amount)
}

// Calculate invoice due date based on SHA payment terms
export function calculateInvoiceDueDate(invoiceDate: Date, paymentTerms: number = 30): Date {
  const dueDate = new Date(invoiceDate)
  dueDate.setDate(dueDate.getDate() + paymentTerms)
  return dueDate
}

// Generate invoice reference number for tracking
export function generateInvoiceReference(invoiceNumber: string, providerCode: string): string {
  const timestamp = Date.now().toString().slice(-6)
  return `${providerCode}-${invoiceNumber.replace(/[^A-Z0-9]/g, '')}-${timestamp}`
}

// Validate diagnosis code (ICD-10 format)
export function validateDiagnosisCode(code: string): boolean {
  // Basic ICD-10 pattern: Letter followed by 2-3 digits, optionally followed by dot and more digits/letters
  const icd10Pattern = /^[A-Z]\d{2,3}(\.\d{1,4})?$/
  return icd10Pattern.test(code)
}

// Calculate aging for invoices
export function calculateInvoiceAging(invoiceDate: Date): string {
  const now = new Date()
  const diffTime = Math.abs(now.getTime() - invoiceDate.getTime())
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

  if (diffDays <= 30) return "0-30"
  if (diffDays <= 60) return "31-60"
  if (diffDays <= 90) return "61-90"
  return "90+"
}

// Generate compliance checklist for invoice
export function generateComplianceChecklist(invoice: any): string[] {
  const checklist: string[] = []

  if (!invoice.claim_number) {
    checklist.push("Missing claim number")
  }
  
  if (!invoice.member_number || !validateSHAMemberNumber(invoice.member_number)) {
    checklist.push("Invalid SHA member number")
  }
  
  if (!invoice.diagnosis_code || !validateDiagnosisCode(invoice.diagnosis_code)) {
    checklist.push("Invalid diagnosis code")
  }
  
  if (!invoice.visit_date || new Date(invoice.visit_date) > new Date()) {
    checklist.push("Invalid visit date")
  }
  
  if (!invoice.total_amount || invoice.total_amount <= 0) {
    checklist.push("Invalid total amount")
  }

  return checklist
}
