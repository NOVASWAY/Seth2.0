"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const express_validator_1 = require("express-validator");
const Notification_1 = require("../models/Notification");
const auth_1 = require("../middleware/auth");
const types_1 = require("../types");
const WebSocketService_1 = require("../services/WebSocketService");
const router = express_1.default.Router();
router.get("/", (0, auth_1.authorize)([types_1.UserRole.ADMIN, types_1.UserRole.CLINICAL_OFFICER, types_1.UserRole.NURSE, types_1.UserRole.PHARMACIST, types_1.UserRole.CASHIER, types_1.UserRole.RECEPTIONIST]), [
    (0, express_validator_1.query)("is_read").optional().isBoolean(),
    (0, express_validator_1.query)("type").optional().isIn(["patient_assignment", "prescription_update", "lab_result", "payment_received", "visit_update", "system_alert", "sync_event"]),
    (0, express_validator_1.query)("priority").optional().isIn(["low", "medium", "high", "urgent"]),
    (0, express_validator_1.query)("limit").optional().isInt({ min: 1, max: 1000 }),
    (0, express_validator_1.query)("offset").optional().isInt({ min: 0 }),
], async (req, res) => {
    try {
        const errors = (0, express_validator_1.validationResult)(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                message: "Validation failed",
                errors: errors.array(),
            });
        }
        const filters = {
            is_read: req.query.is_read === 'true' ? true : req.query.is_read === 'false' ? false : undefined,
            type: req.query.type,
            priority: req.query.priority,
            limit: req.query.limit ? parseInt(req.query.limit) : 50,
            offset: req.query.offset ? parseInt(req.query.offset) : 0,
        };
        const result = await Notification_1.NotificationModel.findByUserId(req.user.id, filters);
        res.json({
            success: true,
            data: result.notifications,
            pagination: {
                total: result.total,
                limit: filters.limit,
                offset: filters.offset,
                has_more: result.notifications.length === filters.limit,
            },
        });
    }
    catch (error) {
        console.error("Error fetching notifications:", error);
        res.status(500).json({
            success: false,
            message: "Failed to fetch notifications",
        });
    }
});
router.get("/stats", (0, auth_1.authorize)([types_1.UserRole.ADMIN, types_1.UserRole.CLINICAL_OFFICER, types_1.UserRole.NURSE, types_1.UserRole.PHARMACIST, types_1.UserRole.CASHIER, types_1.UserRole.RECEPTIONIST]), async (req, res) => {
    try {
        const stats = await Notification_1.NotificationModel.getNotificationStats(req.user.id);
        res.json({
            success: true,
            data: stats,
        });
    }
    catch (error) {
        console.error("Error fetching notification stats:", error);
        res.status(500).json({
            success: false,
            message: "Failed to fetch notification statistics",
        });
    }
});
router.get("/:id", (0, auth_1.authorize)([types_1.UserRole.ADMIN, types_1.UserRole.CLINICAL_OFFICER, types_1.UserRole.NURSE, types_1.UserRole.PHARMACIST, types_1.UserRole.CASHIER, types_1.UserRole.RECEPTIONIST]), async (req, res) => {
    try {
        const { id } = req.params;
        const notification = await Notification_1.NotificationModel.findById(id);
        if (!notification) {
            return res.status(404).json({
                success: false,
                message: "Notification not found",
            });
        }
        if (notification.user_id !== req.user.id && req.user.role !== types_1.UserRole.ADMIN) {
            return res.status(403).json({
                success: false,
                message: "Access denied",
            });
        }
        res.json({
            success: true,
            data: notification,
        });
    }
    catch (error) {
        console.error("Error fetching notification:", error);
        res.status(500).json({
            success: false,
            message: "Failed to fetch notification",
        });
    }
});
router.patch("/:id/read", (0, auth_1.authorize)([types_1.UserRole.ADMIN, types_1.UserRole.CLINICAL_OFFICER, types_1.UserRole.NURSE, types_1.UserRole.PHARMACIST, types_1.UserRole.CASHIER, types_1.UserRole.RECEPTIONIST]), async (req, res) => {
    try {
        const { id } = req.params;
        const notification = await Notification_1.NotificationModel.findById(id);
        if (!notification) {
            return res.status(404).json({
                success: false,
                message: "Notification not found",
            });
        }
        if (notification.user_id !== req.user.id && req.user.role !== types_1.UserRole.ADMIN) {
            return res.status(403).json({
                success: false,
                message: "Access denied",
            });
        }
        const updatedNotification = await Notification_1.NotificationModel.markAsRead(id);
        res.json({
            success: true,
            message: "Notification marked as read",
            data: updatedNotification,
        });
    }
    catch (error) {
        console.error("Error marking notification as read:", error);
        res.status(500).json({
            success: false,
            message: "Failed to mark notification as read",
        });
    }
});
router.patch("/read-all", (0, auth_1.authorize)([types_1.UserRole.ADMIN, types_1.UserRole.CLINICAL_OFFICER, types_1.UserRole.NURSE, types_1.UserRole.PHARMACIST, types_1.UserRole.CASHIER, types_1.UserRole.RECEPTIONIST]), async (req, res) => {
    try {
        const count = await Notification_1.NotificationModel.markAllAsRead(req.user.id);
        res.json({
            success: true,
            message: `${count} notifications marked as read`,
            data: { count },
        });
    }
    catch (error) {
        console.error("Error marking all notifications as read:", error);
        res.status(500).json({
            success: false,
            message: "Failed to mark all notifications as read",
        });
    }
});
router.delete("/:id", (0, auth_1.authorize)([types_1.UserRole.ADMIN, types_1.UserRole.CLINICAL_OFFICER, types_1.UserRole.NURSE, types_1.UserRole.PHARMACIST, types_1.UserRole.CASHIER, types_1.UserRole.RECEPTIONIST]), async (req, res) => {
    try {
        const { id } = req.params;
        const notification = await Notification_1.NotificationModel.findById(id);
        if (!notification) {
            return res.status(404).json({
                success: false,
                message: "Notification not found",
            });
        }
        if (notification.user_id !== req.user.id && req.user.role !== types_1.UserRole.ADMIN) {
            return res.status(403).json({
                success: false,
                message: "Access denied",
            });
        }
        const deleted = await Notification_1.NotificationModel.delete(id);
        if (!deleted) {
            return res.status(404).json({
                success: false,
                message: "Notification not found",
            });
        }
        res.json({
            success: true,
            message: "Notification deleted successfully",
        });
    }
    catch (error) {
        console.error("Error deleting notification:", error);
        res.status(500).json({
            success: false,
            message: "Failed to delete notification",
        });
    }
});
router.post("/", (0, auth_1.authorize)([types_1.UserRole.ADMIN]), async (req, res) => {
    try {
        const { user_id, type, title, message, data, priority } = req.body;
        const notification = await Notification_1.NotificationModel.create({
            user_id,
            type,
            title,
            message,
            data,
            priority: priority || 'medium'
        });
        const wsService = (0, WebSocketService_1.getWebSocketService)();
        if (wsService) {
            wsService.notifyUser(user_id, {
                type,
                title,
                message,
                data,
                priority: priority || 'medium'
            });
        }
        res.status(201).json({
            success: true,
            message: "Notification created successfully",
            data: notification,
        });
    }
    catch (error) {
        console.error("Error creating notification:", error);
        res.status(500).json({
            success: false,
            message: error.message || "Failed to create notification",
        });
    }
});
router.delete("/cleanup/old", (0, auth_1.authorize)([types_1.UserRole.ADMIN]), async (req, res) => {
    try {
        const { daysOld = 30 } = req.body;
        const count = await Notification_1.NotificationModel.deleteOldNotifications(daysOld);
        res.json({
            success: true,
            message: `${count} old notifications deleted`,
            data: { count },
        });
    }
    catch (error) {
        console.error("Error cleaning up old notifications:", error);
        res.status(500).json({
            success: false,
            message: "Failed to cleanup old notifications",
        });
    }
});
exports.default = router;
//# sourceMappingURL=notifications.js.map