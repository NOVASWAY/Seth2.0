"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthService = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const User_1 = require("../models/User");
const redis_1 = __importDefault(require("../config/redis"));
const EventLoggerService_1 = require("./EventLoggerService");
class AuthService {
    static async login(credentials, ipAddress, userAgent) {
        const user = await User_1.UserModel.findByUsername(credentials.username);
        if (!user) {
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
        if (user.isLocked) {
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
        if (!user.isActive) {
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
        const isValidPassword = await User_1.UserModel.verifyPassword(user, credentials.password);
        if (!isValidPassword) {
            const newAttempts = user.failedLoginAttempts + 1;
            await User_1.UserModel.updateLoginAttempts(user.id, newAttempts);
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
        await User_1.UserModel.updateLastLogin(user.id);
        const tokens = await this.generateTokens(user);
        await this.storeRefreshToken(user.id, tokens.refreshToken);
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
            const decoded = jsonwebtoken_1.default.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
            const storedToken = await redis_1.default.get(`refresh_token:${decoded.userId}`);
            if (storedToken !== refreshToken) {
                return null;
            }
            const user = await User_1.UserModel.findById(decoded.userId);
            if (!user || !user.isActive) {
                return null;
            }
            const tokens = await this.generateTokens(user);
            await this.storeRefreshToken(user.id, tokens.refreshToken);
            return tokens;
        }
        catch (error) {
            return null;
        }
    }
    static async logout(userId) {
        await redis_1.default.del(`refresh_token:${userId}`);
    }
    static async verifyAccessToken(token) {
        try {
            const decoded = jsonwebtoken_1.default.verify(token, process.env.JWT_SECRET);
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
        const accessToken = jsonwebtoken_1.default.sign(payload, process.env.JWT_SECRET, {
            expiresIn: this.ACCESS_TOKEN_EXPIRES_IN,
        });
        const refreshToken = jsonwebtoken_1.default.sign({ userId: user.id }, process.env.JWT_REFRESH_SECRET, {
            expiresIn: this.REFRESH_TOKEN_EXPIRES_IN,
        });
        return { accessToken, refreshToken };
    }
    static async storeRefreshToken(userId, refreshToken) {
        const key = `refresh_token:${userId}`;
        const expiresIn = 7 * 24 * 60 * 60;
        await redis_1.default.setEx(key, expiresIn, refreshToken);
    }
}
exports.AuthService = AuthService;
AuthService.ACCESS_TOKEN_EXPIRES_IN = "15m";
AuthService.REFRESH_TOKEN_EXPIRES_IN = "7d";
AuthService.MAX_LOGIN_ATTEMPTS = 5;
//# sourceMappingURL=AuthService.js.map