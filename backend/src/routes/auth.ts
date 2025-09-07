import express from "express"
import { body, validationResult } from "express-validator"
import { AuthService } from "../services/AuthService"
import { authenticate, type AuthenticatedRequest } from "../middleware/auth"

const router = express.Router()

// Login endpoint
router.post(
  "/login",
  [
    body("username").trim().isLength({ min: 3 }).withMessage("Username must be at least 3 characters"),
    body("password").isLength({ min: 6 }).withMessage("Password must be at least 6 characters"),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req)
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: "Validation failed",
          errors: errors.array(),
        })
      }

      const { username, password } = req.body
      const result = await AuthService.login(
        { username, password },
        req.ip,
        req.get("User-Agent")
      )

      if (!result) {
        return res.status(401).json({
          success: false,
          message: "Invalid username or password",
        })
      }

      res.json({
        success: true,
        message: "Login successful",
        data: {
          user: result.user,
          accessToken: result.tokens.accessToken,
          refreshToken: result.tokens.refreshToken,
        },
      })
    } catch (error: any) {
      res.status(400).json({
        success: false,
        message: error.message || "Login failed",
      })
    }
  },
)

// Refresh token endpoint
router.post(
  "/refresh",
  [body("refreshToken").notEmpty().withMessage("Refresh token is required")],
  async (req, res) => {
    try {
      const errors = validationResult(req)
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: "Validation failed",
          errors: errors.array(),
        })
      }

      const { refreshToken } = req.body
      const tokens = await AuthService.refreshToken(refreshToken)

      if (!tokens) {
        return res.status(401).json({
          success: false,
          message: "Invalid or expired refresh token",
        })
      }

      res.json({
        success: true,
        message: "Token refreshed successfully",
        data: tokens,
      })
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Token refresh failed",
      })
    }
  },
)

// Logout endpoint
router.post("/logout", authenticate, async (req: AuthenticatedRequest, res) => {
  try {
    if (req.user) {
      await AuthService.logout(req.user.id)
    }

    res.json({
      success: true,
      message: "Logout successful",
    })
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Logout failed",
    })
  }
})

// Get current user endpoint
router.get("/me", authenticate, (req: AuthenticatedRequest, res) => {
  res.json({
    success: true,
    data: req.user,
  })
})

export default router
