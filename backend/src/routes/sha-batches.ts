import express from "express"
import { body, query, validationResult } from "express-validator"
import { authorize, type AuthenticatedRequest } from "../middleware/auth"
import { UserRole } from "../types"
import { pool } from "../config/database"
import { generateBatchNumber } from "../utils/invoiceUtils"
import { SHAService } from "../services/SHAService"

const router = express.Router()
const shaService = new SHAService()

// Get all SHA batches with pagination and filtering
router.get(
  "/",
  authorize([UserRole.ADMIN, UserRole.CLAIMS_MANAGER]),
  [
    query("page").optional().isInt({ min: 1 }).withMessage("Page must be a positive integer"),
    query("limit").optional().isInt({ min: 1, max: 100 }).withMessage("Limit must be between 1 and 100"),
    query("status").optional().isString().withMessage("Status must be a string"),
    query("batchType").optional().isString().withMessage("Batch type must be a string"),
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

      const page = parseInt(req.query.page as string) || 1
      const limit = parseInt(req.query.limit as string) || 20
      const offset = (page - 1) * limit
      const { status, batchType, startDate, endDate } = req.query

      let whereClause = "WHERE 1=1"
      const params: any[] = []
      let paramCount = 0

      if (status) {
        paramCount++
        whereClause += ` AND b.status = $${paramCount}`
        params.push(status)
      }

      if (batchType) {
        paramCount++
        whereClause += ` AND b.batch_type = $${paramCount}`
        params.push(batchType)
      }

      if (startDate) {
        paramCount++
        whereClause += ` AND b.batch_date >= $${paramCount}`
        params.push(startDate)
      }

      if (endDate) {
        paramCount++
        whereClause += ` AND b.batch_date <= $${paramCount}`
        params.push(endDate)
      }

      const result = await pool.query(
        `SELECT 
          b.*,
          u.username as created_by_username,
          COUNT(c.id) as actual_claims_count
         FROM sha_claim_batches b
         JOIN users u ON b.created_by = u.id
         LEFT JOIN sha_claims c ON c.batch_id = b.batch_number
         ${whereClause}
         GROUP BY b.id, u.username
         ORDER BY b.created_at DESC
         LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}`,
        [...params, limit, offset]
      )

      const countResult = await pool.query(
        `SELECT COUNT(DISTINCT b.id) as total
         FROM sha_claim_batches b
         ${whereClause}`,
        params
      )

      const total = parseInt(countResult.rows[0].total)

      res.json({
        success: true,
        data: {
          batches: result.rows,
          pagination: {
            page,
            limit,
            total,
            totalPages: Math.ceil(total / limit)
          }
        }
      })
    } catch (error) {
      console.error("Error fetching SHA batches:", error)
      res.status(500).json({
        success: false,
        message: "Failed to fetch SHA batches"
      })
    }
  }
)

// Create new batch (weekly, monthly, or custom)
router.post(
  "/",
  authorize([UserRole.ADMIN, UserRole.CLAIMS_MANAGER]),
  [
    body("batchType").isIn(["weekly", "monthly", "custom"]).withMessage("Invalid batch type"),
    body("batchDate").optional().isISO8601().withMessage("Batch date must be valid"),
    body("claimIds").optional().isArray().withMessage("Claim IDs must be an array"),
    body("claimIds.*").optional().isUUID().withMessage("All claim IDs must be valid UUIDs"),
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

      const { batchType, batchDate, claimIds } = req.body
      const batchNumber = await generateBatchNumber("SHA-BATCH")
      const finalBatchDate = batchDate ? new Date(batchDate) : new Date()

      let claims: any[] = []

      if (batchType === "custom" && claimIds && claimIds.length > 0) {
        // Custom batch with specific claims
        const placeholders = claimIds.map((_: any, index: number) => `$${index + 1}`).join(", ")
        const claimsResult = await pool.query(
          `SELECT * FROM sha_claims WHERE id IN (${placeholders}) AND status = 'ready_to_submit'`,
          claimIds
        )
        claims = claimsResult.rows
      } else {
        // Auto-generated batch based on date range
        let startDate: Date
        const endDate = new Date(finalBatchDate)

        if (batchType === "weekly") {
          startDate = new Date(endDate.getTime() - (7 * 24 * 60 * 60 * 1000))
        } else if (batchType === "monthly") {
          startDate = new Date(endDate.getFullYear(), endDate.getMonth(), 1)
        } else {
          startDate = new Date(endDate.getTime() - (24 * 60 * 60 * 1000)) // Last 24 hours for custom
        }

        const claimsResult = await pool.query(
          `SELECT * FROM sha_claims 
           WHERE status = 'ready_to_submit' 
           AND created_at >= $1 
           AND created_at <= $2
           AND batch_id IS NULL`,
          [startDate, endDate]
        )
        claims = claimsResult.rows
      }

      if (claims.length === 0) {
        return res.status(400).json({
          success: false,
          message: "No eligible claims found for batch creation"
        })
      }

      // Calculate total amount
      const totalAmount = claims.reduce((sum, claim) => sum + parseFloat(claim.claim_amount), 0)

      // Create batch
      const batchResult = await pool.query(
        `INSERT INTO sha_claim_batches (
          id, batch_number, batch_date, batch_type, total_claims, 
          total_amount, status, created_by, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        RETURNING *`,
        [
          crypto.randomUUID(),
          batchNumber,
          finalBatchDate,
          batchType,
          claims.length,
          totalAmount,
          "draft",
          req.user!.id,
          new Date(),
          new Date()
        ]
      )

      const batch = batchResult.rows[0]

      // Update claims with batch reference
      for (const claim of claims) {
        await pool.query(
          `UPDATE sha_claims SET batch_id = $1, updated_at = $2 WHERE id = $3`,
          [batchNumber, new Date(), claim.id]
        )
      }

      res.status(201).json({
        success: true,
        data: {
          batch,
          claimsCount: claims.length
        },
        message: `Batch created successfully with ${claims.length} claims`
      })
    } catch (error) {
      console.error("Error creating SHA batch:", error)
      res.status(500).json({
        success: false,
        message: "Failed to create SHA batch"
      })
    }
  }
)

