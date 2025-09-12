import express from "express"
import { body, param, query, validationResult } from "express-validator"
import { FamilyPlanningModel } from "../models/FamilyPlanning"
import { authenticate, authorize } from "../middleware/auth"
import { auditLogger } from "../middleware/auditLogger"
import type { AuthenticatedRequest } from "../types"
import { UserRole } from "../types"

const router = express.Router()

// Get all family planning methods
router.get("/methods", authenticate, async (req: AuthenticatedRequest, res) => {
  try {
    const methods = await FamilyPlanningModel.getMethods()
    res.json({
      success: true,
      data: methods
    })
  } catch (error) {
    console.error("Error fetching family planning methods:", error)
    res.status(500).json({
      success: false,
      message: "Failed to fetch family planning methods"
    })
  }
})

// Get family planning methods by category
router.get("/methods/category/:category",
  authenticate,
  param("category").isIn(["HORMONAL", "BARRIER", "IUD", "STERILIZATION", "NATURAL"]).withMessage("Invalid category"),
  async (req: AuthenticatedRequest, res) => {
    try {
      const errors = validationResult(req)
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: "Validation failed",
          errors: errors.array()
        })
      }

      const { category } = req.params
      const methods = await FamilyPlanningModel.getMethodsByCategory(category)
      
      res.json({
        success: true,
        data: methods
      })
    } catch (error) {
      console.error("Error fetching family planning methods by category:", error)
      res.status(500).json({
        success: false,
        message: "Failed to fetch family planning methods by category"
      })
    }
  }
)

// Get patient family planning history
router.get("/patients/:patientId/history",
  authenticate,
  param("patientId").isUUID().withMessage("Invalid patient ID"),
  async (req: AuthenticatedRequest, res) => {
    try {
      const errors = validationResult(req)
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: "Validation failed",
          errors: errors.array()
        })
      }

      const { patientId } = req.params
      const history = await FamilyPlanningModel.getPatientFamilyPlanning(patientId)
      
      res.json({
        success: true,
        data: history
      })
    } catch (error) {
      console.error("Error fetching patient family planning history:", error)
      res.status(500).json({
        success: false,
        message: "Failed to fetch patient family planning history"
      })
    }
  }
)

// Get active family planning for patient
router.get("/patients/:patientId/active",
  authenticate,
  param("patientId").isUUID().withMessage("Invalid patient ID"),
  async (req: AuthenticatedRequest, res) => {
    try {
      const errors = validationResult(req)
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: "Validation failed",
          errors: errors.array()
        })
      }

      const { patientId } = req.params
      const active = await FamilyPlanningModel.getActivePatientFamilyPlanning(patientId)
      
      res.json({
        success: true,
        data: active
      })
    } catch (error) {
      console.error("Error fetching active family planning:", error)
      res.status(500).json({
        success: false,
        message: "Failed to fetch active family planning"
      })
    }
  }
)

// Create patient family planning record
router.post("/patients/:patientId/records",
  authenticate,
  authorize([UserRole.NURSE, UserRole.CLINICAL_OFFICER, UserRole.ADMIN]),
  auditLogger,
  param("patientId").isUUID().withMessage("Invalid patient ID"),
  body("methodId").isUUID().withMessage("Invalid method ID"),
  body("startDate").optional().isISO8601().withMessage("Invalid start date"),
  body("endDate").optional().isISO8601().withMessage("Invalid end date"),
  body("counselingProvided").optional().isBoolean().withMessage("Invalid counseling provided"),
  body("counselingNotes").optional().isString().withMessage("Invalid counseling notes"),
  body("sideEffectsExperienced").optional().isString().withMessage("Invalid side effects"),
  body("satisfactionRating").optional().isInt({ min: 1, max: 5 }).withMessage("Invalid satisfaction rating"),
  body("followUpDate").optional().isISO8601().withMessage("Invalid follow-up date"),
  body("status").optional().isIn(["ACTIVE", "DISCONTINUED", "COMPLETED", "SWITCHED"]).withMessage("Invalid status"),
  body("discontinuationReason").optional().isString().withMessage("Invalid discontinuation reason"),
  body("notes").optional().isString().withMessage("Invalid notes"),
  async (req: AuthenticatedRequest, res) => {
    try {
      const errors = validationResult(req)
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: "Validation failed",
          errors: errors.array()
        })
      }

      const { patientId } = req.params
      const familyPlanningData = {
        ...req.body,
        patientId,
        providerId: req.user!.id
      }

      const record = await FamilyPlanningModel.createPatientFamilyPlanning(familyPlanningData)
      
      res.status(201).json({
        success: true,
        message: "Family planning record created successfully",
        data: record
      })
    } catch (error) {
      console.error("Error creating family planning record:", error)
      res.status(500).json({
        success: false,
        message: "Failed to create family planning record"
      })
    }
  }
)

