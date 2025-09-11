import express from "express"
import { body, query, validationResult } from "express-validator"
import { authorize, type AuthenticatedRequest } from "../middleware/auth"
import { UserRole } from "../types"
import { pool } from "../config/database"
import crypto from "crypto"

const router = express.Router()

// Get all SHA claims with pagination and filtering
router.get(
  "/",
  authorize([UserRole.ADMIN, UserRole.CLAIMS_MANAGER, UserRole.CLINICAL_OFFICER, UserRole.RECEPTIONIST]),
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

      const { 
        page = 1, 
        limit = 20, 
        status, 
        startDate, 
        endDate, 
        search 
      } = req.query

      const offset = (Number(page) - 1) * Number(limit)

      // Build WHERE clause
      let whereClause = "WHERE 1=1"
      const params: any[] = []
      let paramCount = 0

      if (status) {
        paramCount++
        whereClause += ` AND c.status = $${paramCount}`
        params.push(status)
      }

      if (startDate) {
        paramCount++
        whereClause += ` AND c.visit_date >= $${paramCount}`
        params.push(startDate)
      }

      if (endDate) {
        paramCount++
        whereClause += ` AND c.visit_date <= $${paramCount}`
        params.push(endDate)
      }

      if (search) {
        paramCount++
        whereClause += ` AND (p.op_number ILIKE $${paramCount} OR p.first_name ILIKE $${paramCount} OR p.last_name ILIKE $${paramCount} OR c.claim_number ILIKE $${paramCount})`
        params.push(`%${search}%`)
      }

      // Get total count
      const countResult = await pool.query(
        `SELECT COUNT(*) as total
         FROM sha_claims c
         JOIN patients p ON c.patient_id = p.id
         ${whereClause}`,
        params
      )

      const total = parseInt(countResult.rows[0].total)

      // Get claims
      paramCount++
      params.push(Number(limit))
      paramCount++
      params.push(offset)

      const result = await pool.query(
        `SELECT 
          c.*,
          p.op_number,
          p.first_name,
          p.last_name,
          p.phone_number,
          p.insurance_number,
          u.username as created_by_username,
          i.invoice_number,
          i.status as invoice_status
         FROM sha_claims c
         JOIN patients p ON c.patient_id = p.id
         JOIN users u ON c.created_by = u.id
         LEFT JOIN sha_invoices i ON c.id = i.claim_id
         ${whereClause}
         ORDER BY c.created_at DESC
         LIMIT $${paramCount - 1} OFFSET $${paramCount}`,
        params
      )

      res.json({
        success: true,
        data: {
          claims: result.rows,
          pagination: {
            page: Number(page),
            limit: Number(limit),
            total,
            pages: Math.ceil(total / Number(limit))
          }
        }
      })
    } catch (error) {
      console.error("Error fetching SHA claims:", error)
      res.status(500).json({
        success: false,
        message: "Failed to fetch SHA claims"
      })
    }
  }
)

