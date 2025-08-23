import type { Request, Response, NextFunction } from "express"
import { AuditLog } from "../models/AuditLog"

interface AuditLogParams {
  userId?: string
  action: string
  resource: string
  resourceId?: string
  opNumber?: string
  details?: any
  ipAddress?: string
  userAgent?: string
}

export const auditLog = async (params: AuditLogParams) => {
  try {
    await AuditLog.create(params)
  } catch (error) {
    console.error("Failed to create audit log:", error)
  }
}

export const auditLogger = (req: Request, res: Response, next: NextFunction) => {
  // Skip audit logging for GET requests and health checks
  if (req.method === "GET" || req.path === "/health") {
    return next()
  }

  // Store original end function
  const originalEnd = res.end

  // Override end function to capture response
  res.end = function (chunk?: any, encoding?: any) {
    // Only log successful operations (2xx status codes)
    if (res.statusCode >= 200 && res.statusCode < 300) {
      // Extract resource and action from path and method
      const pathParts = req.path.split("/").filter(Boolean)
      const resource = pathParts[1] || "unknown" // Skip 'api' prefix
      const action = getActionFromMethod(req.method)

      // Extract resource ID from path if present
      const resourceId = pathParts[2] && !isNaN(Number(pathParts[2])) ? pathParts[2] : undefined

      // Extract OP Number from request body or params
      const opNumber = req.body?.opNumber || req.body?.op_number || req.params?.opNumber

      auditLog({
        userId: (req as any).user?.id,
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
      })
    }

    // Call original end function
    originalEnd.call(this, chunk, encoding)
  }

  next()
}

function getActionFromMethod(method: string): string {
  switch (method.toUpperCase()) {
    case "POST":
      return "create"
    case "PUT":
    case "PATCH":
      return "update"
    case "DELETE":
      return "delete"
    default:
      return "action"
  }
}

function sanitizeBody(body: any): any {
  if (!body || typeof body !== "object") {
    return body
  }

  const sanitized = { ...body }

  // Remove sensitive fields
  const sensitiveFields = ["password", "token", "secret", "key"]
  sensitiveFields.forEach((field) => {
    if (sanitized[field]) {
      sanitized[field] = "[REDACTED]"
    }
  })

  return sanitized
}
