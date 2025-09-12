import { Router } from "express"
import { body, query, validationResult } from "express-validator"
import { pool } from "../config/database"
import { authorize } from "../middleware/auth"
import { UserRole } from "../types"
import { AuthenticatedRequest } from "../types/auth"
import { AutoInvoiceService } from "../services/AutoInvoiceService"
import * as crypto from "crypto"

const router = Router()
const autoInvoiceService = new AutoInvoiceService()

// Create new patient encounter
router.post(
  "/",
  authorize([UserRole.ADMIN, UserRole.CLINICAL_OFFICER]),
  [
    body("patientId").isUUID().withMessage("Valid patient ID is required"),
    body("visitId").isUUID().withMessage("Valid visit ID is required"),
    body("encounterType").isIn(['CONSULTATION', 'LAB', 'PHARMACY', 'INPATIENT', 'EMERGENCY', 'FOLLOW_UP', 'PROCEDURE']).withMessage("Invalid encounter type"),
    body("chiefComplaint").optional().trim().isLength({ min: 1 }).withMessage("Chief complaint cannot be empty"),
    body("department").optional().trim(),
    body("location").optional().trim(),
    body("shaEligible").optional().isBoolean(),
    body("privatePayment").optional().isBoolean()
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
        patientId, 
        visitId, 
        encounterType, 
        chiefComplaint, 
        department,
        location,
        shaEligible = false,
        privatePayment = true
      } = req.body

      // Verify patient and visit exist
      const patientResult = await pool.query(
        `SELECT p.*, p.insurance_number as sha_beneficiary_id FROM patients p WHERE p.id = $1`,
        [patientId]
      )

      if (patientResult.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: "Patient not found"
        })
      }

      const patient = patientResult.rows[0]

      const visitResult = await pool.query(
        `SELECT * FROM visits WHERE id = $1 AND patient_id = $2`,
        [visitId, patientId]
      )

      if (visitResult.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: "Visit not found for this patient"
        })
      }

      // Determine insurance eligibility
      const insuranceEligible = Boolean(patient.sha_beneficiary_id)
      const finalShaEligible = shaEligible && insuranceEligible

      // Create encounter
      const encounterId = crypto.randomUUID()
      const result = await pool.query(
        `INSERT INTO patient_encounters (
          id, patient_id, visit_id, encounter_type, encounter_date,
          chief_complaint, department, location, insurance_eligible,
          sha_eligible, private_pay, primary_provider, created_by,
          created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
        RETURNING *`,
        [
          encounterId,
          patientId,
          visitId,
          encounterType,
          new Date(),
          chiefComplaint,
          department,
          location,
          insuranceEligible,
          finalShaEligible,
          privatePayment,
          req.user!.id,
          req.user!.id,
          new Date(),
          new Date()
        ]
      )

      res.status(201).json({
        success: true,
        data: result.rows[0],
        message: "Patient encounter created successfully"
      })

    } catch (error) {
      console.error("Error creating patient encounter:", error)
      res.status(500).json({
        success: false,
        message: "Failed to create patient encounter"
      })
    }
  }
)

// Complete encounter with services and auto-generate invoice
router.post(
  "/:id/complete",
  authorize([UserRole.ADMIN, UserRole.CLINICAL_OFFICER, UserRole.PHARMACIST]),
  [
    body("services").optional().isArray().withMessage("Services must be an array"),
    body("medications").optional().isArray().withMessage("Medications must be an array"),
    body("labTests").optional().isArray().withMessage("Lab tests must be an array"),
    body("procedures").optional().isArray().withMessage("Procedures must be an array"),
    body("diagnosisCodes").isArray({ min: 1 }).withMessage("At least one diagnosis code is required"),
    body("diagnosisDescriptions").isArray({ min: 1 }).withMessage("At least one diagnosis description is required"),
    body("treatmentSummary").optional().trim(),
    body("autoGenerateInvoice").optional().isBoolean()
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
      const {
        services = [],
        medications = [],
        labTests = [],
        procedures = [],
        diagnosisCodes,
        diagnosisDescriptions,
        treatmentSummary = "",
        autoGenerateInvoice = true
      } = req.body

      if (autoGenerateInvoice) {
        // Complete encounter and auto-generate invoice
        const result = await autoInvoiceService.completeEncounterWithServices(
          id,
          services,
          medications,
          labTests,
          procedures,
          diagnosisCodes,
          diagnosisDescriptions,
          treatmentSummary,
          req.user!.id
        )

        res.json({
          success: true,
          data: result,
          message: "Encounter completed and invoice generated automatically"
        })
      } else {
        // Just complete the encounter without invoice generation
        await pool.query(
          `UPDATE patient_encounters 
           SET services_provided = $1,
               medications_prescribed = $2,
               lab_tests_ordered = $3,
               procedures_performed = $4,
               diagnosis_codes = $5,
               diagnosis_descriptions = $6,
               treatment_summary = $7,
               status = 'COMPLETED',
               completion_date = CURRENT_TIMESTAMP,
               completed_by = $8,
               updated_at = CURRENT_TIMESTAMP
           WHERE id = $9`,
          [
            JSON.stringify(services),
            JSON.stringify(medications),
            JSON.stringify(labTests),
            JSON.stringify(procedures),
            diagnosisCodes,
            diagnosisDescriptions,
            treatmentSummary,
            req.user!.id,
            id
          ]
        )

        res.json({
          success: true,
          message: "Encounter completed successfully"
        })
      }

    } catch (error) {
      console.error("Error completing encounter:", error)
      res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : "Failed to complete encounter"
      })
    }
  }
)

