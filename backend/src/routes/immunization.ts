import express from "express"
import { body, param, query, validationResult } from "express-validator"
import { ImmunizationModel } from "../models/Immunization"
import { authenticate, authorize } from "../middleware/auth"
import { auditLogger } from "../middleware/auditLogger"
import type { AuthenticatedRequest } from "../types"

const router = express.Router()

// Get all immunization schedules
router.get("/schedules", authenticate, async (req: AuthenticatedRequest, res) => {
  try {
    const schedules = await ImmunizationModel.getSchedules()
    res.json({
      success: true,
      data: schedules
    })
  } catch (error) {
    console.error("Error fetching immunization schedules:", error)
    res.status(500).json({
      success: false,
      message: "Failed to fetch immunization schedules"
    })
  }
})

// Get all vaccines
router.get("/vaccines", authenticate, async (req: AuthenticatedRequest, res) => {
  try {
    const vaccines = await ImmunizationModel.getVaccines()
    res.json({
      success: true,
      data: vaccines
    })
  } catch (error) {
    console.error("Error fetching vaccines:", error)
    res.status(500).json({
      success: false,
      message: "Failed to fetch vaccines"
    })
  }
})

// Get vaccines by schedule
router.get("/schedules/:scheduleId/vaccines", 
  authenticate,
  param("scheduleId").isUUID().withMessage("Invalid schedule ID"),
  async (req: AuthenticatedRequest, res) => {
    try {
      const errors = validationResult(req)
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: "Validation failed",
          errors: errors.array()
        })
      }

      const { scheduleId } = req.params
      const vaccines = await ImmunizationModel.getVaccinesBySchedule(scheduleId)
      
      res.json({
        success: true,
        data: vaccines
      })
    } catch (error) {
      console.error("Error fetching vaccines by schedule:", error)
      res.status(500).json({
        success: false,
        message: "Failed to fetch vaccines by schedule"
      })
    }
  }
)

// Get patient immunization schedule
router.get("/patients/:patientId/schedule",
  authenticate,
  param("patientId").isUUID().withMessage("Invalid patient ID"),
  async (req: AuthenticatedRequest, res) => {
    try {
      const errors = validationResult(req)
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: "Validation failed",
          errors: errors.array()
        })
      }

      const { patientId } = req.params
      const schedule = await ImmunizationModel.getPatientImmunizationSchedule(patientId)
      
      res.json({
        success: true,
        data: schedule
      })
    } catch (error) {
      console.error("Error fetching patient immunization schedule:", error)
      res.status(500).json({
        success: false,
        message: "Failed to fetch patient immunization schedule"
      })
    }
  }
)

// Get patient immunizations
router.get("/patients/:patientId/immunizations",
  authenticate,
  param("patientId").isUUID().withMessage("Invalid patient ID"),
  async (req: AuthenticatedRequest, res) => {
    try {
      const errors = validationResult(req)
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: "Validation failed",
          errors: errors.array()
        })
      }

      const { patientId } = req.params
      const immunizations = await ImmunizationModel.getPatientImmunizations(patientId)
      
      res.json({
        success: true,
        data: immunizations
      })
    } catch (error) {
      console.error("Error fetching patient immunizations:", error)
      res.status(500).json({
        success: false,
        message: "Failed to fetch patient immunizations"
      })
    }
  }
)

