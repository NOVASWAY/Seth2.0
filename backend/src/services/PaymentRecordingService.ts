import { DatabaseService } from './DatabaseService'
import { MpesaCallbackData } from './DarajaMpesaService'

export interface PaymentRecord {
  id: string
  invoiceId: string
  patientId: string
  amount: number
  paymentMethod: 'CASH' | 'MPESA' | 'SHA' | 'INSURANCE'
  paymentStatus: 'PENDING' | 'COMPLETED' | 'FAILED' | 'CANCELLED'
  mpesaReceiptNumber?: string
  mpesaTransactionId?: string
  phoneNumber?: string
  transactionDate: Date
  recordedBy: string
  recordedAt: Date
  evidence?: PaymentEvidence
  shaClaimNumber?: string
  insuranceProvider?: string
}

export interface PaymentEvidence {
  type: 'MPESA_RECEIPT' | 'SHA_INVOICE' | 'CASH_RECEIPT' | 'INSURANCE_CLAIM'
  documentUrl?: string
  receiptNumber: string
  amount: number
  transactionDate: Date
  additionalData?: any
}

export interface SHAInvoice {
  id: string
  invoiceNumber: string
  patientId: string
  patientName: string
  patientIdNumber: string
  shaNumber: string
  serviceDate: Date
  services: SHAService[]
  totalAmount: number
  status: 'GENERATED' | 'SUBMITTED' | 'APPROVED' | 'PAID' | 'REJECTED'
  generatedBy: string
  generatedAt: Date
  submittedAt?: Date
  approvedAt?: Date
  paidAt?: Date
  rejectionReason?: string
  batchId?: string
}

export interface SHAService {
  serviceCode: string
  serviceName: string
  quantity: number
  unitPrice: number
  totalPrice: number
  diagnosisCode?: string
  procedureCode?: string
}

export class PaymentRecordingService {
  public db: DatabaseService

  constructor() {
    this.db = DatabaseService.getInstance()
  }

  // Record M-Pesa payment automatically
  async recordMpesaPayment(
    callbackData: MpesaCallbackData,
    invoiceId: string,
    patientId: string,
    recordedBy: string
  ): Promise<PaymentRecord> {
    try {
      const paymentRecord: Omit<PaymentRecord, 'id'> = {
        invoiceId,
        patientId,
        amount: callbackData.amount || 0,
        paymentMethod: 'MPESA',
        paymentStatus: callbackData.resultCode === 0 ? 'COMPLETED' : 'FAILED',
        mpesaReceiptNumber: callbackData.mpesaReceiptNumber,
        mpesaTransactionId: callbackData.checkoutRequestId,
        phoneNumber: callbackData.phoneNumber,
        transactionDate: callbackData.transactionDate ? new Date(callbackData.transactionDate) : new Date(),
        recordedBy,
        recordedAt: new Date(),
        evidence: {
          type: 'MPESA_RECEIPT',
          receiptNumber: callbackData.mpesaReceiptNumber || callbackData.checkoutRequestId,
          amount: callbackData.amount || 0,
          transactionDate: callbackData.transactionDate ? new Date(callbackData.transactionDate) : new Date(),
          additionalData: {
            merchantRequestId: callbackData.merchantRequestId,
            checkoutRequestId: callbackData.checkoutRequestId,
            resultDesc: callbackData.resultDesc
          }
        }
      }

      // Insert into database
      const query = `
        INSERT INTO payments (
          invoice_id, patient_id, amount, payment_method, payment_status,
          mpesa_receipt_number, mpesa_transaction_id, phone_number, transaction_date,
          recorded_by, recorded_at, evidence_type, evidence_data
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
        RETURNING *
      `

      const values = [
        paymentRecord.invoiceId,
        paymentRecord.patientId,
        paymentRecord.amount,
        paymentRecord.paymentMethod,
        paymentRecord.paymentStatus,
        paymentRecord.mpesaReceiptNumber,
        paymentRecord.mpesaTransactionId,
        paymentRecord.phoneNumber,
        paymentRecord.transactionDate,
        paymentRecord.recordedBy,
        paymentRecord.recordedAt,
        paymentRecord.evidence?.type,
        JSON.stringify(paymentRecord.evidence)
      ]

      const result = await this.db.query(query, values)
      
      // Update invoice status if payment completed
      if (paymentRecord.paymentStatus === 'COMPLETED') {
        await this.updateInvoicePaymentStatus(invoiceId, 'PAID')
      }

      console.log('✅ M-Pesa payment recorded:', result.rows[0])
      return { id: result.rows[0].id, ...paymentRecord }
    } catch (error: any) {
      console.error('❌ Failed to record M-Pesa payment:', error)
      throw new Error(`Failed to record payment: ${error.message}`)
    }
  }

