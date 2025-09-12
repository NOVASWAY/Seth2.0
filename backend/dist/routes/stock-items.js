"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const express_validator_1 = require("express-validator");
const StockItem_1 = require("../models/StockItem");
const EventLoggerService_1 = require("../services/EventLoggerService");
const auth_1 = require("../middleware/auth");
const types_1 = require("../types");
const router = express_1.default.Router();
// Get all stock items
router.get("/", (0, auth_1.authorize)([types_1.UserRole.ADMIN, types_1.UserRole.CLINICAL_OFFICER, types_1.UserRole.NURSE, types_1.UserRole.PHARMACIST]), [
    (0, express_validator_1.query)("category_id").optional().isUUID().withMessage("Category ID must be a valid UUID"),
    (0, express_validator_1.query)("low_stock_only").optional().isBoolean().withMessage("low_stock_only must be a boolean"),
    (0, express_validator_1.query)("search").optional().trim().isLength({ min: 1 }).withMessage("Search query must not be empty"),
    (0, express_validator_1.query)("limit").optional().isInt({ min: 1, max: 1000 }).withMessage("Limit must be between 1 and 1000"),
    (0, express_validator_1.query)("offset").optional().isInt({ min: 0 }).withMessage("Offset must be non-negative"),
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
        const { category_id, low_stock_only, search, limit = 100, offset = 0 } = req.query;
        let items;
        if (search) {
            items = await StockItem_1.StockItemModel.search(search);
        }
        else if (low_stock_only === 'true') {
            items = await StockItem_1.StockItemModel.findLowStock();
        }
        else if (category_id) {
            items = await StockItem_1.StockItemModel.findByCategory(category_id);
        }
        else {
            items = await StockItem_1.StockItemModel.findAll();
        }
        // Apply pagination
        const paginatedItems = items.slice(Number(offset), Number(offset) + Number(limit));
        res.json({
            success: true,
            data: paginatedItems,
            pagination: {
                total: items.length,
                limit: Number(limit),
                offset: Number(offset),
                hasMore: Number(offset) + Number(limit) < items.length
            }
        });
    }
    catch (error) {
        console.error("Error fetching stock items:", error);
        res.status(500).json({
            success: false,
            message: "Failed to fetch stock items",
        });
    }
});
// Get stock item by ID
router.get("/:id", (0, auth_1.authorize)([types_1.UserRole.ADMIN, types_1.UserRole.CLINICAL_OFFICER, types_1.UserRole.NURSE, types_1.UserRole.PHARMACIST]), async (req, res) => {
    try {
        const { id } = req.params;
        const item = await StockItem_1.StockItemModel.findById(id);
        if (!item) {
            return res.status(404).json({
                success: false,
                message: "Stock item not found",
            });
        }
        res.json({
            success: true,
            data: item,
        });
    }
    catch (error) {
        console.error("Error fetching stock item:", error);
        res.status(500).json({
            success: false,
            message: "Failed to fetch stock item",
        });
    }
});
// Get stock item by SKU
router.get("/sku/:sku", (0, auth_1.authorize)([types_1.UserRole.ADMIN, types_1.UserRole.CLINICAL_OFFICER, types_1.UserRole.NURSE, types_1.UserRole.PHARMACIST]), async (req, res) => {
    try {
        const { sku } = req.params;
        const item = await StockItem_1.StockItemModel.findBySku(sku);
        if (!item) {
            return res.status(404).json({
                success: false,
                message: "Stock item not found",
            });
        }
        res.json({
            success: true,
            data: item,
        });
    }
    catch (error) {
        console.error("Error fetching stock item by SKU:", error);
        res.status(500).json({
            success: false,
            message: "Failed to fetch stock item",
        });
    }
});
// Get low stock items
router.get("/alerts/low-stock", (0, auth_1.authorize)([types_1.UserRole.ADMIN, types_1.UserRole.CLINICAL_OFFICER, types_1.UserRole.NURSE, types_1.UserRole.PHARMACIST]), async (req, res) => {
    try {
        const lowStockItems = await StockItem_1.StockItemModel.findLowStock();
        res.json({
            success: true,
            data: lowStockItems,
            count: lowStockItems.length
        });
    }
    catch (error) {
        console.error("Error fetching low stock items:", error);
        res.status(500).json({
            success: false,
            message: "Failed to fetch low stock items",
        });
    }
});
// Get stock summary
router.get("/stats/summary", (0, auth_1.authorize)([types_1.UserRole.ADMIN, types_1.UserRole.CLINICAL_OFFICER, types_1.UserRole.NURSE, types_1.UserRole.PHARMACIST]), async (req, res) => {
    try {
        const summary = await StockItem_1.StockItemModel.getStockSummary();
        const categorySummary = await StockItem_1.StockItemModel.getCategoryStockSummary();
        res.json({
            success: true,
            data: {
                overall: summary,
                byCategory: categorySummary
            }
        });
    }
    catch (error) {
        console.error("Error fetching stock summary:", error);
        res.status(500).json({
            success: false,
            message: "Failed to fetch stock summary",
        });
    }
});
// Create new stock item
router.post("/", (0, auth_1.authorize)([types_1.UserRole.ADMIN, types_1.UserRole.CLINICAL_OFFICER]), [
    (0, express_validator_1.body)("name").trim().isLength({ min: 1, max: 255 }).withMessage("Item name is required and must be less than 255 characters"),
    (0, express_validator_1.body)("description").optional().trim().isLength({ max: 1000 }).withMessage("Description must be less than 1000 characters"),
    (0, express_validator_1.body)("categoryId").isUUID().withMessage("Category ID is required and must be a valid UUID"),
    (0, express_validator_1.body)("sku").optional().trim().isLength({ max: 100 }).withMessage("SKU must be less than 100 characters"),
    (0, express_validator_1.body)("barcode").optional().trim().isLength({ max: 100 }).withMessage("Barcode must be less than 100 characters"),
    (0, express_validator_1.body)("unitOfMeasure").trim().isLength({ min: 1, max: 50 }).withMessage("Unit of measure is required and must be less than 50 characters"),
    (0, express_validator_1.body)("unitPrice").optional().isFloat({ min: 0 }).withMessage("Unit price must be a non-negative number"),
    (0, express_validator_1.body)("costPrice").optional().isFloat({ min: 0 }).withMessage("Cost price must be a non-negative number"),
    (0, express_validator_1.body)("sellingPrice").optional().isFloat({ min: 0 }).withMessage("Selling price must be a non-negative number"),
    (0, express_validator_1.body)("minimumStockLevel").optional().isInt({ min: 0 }).withMessage("Minimum stock level must be a non-negative integer"),
    (0, express_validator_1.body)("maximumStockLevel").optional().isInt({ min: 0 }).withMessage("Maximum stock level must be a non-negative integer"),
    (0, express_validator_1.body)("currentStock").optional().isInt({ min: 0 }).withMessage("Current stock must be a non-negative integer"),
    (0, express_validator_1.body)("reorderLevel").optional().isInt({ min: 0 }).withMessage("Reorder level must be a non-negative integer"),
    (0, express_validator_1.body)("location").optional().trim().isLength({ max: 100 }).withMessage("Location must be less than 100 characters"),
    (0, express_validator_1.body)("isControlledSubstance").optional().isBoolean().withMessage("isControlledSubstance must be a boolean"),
    (0, express_validator_1.body)("requiresPrescription").optional().isBoolean().withMessage("requiresPrescription must be a boolean"),
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
        const itemData = {
            ...req.body,
            createdBy: req.user.id
        };
        const item = await StockItem_1.StockItemModel.create(itemData);
        // Log the creation event
        await EventLoggerService_1.EventLoggerService.logEvent({
            event_type: "STOCK",
            user_id: req.user.id,
            username: req.user.username,
            target_type: "stock_item",
            target_id: item.id,
            action: "create_item",
            details: itemData,
            ip_address: req.ip,
            user_agent: req.get("User-Agent"),
            severity: "MEDIUM",
        });
        res.status(201).json({
            success: true,
            message: "Stock item created successfully",
            data: item,
        });
    }
    catch (error) {
        console.error("Error creating stock item:", error);
        if (error.code === '23505') { // Unique constraint violation
            return res.status(400).json({
                success: false,
                message: "A stock item with this SKU or barcode already exists",
            });
        }
        res.status(500).json({
            success: false,
            message: "Failed to create stock item",
        });
    }
});
// Update stock item
router.put("/:id", (0, auth_1.authorize)([types_1.UserRole.ADMIN, types_1.UserRole.CLINICAL_OFFICER]), [
    (0, express_validator_1.body)("name").optional().trim().isLength({ min: 1, max: 255 }).withMessage("Item name must be less than 255 characters"),
    (0, express_validator_1.body)("description").optional().trim().isLength({ max: 1000 }).withMessage("Description must be less than 1000 characters"),
    (0, express_validator_1.body)("categoryId").optional().isUUID().withMessage("Category ID must be a valid UUID"),
    (0, express_validator_1.body)("sku").optional().trim().isLength({ max: 100 }).withMessage("SKU must be less than 100 characters"),
    (0, express_validator_1.body)("barcode").optional().trim().isLength({ max: 100 }).withMessage("Barcode must be less than 100 characters"),
    (0, express_validator_1.body)("unitOfMeasure").optional().trim().isLength({ min: 1, max: 50 }).withMessage("Unit of measure must be less than 50 characters"),
    (0, express_validator_1.body)("unitPrice").optional().isFloat({ min: 0 }).withMessage("Unit price must be a non-negative number"),
    (0, express_validator_1.body)("costPrice").optional().isFloat({ min: 0 }).withMessage("Cost price must be a non-negative number"),
    (0, express_validator_1.body)("sellingPrice").optional().isFloat({ min: 0 }).withMessage("Selling price must be a non-negative number"),
    (0, express_validator_1.body)("minimumStockLevel").optional().isInt({ min: 0 }).withMessage("Minimum stock level must be a non-negative integer"),
    (0, express_validator_1.body)("maximumStockLevel").optional().isInt({ min: 0 }).withMessage("Maximum stock level must be a non-negative integer"),
    (0, express_validator_1.body)("currentStock").optional().isInt({ min: 0 }).withMessage("Current stock must be a non-negative integer"),
    (0, express_validator_1.body)("reorderLevel").optional().isInt({ min: 0 }).withMessage("Reorder level must be a non-negative integer"),
    (0, express_validator_1.body)("location").optional().trim().isLength({ max: 100 }).withMessage("Location must be less than 100 characters"),
    (0, express_validator_1.body)("isActive").optional().isBoolean().withMessage("isActive must be a boolean"),
    (0, express_validator_1.body)("isControlledSubstance").optional().isBoolean().withMessage("isControlledSubstance must be a boolean"),
    (0, express_validator_1.body)("requiresPrescription").optional().isBoolean().withMessage("requiresPrescription must be a boolean"),
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
        const updateData = {
            ...req.body,
            updatedBy: req.user.id
        };
        const item = await StockItem_1.StockItemModel.update(id, updateData);
        if (!item) {
            return res.status(404).json({
                success: false,
                message: "Stock item not found",
            });
        }
        // Log the update event
        await EventLoggerService_1.EventLoggerService.logEvent({
            event_type: "STOCK",
            user_id: req.user.id,
            username: req.user.username,
            target_type: "stock_item",
            target_id: id,
            action: "update_item",
            details: updateData,
            ip_address: req.ip,
            user_agent: req.get("User-Agent"),
            severity: "MEDIUM",
        });
        res.json({
            success: true,
            message: "Stock item updated successfully",
            data: item,
        });
    }
    catch (error) {
        console.error("Error updating stock item:", error);
        if (error.code === '23505') { // Unique constraint violation
            return res.status(400).json({
                success: false,
                message: "A stock item with this SKU or barcode already exists",
            });
        }
        res.status(500).json({
            success: false,
            message: "Failed to update stock item",
        });
    }
});
// Delete stock item (soft delete)
router.delete("/:id", (0, auth_1.authorize)([types_1.UserRole.ADMIN]), async (req, res) => {
    try {
        const { id } = req.params;
        // Get item details before deletion
        const item = await StockItem_1.StockItemModel.findById(id);
        if (!item) {
            return res.status(404).json({
                success: false,
                message: "Stock item not found",
            });
        }
        const deleted = await StockItem_1.StockItemModel.delete(id);
        if (!deleted) {
            return res.status(404).json({
                success: false,
                message: "Stock item not found",
            });
        }
        // Log the deletion event
        await EventLoggerService_1.EventLoggerService.logEvent({
            event_type: "STOCK",
            user_id: req.user.id,
            username: req.user.username,
            target_type: "stock_item",
            target_id: id,
            action: "delete_item",
            details: { itemName: item.name, sku: item.sku },
            ip_address: req.ip,
            user_agent: req.get("User-Agent"),
            severity: "HIGH",
        });
        res.json({
            success: true,
            message: "Stock item deleted successfully",
        });
    }
    catch (error) {
        console.error("Error deleting stock item:", error);
        res.status(500).json({
            success: false,
            message: "Failed to delete stock item",
        });
    }
});
exports.default = router;
