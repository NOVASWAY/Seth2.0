import express from "express"
import { body, validationResult, query } from "express-validator"
import { LabRequestModel } from "../models/LabRequest"
import { authorize, type AuthenticatedRequest } from "../middleware/auth"
import { UserRole } from "../../../types"

const router = express.Router()

// Get all lab requests
router.get(
  "/",
  authorize([UserRole.ADMIN, UserRole.CLINICAL_OFFICER, UserRole.LAB_TECHNICIAN]),
  [
    query("status").optional().isString().withMessage("Status must be a string"),
    query("urgency").optional().isString().withMessage("Urgency must be a string"),
  ],
  async (req: AuthenticatedRequest, res) => {
    try {
      const errors = validationResult(req)
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          errors: errors.array().map(err => err.msg)
        })
      }

      const { status, urgency } = req.query
      const requests = await LabRequestModel.findAll(
        status as string,
        urgency as string
      )

      res.json({
        success: true,
        data: requests
      })
    } catch (error) {
      console.error("Error fetching lab requests:", error)
      res.status(500).json({
        success: false,
        message: "Failed to fetch lab requests"
      })
    }
  }
)

// Get pending lab requests (for lab technicians)
router.get(
  "/pending",
  authorize([UserRole.ADMIN, UserRole.LAB_TECHNICIAN]),
  async (req: AuthenticatedRequest, res) => {
    try {
      const requests = await LabRequestModel.getPendingRequests()

      res.json({
        success: true,
        data: requests
      })
    } catch (error) {
      console.error("Error fetching pending lab requests:", error)
      res.status(500).json({
        success: false,
        message: "Failed to fetch pending lab requests"
      })
    }
  }
)

// Get completed lab requests
router.get(
  "/completed",
  authorize([UserRole.ADMIN, UserRole.CLINICAL_OFFICER, UserRole.LAB_TECHNICIAN]),
  [
    query("startDate").optional().isISO8601().withMessage("Start date must be a valid date"),
    query("endDate").optional().isISO8601().withMessage("End date must be a valid date"),
  ],
  async (req: AuthenticatedRequest, res) => {
    try {
      const errors = validationResult(req)
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          errors: errors.array().map(err => err.msg)
        })
      }

      const { startDate, endDate } = req.query
      const requests = await LabRequestModel.getCompletedRequests(
        startDate ? new Date(startDate as string) : undefined,
        endDate ? new Date(endDate as string) : undefined
      )

      res.json({
        success: true,
        data: requests
      })
    } catch (error) {
      console.error("Error fetching completed lab requests:", error)
      res.status(500).json({
        success: false,
        message: "Failed to fetch completed lab requests"
      })
    }
  }
)

// Get lab requests for a specific patient
router.get(
  "/patient/:patientId",
  authorize([UserRole.ADMIN, UserRole.CLINICAL_OFFICER, UserRole.LAB_TECHNICIAN]),
  async (req: AuthenticatedRequest, res) => {
    try {
      const { patientId } = req.params
      const requests = await LabRequestModel.findByPatientId(patientId)

      res.json({
        success: true,
        data: requests
      })
    } catch (error) {
      console.error("Error fetching patient lab requests:", error)
      res.status(500).json({
        success: false,
        message: "Failed to fetch patient lab requests"
      })
    }
  }
)

// Get lab requests for a specific visit
router.get(
  "/visit/:visitId",
  authorize([UserRole.ADMIN, UserRole.CLINICAL_OFFICER, UserRole.LAB_TECHNICIAN]),
  async (req: AuthenticatedRequest, res) => {
    try {
      const { visitId } = req.params
      const requests = await LabRequestModel.findByVisitId(visitId)

      res.json({
        success: true,
        data: requests
      })
    } catch (error) {
      console.error("Error fetching visit lab requests:", error)
      res.status(500).json({
        success: false,
        message: "Failed to fetch visit lab requests"
      })
    }
  }
)

// Get lab request by ID
router.get(
  "/:id",
  authorize([UserRole.ADMIN, UserRole.CLINICAL_OFFICER, UserRole.LAB_TECHNICIAN]),
  async (req: AuthenticatedRequest, res) => {
    try {
      const { id } = req.params
      const request = await LabRequestModel.findById(id)

      if (!request) {
        return res.status(404).json({
          success: false,
          message: "Lab request not found"
        })
      }

      // Get request items
      const items = await LabRequestModel.getRequestItems(id)

      res.json({
        success: true,
        data: {
          ...request,
          items
        }
      })
    } catch (error) {
      console.error("Error fetching lab request:", error)
      res.status(500).json({
        success: false,
        message: "Failed to fetch lab request"
      })
    }
  }
)

