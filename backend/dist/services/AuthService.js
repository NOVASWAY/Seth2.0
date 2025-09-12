"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthService = void 0;
const jwt = __importStar(require("jsonwebtoken"));
const User_1 = require("../models/User");
const redis_1 = __importDefault(require("../config/redis"));
const EventLoggerService_1 = require("./EventLoggerService");
class AuthService {
    static async login(credentials, ipAddress, userAgent) {
        const user = await User_1.UserModel.findByUsername(credentials.username);
        if (!user) {
            // Log failed login attempt for non-existent user
            await EventLoggerService_1.EventLoggerService.logEvent({
                event_type: "LOGIN",
                username: credentials.username,
                action: "login_failed",
                details: { reason: "user_not_found" },
                ip_address: ipAddress,
                user_agent: userAgent,
                severity: "MEDIUM",
            });
            return null;
        }
        // Check if account is locked
        if (user.isLocked) {
            // Log locked account login attempt
            await EventLoggerService_1.EventLoggerService.logEvent({
                event_type: "SECURITY",
                user_id: user.id,
                username: user.username,
                action: "login_blocked_locked",
                details: { reason: "account_locked", failed_attempts: user.failedLoginAttempts },
                ip_address: ipAddress,
                user_agent: userAgent,
                severity: "HIGH",
            });
            throw new Error("Account is locked due to too many failed login attempts");
        }
        // Check if account is active
        if (!user.isActive) {
            // Log inactive account login attempt
            await EventLoggerService_1.EventLoggerService.logEvent({
                event_type: "SECURITY",
                user_id: user.id,
                username: user.username,
                action: "login_blocked_inactive",
                details: { reason: "account_inactive" },
                ip_address: ipAddress,
                user_agent: userAgent,
                severity: "MEDIUM",
            });
            throw new Error("Account is deactivated");
        }
        // Verify password
        const isValidPassword = await User_1.UserModel.verifyPassword(user, credentials.password);
        if (!isValidPassword) {
            // Increment failed login attempts
            const newAttempts = user.failedLoginAttempts + 1;
            await User_1.UserModel.updateLoginAttempts(user.id, newAttempts);
            // Log failed login attempt
            await EventLoggerService_1.EventLoggerService.logEvent({
                event_type: "LOGIN",
                user_id: user.id,
                username: user.username,
                action: "login_failed",
                details: {
                    reason: "invalid_password",
                    failed_attempts: newAttempts,
                    max_attempts: this.MAX_LOGIN_ATTEMPTS
                },
                ip_address: ipAddress,
                user_agent: userAgent,
                severity: newAttempts >= this.MAX_LOGIN_ATTEMPTS ? "CRITICAL" : "MEDIUM",
            });
            if (newAttempts >= this.MAX_LOGIN_ATTEMPTS) {
                // Log account lockout
                await EventLoggerService_1.EventLoggerService.logEvent({
                    event_type: "SECURITY",
                    user_id: user.id,
                    username: user.username,
                    action: "account_locked",
                    details: {
                        reason: "max_failed_attempts_reached",
                        failed_attempts: newAttempts
                    },
                    ip_address: ipAddress,
                    user_agent: userAgent,
                    severity: "CRITICAL",
                });
                throw new Error("Account locked due to too many failed login attempts");
            }
            return null;
        }
        // Reset failed login attempts and update last login
        await User_1.UserModel.updateLastLogin(user.id);
        // Generate tokens
        const tokens = await this.generateTokens(user);
        // Store refresh token in Redis
        await this.storeRefreshToken(user.id, tokens.refreshToken);
        // Log successful login
        await EventLoggerService_1.EventLoggerService.logEvent({
            event_type: "LOGIN",
            user_id: user.id,
            username: user.username,
            action: "login_success",
            details: {
                role: user.role,
                previous_failed_attempts: user.failedLoginAttempts
            },
            ip_address: ipAddress,
            user_agent: userAgent,
            severity: "LOW",
        });
        const authUser = {
            id: user.id,
            username: user.username,
            email: user.email,
            role: user.role,
            isActive: user.isActive,
        };
        return { user: authUser, tokens };
    }
    static async refreshToken(refreshToken) {
        try {
            // Verify refresh token
            const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
            // Check if refresh token exists in Redis
            const storedToken = await redis_1.default.get(`refresh_token:${decoded.userId}`);
            if (storedToken !== refreshToken) {
                return null;
            }
            // Get user
            const user = await User_1.UserModel.findById(decoded.userId);
            if (!user || !user.isActive) {
                return null;
            }
            // Generate new tokens
            const tokens = await this.generateTokens(user);
            // Store new refresh token and remove old one
            await this.storeRefreshToken(user.id, tokens.refreshToken);
            return tokens;
        }
        catch (error) {
            return null;
        }
    }
    static async logout(userId) {
        // Remove refresh token from Redis
        await redis_1.default.del(`refresh_token:${userId}`);
    }
    static async verifyAccessToken(token) {
        try {
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            const user = await User_1.UserModel.findById(decoded.userId);
            if (!user || !user.isActive) {
                return null;
            }
            return {
                id: user.id,
                username: user.username,
                email: user.email,
                role: user.role,
                isActive: user.isActive,
            };
        }
        catch (error) {
            return null;
        }
    }
    static async generateTokens(user) {
        const payload = {
            userId: user.id,
            username: user.username,
            role: user.role,
        };
        const accessToken = jwt.sign(payload, process.env.JWT_SECRET, {
            expiresIn: this.ACCESS_TOKEN_EXPIRES_IN,
        });
        const refreshToken = jwt.sign({ userId: user.id }, process.env.JWT_REFRESH_SECRET, {
            expiresIn: this.REFRESH_TOKEN_EXPIRES_IN,
        });
        return { accessToken, refreshToken };
    }
    static async storeRefreshToken(userId, refreshToken) {
        const key = `refresh_token:${userId}`;
        const expiresIn = 7 * 24 * 60 * 60; // 7 days in seconds
        await redis_1.default.setEx(key, expiresIn, refreshToken);
    }
}
exports.AuthService = AuthService;
AuthService.ACCESS_TOKEN_EXPIRES_IN = "15m";
AuthService.REFRESH_TOKEN_EXPIRES_IN = "7d";
AuthService.MAX_LOGIN_ATTEMPTS = 5;
