"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const express_validator_1 = require("express-validator");
const StockCategory_1 = require("../models/StockCategory");
const EventLoggerService_1 = require("../services/EventLoggerService");
const auth_1 = require("../middleware/auth");
const types_1 = require("../types");
const router = express_1.default.Router();
// Get all stock categories
router.get("/", (0, auth_1.authorize)([types_1.UserRole.ADMIN, types_1.UserRole.CLINICAL_OFFICER, types_1.UserRole.NURSE, types_1.UserRole.PHARMACIST]), [
    (0, express_validator_1.query)("include_inactive").optional().isBoolean(),
    (0, express_validator_1.query)("parent_only").optional().isBoolean(),
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
        const { include_inactive, parent_only } = req.query;
        let categories;
        if (parent_only === 'true') {
            categories = await StockCategory_1.StockCategoryModel.findMainCategories();
        }
        else {
            categories = await StockCategory_1.StockCategoryModel.findAll();
        }
        res.json({
            success: true,
            data: categories,
        });
    }
    catch (error) {
        console.error("Error fetching stock categories:", error);
        res.status(500).json({
            success: false,
            message: "Failed to fetch stock categories",
        });
    }
});
// Get stock category by ID
router.get("/:id", (0, auth_1.authorize)([types_1.UserRole.ADMIN, types_1.UserRole.CLINICAL_OFFICER, types_1.UserRole.NURSE, types_1.UserRole.PHARMACIST]), async (req, res) => {
    try {
        const { id } = req.params;
        const category = await StockCategory_1.StockCategoryModel.findById(id);
        if (!category) {
            return res.status(404).json({
                success: false,
                message: "Stock category not found",
            });
        }
        res.json({
            success: true,
            data: category,
        });
    }
    catch (error) {
        console.error("Error fetching stock category:", error);
        res.status(500).json({
            success: false,
            message: "Failed to fetch stock category",
        });
    }
});
// Get subcategories for a parent category
router.get("/:id/subcategories", (0, auth_1.authorize)([types_1.UserRole.ADMIN, types_1.UserRole.CLINICAL_OFFICER, types_1.UserRole.NURSE, types_1.UserRole.PHARMACIST]), async (req, res) => {
    try {
        const { id } = req.params;
        const subcategories = await StockCategory_1.StockCategoryModel.findByParentId(id);
        res.json({
            success: true,
            data: subcategories,
        });
    }
    catch (error) {
        console.error("Error fetching subcategories:", error);
        res.status(500).json({
            success: false,
            message: "Failed to fetch subcategories",
        });
    }
});
// Get category hierarchy
router.get("/hierarchy/tree", (0, auth_1.authorize)([types_1.UserRole.ADMIN, types_1.UserRole.CLINICAL_OFFICER, types_1.UserRole.NURSE, types_1.UserRole.PHARMACIST]), async (req, res) => {
    try {
        const hierarchy = await StockCategory_1.StockCategoryModel.getCategoryHierarchy();
        res.json({
            success: true,
            data: hierarchy,
        });
    }
    catch (error) {
        console.error("Error fetching category hierarchy:", error);
        res.status(500).json({
            success: false,
            message: "Failed to fetch category hierarchy",
        });
    }
});
// Get category statistics
router.get("/stats/summary", (0, auth_1.authorize)([types_1.UserRole.ADMIN, types_1.UserRole.CLINICAL_OFFICER, types_1.UserRole.NURSE, types_1.UserRole.PHARMACIST]), async (req, res) => {
    try {
        const stats = await StockCategory_1.StockCategoryModel.getCategoryStats();
        res.json({
            success: true,
            data: stats,
        });
    }
    catch (error) {
        console.error("Error fetching category statistics:", error);
        res.status(500).json({
            success: false,
            message: "Failed to fetch category statistics",
        });
    }
});
// Create new stock category
router.post("/", (0, auth_1.authorize)([types_1.UserRole.ADMIN, types_1.UserRole.CLINICAL_OFFICER]), [
    (0, express_validator_1.body)("name").trim().isLength({ min: 1, max: 100 }).withMessage("Category name is required and must be less than 100 characters"),
    (0, express_validator_1.body)("description").optional().trim().isLength({ max: 500 }).withMessage("Description must be less than 500 characters"),
    (0, express_validator_1.body)("parentCategoryId").optional().isUUID().withMessage("Parent category ID must be a valid UUID"),
    (0, express_validator_1.body)("isActive").optional().isBoolean().withMessage("isActive must be a boolean"),
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
        const categoryData = req.body;
        const category = await StockCategory_1.StockCategoryModel.create(categoryData);
        // Log the creation event
        await EventLoggerService_1.EventLoggerService.logEvent({
            event_type: "STOCK",
            user_id: req.user.id,
            username: req.user.username,
            target_type: "stock_category",
            target_id: category.id,
            action: "create_category",
            details: categoryData,
            ip_address: req.ip,
            user_agent: req.get("User-Agent"),
            severity: "MEDIUM",
        });
        res.status(201).json({
            success: true,
            message: "Stock category created successfully",
            data: category,
        });
    }
    catch (error) {
        console.error("Error creating stock category:", error);
        if (error.code === '23505') { // Unique constraint violation
            return res.status(400).json({
                success: false,
                message: "A category with this name already exists",
            });
        }
        res.status(500).json({
            success: false,
            message: "Failed to create stock category",
        });
    }
});
// Update stock category
router.put("/:id", (0, auth_1.authorize)([types_1.UserRole.ADMIN, types_1.UserRole.CLINICAL_OFFICER]), [
    (0, express_validator_1.body)("name").optional().trim().isLength({ min: 1, max: 100 }).withMessage("Category name must be less than 100 characters"),
    (0, express_validator_1.body)("description").optional().trim().isLength({ max: 500 }).withMessage("Description must be less than 500 characters"),
    (0, express_validator_1.body)("parentCategoryId").optional().isUUID().withMessage("Parent category ID must be a valid UUID"),
    (0, express_validator_1.body)("isActive").optional().isBoolean().withMessage("isActive must be a boolean"),
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
        const updateData = req.body;
        const category = await StockCategory_1.StockCategoryModel.update(id, updateData);
        if (!category) {
            return res.status(404).json({
                success: false,
                message: "Stock category not found",
            });
        }
        // Log the update event
        await EventLoggerService_1.EventLoggerService.logEvent({
            event_type: "STOCK",
            user_id: req.user.id,
            username: req.user.username,
            target_type: "stock_category",
            target_id: id,
            action: "update_category",
            details: updateData,
            ip_address: req.ip,
            user_agent: req.get("User-Agent"),
            severity: "MEDIUM",
        });
        res.json({
            success: true,
            message: "Stock category updated successfully",
            data: category,
        });
    }
    catch (error) {
        console.error("Error updating stock category:", error);
        if (error.code === '23505') { // Unique constraint violation
            return res.status(400).json({
                success: false,
                message: "A category with this name already exists",
            });
        }
        res.status(500).json({
            success: false,
            message: "Failed to update stock category",
        });
    }
});
// Delete stock category (soft delete)
router.delete("/:id", (0, auth_1.authorize)([types_1.UserRole.ADMIN]), async (req, res) => {
    try {
        const { id } = req.params;
        // Check if category has items
        const category = await StockCategory_1.StockCategoryModel.findById(id);
        if (!category) {
            return res.status(404).json({
                success: false,
                message: "Stock category not found",
            });
        }
        const deleted = await StockCategory_1.StockCategoryModel.delete(id);
        if (!deleted) {
            return res.status(404).json({
                success: false,
                message: "Stock category not found",
            });
        }
        // Log the deletion event
        await EventLoggerService_1.EventLoggerService.logEvent({
            event_type: "STOCK",
            user_id: req.user.id,
            username: req.user.username,
            target_type: "stock_category",
            target_id: id,
            action: "delete_category",
            details: { categoryName: category.name },
            ip_address: req.ip,
            user_agent: req.get("User-Agent"),
            severity: "HIGH",
        });
        res.json({
            success: true,
            message: "Stock category deleted successfully",
        });
    }
    catch (error) {
        console.error("Error deleting stock category:", error);
        res.status(500).json({
            success: false,
            message: "Failed to delete stock category",
        });
    }
});
exports.default = router;
