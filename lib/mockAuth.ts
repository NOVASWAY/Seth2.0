import type { AuthUser } from "./auth"
import type { UserRole } from "../types"

// Mock user data for testing
const MOCK_USER: AuthUser = {
  id: "test-user-id",
  username: "admin",
  email: "admin@test.com",
  role: "ADMIN" as UserRole,
  isActive: true,
}

// Mock tokens for testing
const MOCK_TOKENS = {
  accessToken: "mock-access-token",
  refreshToken: "mock-refresh-token",
}

export class MockAuthService {
  static async login(username: string, password: string): Promise<{ user: AuthUser; tokens: typeof MOCK_TOKENS }> {
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 100))
    
    // Check if credentials match the expected test credentials
    if (username === "admin" && password === "admin123") {
      return {
        user: MOCK_USER,
        tokens: MOCK_TOKENS,
      }
    }
    
    throw new Error("Invalid username or password")
  }

  static async logout(): Promise<void> {
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 50))
  }

  static async refreshToken(): Promise<typeof MOCK_TOKENS> {
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 50))
    return MOCK_TOKENS
  }
}
