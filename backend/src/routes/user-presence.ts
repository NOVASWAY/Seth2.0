import express from "express"
import { body, query, validationResult } from "express-validator"
import { UserPresenceModel } from "../models/UserPresence"
import { authorize, type AuthenticatedRequest } from "../middleware/auth"
import { UserRole } from "../types"
import { getWebSocketService } from "../services/WebSocketService"

const router = express.Router()

// Get current user's presence
router.get(
  "/me",
  authorize([UserRole.ADMIN, UserRole.CLINICAL_OFFICER, UserRole.NURSE, UserRole.PHARMACIST, UserRole.CASHIER, UserRole.RECEPTIONIST]),
  async (req: AuthenticatedRequest, res) => {
    try {
      const presence = await UserPresenceModel.findByUserId(req.user.id)

      if (!presence) {
        // Create initial presence record
        const newPresence = await UserPresenceModel.createOrUpdate(req.user.id, {
          status: 'online'
        })
        return res.json({
          success: true,
          data: newPresence,
        })
      }

      res.json({
        success: true,
        data: presence,
      })
    } catch (error) {
      console.error("Error fetching user presence:", error)
      res.status(500).json({
        success: false,
        message: "Failed to fetch user presence",
      })
    }
  }
)

// Update current user's presence
router.patch(
  "/me",
  authorize([UserRole.ADMIN, UserRole.CLINICAL_OFFICER, UserRole.NURSE, UserRole.PHARMACIST, UserRole.CASHIER, UserRole.RECEPTIONIST]),
  [
    body("status").optional().isIn(["online", "away", "busy", "offline"]),
    body("current_page").optional().isString(),
    body("current_activity").optional().isString(),
    body("is_typing").optional().isBoolean(),
    body("typing_entity_id").optional().isString(),
    body("typing_entity_type").optional().isString(),
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

      const presence = await UserPresenceModel.createOrUpdate(req.user.id, req.body)

      // Broadcast presence update via WebSocket
      const wsService = getWebSocketService()
      if (wsService) {
        wsService.getIO().emit('presence_update', {
          userId: req.user.id,
          username: req.user.username,
          role: req.user.role,
          status: presence.status,
          current_page: presence.current_page,
          current_activity: presence.current_activity,
          is_typing: presence.is_typing,
          typing_entity_id: presence.typing_entity_id,
          typing_entity_type: presence.typing_entity_type,
          last_seen: presence.last_seen,
          timestamp: new Date()
        })
      }

      res.json({
        success: true,
        message: "Presence updated successfully",
        data: presence,
      })
    } catch (error) {
      console.error("Error updating user presence:", error)
      res.status(500).json({
        success: false,
        message: "Failed to update user presence",
      })
    }
  }
)

// Get all active users
router.get(
  "/active",
  authorize([UserRole.ADMIN, UserRole.CLINICAL_OFFICER, UserRole.NURSE, UserRole.PHARMACIST, UserRole.CASHIER, UserRole.RECEPTIONIST]),
  [
    query("status").optional().isIn(["online", "away", "busy", "offline"]),
    query("role").optional().isString(),
    query("limit").optional().isInt({ min: 1, max: 1000 }),
    query("offset").optional().isInt({ min: 0 }),
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

      const filters = {
        status: req.query.status as string,
        role: req.query.role as string,
        limit: req.query.limit ? parseInt(req.query.limit as string) : 50,
        offset: req.query.offset ? parseInt(req.query.offset as string) : 0,
      }

      const result = await UserPresenceModel.findAllActive(filters)

      res.json({
        success: true,
        data: result.presences,
        pagination: {
          total: result.total,
          limit: filters.limit,
          offset: filters.offset,
          has_more: result.presences.length === filters.limit,
        },
      })
    } catch (error) {
      console.error("Error fetching active users:", error)
      res.status(500).json({
        success: false,
        message: "Failed to fetch active users",
      })
    }
  }
)

