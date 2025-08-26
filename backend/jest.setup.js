// Mock environment variables
process.env.NODE_ENV = "test"
process.env.DATABASE_URL = "postgresql://test:test@localhost:5432/test_db"
process.env.REDIS_URL = "redis://localhost:6379"
process.env.JWT_SECRET = "test-jwt-secret"
process.env.JWT_REFRESH_SECRET = "test-jwt-refresh-secret"

// Mock crypto.randomUUID for Node.js < 19
if (!global.crypto) {
  global.crypto = {
    randomUUID: () => "test-uuid-" + Math.random().toString(36).substr(2, 9),
  }
}

// Mock console methods in tests
global.console = {
  ...console,
  log: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  info: jest.fn(),
}

// Cleanup function to close connections
afterAll(async () => {
  // Close any open connections
  const { pool } = require('./src/config/database')
  const redisClient = require('./src/config/redis')
  
  try {
    await pool.end()
    await redisClient.quit()
  } catch (error) {
    // Ignore errors during cleanup
  }
})
