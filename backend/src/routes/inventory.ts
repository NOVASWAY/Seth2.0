import express from "express"
import { body, query, validationResult } from "express-validator"
import { InventoryModel } from "../models/Inventory"
import { authorize, type AuthenticatedRequest } from "../middleware/auth"
import { UserRole } from "../../../types"

const router = express.Router()

// Get all inventory items
router.get(
  "/items",
  authorize([UserRole.ADMIN, UserRole.INVENTORY_MANAGER, UserRole.PHARMACIST]),
  [
    query("page").optional().isInt({ min: 1 }).withMessage("Page must be a positive integer"),
    query("limit").optional().isInt({ min: 1, max: 100 }).withMessage("Limit must be between 1 and 100"),
    query("search").optional().isString().withMessage("Search must be a string"),
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

      const page = Number.parseInt(req.query.page as string) || 1
      const limit = Number.parseInt(req.query.limit as string) || 20
      const search = req.query.search as string
      const offset = (page - 1) * limit

      let result
      if (search) {
        const items = await InventoryModel.searchItems(search, limit)
        result = { items, total: items.length }
      } else {
        result = await InventoryModel.findAllItems(limit, offset)
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
      })
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Failed to fetch inventory items",
      })
    }
  },
)

// Create new inventory item (Inventory Manager only)
router.post(
  "/items",
  authorize([UserRole.ADMIN, UserRole.INVENTORY_MANAGER]),
  [
    body("name").trim().isLength({ min: 1 }).withMessage("Name is required"),
    body("category").trim().isLength({ min: 1 }).withMessage("Category is required"),
    body("unit").trim().isLength({ min: 1 }).withMessage("Unit is required"),
    body("reorderLevel").optional().isInt({ min: 0 }).withMessage("Reorder level must be non-negative"),
    body("maxLevel").optional().isInt({ min: 1 }).withMessage("Max level must be positive"),
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

      const item = await InventoryModel.createItem(req.body)

      res.status(201).json({
        success: true,
        message: "Inventory item created successfully",
        data: item,
      })
    } catch (error: any) {
      if (error.code === "23505") {
        return res.status(409).json({
          success: false,
          message: "Item with this name already exists",
        })
      }

      res.status(500).json({
        success: false,
        message: "Failed to create inventory item",
      })
    }
  },
)

// Get item details with batches
router.get(
  "/items/:id",
  authorize([UserRole.ADMIN, UserRole.INVENTORY_MANAGER, UserRole.PHARMACIST]),
  async (req: AuthenticatedRequest, res) => {
    try {
      const { id } = req.params
      const item = await InventoryModel.findItemById(id)

      if (!item) {
        return res.status(404).json({
          success: false,
          message: "Item not found",
        })
      }

      const batches = await InventoryModel.findBatchesByItemId(id)
      const movements = await InventoryModel.findMovementsByItemId(id, 20)

      res.json({
        success: true,
        data: {
          item,
          batches,
          movements,
        },
      })
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Failed to fetch item details",
      })
    }
  },
)

// Create new batch (Inventory Manager only)
router.post(
  "/batches",
  authorize([UserRole.ADMIN, UserRole.INVENTORY_MANAGER]),
  [
    body("inventoryItemId").isUUID().withMessage("Invalid inventory item ID"),
    body("batchNumber").trim().isLength({ min: 1 }).withMessage("Batch number is required"),
    body("quantity").isInt({ min: 1 }).withMessage("Quantity must be positive"),
    body("unitCost").isFloat({ min: 0 }).withMessage("Unit cost must be non-negative"),
    body("sellingPrice").isFloat({ min: 0 }).withMessage("Selling price must be non-negative"),
    body("expiryDate").isISO8601().withMessage("Invalid expiry date"),
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

      const batchData = {
        ...req.body,
        expiryDate: new Date(req.body.expiryDate),
        receivedBy: req.user!.id,
      }

      const batch = await InventoryModel.createBatch(batchData)

      // Create receive movement
      await InventoryModel.createMovement({
        inventoryItemId: batch.inventoryItemId,
        batchId: batch.id,
        movementType: "RECEIVE",
        quantity: batch.quantity,
        unitCost: batch.unitCost,
        performedBy: req.user!.id,
        notes: `Received batch ${batch.batchNumber}`,
      })

      res.status(201).json({
        success: true,
        message: "Batch created successfully",
        data: batch,
      })
    } catch (error: any) {
      if (error.code === "23505") {
        return res.status(409).json({
          success: false,
          message: "Batch number already exists for this item",
        })
      }

      res.status(500).json({
        success: false,
        message: "Failed to create batch",
      })
    }
  },
)

// Dispense from batch (Pharmacist only)
router.post(
  "/dispense",
  authorize([UserRole.ADMIN, UserRole.PHARMACIST]),
  [
    body("batchId").isUUID().withMessage("Invalid batch ID"),
    body("quantity").isInt({ min: 1 }).withMessage("Quantity must be positive"),
    body("reference").optional().isString().withMessage("Reference must be a string"),
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

      const { batchId, quantity, reference } = req.body

      const result = await InventoryModel.dispenseFromBatch(batchId, quantity, req.user!.id, reference)

      if (!result.success) {
        return res.status(400).json({
          success: false,
          message: result.message,
        })
      }

      res.json({
        success: true,
        message: result.message,
        data: result.batch,
      })
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Failed to dispense from batch",
      })
    }
  },
)

// Get stock levels and alerts
router.get(
  "/stock-levels",
  authorize([UserRole.ADMIN, UserRole.INVENTORY_MANAGER, UserRole.PHARMACIST]),
  async (req: AuthenticatedRequest, res) => {
    try {
      const stockLevels = await InventoryModel.getStockLevels()

      res.json({
        success: true,
        data: stockLevels,
      })
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Failed to fetch stock levels",
      })
    }
  },
)

// Get expiring batches
router.get(
  "/expiring",
  authorize([UserRole.ADMIN, UserRole.INVENTORY_MANAGER]),
  [query("days").optional().isInt({ min: 1, max: 365 }).withMessage("Days must be between 1 and 365")],
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

      const days = Number.parseInt(req.query.days as string) || 30
      const expiringBatches = await InventoryModel.getExpiringBatches(days)

      res.json({
        success: true,
        data: expiringBatches,
      })
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Failed to fetch expiring batches",
      })
    }
  },
)

// Get available stock for prescriptions
router.get(
  "/available-stock",
  authorize([UserRole.ADMIN, UserRole.CLINICAL_OFFICER, UserRole.PHARMACIST]),
  [
    query("search").optional().isString().withMessage("Search must be a string"),
    query("category").optional().isString().withMessage("Category must be a string"),
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

      const search = req.query.search as string
      const category = req.query.category as string

      const availableStock = await InventoryModel.getAvailableStock(search, category)

      res.json({
        success: true,
        data: availableStock,
      })
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Failed to fetch available stock",
      })
    }
  },
)

export default router
