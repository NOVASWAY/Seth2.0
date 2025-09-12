"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const express_validator_1 = require("express-validator");
const auth_1 = require("../middleware/auth");
const PatientAssignment_1 = require("../models/PatientAssignment");
const EventLoggerService_1 = require("../services/EventLoggerService");
const types_1 = require("../types");
const router = express_1.default.Router();
// Quick assignment endpoint - simplified for easy use
router.post("/quick-assign", auth_1.authenticate, (0, auth_1.authorize)([types_1.UserRole.ADMIN, types_1.UserRole.CLINICAL_OFFICER, types_1.UserRole.NURSE, types_1.UserRole.PHARMACIST]), [
    (0, express_validator_1.body)("patient_id").isUUID().withMessage("Valid patient ID is required"),
    (0, express_validator_1.body)("assigned_to_user_id").isUUID().withMessage("Valid user ID is required"),
    (0, express_validator_1.body)("assignment_type").optional().isIn([
        "GENERAL", "PRIMARY_CARE", "SPECIALIST", "NURSE", "PHARMACIST", "FOLLOW_UP", "REFERRAL"
    ]).withMessage("Invalid assignment type"),
    (0, express_validator_1.body)("priority").optional().isIn(["LOW", "NORMAL", "HIGH", "URGENT"]).withMessage("Invalid priority"),
    (0, express_validator_1.body)("assignment_reason").optional().isString().isLength({ max: 500 }).withMessage("Assignment reason too long"),
    (0, express_validator_1.body)("due_date").optional().isISO8601().withMessage("Invalid due date format"),
    (0, express_validator_1.body)("notes").optional().isString().isLength({ max: 1000 }).withMessage("Notes too long"),
], async (req, res) => {
    try {
        const errors = (0, express_validator_1.validationResult)(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                message: "Validation failed",
                errors: errors.array(),
            });
        }
        const assignmentData = {
            ...req.body,
            assigned_by_user_id: req.user.id,
            assignment_type: req.body.assignment_type || "GENERAL",
            priority: req.body.priority || "NORMAL",
        };
        const assignment = await PatientAssignment_1.PatientAssignmentModel.create(assignmentData);
        // Log the assignment event
        await EventLoggerService_1.EventLoggerService.logEvent({
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
        });
        res.status(201).json({
            success: true,
            message: "Patient assigned successfully",
            data: assignment,
        });
    }
    catch (error) {
        console.error("Error creating quick assignment:", error);
        res.status(500).json({
            success: false,
            message: error.message || "Failed to assign patient",
        });
    }
});
// Get my assignments - simplified for dashboard
router.get("/my-assignments", auth_1.authenticate, async (req, res) => {
    try {
        const { status = "ACTIVE", limit = 10 } = req.query;
        const assignments = await PatientAssignment_1.PatientAssignmentModel.findByAssignedToUserId(req.user.id, status);
        // Limit results
        const limitedAssignments = assignments.slice(0, parseInt(limit));
        res.json({
            success: true,
            data: limitedAssignments,
            total: assignments.length,
        });
    }
    catch (error) {
        console.error("Error fetching my assignments:", error);
        res.status(500).json({
            success: false,
            message: error.message || "Failed to fetch assignments",
        });
    }
});
// Complete assignment - simplified
router.put("/complete/:id", auth_1.authenticate, [
    (0, express_validator_1.body)("notes").optional().isString().isLength({ max: 1000 }).withMessage("Notes too long"),
], async (req, res) => {
    try {
        const errors = (0, express_validator_1.validationResult)(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                message: "Validation failed",
                errors: errors.array(),
            });
        }
        const { id } = req.params;
        const { notes } = req.body;
        // Check if assignment exists and belongs to user
        const assignment = await PatientAssignment_1.PatientAssignmentModel.findById(id);
        if (!assignment) {
            return res.status(404).json({
                success: false,
                message: "Assignment not found",
            });
        }
        if (assignment.assigned_to_user_id !== req.user.id) {
            return res.status(403).json({
                success: false,
                message: "You can only complete your own assignments",
            });
        }
        if (assignment.status !== "ACTIVE") {
            return res.status(400).json({
                success: false,
                message: "Assignment is not active",
            });
        }
        // Update assignment
        const updatedAssignment = await PatientAssignment_1.PatientAssignmentModel.update(id, {
            status: "COMPLETED",
            completed_at: new Date(),
            notes: notes || assignment.notes,
        });
        // Log the completion event
        await EventLoggerService_1.EventLoggerService.logEvent({
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
        });
        res.json({
            success: true,
            message: "Assignment completed successfully",
            data: updatedAssignment,
        });
    }
    catch (error) {
        console.error("Error completing assignment:", error);
        res.status(500).json({
            success: false,
            message: error.message || "Failed to complete assignment",
        });
    }
});
// Get assignment statistics for dashboard
router.get("/stats", auth_1.authenticate, async (req, res) => {
    try {
        const { assigned_to_user_id = req.user.id } = req.query;
        // Get all assignments for user
        const allAssignments = await PatientAssignment_1.PatientAssignmentModel.findByAssignedToUserId(assigned_to_user_id);
        const stats = {
            total: allAssignments.length,
            active: allAssignments.filter(a => a.status === "ACTIVE").length,
            completed: allAssignments.filter(a => a.status === "COMPLETED").length,
            urgent: allAssignments.filter(a => a.priority === "URGENT" && a.status === "ACTIVE").length,
            high: allAssignments.filter(a => a.priority === "HIGH" && a.status === "ACTIVE").length,
            overdue: allAssignments.filter(a => {
                if (a.status !== "ACTIVE" || !a.due_date)
                    return false;
                return new Date(a.due_date) < new Date();
            }).length,
        };
        res.json({
            success: true,
            data: stats,
        });
    }
    catch (error) {
        console.error("Error fetching assignment stats:", error);
        res.status(500).json({
            success: false,
            message: error.message || "Failed to fetch assignment statistics",
        });
    }
});
exports.default = router;