// Create patient immunization
router.post("/patients/:patientId/immunizations",
  authenticate,
  authorize(["NURSE", "CLINICAL_OFFICER", "ADMIN"]),
  auditLogger,
  param("patientId").isUUID().withMessage("Invalid patient ID"),
  body("vaccineId").isUUID().withMessage("Invalid vaccine ID"),
  body("immunizationDate").optional().isISO8601().withMessage("Invalid immunization date"),
  body("batchNumber").optional().isString().withMessage("Invalid batch number"),
  body("expiryDate").optional().isISO8601().withMessage("Invalid expiry date"),
  body("site").optional().isString().withMessage("Invalid site"),
  body("route").optional().isString().withMessage("Invalid route"),
  body("dosage").optional().isString().withMessage("Invalid dosage"),
  body("adverseReactions").optional().isString().withMessage("Invalid adverse reactions"),
  body("nextDueDate").optional().isISO8601().withMessage("Invalid next due date"),
  body("status").optional().isIn(["SCHEDULED", "COMPLETED", "MISSED", "CONTRAINDICATED"]).withMessage("Invalid status"),
  body("notes").optional().isString().withMessage("Invalid notes"),
  async (req: AuthenticatedRequest, res) => {
    try {
      const errors = validationResult(req)
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: "Validation failed",
          errors: errors.array()
        })
      }

      const { patientId } = req.params
      const immunizationData = {
        ...req.body,
        patientId,
        administeredBy: req.user!.id
      }

      const immunization = await ImmunizationModel.createPatientImmunization(immunizationData)
      
      res.status(201).json({
        success: true,
        message: "Immunization recorded successfully",
        data: immunization
      })
    } catch (error) {
      console.error("Error creating patient immunization:", error)
      res.status(500).json({
        success: false,
        message: "Failed to record immunization"
      })
    }
  }
)

// Update patient immunization
router.put("/immunizations/:immunizationId",
  authenticate,
  authorize(["NURSE", "CLINICAL_OFFICER", "ADMIN"]),
  auditLogger,
  param("immunizationId").isUUID().withMessage("Invalid immunization ID"),
  body("immunizationDate").optional().isISO8601().withMessage("Invalid immunization date"),
  body("batchNumber").optional().isString().withMessage("Invalid batch number"),
  body("expiryDate").optional().isISO8601().withMessage("Invalid expiry date"),
  body("site").optional().isString().withMessage("Invalid site"),
  body("route").optional().isString().withMessage("Invalid route"),
  body("dosage").optional().isString().withMessage("Invalid dosage"),
  body("adverseReactions").optional().isString().withMessage("Invalid adverse reactions"),
  body("nextDueDate").optional().isISO8601().withMessage("Invalid next due date"),
  body("status").optional().isIn(["SCHEDULED", "COMPLETED", "MISSED", "CONTRAINDICATED"]).withMessage("Invalid status"),
  body("notes").optional().isString().withMessage("Invalid notes"),
  async (req: AuthenticatedRequest, res) => {
    try {
      const errors = validationResult(req)
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: "Validation failed",
          errors: errors.array()
        })
      }

      const { immunizationId } = req.params
      const immunization = await ImmunizationModel.updatePatientImmunization(immunizationId, req.body)
      
      if (!immunization) {
        return res.status(404).json({
          success: false,
          message: "Immunization not found"
        })
      }

      res.json({
        success: true,
        message: "Immunization updated successfully",
        data: immunization
      })
    } catch (error) {
      console.error("Error updating patient immunization:", error)
      res.status(500).json({
        success: false,
        message: "Failed to update immunization"
      })
    }
  }
)

// Delete patient immunization
router.delete("/immunizations/:immunizationId",
  authenticate,
  authorize(["NURSE", "CLINICAL_OFFICER", "ADMIN"]),
  auditLogger,
  param("immunizationId").isUUID().withMessage("Invalid immunization ID"),
  async (req: AuthenticatedRequest, res) => {
    try {
      const errors = validationResult(req)
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: "Validation failed",
          errors: errors.array()
        })
      }

      const { immunizationId } = req.params
      const deleted = await ImmunizationModel.deletePatientImmunization(immunizationId)
      
      if (!deleted) {
        return res.status(404).json({
          success: false,
          message: "Immunization not found"
        })
      }

      res.json({
        success: true,
        message: "Immunization deleted successfully"
      })
    } catch (error) {
      console.error("Error deleting patient immunization:", error)
      res.status(500).json({
        success: false,
        message: "Failed to delete immunization"
      })
    }
  }
)

export default router
