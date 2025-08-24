import express from "express"
import { body, query, validationResult } from "express-validator"
import { authorize, type AuthenticatedRequest } from "../middleware/auth"
import { UserRole } from "../types"
import { pool } from "../config/database"
import { generateInvoiceNumber, formatSHACurrency, calculateInvoiceDueDate } from "../utils/invoiceUtils"
import { SHAService } from "../services/SHAService"

const router = express.Router()
const shaService = new SHAService()

// Get all SHA invoices with pagination and filtering
router.get(
  "/",
  authorize([UserRole.ADMIN, UserRole.CLAIMS_MANAGER, UserRole.CLINICAL_OFFICER]),
  [
    query("page").optional().isInt({ min: 1 }).withMessage("Page must be a positive integer"),
    query("limit").optional().isInt({ min: 1, max: 100 }).withMessage("Limit must be between 1 and 100"),
    query("status").optional().isString().withMessage("Status must be a string"),
    query("startDate").optional().isISO8601().withMessage("Start date must be valid"),
    query("endDate").optional().isISO8601().withMessage("End date must be valid"),
    query("search").optional().isString().withMessage("Search must be a string"),
  ],
  async (req: AuthenticatedRequest, res) => {
    try {
      const errors = validationResult(req)
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          errors: errors.array().map(err => err.msg)
        })
      }

      const page = parseInt(req.query.page as string) || 1
      const limit = parseInt(req.query.limit as string) || 20
      const offset = (page - 1) * limit
      const { status, startDate, endDate, search } = req.query

      let whereClause = "WHERE 1=1"
      const params: any[] = []
      let paramCount = 0

      if (status) {
        paramCount++
        whereClause += ` AND i.status = $${paramCount}`
        params.push(status)
      }

      if (startDate) {
        paramCount++
        whereClause += ` AND i.invoice_date >= $${paramCount}`
        params.push(startDate)
      }

      if (endDate) {
        paramCount++
        whereClause += ` AND i.invoice_date <= $${paramCount}`
        params.push(endDate)
      }

      if (search) {
        paramCount++
        whereClause += ` AND (i.invoice_number ILIKE $${paramCount} OR p.first_name ILIKE $${paramCount} OR p.last_name ILIKE $${paramCount} OR p.op_number ILIKE $${paramCount})`
        params.push(`%${search}%`)
      }

      const result = await pool.query(
        `SELECT 
          i.*,
          c.claim_number,
          p.op_number,
          p.first_name,
          p.last_name,
          p.insurance_number,
          u.username as generated_by_username
         FROM sha_invoices i
         JOIN sha_claims c ON i.claim_id = c.id
         JOIN patients p ON i.patient_id = p.id
         JOIN users u ON i.generated_by = u.id
         ${whereClause}
         ORDER BY i.created_at DESC
         LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}`,
        [...params, limit, offset]
      )

      const countResult = await pool.query(
        `SELECT COUNT(*) as total
         FROM sha_invoices i
         JOIN sha_claims c ON i.claim_id = c.id
         JOIN patients p ON i.patient_id = p.id
         ${whereClause}`,
        params
      )

      const total = parseInt(countResult.rows[0].total)

      res.json({
        success: true,
        data: {
          invoices: result.rows,
          pagination: {
            page,
            limit,
            total,
            totalPages: Math.ceil(total / limit)
          }
        }
      })
    } catch (error) {
      console.error("Error fetching SHA invoices:", error)
      res.status(500).json({
        success: false,
        message: "Failed to fetch SHA invoices"
      })
    }
  }
)

// Get invoice by ID with full details
router.get(
  "/:id",
  authorize([UserRole.ADMIN, UserRole.CLAIMS_MANAGER, UserRole.CLINICAL_OFFICER]),
  async (req: AuthenticatedRequest, res) => {
    try {
      const { id } = req.params
      
      const invoiceData = await shaService.getInvoiceForPrinting(id)
      
      if (!invoiceData) {
        return res.status(404).json({
          success: false,
          message: "Invoice not found"
        })
      }

      res.json({
        success: true,
        data: invoiceData
      })
    } catch (error) {
      console.error("Error fetching SHA invoice:", error)
      res.status(500).json({
        success: false,
        message: "Failed to fetch SHA invoice"
      })
    }
  }
)

// CORRECTED WORKFLOW: Generate invoice for clinic records BEFORE submission
router.post(
  "/generate/:claimId",
  authorize([UserRole.ADMIN, UserRole.CLAIMS_MANAGER, UserRole.CLINICAL_OFFICER]),
  async (req: AuthenticatedRequest, res) => {
    try {
      const { claimId } = req.params

      // Generate invoice for clinic records before submission
      const result = await shaService.generateInvoiceForClaim(claimId, req.user!.id)

      res.status(201).json({
        success: true,
        data: result.invoice,
        message: result.message
      })
    } catch (error) {
      console.error("Error generating SHA invoice:", error)
      res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : "Failed to generate SHA invoice"
      })
    }
  }
)

