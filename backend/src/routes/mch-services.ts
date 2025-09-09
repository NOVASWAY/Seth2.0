import express from "express"
import { body, param, query, validationResult } from "express-validator"
import { MCHServicesModel } from "../models/MCHServices"
import { authenticate, authorize } from "../middleware/auth"
import { auditLogger } from "../middleware/auditLogger"
import type { AuthenticatedRequest } from "../types"

const router = express.Router()

// Get all MCH services
router.get("/services", authenticate, async (req: AuthenticatedRequest, res) => {
  try {
    const services = await MCHServicesModel.getServices()
    res.json({
      success: true,
      data: services
    })
  } catch (error) {
    console.error("Error fetching MCH services:", error)
    res.status(500).json({
      success: false,
      message: "Failed to fetch MCH services"
    })
  }
})

// Get MCH services by category
router.get("/services/category/:category",
  authenticate,
  param("category").isIn(["ANTENATAL", "POSTNATAL", "CHILD_HEALTH", "NUTRITION", "FAMILY_PLANNING"]).withMessage("Invalid category"),
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
      const services = await MCHServicesModel.getServicesByCategory(category)
      
      res.json({
        success: true,
        data: services
      })
    } catch (error) {
      console.error("Error fetching MCH services by category:", error)
      res.status(500).json({
        success: false,
        message: "Failed to fetch MCH services by category"
      })
    }
  }
)

// Get patient MCH services history
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
      const history = await MCHServicesModel.getPatientMCHServices(patientId)
      
      res.json({
        success: true,
        data: history
      })
    } catch (error) {
      console.error("Error fetching patient MCH services history:", error)
      res.status(500).json({
        success: false,
        message: "Failed to fetch patient MCH services history"
      })
    }
  }
)

// Get patient MCH services by category
router.get("/patients/:patientId/category/:category",
  authenticate,
  param("patientId").isUUID().withMessage("Invalid patient ID"),
  param("category").isIn(["ANTENATAL", "POSTNATAL", "CHILD_HEALTH", "NUTRITION", "FAMILY_PLANNING"]).withMessage("Invalid category"),
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

      const { patientId, category } = req.params
      const services = await MCHServicesModel.getPatientMCHServicesByCategory(patientId, category)
      
      res.json({
        success: true,
        data: services
      })
    } catch (error) {
      console.error("Error fetching patient MCH services by category:", error)
      res.status(500).json({
        success: false,
        message: "Failed to fetch patient MCH services by category"
      })
    }
  }
)

// Create patient MCH service record
router.post("/patients/:patientId/services",
  authenticate,
  authorize(["NURSE", "CLINICAL_OFFICER", "ADMIN"]),
  auditLogger,
  param("patientId").isUUID().withMessage("Invalid patient ID"),
  body("serviceId").isUUID().withMessage("Invalid service ID"),
  body("serviceDate").optional().isISO8601().withMessage("Invalid service date"),
  body("serviceDetails").optional().isObject().withMessage("Invalid service details"),
  body("findings").optional().isString().withMessage("Invalid findings"),
  body("recommendations").optional().isString().withMessage("Invalid recommendations"),
  body("nextAppointmentDate").optional().isISO8601().withMessage("Invalid next appointment date"),
  body("status").optional().isIn(["SCHEDULED", "COMPLETED", "CANCELLED", "NO_SHOW"]).withMessage("Invalid status"),
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
      const serviceData = {
        ...req.body,
        patientId,
        providerId: req.user!.id
      }

      const record = await MCHServicesModel.createPatientMCHService(serviceData)
      
      res.status(201).json({
        success: true,
        message: "MCH service record created successfully",
        data: record
      })
    } catch (error) {
      console.error("Error creating MCH service record:", error)
      res.status(500).json({
        success: false,
        message: "Failed to create MCH service record"
      })
    }
  }
)

// Update patient MCH service record
router.put("/services/:serviceRecordId",
  authenticate,
  authorize(["NURSE", "CLINICAL_OFFICER", "ADMIN"]),
  auditLogger,
  param("serviceRecordId").isUUID().withMessage("Invalid service record ID"),
  body("serviceDate").optional().isISO8601().withMessage("Invalid service date"),
  body("serviceDetails").optional().isObject().withMessage("Invalid service details"),
  body("findings").optional().isString().withMessage("Invalid findings"),
  body("recommendations").optional().isString().withMessage("Invalid recommendations"),
  body("nextAppointmentDate").optional().isISO8601().withMessage("Invalid next appointment date"),
  body("status").optional().isIn(["SCHEDULED", "COMPLETED", "CANCELLED", "NO_SHOW"]).withMessage("Invalid status"),
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

      const { serviceRecordId } = req.params
      const record = await MCHServicesModel.updatePatientMCHService(serviceRecordId, req.body)
      
      if (!record) {
        return res.status(404).json({
          success: false,
          message: "MCH service record not found"
        })
      }

      res.json({
        success: true,
        message: "MCH service record updated successfully",
        data: record
      })
    } catch (error) {
      console.error("Error updating MCH service record:", error)
      res.status(500).json({
        success: false,
        message: "Failed to update MCH service record"
      })
    }
  }
)

// Get MCH service statistics
router.get("/statistics",
  authenticate,
  authorize(["ADMIN", "CLINICAL_OFFICER"]),
  async (req: AuthenticatedRequest, res) => {
    try {
      const stats = await MCHServicesModel.getMCHServiceStats()
      
      res.json({
        success: true,
        data: stats
      })
    } catch (error) {
      console.error("Error fetching MCH service statistics:", error)
      res.status(500).json({
        success: false,
        message: "Failed to fetch MCH service statistics"
      })
    }
  }
)

// Get upcoming MCH appointments
router.get("/appointments/upcoming",
  authenticate,
  query("days").optional().isInt({ min: 1, max: 30 }).withMessage("Invalid days parameter"),
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

      const days = parseInt(req.query.days as string) || 7
      const appointments = await MCHServicesModel.getUpcomingMCHAppointments(days)
      
      res.json({
        success: true,
        data: appointments
      })
    } catch (error) {
      console.error("Error fetching upcoming MCH appointments:", error)
      res.status(500).json({
        success: false,
        message: "Failed to fetch upcoming MCH appointments"
      })
    }
  }
)

// Delete MCH service record
router.delete("/services/:serviceRecordId",
  authenticate,
  authorize(["NURSE", "CLINICAL_OFFICER", "ADMIN"]),
  auditLogger,
  param("serviceRecordId").isUUID().withMessage("Invalid service record ID"),
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

      const { serviceRecordId } = req.params
      const deleted = await MCHServicesModel.deletePatientMCHService(serviceRecordId)
      
      if (!deleted) {
        return res.status(404).json({
          success: false,
          message: "MCH service record not found"
        })
      }

      res.json({
        success: true,
        message: "MCH service record deleted successfully"
      })
    } catch (error) {
      console.error("Error deleting MCH service record:", error)
      res.status(500).json({
        success: false,
        message: "Failed to delete MCH service record"
      })
    }
  }
)

export default router
