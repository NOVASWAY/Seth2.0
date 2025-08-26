"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const express_validator_1 = require("express-validator");
const Visit_1 = require("../models/Visit");
const Patient_1 = require("../models/Patient");
const auth_1 = require("../middleware/auth");
const types_1 = require("../types");
const router = express_1.default.Router();
router.get("/queue", (0, auth_1.authorize)([types_1.UserRole.ADMIN, types_1.UserRole.RECEPTIONIST, types_1.UserRole.NURSE, types_1.UserRole.CLINICAL_OFFICER]), async (req, res) => {
    try {
        const queueItems = await Visit_1.VisitModel.getQueueItems();
        const stats = await Visit_1.VisitModel.getVisitStats();
        res.json({
            success: true,
            data: {
                queue: queueItems,
                stats,
            },
        });
    }
    catch (error) {
        res.status(500).json({
            success: false,
            message: "Failed to fetch queue",
        });
    }
});
router.post("/", (0, auth_1.authorize)([types_1.UserRole.ADMIN, types_1.UserRole.RECEPTIONIST]), [
    (0, express_validator_1.body)("patientId").isUUID().withMessage("Invalid patient ID"),
    (0, express_validator_1.body)("chiefComplaint").optional().trim().isLength({ min: 1 }).withMessage("Chief complaint cannot be empty"),
    (0, express_validator_1.body)("triageCategory").optional().isIn(["EMERGENCY", "URGENT", "NORMAL"]).withMessage("Invalid triage category"),
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
        const { patientId, chiefComplaint, triageCategory } = req.body;
        const patient = await Patient_1.PatientModel.findById(patientId);
        if (!patient) {
            return res.status(404).json({
                success: false,
                message: "Patient not found",
            });
        }
        const todaysVisits = await Visit_1.VisitModel.findByPatientId(patientId, 1);
        const hasVisitToday = todaysVisits.some((visit) => {
            const visitDate = new Date(visit.visitDate);
            const today = new Date();
            return visitDate.toDateString() === today.toDateString();
        });
        if (hasVisitToday) {
            return res.status(409).json({
                success: false,
                message: "Patient already has a visit registered for today",
            });
        }
        const visit = await Visit_1.VisitModel.create({
            patientId,
            opNumber: patient.opNumber,
            chiefComplaint,
            triageCategory,
        });
        res.status(201).json({
            success: true,
            message: "Visit registered successfully",
            data: visit,
        });
    }
    catch (error) {
        res.status(500).json({
            success: false,
            message: "Failed to register visit",
        });
    }
});
router.patch("/:id/status", (0, auth_1.authorize)([types_1.UserRole.ADMIN, types_1.UserRole.NURSE, types_1.UserRole.CLINICAL_OFFICER, types_1.UserRole.PHARMACIST]), [(0, express_validator_1.body)("status").isIn(Object.values(types_1.VisitStatus)).withMessage("Invalid visit status")], async (req, res) => {
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
        const { status } = req.body;
        const visit = await Visit_1.VisitModel.updateStatus(id, status);
        if (!visit) {
            return res.status(404).json({
                success: false,
                message: "Visit not found",
            });
        }
        res.json({
            success: true,
            message: "Visit status updated successfully",
            data: visit,
        });
    }
    catch (error) {
        res.status(500).json({
            success: false,
            message: "Failed to update visit status",
        });
    }
});
router.get("/:id", (0, auth_1.authorize)([types_1.UserRole.ADMIN, types_1.UserRole.NURSE, types_1.UserRole.CLINICAL_OFFICER, types_1.UserRole.PHARMACIST]), async (req, res) => {
    try {
        const { id } = req.params;
        const visit = await Visit_1.VisitModel.findById(id);
        if (!visit) {
            return res.status(404).json({
                success: false,
                message: "Visit not found",
            });
        }
        const patient = await Patient_1.PatientModel.findById(visit.patientId);
        res.json({
            success: true,
            data: {
                visit,
                patient,
            },
        });
    }
    catch (error) {
        res.status(500).json({
            success: false,
            message: "Failed to fetch visit details",
        });
    }
});
exports.default = router;
//# sourceMappingURL=visits.js.map