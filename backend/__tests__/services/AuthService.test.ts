import { AuthService } from "../../src/services/AuthService"
import { pool } from "../../src/config/database"
import bcrypt from "bcrypt"
import jwt from "jsonwebtoken"
import jest from "jest" // Declare the jest variable

// Mock dependencies
jest.mock("../../src/config/database")
jest.mock("bcrypt")
jest.mock("jsonwebtoken")

describe("AuthService", () => {
  let authService: AuthService

  beforeEach(() => {
    authService = new AuthService()
    jest.clearAllMocks()
  })

  describe("validateCredentials", () => {
    it("should validate correct credentials", async () => {
      const mockUser = {
        id: "1",
        username: "testuser",
        password_hash: "hashedpassword",
        role: "admin",
        is_active: true,
        is_locked: false,
        failed_login_attempts: 0,
      }
      ;(pool.query as jest.Mock).mockResolvedValue({ rows: [mockUser] })
      ;(bcrypt.compare as jest.Mock).mockResolvedValue(true)

      const result = await authService.validateCredentials("testuser", "password123")

      expect(result.success).toBe(true)
      expect(result.user).toEqual(mockUser)
    })

    it("should reject invalid password", async () => {
      const mockUser = {
        id: "1",
        username: "testuser",
        password_hash: "hashedpassword",
        role: "admin",
        is_active: true,
        is_locked: false,
        failed_login_attempts: 0,
      }
      ;(pool.query as jest.Mock).mockResolvedValue({ rows: [mockUser] })
      ;(bcrypt.compare as jest.Mock).mockResolvedValue(false)

      const result = await authService.validateCredentials("testuser", "wrongpassword")

      expect(result.success).toBe(false)
      expect(result.message).toBe("Invalid credentials")
    })

    it("should reject non-existent user", async () => {
      ;(pool.query as jest.Mock).mockResolvedValue({ rows: [] })

      const result = await authService.validateCredentials("nonexistent", "password")

      expect(result.success).toBe(false)
      expect(result.message).toBe("Invalid credentials")
    })
  })

  describe("generateTokens", () => {
    it("should generate access and refresh tokens", () => {
      const mockUser = { id: "1", username: "testuser", role: "admin" }
      ;(jwt.sign as jest.Mock).mockReturnValueOnce("access-token").mockReturnValueOnce("refresh-token")

      const result = authService.generateTokens(mockUser)

      expect(result.accessToken).toBe("access-token")
      expect(result.refreshToken).toBe("refresh-token")
      expect(jwt.sign).toHaveBeenCalledTimes(2)
    })
  })
})
