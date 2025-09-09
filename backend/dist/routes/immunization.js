"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const express_validator_1 = require("express-validator");
const Immunization_1 = require("../models/Immunization");
const auth_1 = require("../middleware/auth");
const auditLogger_1 = require("../middleware/auditLogger");
const router = express_1.default.Router();
router.get("/schedules", auth_1.authenticate, async (req, res) => {
    try {
        const schedules = await Immunization_1.ImmunizationModel.getSchedules();
        res.json({
            success: true,
            data: schedules
        });
    }
    catch (error) {
        console.error("Error fetching immunization schedules:", error);
        res.status(500).json({
            success: false,
            message: "Failed to fetch immunization schedules"
        });
    }
});
router.get("/vaccines", auth_1.authenticate, async (req, res) => {
    try {
        const vaccines = await Immunization_1.ImmunizationModel.getVaccines();
        res.json({
            success: true,
            data: vaccines
        });
    }
    catch (error) {
        console.error("Error fetching vaccines:", error);
        res.status(500).json({
            success: false,
            message: "Failed to fetch vaccines"
        });
    }
});
router.get("/schedules/:scheduleId/vaccines", auth_1.authenticate, (0, express_validator_1.param)("scheduleId").isUUID().withMessage("Invalid schedule ID"), async (req, res) => {
    try {
        const errors = (0, express_validator_1.validationResult)(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                message: "Validation failed",
                errors: errors.array()
            });
        }
        const { scheduleId } = req.params;
        const vaccines = await Immunization_1.ImmunizationModel.getVaccinesBySchedule(scheduleId);
        res.json({
            success: true,
            data: vaccines
        });
    }
    catch (error) {
        console.error("Error fetching vaccines by schedule:", error);
        res.status(500).json({
            success: false,
            message: "Failed to fetch vaccines by schedule"
        });
    }
});
router.get("/patients/:patientId/schedule", auth_1.authenticate, (0, express_validator_1.param)("patientId").isUUID().withMessage("Invalid patient ID"), async (req, res) => {
    try {
        const errors = (0, express_validator_1.validationResult)(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                message: "Validation failed",
                errors: errors.array()
            });
        }
        const { patientId } = req.params;
        const schedule = await Immunization_1.ImmunizationModel.getPatientImmunizationSchedule(patientId);
        res.json({
            success: true,
            data: schedule
        });
    }
    catch (error) {
        console.error("Error fetching patient immunization schedule:", error);
        res.status(500).json({
            success: false,
            message: "Failed to fetch patient immunization schedule"
        });
    }
});
router.get("/patients/:patientId/immunizations", auth_1.authenticate, (0, express_validator_1.param)("patientId").isUUID().withMessage("Invalid patient ID"), async (req, res) => {
    try {
        const errors = (0, express_validator_1.validationResult)(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                message: "Validation failed",
                errors: errors.array()
            });
        }
        const { patientId } = req.params;
        const immunizations = await Immunization_1.ImmunizationModel.getPatientImmunizations(patientId);
        res.json({
            success: true,
            data: immunizations
        });
    }
    catch (error) {
        console.error("Error fetching patient immunizations:", error);
        res.status(500).json({
            success: false,
            message: "Failed to fetch patient immunizations"
        });
    }
});
router.post("/patients/:patientId/immunizations", auth_1.authenticate, (0, auth_1.authorize)(["NURSE", "CLINICAL_OFFICER", "ADMIN"]), auditLogger_1.auditLogger, (0, express_validator_1.param)("patientId").isUUID().withMessage("Invalid patient ID"), (0, express_validator_1.body)("vaccineId").isUUID().withMessage("Invalid vaccine ID"), (0, express_validator_1.body)("immunizationDate").optional().isISO8601().withMessage("Invalid immunization date"), (0, express_validator_1.body)("batchNumber").optional().isString().withMessage("Invalid batch number"), (0, express_validator_1.body)("expiryDate").optional().isISO8601().withMessage("Invalid expiry date"), (0, express_validator_1.body)("site").optional().isString().withMessage("Invalid site"), (0, express_validator_1.body)("route").optional().isString().withMessage("Invalid route"), (0, express_validator_1.body)("dosage").optional().isString().withMessage("Invalid dosage"), (0, express_validator_1.body)("adverseReactions").optional().isString().withMessage("Invalid adverse reactions"), (0, express_validator_1.body)("nextDueDate").optional().isISO8601().withMessage("Invalid next due date"), (0, express_validator_1.body)("status").optional().isIn(["SCHEDULED", "COMPLETED", "MISSED", "CONTRAINDICATED"]).withMessage("Invalid status"), (0, express_validator_1.body)("notes").optional().isString().withMessage("Invalid notes"), async (req, res) => {
    try {
        const errors = (0, express_validator_1.validationResult)(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                message: "Validation failed",
                errors: errors.array()
            });
        }
        const { patientId } = req.params;
        const immunizationData = {
            ...req.body,
            patientId,
            administeredBy: req.user.id
        };
        const immunization = await Immunization_1.ImmunizationModel.createPatientImmunization(immunizationData);
        res.status(201).json({
            success: true,
            message: "Immunization recorded successfully",
            data: immunization
        });
    }
    catch (error) {
        console.error("Error creating patient immunization:", error);
        res.status(500).json({
            success: false,
            message: "Failed to record immunization"
        });
    }
});
router.put("/immunizations/:immunizationId", auth_1.authenticate, (0, auth_1.authorize)(["NURSE", "CLINICAL_OFFICER", "ADMIN"]), auditLogger_1.auditLogger, (0, express_validator_1.param)("immunizationId").isUUID().withMessage("Invalid immunization ID"), (0, express_validator_1.body)("immunizationDate").optional().isISO8601().withMessage("Invalid immunization date"), (0, express_validator_1.body)("batchNumber").optional().isString().withMessage("Invalid batch number"), (0, express_validator_1.body)("expiryDate").optional().isISO8601().withMessage("Invalid expiry date"), (0, express_validator_1.body)("site").optional().isString().withMessage("Invalid site"), (0, express_validator_1.body)("route").optional().isString().withMessage("Invalid route"), (0, express_validator_1.body)("dosage").optional().isString().withMessage("Invalid dosage"), (0, express_validator_1.body)("adverseReactions").optional().isString().withMessage("Invalid adverse reactions"), (0, express_validator_1.body)("nextDueDate").optional().isISO8601().withMessage("Invalid next due date"), (0, express_validator_1.body)("status").optional().isIn(["SCHEDULED", "COMPLETED", "MISSED", "CONTRAINDICATED"]).withMessage("Invalid status"), (0, express_validator_1.body)("notes").optional().isString().withMessage("Invalid notes"), async (req, res) => {
    try {
        const errors = (0, express_validator_1.validationResult)(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                message: "Validation failed",
                errors: errors.array()
            });
        }
        const { immunizationId } = req.params;
        const immunization = await Immunization_1.ImmunizationModel.updatePatientImmunization(immunizationId, req.body);
        if (!immunization) {
            return res.status(404).json({
                success: false,
                message: "Immunization not found"
            });
        }
        res.json({
            success: true,
            message: "Immunization updated successfully",
            data: immunization
        });
    }
    catch (error) {
        console.error("Error updating patient immunization:", error);
        res.status(500).json({
            success: false,
            message: "Failed to update immunization"
        });
    }
});
router.delete("/immunizations/:immunizationId", auth_1.authenticate, (0, auth_1.authorize)(["NURSE", "CLINICAL_OFFICER", "ADMIN"]), auditLogger_1.auditLogger, (0, express_validator_1.param)("immunizationId").isUUID().withMessage("Invalid immunization ID"), async (req, res) => {
    try {
        const errors = (0, express_validator_1.validationResult)(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                message: "Validation failed",
                errors: errors.array()
            });
        }
        const { immunizationId } = req.params;
        const deleted = await Immunization_1.ImmunizationModel.deletePatientImmunization(immunizationId);
        if (!deleted) {
            return res.status(404).json({
                success: false,
                message: "Immunization not found"
            });
        }
        res.json({
            success: true,
            message: "Immunization deleted successfully"
        });
    }
    catch (error) {
        console.error("Error deleting patient immunization:", error);
        res.status(500).json({
            success: false,
            message: "Failed to delete immunization"
        });
    }
});
exports.default = router;
//# sourceMappingURL=immunization.js.map