// Generate invoice for completed encounter (manual trigger)
router.post(
  "/:id/generate-invoice",
  authorize([UserRole.ADMIN, UserRole.CLINICAL_OFFICER, UserRole.CLAIMS_MANAGER]),
  async (req: AuthenticatedRequest, res) => {
    try {
      const { id } = req.params

      const result = await autoInvoiceService.manuallyTriggerInvoiceGeneration(id, req.user!.id)

      res.json({
        success: true,
        data: result,
        message: "Invoice generated successfully for encounter"
      })

    } catch (error) {
      console.error("Error generating invoice for encounter:", error)
      res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : "Failed to generate invoice"
      })
    }
  }
)

// Get encounters ready for billing
router.get(
  "/ready-for-billing",
  authorize([UserRole.ADMIN, UserRole.CLINICAL_OFFICER, UserRole.CLAIMS_MANAGER]),
  async (req: AuthenticatedRequest, res) => {
    try {
      const encounters = await autoInvoiceService.getEncountersReadyForBilling()

      res.json({
        success: true,
        data: encounters,
        message: `Found ${encounters.length} encounters ready for billing`
      })

    } catch (error) {
      console.error("Error fetching encounters ready for billing:", error)
      res.status(500).json({
        success: false,
        message: "Failed to fetch encounters ready for billing"
      })
    }
  }
)

// Get encounter details
router.get(
  "/:id",
  authorize([UserRole.ADMIN, UserRole.CLINICAL_OFFICER, UserRole.PHARMACIST, UserRole.CLAIMS_MANAGER]),
  async (req: AuthenticatedRequest, res) => {
    try {
      const { id } = req.params

      const result = await pool.query(
        `SELECT e.*,
                p.first_name || ' ' || p.last_name as patient_name,
                p.op_number,
                p.phone_number,
                p.insurance_number as sha_beneficiary_id,
                v.chief_complaint as visit_chief_complaint,
                u1.username as primary_provider_name,
                u2.username as completed_by_name,
                u3.username as billed_by_name
         FROM patient_encounters e
         JOIN patients p ON e.patient_id = p.id
         JOIN visits v ON e.visit_id = v.id
         JOIN users u1 ON e.primary_provider = u1.id
         LEFT JOIN users u2 ON e.completed_by = u2.id
         LEFT JOIN users u3 ON e.billed_by = u3.id
         WHERE e.id = $1`,
        [id]
      )

      if (result.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: "Encounter not found"
        })
      }

      res.json({
        success: true,
        data: result.rows[0],
        message: "Encounter details retrieved successfully"
      })

    } catch (error) {
      console.error("Error fetching encounter details:", error)
      res.status(500).json({
        success: false,
        message: "Failed to fetch encounter details"
      })
    }
  }
)