  // Generate SHA invoice for receptionist recording
  async generateSHAInvoice(
    patientId: string,
    services: SHAService[],
    generatedBy: string
  ): Promise<SHAInvoice> {
    try {
      // Get patient details
      const patientQuery = 'SELECT * FROM patients WHERE id = $1'
      const patientResult = await this.db.query(patientQuery, [patientId])
      
      if (patientResult.rows.length === 0) {
        throw new Error('Patient not found')
      }

      const patient = patientResult.rows[0]
      const totalAmount = services.reduce((sum, service) => sum + service.totalPrice, 0)
      const invoiceNumber = this.generateSHAInvoiceNumber()

      const shaInvoice: Omit<SHAInvoice, 'id'> = {
        invoiceNumber,
        patientId,
        patientName: `${patient.first_name} ${patient.last_name}`,
        patientIdNumber: patient.id_number,
        shaNumber: patient.sha_number || patient.insurance_number,
        serviceDate: new Date(),
        services,
        totalAmount,
        status: 'GENERATED',
        generatedBy,
        generatedAt: new Date()
      }

      // Insert SHA invoice
      const query = `
        INSERT INTO sha_invoices (
          invoice_number, patient_id, patient_name, patient_id_number, sha_number,
          service_date, services, total_amount, status, generated_by, generated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
        RETURNING *
      `

      const values = [
        shaInvoice.invoiceNumber,
        shaInvoice.patientId,
        shaInvoice.patientName,
        shaInvoice.patientIdNumber,
        shaInvoice.shaNumber,
        shaInvoice.serviceDate,
        JSON.stringify(shaInvoice.services),
        shaInvoice.totalAmount,
        shaInvoice.status,
        shaInvoice.generatedBy,
        shaInvoice.generatedAt
      ]

      const result = await this.db.query(query, values)
      
      console.log('✅ SHA invoice generated:', result.rows[0])
      return { id: result.rows[0].id, ...shaInvoice }
    } catch (error: any) {
      console.error('❌ Failed to generate SHA invoice:', error)
      throw new Error(`Failed to generate SHA invoice: ${error.message}`)
    }
  }

  // Record SHA invoice submission (for receptionist)
  async recordSHAInvoiceSubmission(
    invoiceId: string,
    submittedBy: string,
    batchId?: string
  ): Promise<void> {
    try {
      const query = `
        UPDATE sha_invoices 
        SET status = 'SUBMITTED', submitted_at = $1, batch_id = $2
        WHERE id = $3
      `
      
      await this.db.query(query, [new Date(), batchId, invoiceId])
      
      // Create audit log
      await this.createAuditLog({
        userId: submittedBy,
        action: 'SHA_INVOICE_SUBMITTED',
        entityType: 'SHA_INVOICE',
        entityId: invoiceId,
        details: { batchId }
      })

      console.log('✅ SHA invoice submission recorded')
    } catch (error: any) {
      console.error('❌ Failed to record SHA submission:', error)
      throw new Error(`Failed to record SHA submission: ${error.message}`)
    }
  }

  // Record cash payment
  async recordCashPayment(
    invoiceId: string,
    patientId: string,
    amount: number,
    recordedBy: string,
    receiptNumber?: string
  ): Promise<PaymentRecord> {
    try {
      const paymentRecord: Omit<PaymentRecord, 'id'> = {
        invoiceId,
        patientId,
        amount,
        paymentMethod: 'CASH',
        paymentStatus: 'COMPLETED',
        transactionDate: new Date(),
        recordedBy,
        recordedAt: new Date(),
        evidence: {
          type: 'CASH_RECEIPT',
          receiptNumber: receiptNumber || this.generateReceiptNumber(),
          amount,
          transactionDate: new Date()
        }
      }

      const query = `
        INSERT INTO payments (
          invoice_id, patient_id, amount, payment_method, payment_status,
          transaction_date, recorded_by, recorded_at, evidence_type, evidence_data
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        RETURNING *
      `

      const values = [
        paymentRecord.invoiceId,
        paymentRecord.patientId,
        paymentRecord.amount,
        paymentRecord.paymentMethod,
        paymentRecord.paymentStatus,
        paymentRecord.transactionDate,
        paymentRecord.recordedBy,
        paymentRecord.recordedAt,
        paymentRecord.evidence?.type,
        JSON.stringify(paymentRecord.evidence)
      ]

      const result = await this.db.query(query, values)
      
      // Update invoice status
      await this.updateInvoicePaymentStatus(invoiceId, 'PAID')

      console.log('✅ Cash payment recorded')
      return { id: result.rows[0].id, ...paymentRecord }
    } catch (error: any) {
      console.error('❌ Failed to record cash payment:', error)
      throw new Error(`Failed to record payment: ${error.message}`)
    }
  }

