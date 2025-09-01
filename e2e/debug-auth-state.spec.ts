import { test, expect } from "@playwright/test"

test.describe("Debug Authentication State", () => {
  test("should debug authentication state after login", async ({ page }) => {
    // Step 1: Go to login page
    await page.goto("/login")
    console.log("Initial URL:", page.url())
    
    // Step 2: Check initial auth state
    const initialAuthState = await page.evaluate(() => {
      const authStorage = localStorage.getItem('auth-storage')
      return authStorage ? JSON.parse(authStorage) : null
    })
    console.log("Initial auth state:", initialAuthState)
    
    // Step 3: Login
    await page.fill('[data-testid="username"]', "admin")
    await page.fill('[data-testid="password"]', "admin123")
    await page.click('[data-testid="login-button"]')
    
    // Step 4: Wait for navigation
    await page.waitForTimeout(3000)
    console.log("URL after login:", page.url())
    
    // Step 5: Check auth state after login
    const authStateAfterLogin = await page.evaluate(() => {
      const authStorage = localStorage.getItem('auth-storage')
      return authStorage ? JSON.parse(authStorage) : null
    })
    console.log("Auth state after login:", authStateAfterLogin)
    
    // Step 6: Check if we're authenticated
    const isAuthenticated = await page.evaluate(() => {
      const authStorage = localStorage.getItem('auth-storage')
      if (!authStorage) return false
      const auth = JSON.parse(authStorage)
      return auth.state?.isAuthenticated || false
    })
    console.log("Is authenticated:", isAuthenticated)
    
    // Step 7: Try to access protected route
    await page.goto("/patients/register")
    await page.waitForTimeout(2000)
    console.log("URL after trying protected route:", page.url())
    
    // Step 8: Check auth state again
    const authStateAfterProtectedRoute = await page.evaluate(() => {
      const authStorage = localStorage.getItem('auth-storage')
      return authStorage ? JSON.parse(authStorage) : null
    })
    console.log("Auth state after protected route:", authStateAfterProtectedRoute)
    
    // Step 9: Check if we're still authenticated
    const isStillAuthenticated = await page.evaluate(() => {
      const authStorage = localStorage.getItem('auth-storage')
      if (!authStorage) return false
      const auth = JSON.parse(authStorage)
      return auth.state?.isAuthenticated || false
    })
    console.log("Is still authenticated:", isStillAuthenticated)
  })
})
