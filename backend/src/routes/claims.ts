import { Router } from "express"
import { pool } from "../config/database"
import { authenticateToken, requireRole } from "../middleware/auth"
import { SHAService } from "../services/SHAService"
import { body, validationResult } from "express-validator"
import { UserRole } from "../types"
import * as crypto from "crypto"

const router = Router()
const shaService = new SHAService()

// Create claim from visit/invoice
router.post(
  "/claims",
  authenticateToken,
  requireRole([UserRole.CLAIMS_MANAGER, UserRole.ADMIN, UserRole.RECEPTIONIST]),
  [
    body("op_number").notEmpty().withMessage("OP Number is required"),
    body("diagnosis_code").notEmpty().withMessage("Diagnosis code is required"),
    body("diagnosis_description").notEmpty().withMessage("Diagnosis description is required"),
    body("services").isArray().withMessage("Services must be an array"),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req)
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() })
      }

      const { op_number, patient_id, member_number, diagnosis_code, diagnosis_description, services } = req.body

      const client = await pool.connect()

      try {
        await client.query("BEGIN")

        // Generate claim number
        const claimNumber = `CLM-${Date.now()}`

        // Calculate total amount
        const totalAmount = services.reduce((sum: number, service: any) => sum + service.total_price, 0)

        // Create claim
        const claimResult = await client.query(
          `
          INSERT INTO claims (
            id, claim_number, op_number, patient_id, provider_code, member_number,
            visit_date, diagnosis_code, diagnosis_description, total_amount,
            status, created_by, created_at, updated_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
          RETURNING *
        `,
          [
            crypto.randomUUID(),
            claimNumber,
            op_number,
            patient_id,
            process.env.SHA_PROVIDER_CODE || "SETH001",
            member_number,
            new Date(),
            diagnosis_code,
            diagnosis_description,
            totalAmount,
            "draft",
            req.user.id,
            new Date(),
            new Date(),
          ],
        )

        const claim = claimResult.rows[0]

        // Create claim items
        for (const service of services) {
          await client.query(
            `
            INSERT INTO claim_items (
              id, claim_id, service_code, service_description, quantity,
              unit_price, total_price, item_type, item_reference_id, created_at
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
          `,
            [
              crypto.randomUUID(),
              claim.id,
              service.service_code,
              service.service_description,
              service.quantity,
              service.unit_price,
              service.total_price,
              service.item_type || "other",
              service.item_reference_id,
              new Date(),
            ],
          )
        }

        await client.query("COMMIT")

        res.status(201).json({
          success: true,
          data: claim,
        })
      } catch (error) {
        await client.query("ROLLBACK")
        throw error
      } finally {
        client.release()
      }
    } catch (error) {
      console.error("Error creating claim:", error)
      res.status(500).json({
        success: false,
        message: "Failed to create claim",
      })
    }
  },
)

// Get claims with filters
router.get("/claims", authenticateToken, requireRole([UserRole.CLAIMS_MANAGER, UserRole.ADMIN, UserRole.RECEPTIONIST]), async (req, res) => {
  try {
    const { status, batch_id, op_number, limit = 50, offset = 0 } = req.query

    let query = `
      SELECT c.*, p.first_name, p.last_name, p.phone_number
      FROM claims c
      LEFT JOIN patients p ON c.patient_id = p.id
      WHERE 1=1
    `
    const params: any[] = []
    let paramCount = 0

    if (status) {
      paramCount++
      query += ` AND c.status = $${paramCount}`
      params.push(status)
    }

    if (batch_id) {
      paramCount++
      query += ` AND c.batch_id = $${paramCount}`
      params.push(batch_id)
    }

    if (op_number) {
      paramCount++
      query += ` AND c.op_number ILIKE $${paramCount}`
      params.push(`%${op_number}%`)
    }

    query += ` ORDER BY c.created_at DESC`

    if (limit) {
      paramCount++
      query += ` LIMIT $${paramCount}`
      params.push(Number.parseInt(limit as string))
    }

    if (offset) {
      paramCount++
      query += ` OFFSET $${paramCount}`
      params.push(Number.parseInt(offset as string))
    }

    const result = await pool.query(query, params)

    res.json({
      success: true,
      data: result.rows,
    })
  } catch (error) {
    console.error("Error fetching claims:", error)
    res.status(500).json({
      success: false,
      message: "Failed to fetch claims",
    })
  }
})

