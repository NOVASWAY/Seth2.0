import express from "express"
import { body, query, validationResult } from "express-validator"
import { UserModel } from "../models/User"
import { authorize, type AuthenticatedRequest } from "../middleware/auth"
import { UserRole } from "../../../types"

const router = express.Router()

// Get all users (Admin only)
router.get(
  "/",
  authorize([UserRole.ADMIN]),
  [
    query("page").optional().isInt({ min: 1 }).withMessage("Page must be a positive integer"),
    query("limit").optional().isInt({ min: 1, max: 100 }).withMessage("Limit must be between 1 and 100"),
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
      const offset = (page - 1) * limit

      const result = await UserModel.findAll(limit, offset)

      res.json({
        success: true,
        data: {
          users: result.users,
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
        message: "Failed to fetch users",
      })
    }
  },
)

// Create new user (Admin only)
router.post(
  "/",
  authorize([UserRole.ADMIN]),
  [
    body("username").trim().isLength({ min: 3 }).withMessage("Username must be at least 3 characters"),
    body("email").optional().isEmail().withMessage("Invalid email format"),
    body("password").isLength({ min: 8 }).withMessage("Password must be at least 8 characters"),
    body("role").isIn(Object.values(UserRole)).withMessage("Invalid role"),
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

      const { username, email, password, role } = req.body

      // Check if username already exists
      const existingUser = await UserModel.findByUsername(username)
      if (existingUser) {
        return res.status(409).json({
          success: false,
          message: "Username already exists",
        })
      }

      const user = await UserModel.create({
        username,
        email,
        password,
        role,
      })

      // Remove password hash from response
      const { passwordHash, ...userResponse } = user

      res.status(201).json({
        success: true,
        message: "User created successfully",
        data: userResponse,
      })
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Failed to create user",
      })
    }
  },
)

// Update user (Admin only)
router.put(
  "/:id",
  authorize([UserRole.ADMIN]),
  [
    body("email").optional().isEmail().withMessage("Invalid email format"),
    body("role").optional().isIn(Object.values(UserRole)).withMessage("Invalid role"),
    body("isActive").optional().isBoolean().withMessage("isActive must be boolean"),
    body("isLocked").optional().isBoolean().withMessage("isLocked must be boolean"),
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
      const { email, role, isActive, isLocked } = req.body

      const user = await UserModel.update(id, {
        email,
        role,
        isActive,
        isLocked,
      })

      if (!user) {
        return res.status(404).json({
          success: false,
          message: "User not found",
        })
      }

      // Remove password hash from response
      const { passwordHash, ...userResponse } = user

      res.json({
        success: true,
        message: "User updated successfully",
        data: userResponse,
      })
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Failed to update user",
      })
    }
  },
)

// Reset user password (Admin only)
router.post(
  "/:id/reset-password",
  authorize([UserRole.ADMIN]),
  [body("newPassword").isLength({ min: 8 }).withMessage("Password must be at least 8 characters")],
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
      const { newPassword } = req.body

      const user = await UserModel.findById(id)
      if (!user) {
        return res.status(404).json({
          success: false,
          message: "User not found",
        })
      }

      await UserModel.resetPassword(id, newPassword)

      res.json({
        success: true,
        message: "Password reset successfully",
      })
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Failed to reset password",
      })
    }
  },
)

export default router
