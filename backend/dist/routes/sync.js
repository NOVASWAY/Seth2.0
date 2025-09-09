"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const express_validator_1 = require("express-validator");
const auth_1 = require("../middleware/auth");
const types_1 = require("../types");
const WebSocketService_1 = require("../services/WebSocketService");
const EventLoggerService_1 = require("../services/EventLoggerService");
const UserPresence_1 = require("../models/UserPresence");
const Notification_1 = require("../models/Notification");
const database_1 = require("../config/database");
const router = express_1.default.Router();
router.get("/stats", (0, auth_1.authorize)([types_1.UserRole.ADMIN, types_1.UserRole.CLINICAL_OFFICER, types_1.UserRole.NURSE, types_1.UserRole.PHARMACIST, types_1.UserRole.CASHIER, types_1.UserRole.RECEPTIONIST]), async (req, res) => {
    try {
        const connectedUsers = await UserPresence_1.UserPresenceModel.getActiveUsers();
        const recentSyncEvents = await EventLoggerService_1.EventLoggerService.getRecentEvents(24);
        const unreadNotifications = await Notification_1.NotificationModel.getUnreadCount(req.user.id);
        const dbStatus = await checkDatabaseConnection();
        const wsService = (0, WebSocketService_1.getWebSocketService)();
        const wsStatus = wsService ? 'connected' : 'disconnected';
        const stats = {
            connectedUsers: connectedUsers.length,
            activeUsers: connectedUsers.filter(u => u.status === 'online').length,
            recentSyncEvents: recentSyncEvents.length,
            pendingNotifications: unreadNotifications,
            databaseStatus: dbStatus,
            websocketStatus: wsStatus,
            lastUpdated: new Date().toISOString()
        };
        res.json({
            success: true,
            message: "Sync statistics retrieved successfully",
            data: stats
        });
    }
    catch (error) {
        console.error("Error fetching sync stats:", error);
        res.status(500).json({
            success: false,
            message: error.message || "Failed to fetch sync statistics"
        });
    }
});
router.get("/health", (0, auth_1.authorize)([types_1.UserRole.ADMIN, types_1.UserRole.CLINICAL_OFFICER, types_1.UserRole.NURSE, types_1.UserRole.PHARMACIST, types_1.UserRole.CASHIER, types_1.UserRole.RECEPTIONIST]), async (req, res) => {
    try {
        const health = {
            status: 'healthy',
            timestamp: new Date().toISOString(),
            services: {
                database: await checkDatabaseConnection(),
                websocket: (0, WebSocketService_1.getWebSocketService)() ? 'connected' : 'disconnected',
                api: 'healthy'
            },
            uptime: process.uptime(),
            environment: process.env.NODE_ENV || 'development',
            version: '1.0.0'
        };
        res.json(health);
    }
    catch (error) {
        console.error("Error checking system health:", error);
        res.status(500).json({
            status: 'unhealthy',
            timestamp: new Date().toISOString(),
            error: error.message || "Health check failed"
        });
    }
});
router.get("/users", (0, auth_1.authorize)([types_1.UserRole.ADMIN, types_1.UserRole.CLINICAL_OFFICER, types_1.UserRole.NURSE, types_1.UserRole.PHARMACIST, types_1.UserRole.CASHIER, types_1.UserRole.RECEPTIONIST]), async (req, res) => {
    try {
        const users = await UserPresence_1.UserPresenceModel.getActiveUsers();
        res.json({
            success: true,
            message: "Connected users retrieved successfully",
            data: users
        });
    }
    catch (error) {
        console.error("Error fetching connected users:", error);
        res.status(500).json({
            success: false,
            message: error.message || "Failed to fetch connected users"
        });
    }
});
router.get("/events", (0, auth_1.authorize)([types_1.UserRole.ADMIN, types_1.UserRole.CLINICAL_OFFICER, types_1.UserRole.NURSE, types_1.UserRole.PHARMACIST, types_1.UserRole.CASHIER, types_1.UserRole.RECEPTIONIST]), [
    (0, express_validator_1.query)("limit").optional().isInt({ min: 1, max: 100 }),
    (0, express_validator_1.query)("hours").optional().isInt({ min: 1, max: 168 })
], async (req, res) => {
    try {
        const errors = (0, express_validator_1.validationResult)(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                message: "Validation failed",
                errors: errors.array()
            });
        }
        const limit = parseInt(req.query.limit) || 50;
        const hours = parseInt(req.query.hours) || 24;
        const events = await EventLoggerService_1.EventLoggerService.getRecentEvents(hours, limit);
        res.json({
            success: true,
            message: "Sync events retrieved successfully",
            data: events
        });
    }
    catch (error) {
        console.error("Error fetching sync events:", error);
        res.status(500).json({
            success: false,
            message: error.message || "Failed to fetch sync events"
        });
    }
});
router.get("/notifications", (0, auth_1.authorize)([types_1.UserRole.ADMIN, types_1.UserRole.CLINICAL_OFFICER, types_1.UserRole.NURSE, types_1.UserRole.PHARMACIST, types_1.UserRole.CASHIER, types_1.UserRole.RECEPTIONIST]), [
    (0, express_validator_1.query)("limit").optional().isInt({ min: 1, max: 100 }),
    (0, express_validator_1.query)("unread_only").optional().isBoolean()
], async (req, res) => {
    try {
        const errors = (0, express_validator_1.validationResult)(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                message: "Validation failed",
                errors: errors.array()
            });
        }
        const limit = parseInt(req.query.limit) || 50;
        const unreadOnly = req.query.unread_only === 'true';
        const notifications = await Notification_1.NotificationModel.getUserNotifications(req.user.id, { limit, unreadOnly });
        res.json({
            success: true,
            message: "Notifications retrieved successfully",
            data: notifications
        });
    }
    catch (error) {
        console.error("Error fetching notifications:", error);
        res.status(500).json({
            success: false,
            message: error.message || "Failed to fetch notifications"
        });
    }
});
async function checkDatabaseConnection() {
    try {
        await database_1.db.query('SELECT 1');
        return 'connected';
    }
    catch (error) {
        console.error('Database connection check failed:', error);
        return 'disconnected';
    }
}
exports.default = router;
//# sourceMappingURL=sync.js.map