// Get batch details with claims
router.get(
  "/:id",
  authorize([UserRole.ADMIN, UserRole.CLAIMS_MANAGER]),
  async (req: AuthenticatedRequest, res) => {
    try {
      const { id } = req.params

      // Get batch details
      const batchResult = await pool.query(
        `SELECT 
          b.*,
          u.username as created_by_username
         FROM sha_claim_batches b
         JOIN users u ON b.created_by = u.id
         WHERE b.id = $1`,
        [id]
      )

      if (batchResult.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: "Batch not found"
        })
      }

      const batch = batchResult.rows[0]

      // Get claims in batch
      const claimsResult = await pool.query(
        `SELECT 
          c.*,
          p.op_number,
          p.first_name,
          p.last_name,
          i.invoice_number,
          i.status as invoice_status
         FROM sha_claims c
         JOIN patients p ON c.patient_id = p.id
         LEFT JOIN sha_invoices i ON c.id = i.claim_id
         WHERE c.batch_id = $1
         ORDER BY c.created_at`,
        [batch.batch_number]
      )

      res.json({
        success: true,
        data: {
          batch,
          claims: claimsResult.rows
        }
      })
    } catch (error) {
      console.error("Error fetching batch details:", error)
      res.status(500).json({
        success: false,
        message: "Failed to fetch batch details"
      })
    }
  }
)

// Submit batch to SHA
router.patch(
  "/:id/submit",
  authorize([UserRole.ADMIN, UserRole.CLAIMS_MANAGER]),
  async (req: AuthenticatedRequest, res) => {
    try {
      const { id } = req.params

      // Get batch and claims
      const batchResult = await pool.query(
        `SELECT * FROM sha_claim_batches WHERE id = $1`,
        [id]
      )

      if (batchResult.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: "Batch not found"
        })
      }

      const batch = batchResult.rows[0]

      if (batch.status !== "draft") {
        return res.status(400).json({
          success: false,
          message: "Only draft batches can be submitted"
        })
      }

      // Get claims in batch
      const claimsResult = await pool.query(
        `SELECT * FROM sha_claims WHERE batch_id = $1`,
        [batch.batch_number]
      )

      if (claimsResult.rows.length === 0) {
        return res.status(400).json({
          success: false,
          message: "No claims found in batch"
        })
      }

      // Submit batch to SHA
      const result = await shaService.submitClaimBatch(batch, claimsResult.rows)

      if (result.success) {
        res.json({
          success: true,
          data: result.data,
          message: "Batch submitted to SHA successfully"
        })
      } else {
        res.status(400).json({
          success: false,
          message: "Failed to submit batch to SHA",
          error: result.error
        })
      }
    } catch (error) {
      console.error("Error submitting batch to SHA:", error)
      res.status(500).json({
        success: false,
        message: "Failed to submit batch to SHA"
      })
    }
  }
)

