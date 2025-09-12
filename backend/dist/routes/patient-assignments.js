"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const express_validator_1 = require("express-validator");
const PatientAssignment_1 = require("../models/PatientAssignment");
const EventLoggerService_1 = require("../services/EventLoggerService");
const auth_1 = require("../middleware/auth");
const types_1 = require("../types");
const router = express_1.default.Router();
// Get all patient assignments with filtering and pagination
router.get("/", (0, auth_1.authorize)([types_1.UserRole.ADMIN, types_1.UserRole.CLINICAL_OFFICER, types_1.UserRole.NURSE, types_1.UserRole.PHARMACIST]), [
    (0, express_validator_1.query)("status").optional().isIn(["ACTIVE", "COMPLETED", "CANCELLED", "TRANSFERRED"]),
    (0, express_validator_1.query)("assignment_type").optional().isIn(["GENERAL", "PRIMARY_CARE", "SPECIALIST", "NURSE", "PHARMACIST", "FOLLOW_UP", "REFERRAL"]),
    (0, express_validator_1.query)("priority").optional().isIn(["LOW", "NORMAL", "HIGH", "URGENT"]),
    (0, express_validator_1.query)("assigned_to_user_id").optional().isUUID(),
    (0, express_validator_1.query)("assigned_by_user_id").optional().isUUID(),
    (0, express_validator_1.query)("limit").optional().isInt({ min: 1, max: 1000 }),
    (0, express_validator_1.query)("offset").optional().isInt({ min: 0 }),
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
        const filters = {
            status: req.query.status,
            assignment_type: req.query.assignment_type,
            priority: req.query.priority,
            assigned_to_user_id: req.query.assigned_to_user_id,
            assigned_by_user_id: req.query.assigned_by_user_id,
            limit: req.query.limit ? parseInt(req.query.limit) : 50,
            offset: req.query.offset ? parseInt(req.query.offset) : 0,
        };
        const result = await PatientAssignment_1.PatientAssignmentModel.findAll(filters);
        res.json({
            success: true,
            data: result.assignments,
            pagination: {
                total: result.total,
                limit: filters.limit,
                offset: filters.offset,
                has_more: result.assignments.length === filters.limit,
            },
        });
    }
    catch (error) {
        console.error("Error fetching patient assignments:", error);
        res.status(500).json({
            success: false,
            message: "Failed to fetch patient assignments",
        });
    }
});
// Get patient assignments for a specific patient
router.get("/patient/:patientId", (0, auth_1.authorize)([types_1.UserRole.ADMIN, types_1.UserRole.CLINICAL_OFFICER, types_1.UserRole.NURSE, types_1.UserRole.PHARMACIST]), async (req, res) => {
    try {
        const { patientId } = req.params;
        const assignments = await PatientAssignment_1.PatientAssignmentModel.findByPatientId(patientId);
        res.json({
            success: true,
            data: assignments,
        });
    }
    catch (error) {
        console.error("Error fetching patient assignments:", error);
        res.status(500).json({
            success: false,
            message: "Failed to fetch patient assignments",
        });
    }
});
// Get patient assignments for a specific user
router.get("/user/:userId", (0, auth_1.authorize)([types_1.UserRole.ADMIN, types_1.UserRole.CLINICAL_OFFICER, types_1.UserRole.NURSE, types_1.UserRole.PHARMACIST]), async (req, res) => {
    try {
        const { userId } = req.params;
        const { status } = req.query;
        const assignments = await PatientAssignment_1.PatientAssignmentModel.findByAssignedToUserId(userId, status);
        res.json({
            success: true,
            data: assignments,
        });
    }
    catch (error) {
        console.error("Error fetching user assignments:", error);
        res.status(500).json({
            success: false,
            message: "Failed to fetch user assignments",
        });
    }
});
// Get assignment statistics
router.get("/stats", (0, auth_1.authorize)([types_1.UserRole.ADMIN, types_1.UserRole.CLINICAL_OFFICER]), async (req, res) => {
    try {
        const stats = await PatientAssignment_1.PatientAssignmentModel.getAssignmentStats();
        res.json({
            success: true,
            data: stats,
        });
    }
    catch (error) {
        console.error("Error fetching assignment stats:", error);
        res.status(500).json({
            success: false,
            message: "Failed to fetch assignment statistics",
        });
    }
});
// Get assignment by ID
router.get("/:id", (0, auth_1.authorize)([types_1.UserRole.ADMIN, types_1.UserRole.CLINICAL_OFFICER, types_1.UserRole.NURSE, types_1.UserRole.PHARMACIST]), async (req, res) => {
    try {
        const { id } = req.params;
        const assignment = await PatientAssignment_1.PatientAssignmentModel.findById(id);
        if (!assignment) {
            return res.status(404).json({
                success: false,
                message: "Assignment not found",
            });
        }
        res.json({
            success: true,
            data: assignment,
        });
    }
    catch (error) {
        console.error("Error fetching assignment:", error);
        res.status(500).json({
            success: false,
            message: "Failed to fetch assignment",
        });
    }
});
// Create new patient assignment
router.post("/", (0, auth_1.authorize)([types_1.UserRole.ADMIN, types_1.UserRole.CLINICAL_OFFICER, types_1.UserRole.NURSE, types_1.UserRole.PHARMACIST]), [
    (0, express_validator_1.body)("patient_id").isUUID().withMessage("Valid patient ID is required"),
    (0, express_validator_1.body)("assigned_to_user_id").isUUID().withMessage("Valid assigned to user ID is required"),
    (0, express_validator_1.body)("assignment_type").isIn(["GENERAL", "PRIMARY_CARE", "SPECIALIST", "NURSE", "PHARMACIST", "FOLLOW_UP", "REFERRAL"]).withMessage("Valid assignment type is required"),
    (0, express_validator_1.body)("assignment_reason").optional().isString(),
    (0, express_validator_1.body)("priority").optional().isIn(["LOW", "NORMAL", "HIGH", "URGENT"]),
    (0, express_validator_1.body)("due_date").optional().isISO8601().withMessage("Valid due date is required"),
    (0, express_validator_1.body)("notes").optional().isString(),
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
        };
        const assignment = await PatientAssignment_1.PatientAssignmentModel.create(assignmentData);
        // Log the assignment event
        await EventLoggerService_1.EventLoggerService.logEvent({
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
        });
        res.status(201).json({
            success: true,
            message: "Patient assignment created successfully",
            data: assignment,
        });
    }
    catch (error) {
        console.error("Error creating patient assignment:", error);
        res.status(500).json({
            success: false,
            message: error.message || "Failed to create patient assignment",
        });
    }
});
// Delete patient assignment (deactivate)
router.delete("/patient/:patientId/user/:userId", (0, auth_1.authorize)([types_1.UserRole.ADMIN, types_1.UserRole.CLINICAL_OFFICER, types_1.UserRole.NURSE, types_1.UserRole.PHARMACIST]), async (req, res) => {
    try {
        const { patientId, userId } = req.params;
        // Find and deactivate the assignment
        const assignment = await PatientAssignment_1.PatientAssignmentModel.findByPatientAndUser(patientId, userId);
        if (!assignment) {
            return res.status(404).json({
                success: false,
                message: "Assignment not found",
            });
        }
        // Update assignment status to CANCELLED
        await PatientAssignment_1.PatientAssignmentModel.update(assignment.id, {
            status: "CANCELLED",
            updated_at: new Date(),
        });
        // Log the assignment event
        await EventLoggerService_1.EventLoggerService.logEvent({
            event_type: "PATIENT",
            user_id: req.user.id,
            username: req.user.username,
            target_type: "patient_assignment",
            target_id: assignment.id,
            action: "remove_assignment",
            details: {
                patient_id: patientId,
                assigned_to_user_id: userId,
            },
            ip_address: req.ip,
            user_agent: req.get("User-Agent"),
            severity: "MEDIUM",
        });
        res.json({
            success: true,
            message: "Patient assignment removed successfully",
        });
    }
    catch (error) {
        console.error("Error removing patient assignment:", error);
        res.status(500).json({
            success: false,
            message: error.message || "Failed to remove patient assignment",
        });
    }
});
// Update patient assignment
router.put("/:id", (0, auth_1.authorize)([types_1.UserRole.ADMIN, types_1.UserRole.CLINICAL_OFFICER, types_1.UserRole.NURSE, types_1.UserRole.PHARMACIST]), [
    (0, express_validator_1.body)("status").optional().isIn(["ACTIVE", "COMPLETED", "CANCELLED", "TRANSFERRED"]),
    (0, express_validator_1.body)("priority").optional().isIn(["LOW", "NORMAL", "HIGH", "URGENT"]),
    (0, express_validator_1.body)("assignment_reason").optional().isString(),
    (0, express_validator_1.body)("due_date").optional().isISO8601().withMessage("Valid due date is required"),
    (0, express_validator_1.body)("notes").optional().isString(),
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
        const updateData = { ...req.body };
        // If marking as completed, set completed_at
        if (updateData.status === 'COMPLETED' && !updateData.completed_at) {
            updateData.completed_at = new Date();
        }
        const assignment = await PatientAssignment_1.PatientAssignmentModel.update(id, updateData);
        if (!assignment) {
            return res.status(404).json({
                success: false,
                message: "Assignment not found",
            });
        }
        // Log the update event
        await EventLoggerService_1.EventLoggerService.logEvent({
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
        });
        res.json({
            success: true,
            message: "Patient assignment updated successfully",
            data: assignment,
        });
    }
    catch (error) {
        console.error("Error updating patient assignment:", error);
        res.status(500).json({
            success: false,
            message: error.message || "Failed to update patient assignment",
        });
    }
});
// Delete patient assignment
router.delete("/:id", (0, auth_1.authorize)([types_1.UserRole.ADMIN, types_1.UserRole.CLINICAL_OFFICER]), async (req, res) => {
    try {
        const { id } = req.params;
        // Get assignment details for logging before deletion
        const assignment = await PatientAssignment_1.PatientAssignmentModel.findById(id);
        if (!assignment) {
            return res.status(404).json({
                success: false,
                message: "Assignment not found",
            });
        }
        const deleted = await PatientAssignment_1.PatientAssignmentModel.delete(id);
        if (!deleted) {
            return res.status(404).json({
                success: false,
                message: "Assignment not found",
            });
        }
        // Log the deletion event
        await EventLoggerService_1.EventLoggerService.logEvent({
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
        });
        res.json({
            success: true,
            message: "Patient assignment deleted successfully",
        });
    }
    catch (error) {
        console.error("Error deleting patient assignment:", error);
        res.status(500).json({
            success: false,
            message: error.message || "Failed to delete patient assignment",
        });
    }
});
exports.default = router;
