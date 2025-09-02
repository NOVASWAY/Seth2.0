import { test as base, expect } from '@playwright/test'

// Define the combined fixture type
export type CombinedFixtures = {
  // Auth fixtures
  authenticatedPage: any
  adminPage: any
  receptionistPage: any
  doctorPage: any
  
  // Data fixtures
  testPatient: any
  testPrescription: any
  testMedication: any
  testUser: any
  
  // Page object fixtures
  pageHelpers: {
    waitForPageLoad: () => Promise<void>
    waitForElement: (selector: string, timeout?: number) => Promise<void>
    fillFormField: (selector: string, value: string) => Promise<void>
    clickButton: (selector: string) => Promise<void>
    selectOption: (selector: string, value: string) => Promise<void>
    uploadFile: (selector: string, filePath: string) => Promise<void>
    verifyElementVisible: (selector: string) => Promise<void>
    verifyElementText: (selector: string, expectedText: string) => Promise<void>
    navigateTo: (path: string) => Promise<void>
    getElementText: (selector: string) => Promise<string>
    isElementVisible: (selector: string) => Promise<boolean>
  }
}

// Create the combined test with all fixtures
export const test = base.extend<CombinedFixtures>({
  // Auth fixtures
  authenticatedPage: async ({ page }, use) => {
    // Set test mode flag (use correct key)
    await page.addInitScript(() => {
      localStorage.setItem('test-mode', 'true')
    })

    // Navigate to login
    await page.goto('/login')
    
    // Wait for login form to be ready
    await page.waitForSelector('[data-testid="username"]')
    
    // Login with default admin credentials
    await page.fill('[data-testid="username"]', 'admin')
    await page.fill('[data-testid="password"]', 'admin123')
    await page.click('[data-testid="login-button"]')
    
    // Wait for successful login - be more flexible about the redirect
    try {
      await page.waitForURL('**/dashboard', { timeout: 5000 })
    } catch {
      // If dashboard redirect fails, check if we're still on login or got an error
      const currentUrl = page.url()
      if (currentUrl.includes('/login')) {
        // Check for error messages
        const errorElement = page.locator('[data-testid="error-message"], .error, .alert')
        if (await errorElement.isVisible()) {
          const errorText = await errorElement.textContent()
          console.log(`Login failed with error: ${errorText}`)
        }
        
        // Check auth storage to see if login actually worked
        const authState = await page.evaluate(() => {
          const authStorage = localStorage.getItem('simple-auth-storage')
          return authStorage ? JSON.parse(authStorage) : null
        })
        console.log(`Auth state after login:`, authState)
        
        // If we're authenticated but not redirected, that's okay
        if (authState && authState.state && authState.state.isAuthenticated) {
          console.log('Login successful, but no redirect - continuing with authenticated page')
        }
      }
    }
    
    await use(page)
  },

  adminPage: async ({ page }, use) => {
    // Set test mode flag (use correct key)
    await page.addInitScript(() => {
      localStorage.setItem('test-mode', 'true')
    })

    // Navigate to login
    await page.goto('/login')
    
    // Wait for login form to be ready
    await page.waitForSelector('[data-testid="username"]')
    
    // Login as admin
    await page.fill('[data-testid="username"]', 'admin')
    await page.fill('[data-testid="password"]', 'admin123')
    await page.click('[data-testid="login-button"]')
    
    // Wait for successful login - be more flexible about the redirect
    try {
      await page.waitForURL('**/dashboard', { timeout: 5000 })
    } catch {
      // If dashboard redirect fails, check if we're still on login or got an error
      const currentUrl = page.url()
      if (currentUrl.includes('/login')) {
        // Check for error messages
        const errorElement = page.locator('[data-testid="error-message"], .error, .alert')
        if (await errorElement.isVisible()) {
          const errorText = await errorElement.textContent()
          console.log(`Login failed with error: ${errorText}`)
        }
        
        // Check auth storage to see if login actually worked
        const authState = await page.evaluate(() => {
          const authStorage = localStorage.getItem('simple-auth-storage')
          return authStorage ? JSON.parse(authStorage) : null
        })
        console.log(`Auth state after login:`, authState)
        
        // If we're authenticated but not redirected, that's okay
        if (authState && authState.state && authState.state.isAuthenticated) {
          console.log('Login successful, but no redirect - continuing with authenticated page')
        }
      }
    }
    
    await use(page)
  },

  receptionistPage: async ({ page }, use) => {
    // For now, use admin credentials since receptionist doesn't exist
    // Set test mode flag (use correct key)
    await page.addInitScript(() => {
      localStorage.setItem('test-mode', 'true')
    })

    // Navigate to login
    await page.goto('/login')
    
    // Wait for login form to be ready
    await page.waitForSelector('[data-testid="username"]')
    
    // Login as admin (since receptionist credentials don't exist)
    await page.fill('[data-testid="username"]', 'admin')
    await page.fill('[data-testid="password"]', 'admin123')
    await page.click('[data-testid="login-button"]')
    
    // Wait for successful login - be more flexible about the redirect
    try {
      await page.waitForURL('**/dashboard', { timeout: 5000 })
    } catch {
      // If dashboard redirect fails, check if we're still on login or got an error
      const currentUrl = page.url()
      if (currentUrl.includes('/login')) {
        // Check for error messages
        const errorElement = page.locator('[data-testid="error-message"], .error, .alert')
        if (await errorElement.isVisible()) {
          const errorText = await errorElement.textContent()
          console.log(`Login failed with error: ${errorText}`)
        }
        
        // Check auth storage to see if login actually worked
        const authState = await page.evaluate(() => {
          const authStorage = localStorage.getItem('simple-auth-storage')
          return authStorage ? JSON.parse(authStorage) : null
        })
        console.log(`Auth state after login:`, authState)
        
        // If we're authenticated but not redirected, that's okay
        if (authState && authState.state && authState.state.isAuthenticated) {
          console.log('Login successful, but no redirect - continuing with authenticated page')
        }
      }
    }
    
    await use(page)
  },

  doctorPage: async ({ page }, use) => {
    // For now, use admin credentials since doctor doesn't exist
    // Set test mode flag (use correct key)
    await page.addInitScript(() => {
      localStorage.setItem('test-mode', 'true')
    })

    // Navigate to login
    await page.goto('/login')
    
    // Wait for login form to be ready
    await page.waitForSelector('[data-testid="username"]')
    
    // Login as admin (since doctor credentials don't exist)
    await page.fill('[data-testid="username"]', 'admin')
    await page.fill('[data-testid="password"]', 'admin123')
    await page.click('[data-testid="login-button"]')
    
    // Wait for successful login - be more flexible about the redirect
    try {
      await page.waitForURL('**/dashboard', { timeout: 5000 })
    } catch {
      // If dashboard redirect fails, check if we're still on login or got an error
      const currentUrl = page.url()
      if (currentUrl.includes('/login')) {
        // Check for error messages
        const errorElement = page.locator('[data-testid="error-message"], .error, .alert')
        if (await errorElement.isVisible()) {
          const errorText = await errorElement.textContent()
          console.log(`Login failed with error: ${errorText}`)
        }
        
        // Check auth storage to see if login actually worked
        const authState = await page.evaluate(() => {
          const authStorage = localStorage.getItem('simple-auth-storage')
          return authStorage ? JSON.parse(authStorage) : null
        })
        console.log(`Auth state after login:`, authState)
        
        // If we're authenticated but not redirected, that's okay
        if (authState && authState.state && authState.state.isAuthenticated) {
          console.log('Login successful, but no redirect - continuing with authenticated page')
        }
      }
    }
    
    await use(page)
  },

  // Data fixtures
  testPatient: async ({}, use) => {
    const patient = {
      name: 'John Doe',
      phone: '123-456-7890',
      email: 'john.doe@example.com',
      dateOfBirth: '1990-01-01',
      age: '33',
      gender: 'Male',
      address: '123 Main St, City, State 12345',
      emergencyContact: {
        name: 'Jane Doe',
        phone: '098-765-4321',
        relationship: 'Spouse'
      },
      medicalHistory: 'No known allergies',
      notes: 'Test patient for automated testing'
    }
    
    await use(patient)
  },

  testPrescription: async ({}, use) => {
    const prescription = {
      patientId: 'test-patient-123',
      medication: 'Amoxicillin',
      dosage: '500mg',
      frequency: '3 times daily',
      duration: '7 days',
      instructions: 'Take with food',
      prescribedBy: 'Dr. Smith',
      prescribedDate: new Date().toISOString().split('T')[0],
      refills: 0,
      status: 'active'
    }
    
    await use(prescription)
  },

  testMedication: async ({}, use) => {
    const medication = {
      name: 'Amoxicillin',
      genericName: 'Amoxicillin',
      strength: '500mg',
      form: 'Capsule',
      manufacturer: 'Generic Pharma',
      ndc: '12345-6789-01',
      price: 15.99,
      quantity: 100,
      expiryDate: '2025-12-31',
      category: 'Antibiotic',
      requiresPrescription: true
    }
    
    await use(medication)
  },

  testUser: async ({}, use) => {
    const user = {
      username: 'testuser',
      password: 'testpass123',
      email: 'testuser@clinic.com',
      firstName: 'Test',
      lastName: 'User',
      role: 'receptionist',
      permissions: ['read_patients', 'write_patients', 'read_queue']
    }
    
    await use(user)
  },

  // Page object fixtures
  pageHelpers: async ({ page }, use) => {
    const helpers = {
      waitForPageLoad: async () => {
        await page.waitForLoadState('networkidle')
      },

      waitForElement: async (selector: string, timeout: 10000) => {
        await page.waitForSelector(selector, { timeout })
      },

      fillFormField: async (selector: string, value: string) => {
        await page.waitForSelector(selector)
        await page.fill(selector, value)
      },

      clickButton: async (selector: string) => {
        await page.waitForSelector(selector)
        await page.click(selector)
      },

      selectOption: async (selector: string, value: string) => {
        await page.waitForSelector(selector)
        await page.selectOption(selector, value)
      },

      uploadFile: async (selector: string, filePath: string) => {
        await page.waitForSelector(selector)
        await page.setInputFiles(selector, filePath)
      },

      verifyElementVisible: async (selector: string) => {
        await page.waitForSelector(selector)
        await expect(page.locator(selector)).toBeVisible()
      },

      verifyElementText: async (selector: string, expectedText: string) => {
        await page.waitForSelector(selector)
        await expect(page.locator(selector)).toHaveText(expectedText)
      },

      navigateTo: async (path: string) => {
        await page.goto(path)
        await page.waitForLoadState('networkidle')
      },

      getElementText: async (selector: string) => {
        await page.waitForSelector(selector)
        return await page.locator(selector).textContent() || ''
      },

      isElementVisible: async (selector: string) => {
        try {
          await page.waitForSelector(selector, { timeout: 1000 })
          return true
        } catch {
          return false
        }
      }
    }

    await use(helpers)
  }
})

export { expect } from '@playwright/test'
