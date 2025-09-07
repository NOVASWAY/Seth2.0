import express from "express"
import { body, query, validationResult } from "express-validator"
import { PatientAssignmentModel } from "../models/PatientAssignment"
import { EventLoggerService } from "../services/EventLoggerService"
import { authorize, type AuthenticatedRequest } from "../middleware/auth"
import { UserRole } from "../types"

const router = express.Router()

// Get all patient assignments with filtering and pagination
router.get(
  "/",
  authorize([UserRole.ADMIN, UserRole.CLINICAL_OFFICER, UserRole.NURSE, UserRole.PHARMACIST, UserRole.CASHIER]),
  [
    query("status").optional().isIn(["ACTIVE", "COMPLETED", "CANCELLED", "TRANSFERRED"]),
    query("assignment_type").optional().isIn(["GENERAL", "PRIMARY_CARE", "SPECIALIST", "NURSE", "PHARMACIST", "FOLLOW_UP", "REFERRAL"]),
    query("priority").optional().isIn(["LOW", "NORMAL", "HIGH", "URGENT"]),
    query("assigned_to_user_id").optional().isUUID(),
    query("assigned_by_user_id").optional().isUUID(),
    query("limit").optional().isInt({ min: 1, max: 1000 }),
    query("offset").optional().isInt({ min: 0 }),
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

      const filters = {
        status: req.query.status as string,
        assignment_type: req.query.assignment_type as string,
        priority: req.query.priority as string,
        assigned_to_user_id: req.query.assigned_to_user_id as string,
        assigned_by_user_id: req.query.assigned_by_user_id as string,
        limit: req.query.limit ? parseInt(req.query.limit as string) : 50,
        offset: req.query.offset ? parseInt(req.query.offset as string) : 0,
      }

      const result = await PatientAssignmentModel.findAll(filters)

      res.json({
        success: true,
        data: result.assignments,
        pagination: {
          total: result.total,
          limit: filters.limit,
          offset: filters.offset,
          has_more: result.assignments.length === filters.limit,
        },
      })
    } catch (error) {
      console.error("Error fetching patient assignments:", error)
      res.status(500).json({
        success: false,
        message: "Failed to fetch patient assignments",
      })
    }
  }
)

// Get patient assignments for a specific patient
router.get(
  "/patient/:patientId",
  authorize([UserRole.ADMIN, UserRole.CLINICAL_OFFICER, UserRole.NURSE, UserRole.PHARMACIST, UserRole.CASHIER]),
  async (req: AuthenticatedRequest, res) => {
    try {
      const { patientId } = req.params
      const assignments = await PatientAssignmentModel.findByPatientId(patientId)

      res.json({
        success: true,
        data: assignments,
      })
    } catch (error) {
      console.error("Error fetching patient assignments:", error)
      res.status(500).json({
        success: false,
        message: "Failed to fetch patient assignments",
      })
    }
  }
)

// Get patient assignments for a specific user
router.get(
  "/user/:userId",
  authorize([UserRole.ADMIN, UserRole.CLINICAL_OFFICER, UserRole.NURSE, UserRole.PHARMACIST, UserRole.CASHIER]),
  async (req: AuthenticatedRequest, res) => {
    try {
      const { userId } = req.params
      const { status } = req.query
      const assignments = await PatientAssignmentModel.findByAssignedToUserId(userId, status as string)

      res.json({
        success: true,
        data: assignments,
      })
    } catch (error) {
      console.error("Error fetching user assignments:", error)
      res.status(500).json({
        success: false,
        message: "Failed to fetch user assignments",
      })
    }
  }
)

// Get assignment statistics
router.get(
  "/stats",
  authorize([UserRole.ADMIN, UserRole.CLINICAL_OFFICER]),
  async (req: AuthenticatedRequest, res) => {
    try {
      const stats = await PatientAssignmentModel.getAssignmentStats()

      res.json({
        success: true,
        data: stats,
      })
    } catch (error) {
      console.error("Error fetching assignment stats:", error)
      res.status(500).json({
        success: false,
        message: "Failed to fetch assignment statistics",
      })
    }
  }
)

// Get assignment by ID
router.get(
  "/:id",
  authorize([UserRole.ADMIN, UserRole.CLINICAL_OFFICER, UserRole.NURSE, UserRole.PHARMACIST, UserRole.CASHIER]),
  async (req: AuthenticatedRequest, res) => {
    try {
      const { id } = req.params
      const assignment = await PatientAssignmentModel.findById(id)

      if (!assignment) {
        return res.status(404).json({
          success: false,
          message: "Assignment not found",
        })
      }

      res.json({
        success: true,
        data: assignment,
      })
    } catch (error) {
      console.error("Error fetching assignment:", error)
      res.status(500).json({
        success: false,
        message: "Failed to fetch assignment",
      })
    }
  }
)

