import { AuthService } from "../../src/services/AuthService"
import { UserModel } from "../../src/models/User"
import jwt from "jsonwebtoken"
import redisClient from "../../src/config/redis"

// Mock dependencies
jest.mock("../../src/models/User")
jest.mock("jsonwebtoken")
jest.mock("../../src/config/redis")

describe("AuthService", () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe("login", () => {
    it("should login with correct credentials", async () => {
      const mockUser = {
        id: "1",
        username: "testuser",
        email: "test@example.com",
        passwordHash: "hashedpassword",
        role: "admin" as const,
        isActive: true,
        isLocked: false,
        failedLoginAttempts: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      ;(UserModel.findByUsername as jest.Mock).mockResolvedValue(mockUser)
      ;(UserModel.verifyPassword as jest.Mock).mockResolvedValue(true)
      ;(UserModel.updateLastLogin as jest.Mock).mockResolvedValue(undefined)
      ;(jwt.sign as jest.Mock)
        .mockReturnValueOnce("access-token")
        .mockReturnValueOnce("refresh-token")
      ;(redisClient.setEx as jest.Mock).mockResolvedValue(undefined)

      const result = await AuthService.login({
        username: "testuser",
        password: "password123",
      })

      expect(result).toEqual({
        user: {
          id: "1",
          username: "testuser",
          email: "test@example.com",
          role: "admin",
          isActive: true,
        },
        tokens: {
          accessToken: "access-token",
          refreshToken: "refresh-token",
        },
      })
    })

    it("should reject invalid credentials", async () => {
      ;(UserModel.findByUsername as jest.Mock).mockResolvedValue(null)

      const result = await AuthService.login({
        username: "nonexistent",
        password: "password123",
      })

      expect(result).toBeNull()
    })

    it("should reject locked account", async () => {
      const mockUser = {
        id: "1",
        username: "testuser",
        email: "test@example.com",
        passwordHash: "hashedpassword",
        role: "admin" as const,
        isActive: true,
        isLocked: true,
        failedLoginAttempts: 5,
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      ;(UserModel.findByUsername as jest.Mock).mockResolvedValue(mockUser)

      await expect(
        AuthService.login({
          username: "testuser",
          password: "password123",
        })
      ).rejects.toThrow("Account is locked due to too many failed login attempts")
    })

    it("should reject deactivated account", async () => {
      const mockUser = {
        id: "1",
        username: "testuser",
        email: "test@example.com",
        passwordHash: "hashedpassword",
        role: "admin" as const,
        isActive: false,
        isLocked: false,
        failedLoginAttempts: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      ;(UserModel.findByUsername as jest.Mock).mockResolvedValue(mockUser)

      await expect(
        AuthService.login({
          username: "testuser",
          password: "password123",
        })
      ).rejects.toThrow("Account is deactivated")
    })
  })

  describe("verifyAccessToken", () => {
    it("should verify valid access token", async () => {
      const mockUser = {
        id: "1",
        username: "testuser",
        email: "test@example.com",
        passwordHash: "hashedpassword",
        role: "admin" as const,
        isActive: true,
        isLocked: false,
        failedLoginAttempts: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      const mockDecoded = {
        userId: "1",
        username: "testuser",
        role: "admin",
      }

      ;(jwt.verify as jest.Mock).mockReturnValue(mockDecoded)
      ;(UserModel.findById as jest.Mock).mockResolvedValue(mockUser)

      const result = await AuthService.verifyAccessToken("valid-token")

      expect(result).toEqual({
        id: "1",
        username: "testuser",
        email: "test@example.com",
        role: "admin",
        isActive: true,
      })
    })

    it("should return null for invalid token", async () => {
      ;(jwt.verify as jest.Mock).mockImplementation(() => {
        throw new Error("Invalid token")
      })

      const result = await AuthService.verifyAccessToken("invalid-token")

      expect(result).toBeNull()
    })

    it("should return null for inactive user", async () => {
      const mockUser = {
        id: "1",
        username: "testuser",
        email: "test@example.com",
        passwordHash: "hashedpassword",
        role: "admin" as const,
        isActive: false,
        isLocked: false,
        failedLoginAttempts: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      const mockDecoded = {
        userId: "1",
        username: "testuser",
        role: "admin",
      }

      ;(jwt.verify as jest.Mock).mockReturnValue(mockDecoded)
      ;(UserModel.findById as jest.Mock).mockResolvedValue(mockUser)

      const result = await AuthService.verifyAccessToken("valid-token")

      expect(result).toBeNull()
    })
  })
})
