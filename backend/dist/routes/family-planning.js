"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const express_validator_1 = require("express-validator");
const FamilyPlanning_1 = require("../models/FamilyPlanning");
const auth_1 = require("../middleware/auth");
const auditLogger_1 = require("../middleware/auditLogger");
const router = express_1.default.Router();
router.get("/methods", auth_1.authenticate, async (req, res) => {
    try {
        const methods = await FamilyPlanning_1.FamilyPlanningModel.getMethods();
        res.json({
            success: true,
            data: methods
        });
    }
    catch (error) {
        console.error("Error fetching family planning methods:", error);
        res.status(500).json({
            success: false,
            message: "Failed to fetch family planning methods"
        });
    }
});
router.get("/methods/category/:category", auth_1.authenticate, (0, express_validator_1.param)("category").isIn(["HORMONAL", "BARRIER", "IUD", "STERILIZATION", "NATURAL"]).withMessage("Invalid category"), async (req, res) => {
    try {
        const errors = (0, express_validator_1.validationResult)(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                message: "Validation failed",
                errors: errors.array()
            });
        }
        const { category } = req.params;
        const methods = await FamilyPlanning_1.FamilyPlanningModel.getMethodsByCategory(category);
        res.json({
            success: true,
            data: methods
        });
    }
    catch (error) {
        console.error("Error fetching family planning methods by category:", error);
        res.status(500).json({
            success: false,
            message: "Failed to fetch family planning methods by category"
        });
    }
});
router.get("/patients/:patientId/history", auth_1.authenticate, (0, express_validator_1.param)("patientId").isUUID().withMessage("Invalid patient ID"), async (req, res) => {
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
        const history = await FamilyPlanning_1.FamilyPlanningModel.getPatientFamilyPlanning(patientId);
        res.json({
            success: true,
            data: history
        });
    }
    catch (error) {
        console.error("Error fetching patient family planning history:", error);
        res.status(500).json({
            success: false,
            message: "Failed to fetch patient family planning history"
        });
    }
});
router.get("/patients/:patientId/active", auth_1.authenticate, (0, express_validator_1.param)("patientId").isUUID().withMessage("Invalid patient ID"), async (req, res) => {
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
        const active = await FamilyPlanning_1.FamilyPlanningModel.getActivePatientFamilyPlanning(patientId);
        res.json({
            success: true,
            data: active
        });
    }
    catch (error) {
        console.error("Error fetching active family planning:", error);
        res.status(500).json({
            success: false,
            message: "Failed to fetch active family planning"
        });
    }
});
router.post("/patients/:patientId/records", auth_1.authenticate, (0, auth_1.authorize)(["NURSE", "CLINICAL_OFFICER", "ADMIN"]), auditLogger_1.auditLogger, (0, express_validator_1.param)("patientId").isUUID().withMessage("Invalid patient ID"), (0, express_validator_1.body)("methodId").isUUID().withMessage("Invalid method ID"), (0, express_validator_1.body)("startDate").optional().isISO8601().withMessage("Invalid start date"), (0, express_validator_1.body)("endDate").optional().isISO8601().withMessage("Invalid end date"), (0, express_validator_1.body)("counselingProvided").optional().isBoolean().withMessage("Invalid counseling provided"), (0, express_validator_1.body)("counselingNotes").optional().isString().withMessage("Invalid counseling notes"), (0, express_validator_1.body)("sideEffectsExperienced").optional().isString().withMessage("Invalid side effects"), (0, express_validator_1.body)("satisfactionRating").optional().isInt({ min: 1, max: 5 }).withMessage("Invalid satisfaction rating"), (0, express_validator_1.body)("followUpDate").optional().isISO8601().withMessage("Invalid follow-up date"), (0, express_validator_1.body)("status").optional().isIn(["ACTIVE", "DISCONTINUED", "COMPLETED", "SWITCHED"]).withMessage("Invalid status"), (0, express_validator_1.body)("discontinuationReason").optional().isString().withMessage("Invalid discontinuation reason"), (0, express_validator_1.body)("notes").optional().isString().withMessage("Invalid notes"), async (req, res) => {
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
        const familyPlanningData = {
            ...req.body,
            patientId,
            providerId: req.user.id
        };
        const record = await FamilyPlanning_1.FamilyPlanningModel.createPatientFamilyPlanning(familyPlanningData);
        res.status(201).json({
            success: true,
            message: "Family planning record created successfully",
            data: record
        });
    }
    catch (error) {
        console.error("Error creating family planning record:", error);
        res.status(500).json({
            success: false,
            message: "Failed to create family planning record"
        });
    }
});
router.put("/records/:recordId", auth_1.authenticate, (0, auth_1.authorize)(["NURSE", "CLINICAL_OFFICER", "ADMIN"]), auditLogger_1.auditLogger, (0, express_validator_1.param)("recordId").isUUID().withMessage("Invalid record ID"), (0, express_validator_1.body)("startDate").optional().isISO8601().withMessage("Invalid start date"), (0, express_validator_1.body)("endDate").optional().isISO8601().withMessage("Invalid end date"), (0, express_validator_1.body)("counselingProvided").optional().isBoolean().withMessage("Invalid counseling provided"), (0, express_validator_1.body)("counselingNotes").optional().isString().withMessage("Invalid counseling notes"), (0, express_validator_1.body)("sideEffectsExperienced").optional().isString().withMessage("Invalid side effects"), (0, express_validator_1.body)("satisfactionRating").optional().isInt({ min: 1, max: 5 }).withMessage("Invalid satisfaction rating"), (0, express_validator_1.body)("followUpDate").optional().isISO8601().withMessage("Invalid follow-up date"), (0, express_validator_1.body)("status").optional().isIn(["ACTIVE", "DISCONTINUED", "COMPLETED", "SWITCHED"]).withMessage("Invalid status"), (0, express_validator_1.body)("discontinuationReason").optional().isString().withMessage("Invalid discontinuation reason"), (0, express_validator_1.body)("notes").optional().isString().withMessage("Invalid notes"), async (req, res) => {
    try {
        const errors = (0, express_validator_1.validationResult)(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                message: "Validation failed",
                errors: errors.array()
            });
        }
        const { recordId } = req.params;
        const record = await FamilyPlanning_1.FamilyPlanningModel.updatePatientFamilyPlanning(recordId, req.body);
        if (!record) {
            return res.status(404).json({
                success: false,
                message: "Family planning record not found"
            });
        }
        res.json({
            success: true,
            message: "Family planning record updated successfully",
            data: record
        });
    }
    catch (error) {
        console.error("Error updating family planning record:", error);
        res.status(500).json({
            success: false,
            message: "Failed to update family planning record"
        });
    }
});
router.post("/patients/:patientId/discontinue", auth_1.authenticate, (0, auth_1.authorize)(["NURSE", "CLINICAL_OFFICER", "ADMIN"]), auditLogger_1.auditLogger, (0, express_validator_1.param)("patientId").isUUID().withMessage("Invalid patient ID"), (0, express_validator_1.body)("reason").isString().withMessage("Discontinuation reason is required"), async (req, res) => {
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
        const { reason } = req.body;
        const discontinued = await FamilyPlanning_1.FamilyPlanningModel.discontinuePatientFamilyPlanning(patientId, reason, req.user.id);
        if (!discontinued) {
            return res.status(404).json({
                success: false,
                message: "No active family planning method found for this patient"
            });
        }
        res.json({
            success: true,
            message: "Family planning method discontinued successfully"
        });
    }
    catch (error) {
        console.error("Error discontinuing family planning method:", error);
        res.status(500).json({
            success: false,
            message: "Failed to discontinue family planning method"
        });
    }
});
router.get("/statistics", auth_1.authenticate, (0, auth_1.authorize)(["ADMIN", "CLINICAL_OFFICER"]), async (req, res) => {
    try {
        const stats = await FamilyPlanning_1.FamilyPlanningModel.getFamilyPlanningStats();
        res.json({
            success: true,
            data: stats
        });
    }
    catch (error) {
        console.error("Error fetching family planning statistics:", error);
        res.status(500).json({
            success: false,
            message: "Failed to fetch family planning statistics"
        });
    }
});
router.delete("/records/:recordId", auth_1.authenticate, (0, auth_1.authorize)(["NURSE", "CLINICAL_OFFICER", "ADMIN"]), auditLogger_1.auditLogger, (0, express_validator_1.param)("recordId").isUUID().withMessage("Invalid record ID"), async (req, res) => {
    try {
        const errors = (0, express_validator_1.validationResult)(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                message: "Validation failed",
                errors: errors.array()
            });
        }
        const { recordId } = req.params;
        const deleted = await FamilyPlanning_1.FamilyPlanningModel.deletePatientFamilyPlanning(recordId);
        if (!deleted) {
            return res.status(404).json({
                success: false,
                message: "Family planning record not found"
            });
        }
        res.json({
            success: true,
            message: "Family planning record deleted successfully"
        });
    }
    catch (error) {
        console.error("Error deleting family planning record:", error);
        res.status(500).json({
            success: false,
            message: "Failed to delete family planning record"
        });
    }
});
exports.default = router;
//# sourceMappingURL=family-planning.js.map