// Get single SHA claim
router.get(
  "/:id",
  authorize([UserRole.ADMIN, UserRole.CLAIMS_MANAGER, UserRole.CLINICAL_OFFICER, UserRole.RECEPTIONIST]),
  async (req: AuthenticatedRequest, res) => {
    try {
      const { id } = req.params

      const result = await pool.query(
        `SELECT 
          c.*,
          p.op_number,
          p.first_name,
          p.last_name,
          p.phone_number,
          p.insurance_number,
          p.date_of_birth,
          p.gender,
          u.username as created_by_username,
          i.invoice_number,
          i.status as invoice_status,
          i.generated_at as invoice_generated_at
         FROM sha_claims c
         JOIN patients p ON c.patient_id = p.id
         JOIN users u ON c.created_by = u.id
         LEFT JOIN sha_invoices i ON c.id = i.claim_id
         WHERE c.id = $1`,
        [id]
      )

      if (result.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: "SHA claim not found"
        })
      }

      // Get claim items
      const itemsResult = await pool.query(
        `SELECT * FROM sha_claim_items WHERE claim_id = $1 ORDER BY created_at`,
        [id]
      )

      const claim = result.rows[0]

      // Get comprehensive patient clinical data for this claim
      const clinicalDataQuery = `
        SELECT 
          -- Patient encounters
          pe.id as encounter_id, pe.encounter_type, pe.encounter_date, pe.chief_complaint,
          pe.department, pe.location, pe.sha_eligible,
          -- Diagnoses
          d.diagnosis_code, d.diagnosis_description, d.diagnosis_type,
          -- Prescriptions
          pr.id as prescription_id, pr.status as prescription_status,
          pi.item_name, pi.dosage, pi.frequency, pi.duration, pi.quantity_prescribed,
          -- Lab requests
          lr.id as lab_request_id, lr.status as lab_status, lr.urgency,
          lri.test_name, lri.test_code, lri.cost as test_cost, lri.result
        FROM patient_encounters pe
        LEFT JOIN encounter_diagnoses ed ON pe.id = ed.encounter_id
        LEFT JOIN diagnoses d ON ed.diagnosis_id = d.id
        LEFT JOIN prescriptions pr ON pe.id = pr.consultation_id
        LEFT JOIN prescription_items pi ON pr.id = pi.prescription_id
        LEFT JOIN lab_requests lr ON pe.visit_id = lr.visit_id
        LEFT JOIN lab_request_items lri ON lr.id = lri.lab_request_id
        WHERE pe.patient_id = $1 AND pe.visit_id = $2
        ORDER BY pe.encounter_date DESC
      `

      const clinicalResult = await pool.query(clinicalDataQuery, [claim.patient_id, claim.visit_id])
      const clinicalData = clinicalResult.rows

      // Organize clinical data
      const organizedClinicalData = {
        encounters: [],
        diagnoses: [],
        prescriptions: [],
        lab_tests: []
      }

      clinicalData.forEach(row => {
        // Add encounter if not already added
        if (row.encounter_id && !organizedClinicalData.encounters.find(e => e.id === row.encounter_id)) {
          organizedClinicalData.encounters.push({
            id: row.encounter_id,
            type: row.encounter_type,
            date: row.encounter_date,
            chief_complaint: row.chief_complaint,
            department: row.department,
            location: row.location,
            sha_eligible: row.sha_eligible
          })
        }

        // Add diagnosis if not already added
        if (row.diagnosis_code && !organizedClinicalData.diagnoses.find(d => d.code === row.diagnosis_code)) {
          organizedClinicalData.diagnoses.push({
            code: row.diagnosis_code,
            description: row.diagnosis_description,
            type: row.diagnosis_type
          })
        }

        // Add prescription if not already added
        if (row.prescription_id && !organizedClinicalData.prescriptions.find(p => p.id === row.prescription_id)) {
          organizedClinicalData.prescriptions.push({
            id: row.prescription_id,
            status: row.prescription_status,
            items: [{
              name: row.item_name,
              dosage: row.dosage,
              frequency: row.frequency,
              duration: row.duration,
              quantity: row.quantity_prescribed
            }]
          })
        }

        // Add lab test if not already added
        if (row.lab_request_id && !organizedClinicalData.lab_tests.find(l => l.id === row.lab_request_id)) {
          organizedClinicalData.lab_tests.push({
            id: row.lab_request_id,
            status: row.lab_status,
            urgency: row.urgency,
            tests: [{
              name: row.test_name,
              code: row.test_code,
              cost: row.test_cost,
              result: row.result
            }]
          })
        }
      })

      res.json({
        success: true,
        data: {
          ...claim,
          items: itemsResult.rows,
          clinical_data: organizedClinicalData
        }
      })
    } catch (error) {
      console.error("Error fetching SHA claim:", error)
      res.status(500).json({
        success: false,
        message: "Failed to fetch SHA claim"
      })
    }
  }
)

