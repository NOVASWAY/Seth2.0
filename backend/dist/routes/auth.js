"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const express_validator_1 = require("express-validator");
const AuthService_1 = require("../services/AuthService");
const auth_1 = require("../middleware/auth");
const router = express_1.default.Router();
// Login endpoint
router.post("/login", [
    (0, express_validator_1.body)("username").trim().isLength({ min: 3 }).withMessage("Username must be at least 3 characters"),
    (0, express_validator_1.body)("password").isLength({ min: 6 }).withMessage("Password must be at least 6 characters"),
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
        const { username, password } = req.body;
        const result = await AuthService_1.AuthService.login({ username, password }, req.ip, req.get("User-Agent"));
        if (!result) {
            return res.status(401).json({
                success: false,
                message: "Invalid username or password",
            });
        }
        res.json({
            success: true,
            message: "Login successful",
            data: {
                user: result.user,
                accessToken: result.tokens.accessToken,
                refreshToken: result.tokens.refreshToken,
            },
        });
    }
    catch (error) {
        res.status(400).json({
            success: false,
            message: error.message || "Login failed",
        });
    }
});
// Refresh token endpoint
router.post("/refresh", [(0, express_validator_1.body)("refreshToken").notEmpty().withMessage("Refresh token is required")], async (req, res) => {
    try {
        const errors = (0, express_validator_1.validationResult)(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                message: "Validation failed",
                errors: errors.array(),
            });
        }
        const { refreshToken } = req.body;
        const tokens = await AuthService_1.AuthService.refreshToken(refreshToken);
        if (!tokens) {
            return res.status(401).json({
                success: false,
                message: "Invalid or expired refresh token",
            });
        }
        res.json({
            success: true,
            message: "Token refreshed successfully",
            data: tokens,
        });
    }
    catch (error) {
        res.status(500).json({
            success: false,
            message: "Token refresh failed",
        });
    }
});
// Logout endpoint
router.post("/logout", auth_1.authenticate, async (req, res) => {
    try {
        if (req.user) {
            await AuthService_1.AuthService.logout(req.user.id);
        }
        res.json({
            success: true,
            message: "Logout successful",
        });
    }
    catch (error) {
        res.status(500).json({
            success: false,
            message: "Logout failed",
        });
    }
});
// Get current user endpoint
router.get("/me", auth_1.authenticate, (req, res) => {
    res.json({
        success: true,
        data: req.user,
    });
});
exports.default = router;