// Mark batch invoices as printed
router.patch(
  "/:id/mark-printed",
  authorize([UserRole.ADMIN, UserRole.CLAIMS_MANAGER]),
  async (req: AuthenticatedRequest, res) => {
    try {
      const { id } = req.params

      const batchResult = await pool.query(
        `SELECT * FROM sha_claim_batches WHERE id = $1`,
        [id]
      )

      if (batchResult.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: "Batch not found"
        })
      }

      const batch = batchResult.rows[0]
      const now = new Date()

      // Update batch
      await pool.query(
        `UPDATE sha_claim_batches SET 
          printed_invoices = true,
          printed_at = $1,
          printed_by = $2,
          updated_at = $3
         WHERE id = $4`,
        [now, req.user!.id, now, id]
      )

      // Get and mark all invoices in batch as printed
      const invoicesResult = await pool.query(
        `SELECT i.id FROM sha_invoices i
         JOIN sha_claims c ON i.claim_id = c.id
         WHERE c.batch_id = $1`,
        [batch.batch_number]
      )

      for (const invoice of invoicesResult.rows) {
        await shaService.markInvoiceAsPrinted(invoice.id, req.user!.id)
      }

      res.json({
        success: true,
        message: `Marked ${invoicesResult.rows.length} invoices as printed`
      })
    } catch (error) {
      console.error("Error marking batch as printed:", error)
      res.status(500).json({
        success: false,
        message: "Failed to mark batch as printed"
      })
    }
  }
)

// Delete batch (only if draft status)
router.delete(
  "/:id",
  authorize([UserRole.ADMIN, UserRole.CLAIMS_MANAGER]),
  async (req: AuthenticatedRequest, res) => {
    try {
      const { id } = req.params

      const batchResult = await pool.query(
        `SELECT * FROM sha_claim_batches WHERE id = $1`,
        [id]
      )

      if (batchResult.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: "Batch not found"
        })
      }

      const batch = batchResult.rows[0]

      if (batch.status !== "draft") {
        return res.status(400).json({
          success: false,
          message: "Only draft batches can be deleted"
        })
      }

      // Remove batch reference from claims
      await pool.query(
        `UPDATE sha_claims SET batch_id = NULL, updated_at = $1 WHERE batch_id = $2`,
        [new Date(), batch.batch_number]
      )

      // Delete batch
      await pool.query(`DELETE FROM sha_claim_batches WHERE id = $1`, [id])

      res.json({
        success: true,
        message: "Batch deleted successfully"
      })
    } catch (error) {
      console.error("Error deleting batch:", error)
      res.status(500).json({
        success: false,
        message: "Failed to delete batch"
      })
    }
  }
)

// Get batch statistics
router.get(
  "/stats/summary",
  authorize([UserRole.ADMIN, UserRole.CLAIMS_MANAGER]),
  [
    query("startDate").optional().isISO8601().withMessage("Start date must be valid"),
    query("endDate").optional().isISO8601().withMessage("End date must be valid"),
  ],
  async (req: AuthenticatedRequest, res) => {
    try {
      const { startDate, endDate } = req.query
      
      let whereClause = ""
      const params: any[] = []

      if (startDate && endDate) {
        whereClause = "WHERE batch_date >= $1 AND batch_date <= $2"
        params.push(startDate, endDate)
      }

      const statsResult = await pool.query(
        `SELECT 
          COUNT(*) as total_batches,
          COUNT(CASE WHEN status = 'draft' THEN 1 END) as draft_batches,
          COUNT(CASE WHEN status = 'submitted' THEN 1 END) as submitted_batches,
          COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_batches,
          COUNT(CASE WHEN batch_type = 'weekly' THEN 1 END) as weekly_batches,
          COUNT(CASE WHEN batch_type = 'monthly' THEN 1 END) as monthly_batches,
          COUNT(CASE WHEN batch_type = 'custom' THEN 1 END) as custom_batches,
          SUM(total_claims) as total_claims_in_batches,
          SUM(total_amount) as total_amount_in_batches,
          COUNT(CASE WHEN invoice_generated = true THEN 1 END) as batches_with_invoices,
          COUNT(CASE WHEN printed_invoices = true THEN 1 END) as batches_with_printed_invoices
         FROM sha_claim_batches
         ${whereClause}`,
        params
      )

      res.json({
        success: true,
        data: statsResult.rows[0]
      })
    } catch (error) {
      console.error("Error fetching batch statistics:", error)
      res.status(500).json({
        success: false,
        message: "Failed to fetch batch statistics"
      })
    }
  }
)

export default router
