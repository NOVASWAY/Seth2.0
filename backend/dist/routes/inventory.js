"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const express_validator_1 = require("express-validator");
const Inventory_1 = require("../models/Inventory");
const auth_1 = require("../middleware/auth");
const types_1 = require("../types");
const router = express_1.default.Router();
// Get all inventory items
router.get("/items", (0, auth_1.authorize)([types_1.UserRole.ADMIN, types_1.UserRole.INVENTORY_MANAGER, types_1.UserRole.PHARMACIST]), [
    (0, express_validator_1.query)("page").optional().isInt({ min: 1 }).withMessage("Page must be a positive integer"),
    (0, express_validator_1.query)("limit").optional().isInt({ min: 1, max: 100 }).withMessage("Limit must be between 1 and 100"),
    (0, express_validator_1.query)("search").optional().isString().withMessage("Search must be a string"),
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
        const page = Number.parseInt(req.query.page) || 1;
        const limit = Number.parseInt(req.query.limit) || 20;
        const search = req.query.search;
        const offset = (page - 1) * limit;
        let result;
        if (search) {
            const items = await Inventory_1.InventoryModel.searchItems(search, limit);
            result = { items, total: items.length };
        }
        else {
            result = await Inventory_1.InventoryModel.findAllItems(limit, offset);
        }
        res.json({
            success: true,
            data: {
                items: result.items,
                pagination: {
                    page,
                    limit,
                    total: result.total,
                    totalPages: Math.ceil(result.total / limit),
                },
            },
        });
    }
    catch (error) {
        res.status(500).json({
            success: false,
            message: "Failed to fetch inventory items",
        });
    }
});
// Create new inventory item (Inventory Manager only)
router.post("/items", (0, auth_1.authorize)([types_1.UserRole.ADMIN, types_1.UserRole.INVENTORY_MANAGER]), [
    (0, express_validator_1.body)("name").trim().isLength({ min: 1 }).withMessage("Name is required"),
    (0, express_validator_1.body)("category").trim().isLength({ min: 1 }).withMessage("Category is required"),
    (0, express_validator_1.body)("unit").trim().isLength({ min: 1 }).withMessage("Unit is required"),
    (0, express_validator_1.body)("reorderLevel").optional().isInt({ min: 0 }).withMessage("Reorder level must be non-negative"),
    (0, express_validator_1.body)("maxLevel").optional().isInt({ min: 1 }).withMessage("Max level must be positive"),
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
        const item = await Inventory_1.InventoryModel.createItem(req.body);
        res.status(201).json({
            success: true,
            message: "Inventory item created successfully",
            data: item,
        });
    }
    catch (error) {
        if (error.code === "23505") {
            return res.status(409).json({
                success: false,
                message: "Item with this name already exists",
            });
        }
        res.status(500).json({
            success: false,
            message: "Failed to create inventory item",
        });
    }
});
// Get item details with batches
router.get("/items/:id", (0, auth_1.authorize)([types_1.UserRole.ADMIN, types_1.UserRole.INVENTORY_MANAGER, types_1.UserRole.PHARMACIST]), async (req, res) => {
    try {
        const { id } = req.params;
        const item = await Inventory_1.InventoryModel.findItemById(id);
        if (!item) {
            return res.status(404).json({
                success: false,
                message: "Item not found",
            });
        }
        const batches = await Inventory_1.InventoryModel.findBatchesByItemId(id);
        const movements = await Inventory_1.InventoryModel.findMovementsByItemId(id, 20);
        res.json({
            success: true,
            data: {
                item,
                batches,
                movements,
            },
        });
    }
    catch (error) {
        res.status(500).json({
            success: false,
            message: "Failed to fetch item details",
        });
    }
});
// Create new batch (Inventory Manager only)
router.post("/batches", (0, auth_1.authorize)([types_1.UserRole.ADMIN, types_1.UserRole.INVENTORY_MANAGER]), [
    (0, express_validator_1.body)("inventoryItemId").isUUID().withMessage("Invalid inventory item ID"),
    (0, express_validator_1.body)("batchNumber").trim().isLength({ min: 1 }).withMessage("Batch number is required"),
    (0, express_validator_1.body)("quantity").isInt({ min: 1 }).withMessage("Quantity must be positive"),
    (0, express_validator_1.body)("unitCost").isFloat({ min: 0 }).withMessage("Unit cost must be non-negative"),
    (0, express_validator_1.body)("sellingPrice").isFloat({ min: 0 }).withMessage("Selling price must be non-negative"),
    (0, express_validator_1.body)("expiryDate").isISO8601().withMessage("Invalid expiry date"),
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
        const batchData = {
            ...req.body,
            expiryDate: new Date(req.body.expiryDate),
            receivedBy: req.user.id,
        };
        const batch = await Inventory_1.InventoryModel.createBatch(batchData);
        // Create receive movement
        await Inventory_1.InventoryModel.createMovement({
            inventoryItemId: batch.inventoryItemId,
            batchId: batch.id,
            movementType: "RECEIVE",
            quantity: batch.quantity,
            unitCost: batch.unitCost,
            performedBy: req.user.id,
            notes: `Received batch ${batch.batchNumber}`,
        });
        res.status(201).json({
            success: true,
            message: "Batch created successfully",
            data: batch,
        });
    }
    catch (error) {
        if (error.code === "23505") {
            return res.status(409).json({
                success: false,
                message: "Batch number already exists for this item",
            });
        }
        res.status(500).json({
            success: false,
            message: "Failed to create batch",
        });
    }
});
// Dispense from batch (Pharmacist only)
router.post("/dispense", (0, auth_1.authorize)([types_1.UserRole.ADMIN, types_1.UserRole.PHARMACIST]), [
    (0, express_validator_1.body)("batchId").isUUID().withMessage("Invalid batch ID"),
    (0, express_validator_1.body)("quantity").isInt({ min: 1 }).withMessage("Quantity must be positive"),
    (0, express_validator_1.body)("reference").optional().isString().withMessage("Reference must be a string"),
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
        const { batchId, quantity, reference } = req.body;
        const result = await Inventory_1.InventoryModel.dispenseFromBatch(batchId, quantity, req.user.id, reference);
        if (!result.success) {
            return res.status(400).json({
                success: false,
                message: result.message,
            });
        }
        res.json({
            success: true,
            message: result.message,
            data: result.batch,
        });
    }
    catch (error) {
        res.status(500).json({
            success: false,
            message: "Failed to dispense from batch",
        });
    }
});
// Get stock levels and alerts
router.get("/stock-levels", (0, auth_1.authorize)([types_1.UserRole.ADMIN, types_1.UserRole.INVENTORY_MANAGER, types_1.UserRole.PHARMACIST]), async (req, res) => {
    try {
        const stockLevels = await Inventory_1.InventoryModel.getStockLevels();
        res.json({
            success: true,
            data: stockLevels,
        });
    }
    catch (error) {
        res.status(500).json({
            success: false,
            message: "Failed to fetch stock levels",
        });
    }
});
// Get expiring batches
router.get("/expiring", (0, auth_1.authorize)([types_1.UserRole.ADMIN, types_1.UserRole.INVENTORY_MANAGER]), [(0, express_validator_1.query)("days").optional().isInt({ min: 1, max: 365 }).withMessage("Days must be between 1 and 365")], async (req, res) => {
    try {
        const errors = (0, express_validator_1.validationResult)(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                message: "Validation failed",
                errors: errors.array(),
            });
        }
        const days = Number.parseInt(req.query.days) || 30;
        const expiringBatches = await Inventory_1.InventoryModel.getExpiringBatches(days);
        res.json({
            success: true,
            data: expiringBatches,
        });
    }
    catch (error) {
        res.status(500).json({
            success: false,
            message: "Failed to fetch expiring batches",
        });
    }
});
// Get available stock for prescriptions
router.get("/available-stock", (0, auth_1.authorize)([types_1.UserRole.ADMIN, types_1.UserRole.CLINICAL_OFFICER, types_1.UserRole.PHARMACIST]), [
    (0, express_validator_1.query)("search").optional().isString().withMessage("Search must be a string"),
    (0, express_validator_1.query)("category").optional().isString().withMessage("Category must be a string"),
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
        const search = req.query.search;
        const category = req.query.category;
        const availableStock = await Inventory_1.InventoryModel.getAvailableStock(search, category);
        res.json({
            success: true,
            data: availableStock,
        });
    }
    catch (error) {
        res.status(500).json({
            success: false,
            message: "Failed to fetch available stock",
        });
    }
});
exports.default = router;
