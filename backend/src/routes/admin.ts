import express from "express"
import { body, validationResult } from "express-validator"
import { UserModel } from "../models/User"
import { authorize, type AuthenticatedRequest } from "../middleware/auth"
import { UserRole } from "../types"
import bcrypt from "bcrypt"
import { AuditLogModel } from "../models/AuditLog"

const router = express.Router()

// Get all staff members with statistics
router.get(
  "/staff",
  authorize([UserRole.ADMIN]),
  async (req: AuthenticatedRequest, res) => {
    try {
      const result = await UserModel.findAll()
      const staff = result.users
      
      // Calculate statistics
      const stats = {
        total: staff.length,
        active: staff.filter(u => u.isActive && !u.isLocked).length,
        locked: staff.filter(u => u.isLocked).length,
        inactive: staff.filter(u => !u.isActive).length,
        recentLogins: staff.filter(u => {
          if (!u.lastLoginAt) return false
          const oneWeekAgo = new Date()
          oneWeekAgo.setDate(oneWeekAgo.getDate() - 7)
          return new Date(u.lastLoginAt) > oneWeekAgo
        }).length
      }

      // Remove sensitive data
      const safeStaff = staff.map(user => ({
        id: user.id,
        username: user.username,
        email: user.email,
        firstName: user.username, // Use username as display name since we don't have firstName
        lastName: '', // Empty since we don't have lastName
        role: user.role,
        isActive: user.isActive,
        isLocked: user.isLocked,
        failedLoginAttempts: user.failedLoginAttempts,
        lastLoginAt: user.lastLoginAt,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
        lastFailedLoginAt: null // This field doesn't exist in the current schema
      }))

    res.json({
      success: true,
      data: {
          staff: safeStaff,
          stats
        }
    })
  } catch (error) {
      console.error('Error fetching staff:', error)
    res.status(500).json({
      success: false,
        message: "Failed to fetch staff data"
      })
    }
  }
)

// Unlock a user account
router.post(
  "/staff/:userId/unlock",
  authorize([UserRole.ADMIN]),
  async (req: AuthenticatedRequest, res) => {
    try {
      const { userId } = req.params
      const adminId = req.user?.id

      const user = await UserModel.findById(userId)
      if (!user) {
        return res.status(404).json({
          success: false,
          message: "User not found"
        })
      }

      // Unlock the account and reset failed attempts
      await UserModel.update(userId, {
        isLocked: false,
        failedLoginAttempts: 0,
        lastFailedLoginAt: null
      })

      // Log the action
      await AuditLogModel.create({
        userId: adminId!,
        action: 'UNLOCK_USER',
        resource: 'USER',
        resourceId: userId,
        details: `Unlocked user account: ${user.username}`,
        ipAddress: req.ip,
        userAgent: req.get('User-Agent')
      })

      res.json({
        success: true,
        message: "User account unlocked successfully"
      })
    } catch (error) {
      console.error('Error unlocking user:', error)
      res.status(500).json({
        success: false,
        message: "Failed to unlock user account"
      })
    }
  }
)

// Toggle user active status
router.post(
  "/staff/:userId/toggle-status",
  authorize([UserRole.ADMIN]),
  [
    body("isActive").isBoolean().withMessage("isActive must be a boolean")
  ],
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

      const { userId } = req.params
      const { isActive } = req.body
      const adminId = req.user?.id

      const user = await UserModel.findById(userId)
      if (!user) {
        return res.status(404).json({
          success: false,
          message: "User not found"
        })
      }

      // Prevent admin from deactivating themselves
      if (userId === adminId && !isActive) {
        return res.status(400).json({
          success: false,
          message: "You cannot deactivate your own account"
        })
      }

      await UserModel.update(userId, { isActive })

      // Log the action
      await AuditLogModel.create({
        userId: adminId!,
        action: isActive ? 'ACTIVATE_USER' : 'DEACTIVATE_USER',
        resource: 'USER',
        resourceId: userId,
        details: `${isActive ? 'Activated' : 'Deactivated'} user account: ${user.username}`,
        ipAddress: req.ip,
        userAgent: req.get('User-Agent')
      })

      res.json({
        success: true,
        message: `User account ${isActive ? 'activated' : 'deactivated'} successfully`
      })
    } catch (error) {
      console.error('Error updating user status:', error)
      res.status(500).json({
        success: false,
        message: "Failed to update user status"
      })
    }
  }
)

