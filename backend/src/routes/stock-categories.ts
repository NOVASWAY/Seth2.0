import express from "express"
import { body, query, validationResult } from "express-validator"
import { StockCategoryModel } from "../models/StockCategory"
import { EventLoggerService } from "../services/EventLoggerService"
import { authorize, type AuthenticatedRequest } from "../middleware/auth"
import { UserRole } from "../types"

const router = express.Router()

// Get all stock categories
router.get(
  "/",
  authorize([UserRole.ADMIN, UserRole.CLINICAL_OFFICER, UserRole.NURSE, UserRole.PHARMACIST]),
  [
    query("include_inactive").optional().isBoolean(),
    query("parent_only").optional().isBoolean(),
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

      const { include_inactive, parent_only } = req.query

      let categories
      if (parent_only === 'true') {
        categories = await StockCategoryModel.findMainCategories()
      } else {
        categories = await StockCategoryModel.findAll()
      }

      res.json({
        success: true,
        data: categories,
      })
    } catch (error) {
      console.error("Error fetching stock categories:", error)
      res.status(500).json({
        success: false,
        message: "Failed to fetch stock categories",
      })
    }
  }
)

// Get stock category by ID
router.get(
  "/:id",
  authorize([UserRole.ADMIN, UserRole.CLINICAL_OFFICER, UserRole.NURSE, UserRole.PHARMACIST]),
  async (req: AuthenticatedRequest, res) => {
    try {
      const { id } = req.params
      const category = await StockCategoryModel.findById(id)

      if (!category) {
        return res.status(404).json({
          success: false,
          message: "Stock category not found",
        })
      }

      res.json({
        success: true,
        data: category,
      })
    } catch (error) {
      console.error("Error fetching stock category:", error)
      res.status(500).json({
        success: false,
        message: "Failed to fetch stock category",
      })
    }
  }
)

// Get subcategories for a parent category
router.get(
  "/:id/subcategories",
  authorize([UserRole.ADMIN, UserRole.CLINICAL_OFFICER, UserRole.NURSE, UserRole.PHARMACIST]),
  async (req: AuthenticatedRequest, res) => {
    try {
      const { id } = req.params
      const subcategories = await StockCategoryModel.findByParentId(id)

      res.json({
        success: true,
        data: subcategories,
      })
    } catch (error) {
      console.error("Error fetching subcategories:", error)
      res.status(500).json({
        success: false,
        message: "Failed to fetch subcategories",
      })
    }
  }
)

// Get category hierarchy
router.get(
  "/hierarchy/tree",
  authorize([UserRole.ADMIN, UserRole.CLINICAL_OFFICER, UserRole.NURSE, UserRole.PHARMACIST]),
  async (req: AuthenticatedRequest, res) => {
    try {
      const hierarchy = await StockCategoryModel.getCategoryHierarchy()

      res.json({
        success: true,
        data: hierarchy,
      })
    } catch (error) {
      console.error("Error fetching category hierarchy:", error)
      res.status(500).json({
        success: false,
        message: "Failed to fetch category hierarchy",
      })
    }
  }
)

// Get category statistics
router.get(
  "/stats/summary",
  authorize([UserRole.ADMIN, UserRole.CLINICAL_OFFICER, UserRole.NURSE, UserRole.PHARMACIST]),
  async (req: AuthenticatedRequest, res) => {
    try {
      const stats = await StockCategoryModel.getCategoryStats()

      res.json({
        success: true,
        data: stats,
      })
    } catch (error) {
      console.error("Error fetching category statistics:", error)
      res.status(500).json({
        success: false,
        message: "Failed to fetch category statistics",
      })
    }
  }
)

// Create new stock category
router.post(
  "/",
  authorize([UserRole.ADMIN, UserRole.CLINICAL_OFFICER]),
  [
    body("name").trim().isLength({ min: 1, max: 100 }).withMessage("Category name is required and must be less than 100 characters"),
    body("description").optional().trim().isLength({ max: 500 }).withMessage("Description must be less than 500 characters"),
    body("parentCategoryId").optional().isUUID().withMessage("Parent category ID must be a valid UUID"),
    body("isActive").optional().isBoolean().withMessage("isActive must be a boolean"),
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

      const categoryData = req.body
      const category = await StockCategoryModel.create(categoryData)

      // Log the creation event
      await EventLoggerService.logEvent({
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
      })

      res.status(201).json({
        success: true,
        message: "Stock category created successfully",
        data: category,
      })
    } catch (error: any) {
      console.error("Error creating stock category:", error)
      
      if (error.code === '23505') { // Unique constraint violation
        return res.status(400).json({
          success: false,
          message: "A category with this name already exists",
        })
      }

      res.status(500).json({
        success: false,
        message: "Failed to create stock category",
      })
    }
  }
)

// Update stock category
router.put(
  "/:id",
  authorize([UserRole.ADMIN, UserRole.CLINICAL_OFFICER]),
  [
    body("name").optional().trim().isLength({ min: 1, max: 100 }).withMessage("Category name must be less than 100 characters"),
    body("description").optional().trim().isLength({ max: 500 }).withMessage("Description must be less than 500 characters"),
    body("parentCategoryId").optional().isUUID().withMessage("Parent category ID must be a valid UUID"),
    body("isActive").optional().isBoolean().withMessage("isActive must be a boolean"),
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
      const updateData = req.body

      const category = await StockCategoryModel.update(id, updateData)

      if (!category) {
        return res.status(404).json({
          success: false,
          message: "Stock category not found",
        })
      }

      // Log the update event
      await EventLoggerService.logEvent({
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
      })

      res.json({
        success: true,
        message: "Stock category updated successfully",
        data: category,
      })
    } catch (error: any) {
      console.error("Error updating stock category:", error)
      
      if (error.code === '23505') { // Unique constraint violation
        return res.status(400).json({
          success: false,
          message: "A category with this name already exists",
        })
      }

      res.status(500).json({
        success: false,
        message: "Failed to update stock category",
      })
    }
  }
)

// Delete stock category (soft delete)
router.delete(
  "/:id",
  authorize([UserRole.ADMIN]),
  async (req: AuthenticatedRequest, res) => {
    try {
      const { id } = req.params

      // Check if category has items
      const category = await StockCategoryModel.findById(id)
      if (!category) {
        return res.status(404).json({
          success: false,
          message: "Stock category not found",
        })
      }

      const deleted = await StockCategoryModel.delete(id)

      if (!deleted) {
        return res.status(404).json({
          success: false,
          message: "Stock category not found",
        })
      }

      // Log the deletion event
      await EventLoggerService.logEvent({
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
      })

      res.json({
        success: true,
        message: "Stock category deleted successfully",
      })
    } catch (error) {
      console.error("Error deleting stock category:", error)
      res.status(500).json({
        success: false,
        message: "Failed to delete stock category",
      })
    }
  }
)

export default router
