import express from 'express'
import { DarajaMpesaService, MpesaPaymentRequest } from '../services/DarajaMpesaService'
import { PaymentRecordingService } from '../services/PaymentRecordingService'
import { authenticateToken } from '../middleware/auth'
import { AuthenticatedRequest } from '../types'

const router = express.Router()
const mpesaService = new DarajaMpesaService()
const paymentService = new PaymentRecordingService()

// Get M-Pesa configuration status
router.get('/mpesa/config', authenticateToken, async (req: AuthenticatedRequest, res) => {
  try {
    const configSummary = mpesaService.getConfigSummary()
    const validation = mpesaService.validateConfig()
    
    res.json({
      success: true,
      data: {
        ...configSummary,
        validation
      }
    })
  } catch (error: any) {
    console.error('❌ Error getting M-Pesa config:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to get M-Pesa configuration'
    })
  }
})

// Update M-Pesa configuration (Admin only)
router.post('/mpesa/config', authenticateToken, async (req: AuthenticatedRequest, res) => {
  try {
    if (req.user?.role !== 'ADMIN') {
      return res.status(403).json({
        success: false,
        error: 'Only administrators can update M-Pesa configuration'
      })
    }

    const { tillNumber, paybillNumber, environment, accountReference, transactionDesc } = req.body
    
    mpesaService.updateConfig({
      tillNumber,
      paybillNumber,
      environment,
      accountReference,
      transactionDesc
    })

    res.json({
      success: true,
      message: 'M-Pesa configuration updated successfully'
    })
  } catch (error: any) {
    console.error('❌ Error updating M-Pesa config:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to update M-Pesa configuration'
    })
  }
})

// Initiate M-Pesa payment
router.post('/mpesa/initiate', authenticateToken, async (req: AuthenticatedRequest, res) => {
  try {
    const { amount, phoneNumber, accountReference, transactionDesc, invoiceId, patientId } = req.body

    // Validate input
    if (!amount || !phoneNumber) {
      return res.status(400).json({
        success: false,
        error: 'Amount and phone number are required'
      })
    }

    const paymentRequest: MpesaPaymentRequest = {
      amount: parseFloat(amount),
      phoneNumber,
      accountReference: accountReference || `INV-${invoiceId}`,
      transactionDesc: transactionDesc || 'Medical Services Payment',
      invoiceId,
      patientId
    }

    const response = await mpesaService.initiatePayment(paymentRequest)

    // Store pending payment record
    const pendingPayment = {
      invoiceId,
      patientId,
      amount: paymentRequest.amount,
      paymentMethod: 'MPESA' as const,
      paymentStatus: 'PENDING' as const,
      mpesaTransactionId: response.checkoutRequestId,
      phoneNumber,
      transactionDate: new Date(),
      recordedBy: req.user?.id || '',
      recordedAt: new Date()
    }

    // Store in database as pending
    const query = `
      INSERT INTO payments (
        invoice_id, patient_id, amount, payment_method, payment_status,
        mpesa_transaction_id, phone_number, transaction_date, recorded_by, recorded_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING id
    `

    const values = [
      pendingPayment.invoiceId,
      pendingPayment.patientId,
      pendingPayment.amount,
      pendingPayment.paymentMethod,
      pendingPayment.paymentStatus,
      pendingPayment.mpesaTransactionId,
      pendingPayment.phoneNumber,
      pendingPayment.transactionDate,
      pendingPayment.recordedBy,
      pendingPayment.recordedAt
    ]

    await paymentService.db.query(query, values)

    res.json({
      success: true,
      data: response,
      message: 'M-Pesa payment initiated. Customer will receive STK push on their phone.'
    })
  } catch (error: any) {
    console.error('❌ Error initiating M-Pesa payment:', error)
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to initiate M-Pesa payment'
    })
  }
})

// M-Pesa callback endpoint (for Daraja to call)
router.post('/mpesa/callback', async (req, res) => {
  try {
    console.log('📨 M-Pesa callback received:', JSON.stringify(req.body, null, 2))

    const callbackData = await mpesaService.processCallback(req.body)
    
    // Find the pending payment
    const query = 'SELECT * FROM payments WHERE mpesa_transaction_id = $1 AND payment_status = $2'
    const result = await paymentService.db.query(query, [callbackData.checkoutRequestId, 'PENDING'])
    
    if (result.rows.length > 0) {
      const pendingPayment = result.rows[0]
      
      // Record the completed payment
      await paymentService.recordMpesaPayment(
        callbackData,
        pendingPayment.invoice_id,
        pendingPayment.patient_id,
        pendingPayment.recorded_by
      )
    }

    // Always respond with success to Daraja
    res.json({
      ResultCode: 0,
      ResultDesc: 'Success'
    })
  } catch (error: any) {
    console.error('❌ Error processing M-Pesa callback:', error)
    
    // Still respond with success to avoid retries
    res.json({
      ResultCode: 0,
      ResultDesc: 'Success'
    })
  }
})

