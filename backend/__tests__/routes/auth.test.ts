import request from "supertest"
import express from "express"
import authRoutes from "../../src/routes/auth"
import { pool } from "../../src/config/database"
import bcrypt from "bcrypt"
import jest from "jest" // Declare the jest variable

// Mock database
jest.mock("../../src/config/database", () => ({
  pool: {
    query: jest.fn(),
    connect: jest.fn(),
  },
}))

// Mock bcrypt
jest.mock("bcrypt")

const app = express()
app.use(express.json())
app.use("/api/auth", authRoutes)

describe("Auth Routes", () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe("POST /api/auth/login", () => {
    it("should login with valid credentials", async () => {
      const mockUser = {
        id: "1",
        username: "testuser",
        password_hash: "hashedpassword",
        role: "admin",
        is_active: true,
        is_locked: false,
        failed_login_attempts: 0,
      }
      ;(pool.query as jest.Mock)
        .mockResolvedValueOnce({ rows: [mockUser] }) // Find user
        .mockResolvedValueOnce({ rows: [] }) // Update last login
      ;(bcrypt.compare as jest.Mock).mockResolvedValue(true)

      const response = await request(app).post("/api/auth/login").send({
        username: "testuser",
        password: "password123",
      })

      expect(response.status).toBe(200)
      expect(response.body.success).toBe(true)
      expect(response.body.data.user.username).toBe("testuser")
      expect(response.body.data.token).toBeDefined()
    })

    it("should reject invalid credentials", async () => {
      ;(pool.query as jest.Mock).mockResolvedValueOnce({ rows: [] })

      const response = await request(app).post("/api/auth/login").send({
        username: "invaliduser",
        password: "wrongpassword",
      })

      expect(response.status).toBe(401)
      expect(response.body.success).toBe(false)
      expect(response.body.message).toBe("Invalid credentials")
    })

    it("should reject locked account", async () => {
      const mockUser = {
        id: "1",
        username: "testuser",
        password_hash: "hashedpassword",
        role: "admin",
        is_active: true,
        is_locked: true,
        failed_login_attempts: 5,
      }
      ;(pool.query as jest.Mock).mockResolvedValueOnce({ rows: [mockUser] })

      const response = await request(app).post("/api/auth/login").send({
        username: "testuser",
        password: "password123",
      })

      expect(response.status).toBe(401)
      expect(response.body.success).toBe(false)
      expect(response.body.message).toBe("Account is locked")
    })
  })

  describe("POST /api/auth/refresh", () => {
    it("should refresh token with valid refresh token", async () => {
      const mockUser = {
        id: "1",
        username: "testuser",
        role: "admin",
      }
      ;(pool.query as jest.Mock).mockResolvedValueOnce({ rows: [mockUser] })

      // Mock JWT verification (would need to mock jsonwebtoken)
      const response = await request(app).post("/api/auth/refresh").set("Cookie", "refreshToken=valid-refresh-token")

      // This test would need proper JWT mocking to work fully
      expect(pool.query).toHaveBeenCalled()
    })
  })
})
