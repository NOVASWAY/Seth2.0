import express from "express"
import { body, validationResult, query } from "express-validator"
import { LabTestModel } from "../models/LabTest"
import { authorize, type AuthenticatedRequest } from "../middleware/auth"
import { UserRole } from "../../../types"

const router = express.Router()

// Get all available lab tests
router.get(
  "/",
  authorize([UserRole.ADMIN, UserRole.CLINICAL_OFFICER, UserRole.LAB_TECHNICIAN]),
  [
    query("search").optional().isString().withMessage("Search must be a string"),
    query("category").optional().isString().withMessage("Category must be a string"),
    query("activeOnly").optional().isBoolean().withMessage("Active only must be a boolean"),
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

      const { search, category, activeOnly = true } = req.query

      let tests
      if (search) {
        tests = await LabTestModel.search(search as string, activeOnly as boolean)
      } else if (category) {
        tests = await LabTestModel.findByCategory(category as string, activeOnly as boolean)
      } else {
        tests = await LabTestModel.findAll(activeOnly as boolean)
      }

      res.json({
        success: true,
        data: tests
      })
    } catch (error) {
      console.error("Error fetching lab tests:", error)
      res.status(500).json({
        success: false,
        message: "Failed to fetch lab tests"
      })
    }
  }
)

// Get available tests for diagnostics (with search and category filtering)
router.get(
  "/available",
  authorize([UserRole.ADMIN, UserRole.CLINICAL_OFFICER, UserRole.LAB_TECHNICIAN]),
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
          errors: errors.array().map(err => err.msg)
        })
      }

      const { search, category } = req.query
      const tests = await LabTestModel.getAvailableTests(
        search as string,
        category as string
      )

      res.json({
        success: true,
        data: tests
      })
    } catch (error) {
      console.error("Error fetching available lab tests:", error)
      res.status(500).json({
        success: false,
        message: "Failed to fetch available lab tests"
      })
    }
  }
)

// Get test categories
router.get(
  "/categories",
  authorize([UserRole.ADMIN, UserRole.CLINICAL_OFFICER, UserRole.LAB_TECHNICIAN]),
  async (req: AuthenticatedRequest, res) => {
    try {
      const categories = await LabTestModel.getCategories()

      res.json({
        success: true,
        data: categories
      })
    } catch (error) {
      console.error("Error fetching test categories:", error)
      res.status(500).json({
        success: false,
        message: "Failed to fetch test categories"
      })
    }
  }
)

// Get lab test by ID
router.get(
  "/:id",
  authorize([UserRole.ADMIN, UserRole.CLINICAL_OFFICER, UserRole.LAB_TECHNICIAN]),
  async (req: AuthenticatedRequest, res) => {
    try {
      const { id } = req.params
      const test = await LabTestModel.findById(id)

      if (!test) {
        return res.status(404).json({
          success: false,
          message: "Lab test not found"
        })
      }

      res.json({
        success: true,
        data: test
      })
    } catch (error) {
      console.error("Error fetching lab test:", error)
      res.status(500).json({
        success: false,
        message: "Failed to fetch lab test"
      })
    }
  }
)

// Create new lab test (Admin only)
router.post(
  "/",
  authorize([UserRole.ADMIN]),
  [
    body("testCode").trim().isLength({ min: 1 }).withMessage("Test code is required"),
    body("testName").trim().isLength({ min: 1 }).withMessage("Test name is required"),
    body("testCategory").trim().isLength({ min: 1 }).withMessage("Test category is required"),
    body("specimenType").trim().isLength({ min: 1 }).withMessage("Specimen type is required"),
    body("turnaroundTime").isInt({ min: 1 }).withMessage("Turnaround time must be a positive integer"),
    body("price").isFloat({ min: 0 }).withMessage("Price must be a non-negative number"),
    body("description").optional().isString().withMessage("Description must be a string"),
    body("instructions").optional().isString().withMessage("Instructions must be a string"),
    body("referenceRanges").optional().isObject().withMessage("Reference ranges must be an object"),
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
        testCode,
        testName,
        testCategory,
        description,
        specimenType,
        turnaroundTime,
        price,
        isActive = true,
        referenceRanges,
        instructions
      } = req.body

      // Check if test code already exists
      const existingTest = await LabTestModel.findByTestCode(testCode)
      if (existingTest) {
        return res.status(400).json({
          success: false,
          message: "Test code already exists"
        })
      }

      const test = await LabTestModel.create({
        testCode,
        testName,
        testCategory,
        description,
        specimenType,
        turnaroundTime,
        price,
        isActive,
        referenceRanges,
        instructions
      })

      res.status(201).json({
        success: true,
        data: test,
        message: "Lab test created successfully"
      })
    } catch (error) {
      console.error("Error creating lab test:", error)
      res.status(500).json({
        success: false,
        message: "Failed to create lab test"
      })
    }
  }
)

// Update lab test (Admin only)
router.put(
  "/:id",
  authorize([UserRole.ADMIN]),
  [
    body("testCode").optional().trim().isLength({ min: 1 }).withMessage("Test code cannot be empty"),
    body("testName").optional().trim().isLength({ min: 1 }).withMessage("Test name cannot be empty"),
    body("testCategory").optional().trim().isLength({ min: 1 }).withMessage("Test category cannot be empty"),
    body("specimenType").optional().trim().isLength({ min: 1 }).withMessage("Specimen type cannot be empty"),
    body("turnaroundTime").optional().isInt({ min: 1 }).withMessage("Turnaround time must be a positive integer"),
    body("price").optional().isFloat({ min: 0 }).withMessage("Price must be a non-negative number"),
    body("description").optional().isString().withMessage("Description must be a string"),
    body("instructions").optional().isString().withMessage("Instructions must be a string"),
    body("referenceRanges").optional().isObject().withMessage("Reference ranges must be an object"),
    body("isActive").optional().isBoolean().withMessage("Is active must be a boolean"),
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

      // If test code is being updated, check for duplicates
      if (updateData.testCode) {
        const existingTest = await LabTestModel.findByTestCode(updateData.testCode)
        if (existingTest && existingTest.id !== id) {
          return res.status(400).json({
            success: false,
            message: "Test code already exists"
          })
        }
      }

      const test = await LabTestModel.update(id, updateData)

      if (!test) {
        return res.status(404).json({
          success: false,
          message: "Lab test not found"
        })
      }

      res.json({
        success: true,
        data: test,
        message: "Lab test updated successfully"
      })
    } catch (error) {
      console.error("Error updating lab test:", error)
      res.status(500).json({
        success: false,
        message: "Failed to update lab test"
      })
    }
  }
)

// Delete lab test (Admin only)
router.delete(
  "/:id",
  authorize([UserRole.ADMIN]),
  async (req: AuthenticatedRequest, res) => {
    try {
      const { id } = req.params
      const deleted = await LabTestModel.delete(id)

      if (!deleted) {
        return res.status(404).json({
          success: false,
          message: "Lab test not found"
        })
      }

      res.json({
        success: true,
        message: "Lab test deleted successfully"
      })
    } catch (error) {
      console.error("Error deleting lab test:", error)
      res.status(500).json({
        success: false,
        message: "Failed to delete lab test"
      })
    }
  }
)

export default router
