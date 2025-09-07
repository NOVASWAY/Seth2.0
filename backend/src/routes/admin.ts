import express from "express"
import { body, validationResult } from "express-validator"
import { authenticateToken, requireRole } from "../middleware/auth"
import { UserModel } from "../models/User"
import { EventLoggerService } from "../services/EventLoggerService"
import { UserRole } from "../types"
import type { AuthenticatedRequest } from "../types"
import pool from "../config/database"
import bcrypt from "bcryptjs"
import crypto from "crypto"

const router = express.Router()

// Get all users (Admin only)
router.get("/users", authenticateToken, requireRole([UserRole.ADMIN]), async (req: AuthenticatedRequest, res) => {
  try {
    const { limit = 50, offset = 0 } = req.query
    const result = await UserModel.findAll(parseInt(limit as string), parseInt(offset as string))

    res.json({
      success: true,
      data: result.users,
      pagination: {
        total: result.total,
        limit: parseInt(limit as string),
        offset: parseInt(offset as string),
      },
    })
  } catch (error) {
    console.error("Error fetching users:", error)
    res.status(500).json({
      success: false,
      message: "Failed to fetch users",
    })
  }
})

// Get user by ID (Admin only)
router.get("/users/:id", authenticateToken, requireRole([UserRole.ADMIN]), async (req: AuthenticatedRequest, res) => {
  try {
    const { id } = req.params
    const user = await UserModel.findById(id)

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
      data: userResponse,
    })
  } catch (error) {
    console.error("Error fetching user:", error)
    res.status(500).json({
      success: false,
      message: "Failed to fetch user",
    })
  }
})

// Update user (Admin only)
router.put(
  "/users/:id",
  authenticateToken,
  requireRole([UserRole.ADMIN]),
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

      // Log the user update event
      await EventLoggerService.logEvent({
        event_type: "USER",
        user_id: req.user.id,
        username: req.user.username,
        target_type: "user",
        target_id: id,
        action: "update",
        details: { email, role, isActive, isLocked },
        ip_address: req.ip,
        user_agent: req.get("User-Agent"),
        severity: "MEDIUM",
      })

      // Remove password hash from response
      const { passwordHash, ...userResponse } = user

      res.json({
        success: true,
        message: "User updated successfully",
        data: userResponse,
      })
    } catch (error) {
      console.error("Error updating user:", error)
      res.status(500).json({
        success: false,
        message: "Failed to update user",
      })
    }
  }
)

// Unlock user account (Admin only)
router.post("/users/:id/unlock", authenticateToken, requireRole([UserRole.ADMIN]), async (req: AuthenticatedRequest, res) => {
  try {
    const { id } = req.params

    // Get user details for logging
    const user = await UserModel.findById(id)
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      })
    }

    // Unlock the account and reset failed login attempts
    const result = await pool.query(
      `
      UPDATE users 
      SET is_locked = false, failed_login_attempts = 0, updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
      RETURNING username, is_locked, failed_login_attempts
    `,
      [id]
    )

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      })
    }

    // Log the unlock event
    await EventLoggerService.logEvent({
      event_type: "SECURITY",
      user_id: req.user.id,
      username: req.user.username,
      target_type: "user",
      target_id: id,
      action: "unlock_account",
      details: { 
        target_username: user.username,
        previous_attempts: user.failedLoginAttempts,
        previous_locked: user.isLocked
      },
      ip_address: req.ip,
      user_agent: req.get("User-Agent"),
      severity: "HIGH",
    })

    res.json({
      success: true,
      message: "Account unlocked successfully",
      data: {
        username: result.rows[0].username,
        is_locked: result.rows[0].is_locked,
        failed_login_attempts: result.rows[0].failed_login_attempts,
      },
    })
  } catch (error) {
    console.error("Error unlocking account:", error)
    res.status(500).json({
      success: false,
      message: "Failed to unlock account",
    })
  }
})

// Reset user password (Admin only)
router.post("/users/:id/reset-password", authenticateToken, requireRole([UserRole.ADMIN]), async (req: AuthenticatedRequest, res) => {
  try {
    const { id } = req.params

    // Get user details for logging
    const user = await UserModel.findById(id)
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      })
    }

    // Generate new temporary password
    const tempPassword = Math.random().toString(36).slice(-8)
    const hashedPassword = await bcrypt.hash(tempPassword, 10)

    const result = await pool.query(
      `
      UPDATE users 
      SET password_hash = $1, failed_login_attempts = 0, is_locked = false, updated_at = $2
      WHERE id = $3
      RETURNING username
    `,
      [hashedPassword, new Date(), id]
    )

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      })
    }

    // Log the password reset event
    await EventLoggerService.logEvent({
      event_type: "SECURITY",
      user_id: req.user.id,
      username: req.user.username,
      target_type: "user",
      target_id: id,
      action: "reset_password",
      details: { 
        target_username: user.username,
        previous_attempts: user.failedLoginAttempts,
        previous_locked: user.isLocked,
        temp_password_length: tempPassword.length
      },
      ip_address: req.ip,
      user_agent: req.get("User-Agent"),
      severity: "CRITICAL",
    })

    res.json({
      success: true,
      message: "Password reset successfully",
      data: {
        temp_password: tempPassword,
        username: result.rows[0].username,
      },
    })
  } catch (error) {
    console.error("Error resetting password:", error)
    res.status(500).json({
      success: false,
      message: "Failed to reset password",
    })
  }
})

// Get dashboard data (Admin only)
router.get("/dashboard", authenticateToken, requireRole([UserRole.ADMIN]), async (req: AuthenticatedRequest, res) => {
  try {
    // Get basic statistics
    const statsQuery = `
      SELECT 
        (SELECT COUNT(*) FROM patients) as total_patients,
        (SELECT COUNT(*) FROM visits WHERE DATE(created_at) = CURRENT_DATE) as today_visits,
        (SELECT COUNT(*) FROM users WHERE is_active = true) as active_users,
        (SELECT COALESCE(SUM(amount), 0) FROM payments WHERE DATE(created_at) = CURRENT_DATE) as today_revenue,
        (SELECT COUNT(*) FROM inventory_items WHERE stock_quantity <= reorder_level) as low_stock_items,
        (SELECT COUNT(*) FROM sha_claims WHERE status = 'PENDING') as pending_claims
    `
    
    const statsResult = await pool.query(statsQuery)
    const stats = statsResult.rows[0]

    // Get recent audit logs
    const auditQuery = `
      SELECT 
        al.id, al.action, al.target_type, al.details, al.created_at,
        u.username
      FROM audit_logs al
      LEFT JOIN users u ON al.user_id = u.id
      ORDER BY al.created_at DESC
      LIMIT 10
    `
    
    const auditResult = await pool.query(auditQuery)
    const recent_audit_logs = auditResult.rows

    res.json({
      success: true,
      data: {
        total_patients: parseInt(stats.total_patients),
        today_visits: parseInt(stats.today_visits),
        active_users: parseInt(stats.active_users),
        today_revenue: parseFloat(stats.today_revenue),
        low_stock_items: parseInt(stats.low_stock_items),
        pending_claims: parseInt(stats.pending_claims),
        recent_audit_logs,
      },
    })
  } catch (error) {
    console.error("Error fetching dashboard data:", error)
    res.status(500).json({
      success: false,
      message: "Failed to fetch dashboard data",
    })
  }
})

export default router