// CORRECTED WORKFLOW: Submit claim to SHA (locks invoice)
router.post(
  "/submit/:claimId",
  authorize([UserRole.ADMIN, UserRole.CLAIMS_MANAGER]),
  async (req: AuthenticatedRequest, res) => {
    try {
      const { claimId } = req.params

      // Submit claim to SHA (this will lock the invoice)
      const result = await shaService.submitSingleClaim(claimId, req.user!.id)

      res.json({
        success: true,
        data: result.data,
        message: result.message
      })
    } catch (error) {
      console.error("Error submitting claim to SHA:", error)
      res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : "Failed to submit claim to SHA"
      })
    }
  }
)

// Get invoices ready for review/printing (before submission)
router.get(
  "/ready-for-review",
  authorize([UserRole.ADMIN, UserRole.CLAIMS_MANAGER, UserRole.CLINICAL_OFFICER]),
  async (req: AuthenticatedRequest, res) => {
    try {
      const invoices = await shaService.getInvoicesReadyForReview()

      res.json({
        success: true,
        data: invoices,
        message: `Found ${invoices.length} invoices ready for review and printing`
      })
    } catch (error) {
      console.error("Error fetching invoices ready for review:", error)
      res.status(500).json({
        success: false,
        message: "Failed to fetch invoices ready for review"
      })
    }
  }
)

// Get submitted invoices (archived, read-only)
router.get(
  "/submitted-archive",
  authorize([UserRole.ADMIN, UserRole.CLAIMS_MANAGER]),
  [
    query("startDate").optional().isISO8601().withMessage("Start date must be valid"),
    query("endDate").optional().isISO8601().withMessage("End date must be valid"),
  ],
  async (req: AuthenticatedRequest, res) => {
    try {
      const errors = validationResult(req)
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          errors: errors.array().map(err => err.msg)
        })
      }

      const { startDate, endDate } = req.query
      const invoices = await shaService.getSubmittedInvoices(
        startDate ? new Date(startDate as string) : undefined,
        endDate ? new Date(endDate as string) : undefined
      )

      res.json({
        success: true,
        data: invoices,
        message: `Found ${invoices.length} submitted invoices in archive`
      })
    } catch (error) {
      console.error("Error fetching submitted invoices:", error)
      res.status(500).json({
        success: false,
        message: "Failed to fetch submitted invoices"
      })
    }
  }
)

// Generate invoices for batch
router.post(
  "/generate/batch/:batchId",
  authorize([UserRole.ADMIN, UserRole.CLAIMS_MANAGER]),
  async (req: AuthenticatedRequest, res) => {
    try {
      const { batchId } = req.params

      // Check if batch exists
      const batchResult = await pool.query(
        `SELECT * FROM sha_claim_batches WHERE id = $1`,
        [batchId]
      )

      if (batchResult.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: "Batch not found"
        })
      }

      // Generate invoices for all claims in batch
      const invoices = await shaService.generateInvoicesForBatch(batchId, req.user!.id)

      res.status(201).json({
        success: true,
        data: invoices,
        message: `Generated ${invoices.length} invoices successfully`
      })
    } catch (error) {
      console.error("Error generating batch invoices:", error)
      res.status(500).json({
        success: false,
        message: "Failed to generate batch invoices"
      })
    }
  }
)

// Mark invoice as printed
router.patch(
  "/:id/print",
  authorize([UserRole.ADMIN, UserRole.CLAIMS_MANAGER, UserRole.CLINICAL_OFFICER]),
  async (req: AuthenticatedRequest, res) => {
    try {
      const { id } = req.params

      await shaService.markInvoiceAsPrinted(id, req.user!.id)

      res.json({
        success: true,
        message: "Invoice marked as printed successfully"
      })
    } catch (error) {
      console.error("Error marking invoice as printed:", error)
      res.status(500).json({
        success: false,
        message: "Failed to mark invoice as printed"
      })
    }
  }
)

// Submit invoice to SHA
router.patch(
  "/:id/submit",
  authorize([UserRole.ADMIN, UserRole.CLAIMS_MANAGER]),
  async (req: AuthenticatedRequest, res) => {
    try {
      const { id } = req.params

      const result = await shaService.submitInvoiceToSHA(id, req.user!.id)

      if (result.success) {
        res.json({
          success: true,
          data: result.data,
          message: "Invoice submitted to SHA successfully"
        })
      } else {
        res.status(400).json({
          success: false,
          message: "Failed to submit invoice to SHA",
          error: result.error
        })
      }
    } catch (error) {
      console.error("Error submitting invoice to SHA:", error)
      res.status(500).json({
        success: false,
        message: "Failed to submit invoice to SHA"
      })
    }
  }
)

