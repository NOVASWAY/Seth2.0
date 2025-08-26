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
const router = express_1.default.Router();
router.get("/", (0, auth_1.authorize)([types_1.UserRole.ADMIN]), [
    (0, express_validator_1.query)("page").optional().isInt({ min: 1 }).withMessage("Page must be a positive integer"),
    (0, express_validator_1.query)("limit").optional().isInt({ min: 1, max: 100 }).withMessage("Limit must be between 1 and 100"),
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
        const page = Number.parseInt(req.query.page) || 1;
        const limit = Number.parseInt(req.query.limit) || 20;
        const offset = (page - 1) * limit;
        const result = await User_1.UserModel.findAll(limit, offset);
        res.json({
            success: true,
            data: {
                users: result.users,
                pagination: {
                    page,
                    limit,
                    total: result.total,
                    totalPages: Math.ceil(result.total / limit),
                },
            },
        });
    }
    catch (error) {
        res.status(500).json({
            success: false,
            message: "Failed to fetch users",
        });
    }
});
router.post("/", (0, auth_1.authorize)([types_1.UserRole.ADMIN]), [
    (0, express_validator_1.body)("username").trim().isLength({ min: 3 }).withMessage("Username must be at least 3 characters"),
    (0, express_validator_1.body)("email").optional().isEmail().withMessage("Invalid email format"),
    (0, express_validator_1.body)("password").isLength({ min: 8 }).withMessage("Password must be at least 8 characters"),
    (0, express_validator_1.body)("role").isIn(Object.values(types_1.UserRole)).withMessage("Invalid role"),
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
        const { username, email, password, role } = req.body;
        const existingUser = await User_1.UserModel.findByUsername(username);
        if (existingUser) {
            return res.status(409).json({
                success: false,
                message: "Username already exists",
            });
        }
        const user = await User_1.UserModel.create({
            username,
            email,
            password,
            role,
        });
        const { passwordHash, ...userResponse } = user;
        res.status(201).json({
            success: true,
            message: "User created successfully",
            data: userResponse,
        });
    }
    catch (error) {
        res.status(500).json({
            success: false,
            message: "Failed to create user",
        });
    }
});
router.put("/:id", (0, auth_1.authorize)([types_1.UserRole.ADMIN]), [
    (0, express_validator_1.body)("email").optional().isEmail().withMessage("Invalid email format"),
    (0, express_validator_1.body)("role").optional().isIn(Object.values(types_1.UserRole)).withMessage("Invalid role"),
    (0, express_validator_1.body)("isActive").optional().isBoolean().withMessage("isActive must be boolean"),
    (0, express_validator_1.body)("isLocked").optional().isBoolean().withMessage("isLocked must be boolean"),
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
        const { id } = req.params;
        const { email, role, isActive, isLocked } = req.body;
        const user = await User_1.UserModel.update(id, {
            email,
            role,
            isActive,
            isLocked,
        });
        if (!user) {
            return res.status(404).json({
                success: false,
                message: "User not found",
            });
        }
        const { passwordHash, ...userResponse } = user;
        res.json({
            success: true,
            message: "User updated successfully",
            data: userResponse,
        });
    }
    catch (error) {
        res.status(500).json({
            success: false,
            message: "Failed to update user",
        });
    }
});
router.post("/:id/reset-password", (0, auth_1.authorize)([types_1.UserRole.ADMIN]), [(0, express_validator_1.body)("newPassword").isLength({ min: 8 }).withMessage("Password must be at least 8 characters")], async (req, res) => {
    try {
        const errors = (0, express_validator_1.validationResult)(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                message: "Validation failed",
                errors: errors.array(),
            });
        }
        const { id } = req.params;
        const { newPassword } = req.body;
        const user = await User_1.UserModel.findById(id);
        if (!user) {
            return res.status(404).json({
                success: false,
                message: "User not found",
            });
        }
        await User_1.UserModel.resetPassword(id, newPassword);
        res.json({
            success: true,
            message: "Password reset successfully",
        });
    }
    catch (error) {
        res.status(500).json({
            success: false,
            message: "Failed to reset password",
        });
    }
});
exports.default = router;
//# sourceMappingURL=users.js.map