// Query M-Pesa payment status
router.get('/mpesa/status/:checkoutRequestId', authenticateToken, async (req: AuthenticatedRequest, res) => {
  try {
    const { checkoutRequestId } = req.params
    
    const status = await mpesaService.queryPaymentStatus(checkoutRequestId)
    
    res.json({
      success: true,
      data: status
    })
  } catch (error: any) {
    console.error('❌ Error querying M-Pesa status:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to query payment status'
    })
  }
})

// Record cash payment
router.post('/cash', authenticateToken, async (req: AuthenticatedRequest, res) => {
  try {
    const { invoiceId, patientId, amount, receiptNumber } = req.body

    if (!invoiceId || !patientId || !amount) {
      return res.status(400).json({
        success: false,
        error: 'Invoice ID, patient ID, and amount are required'
      })
    }

    const payment = await paymentService.recordCashPayment(
      invoiceId,
      patientId,
      parseFloat(amount),
      req.user?.id || '',
      receiptNumber
    )

    res.json({
      success: true,
      data: payment,
      message: 'Cash payment recorded successfully'
    })
  } catch (error: any) {
    console.error('❌ Error recording cash payment:', error)
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to record cash payment'
    })
  }
})

// Generate SHA invoice
router.post('/sha/invoice', authenticateToken, async (req: AuthenticatedRequest, res) => {
  try {
    const { patientId, services } = req.body

    if (!patientId || !services || !Array.isArray(services)) {
      return res.status(400).json({
        success: false,
        error: 'Patient ID and services array are required'
      })
    }

    const invoice = await paymentService.generateSHAInvoice(
      patientId,
      services,
      req.user?.id || ''
    )

    res.json({
      success: true,
      data: invoice,
      message: 'SHA invoice generated successfully'
    })
  } catch (error: any) {
    console.error('❌ Error generating SHA invoice:', error)
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to generate SHA invoice'
    })
  }
})

// Record SHA invoice submission
router.post('/sha/submit/:invoiceId', authenticateToken, async (req: AuthenticatedRequest, res) => {
  try {
    const { invoiceId } = req.params
    const { batchId } = req.body

    await paymentService.recordSHAInvoiceSubmission(
      invoiceId,
      req.user?.id || '',
      batchId
    )

    res.json({
      success: true,
      message: 'SHA invoice submission recorded successfully'
    })
  } catch (error: any) {
    console.error('❌ Error recording SHA submission:', error)
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to record SHA submission'
    })
  }
})

// Get SHA invoices (for receptionist)
router.get('/sha/invoices', authenticateToken, async (req: AuthenticatedRequest, res) => {
  try {
    const { status, limit } = req.query
    
    const invoices = await paymentService.getSHAInvoices(
      status as string,
      limit ? parseInt(limit as string) : 50
    )

    res.json({
      success: true,
      data: invoices
    })
  } catch (error: any) {
    console.error('❌ Error getting SHA invoices:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to get SHA invoices'
    })
  }
})

// Get payment records for an invoice
router.get('/invoice/:invoiceId', authenticateToken, async (req: AuthenticatedRequest, res) => {
  try {
    const { invoiceId } = req.params
    
    const payments = await paymentService.getPaymentRecords(invoiceId)

    res.json({
      success: true,
      data: payments
    })
  } catch (error: any) {
    console.error('❌ Error getting payment records:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to get payment records'
    })
  }
})

// Generate payment evidence
router.get('/evidence/:paymentId', authenticateToken, async (req: AuthenticatedRequest, res) => {
  try {
    const { paymentId } = req.params
    
    const evidence = await paymentService.generatePaymentEvidence(paymentId)

    res.json({
      success: true,
      data: {
        evidence,
        generatedAt: new Date()
      }
    })
  } catch (error: any) {
    console.error('❌ Error generating payment evidence:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to generate payment evidence'
    })
  }
})

// Get payment statistics
router.get('/statistics', authenticateToken, async (req: AuthenticatedRequest, res) => {
  try {
    const { startDate, endDate } = req.query
    
    const start = startDate ? new Date(startDate as string) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) // 30 days ago
    const end = endDate ? new Date(endDate as string) : new Date()
    
    const statistics = await paymentService.getPaymentStatistics(start, end)

    res.json({
      success: true,
      data: statistics
    })
  } catch (error: any) {
    console.error('❌ Error getting payment statistics:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to get payment statistics'
    })
  }
})

export default router
