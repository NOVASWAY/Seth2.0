import { test, expect } from "@playwright/test"

test.describe("Authentication", () => {
  test("should login with valid credentials", async ({ page }) => {
    await page.goto("/login")

    await page.fill('[data-testid="username"]', "admin")
    await page.fill('[data-testid="password"]', "admin123")
    await page.click('[data-testid="login-button"]')

    await expect(page).toHaveURL("/dashboard")
    await expect(page.locator('[data-testid="user-menu"]')).toBeVisible()
  })

  test("should show error for invalid credentials", async ({ page }) => {
    await page.goto("/login")

    await page.fill('[data-testid="username"]', "invalid")
    await page.fill('[data-testid="password"]', "invalid")
    await page.click('[data-testid="login-button"]')

    await expect(page.locator('[data-testid="error-message"]')).toBeVisible()
    await expect(page.locator('[data-testid="error-message"]')).toContainText("Invalid credentials")
  })

  test("should logout successfully", async ({ page }) => {
    // Login first
    await page.goto("/login")
    await page.fill('[data-testid="username"]', "admin")
    await page.fill('[data-testid="password"]', "admin123")
    await page.click('[data-testid="login-button"]')

    await expect(page).toHaveURL("/dashboard")

    // Logout
    await page.click('[data-testid="user-menu"]')
    await page.click('[data-testid="logout-button"]')

    await expect(page).toHaveURL("/login")
  })
})
