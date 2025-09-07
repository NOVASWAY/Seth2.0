import express from "express"
import { query, validationResult } from "express-validator"
import { NotificationModel } from "../models/Notification"
import { authorize, type AuthenticatedRequest } from "../middleware/auth"
import { UserRole } from "../types"
import { getWebSocketService } from "../services/WebSocketService"

const router = express.Router()

// Get user notifications with filtering and pagination
router.get(
  "/",
  authorize([UserRole.ADMIN, UserRole.CLINICAL_OFFICER, UserRole.NURSE, UserRole.PHARMACIST, UserRole.CASHIER, UserRole.RECEPTIONIST]),
  [
    query("is_read").optional().isBoolean(),
    query("type").optional().isIn(["patient_assignment", "prescription_update", "lab_result", "payment_received", "visit_update", "system_alert", "sync_event"]),
    query("priority").optional().isIn(["low", "medium", "high", "urgent"]),
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
        is_read: req.query.is_read === 'true' ? true : req.query.is_read === 'false' ? false : undefined,
        type: req.query.type as string,
        priority: req.query.priority as string,
        limit: req.query.limit ? parseInt(req.query.limit as string) : 50,
        offset: req.query.offset ? parseInt(req.query.offset as string) : 0,
      }

      const result = await NotificationModel.findByUserId(req.user.id, filters)

      res.json({
        success: true,
        data: result.notifications,
        pagination: {
          total: result.total,
          limit: filters.limit,
          offset: filters.offset,
          has_more: result.notifications.length === filters.limit,
        },
      })
    } catch (error) {
      console.error("Error fetching notifications:", error)
      res.status(500).json({
        success: false,
        message: "Failed to fetch notifications",
      })
    }
  }
)

// Get notification statistics
router.get(
  "/stats",
  authorize([UserRole.ADMIN, UserRole.CLINICAL_OFFICER, UserRole.NURSE, UserRole.PHARMACIST, UserRole.CASHIER, UserRole.RECEPTIONIST]),
  async (req: AuthenticatedRequest, res) => {
    try {
      const stats = await NotificationModel.getNotificationStats(req.user.id)

      res.json({
        success: true,
        data: stats,
      })
    } catch (error) {
      console.error("Error fetching notification stats:", error)
      res.status(500).json({
        success: false,
        message: "Failed to fetch notification statistics",
      })
    }
  }
)

// Get notification by ID
router.get(
  "/:id",
  authorize([UserRole.ADMIN, UserRole.CLINICAL_OFFICER, UserRole.NURSE, UserRole.PHARMACIST, UserRole.CASHIER, UserRole.RECEPTIONIST]),
  async (req: AuthenticatedRequest, res) => {
    try {
      const { id } = req.params
      const notification = await NotificationModel.findById(id)

      if (!notification) {
        return res.status(404).json({
          success: false,
          message: "Notification not found",
        })
      }

      // Check if user owns this notification
      if (notification.user_id !== req.user.id && req.user.role !== UserRole.ADMIN) {
        return res.status(403).json({
          success: false,
          message: "Access denied",
        })
      }

      res.json({
        success: true,
        data: notification,
      })
    } catch (error) {
      console.error("Error fetching notification:", error)
      res.status(500).json({
        success: false,
        message: "Failed to fetch notification",
      })
    }
  }
)

// Mark notification as read
router.patch(
  "/:id/read",
  authorize([UserRole.ADMIN, UserRole.CLINICAL_OFFICER, UserRole.NURSE, UserRole.PHARMACIST, UserRole.CASHIER, UserRole.RECEPTIONIST]),
  async (req: AuthenticatedRequest, res) => {
    try {
      const { id } = req.params
      const notification = await NotificationModel.findById(id)

      if (!notification) {
        return res.status(404).json({
          success: false,
          message: "Notification not found",
        })
      }

      // Check if user owns this notification
      if (notification.user_id !== req.user.id && req.user.role !== UserRole.ADMIN) {
        return res.status(403).json({
          success: false,
          message: "Access denied",
        })
      }

      const updatedNotification = await NotificationModel.markAsRead(id)

      res.json({
        success: true,
        message: "Notification marked as read",
        data: updatedNotification,
      })
    } catch (error) {
      console.error("Error marking notification as read:", error)
      res.status(500).json({
        success: false,
        message: "Failed to mark notification as read",
      })
    }
  }
)

// Mark all notifications as read
router.patch(
  "/read-all",
  authorize([UserRole.ADMIN, UserRole.CLINICAL_OFFICER, UserRole.NURSE, UserRole.PHARMACIST, UserRole.CASHIER, UserRole.RECEPTIONIST]),
  async (req: AuthenticatedRequest, res) => {
    try {
      const count = await NotificationModel.markAllAsRead(req.user.id)

      res.json({
        success: true,
        message: `${count} notifications marked as read`,
        data: { count },
      })
    } catch (error) {
      console.error("Error marking all notifications as read:", error)
      res.status(500).json({
        success: false,
        message: "Failed to mark all notifications as read",
      })
    }
  }
)

// Delete notification
router.delete(
  "/:id",
  authorize([UserRole.ADMIN, UserRole.CLINICAL_OFFICER, UserRole.NURSE, UserRole.PHARMACIST, UserRole.CASHIER, UserRole.RECEPTIONIST]),
  async (req: AuthenticatedRequest, res) => {
    try {
      const { id } = req.params
      const notification = await NotificationModel.findById(id)

      if (!notification) {
        return res.status(404).json({
          success: false,
          message: "Notification not found",
        })
      }

      // Check if user owns this notification
      if (notification.user_id !== req.user.id && req.user.role !== UserRole.ADMIN) {
        return res.status(403).json({
          success: false,
          message: "Access denied",
        })
      }

      const deleted = await NotificationModel.delete(id)

      if (!deleted) {
        return res.status(404).json({
          success: false,
          message: "Notification not found",
        })
      }

      res.json({
        success: true,
        message: "Notification deleted successfully",
      })
    } catch (error) {
      console.error("Error deleting notification:", error)
      res.status(500).json({
        success: false,
        message: "Failed to delete notification",
      })
    }
  }
)

// Create notification (admin only)
router.post(
  "/",
  authorize([UserRole.ADMIN]),
  async (req: AuthenticatedRequest, res) => {
    try {
      const { user_id, type, title, message, data, priority } = req.body

      const notification = await NotificationModel.create({
        user_id,
        type,
        title,
        message,
        data,
        priority: priority || 'medium'
      })

      // Send real-time notification via WebSocket
      const wsService = getWebSocketService()
      if (wsService) {
        wsService.notifyUser(user_id, {
          type,
          title,
          message,
          data,
          priority: priority || 'medium'
        })
      }

      res.status(201).json({
        success: true,
        message: "Notification created successfully",
        data: notification,
      })
    } catch (error: any) {
      console.error("Error creating notification:", error)
      res.status(500).json({
        success: false,
        message: error.message || "Failed to create notification",
      })
    }
  }
)

// Cleanup old notifications (admin only)
router.delete(
  "/cleanup/old",
  authorize([UserRole.ADMIN]),
  async (req: AuthenticatedRequest, res) => {
    try {
      const { daysOld = 30 } = req.body
      const count = await NotificationModel.deleteOldNotifications(daysOld)

      res.json({
        success: true,
        message: `${count} old notifications deleted`,
        data: { count },
      })
    } catch (error) {
      console.error("Error cleaning up old notifications:", error)
      res.status(500).json({
        success: false,
        message: "Failed to cleanup old notifications",
      })
    }
  }
)

export default router
