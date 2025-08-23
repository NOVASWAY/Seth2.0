import type { Request, Response, NextFunction } from "express"
import { AuthService } from "../services/AuthService"
import type { UserRole } from "../../../types"

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string
    username: string
    email?: string
    role: UserRole
    isActive: boolean
  }
}

export const authenticate = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        success: false,
        message: "Access token required",
      })
    }

    const token = authHeader.substring(7) // Remove 'Bearer ' prefix
    const user = await AuthService.verifyAccessToken(token)

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Invalid or expired token",
      })
    }

    req.user = user
    next()
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: "Authentication failed",
    })
  }
}

export const authorize = (roles: UserRole[]) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      })
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: "Insufficient permissions",
      })
    }

    next()
  }
}
