import { test, expect } from "@playwright/test"

test.describe("Simple Login Debug", () => {
  test("should debug login step by step", async ({ page }) => {
    // Step 1: Go to login page
    await page.goto("/login")
    console.log("Step 1: Login page loaded, URL:", page.url())
    
    // Step 1.5: Set test mode flag to ensure mock authentication
    await page.evaluate(() => {
      localStorage.setItem('test-mode', 'true')
    })
    console.log("Step 1.5: Test mode flag set in localStorage")
    
    // Step 2: Check if form elements are visible
    const usernameField = page.locator('[data-testid="username"]')
    const passwordField = page.locator('[data-testid="password"]')
    const loginButton = page.locator('[data-testid="login-button"]')
    
    console.log("Step 2: Form elements found:", {
      usernameVisible: await usernameField.isVisible(),
      passwordVisible: await passwordField.isVisible(),
      buttonVisible: await loginButton.isVisible()
    })
    
    // Step 3: Fill the form
    await usernameField.fill("admin")
    await passwordField.fill("admin123")
    console.log("Step 3: Form filled with credentials")
    
    // Step 4: Check form values
    const usernameValue = await usernameField.inputValue()
    const passwordValue = await passwordField.inputValue()
    console.log("Step 4: Form values:", { username: usernameValue, password: passwordValue })
    
    // Step 5: Click login button
    await loginButton.click()
    console.log("Step 5: Login button clicked")
    
    // Step 6: Wait and check URL
    await page.waitForTimeout(3000)
    console.log("Step 6: After 3 seconds, URL:", page.url())
    
    // Step 7: Check for any error messages
    const errorElement = page.locator('[data-testid="error-message"]')
    if (await errorElement.isVisible()) {
      const errorText = await errorElement.textContent()
      console.log("Step 7: Error message found:", errorText)
    } else {
      console.log("Step 7: No error message found")
    }
    
    // Step 8: Check authentication state
    const authState = await page.evaluate(() => {
      const authStorage = localStorage.getItem('auth-storage')
      return authStorage ? JSON.parse(authStorage) : null
    })
    console.log("Step 8: Authentication state:", authState)
    
    // Step 9: Check if we're authenticated
    const isAuthenticated = await page.evaluate(() => {
      const authStorage = localStorage.getItem('auth-storage')
      if (!authStorage) return false
      const auth = JSON.parse(authStorage)
      return auth.state?.isAuthenticated || false
    })
    console.log("Step 9: Is authenticated:", isAuthenticated)
  })
})
