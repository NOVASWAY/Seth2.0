import { test as base } from '@playwright/test'

export type AuthFixture = {
  authenticatedPage: any
  adminPage: any
  receptionistPage: any
  doctorPage: any
}

export const test = base.extend<AuthFixture>({
  authenticatedPage: async ({ page }, use) => {
    // Set test mode flag
    await page.addInitScript(() => {
      localStorage.setItem('testMode', 'true')
    })

    // Navigate to login
    await page.goto('/login')
    
    // Wait for login form to be ready
    await page.waitForSelector('[data-testid="username"]')
    
    // Login with default admin credentials
    await page.fill('[data-testid="username"]', 'admin')
    await page.fill('[data-testid="password"]', 'admin123')
    await page.click('[data-testid="login-button"]')
    
    // Wait for successful login and redirect
    await page.waitForURL('**/dashboard', { timeout: 10000 })
    
    await use(page)
  },

  adminPage: async ({ page }, use) => {
    // Set test mode flag
    await page.addInitScript(() => {
      localStorage.setItem('testMode', 'true')
    })

    // Navigate to login
    await page.goto('/login')
    
    // Wait for login form to be ready
    await page.waitForSelector('[data-testid="username"]')
    
    // Login as admin
    await page.fill('[data-testid="username"]', 'admin')
    await page.fill('[data-testid="password"]', 'admin123')
    await page.click('[data-testid="login-button"]')
    
    // Wait for successful login and redirect
    await page.waitForURL('**/dashboard', { timeout: 10000 })
    
    await use(page)
  },

  receptionistPage: async ({ page }, use) => {
    // Set test mode flag
    await page.addInitScript(() => {
      localStorage.setItem('testMode', 'true')
    })

    // Navigate to login
    await page.goto('/login')
    
    // Wait for login form to be ready
    await page.waitForSelector('[data-testid="username"]')
    
    // Login as receptionist
    await page.fill('[data-testid="username"]', 'receptionist')
    await page.fill('[data-testid="password"]', 'receptionist123')
    await page.click('[data-testid="login-button"]')
    
    // Wait for successful login and redirect
    await page.waitForURL('**/dashboard', { timeout: 10000 })
    
    await use(page)
  },

  doctorPage: async ({ page }, use) => {
    // Set test mode flag
    await page.addInitScript(() => {
      localStorage.setItem('testMode', 'true')
    })

    // Navigate to login
    await page.goto('/login')
    
    // Wait for login form to be ready
    await page.waitForSelector('[data-testid="username"]')
    
    // Login as doctor
    await page.fill('[data-testid="username"]', 'doctor')
    await page.fill('[data-testid="password"]', 'doctor123')
    await page.click('[data-testid="login-button"]')
    
    // Wait for successful login and redirect
    await page.waitForURL('**/dashboard', { timeout: 10000 })
    
    await use(page)
  },
})

export { expect } from '@playwright/test'
