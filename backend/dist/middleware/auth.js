"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.authenticateToken = exports.requireRole = exports.authorizeSingle = exports.authorize = exports.authenticate = void 0;
const AuthService_1 = require("../services/AuthService");
const authenticate = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith("Bearer ")) {
            return res.status(401).json({
                success: false,
                message: "Access token required",
            });
        }
        const token = authHeader.substring(7);
        const user = await AuthService_1.AuthService.verifyAccessToken(token);
        if (!user) {
            return res.status(401).json({
                success: false,
                message: "Invalid or expired token",
            });
        }
        req.user = user;
        next();
    }
    catch (error) {
        return res.status(401).json({
            success: false,
            message: "Authentication failed",
        });
    }
};
exports.authenticate = authenticate;
const authorize = (roles) => {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({
                success: false,
                message: "Authentication required",
            });
        }
        if (!roles.includes(req.user.role)) {
            return res.status(403).json({
                success: false,
                message: "Insufficient permissions",
            });
        }
        next();
    };
};
exports.authorize = authorize;
const authorizeSingle = (role) => {
    return (0, exports.authorize)([role]);
};
exports.authorizeSingle = authorizeSingle;
exports.requireRole = exports.authorize;
exports.authenticateToken = exports.authenticate;
//# sourceMappingURL=auth.js.map