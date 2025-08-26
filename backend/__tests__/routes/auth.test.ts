import request from "supertest"
import express from "express"
import authRoutes from "../../src/routes/auth"
import { AuthService } from "../../src/services/AuthService"
import { authenticate } from "../../src/middleware/auth"

// Mock AuthService
jest.mock("../../src/services/AuthService")
jest.mock("../../src/middleware/auth")

const app = express()
app.use(express.json())
app.use("/api/auth", authRoutes)

// Mock the authenticate middleware
;(authenticate as jest.Mock).mockImplementation((req: any, res: any, next: any) => {
  req.user = {
    id: "1",
    username: "testuser",
    role: "admin",
    isActive: true,
  }
  next()
})

describe("Auth Routes", () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe("POST /api/auth/login", () => {
    it("should login with valid credentials", async () => {
      const mockResult = {
        user: {
          id: "1",
          username: "testuser",
          email: "test@example.com",
          role: "admin" as const,
          isActive: true,
        },
        tokens: {
          accessToken: "access-token",
          refreshToken: "refresh-token",
        },
      }

      ;(AuthService.login as jest.Mock).mockResolvedValue(mockResult)

      const response = await request(app).post("/api/auth/login").send({
        username: "testuser",
        password: "password123",
      })

      expect(response.status).toBe(200)
      expect(response.body.success).toBe(true)
      expect(response.body.data.user.username).toBe("testuser")
      expect(response.body.data.accessToken).toBe("access-token")
      expect(response.body.data.refreshToken).toBe("refresh-token")
    })

    it("should reject invalid credentials", async () => {
      ;(AuthService.login as jest.Mock).mockResolvedValue(null)

      const response = await request(app).post("/api/auth/login").send({
        username: "invaliduser",
        password: "wrongpassword",
      })

      expect(response.status).toBe(401)
      expect(response.body.success).toBe(false)
      expect(response.body.message).toBe("Invalid username or password")
    })

    it("should handle locked account", async () => {
      ;(AuthService.login as jest.Mock).mockRejectedValue(
        new Error("Account is locked due to too many failed login attempts")
      )

      const response = await request(app).post("/api/auth/login").send({
        username: "testuser",
        password: "password123",
      })

      expect(response.status).toBe(400)
      expect(response.body.success).toBe(false)
      expect(response.body.message).toBe("Account is locked due to too many failed login attempts")
    })

    it("should validate input", async () => {
      const response = await request(app).post("/api/auth/login").send({
        username: "ab", // Too short
        password: "123", // Too short
      })

      expect(response.status).toBe(400)
      expect(response.body.success).toBe(false)
      expect(response.body.message).toBe("Validation failed")
    })
  })

  describe("POST /api/auth/refresh", () => {
    it("should refresh token with valid refresh token", async () => {
      const mockTokens = {
        accessToken: "new-access-token",
        refreshToken: "new-refresh-token",
      }

      ;(AuthService.refreshToken as jest.Mock).mockResolvedValue(mockTokens)

      const response = await request(app).post("/api/auth/refresh").send({
        refreshToken: "valid-refresh-token",
      })

      expect(response.status).toBe(200)
      expect(response.body.success).toBe(true)
      expect(response.body.data).toEqual(mockTokens)
    })

    it("should reject invalid refresh token", async () => {
      ;(AuthService.refreshToken as jest.Mock).mockResolvedValue(null)

      const response = await request(app).post("/api/auth/refresh").send({
        refreshToken: "invalid-refresh-token",
      })

      expect(response.status).toBe(401)
      expect(response.body.success).toBe(false)
      expect(response.body.message).toBe("Invalid or expired refresh token")
    })
  })

  describe("POST /api/auth/logout", () => {
    it("should logout successfully", async () => {
      ;(AuthService.logout as jest.Mock).mockResolvedValue(undefined)

      const response = await request(app).post("/api/auth/logout")

      expect(response.status).toBe(200)
      expect(response.body.success).toBe(true)
      expect(response.body.message).toBe("Logout successful")
    })
  })

  describe("GET /api/auth/me", () => {
    it("should return current user", async () => {
      const response = await request(app).get("/api/auth/me")

      expect(response.status).toBe(200)
      expect(response.body.success).toBe(true)
      expect(response.body.data).toEqual({
        id: "1",
        username: "testuser",
        role: "admin",
        isActive: true,
      })
    })
  })
})