  // Get payment records for an invoice
  async getPaymentRecords(invoiceId: string): Promise<PaymentRecord[]> {
    try {
      const query = `
        SELECT * FROM payments 
        WHERE invoice_id = $1 
        ORDER BY recorded_at DESC
      `
      
      const result = await this.db.query(query, [invoiceId])
      
      return result.rows.map(row => ({
        id: row.id,
        invoiceId: row.invoice_id,
        patientId: row.patient_id,
        amount: parseFloat(row.amount),
        paymentMethod: row.payment_method,
        paymentStatus: row.payment_status,
        mpesaReceiptNumber: row.mpesa_receipt_number,
        mpesaTransactionId: row.mpesa_transaction_id,
        phoneNumber: row.phone_number,
        transactionDate: new Date(row.transaction_date),
        recordedBy: row.recorded_by,
        recordedAt: new Date(row.recorded_at),
        evidence: row.evidence_data ? JSON.parse(row.evidence_data) : undefined,
        shaClaimNumber: row.sha_claim_number,
        insuranceProvider: row.insurance_provider
      }))
    } catch (error: any) {
      console.error('❌ Failed to get payment records:', error)
      throw new Error(`Failed to get payment records: ${error.message}`)
    }
  }

  // Get SHA invoices for receptionist
  async getSHAInvoices(status?: string, limit: number = 50): Promise<SHAInvoice[]> {
    try {
      let query = `
        SELECT * FROM sha_invoices 
        ${status ? 'WHERE status = $1' : ''}
        ORDER BY generated_at DESC 
        LIMIT ${limit}
      `
      
      const values = status ? [status] : []
      const result = await this.db.query(query, values)
      
      return result.rows.map(row => ({
        id: row.id,
        invoiceNumber: row.invoice_number,
        patientId: row.patient_id,
        patientName: row.patient_name,
        patientIdNumber: row.patient_id_number,
        shaNumber: row.sha_number,
        serviceDate: new Date(row.service_date),
        services: JSON.parse(row.services),
        totalAmount: parseFloat(row.total_amount),
        status: row.status,
        generatedBy: row.generated_by,
        generatedAt: new Date(row.generated_at),
        submittedAt: row.submitted_at ? new Date(row.submitted_at) : undefined,
        approvedAt: row.approved_at ? new Date(row.approved_at) : undefined,
        paidAt: row.paid_at ? new Date(row.paid_at) : undefined,
        rejectionReason: row.rejection_reason,
        batchId: row.batch_id
      }))
    } catch (error: any) {
      console.error('❌ Failed to get SHA invoices:', error)
      throw new Error(`Failed to get SHA invoices: ${error.message}`)
    }
  }

  // Helper methods
  private async updateInvoicePaymentStatus(invoiceId: string, status: string): Promise<void> {
    const query = 'UPDATE invoices SET payment_status = $1, updated_at = $2 WHERE id = $3'
    await this.db.query(query, [status, new Date(), invoiceId])
  }

  private generateSHAInvoiceNumber(): string {
    const date = new Date()
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    const timestamp = Date.now().toString().slice(-6)
    
    return `SHA-${year}${month}${day}-${timestamp}`
  }

  private generateReceiptNumber(): string {
    const date = new Date()
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    const timestamp = Date.now().toString().slice(-6)
    
    return `RCP-${year}${month}${day}-${timestamp}`
  }

  private async createAuditLog(logData: {
    userId: string
    action: string
    entityType: string
    entityId: string
    details?: any
  }): Promise<void> {
    try {
      const query = `
        INSERT INTO audit_logs (user_id, action, entity_type, entity_id, details, created_at)
        VALUES ($1, $2, $3, $4, $5, $6)
      `
      
      await this.db.query(query, [
        logData.userId,
        logData.action,
        logData.entityType,
        logData.entityId,
        JSON.stringify(logData.details),
        new Date()
      ])
    } catch (error) {
      console.error('❌ Failed to create audit log:', error)
    }
  }