// Create new lab request
router.post(
  "/",
  authorize([UserRole.ADMIN, UserRole.CLINICAL_OFFICER]),
  [
    body("visitId").isUUID().withMessage("Valid visit ID is required"),
    body("patientId").isUUID().withMessage("Valid patient ID is required"),
    body("clinicalNotes").optional().isString().withMessage("Clinical notes must be a string"),
    body("urgency").isIn(["ROUTINE", "URGENT", "STAT"]).withMessage("Invalid urgency level"),
    body("items").isArray({ min: 1 }).withMessage("At least one test item is required"),
    body("items.*.testId").isUUID().withMessage("Valid test ID is required"),
    body("items.*.testName").trim().isLength({ min: 1 }).withMessage("Test name is required"),
    body("items.*.testCode").trim().isLength({ min: 1 }).withMessage("Test code is required"),
    body("items.*.specimenType").trim().isLength({ min: 1 }).withMessage("Specimen type is required"),
    body("items.*.clinicalNotes").optional().isString().withMessage("Item clinical notes must be a string"),
  ],
  async (req: AuthenticatedRequest, res) => {
    try {
      const errors = validationResult(req)
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          errors: errors.array().map(err => err.msg)
        })
      }

      const {
        visitId,
        patientId,
        clinicalNotes,
        urgency,
        items
      } = req.body

      const request = await LabRequestModel.create({
        visitId,
        patientId,
        requestedBy: req.user!.id,
        clinicalNotes,
        urgency,
        items
      })

      res.status(201).json({
        success: true,
        data: request,
        message: "Lab request created successfully"
      })
    } catch (error) {
      console.error("Error creating lab request:", error)
      res.status(500).json({
        success: false,
        message: "Failed to create lab request"
      })
    }
  }
)

// Update lab request status
router.patch(
  "/:id/status",
  authorize([UserRole.ADMIN, UserRole.LAB_TECHNICIAN]),
  [
    body("status").isIn(["REQUESTED", "SAMPLE_COLLECTED", "IN_PROGRESS", "COMPLETED", "CANCELLED"]).withMessage("Invalid status"),
    body("specimenCollectedAt").optional().isISO8601().withMessage("Specimen collected at must be a valid date"),
    body("collectedBy").optional().isUUID().withMessage("Valid collected by user ID is required"),
    body("expectedCompletionAt").optional().isISO8601().withMessage("Expected completion at must be a valid date"),
  ],
  async (req: AuthenticatedRequest, res) => {
    try {
      const errors = validationResult(req)
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          errors: errors.array().map(err => err.msg)
        })
      }

      const { id } = req.params
      const updateData = req.body

      // Convert date strings to Date objects
      if (updateData.specimenCollectedAt) {
        updateData.specimenCollectedAt = new Date(updateData.specimenCollectedAt)
      }
      if (updateData.expectedCompletionAt) {
        updateData.expectedCompletionAt = new Date(updateData.expectedCompletionAt)
      }

      const request = await LabRequestModel.updateStatus(id, updateData)

      if (!request) {
        return res.status(404).json({
          success: false,
          message: "Lab request not found"
        })
      }

      res.json({
        success: true,
        data: request,
        message: "Lab request status updated successfully"
      })
    } catch (error) {
      console.error("Error updating lab request status:", error)
      res.status(500).json({
        success: false,
        message: "Failed to update lab request status"
      })
    }
  }
)

// Update lab request item status and results
router.patch(
  "/items/:itemId",
  authorize([UserRole.ADMIN, UserRole.LAB_TECHNICIAN]),
  [
    body("status").isIn(["REQUESTED", "SAMPLE_COLLECTED", "IN_PROGRESS", "COMPLETED", "CANCELLED"]).withMessage("Invalid status"),
    body("resultData").optional().isObject().withMessage("Result data must be an object"),
    body("referenceRanges").optional().isObject().withMessage("Reference ranges must be an object"),
    body("abnormalFlags").optional().isObject().withMessage("Abnormal flags must be an object"),
    body("technicianNotes").optional().isString().withMessage("Technician notes must be a string"),
    body("verifiedBy").optional().isUUID().withMessage("Valid verified by user ID is required"),
    body("verifiedAt").optional().isISO8601().withMessage("Verified at must be a valid date"),
    body("reportedAt").optional().isISO8601().withMessage("Reported at must be a valid date"),
  ],
  async (req: AuthenticatedRequest, res) => {
    try {
      const errors = validationResult(req)
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          errors: errors.array().map(err => err.msg)
        })
      }

      const { itemId } = req.params
      const updateData = req.body

      // Convert date strings to Date objects
      if (updateData.verifiedAt) {
        updateData.verifiedAt = new Date(updateData.verifiedAt)
      }
      if (updateData.reportedAt) {
        updateData.reportedAt = new Date(updateData.reportedAt)
      }

      const item = await LabRequestModel.updateItemStatus(itemId, updateData)

      if (!item) {
        return res.status(404).json({
          success: false,
          message: "Lab request item not found"
        })
      }

      res.json({
        success: true,
        data: item,
        message: "Lab request item updated successfully"
      })
    } catch (error) {
      console.error("Error updating lab request item:", error)
      res.status(500).json({
        success: false,
        message: "Failed to update lab request item"
      })
    }
  }
)

// Get lab request items
router.get(
  "/:id/items",
  authorize([UserRole.ADMIN, UserRole.CLINICAL_OFFICER, UserRole.LAB_TECHNICIAN]),
  async (req: AuthenticatedRequest, res) => {
    try {
      const { id } = req.params
      const items = await LabRequestModel.getRequestItems(id)

      res.json({
        success: true,
        data: items
      })
    } catch (error) {
      console.error("Error fetching lab request items:", error)
      res.status(500).json({
        success: false,
        message: "Failed to fetch lab request items"
      })
    }
  }
)

export default router
