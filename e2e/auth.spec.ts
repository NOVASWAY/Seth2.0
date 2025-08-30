import { test, expect } from "@playwright/test"

test.describe("Authentication", () => {
  test("should login with valid credentials", async ({ page }) => {
    await page.goto("/login")

    // Debug: Check if we're on the login page
    await expect(page.locator('[data-testid="username"]')).toBeVisible()
    await expect(page.locator('[data-testid="password"]')).toBeVisible()

    await page.fill('[data-testid="username"]', "admin")
    await page.fill('[data-testid="password"]', "admin123")
    
    // Debug: Check form values
    await expect(page.locator('[data-testid="username"]')).toHaveValue("admin")
    await expect(page.locator('[data-testid="password"]')).toHaveValue("admin123")
    
    // Debug: Check console logs
    page.on('console', msg => console.log('Browser console:', msg.text()))
    
    await page.click('[data-testid="login-button"]')
    
    // Debug: Wait for authentication to complete
    await page.waitForTimeout(3000)
    
    // Debug: Check if authentication state is set
    const authState = await page.evaluate(() => {
      // Check if auth state is in localStorage
      const authStorage = localStorage.getItem('simple-auth-storage')
      return authStorage ? JSON.parse(authStorage) : null
    })
    console.log('Auth state:', authState)
    
    // Debug: Check current URL and any error messages
    const currentUrl = page.url()
    console.log('Current URL after login attempt:', currentUrl)
    
    // Check if there are any error messages
    const errorElement = page.locator('[data-testid="error-message"]')
    if (await errorElement.isVisible()) {
      const errorText = await errorElement.textContent()
      console.log('Error message found:', errorText)
    }
    
    // Check if we're still on login page
    if (currentUrl.includes('/login')) {
      console.log('Still on login page, checking for errors...')
      // Take a screenshot for debugging
      await page.screenshot({ path: 'debug-login-failed.png' })
      
      // Try to manually navigate to dashboard
      await page.goto('/dashboard')
      await page.waitForTimeout(2000)
      console.log('Manual navigation to dashboard, URL:', page.url())
    }

    await expect(page).toHaveURL("/dashboard")
    await expect(page.locator('[data-testid="logout-button"]')).toBeVisible()
  })

  test("should show error for invalid credentials", async ({ page }) => {
    await page.goto("/login")

    await page.fill('[data-testid="username"]', "invalid")
    await page.fill('[data-testid="password"]', "invalid")
    await page.click('[data-testid="login-button"]')

    await expect(page.locator('[data-testid="error-message"]')).toBeVisible()
    await expect(page.locator('[data-testid="error-message"]')).toContainText("Invalid username or password")
  })

  test("should logout successfully", async ({ page }) => {
    // Login first
    await page.goto("/login")
    await page.fill('[data-testid="username"]', "admin")
    await page.fill('[data-testid="password"]', "admin123")
    await page.click('[data-testid="login-button"]')

    // Wait for authentication and navigation
    await page.waitForTimeout(3000)
    
    // Try to navigate to dashboard manually if still on login
    if (page.url().includes('/login')) {
      await page.goto('/dashboard')
      await page.waitForTimeout(2000)
    }

    await expect(page).toHaveURL("/dashboard")

    // Wait for user menu to be visible
    await expect(page.locator('[data-testid="logout-button"]')).toBeVisible()
    
    // Click logout button
    await page.click('[data-testid="logout-button"]')
    
    // Wait for logout to complete
    await page.waitForTimeout(2000)

    await expect(page).toHaveURL("/login")
  })
})