// Create claim batch
router.post(
  "/batches",
  authenticateToken,
  requireRole([UserRole.CLAIMS_MANAGER, UserRole.ADMIN, UserRole.RECEPTIONIST]),
  [body("claim_ids").isArray().withMessage("Claim IDs must be an array")],
  async (req, res) => {
    try {
      const errors = validationResult(req)
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() })
      }

      const { claim_ids } = req.body

      const client = await pool.connect()

      try {
        await client.query("BEGIN")

        // Validate claims are ready for batching
        const claimsResult = await client.query(
          `
          SELECT * FROM claims 
          WHERE id = ANY($1) AND status = 'ready_to_submit' AND batch_id IS NULL
        `,
          [claim_ids],
        )

        if (claimsResult.rows.length !== claim_ids.length) {
          throw new Error("Some claims are not ready for batching or already in a batch")
        }

        // Calculate batch totals
        const totalAmount = claimsResult.rows.reduce((sum, claim) => sum + Number.parseFloat(claim.total_amount), 0)
        const totalClaims = claimsResult.rows.length

        // Generate batch number
        const batchNumber = `BATCH-${Date.now()}`

        // Create batch
        const batchResult = await client.query(
          `
          INSERT INTO claim_batches (
            id, batch_number, batch_date, total_claims, total_amount,
            status, created_by, created_at, updated_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
          RETURNING *
        `,
          [
            crypto.randomUUID(),
            batchNumber,
            new Date(),
            totalClaims,
            totalAmount,
            "draft",
            req.user.id,
            new Date(),
            new Date(),
          ],
        )

        const batch = batchResult.rows[0]

        // Update claims with batch_id
        await client.query(
          `
          UPDATE claims 
          SET batch_id = $1, updated_at = $2
          WHERE id = ANY($3)
        `,
          [batch.id, new Date(), claim_ids],
        )

        await client.query("COMMIT")

        res.status(201).json({
          success: true,
          data: batch,
        })
      } catch (error) {
        await client.query("ROLLBACK")
        throw error
      } finally {
        client.release()
      }
    } catch (error) {
      console.error("Error creating batch:", error)
      res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : "Failed to create batch",
      })
    }
  },
)

// Submit batch to SHA
router.post("/batches/:id/submit", authenticateToken, requireRole([UserRole.CLAIMS_MANAGER, UserRole.ADMIN, UserRole.RECEPTIONIST]), async (req, res) => {
  try {
    const { id } = req.params

    // Get batch and claims
    const batchResult = await pool.query(
      `
        SELECT * FROM claim_batches WHERE id = $1 AND status = 'draft'
      `,
      [id],
    )

    if (batchResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Batch not found or not in draft status",
      })
    }

    const batch = batchResult.rows[0]

    const claimsResult = await pool.query(
      `
        SELECT * FROM claims WHERE batch_id = $1
      `,
      [id],
    )

    // Submit to SHA
    const result = await shaService.submitClaimBatch(batch, claimsResult.rows)

    res.json({
      success: result.success,
      message: result.success ? "Batch submitted successfully" : "Failed to submit batch",
      data: result.data,
      error: result.error,
    })
  } catch (error) {
    console.error("Error submitting batch:", error)
    res.status(500).json({
      success: false,
      message: "Failed to submit batch",
    })
  }
})

// Get claim dashboard data
router.get("/dashboard", authenticateToken, requireRole([UserRole.CLAIMS_MANAGER, UserRole.ADMIN, UserRole.RECEPTIONIST]), async (req, res) => {
  try {
    // Claims by status
    const statusResult = await pool.query(`
      SELECT status, COUNT(*) as count, COALESCE(SUM(total_amount), 0) as total_amount
      FROM claims 
      GROUP BY status
    `)

    // Recent submissions
    const recentResult = await pool.query(`
      SELECT c.*, p.first_name, p.last_name
      FROM claims c
      LEFT JOIN patients p ON c.patient_id = p.id
      WHERE c.submission_date IS NOT NULL
      ORDER BY c.submission_date DESC
      LIMIT 10
    `)

    // Pending claims (ready to submit)
    const pendingResult = await pool.query(`
      SELECT COUNT(*) as count, COALESCE(SUM(total_amount), 0) as total_amount
      FROM claims 
      WHERE status = 'ready_to_submit'
    `)

    res.json({
      success: true,
      data: {
        claims_by_status: statusResult.rows,
        recent_submissions: recentResult.rows,
        pending_claims: pendingResult.rows[0],
      },
    })
  } catch (error) {
    console.error("Error fetching claims dashboard:", error)
    res.status(500).json({
      success: false,
      message: "Failed to fetch claims data",
    })
  }
})

export default router
