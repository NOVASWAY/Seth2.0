"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const express_validator_1 = require("express-validator");
const User_1 = require("../models/User");
const auth_1 = require("../middleware/auth");
const types_1 = require("../types");
const bcrypt_1 = __importDefault(require("bcrypt"));
const AuditLog_1 = require("../models/AuditLog");
const router = express_1.default.Router();
router.get("/staff", (0, auth_1.authorize)([types_1.UserRole.ADMIN]), async (req, res) => {
    try {
        const result = await User_1.UserModel.findAll();
        const staff = result.users;
        const stats = {
            total: staff.length,
            active: staff.filter(u => u.isActive && !u.isLocked).length,
            locked: staff.filter(u => u.isLocked).length,
            inactive: staff.filter(u => !u.isActive).length,
            recentLogins: staff.filter(u => {
                if (!u.lastLoginAt)
                    return false;
                const oneWeekAgo = new Date();
                oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
                return new Date(u.lastLoginAt) > oneWeekAgo;
            }).length
        };
        const safeStaff = staff.map(user => ({
            id: user.id,
            username: user.username,
            email: user.email,
            firstName: user.username,
            lastName: '',
            role: user.role,
            isActive: user.isActive,
            isLocked: user.isLocked,
            failedLoginAttempts: user.failedLoginAttempts,
            lastLoginAt: user.lastLoginAt,
            createdAt: user.createdAt,
            updatedAt: user.updatedAt,
            lastFailedLoginAt: null
        }));
        res.json({
            success: true,
            data: {
                staff: safeStaff,
                stats
            }
        });
    }
    catch (error) {
        console.error('Error fetching staff:', error);
        res.status(500).json({
            success: false,
            message: "Failed to fetch staff data"
        });
    }
});
router.post("/staff/:userId/unlock", (0, auth_1.authorize)([types_1.UserRole.ADMIN]), async (req, res) => {
    try {
        const { userId } = req.params;
        const adminId = req.user?.id;
        const user = await User_1.UserModel.findById(userId);
        if (!user) {
            return res.status(404).json({
                success: false,
                message: "User not found"
            });
        }
        await User_1.UserModel.update(userId, {
            isLocked: false,
            failedLoginAttempts: 0,
            lastFailedLoginAt: null
        });
        await AuditLog_1.AuditLogModel.create({
            userId: adminId,
            action: 'UNLOCK_USER',
            resource: 'USER',
            resourceId: userId,
            details: `Unlocked user account: ${user.username}`,
            ipAddress: req.ip,
            userAgent: req.get('User-Agent')
        });
        res.json({
            success: true,
            message: "User account unlocked successfully"
        });
    }
    catch (error) {
        console.error('Error unlocking user:', error);
        res.status(500).json({
            success: false,
            message: "Failed to unlock user account"
        });
    }
});
router.post("/staff/:userId/toggle-status", (0, auth_1.authorize)([types_1.UserRole.ADMIN]), [
    (0, express_validator_1.body)("isActive").isBoolean().withMessage("isActive must be a boolean")
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
        const { userId } = req.params;
        const { isActive } = req.body;
        const adminId = req.user?.id;
        const user = await User_1.UserModel.findById(userId);
        if (!user) {
            return res.status(404).json({
                success: false,
                message: "User not found"
            });
        }
        if (userId === adminId && !isActive) {
            return res.status(400).json({
                success: false,
                message: "You cannot deactivate your own account"
            });
        }
        await User_1.UserModel.update(userId, { isActive });
        await AuditLog_1.AuditLogModel.create({
            userId: adminId,
            action: isActive ? 'ACTIVATE_USER' : 'DEACTIVATE_USER',
            resource: 'USER',
            resourceId: userId,
            details: `${isActive ? 'Activated' : 'Deactivated'} user account: ${user.username}`,
            ipAddress: req.ip,
            userAgent: req.get('User-Agent')
        });
        res.json({
            success: true,
            message: `User account ${isActive ? 'activated' : 'deactivated'} successfully`
        });
    }
    catch (error) {
        console.error('Error updating user status:', error);
        res.status(500).json({
            success: false,
            message: "Failed to update user status"
        });
    }
});
router.post("/staff/:userId/reset-password", (0, auth_1.authorize)([types_1.UserRole.ADMIN]), async (req, res) => {
    try {
        const { userId } = req.params;
        const adminId = req.user?.id;
        const user = await User_1.UserModel.findById(userId);
        if (!user) {
            return res.status(404).json({
                success: false,
                message: "User not found"
            });
        }
        const tempPassword = Math.random().toString(36).slice(-8) + Math.random().toString(36).slice(-8);
        const hashedPassword = await bcrypt_1.default.hash(tempPassword, 10);
        await User_1.UserModel.update(userId, {
            passwordHash: hashedPassword,
            isLocked: false,
            failedLoginAttempts: 0,
            lastFailedLoginAt: null
        });
        await AuditLog_1.AuditLogModel.create({
            userId: adminId,
            action: 'RESET_PASSWORD',
            resource: 'USER',
            resourceId: userId,
            details: `Reset password for user: ${user.username}`,
            ipAddress: req.ip,
            userAgent: req.get('User-Agent')
        });
        res.json({
            success: true,
            message: "Password reset successfully",
            data: {
                tempPassword,
                username: user.username
            }
        });
    }
    catch (error) {
        console.error('Error resetting password:', error);
        res.status(500).json({
            success: false,
            message: "Failed to reset password"
        });
    }
});
router.get("/staff/:userId/credentials", (0, auth_1.authorize)([types_1.UserRole.ADMIN]), async (req, res) => {
    try {
        const { userId } = req.params;
        const adminId = req.user?.id;
        const user = await User_1.UserModel.findById(userId);
        if (!user) {
            return res.status(404).json({
                success: false,
                message: "User not found"
            });
        }
        await AuditLog_1.AuditLogModel.create({
            userId: adminId,
            action: 'VIEW_CREDENTIALS',
            resource: 'USER',
            resourceId: userId,
            details: `Viewed credentials for user: ${user.username}`,
            ipAddress: req.ip,
            userAgent: req.get('User-Agent')
        });
        res.json({
            success: true,
            data: {
                id: user.id,
                username: user.username,
                email: user.email,
                firstName: user.username,
                lastName: '',
                role: user.role,
                isActive: user.isActive,
                isLocked: user.isLocked,
                failedLoginAttempts: user.failedLoginAttempts,
                lastLoginAt: user.lastLoginAt,
                lastFailedLoginAt: null,
                createdAt: user.createdAt,
                updatedAt: user.updatedAt
            }
        });
    }
    catch (error) {
        console.error('Error fetching user credentials:', error);
        res.status(500).json({
            success: false,
            message: "Failed to fetch user credentials"
        });
    }
});
router.get("/audit-logs", (0, auth_1.authorize)([types_1.UserRole.ADMIN]), async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 50;
        const offset = (page - 1) * limit;
        const logs = await AuditLog_1.AuditLogModel.findAll(limit, offset);
        const total = await AuditLog_1.AuditLogModel.count();
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
        });
    }
    catch (error) {
        console.error('Error fetching audit logs:', error);
        res.status(500).json({
            success: false,
            message: "Failed to fetch audit logs"
        });
    }
});
exports.default = router;
//# sourceMappingURL=admin.js.map