import express from "express"
import { query, validationResult } from "express-validator"
import { authorize, type AuthenticatedRequest } from "../middleware/auth"
import { UserRole } from "../types"
import { getWebSocketService } from "../services/WebSocketService"
import { EventLoggerService } from "../services/EventLoggerService"
import { UserPresenceModel } from "../models/UserPresence"
import { NotificationModel } from "../models/Notification"
import { db } from "../config/database"

const router = express.Router()

// Get sync statistics
router.get(
  "/stats",
  authorize([UserRole.ADMIN, UserRole.CLINICAL_OFFICER, UserRole.NURSE, UserRole.PHARMACIST, UserRole.CASHIER, UserRole.RECEPTIONIST]),
  async (req: AuthenticatedRequest, res) => {
    try {
      // Get connected users count
      const connectedUsers = await UserPresenceModel.getActiveUsers()
      
      // Get recent sync events count (last 24 hours)
      const recentSyncEvents = await EventLoggerService.getRecentEvents(24)
      
      // Get unread notifications count
      const unreadNotifications = await NotificationModel.getUnreadCount(req.user.id)
      
      // Get database connection status
      const dbStatus = await checkDatabaseConnection()
      
      // Get WebSocket connection status
      const wsService = getWebSocketService()
      const wsStatus = wsService ? 'connected' : 'disconnected'
      
      const stats = {
        connectedUsers: connectedUsers.length,
        activeUsers: connectedUsers.filter(u => u.status === 'online').length,
        recentSyncEvents: recentSyncEvents.length,
        pendingNotifications: unreadNotifications,
        databaseStatus: dbStatus,
        websocketStatus: wsStatus,
        lastUpdated: new Date().toISOString()
      }

      res.json({
        success: true,
        message: "Sync statistics retrieved successfully",
        data: stats
      })
    } catch (error: any) {
      console.error("Error fetching sync stats:", error)
      res.status(500).json({
        success: false,
        message: error.message || "Failed to fetch sync statistics"
      })
    }
  }
)

// Get system health status
router.get(
  "/health",
  authorize([UserRole.ADMIN, UserRole.CLINICAL_OFFICER, UserRole.NURSE, UserRole.PHARMACIST, UserRole.CASHIER, UserRole.RECEPTIONIST]),
  async (req: AuthenticatedRequest, res) => {
    try {
      const health = {
        status: 'healthy',
        timestamp: new Date().toISOString(),
        services: {
          database: await checkDatabaseConnection(),
          websocket: getWebSocketService() ? 'connected' : 'disconnected',
          api: 'healthy'
        },
        uptime: process.uptime(),
        environment: process.env.NODE_ENV || 'development',
        version: '1.0.0'
      }

      res.json(health)
    } catch (error: any) {
      console.error("Error checking system health:", error)
      res.status(500).json({
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        error: error.message || "Health check failed"
      })
    }
  }
)

// Get connected users
router.get(
  "/users",
  authorize([UserRole.ADMIN, UserRole.CLINICAL_OFFICER, UserRole.NURSE, UserRole.PHARMACIST, UserRole.CASHIER, UserRole.RECEPTIONIST]),
  async (req: AuthenticatedRequest, res) => {
    try {
      const users = await UserPresenceModel.getActiveUsers()
      
      res.json({
        success: true,
        message: "Connected users retrieved successfully",
        data: users
      })
    } catch (error: any) {
      console.error("Error fetching connected users:", error)
      res.status(500).json({
        success: false,
        message: error.message || "Failed to fetch connected users"
      })
    }
  }
)

// Get recent sync events
router.get(
  "/events",
  authorize([UserRole.ADMIN, UserRole.CLINICAL_OFFICER, UserRole.NURSE, UserRole.PHARMACIST, UserRole.CASHIER, UserRole.RECEPTIONIST]),
  [
    query("limit").optional().isInt({ min: 1, max: 100 }),
    query("hours").optional().isInt({ min: 1, max: 168 }) // Max 1 week
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

      const limit = parseInt(req.query.limit as string) || 50
      const hours = parseInt(req.query.hours as string) || 24
      
      const events = await EventLoggerService.getRecentEvents(hours, limit)
      
      res.json({
        success: true,
        message: "Sync events retrieved successfully",
        data: events
      })
    } catch (error: any) {
      console.error("Error fetching sync events:", error)
      res.status(500).json({
        success: false,
        message: error.message || "Failed to fetch sync events"
      })
    }
  }
)

// Get user notifications
router.get(
  "/notifications",
  authorize([UserRole.ADMIN, UserRole.CLINICAL_OFFICER, UserRole.NURSE, UserRole.PHARMACIST, UserRole.CASHIER, UserRole.RECEPTIONIST]),
  [
    query("limit").optional().isInt({ min: 1, max: 100 }),
    query("unread_only").optional().isBoolean()
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

      const limit = parseInt(req.query.limit as string) || 50
      const unreadOnly = req.query.unread_only === 'true'
      
      const notifications = await NotificationModel.getUserNotifications(
        req.user.id,
        { limit, unreadOnly }
      )
      
      res.json({
        success: true,
        message: "Notifications retrieved successfully",
        data: notifications
      })
    } catch (error: any) {
      console.error("Error fetching notifications:", error)
      res.status(500).json({
        success: false,
        message: error.message || "Failed to fetch notifications"
      })
    }
  }
)

// Helper function to check database connection
async function checkDatabaseConnection(): Promise<string> {
  try {
    await db.query('SELECT 1')
    return 'connected'
  } catch (error) {
    console.error('Database connection check failed:', error)
    return 'disconnected'
  }
}

export default router
