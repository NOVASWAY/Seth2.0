import express from "express"
import { body, query, validationResult } from "express-validator"
import { StockItemModel } from "../models/StockItem"
import { EventLoggerService } from "../services/EventLoggerService"
import { authorize, type AuthenticatedRequest } from "../middleware/auth"
import { UserRole } from "../types"

const router = express.Router()

// Get all stock items
router.get(
  "/",
  authorize([UserRole.ADMIN, UserRole.CLINICAL_OFFICER, UserRole.NURSE, UserRole.PHARMACIST]),
  [
    query("category_id").optional().isUUID().withMessage("Category ID must be a valid UUID"),
    query("low_stock_only").optional().isBoolean().withMessage("low_stock_only must be a boolean"),
    query("search").optional().trim().isLength({ min: 1 }).withMessage("Search query must not be empty"),
    query("limit").optional().isInt({ min: 1, max: 1000 }).withMessage("Limit must be between 1 and 1000"),
    query("offset").optional().isInt({ min: 0 }).withMessage("Offset must be non-negative"),
  ],
  async (req: AuthenticatedRequest, res) => {
    try {
      const errors = validationResult(req)
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: "Validation failed",
          errors: errors.array(),
        })
      }

      const { category_id, low_stock_only, search, limit = 100, offset = 0 } = req.query

      let items
      if (search) {
        items = await StockItemModel.search(search as string)
      } else if (low_stock_only === 'true') {
        items = await StockItemModel.findLowStock()
      } else if (category_id) {
        items = await StockItemModel.findByCategory(category_id as string)
      } else {
        items = await StockItemModel.findAll()
      }

      // Apply pagination
      const paginatedItems = items.slice(Number(offset), Number(offset) + Number(limit))

      res.json({
        success: true,
        data: paginatedItems,
        pagination: {
          total: items.length,
          limit: Number(limit),
          offset: Number(offset),
          hasMore: Number(offset) + Number(limit) < items.length
        }
      })
    } catch (error) {
      console.error("Error fetching stock items:", error)
      res.status(500).json({
        success: false,
        message: "Failed to fetch stock items",
      })
    }
  }
)

// Get stock item by ID
router.get(
  "/:id",
  authorize([UserRole.ADMIN, UserRole.CLINICAL_OFFICER, UserRole.NURSE, UserRole.PHARMACIST]),
  async (req: AuthenticatedRequest, res) => {
    try {
      const { id } = req.params
      const item = await StockItemModel.findById(id)

      if (!item) {
        return res.status(404).json({
          success: false,
          message: "Stock item not found",
        })
      }

      res.json({
        success: true,
        data: item,
      })
    } catch (error) {
      console.error("Error fetching stock item:", error)
      res.status(500).json({
        success: false,
        message: "Failed to fetch stock item",
      })
    }
  }
)

// Get stock item by SKU
router.get(
  "/sku/:sku",
  authorize([UserRole.ADMIN, UserRole.CLINICAL_OFFICER, UserRole.NURSE, UserRole.PHARMACIST]),
  async (req: AuthenticatedRequest, res) => {
    try {
      const { sku } = req.params
      const item = await StockItemModel.findBySku(sku)

      if (!item) {
        return res.status(404).json({
          success: false,
          message: "Stock item not found",
        })
      }

      res.json({
        success: true,
        data: item,
      })
    } catch (error) {
      console.error("Error fetching stock item by SKU:", error)
      res.status(500).json({
        success: false,
        message: "Failed to fetch stock item",
      })
    }
  }
)

// Get low stock items
router.get(
  "/alerts/low-stock",
  authorize([UserRole.ADMIN, UserRole.CLINICAL_OFFICER, UserRole.NURSE, UserRole.PHARMACIST]),
  async (req: AuthenticatedRequest, res) => {
    try {
      const lowStockItems = await StockItemModel.findLowStock()

      res.json({
        success: true,
        data: lowStockItems,
        count: lowStockItems.length
      })
    } catch (error) {
      console.error("Error fetching low stock items:", error)
      res.status(500).json({
        success: false,
        message: "Failed to fetch low stock items",
      })
    }
  }
)

// Get stock summary
router.get(
  "/stats/summary",
  authorize([UserRole.ADMIN, UserRole.CLINICAL_OFFICER, UserRole.NURSE, UserRole.PHARMACIST]),
  async (req: AuthenticatedRequest, res) => {
    try {
      const summary = await StockItemModel.getStockSummary()
      const categorySummary = await StockItemModel.getCategoryStockSummary()

      res.json({
        success: true,
        data: {
          overall: summary,
          byCategory: categorySummary
        }
      })
    } catch (error) {
      console.error("Error fetching stock summary:", error)
      res.status(500).json({
        success: false,
        message: "Failed to fetch stock summary",
      })
    }
  }
)

