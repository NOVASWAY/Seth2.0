import { test, expect } from "@playwright/test"

test.describe("Authentication Persistence", () => {
  test("should maintain authentication across page navigations", async ({ page }) => {
    // Step 1: Login
    await page.goto("/login")
    await page.fill('[data-testid="username"]', "admin")
    await page.fill('[data-testid="password"]', "admin123")
    await page.click('[data-testid="login-button"]')
    
    // Wait for authentication to complete
    await expect(page).toHaveURL("/dashboard")
    await page.waitForTimeout(2000)
    
    // Step 2: Navigate to protected route
    await page.goto("/patients/register")
    
    // Step 3: Verify we're not redirected to unauthorized
    await expect(page).not.toHaveURL(/unauthorized/)
    
    // Step 4: Check if we can see the page content
    await expect(page.locator('h1, h2, h3')).toContainText(/patient|register/i)
    
    // Step 5: Navigate to another protected route
    await page.goto("/inventory")
    await expect(page).not.toHaveURL(/unauthorized/)
    
    // Step 6: Navigate back to dashboard
    await page.goto("/dashboard")
    await expect(page).toHaveURL("/dashboard")
  })

  test("should show unauthorized for unauthenticated access", async ({ page }) => {
    // Try to access protected route without login
    await page.goto("/patients/register")
    
    // Should be redirected to unauthorized or login
    const currentUrl = page.url()
    expect(currentUrl).toMatch(/(unauthorized|login)/)
  })
})