// Create new patient assignment
router.post(
  "/",
  authorize([UserRole.ADMIN, UserRole.CLINICAL_OFFICER, UserRole.NURSE, UserRole.PHARMACIST, UserRole.CASHIER]),
  [
    body("patient_id").isUUID().withMessage("Valid patient ID is required"),
    body("assigned_to_user_id").isUUID().withMessage("Valid assigned to user ID is required"),
    body("assignment_type").isIn(["GENERAL", "PRIMARY_CARE", "SPECIALIST", "NURSE", "PHARMACIST", "FOLLOW_UP", "REFERRAL"]).withMessage("Valid assignment type is required"),
    body("assignment_reason").optional().isString(),
    body("priority").optional().isIn(["LOW", "NORMAL", "HIGH", "URGENT"]),
    body("due_date").optional().isISO8601().withMessage("Valid due date is required"),
    body("notes").optional().isString(),
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

      const assignmentData = {
        ...req.body,
        assigned_by_user_id: req.user.id,
      }

      const assignment = await PatientAssignmentModel.create(assignmentData)

      // Log the assignment event
      await EventLoggerService.logEvent({
        event_type: "PATIENT",
        user_id: req.user.id,
        username: req.user.username,
        target_type: "patient_assignment",
        target_id: assignment.id,
        action: "create_assignment",
        details: {
          patient_id: assignment.patient_id,
          assigned_to_user_id: assignment.assigned_to_user_id,
          assignment_type: assignment.assignment_type,
          priority: assignment.priority
        },
        ip_address: req.ip,
        user_agent: req.get("User-Agent"),
        severity: "MEDIUM",
      })

      res.status(201).json({
        success: true,
        message: "Patient assignment created successfully",
        data: assignment,
      })
    } catch (error: any) {
      console.error("Error creating patient assignment:", error)
      res.status(500).json({
        success: false,
        message: error.message || "Failed to create patient assignment",
      })
    }
  }
)

// Update patient assignment
router.put(
  "/:id",
  authorize([UserRole.ADMIN, UserRole.CLINICAL_OFFICER, UserRole.NURSE, UserRole.PHARMACIST, UserRole.CASHIER]),
  [
    body("status").optional().isIn(["ACTIVE", "COMPLETED", "CANCELLED", "TRANSFERRED"]),
    body("priority").optional().isIn(["LOW", "NORMAL", "HIGH", "URGENT"]),
    body("assignment_reason").optional().isString(),
    body("due_date").optional().isISO8601().withMessage("Valid due date is required"),
    body("notes").optional().isString(),
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

      const { id } = req.params
      const updateData = { ...req.body }

      // If marking as completed, set completed_at
      if (updateData.status === 'COMPLETED' && !updateData.completed_at) {
        updateData.completed_at = new Date()
      }

      const assignment = await PatientAssignmentModel.update(id, updateData)

      if (!assignment) {
        return res.status(404).json({
          success: false,
          message: "Assignment not found",
        })
      }

      // Log the update event
      await EventLoggerService.logEvent({
        event_type: "PATIENT",
        user_id: req.user.id,
        username: req.user.username,
        target_type: "patient_assignment",
        target_id: id,
        action: "update_assignment",
        details: updateData,
        ip_address: req.ip,
        user_agent: req.get("User-Agent"),
        severity: "MEDIUM",
      })

      res.json({
        success: true,
        message: "Patient assignment updated successfully",
        data: assignment,
      })
    } catch (error: any) {
      console.error("Error updating patient assignment:", error)
      res.status(500).json({
        success: false,
        message: error.message || "Failed to update patient assignment",
      })
    }
  }
)

// Delete patient assignment
router.delete(
  "/:id",
  authorize([UserRole.ADMIN, UserRole.CLINICAL_OFFICER]),
  async (req: AuthenticatedRequest, res) => {
    try {
      const { id } = req.params

      // Get assignment details for logging before deletion
      const assignment = await PatientAssignmentModel.findById(id)
      if (!assignment) {
        return res.status(404).json({
          success: false,
          message: "Assignment not found",
        })
      }

      const deleted = await PatientAssignmentModel.delete(id)

      if (!deleted) {
        return res.status(404).json({
          success: false,
          message: "Assignment not found",
        })
      }

      // Log the deletion event
      await EventLoggerService.logEvent({
        event_type: "PATIENT",
        user_id: req.user.id,
        username: req.user.username,
        target_type: "patient_assignment",
        target_id: id,
        action: "delete_assignment",
        details: {
          patient_id: assignment.patient_id,
          assigned_to_user_id: assignment.assigned_to_user_id,
          assignment_type: assignment.assignment_type
        },
        ip_address: req.ip,
        user_agent: req.get("User-Agent"),
        severity: "HIGH",
      })

      res.json({
        success: true,
        message: "Patient assignment deleted successfully",
      })
    } catch (error: any) {
      console.error("Error deleting patient assignment:", error)
      res.status(500).json({
        success: false,
        message: error.message || "Failed to delete patient assignment",
      })
    }
  }
)

export default router
