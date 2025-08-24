import express from "express"
import { body, validationResult } from "express-validator"
import { VisitModel } from "../models/Visit"
import { PatientModel } from "../models/Patient"
import { authorize, type AuthenticatedRequest } from "../middleware/auth"
import { UserRole, VisitStatus } from "../types"

const router = express.Router()

// Get today's queue
router.get(
  "/queue",
  authorize([UserRole.ADMIN, UserRole.RECEPTIONIST, UserRole.NURSE, UserRole.CLINICAL_OFFICER]),
  async (req: AuthenticatedRequest, res) => {
    try {
      const queueItems = await VisitModel.getQueueItems()
      const stats = await VisitModel.getVisitStats()

      res.json({
        success: true,
        data: {
          queue: queueItems,
          stats,
        },
      })
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Failed to fetch queue",
      })
    }
  },
)

// Create new visit (register patient for today)
router.post(
  "/",
  authorize([UserRole.ADMIN, UserRole.RECEPTIONIST]),
  [
    body("patientId").isUUID().withMessage("Invalid patient ID"),
    body("chiefComplaint").optional().trim().isLength({ min: 1 }).withMessage("Chief complaint cannot be empty"),
    body("triageCategory").optional().isIn(["EMERGENCY", "URGENT", "NORMAL"]).withMessage("Invalid triage category"),
  ],
  async (req: AuthenticatedRequest, res) => {
    try {
      const errors = validationResult(req)
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: "Validation failed",
          errors: errors.array(),
        })
      }

      const { patientId, chiefComplaint, triageCategory } = req.body

      // Verify patient exists
      const patient = await PatientModel.findById(patientId)
      if (!patient) {
        return res.status(404).json({
          success: false,
          message: "Patient not found",
        })
      }

      // Check if patient already has a visit today
      const todaysVisits = await VisitModel.findByPatientId(patientId, 1)
      const hasVisitToday = todaysVisits.some((visit) => {
        const visitDate = new Date(visit.visitDate)
        const today = new Date()
        return visitDate.toDateString() === today.toDateString()
      })

      if (hasVisitToday) {
        return res.status(409).json({
          success: false,
          message: "Patient already has a visit registered for today",
        })
      }

      const visit = await VisitModel.create({
        patientId,
        opNumber: patient.opNumber,
        chiefComplaint,
        triageCategory,
      })

      res.status(201).json({
        success: true,
        message: "Visit registered successfully",
        data: visit,
      })
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Failed to register visit",
      })
    }
  },
)

// Update visit status
router.patch(
  "/:id/status",
  authorize([UserRole.ADMIN, UserRole.NURSE, UserRole.CLINICAL_OFFICER, UserRole.PHARMACIST]),
  [body("status").isIn(Object.values(VisitStatus)).withMessage("Invalid visit status")],
  async (req: AuthenticatedRequest, res) => {
    try {
      const errors = validationResult(req)
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: "Validation failed",
          errors: errors.array(),
        })
      }

      const { id } = req.params
      const { status } = req.body

      const visit = await VisitModel.updateStatus(id, status)

      if (!visit) {
        return res.status(404).json({
          success: false,
          message: "Visit not found",
        })
      }

      res.json({
        success: true,
        message: "Visit status updated successfully",
        data: visit,
      })
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Failed to update visit status",
      })
    }
  },
)

// Get visit details
router.get(
  "/:id",
  authorize([UserRole.ADMIN, UserRole.NURSE, UserRole.CLINICAL_OFFICER, UserRole.PHARMACIST]),
  async (req: AuthenticatedRequest, res) => {
    try {
      const { id } = req.params
      const visit = await VisitModel.findById(id)

      if (!visit) {
        return res.status(404).json({
          success: false,
          message: "Visit not found",
        })
      }

      // Get patient details
      const patient = await PatientModel.findById(visit.patientId)

      res.json({
        success: true,
        data: {
          visit,
          patient,
        },
      })
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Failed to fetch visit details",
      })
    }
  },
)

export default router