// Create new SHA claim
router.post(
  "/",
  authorize([UserRole.ADMIN, UserRole.CLINICAL_OFFICER]),
  [
    body("patient_id").isUUID().withMessage("Patient ID must be a valid UUID"),
    body("visit_id").isUUID().withMessage("Visit ID must be a valid UUID"),
    body("primary_diagnosis_code").notEmpty().withMessage("Primary diagnosis code is required"),
    body("primary_diagnosis_description").notEmpty().withMessage("Primary diagnosis description is required"),
    body("claim_amount").isNumeric().withMessage("Claim amount must be a number"),
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

      const {
        patient_id,
        visit_id,
        primary_diagnosis_code,
        primary_diagnosis_description,
        secondary_diagnosis_codes = [],
        secondary_diagnosis_descriptions = [],
        claim_amount,
        notes
      } = req.body

      // Get patient details
      const patientResult = await pool.query(
        `SELECT op_number, first_name, last_name, insurance_number, phone_number, date_of_birth, gender
         FROM patients WHERE id = $1`,
        [patient_id]
      )

      if (patientResult.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: "Patient not found"
        })
      }

      const patient = patientResult.rows[0]

      // Generate claim number
      const claimNumber = `SHA-${Date.now()}-${Math.random().toString(36).substr(2, 4).toUpperCase()}`

      // Create claim
      const claimId = crypto.randomUUID()
      const result = await pool.query(
        `INSERT INTO sha_claims (
          id, claim_number, patient_id, op_number, visit_id,
          patient_name, sha_beneficiary_id, national_id, phone_number, visit_date,
          primary_diagnosis_code, primary_diagnosis_description,
          secondary_diagnosis_codes, secondary_diagnosis_descriptions,
          provider_code, provider_name, facility_level,
          claim_amount, status, notes, created_by, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23) RETURNING *`,
        [
          claimId,
          claimNumber,
          patient_id,
          patient.op_number,
          visit_id,
          `${patient.first_name} ${patient.last_name}`,
          patient.insurance_number,
          patient.insurance_number, // Using insurance number as national ID for now
          patient.phone_number,
          new Date(),
          primary_diagnosis_code,
          primary_diagnosis_description,
          secondary_diagnosis_codes,
          secondary_diagnosis_descriptions,
          process.env.SHA_PROVIDER_CODE || 'CLINIC001',
          process.env.CLINIC_NAME || 'Seth Clinic',
          process.env.FACILITY_LEVEL || 'Level2',
          claim_amount,
          'DRAFT',
          notes,
          req.user!.id,
          new Date(),
          new Date()
        ]
      )

      res.status(201).json({
        success: true,
        data: result.rows[0],
        message: "SHA claim created successfully"
      })
    } catch (error) {
      console.error("Error creating SHA claim:", error)
      res.status(500).json({
        success: false,
        message: "Failed to create SHA claim"
      })
    }
  }
)

// Update SHA claim
router.put(
  "/:id",
  authorize([UserRole.ADMIN, UserRole.CLAIMS_MANAGER, UserRole.CLINICAL_OFFICER, UserRole.RECEPTIONIST]),
  [
    body("status").optional().isIn(["DRAFT", "READY_TO_SUBMIT", "SUBMITTED", "APPROVED", "REJECTED", "PAID"]),
    body("claim_amount").optional().isNumeric(),
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

      const { id } = req.params
      const updates = req.body

      // Build update query
      const updateFields = []
      const params = []
      let paramCount = 0

      Object.keys(updates).forEach(key => {
        if (updates[key] !== undefined) {
          paramCount++
          updateFields.push(`${key} = $${paramCount}`)
          params.push(updates[key])
        }
      })

      if (updateFields.length === 0) {
        return res.status(400).json({
          success: false,
          message: "No valid fields to update"
        })
      }

      paramCount++
      updateFields.push(`updated_at = $${paramCount}`)
      params.push(new Date())

      paramCount++
      params.push(id)

      const result = await pool.query(
        `UPDATE sha_claims 
         SET ${updateFields.join(', ')}
         WHERE id = $${paramCount}
         RETURNING *`,
        params
      )

      if (result.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: "SHA claim not found"
        })
      }

      res.json({
        success: true,
        data: result.rows[0],
        message: "SHA claim updated successfully"
      })
    } catch (error) {
      console.error("Error updating SHA claim:", error)
      res.status(500).json({
        success: false,
        message: "Failed to update SHA claim"
      })
    }
  }
)

// Delete SHA claim
router.delete(
  "/:id",
  authorize([UserRole.ADMIN]),
  async (req: AuthenticatedRequest, res) => {
    try {
      const { id } = req.params

      const result = await pool.query(
        `DELETE FROM sha_claims WHERE id = $1 RETURNING *`,
        [id]
      )

      if (result.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: "SHA claim not found"
        })
      }

      res.json({
        success: true,
        message: "SHA claim deleted successfully"
      })
    } catch (error) {
      console.error("Error deleting SHA claim:", error)
      res.status(500).json({
        success: false,
        message: "Failed to delete SHA claim"
      })
    }
  }
)

export default router