  // Generate payment evidence document
  async generatePaymentEvidence(paymentId: string): Promise<string> {
    try {
      const payment = await this.getPaymentById(paymentId)
      if (!payment) {
        throw new Error('Payment not found')
      }

      // Generate evidence document based on payment method
      switch (payment.paymentMethod) {
        case 'MPESA':
          return this.generateMpesaEvidence(payment)
        case 'SHA':
          return this.generateSHAEvidence(payment)
        case 'CASH':
          return this.generateCashEvidence(payment)
        default:
          throw new Error('Unsupported payment method for evidence generation')
      }
    } catch (error: any) {
      console.error('❌ Failed to generate payment evidence:', error)
      throw new Error(`Failed to generate evidence: ${error.message}`)
    }
  }

  private async getPaymentById(paymentId: string): Promise<PaymentRecord | null> {
    try {
      const query = 'SELECT * FROM payments WHERE id = $1'
      const result = await this.db.query(query, [paymentId])
      
      if (result.rows.length === 0) return null
      
      const row = result.rows[0]
      return {
        id: row.id,
        invoiceId: row.invoice_id,
        patientId: row.patient_id,
        amount: parseFloat(row.amount),
        paymentMethod: row.payment_method,
        paymentStatus: row.payment_status,
        mpesaReceiptNumber: row.mpesa_receipt_number,
        mpesaTransactionId: row.mpesa_transaction_id,
        phoneNumber: row.phone_number,
        transactionDate: new Date(row.transaction_date),
        recordedBy: row.recorded_by,
        recordedAt: new Date(row.recorded_at),
        evidence: row.evidence_data ? JSON.parse(row.evidence_data) : undefined
      }
    } catch (error: any) {
      console.error('❌ Failed to get payment by ID:', error)
      return null
    }
  }

  private async generateMpesaEvidence(payment: PaymentRecord): Promise<string> {
    // Generate M-Pesa receipt evidence
    const evidence = {
      type: 'MPESA_RECEIPT',
      receiptNumber: payment.mpesaReceiptNumber,
      amount: payment.amount,
      transactionDate: payment.transactionDate,
      phoneNumber: payment.phoneNumber,
      transactionId: payment.mpesaTransactionId,
      status: payment.paymentStatus,
      generatedAt: new Date()
    }

    // In a real implementation, you might generate a PDF or save to file storage
    // For now, we'll return a JSON evidence string
    return JSON.stringify(evidence, null, 2)
  }

  private async generateSHAEvidence(payment: PaymentRecord): Promise<string> {
    // Generate SHA claim evidence
    const evidence = {
      type: 'SHA_CLAIM',
      claimNumber: payment.shaClaimNumber,
      amount: payment.amount,
      transactionDate: payment.transactionDate,
      status: payment.paymentStatus,
      generatedAt: new Date()
    }

    return JSON.stringify(evidence, null, 2)
  }

  private async generateCashEvidence(payment: PaymentRecord): Promise<string> {
    // Generate cash receipt evidence
    const evidence = {
      type: 'CASH_RECEIPT',
      receiptNumber: payment.evidence?.receiptNumber,
      amount: payment.amount,
      transactionDate: payment.transactionDate,
      recordedBy: payment.recordedBy,
      generatedAt: new Date()
    }

    return JSON.stringify(evidence, null, 2)
  }

  // Get payment statistics for dashboard
  async getPaymentStatistics(startDate: Date, endDate: Date): Promise<any> {
    try {
      const query = `
        SELECT 
          payment_method,
          payment_status,
          COUNT(*) as count,
          SUM(amount) as total_amount
        FROM payments 
        WHERE transaction_date BETWEEN $1 AND $2
        GROUP BY payment_method, payment_status
        ORDER BY payment_method, payment_status
      `
      
      const result = await this.db.query(query, [startDate, endDate])
      
      return result.rows.reduce((stats, row) => {
        const method = row.payment_method.toLowerCase()
        if (!stats[method]) {
          stats[method] = { count: 0, amount: 0, byStatus: {} }
        }
        
        stats[method].count += parseInt(row.count)
        stats[method].amount += parseFloat(row.total_amount)
        stats[method].byStatus[row.payment_status] = {
          count: parseInt(row.count),
          amount: parseFloat(row.total_amount)
        }
        
        return stats
      }, {})
    } catch (error: any) {
      console.error('❌ Failed to get payment statistics:', error)
      throw new Error(`Failed to get payment statistics: ${error.message}`)
    }
  }
}