// Get online users
router.get(
  "/online",
  authorize([UserRole.ADMIN, UserRole.CLINICAL_OFFICER, UserRole.NURSE, UserRole.PHARMACIST, UserRole.CASHIER, UserRole.RECEPTIONIST]),
  async (req: AuthenticatedRequest, res) => {
    try {
      const onlineUsers = await UserPresenceModel.getOnlineUsers()

      res.json({
        success: true,
        data: onlineUsers,
      })
    } catch (error) {
      console.error("Error fetching online users:", error)
      res.status(500).json({
        success: false,
        message: "Failed to fetch online users",
      })
    }
  }
)

// Get users by activity
router.get(
  "/activity/:activity",
  authorize([UserRole.ADMIN, UserRole.CLINICAL_OFFICER, UserRole.NURSE, UserRole.PHARMACIST, UserRole.CASHIER, UserRole.RECEPTIONIST]),
  async (req: AuthenticatedRequest, res) => {
    try {
      const { activity } = req.params
      const users = await UserPresenceModel.getUsersByActivity(activity)

      res.json({
        success: true,
        data: users,
      })
    } catch (error) {
      console.error("Error fetching users by activity:", error)
      res.status(500).json({
        success: false,
        message: "Failed to fetch users by activity",
      })
    }
  }
)

// Get users typing in specific entity
router.get(
  "/typing/:entityType/:entityId",
  authorize([UserRole.ADMIN, UserRole.CLINICAL_OFFICER, UserRole.NURSE, UserRole.PHARMACIST, UserRole.CASHIER, UserRole.RECEPTIONIST]),
  async (req: AuthenticatedRequest, res) => {
    try {
      const { entityType, entityId } = req.params
      const typingUsers = await UserPresenceModel.getTypingUsers(entityId, entityType)

      res.json({
        success: true,
        data: typingUsers,
      })
    } catch (error) {
      console.error("Error fetching typing users:", error)
      res.status(500).json({
        success: false,
        message: "Failed to fetch typing users",
      })
    }
  }
)

// Update last seen timestamp
router.patch(
  "/me/last-seen",
  authorize([UserRole.ADMIN, UserRole.CLINICAL_OFFICER, UserRole.NURSE, UserRole.PHARMACIST, UserRole.CASHIER, UserRole.RECEPTIONIST]),
  async (req: AuthenticatedRequest, res) => {
    try {
      await UserPresenceModel.updateLastSeen(req.user.id)

      res.json({
        success: true,
        message: "Last seen updated successfully",
      })
    } catch (error) {
      console.error("Error updating last seen:", error)
      res.status(500).json({
        success: false,
        message: "Failed to update last seen",
      })
    }
  }
)

// Set user as offline
router.patch(
  "/me/offline",
  authorize([UserRole.ADMIN, UserRole.CLINICAL_OFFICER, UserRole.NURSE, UserRole.PHARMACIST, UserRole.CASHIER, UserRole.RECEPTIONIST]),
  async (req: AuthenticatedRequest, res) => {
    try {
      await UserPresenceModel.setOffline(req.user.id)

      // Broadcast offline status via WebSocket
      const wsService = getWebSocketService()
      if (wsService) {
        wsService.getIO().emit('user_offline', {
          userId: req.user.id,
          username: req.user.username,
          role: req.user.role,
          timestamp: new Date()
        })
      }

      res.json({
        success: true,
        message: "User set as offline",
      })
    } catch (error) {
      console.error("Error setting user offline:", error)
      res.status(500).json({
        success: false,
        message: "Failed to set user offline",
      })
    }
  }
)

// Cleanup old presence records (admin only)
router.delete(
  "/cleanup",
  authorize([UserRole.ADMIN]),
  async (req: AuthenticatedRequest, res) => {
    try {
      const { minutesOld = 30 } = req.body
      const count = await UserPresenceModel.cleanupOldPresence(minutesOld)

      res.json({
        success: true,
        message: `${count} old presence records cleaned up`,
        data: { count },
      })
    } catch (error) {
      console.error("Error cleaning up old presence records:", error)
      res.status(500).json({
        success: false,
        message: "Failed to cleanup old presence records",
      })
    }
  }
)

export default router