// Update patient family planning record
router.put("/records/:recordId",
  authenticate,
  authorize([UserRole.NURSE, UserRole.CLINICAL_OFFICER, UserRole.ADMIN]),
  auditLogger,
  param("recordId").isUUID().withMessage("Invalid record ID"),
  body("startDate").optional().isISO8601().withMessage("Invalid start date"),
  body("endDate").optional().isISO8601().withMessage("Invalid end date"),
  body("counselingProvided").optional().isBoolean().withMessage("Invalid counseling provided"),
  body("counselingNotes").optional().isString().withMessage("Invalid counseling notes"),
  body("sideEffectsExperienced").optional().isString().withMessage("Invalid side effects"),
  body("satisfactionRating").optional().isInt({ min: 1, max: 5 }).withMessage("Invalid satisfaction rating"),
  body("followUpDate").optional().isISO8601().withMessage("Invalid follow-up date"),
  body("status").optional().isIn(["ACTIVE", "DISCONTINUED", "COMPLETED", "SWITCHED"]).withMessage("Invalid status"),
  body("discontinuationReason").optional().isString().withMessage("Invalid discontinuation reason"),
  body("notes").optional().isString().withMessage("Invalid notes"),
  async (req: AuthenticatedRequest, res) => {
    try {
      const errors = validationResult(req)
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: "Validation failed",
          errors: errors.array()
        })
      }

      const { recordId } = req.params
      const record = await FamilyPlanningModel.updatePatientFamilyPlanning(recordId, req.body)
      
      if (!record) {
        return res.status(404).json({
          success: false,
          message: "Family planning record not found"
        })
      }

      res.json({
        success: true,
        message: "Family planning record updated successfully",
        data: record
      })
    } catch (error) {
      console.error("Error updating family planning record:", error)
      res.status(500).json({
        success: false,
        message: "Failed to update family planning record"
      })
    }
  }
)

// Discontinue current family planning method
router.post("/patients/:patientId/discontinue",
  authenticate,
  authorize([UserRole.NURSE, UserRole.CLINICAL_OFFICER, UserRole.ADMIN]),
  auditLogger,
  param("patientId").isUUID().withMessage("Invalid patient ID"),
  body("reason").isString().withMessage("Discontinuation reason is required"),
  async (req: AuthenticatedRequest, res) => {
    try {
      const errors = validationResult(req)
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: "Validation failed",
          errors: errors.array()
        })
      }

      const { patientId } = req.params
      const { reason } = req.body
      
      const discontinued = await FamilyPlanningModel.discontinuePatientFamilyPlanning(
        patientId, 
        reason, 
        req.user!.id
      )
      
      if (!discontinued) {
        return res.status(404).json({
          success: false,
          message: "No active family planning method found for this patient"
        })
      }

      res.json({
        success: true,
        message: "Family planning method discontinued successfully"
      })
    } catch (error) {
      console.error("Error discontinuing family planning method:", error)
      res.status(500).json({
        success: false,
        message: "Failed to discontinue family planning method"
      })
    }
  }
)

// Get family planning statistics
router.get("/statistics",
  authenticate,
  authorize([UserRole.ADMIN, UserRole.CLINICAL_OFFICER]),
  async (req: AuthenticatedRequest, res) => {
    try {
      const stats = await FamilyPlanningModel.getFamilyPlanningStats()
      
      res.json({
        success: true,
        data: stats
      })
    } catch (error) {
      console.error("Error fetching family planning statistics:", error)
      res.status(500).json({
        success: false,
        message: "Failed to fetch family planning statistics"
      })
    }
  }
)

// Delete family planning record
router.delete("/records/:recordId",
  authenticate,
  authorize([UserRole.NURSE, UserRole.CLINICAL_OFFICER, UserRole.ADMIN]),
  auditLogger,
  param("recordId").isUUID().withMessage("Invalid record ID"),
  async (req: AuthenticatedRequest, res) => {
    try {
      const errors = validationResult(req)
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: "Validation failed",
          errors: errors.array()
        })
      }

      const { recordId } = req.params
      const deleted = await FamilyPlanningModel.deletePatientFamilyPlanning(recordId)
      
      if (!deleted) {
        return res.status(404).json({
          success: false,
          message: "Family planning record not found"
        })
      }

      res.json({
        success: true,
        message: "Family planning record deleted successfully"
      })
    } catch (error) {
      console.error("Error deleting family planning record:", error)
      res.status(500).json({
        success: false,
        message: "Failed to delete family planning record"
      })
    }
  }
)

export default router
