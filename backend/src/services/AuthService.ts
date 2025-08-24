import jwt from "jsonwebtoken"
import { UserModel, type User } from "../models/User"
import redisClient from "../config/redis"
import type { UserRole } from "../types"

export interface LoginCredentials {
  username: string
  password: string
}

export interface AuthTokens {
  accessToken: string
  refreshToken: string
}

export interface AuthUser {
  id: string
  username: string
  email?: string
  role: UserRole
  isActive: boolean
}

export class AuthService {
  private static readonly ACCESS_TOKEN_EXPIRES_IN = "15m"
  private static readonly REFRESH_TOKEN_EXPIRES_IN = "7d"
  private static readonly MAX_LOGIN_ATTEMPTS = 5

  static async login(credentials: LoginCredentials): Promise<{ user: AuthUser; tokens: AuthTokens } | null> {
    const user = await UserModel.findByUsername(credentials.username)

    if (!user) {
      return null
    }

    // Check if account is locked
    if (user.isLocked) {
      throw new Error("Account is locked due to too many failed login attempts")
    }

    // Check if account is active
    if (!user.isActive) {
      throw new Error("Account is deactivated")
    }

    // Verify password
    const isValidPassword = await UserModel.verifyPassword(user, credentials.password)

    if (!isValidPassword) {
      // Increment failed login attempts
      const newAttempts = user.failedLoginAttempts + 1
      await UserModel.updateLoginAttempts(user.id, newAttempts)

      if (newAttempts >= this.MAX_LOGIN_ATTEMPTS) {
        throw new Error("Account locked due to too many failed login attempts")
      }

      return null
    }

    // Reset failed login attempts and update last login
    await UserModel.updateLastLogin(user.id)

    // Generate tokens
    const tokens = await this.generateTokens(user)

    // Store refresh token in Redis
    await this.storeRefreshToken(user.id, tokens.refreshToken)

    const authUser: AuthUser = {
      id: user.id,
      username: user.username,
      email: user.email,
      role: user.role,
      isActive: user.isActive,
    }

    return { user: authUser, tokens }
  }

  static async refreshToken(refreshToken: string): Promise<AuthTokens | null> {
    try {
      // Verify refresh token
      const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET!) as any

      // Check if refresh token exists in Redis
      const storedToken = await redisClient.get(`refresh_token:${decoded.userId}`)
      if (storedToken !== refreshToken) {
        return null
      }

      // Get user
      const user = await UserModel.findById(decoded.userId)
      if (!user || !user.isActive) {
        return null
      }

      // Generate new tokens
      const tokens = await this.generateTokens(user)

      // Store new refresh token and remove old one
      await this.storeRefreshToken(user.id, tokens.refreshToken)

      return tokens
    } catch (error) {
      return null
    }
  }

  static async logout(userId: string): Promise<void> {
    // Remove refresh token from Redis
    await redisClient.del(`refresh_token:${userId}`)
  }

  static async verifyAccessToken(token: string): Promise<AuthUser | null> {
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any

      const user = await UserModel.findById(decoded.userId)
      if (!user || !user.isActive) {
        return null
      }

      return {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
        isActive: user.isActive,
      }
    } catch (error) {
      return null
    }
  }

  private static async generateTokens(user: User): Promise<AuthTokens> {
    const payload = {
      userId: user.id,
      username: user.username,
      role: user.role,
    }

    const accessToken = jwt.sign(payload, process.env.JWT_SECRET!, {
      expiresIn: this.ACCESS_TOKEN_EXPIRES_IN,
    })

    const refreshToken = jwt.sign({ userId: user.id }, process.env.JWT_REFRESH_SECRET!, {
      expiresIn: this.REFRESH_TOKEN_EXPIRES_IN,
    })

    return { accessToken, refreshToken }
  }

  private static async storeRefreshToken(userId: string, refreshToken: string): Promise<void> {
    const key = `refresh_token:${userId}`
    const expiresIn = 7 * 24 * 60 * 60 // 7 days in seconds
    await redisClient.setEx(key, expiresIn, refreshToken)
  }
}
