import { test, expect } from "@playwright/test"

test.describe("Auth Store Test", () => {
  test("should verify auth store is accessible", async ({ page }) => {
    // Go to login page
    await page.goto("/login")
    console.log("Page loaded, URL:", page.url())
    
    // Check if auth store is accessible
    const authStoreCheck = await page.evaluate(() => {
      try {
        // Try to access the auth store
        if (typeof window !== 'undefined' && (window as any).useAuthStore) {
          return { available: true, type: typeof (window as any).useAuthStore }
        }
        
        // Check if it's in the global scope
        if (typeof (globalThis as any).useAuthStore !== 'undefined') {
          return { available: true, type: typeof (globalThis as any).useAuthStore }
        }
        
        return { available: false, error: 'useAuthStore not found' }
      } catch (error) {
        return { available: false, error: error.message }
      }
    })
    
    console.log("Auth store check:", authStoreCheck)
    
    // Check if we can see any console logs from auth store creation
    const logs: string[] = []
    page.on('console', msg => {
      logs.push(`${msg.type()}: ${msg.text()}`)
    })
    
    // Wait a moment for any initialization logs
    await page.waitForTimeout(2000)
    
    // Log all captured console messages
    console.log("=== Console Logs ===")
    logs.forEach(log => console.log(log))
    console.log("=== End Console Logs ===")
    
    // Try to trigger a form submission to see if login function is called
    await page.fill('[data-testid="username"]', "admin")
    await page.fill('[data-testid="password"]', "admin123")
    await page.click('[data-testid="login-button"]')
    
    // Wait for any authentication process
    await page.waitForTimeout(3000)
    
    // Log all captured console messages after form submission
    console.log("=== Console Logs After Form Submission ===")
    logs.forEach(log => console.log(log))
    console.log("=== End Console Logs After Form Submission ===")
  })
})
