"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const express_validator_1 = require("express-validator");
const LabRequest_1 = require("../models/LabRequest");
const auth_1 = require("../middleware/auth");
const types_1 = require("../types");
const router = express_1.default.Router();
// Get all lab requests
router.get("/", (0, auth_1.authorize)([types_1.UserRole.ADMIN, types_1.UserRole.CLINICAL_OFFICER, types_1.UserRole.LAB_TECHNICIAN]), [
    (0, express_validator_1.query)("status").optional().isString().withMessage("Status must be a string"),
    (0, express_validator_1.query)("urgency").optional().isString().withMessage("Urgency must be a string"),
], async (req, res) => {
    try {
        const errors = (0, express_validator_1.validationResult)(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                errors: errors.array().map(err => err.msg)
            });
        }
        const { status, urgency } = req.query;
        const requests = await LabRequest_1.LabRequestModel.findAll(status, urgency);
        res.json({
            success: true,
            data: requests
        });
    }
    catch (error) {
        console.error("Error fetching lab requests:", error);
        res.status(500).json({
            success: false,
            message: "Failed to fetch lab requests"
        });
    }
});
// Get pending lab requests (for lab technicians)
router.get("/pending", (0, auth_1.authorize)([types_1.UserRole.ADMIN, types_1.UserRole.LAB_TECHNICIAN]), async (req, res) => {
    try {
        const requests = await LabRequest_1.LabRequestModel.getPendingRequests();
        res.json({
            success: true,
            data: requests
        });
    }
    catch (error) {
        console.error("Error fetching pending lab requests:", error);
        res.status(500).json({
            success: false,
            message: "Failed to fetch pending lab requests"
        });
    }
});
// Get completed lab requests
router.get("/completed", (0, auth_1.authorize)([types_1.UserRole.ADMIN, types_1.UserRole.CLINICAL_OFFICER, types_1.UserRole.LAB_TECHNICIAN]), [
    (0, express_validator_1.query)("startDate").optional().isISO8601().withMessage("Start date must be a valid date"),
    (0, express_validator_1.query)("endDate").optional().isISO8601().withMessage("End date must be a valid date"),
], async (req, res) => {
    try {
        const errors = (0, express_validator_1.validationResult)(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                errors: errors.array().map(err => err.msg)
            });
        }
        const { startDate, endDate } = req.query;
        const requests = await LabRequest_1.LabRequestModel.getCompletedRequests(startDate ? new Date(startDate) : undefined, endDate ? new Date(endDate) : undefined);
        res.json({
            success: true,
            data: requests
        });
    }
    catch (error) {
        console.error("Error fetching completed lab requests:", error);
        res.status(500).json({
            success: false,
            message: "Failed to fetch completed lab requests"
        });
    }
});
// Get lab requests for a specific patient
router.get("/patient/:patientId", (0, auth_1.authorize)([types_1.UserRole.ADMIN, types_1.UserRole.CLINICAL_OFFICER, types_1.UserRole.LAB_TECHNICIAN]), async (req, res) => {
    try {
        const { patientId } = req.params;
        const requests = await LabRequest_1.LabRequestModel.findByPatientId(patientId);
        res.json({
            success: true,
            data: requests
        });
    }
    catch (error) {
        console.error("Error fetching patient lab requests:", error);
        res.status(500).json({
            success: false,
            message: "Failed to fetch patient lab requests"
        });
    }
});
// Get lab requests for a specific visit
router.get("/visit/:visitId", (0, auth_1.authorize)([types_1.UserRole.ADMIN, types_1.UserRole.CLINICAL_OFFICER, types_1.UserRole.LAB_TECHNICIAN]), async (req, res) => {
    try {
        const { visitId } = req.params;
        const requests = await LabRequest_1.LabRequestModel.findByVisitId(visitId);
        res.json({
            success: true,
            data: requests
        });
    }
    catch (error) {
        console.error("Error fetching visit lab requests:", error);
        res.status(500).json({
            success: false,
            message: "Failed to fetch visit lab requests"
        });
    }
});
// Get lab request by ID
router.get("/:id", (0, auth_1.authorize)([types_1.UserRole.ADMIN, types_1.UserRole.CLINICAL_OFFICER, types_1.UserRole.LAB_TECHNICIAN]), async (req, res) => {
    try {
        const { id } = req.params;
        const request = await LabRequest_1.LabRequestModel.findById(id);
        if (!request) {
            return res.status(404).json({
                success: false,
                message: "Lab request not found"
            });
        }
        // Get request items
        const items = await LabRequest_1.LabRequestModel.getRequestItems(id);
        res.json({
            success: true,
            data: {
                ...request,
                items
            }
        });
    }
    catch (error) {
        console.error("Error fetching lab request:", error);
        res.status(500).json({
            success: false,
            message: "Failed to fetch lab request"
        });
    }
});
// Create new lab request
router.post("/", (0, auth_1.authorize)([types_1.UserRole.ADMIN, types_1.UserRole.CLINICAL_OFFICER]), [
    (0, express_validator_1.body)("visitId").isUUID().withMessage("Valid visit ID is required"),
    (0, express_validator_1.body)("patientId").isUUID().withMessage("Valid patient ID is required"),
    (0, express_validator_1.body)("clinicalNotes").optional().isString().withMessage("Clinical notes must be a string"),
    (0, express_validator_1.body)("urgency").isIn(["ROUTINE", "URGENT", "STAT"]).withMessage("Invalid urgency level"),
    (0, express_validator_1.body)("items").isArray({ min: 1 }).withMessage("At least one test item is required"),
    (0, express_validator_1.body)("items.*.testId").isUUID().withMessage("Valid test ID is required"),
    (0, express_validator_1.body)("items.*.testName").trim().isLength({ min: 1 }).withMessage("Test name is required"),
    (0, express_validator_1.body)("items.*.testCode").trim().isLength({ min: 1 }).withMessage("Test code is required"),
    (0, express_validator_1.body)("items.*.specimenType").trim().isLength({ min: 1 }).withMessage("Specimen type is required"),
    (0, express_validator_1.body)("items.*.clinicalNotes").optional().isString().withMessage("Item clinical notes must be a string"),
], async (req, res) => {
    try {
        const errors = (0, express_validator_1.validationResult)(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                errors: errors.array().map(err => err.msg)
            });
        }
        const { visitId, patientId, clinicalNotes, urgency, items } = req.body;
        const request = await LabRequest_1.LabRequestModel.create({
            visitId,
            patientId,
            requestedBy: req.user.id,
            clinicalNotes,
            urgency,
            items
        });
        res.status(201).json({
            success: true,
            data: request,
            message: "Lab request created successfully"
        });
    }
    catch (error) {
        console.error("Error creating lab request:", error);
        res.status(500).json({
            success: false,
            message: "Failed to create lab request"
        });
    }
});
// Update lab request status
router.patch("/:id/status", (0, auth_1.authorize)([types_1.UserRole.ADMIN, types_1.UserRole.LAB_TECHNICIAN]), [
    (0, express_validator_1.body)("status").isIn(["REQUESTED", "SAMPLE_COLLECTED", "IN_PROGRESS", "COMPLETED", "CANCELLED"]).withMessage("Invalid status"),
    (0, express_validator_1.body)("specimenCollectedAt").optional().isISO8601().withMessage("Specimen collected at must be a valid date"),
    (0, express_validator_1.body)("collectedBy").optional().isUUID().withMessage("Valid collected by user ID is required"),
    (0, express_validator_1.body)("expectedCompletionAt").optional().isISO8601().withMessage("Expected completion at must be a valid date"),
], async (req, res) => {
    try {
        const errors = (0, express_validator_1.validationResult)(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                errors: errors.array().map(err => err.msg)
            });
        }
        const { id } = req.params;
        const updateData = req.body;
        // Convert date strings to Date objects
        if (updateData.specimenCollectedAt) {
            updateData.specimenCollectedAt = new Date(updateData.specimenCollectedAt);
        }
        if (updateData.expectedCompletionAt) {
            updateData.expectedCompletionAt = new Date(updateData.expectedCompletionAt);
        }
        const request = await LabRequest_1.LabRequestModel.updateStatus(id, updateData);
        if (!request) {
            return res.status(404).json({
                success: false,
                message: "Lab request not found"
            });
        }
        res.json({
            success: true,
            data: request,
            message: "Lab request status updated successfully"
        });
    }
    catch (error) {
        console.error("Error updating lab request status:", error);
        res.status(500).json({
            success: false,
            message: "Failed to update lab request status"
        });
    }
});
// Update lab request item status and results
router.patch("/items/:itemId", (0, auth_1.authorize)([types_1.UserRole.ADMIN, types_1.UserRole.LAB_TECHNICIAN]), [
    (0, express_validator_1.body)("status").isIn(["REQUESTED", "SAMPLE_COLLECTED", "IN_PROGRESS", "COMPLETED", "CANCELLED"]).withMessage("Invalid status"),
    (0, express_validator_1.body)("resultData").optional().isObject().withMessage("Result data must be an object"),
    (0, express_validator_1.body)("referenceRanges").optional().isObject().withMessage("Reference ranges must be an object"),
    (0, express_validator_1.body)("abnormalFlags").optional().isObject().withMessage("Abnormal flags must be an object"),
    (0, express_validator_1.body)("technicianNotes").optional().isString().withMessage("Technician notes must be a string"),
    (0, express_validator_1.body)("verifiedBy").optional().isUUID().withMessage("Valid verified by user ID is required"),
    (0, express_validator_1.body)("verifiedAt").optional().isISO8601().withMessage("Verified at must be a valid date"),
    (0, express_validator_1.body)("reportedAt").optional().isISO8601().withMessage("Reported at must be a valid date"),
], async (req, res) => {
    try {
        const errors = (0, express_validator_1.validationResult)(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                errors: errors.array().map(err => err.msg)
            });
        }
        const { itemId } = req.params;
        const updateData = req.body;
        // Convert date strings to Date objects
        if (updateData.verifiedAt) {
            updateData.verifiedAt = new Date(updateData.verifiedAt);
        }
        if (updateData.reportedAt) {
            updateData.reportedAt = new Date(updateData.reportedAt);
        }
        const item = await LabRequest_1.LabRequestModel.updateItemStatus(itemId, updateData);
        if (!item) {
            return res.status(404).json({
                success: false,
                message: "Lab request item not found"
            });
        }
        res.json({
            success: true,
            data: item,
            message: "Lab request item updated successfully"
        });
    }
    catch (error) {
        console.error("Error updating lab request item:", error);
        res.status(500).json({
            success: false,
            message: "Failed to update lab request item"
        });
    }
});
// Get lab request items
router.get("/:id/items", (0, auth_1.authorize)([types_1.UserRole.ADMIN, types_1.UserRole.CLINICAL_OFFICER, types_1.UserRole.LAB_TECHNICIAN]), async (req, res) => {
    try {
        const { id } = req.params;
        const items = await LabRequest_1.LabRequestModel.getRequestItems(id);
        res.json({
            success: true,
            data: items
        });
    }
    catch (error) {
        console.error("Error fetching lab request items:", error);
        res.status(500).json({
            success: false,
            message: "Failed to fetch lab request items"
        });
    }
});
exports.default = router;
