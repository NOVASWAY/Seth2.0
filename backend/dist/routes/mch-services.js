"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const express_validator_1 = require("express-validator");
const MCHServices_1 = require("../models/MCHServices");
const auth_1 = require("../middleware/auth");
const auditLogger_1 = require("../middleware/auditLogger");
const router = express_1.default.Router();
router.get("/services", auth_1.authenticate, async (req, res) => {
    try {
        const services = await MCHServices_1.MCHServicesModel.getServices();
        res.json({
            success: true,
            data: services
        });
    }
    catch (error) {
        console.error("Error fetching MCH services:", error);
        res.status(500).json({
            success: false,
            message: "Failed to fetch MCH services"
        });
    }
});
router.get("/services/category/:category", auth_1.authenticate, (0, express_validator_1.param)("category").isIn(["ANTENATAL", "POSTNATAL", "CHILD_HEALTH", "NUTRITION", "FAMILY_PLANNING"]).withMessage("Invalid category"), async (req, res) => {
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
        const services = await MCHServices_1.MCHServicesModel.getServicesByCategory(category);
        res.json({
            success: true,
            data: services
        });
    }
    catch (error) {
        console.error("Error fetching MCH services by category:", error);
        res.status(500).json({
            success: false,
            message: "Failed to fetch MCH services by category"
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
        const history = await MCHServices_1.MCHServicesModel.getPatientMCHServices(patientId);
        res.json({
            success: true,
            data: history
        });
    }
    catch (error) {
        console.error("Error fetching patient MCH services history:", error);
        res.status(500).json({
            success: false,
            message: "Failed to fetch patient MCH services history"
        });
    }
});
router.get("/patients/:patientId/category/:category", auth_1.authenticate, (0, express_validator_1.param)("patientId").isUUID().withMessage("Invalid patient ID"), (0, express_validator_1.param)("category").isIn(["ANTENATAL", "POSTNATAL", "CHILD_HEALTH", "NUTRITION", "FAMILY_PLANNING"]).withMessage("Invalid category"), async (req, res) => {
    try {
        const errors = (0, express_validator_1.validationResult)(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                message: "Validation failed",
                errors: errors.array()
            });
        }
        const { patientId, category } = req.params;
        const services = await MCHServices_1.MCHServicesModel.getPatientMCHServicesByCategory(patientId, category);
        res.json({
            success: true,
            data: services
        });
    }
    catch (error) {
        console.error("Error fetching patient MCH services by category:", error);
        res.status(500).json({
            success: false,
            message: "Failed to fetch patient MCH services by category"
        });
    }
});
router.post("/patients/:patientId/services", auth_1.authenticate, (0, auth_1.authorize)(["NURSE", "CLINICAL_OFFICER", "ADMIN"]), auditLogger_1.auditLogger, (0, express_validator_1.param)("patientId").isUUID().withMessage("Invalid patient ID"), (0, express_validator_1.body)("serviceId").isUUID().withMessage("Invalid service ID"), (0, express_validator_1.body)("serviceDate").optional().isISO8601().withMessage("Invalid service date"), (0, express_validator_1.body)("serviceDetails").optional().isObject().withMessage("Invalid service details"), (0, express_validator_1.body)("findings").optional().isString().withMessage("Invalid findings"), (0, express_validator_1.body)("recommendations").optional().isString().withMessage("Invalid recommendations"), (0, express_validator_1.body)("nextAppointmentDate").optional().isISO8601().withMessage("Invalid next appointment date"), (0, express_validator_1.body)("status").optional().isIn(["SCHEDULED", "COMPLETED", "CANCELLED", "NO_SHOW"]).withMessage("Invalid status"), (0, express_validator_1.body)("notes").optional().isString().withMessage("Invalid notes"), async (req, res) => {
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
        const serviceData = {
            ...req.body,
            patientId,
            providerId: req.user.id
        };
        const record = await MCHServices_1.MCHServicesModel.createPatientMCHService(serviceData);
        res.status(201).json({
            success: true,
            message: "MCH service record created successfully",
            data: record
        });
    }
    catch (error) {
        console.error("Error creating MCH service record:", error);
        res.status(500).json({
            success: false,
            message: "Failed to create MCH service record"
        });
    }
});
router.put("/services/:serviceRecordId", auth_1.authenticate, (0, auth_1.authorize)(["NURSE", "CLINICAL_OFFICER", "ADMIN"]), auditLogger_1.auditLogger, (0, express_validator_1.param)("serviceRecordId").isUUID().withMessage("Invalid service record ID"), (0, express_validator_1.body)("serviceDate").optional().isISO8601().withMessage("Invalid service date"), (0, express_validator_1.body)("serviceDetails").optional().isObject().withMessage("Invalid service details"), (0, express_validator_1.body)("findings").optional().isString().withMessage("Invalid findings"), (0, express_validator_1.body)("recommendations").optional().isString().withMessage("Invalid recommendations"), (0, express_validator_1.body)("nextAppointmentDate").optional().isISO8601().withMessage("Invalid next appointment date"), (0, express_validator_1.body)("status").optional().isIn(["SCHEDULED", "COMPLETED", "CANCELLED", "NO_SHOW"]).withMessage("Invalid status"), (0, express_validator_1.body)("notes").optional().isString().withMessage("Invalid notes"), async (req, res) => {
    try {
        const errors = (0, express_validator_1.validationResult)(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                message: "Validation failed",
                errors: errors.array()
            });
        }
        const { serviceRecordId } = req.params;
        const record = await MCHServices_1.MCHServicesModel.updatePatientMCHService(serviceRecordId, req.body);
        if (!record) {
            return res.status(404).json({
                success: false,
                message: "MCH service record not found"
            });
        }
        res.json({
            success: true,
            message: "MCH service record updated successfully",
            data: record
        });
    }
    catch (error) {
        console.error("Error updating MCH service record:", error);
        res.status(500).json({
            success: false,
            message: "Failed to update MCH service record"
        });
    }
});
router.get("/statistics", auth_1.authenticate, (0, auth_1.authorize)(["ADMIN", "CLINICAL_OFFICER"]), async (req, res) => {
    try {
        const stats = await MCHServices_1.MCHServicesModel.getMCHServiceStats();
        res.json({
            success: true,
            data: stats
        });
    }
    catch (error) {
        console.error("Error fetching MCH service statistics:", error);
        res.status(500).json({
            success: false,
            message: "Failed to fetch MCH service statistics"
        });
    }
});
router.get("/appointments/upcoming", auth_1.authenticate, (0, express_validator_1.query)("days").optional().isInt({ min: 1, max: 30 }).withMessage("Invalid days parameter"), async (req, res) => {
    try {
        const errors = (0, express_validator_1.validationResult)(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                message: "Validation failed",
                errors: errors.array()
            });
        }
        const days = parseInt(req.query.days) || 7;
        const appointments = await MCHServices_1.MCHServicesModel.getUpcomingMCHAppointments(days);
        res.json({
            success: true,
            data: appointments
        });
    }
    catch (error) {
        console.error("Error fetching upcoming MCH appointments:", error);
        res.status(500).json({
            success: false,
            message: "Failed to fetch upcoming MCH appointments"
        });
    }
});
router.delete("/services/:serviceRecordId", auth_1.authenticate, (0, auth_1.authorize)(["NURSE", "CLINICAL_OFFICER", "ADMIN"]), auditLogger_1.auditLogger, (0, express_validator_1.param)("serviceRecordId").isUUID().withMessage("Invalid service record ID"), async (req, res) => {
    try {
        const errors = (0, express_validator_1.validationResult)(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                message: "Validation failed",
                errors: errors.array()
            });
        }
        const { serviceRecordId } = req.params;
        const deleted = await MCHServices_1.MCHServicesModel.deletePatientMCHService(serviceRecordId);
        if (!deleted) {
            return res.status(404).json({
                success: false,
                message: "MCH service record not found"
            });
        }
        res.json({
            success: true,
            message: "MCH service record deleted successfully"
        });
    }
    catch (error) {
        console.error("Error deleting MCH service record:", error);
        res.status(500).json({
            success: false,
            message: "Failed to delete MCH service record"
        });
    }
});
exports.default = router;
//# sourceMappingURL=mch-services.js.map