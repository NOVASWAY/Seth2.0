"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const express_validator_1 = require("express-validator");
const auth_1 = require("../middleware/auth");
const EventLoggerService_1 = require("../services/EventLoggerService");
const types_1 = require("../types");
const router = express_1.default.Router();
router.get("/", auth_1.authenticateToken, (0, auth_1.requireRole)([types_1.UserRole.ADMIN]), [
    (0, express_validator_1.query)("event_type").optional().isString(),
    (0, express_validator_1.query)("user_id").optional().isUUID(),
    (0, express_validator_1.query)("target_type").optional().isString(),
    (0, express_validator_1.query)("action").optional().isString(),
    (0, express_validator_1.query)("severity").optional().isIn(["LOW", "MEDIUM", "HIGH", "CRITICAL"]),
    (0, express_validator_1.query)("start_date").optional().isISO8601(),
    (0, express_validator_1.query)("end_date").optional().isISO8601(),
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
            event_type: req.query.event_type,
            user_id: req.query.user_id,
            target_type: req.query.target_type,
            action: req.query.action,
            severity: req.query.severity,
            start_date: req.query.start_date,
            end_date: req.query.end_date,
            limit: req.query.limit ? parseInt(req.query.limit) : 50,
            offset: req.query.offset ? parseInt(req.query.offset) : 0,
        };
        const result = await EventLoggerService_1.EventLoggerService.getEvents(filters);
        res.json({
            success: true,
            data: result.events,
            pagination: {
                total: result.total,
                limit: filters.limit,
                offset: filters.offset,
                has_more: result.events.length === filters.limit,
            },
        });
    }
    catch (error) {
        console.error("Error fetching events:", error);
        res.status(500).json({
            success: false,
            message: "Failed to fetch events",
        });
    }
});
router.get("/stats", auth_1.authenticateToken, (0, auth_1.requireRole)([types_1.UserRole.ADMIN]), [
    (0, express_validator_1.query)("days").optional().isInt({ min: 1, max: 365 }),
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
        const days = req.query.days ? parseInt(req.query.days) : 30;
        const stats = await EventLoggerService_1.EventLoggerService.getEventStats(days);
        res.json({
            success: true,
            data: stats,
        });
    }
    catch (error) {
        console.error("Error fetching event stats:", error);
        res.status(500).json({
            success: false,
            message: "Failed to fetch event statistics",
        });
    }
});
router.get("/types", auth_1.authenticateToken, (0, auth_1.requireRole)([types_1.UserRole.ADMIN]), async (req, res) => {
    try {
        const eventTypes = await EventLoggerService_1.EventLoggerService.getEventTypes();
        res.json({
            success: true,
            data: eventTypes,
        });
    }
    catch (error) {
        console.error("Error fetching event types:", error);
        res.status(500).json({
            success: false,
            message: "Failed to fetch event types",
        });
    }
});
router.get("/types/:eventType/actions", auth_1.authenticateToken, (0, auth_1.requireRole)([types_1.UserRole.ADMIN]), async (req, res) => {
    try {
        const { eventType } = req.params;
        const actions = await EventLoggerService_1.EventLoggerService.getActionsForEventType(eventType);
        res.json({
            success: true,
            data: actions,
        });
    }
    catch (error) {
        console.error("Error fetching actions:", error);
        res.status(500).json({
            success: false,
            message: "Failed to fetch actions",
        });
    }
});
router.post("/cleanup", auth_1.authenticateToken, (0, auth_1.requireRole)([types_1.UserRole.ADMIN]), async (req, res) => {
    try {
        await EventLoggerService_1.EventLoggerService.cleanupOldEvents();
        res.json({
            success: true,
            message: "Event cleanup completed successfully",
        });
    }
    catch (error) {
        console.error("Error cleaning up events:", error);
        res.status(500).json({
            success: false,
            message: "Failed to cleanup old events",
        });
    }
});
router.post("/log", auth_1.authenticateToken, (0, auth_1.requireRole)([types_1.UserRole.ADMIN]), [
    (0, express_validator_1.body)("event_type").isString().notEmpty(),
    (0, express_validator_1.body)("action").isString().notEmpty(),
    (0, express_validator_1.body)("user_id").optional().isUUID(),
    (0, express_validator_1.body)("username").optional().isString(),
    (0, express_validator_1.body)("target_type").optional().isString(),
    (0, express_validator_1.body)("target_id").optional().isString(),
    (0, express_validator_1.body)("details").optional().isObject(),
    (0, express_validator_1.body)("severity").optional().isIn(["LOW", "MEDIUM", "HIGH", "CRITICAL"]),
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
        const eventData = {
            ...req.body,
            ip_address: req.ip,
            user_agent: req.get("User-Agent"),
        };
        await EventLoggerService_1.EventLoggerService.logEvent(eventData);
        res.json({
            success: true,
            message: "Event logged successfully",
        });
    }
    catch (error) {
        console.error("Error logging event:", error);
        res.status(500).json({
            success: false,
            message: "Failed to log event",
        });
    }
});
exports.default = router;
//# sourceMappingURL=events.js.map