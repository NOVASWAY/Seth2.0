import express from "express"
import { body, validationResult } from "express-validator"
import { PrescriptionModel } from "../models/Prescription"
import { authorize, type AuthenticatedRequest } from "../middleware/auth"
import { UserRole } from "../types"
import pool from "../config/database"

const router = express.Router()

// Get all prescriptions (with pagination and filtering)
router.get(
  "/",
  authorize([UserRole.ADMIN, UserRole.CLINICAL_OFFICER, UserRole.PHARMACIST]),
  async (req: AuthenticatedRequest, res) => {
    try {
      const { limit = 50, offset = 0, status, patientId } = req.query
      
      let whereClause = ""
      let queryParams: any[] = []
      let paramIndex = 1

      if (status) {
        whereClause += `WHERE status = $${paramIndex}`
        queryParams.push(status)
        paramIndex++
      }

      if (patientId) {
        const condition = whereClause ? "AND" : "WHERE"
        whereClause += ` ${condition} patient_id = $${paramIndex}`
        queryParams.push(patientId)
        paramIndex++
      }

      // Get total count
      const countQuery = `SELECT COUNT(*) as total FROM prescriptions ${whereClause}`
      const countResult = await pool.query(countQuery, queryParams)
      const total = parseInt(countResult.rows[0].total)

      // Get prescriptions with pagination
      const prescriptionsQuery = `
        SELECT id, consultation_id as "consultationId", visit_id as "visitId", 
               patient_id as "patientId", prescribed_by as "prescribedBy", 
               status, created_at as "createdAt", updated_at as "updatedAt"
        FROM prescriptions 
        ${whereClause}
        ORDER BY created_at DESC
        LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
      `
      
      queryParams.push(parseInt(limit as string), parseInt(offset as string))
      const prescriptionsResult = await pool.query(prescriptionsQuery, queryParams)
      const prescriptions = prescriptionsResult.rows

      // Get items for each prescription
      const prescriptionsWithItems = []
      for (const prescription of prescriptions) {
        const itemsQuery = `
          SELECT id, prescription_id as "prescriptionId", inventory_item_id as "inventoryItemId",
                 item_name as "itemName", dosage, frequency, duration,
                 quantity_prescribed as "quantityPrescribed", quantity_dispensed as "quantityDispensed",
                 instructions
          FROM prescription_items 
          WHERE prescription_id = $1
        `
        const itemsResult = await pool.query(itemsQuery, [prescription.id])
        const items = itemsResult.rows

        prescriptionsWithItems.push({
          ...prescription,
          items,
        })
      }

      res.json({
        success: true,
        data: prescriptionsWithItems,
        pagination: {
          total,
          limit: parseInt(limit as string),
          offset: parseInt(offset as string),
          has_more: prescriptions.length === parseInt(limit as string),
        },
      })
    } catch (error) {
      console.error("Error fetching prescriptions:", error)
      res.status(500).json({
        success: false,
        message: "Failed to fetch prescriptions",
      })
    }
  },
)

// Get all prescriptions for a patient
router.get(
  "/patient/:patientId",
  authorize([UserRole.ADMIN, UserRole.CLINICAL_OFFICER, UserRole.PHARMACIST]),
  async (req: AuthenticatedRequest, res) => {
    try {
      const { patientId } = req.params
      const prescriptions = await PrescriptionModel.findByPatientId(patientId)

      res.json({
        success: true,
        data: prescriptions,
      })
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Failed to fetch prescriptions",
      })
    }
  },
)

// Get prescription by ID
router.get(
  "/:id",
  authorize([UserRole.ADMIN, UserRole.CLINICAL_OFFICER, UserRole.PHARMACIST]),
  async (req: AuthenticatedRequest, res) => {
    try {
      const { id } = req.params
      const prescription = await PrescriptionModel.findById(id)

      if (!prescription) {
        return res.status(404).json({
          success: false,
          message: "Prescription not found",
        })
      }

      res.json({
        success: true,
        data: prescription,
      })
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Failed to fetch prescription",
      })
    }
  },
)

// Create new prescription
router.post(
  "/",
  authorize([UserRole.ADMIN, UserRole.CLINICAL_OFFICER]),
  [
    body("consultationId").isUUID().withMessage("Invalid consultation ID"),
    body("visitId").isUUID().withMessage("Invalid visit ID"),
    body("patientId").isUUID().withMessage("Invalid patient ID"),
    body("items").isArray({ min: 1 }).withMessage("At least one prescription item is required"),
    body("items.*.inventoryItemId").isUUID().withMessage("Invalid inventory item ID"),
    body("items.*.itemName").trim().isLength({ min: 1 }).withMessage("Item name is required"),
    body("items.*.dosage").trim().isLength({ min: 1 }).withMessage("Dosage is required"),
    body("items.*.frequency").trim().isLength({ min: 1 }).withMessage("Frequency is required"),
    body("items.*.duration").trim().isLength({ min: 1 }).withMessage("Duration is required"),
    body("items.*.quantityPrescribed").isInt({ min: 1 }).withMessage("Quantity must be positive"),
    body("items.*.instructions").optional().isString(),
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

      const prescriptionData = {
        ...req.body,
        prescribedBy: req.user!.id,
      }

      const prescription = await PrescriptionModel.create(prescriptionData)

      res.status(201).json({
        success: true,
        message: "Prescription created successfully",
        data: prescription,
      })
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: error.message || "Failed to create prescription",
      })
    }
  },
)

// Update prescription status
router.patch(
  "/:id/status",
  authorize([UserRole.ADMIN, UserRole.PHARMACIST]),
  [
    body("status").isIn(["PENDING", "PARTIALLY_DISPENSED", "FULLY_DISPENSED", "CANCELLED"]).withMessage("Invalid status"),
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
      const { status } = req.body

      const prescription = await PrescriptionModel.updateStatus(id, status)

      if (!prescription) {
        return res.status(404).json({
          success: false,
          message: "Prescription not found",
        })
      }

      res.json({
        success: true,
        message: "Prescription status updated successfully",
        data: prescription,
      })
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: error.message || "Failed to update prescription status",
      })
    }
  },
)

// Update prescription item dispensed quantity
router.patch(
  "/items/:id/dispense",
  authorize([UserRole.ADMIN, UserRole.PHARMACIST]),
  [
    body("quantityDispensed").isInt({ min: 0 }).withMessage("Quantity dispensed must be non-negative"),
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
      const { quantityDispensed } = req.body

      const item = await PrescriptionModel.updateDispensedQuantity(id, quantityDispensed)

      if (!item) {
        return res.status(404).json({
          success: false,
          message: "Prescription item not found",
        })
      }

      res.json({
        success: true,
        message: "Dispensed quantity updated successfully",
        data: item,
      })
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: error.message || "Failed to update dispensed quantity",
      })
    }
  },
)

export default router
