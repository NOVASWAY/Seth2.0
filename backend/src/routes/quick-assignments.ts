import express from "express"
import { body, validationResult } from "express-validator"
import { authenticate, authorize } from "../middleware/auth"
import { PatientAssignmentModel } from "../models/PatientAssignment"
import { EventLoggerService } from "../services/EventLoggerService"
import { UserRole } from "../types"

const router = express.Router()

// Quick assignment endpoint - simplified for easy use
router.post(
  "/quick-assign",
  authenticate,
  authorize([UserRole.ADMIN, UserRole.CLINICAL_OFFICER, UserRole.NURSE, UserRole.PHARMACIST]),
  [
    body("patient_id").isUUID().withMessage("Valid patient ID is required"),
    body("assigned_to_user_id").isUUID().withMessage("Valid user ID is required"),
    body("assignment_type").optional().isIn([
      "GENERAL", "PRIMARY_CARE", "SPECIALIST", "NURSE", "PHARMACIST", "FOLLOW_UP", "REFERRAL"
    ]).withMessage("Invalid assignment type"),
    body("priority").optional().isIn(["LOW", "NORMAL", "HIGH", "URGENT"]).withMessage("Invalid priority"),
    body("assignment_reason").optional().isString().isLength({ max: 500 }).withMessage("Assignment reason too long"),
    body("due_date").optional().isISO8601().withMessage("Invalid due date format"),
    body("notes").optional().isString().isLength({ max: 1000 }).withMessage("Notes too long"),
  ],
  async (req: any, res) => {
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
        assignment_type: req.body.assignment_type || "GENERAL",
        priority: req.body.priority || "NORMAL",
      }

      const assignment = await PatientAssignmentModel.create(assignmentData)

      // Log the assignment event
      await EventLoggerService.logEvent({
        event_type: "PATIENT",
        user_id: req.user.id,
        username: req.user.username,
        target_type: "patient_assignment",
        target_id: assignment.id,
        action: "quick_assign",
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
        message: "Patient assigned successfully",
        data: assignment,
      })
    } catch (error: any) {
      console.error("Error creating quick assignment:", error)
      res.status(500).json({
        success: false,
        message: error.message || "Failed to assign patient",
      })
    }
  }
)

// Get my assignments - simplified for dashboard
router.get(
  "/my-assignments",
  authenticate,
  async (req: any, res) => {
    try {
      const { status = "ACTIVE", limit = 10 } = req.query
      
      const assignments = await PatientAssignmentModel.findByAssignedToUserId(
        req.user.id,
        status as string
      )

      // Limit results
      const limitedAssignments = assignments.slice(0, parseInt(limit as string))

      res.json({
        success: true,
        data: limitedAssignments,
        total: assignments.length,
      })
    } catch (error: any) {
      console.error("Error fetching my assignments:", error)
      res.status(500).json({
        success: false,
        message: error.message || "Failed to fetch assignments",
      })
    }
  }
)

// Complete assignment - simplified
router.put(
  "/complete/:id",
  authenticate,
  [
    body("notes").optional().isString().isLength({ max: 1000 }).withMessage("Notes too long"),
  ],
  async (req: any, res) => {
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
      const { notes } = req.body

      // Check if assignment exists and belongs to user
      const assignment = await PatientAssignmentModel.findById(id)
      if (!assignment) {
        return res.status(404).json({
          success: false,
          message: "Assignment not found",
        })
      }

      if (assignment.assigned_to_user_id !== req.user.id) {
        return res.status(403).json({
          success: false,
          message: "You can only complete your own assignments",
        })
      }

      if (assignment.status !== "ACTIVE") {
        return res.status(400).json({
          success: false,
          message: "Assignment is not active",
        })
      }

      // Update assignment
      const updatedAssignment = await PatientAssignmentModel.update(id, {
        status: "COMPLETED",
        completed_at: new Date(),
        notes: notes || assignment.notes,
      })

      // Log the completion event
      await EventLoggerService.logEvent({
        event_type: "PATIENT",
        user_id: req.user.id,
        username: req.user.username,
        target_type: "patient_assignment",
        target_id: assignment.id,
        action: "complete_assignment",
        details: {
          patient_id: assignment.patient_id,
          assignment_type: assignment.assignment_type,
          priority: assignment.priority
        },
        ip_address: req.ip,
        user_agent: req.get("User-Agent"),
        severity: "LOW",
      })

      res.json({
        success: true,
        message: "Assignment completed successfully",
        data: updatedAssignment,
      })
    } catch (error: any) {
      console.error("Error completing assignment:", error)
      res.status(500).json({
        success: false,
        message: error.message || "Failed to complete assignment",
      })
    }
  }
)

// Get assignment statistics for dashboard
router.get(
  "/stats",
  authenticate,
  async (req: any, res) => {
    try {
      const { assigned_to_user_id = req.user.id } = req.query

      // Get all assignments for user
      const allAssignments = await PatientAssignmentModel.findByAssignedToUserId(assigned_to_user_id as string)
      
      const stats = {
        total: allAssignments.length,
        active: allAssignments.filter(a => a.status === "ACTIVE").length,
        completed: allAssignments.filter(a => a.status === "COMPLETED").length,
        urgent: allAssignments.filter(a => a.priority === "URGENT" && a.status === "ACTIVE").length,
        high: allAssignments.filter(a => a.priority === "HIGH" && a.status === "ACTIVE").length,
        overdue: allAssignments.filter(a => {
          if (a.status !== "ACTIVE" || !a.due_date) return false
          return new Date(a.due_date) < new Date()
        }).length,
      }

      res.json({
        success: true,
        data: stats,
      })
    } catch (error: any) {
      console.error("Error fetching assignment stats:", error)
      res.status(500).json({
        success: false,
        message: error.message || "Failed to fetch assignment statistics",
      })
    }
  }
)

export default router
