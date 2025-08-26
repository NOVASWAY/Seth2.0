"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const express_validator_1 = require("express-validator");
const Prescription_1 = require("../models/Prescription");
const auth_1 = require("../middleware/auth");
const types_1 = require("../types");
const router = express_1.default.Router();
router.get("/patient/:patientId", (0, auth_1.authorize)([types_1.UserRole.ADMIN, types_1.UserRole.CLINICAL_OFFICER, types_1.UserRole.PHARMACIST]), async (req, res) => {
    try {
        const { patientId } = req.params;
        const prescriptions = await Prescription_1.PrescriptionModel.findByPatientId(patientId);
        res.json({
            success: true,
            data: prescriptions,
        });
    }
    catch (error) {
        res.status(500).json({
            success: false,
            message: "Failed to fetch prescriptions",
        });
    }
});
router.get("/:id", (0, auth_1.authorize)([types_1.UserRole.ADMIN, types_1.UserRole.CLINICAL_OFFICER, types_1.UserRole.PHARMACIST]), async (req, res) => {
    try {
        const { id } = req.params;
        const prescription = await Prescription_1.PrescriptionModel.findById(id);
        if (!prescription) {
            return res.status(404).json({
                success: false,
                message: "Prescription not found",
            });
        }
        res.json({
            success: true,
            data: prescription,
        });
    }
    catch (error) {
        res.status(500).json({
            success: false,
            message: "Failed to fetch prescription",
        });
    }
});
router.post("/", (0, auth_1.authorize)([types_1.UserRole.ADMIN, types_1.UserRole.CLINICAL_OFFICER]), [
    (0, express_validator_1.body)("consultationId").isUUID().withMessage("Invalid consultation ID"),
    (0, express_validator_1.body)("visitId").isUUID().withMessage("Invalid visit ID"),
    (0, express_validator_1.body)("patientId").isUUID().withMessage("Invalid patient ID"),
    (0, express_validator_1.body)("items").isArray({ min: 1 }).withMessage("At least one prescription item is required"),
    (0, express_validator_1.body)("items.*.inventoryItemId").isUUID().withMessage("Invalid inventory item ID"),
    (0, express_validator_1.body)("items.*.itemName").trim().isLength({ min: 1 }).withMessage("Item name is required"),
    (0, express_validator_1.body)("items.*.dosage").trim().isLength({ min: 1 }).withMessage("Dosage is required"),
    (0, express_validator_1.body)("items.*.frequency").trim().isLength({ min: 1 }).withMessage("Frequency is required"),
    (0, express_validator_1.body)("items.*.duration").trim().isLength({ min: 1 }).withMessage("Duration is required"),
    (0, express_validator_1.body)("items.*.quantityPrescribed").isInt({ min: 1 }).withMessage("Quantity must be positive"),
    (0, express_validator_1.body)("items.*.instructions").optional().isString(),
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
        const prescriptionData = {
            ...req.body,
            prescribedBy: req.user.id,
        };
        const prescription = await Prescription_1.PrescriptionModel.create(prescriptionData);
        res.status(201).json({
            success: true,
            message: "Prescription created successfully",
            data: prescription,
        });
    }
    catch (error) {
        res.status(500).json({
            success: false,
            message: error.message || "Failed to create prescription",
        });
    }
});
router.patch("/:id/status", (0, auth_1.authorize)([types_1.UserRole.ADMIN, types_1.UserRole.PHARMACIST]), [
    (0, express_validator_1.body)("status").isIn(["PENDING", "PARTIALLY_DISPENSED", "FULLY_DISPENSED", "CANCELLED"]).withMessage("Invalid status"),
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
        const { status } = req.body;
        const prescription = await Prescription_1.PrescriptionModel.updateStatus(id, status);
        if (!prescription) {
            return res.status(404).json({
                success: false,
                message: "Prescription not found",
            });
        }
        res.json({
            success: true,
            message: "Prescription status updated successfully",
            data: prescription,
        });
    }
    catch (error) {
        res.status(500).json({
            success: false,
            message: error.message || "Failed to update prescription status",
        });
    }
});
router.patch("/items/:id/dispense", (0, auth_1.authorize)([types_1.UserRole.ADMIN, types_1.UserRole.PHARMACIST]), [
    (0, express_validator_1.body)("quantityDispensed").isInt({ min: 0 }).withMessage("Quantity dispensed must be non-negative"),
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
        const { quantityDispensed } = req.body;
        const item = await Prescription_1.PrescriptionModel.updateDispensedQuantity(id, quantityDispensed);
        if (!item) {
            return res.status(404).json({
                success: false,
                message: "Prescription item not found",
            });
        }
        res.json({
            success: true,
            message: "Dispensed quantity updated successfully",
            data: item,
        });
    }
    catch (error) {
        res.status(500).json({
            success: false,
            message: error.message || "Failed to update dispensed quantity",
        });
    }
});
exports.default = router;
//# sourceMappingURL=prescriptions.js.map