// Get invoices ready for printing (weekly/monthly batches)
router.get(
  "/ready-for-printing/:batchType",
  authorize([UserRole.ADMIN, UserRole.CLAIMS_MANAGER]),
  async (req: AuthenticatedRequest, res) => {
    try {
      const { batchType } = req.params

      if (!["weekly", "monthly"].includes(batchType)) {
        return res.status(400).json({
          success: false,
          message: "Invalid batch type. Must be 'weekly' or 'monthly'"
        })
      }

      const invoices = await shaService.getInvoicesReadyForPrinting(batchType as "weekly" | "monthly")

      res.json({
        success: true,
        data: invoices,
        message: `Found ${invoices.length} invoices ready for printing`
      })
    } catch (error) {
      console.error("Error fetching invoices ready for printing:", error)
      res.status(500).json({
        success: false,
        message: "Failed to fetch invoices ready for printing"
      })
    }
  }
)

// Get compliance report
router.get(
  "/compliance/report",
  authorize([UserRole.ADMIN, UserRole.CLAIMS_MANAGER]),
  [
    query("startDate").isISO8601().withMessage("Start date is required and must be valid"),
    query("endDate").isISO8601().withMessage("End date is required and must be valid"),
  ],
  async (req: AuthenticatedRequest, res) => {
    try {
      const errors = validationResult(req)
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          errors: errors.array().map(err => err.msg)
        })
      }

      const { startDate, endDate } = req.query

      const report = await shaService.getComplianceReport(
        new Date(startDate as string),
        new Date(endDate as string)
      )

      // Calculate summary statistics
      const summary = {
        totalClaims: report.length,
        totalInvoicesGenerated: report.filter((r: any) => r.invoice_number).length,
        totalInvoicesPrinted: report.filter((r: any) => r.printed_at).length,
        totalInvoicesSubmitted: report.filter((r: any) => r.submitted_at).length,
        complianceIssues: report.filter((r: any) => r.compliance_status === 'rejected').length,
        pendingCompliance: report.filter((r: any) => r.compliance_status === 'pending').length
      }

      res.json({
        success: true,
        data: {
          summary,
          details: report
        }
      })
    } catch (error) {
      console.error("Error generating compliance report:", error)
      res.status(500).json({
        success: false,
        message: "Failed to generate compliance report"
      })
    }
  }
)

// Bulk print invoices (mark multiple as printed)
router.patch(
  "/bulk/print",
  authorize([UserRole.ADMIN, UserRole.CLAIMS_MANAGER]),
  [
    body("invoiceIds").isArray({ min: 1 }).withMessage("Invoice IDs array is required"),
    body("invoiceIds.*").isUUID().withMessage("All invoice IDs must be valid UUIDs"),
  ],
  async (req: AuthenticatedRequest, res) => {
    try {
      const errors = validationResult(req)
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          errors: errors.array().map(err => err.msg)
        })
      }

      const { invoiceIds } = req.body
      const results = []

      for (const invoiceId of invoiceIds) {
        try {
          await shaService.markInvoiceAsPrinted(invoiceId, req.user!.id)
          results.push({ invoiceId, success: true })
        } catch (error) {
          results.push({ 
            invoiceId, 
            success: false, 
            error: error instanceof Error ? error.message : "Unknown error" 
          })
        }
      }

      const successful = results.filter(r => r.success).length
      const failed = results.filter(r => !r.success).length

      res.json({
        success: true,
        data: {
          total: invoiceIds.length,
          successful,
          failed,
          results
        },
        message: `Bulk print completed: ${successful} successful, ${failed} failed`
      })
    } catch (error) {
      console.error("Error bulk printing invoices:", error)
      res.status(500).json({
        success: false,
        message: "Failed to bulk print invoices"
      })
    }
  }
)

// Get audit trail for specific invoice
router.get(
  "/:id/audit",
  authorize([UserRole.ADMIN, UserRole.CLAIMS_MANAGER]),
  async (req: AuthenticatedRequest, res) => {
    try {
      const { id } = req.params

      const result = await pool.query(
        `SELECT 
          at.*,
          u.username as performed_by_username
         FROM sha_audit_trail at
         JOIN users u ON at.performed_by = u.id
         WHERE at.invoice_id = $1
         ORDER BY at.performed_at DESC`,
        [id]
      )

      res.json({
        success: true,
        data: result.rows
      })
    } catch (error) {
      console.error("Error fetching audit trail:", error)
      res.status(500).json({
        success: false,
        message: "Failed to fetch audit trail"
      })
    }
  }
)

export default router
