import { defineConfig, devices } from "@playwright/test"

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: "html",
  use: {
    baseURL: "http://localhost:3000",
    trace: "on-first-retry",
    screenshot: "only-on-failure",
  },

  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
    {
      name: "firefox",
      use: { ...devices["Desktop Firefox"] },
    },
    {
      name: "webkit",
      use: { ...devices["Desktop Safari"] },
    },
    {
      name: "Mobile Chrome",
      use: { ...devices["Pixel 5"] },
    },
  ],

  webServer: [
    {
      command: "cd backend && npm start",
      port: 3001,
      reuseExistingServer: !process.env.CI,
      env: {
        DATABASE_URL: "postgresql://postgres:postgres@localhost:5432/test_db",
        REDIS_URL: "redis://localhost:6379",
        JWT_SECRET: "test-jwt-secret",
        JWT_REFRESH_SECRET: "test-jwt-refresh-secret",
        PORT: "3001",
      },
    },
    {
      command: "npm start",
      port: 3007,
      reuseExistingServer: !process.env.CI,
      env: {
        NEXT_PUBLIC_API_URL: "http://localhost:3001",
      },
    },
  ],
})
