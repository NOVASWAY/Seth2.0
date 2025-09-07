import express from "express"
import { body, query, validationResult } from "express-validator"
import { authenticateToken, requireRole } from "../middleware/auth"
import { EventLoggerService } from "../services/EventLoggerService"
import { UserRole } from "../types"
import type { AuthenticatedRequest } from "../types"

const router = express.Router()

// Get events with filtering and pagination
router.get(
  "/",
  authenticateToken,
  requireRole([UserRole.ADMIN]),
  [
    query("event_type").optional().isString(),
    query("user_id").optional().isUUID(),
    query("target_type").optional().isString(),
    query("action").optional().isString(),
    query("severity").optional().isIn(["LOW", "MEDIUM", "HIGH", "CRITICAL"]),
    query("start_date").optional().isISO8601(),
    query("end_date").optional().isISO8601(),
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
        event_type: req.query.event_type as string,
        user_id: req.query.user_id as string,
        target_type: req.query.target_type as string,
        action: req.query.action as string,
        severity: req.query.severity as string,
        start_date: req.query.start_date as string,
        end_date: req.query.end_date as string,
        limit: req.query.limit ? parseInt(req.query.limit as string) : 50,
        offset: req.query.offset ? parseInt(req.query.offset as string) : 0,
      }

      const result = await EventLoggerService.getEvents(filters)

      res.json({
        success: true,
        data: result.events,
        pagination: {
          total: result.total,
          limit: filters.limit,
          offset: filters.offset,
          has_more: result.events.length === filters.limit,
        },
      })
    } catch (error) {
      console.error("Error fetching events:", error)
      res.status(500).json({
        success: false,
        message: "Failed to fetch events",
      })
    }
  }
)

// Get event statistics
router.get(
  "/stats",
  authenticateToken,
  requireRole([UserRole.ADMIN]),
  [
    query("days").optional().isInt({ min: 1, max: 365 }),
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

      const days = req.query.days ? parseInt(req.query.days as string) : 30
      const stats = await EventLoggerService.getEventStats(days)

      res.json({
        success: true,
        data: stats,
      })
    } catch (error) {
      console.error("Error fetching event stats:", error)
      res.status(500).json({
        success: false,
        message: "Failed to fetch event statistics",
      })
    }
  }
)

// Get available event types
router.get(
  "/types",
  authenticateToken,
  requireRole([UserRole.ADMIN]),
  async (req: AuthenticatedRequest, res) => {
    try {
      const eventTypes = await EventLoggerService.getEventTypes()

      res.json({
        success: true,
        data: eventTypes,
      })
    } catch (error) {
      console.error("Error fetching event types:", error)
      res.status(500).json({
        success: false,
        message: "Failed to fetch event types",
      })
    }
  }
)

// Get available actions for an event type
router.get(
  "/types/:eventType/actions",
  authenticateToken,
  requireRole([UserRole.ADMIN]),
  async (req: AuthenticatedRequest, res) => {
    try {
      const { eventType } = req.params
      const actions = await EventLoggerService.getActionsForEventType(eventType)

      res.json({
        success: true,
        data: actions,
      })
    } catch (error) {
      console.error("Error fetching actions:", error)
      res.status(500).json({
        success: false,
        message: "Failed to fetch actions",
      })
    }
  }
)

// Clean up old events (Admin only)
router.post(
  "/cleanup",
  authenticateToken,
  requireRole([UserRole.ADMIN]),
  async (req: AuthenticatedRequest, res) => {
    try {
      await EventLoggerService.cleanupOldEvents()

      res.json({
        success: true,
        message: "Event cleanup completed successfully",
      })
    } catch (error) {
      console.error("Error cleaning up events:", error)
      res.status(500).json({
        success: false,
        message: "Failed to cleanup old events",
      })
    }
  }
)

// Log an event (for internal use)
router.post(
  "/log",
  authenticateToken,
  requireRole([UserRole.ADMIN]),
  [
    body("event_type").isString().notEmpty(),
    body("action").isString().notEmpty(),
    body("user_id").optional().isUUID(),
    body("username").optional().isString(),
    body("target_type").optional().isString(),
    body("target_id").optional().isString(),
    body("details").optional().isObject(),
    body("severity").optional().isIn(["LOW", "MEDIUM", "HIGH", "CRITICAL"]),
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

      const eventData = {
        ...req.body,
        ip_address: req.ip,
        user_agent: req.get("User-Agent"),
      }

      await EventLoggerService.logEvent(eventData)

      res.json({
        success: true,
        message: "Event logged successfully",
      })
    } catch (error) {
      console.error("Error logging event:", error)
      res.status(500).json({
        success: false,
        message: "Failed to log event",
      })
    }
  }
)

export default router