// List encounters with filtering
router.get(
  "/",
  authorize([UserRole.ADMIN, UserRole.CLINICAL_OFFICER, UserRole.CLAIMS_MANAGER]),
  [
    query("status").optional().isIn(['IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'INVOICE_GENERATED', 'BILLED']),
    query("encounterType").optional().isIn(['CONSULTATION', 'LAB', 'PHARMACY', 'INPATIENT', 'EMERGENCY', 'FOLLOW_UP', 'PROCEDURE']),
    query("patientId").optional().isUUID(),
    query("providerId").optional().isUUID(),
    query("dateFrom").optional().isISO8601(),
    query("dateTo").optional().isISO8601(),
    query("limit").optional().isInt({ min: 1, max: 100 }),
    query("offset").optional().isInt({ min: 0 })
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
        status,
        encounterType,
        patientId,
        providerId,
        dateFrom,
        dateTo,
        limit = 50,
        offset = 0
      } = req.query

      let whereClause = "WHERE 1=1"
      const params: any[] = []
      let paramCount = 1

      if (status) {
        whereClause += ` AND e.status = $${paramCount++}`
        params.push(status)
      }

      if (encounterType) {
        whereClause += ` AND e.encounter_type = $${paramCount++}`
        params.push(encounterType)
      }

      if (patientId) {
        whereClause += ` AND e.patient_id = $${paramCount++}`
        params.push(patientId)
      }

      if (providerId) {
        whereClause += ` AND e.primary_provider = $${paramCount++}`
        params.push(providerId)
      }

      if (dateFrom) {
        whereClause += ` AND e.encounter_date >= $${paramCount++}`
        params.push(new Date(dateFrom as string))
      }

      if (dateTo) {
        whereClause += ` AND e.encounter_date <= $${paramCount++}`
        params.push(new Date(dateTo as string))
      }

      params.push(limit, offset)

      const result = await pool.query(
        `SELECT e.*,
                p.first_name || ' ' || p.last_name as patient_name,
                p.op_number,
                p.insurance_number as sha_beneficiary_id,
                u1.username as primary_provider_name,
                u2.username as completed_by_name
         FROM patient_encounters e
         JOIN patients p ON e.patient_id = p.id
         JOIN users u1 ON e.primary_provider = u1.id
         LEFT JOIN users u2 ON e.completed_by = u2.id
         ${whereClause}
         ORDER BY e.encounter_date DESC
         LIMIT $${paramCount++} OFFSET $${paramCount++}`,
        params
      )

      // Get total count
      const countResult = await pool.query(
        `SELECT COUNT(*) as total
         FROM patient_encounters e
         ${whereClause.replace(/\$\d+/g, (match, offset) => {
           const paramIndex = Number.parseInt(match.substring(1)) - 1
           return params[paramIndex] !== undefined ? match : 'NULL'
         })}`,
        params.slice(0, -2) // Remove limit and offset
      )

      res.json({
        success: true,
        data: {
          encounters: result.rows,
          pagination: {
            total: Number.parseInt(countResult.rows[0].total),
            limit: Number.parseInt(limit as string),
            offset: Number.parseInt(offset as string),
            hasMore: Number.parseInt(countResult.rows[0].total) > Number.parseInt(offset as string) + Number.parseInt(limit as string)
          }
        },
        message: `Found ${result.rows.length} encounters`
      })

    } catch (error) {
      console.error("Error fetching encounters:", error)
      res.status(500).json({
        success: false,
        message: "Failed to fetch encounters"
      })
    }
  }
)

// Update encounter
router.patch(
  "/:id",
  authorize([UserRole.ADMIN, UserRole.CLINICAL_OFFICER]),
  [
    body("chiefComplaint").optional().trim(),
    body("diagnosisCodes").optional().isArray(),
    body("diagnosisDescriptions").optional().isArray(),
    body("treatmentSummary").optional().trim(),
    body("services").optional().isArray(),
    body("medications").optional().isArray(),
    body("labTests").optional().isArray(),
    body("procedures").optional().isArray(),
    body("shaEligible").optional().isBoolean(),
    body("privatePayment").optional().isBoolean()
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
      const updateData = req.body

      // Check if encounter exists and is still in progress
      const existingResult = await pool.query(
        `SELECT * FROM patient_encounters WHERE id = $1`,
        [id]
      )

      if (existingResult.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: "Encounter not found"
        })
      }

      const encounter = existingResult.rows[0]

      if (encounter.status !== 'IN_PROGRESS') {
        return res.status(400).json({
          success: false,
          message: "Can only update encounters that are in progress"
        })
      }

      // Build update query dynamically
      const updateFields: string[] = []
      const values: any[] = []
      let paramCount = 1

      Object.entries(updateData).forEach(([key, value]) => {
        if (value !== undefined) {
          const dbField = key.replace(/([A-Z])/g, '_$1').toLowerCase()
          
          if (['services', 'medications', 'lab_tests', 'procedures'].includes(dbField)) {
            updateFields.push(`${dbField.replace('lab_tests', 'lab_tests_ordered').replace('services', 'services_provided').replace('medications', 'medications_prescribed').replace('procedures', 'procedures_performed')} = $${paramCount++}`)
            values.push(JSON.stringify(value))
          } else {
            updateFields.push(`${dbField} = $${paramCount++}`)
            values.push(value)
          }
        }
      })

      updateFields.push(`updated_at = CURRENT_TIMESTAMP`)
      values.push(id)

      const query = `
        UPDATE patient_encounters 
        SET ${updateFields.join(', ')}
        WHERE id = $${paramCount}
        RETURNING *
      `

      const result = await pool.query(query, values)

      res.json({
        success: true,
        data: result.rows[0],
        message: "Encounter updated successfully"
      })

    } catch (error) {
      console.error("Error updating encounter:", error)
      res.status(500).json({
        success: false,
        message: "Failed to update encounter"
      })
    }
  }
)

export default router
