import { test, expect } from "@playwright/test"

test.describe("Console Log Test", () => {
  test("should capture console logs during authentication", async ({ page }) => {
    // Capture console logs
    const logs: string[] = []
    page.on('console', msg => {
      logs.push(`${msg.type()}: ${msg.text()}`)
    })

    // Go to login page
    await page.goto("/login")
    console.log("Page loaded, URL:", page.url())
    
    // Set test mode flag
    await page.evaluate(() => {
      localStorage.setItem('test-mode', 'true')
      console.log('Test mode flag set in localStorage')
    })
    
    // Wait a moment for any console logs
    await page.waitForTimeout(1000)
    
    // Fill and submit form
    await page.fill('[data-testid="username"]', "admin")
    await page.fill('[data-testid="password"]', "admin123")
    await page.click('[data-testid="login-button"]')
    
    // Wait for any authentication process
    await page.waitForTimeout(3000)
    
    // Log all captured console messages
    console.log("=== Console Logs ===")
    logs.forEach(log => console.log(log))
    console.log("=== End Console Logs ===")
    
    // Check final state
    console.log("Final URL:", page.url())
    const authState = await page.evaluate(() => {
      const authStorage = localStorage.getItem('auth-storage')
      return authStorage ? JSON.parse(authStorage) : null
    })
    console.log("Final auth state:", authState)
  })
})