// Create new stock item
router.post(
  "/",
  authorize([UserRole.ADMIN, UserRole.CLINICAL_OFFICER]),
  [
    body("name").trim().isLength({ min: 1, max: 255 }).withMessage("Item name is required and must be less than 255 characters"),
    body("description").optional().trim().isLength({ max: 1000 }).withMessage("Description must be less than 1000 characters"),
    body("categoryId").isUUID().withMessage("Category ID is required and must be a valid UUID"),
    body("sku").optional().trim().isLength({ max: 100 }).withMessage("SKU must be less than 100 characters"),
    body("barcode").optional().trim().isLength({ max: 100 }).withMessage("Barcode must be less than 100 characters"),
    body("unitOfMeasure").trim().isLength({ min: 1, max: 50 }).withMessage("Unit of measure is required and must be less than 50 characters"),
    body("unitPrice").optional().isFloat({ min: 0 }).withMessage("Unit price must be a non-negative number"),
    body("costPrice").optional().isFloat({ min: 0 }).withMessage("Cost price must be a non-negative number"),
    body("sellingPrice").optional().isFloat({ min: 0 }).withMessage("Selling price must be a non-negative number"),
    body("minimumStockLevel").optional().isInt({ min: 0 }).withMessage("Minimum stock level must be a non-negative integer"),
    body("maximumStockLevel").optional().isInt({ min: 0 }).withMessage("Maximum stock level must be a non-negative integer"),
    body("currentStock").optional().isInt({ min: 0 }).withMessage("Current stock must be a non-negative integer"),
    body("reorderLevel").optional().isInt({ min: 0 }).withMessage("Reorder level must be a non-negative integer"),
    body("location").optional().trim().isLength({ max: 100 }).withMessage("Location must be less than 100 characters"),
    body("isControlledSubstance").optional().isBoolean().withMessage("isControlledSubstance must be a boolean"),
    body("requiresPrescription").optional().isBoolean().withMessage("requiresPrescription must be a boolean"),
  ],
  async (req: AuthenticatedRequest, res) => {
    try {
      const errors = validationResult(req)
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: "Validation failed",
          errors: errors.array(),
        })
      }

      const itemData = {
        ...req.body,
        createdBy: req.user.id
      }

      const item = await StockItemModel.create(itemData)

      // Log the creation event
      await EventLoggerService.logEvent({
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
      })

      res.status(201).json({
        success: true,
        message: "Stock item created successfully",
        data: item,
      })
    } catch (error: any) {
      console.error("Error creating stock item:", error)
      
      if (error.code === '23505') { // Unique constraint violation
        return res.status(400).json({
          success: false,
          message: "A stock item with this SKU or barcode already exists",
        })
      }

      res.status(500).json({
        success: false,
        message: "Failed to create stock item",
      })
    }
  }
)

// Update stock item
router.put(
  "/:id",
  authorize([UserRole.ADMIN, UserRole.CLINICAL_OFFICER]),
  [
    body("name").optional().trim().isLength({ min: 1, max: 255 }).withMessage("Item name must be less than 255 characters"),
    body("description").optional().trim().isLength({ max: 1000 }).withMessage("Description must be less than 1000 characters"),
    body("categoryId").optional().isUUID().withMessage("Category ID must be a valid UUID"),
    body("sku").optional().trim().isLength({ max: 100 }).withMessage("SKU must be less than 100 characters"),
    body("barcode").optional().trim().isLength({ max: 100 }).withMessage("Barcode must be less than 100 characters"),
    body("unitOfMeasure").optional().trim().isLength({ min: 1, max: 50 }).withMessage("Unit of measure must be less than 50 characters"),
    body("unitPrice").optional().isFloat({ min: 0 }).withMessage("Unit price must be a non-negative number"),
    body("costPrice").optional().isFloat({ min: 0 }).withMessage("Cost price must be a non-negative number"),
    body("sellingPrice").optional().isFloat({ min: 0 }).withMessage("Selling price must be a non-negative number"),
    body("minimumStockLevel").optional().isInt({ min: 0 }).withMessage("Minimum stock level must be a non-negative integer"),
    body("maximumStockLevel").optional().isInt({ min: 0 }).withMessage("Maximum stock level must be a non-negative integer"),
    body("currentStock").optional().isInt({ min: 0 }).withMessage("Current stock must be a non-negative integer"),
    body("reorderLevel").optional().isInt({ min: 0 }).withMessage("Reorder level must be a non-negative integer"),
    body("location").optional().trim().isLength({ max: 100 }).withMessage("Location must be less than 100 characters"),
    body("isActive").optional().isBoolean().withMessage("isActive must be a boolean"),
    body("isControlledSubstance").optional().isBoolean().withMessage("isControlledSubstance must be a boolean"),
    body("requiresPrescription").optional().isBoolean().withMessage("requiresPrescription must be a boolean"),
  ],
  async (req: AuthenticatedRequest, res) => {
    try {
      const errors = validationResult(req)
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: "Validation failed",
          errors: errors.array(),
        })
      }

      const { id } = req.params
      const updateData = {
        ...req.body,
        updatedBy: req.user.id
      }

      const item = await StockItemModel.update(id, updateData)

      if (!item) {
        return res.status(404).json({
          success: false,
          message: "Stock item not found",
        })
      }

      // Log the update event
      await EventLoggerService.logEvent({
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
      })

      res.json({
        success: true,
        message: "Stock item updated successfully",
        data: item,
      })
    } catch (error: any) {
      console.error("Error updating stock item:", error)
      
      if (error.code === '23505') { // Unique constraint violation
        return res.status(400).json({
          success: false,
          message: "A stock item with this SKU or barcode already exists",
        })
      }

      res.status(500).json({
        success: false,
        message: "Failed to update stock item",
      })
    }
  }
)

// Delete stock item (soft delete)
router.delete(
  "/:id",
  authorize([UserRole.ADMIN]),
  async (req: AuthenticatedRequest, res) => {
    try {
      const { id } = req.params

      // Get item details before deletion
      const item = await StockItemModel.findById(id)
      if (!item) {
        return res.status(404).json({
          success: false,
          message: "Stock item not found",
        })
      }

      const deleted = await StockItemModel.delete(id)

      if (!deleted) {
        return res.status(404).json({
          success: false,
          message: "Stock item not found",
        })
      }

      // Log the deletion event
      await EventLoggerService.logEvent({
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
      })

      res.json({
        success: true,
        message: "Stock item deleted successfully",
      })
    } catch (error) {
      console.error("Error deleting stock item:", error)
      res.status(500).json({
        success: false,
        message: "Failed to delete stock item",
      })
    }
  }
)

export default router
