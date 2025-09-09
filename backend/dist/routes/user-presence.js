"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const express_validator_1 = require("express-validator");
const UserPresence_1 = require("../models/UserPresence");
const auth_1 = require("../middleware/auth");
const types_1 = require("../types");
const WebSocketService_1 = require("../services/WebSocketService");
const router = express_1.default.Router();
router.get("/me", (0, auth_1.authorize)([types_1.UserRole.ADMIN, types_1.UserRole.CLINICAL_OFFICER, types_1.UserRole.NURSE, types_1.UserRole.PHARMACIST, types_1.UserRole.CASHIER, types_1.UserRole.RECEPTIONIST]), async (req, res) => {
    try {
        const presence = await UserPresence_1.UserPresenceModel.findByUserId(req.user.id);
        if (!presence) {
            const newPresence = await UserPresence_1.UserPresenceModel.createOrUpdate(req.user.id, {
                status: 'online'
            });
            return res.json({
                success: true,
                data: newPresence,
            });
        }
        res.json({
            success: true,
            data: presence,
        });
    }
    catch (error) {
        console.error("Error fetching user presence:", error);
        res.status(500).json({
            success: false,
            message: "Failed to fetch user presence",
        });
    }
});
router.patch("/me", (0, auth_1.authorize)([types_1.UserRole.ADMIN, types_1.UserRole.CLINICAL_OFFICER, types_1.UserRole.NURSE, types_1.UserRole.PHARMACIST, types_1.UserRole.CASHIER, types_1.UserRole.RECEPTIONIST]), [
    (0, express_validator_1.body)("status").optional().isIn(["online", "away", "busy", "offline"]),
    (0, express_validator_1.body)("current_page").optional().isString(),
    (0, express_validator_1.body)("current_activity").optional().isString(),
    (0, express_validator_1.body)("is_typing").optional().isBoolean(),
    (0, express_validator_1.body)("typing_entity_id").optional().isString(),
    (0, express_validator_1.body)("typing_entity_type").optional().isString(),
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
        const presence = await UserPresence_1.UserPresenceModel.createOrUpdate(req.user.id, req.body);
        const wsService = (0, WebSocketService_1.getWebSocketService)();
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
            });
        }
        res.json({
            success: true,
            message: "Presence updated successfully",
            data: presence,
        });
    }
    catch (error) {
        console.error("Error updating user presence:", error);
        res.status(500).json({
            success: false,
            message: "Failed to update user presence",
        });
    }
});
router.get("/active", (0, auth_1.authorize)([types_1.UserRole.ADMIN, types_1.UserRole.CLINICAL_OFFICER, types_1.UserRole.NURSE, types_1.UserRole.PHARMACIST, types_1.UserRole.CASHIER, types_1.UserRole.RECEPTIONIST]), [
    (0, express_validator_1.query)("status").optional().isIn(["online", "away", "busy", "offline"]),
    (0, express_validator_1.query)("role").optional().isString(),
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
            status: req.query.status,
            role: req.query.role,
            limit: req.query.limit ? parseInt(req.query.limit) : 50,
            offset: req.query.offset ? parseInt(req.query.offset) : 0,
        };
        const result = await UserPresence_1.UserPresenceModel.findAllActive(filters);
        res.json({
            success: true,
            data: result.presences,
            pagination: {
                total: result.total,
                limit: filters.limit,
                offset: filters.offset,
                has_more: result.presences.length === filters.limit,
            },
        });
    }
    catch (error) {
        console.error("Error fetching active users:", error);
        res.status(500).json({
            success: false,
            message: "Failed to fetch active users",
        });
    }
});
router.get("/online", (0, auth_1.authorize)([types_1.UserRole.ADMIN, types_1.UserRole.CLINICAL_OFFICER, types_1.UserRole.NURSE, types_1.UserRole.PHARMACIST, types_1.UserRole.CASHIER, types_1.UserRole.RECEPTIONIST]), async (req, res) => {
    try {
        const onlineUsers = await UserPresence_1.UserPresenceModel.getOnlineUsers();
        res.json({
            success: true,
            data: onlineUsers,
        });
    }
    catch (error) {
        console.error("Error fetching online users:", error);
        res.status(500).json({
            success: false,
            message: "Failed to fetch online users",
        });
    }
});
router.get("/activity/:activity", (0, auth_1.authorize)([types_1.UserRole.ADMIN, types_1.UserRole.CLINICAL_OFFICER, types_1.UserRole.NURSE, types_1.UserRole.PHARMACIST, types_1.UserRole.CASHIER, types_1.UserRole.RECEPTIONIST]), async (req, res) => {
    try {
        const { activity } = req.params;
        const users = await UserPresence_1.UserPresenceModel.getUsersByActivity(activity);
        res.json({
            success: true,
            data: users,
        });
    }
    catch (error) {
        console.error("Error fetching users by activity:", error);
        res.status(500).json({
            success: false,
            message: "Failed to fetch users by activity",
        });
    }
});
router.get("/typing/:entityType/:entityId", (0, auth_1.authorize)([types_1.UserRole.ADMIN, types_1.UserRole.CLINICAL_OFFICER, types_1.UserRole.NURSE, types_1.UserRole.PHARMACIST, types_1.UserRole.CASHIER, types_1.UserRole.RECEPTIONIST]), async (req, res) => {
    try {
        const { entityType, entityId } = req.params;
        const typingUsers = await UserPresence_1.UserPresenceModel.getTypingUsers(entityId, entityType);
        res.json({
            success: true,
            data: typingUsers,
        });
    }
    catch (error) {
        console.error("Error fetching typing users:", error);
        res.status(500).json({
            success: false,
            message: "Failed to fetch typing users",
        });
    }
});
router.patch("/me/last-seen", (0, auth_1.authorize)([types_1.UserRole.ADMIN, types_1.UserRole.CLINICAL_OFFICER, types_1.UserRole.NURSE, types_1.UserRole.PHARMACIST, types_1.UserRole.CASHIER, types_1.UserRole.RECEPTIONIST]), async (req, res) => {
    try {
        await UserPresence_1.UserPresenceModel.updateLastSeen(req.user.id);
        res.json({
            success: true,
            message: "Last seen updated successfully",
        });
    }
    catch (error) {
        console.error("Error updating last seen:", error);
        res.status(500).json({
            success: false,
            message: "Failed to update last seen",
        });
    }
});
router.patch("/me/offline", (0, auth_1.authorize)([types_1.UserRole.ADMIN, types_1.UserRole.CLINICAL_OFFICER, types_1.UserRole.NURSE, types_1.UserRole.PHARMACIST, types_1.UserRole.CASHIER, types_1.UserRole.RECEPTIONIST]), async (req, res) => {
    try {
        await UserPresence_1.UserPresenceModel.setOffline(req.user.id);
        const wsService = (0, WebSocketService_1.getWebSocketService)();
        if (wsService) {
            wsService.getIO().emit('user_offline', {
                userId: req.user.id,
                username: req.user.username,
                role: req.user.role,
                timestamp: new Date()
            });
        }
        res.json({
            success: true,
            message: "User set as offline",
        });
    }
    catch (error) {
        console.error("Error setting user offline:", error);
        res.status(500).json({
            success: false,
            message: "Failed to set user offline",
        });
    }
});
router.delete("/cleanup", (0, auth_1.authorize)([types_1.UserRole.ADMIN]), async (req, res) => {
    try {
        const { minutesOld = 30 } = req.body;
        const count = await UserPresence_1.UserPresenceModel.cleanupOldPresence(minutesOld);
        res.json({
            success: true,
            message: `${count} old presence records cleaned up`,
            data: { count },
        });
    }
    catch (error) {
        console.error("Error cleaning up old presence records:", error);
        res.status(500).json({
            success: false,
            message: "Failed to cleanup old presence records",
        });
    }
});
exports.default = router;
//# sourceMappingURL=user-presence.js.map