// Reset user password
router.post(
  "/staff/:userId/reset-password",
  authorize([UserRole.ADMIN]),
  async (req: AuthenticatedRequest, res) => {
    try {
      const { userId } = req.params
      const adminId = req.user?.id

      const user = await UserModel.findById(userId)
      if (!user) {
      return res.status(404).json({
        success: false,
          message: "User not found"
        })
      }

      // Generate a temporary password
      const tempPassword = Math.random().toString(36).slice(-8) + Math.random().toString(36).slice(-8)
      const hashedPassword = await bcrypt.hash(tempPassword, 10)

      // Update password and unlock account
      await UserModel.update(userId, {
        passwordHash: hashedPassword,
        isLocked: false,
        failedLoginAttempts: 0,
        lastFailedLoginAt: null
      })

      // Log the action
      await AuditLogModel.create({
        userId: adminId!,
        action: 'RESET_PASSWORD',
        resource: 'USER',
        resourceId: userId,
        details: `Reset password for user: ${user.username}`,
        ipAddress: req.ip,
        userAgent: req.get('User-Agent')
      })

    res.json({
      success: true,
        message: "Password reset successfully",
      data: {
          tempPassword, // In production, this should be sent via email
          username: user.username
        }
    })
  } catch (error) {
      console.error('Error resetting password:', error)
    res.status(500).json({
        success: false,
        message: "Failed to reset password"
      })
    }
  }
)

// Get user credentials (for admin viewing)
router.get(
  "/staff/:userId/credentials",
  authorize([UserRole.ADMIN]),
  async (req: AuthenticatedRequest, res) => {
    try {
      const { userId } = req.params
      const adminId = req.user?.id

      const user = await UserModel.findById(userId)
      if (!user) {
        return res.status(404).json({
          success: false,
          message: "User not found"
        })
      }

      // Log the action
      await AuditLogModel.create({
        userId: adminId!,
        action: 'VIEW_CREDENTIALS',
        resource: 'USER',
        resourceId: userId,
        details: `Viewed credentials for user: ${user.username}`,
        ipAddress: req.ip,
        userAgent: req.get('User-Agent')
      })

      res.json({
        success: true,
        data: {
          id: user.id,
          username: user.username,
          email: user.email,
          firstName: user.username, // Use username as display name
          lastName: '', // Empty since we don't have lastName
          role: user.role,
          isActive: user.isActive,
          isLocked: user.isLocked,
          failedLoginAttempts: user.failedLoginAttempts,
          lastLoginAt: user.lastLoginAt,
          lastFailedLoginAt: null, // This field doesn't exist in the current schema
          createdAt: user.createdAt,
          updatedAt: user.updatedAt
        }
      })
    } catch (error) {
      console.error('Error fetching user credentials:', error)
    res.status(500).json({
      success: false,
        message: "Failed to fetch user credentials"
      })
    }
  }
)

// Get audit logs for admin actions
router.get(
  "/audit-logs",
  authorize([UserRole.ADMIN]),
  async (req: AuthenticatedRequest, res) => {
    try {
      const page = parseInt(req.query.page as string) || 1
      const limit = parseInt(req.query.limit as string) || 50
      const offset = (page - 1) * limit

      const logs = await AuditLogModel.findAll(limit, offset)
      const total = await AuditLogModel.count()

    res.json({
      success: true,
        data: {
          logs,
          pagination: {
            page,
            limit,
            total,
            totalPages: Math.ceil(total / limit)
          }
        }
    })
  } catch (error) {
      console.error('Error fetching audit logs:', error)
    res.status(500).json({
      success: false,
        message: "Failed to fetch audit logs"
    })
    }
  }
)

// Generate new password for user (Admin only)
router.get(
  "/staff/:id/password",
  authorize([UserRole.ADMIN]),
  async (req: AuthenticatedRequest, res) => {
    try {
      const { id } = req.params
      
      if (!id) {
        return res.status(400).json({
          success: false,
          message: "User ID is required"
        })
      }

      const user = await UserModel.findById(id)
      if (!user) {
        return res.status(404).json({
          success: false,
          message: "User not found"
        })
      }

      // Generate a new password
      const newPassword = Math.random().toString(36).slice(-8) + Math.random().toString(36).slice(-8)
      const hashedPassword = await bcrypt.hash(newPassword, 10)

      // Update the user's password
      await UserModel.update(id, {
        passwordHash: hashedPassword,
        isLocked: false,
        failedLoginAttempts: 0,
        lastFailedLoginAt: null
      })

      // Log this sensitive action (optional - don't fail if audit logging fails)
      try {
        await AuditLogModel.create({
          userId: req.user?.id,
          action: "GENERATE_NEW_PASSWORD",
          resource: "user",
          resourceId: id,
          details: {
            targetUserId: id,
            targetUsername: user.username
          },
          ipAddress: req.ip,
          userAgent: req.get("User-Agent")
        })
      } catch (auditError) {
        console.warn("Failed to log password generation action:", auditError)
        // Continue with the main operation even if audit logging fails
      }

      res.json({
        success: true,
        message: "New password generated successfully",
        data: {
          password: newPassword, // Return the actual new password
          username: user.username,
          note: "This password has been set for the user. Please share it securely."
        }
      })
    } catch (error) {
      console.error("Error generating new password:", error)
      res.status(500).json({
        success: false,
        message: "Internal server error"
      })
    }
  }
)

export default router