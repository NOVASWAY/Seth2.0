"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.auditLogger = exports.auditLog = void 0;
const AuditLog_1 = require("../models/AuditLog");
const auditLog = async (params) => {
    try {
        await AuditLog_1.AuditLog.create(params);
    }
    catch (error) {
        console.error("Failed to create audit log:", error);
    }
};
exports.auditLog = auditLog;
const auditLogger = (req, res, next) => {
    if (req.method === "GET" || req.path === "/health") {
        return next();
    }
    const originalEnd = res.end;
    res.end = function (chunk, encoding) {
        if (res.statusCode >= 200 && res.statusCode < 300) {
            const pathParts = req.path.split("/").filter(Boolean);
            const resource = pathParts[1] || "unknown";
            const action = getActionFromMethod(req.method);
            const resourceId = pathParts[2] && !isNaN(Number(pathParts[2])) ? pathParts[2] : undefined;
            const opNumber = req.body?.opNumber || req.body?.op_number || req.params?.opNumber;
            (0, exports.auditLog)({
                userId: req.user?.id,
                action,
                resource,
                resourceId,
                opNumber,
                details: {
                    method: req.method,
                    path: req.path,
                    body: sanitizeBody(req.body),
                    query: req.query,
                },
                ipAddress: req.ip,
                userAgent: req.get("User-Agent"),
            });
        }
        return originalEnd.call(this, chunk, encoding);
    };
    next();
};
exports.auditLogger = auditLogger;
function getActionFromMethod(method) {
    switch (method.toUpperCase()) {
        case "POST":
            return "create";
        case "PUT":
        case "PATCH":
            return "update";
        case "DELETE":
            return "delete";
        default:
            return "action";
    }
}
function sanitizeBody(body) {
    if (!body || typeof body !== "object") {
        return body;
    }
    const sanitized = { ...body };
    const sensitiveFields = ["password", "token", "secret", "key"];
    sensitiveFields.forEach((field) => {
        if (sanitized[field]) {
            sanitized[field] = "[REDACTED]";
        }
    });
    return sanitized;
}
//# sourceMappingURL=auditLogger.js.map