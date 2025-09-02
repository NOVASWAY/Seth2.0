import { Page, expect } from '@playwright/test'

export class TestUtils {
  constructor(private page: Page) {}

  /**
   * Wait for authentication to complete
   */
  async waitForAuth() {
    await this.page.waitForURL('**/dashboard', { timeout: 10000 })
  }

  /**
   * Set test mode flag in localStorage
   */
  async setTestMode() {
    await this.page.addInitScript(() => {
      localStorage.setItem('testMode', 'true')
    })
  }

  /**
   * Clear all test data
   */
  async clearTestData() {
    await this.page.evaluate(() => {
      localStorage.clear()
      sessionStorage.clear()
    })
  }

  /**
   * Generate random test data
   */
  generateRandomData(prefix: string = 'test') {
    const timestamp = Date.now()
    const random = Math.random().toString(36).substring(7)
    return `${prefix}-${timestamp}-${random}`
  }

  /**
   * Wait for element and verify it's visible
   */
  async verifyElementVisible(selector: string, timeout = 10000) {
    await this.page.waitForSelector(selector, { timeout })
    await expect(this.page.locator(selector)).toBeVisible()
  }

  /**
   * Wait for element and verify it has specific text
   */
  async verifyElementText(selector: string, expectedText: string, timeout = 10000) {
    await this.page.waitForSelector(selector, { timeout })
    await expect(this.page.locator(selector)).toHaveText(expectedText)
  }

  /**
   * Fill form field with retry logic
   */
  async fillFormField(selector: string, value: string, retries = 3) {
    for (let i = 0; i < retries; i++) {
      try {
        await this.page.waitForSelector(selector, { timeout: 5000 })
        await this.page.fill(selector, value)
        return
      } catch (error) {
        if (i === retries - 1) throw error
        await this.page.waitForTimeout(1000)
      }
    }
  }

  /**
   * Click button with retry logic
   */
  async clickButton(selector: string, retries = 3) {
    for (let i = 0; i < retries; i++) {
      try {
        await this.page.waitForSelector(selector, { timeout: 5000 })
        await this.page.click(selector)
        return
      } catch (error) {
        if (i === retries - 1) throw error
        await this.page.waitForTimeout(1000)
      }
    }
  }

  /**
   * Wait for navigation to complete
   */
  async waitForNavigation() {
    await this.page.waitForLoadState('networkidle')
  }

  /**
   * Take screenshot on failure
   */
  async takeScreenshot(name: string) {
    await this.page.screenshot({ 
      path: `test-results/${name}-${Date.now()}.png`,
      fullPage: true 
    })
  }

  /**
   * Verify URL contains expected path
   */
  async verifyURL(path: string) {
    await expect(this.page).toHaveURL(new RegExp(path))
  }

  /**
   * Wait for toast notification
   */
  async waitForToast(message?: string, timeout = 5000) {
    if (message) {
      await this.page.waitForSelector(`text=${message}`, { timeout })
    } else {
      await this.page.waitForSelector('[data-testid="toast"]', { timeout })
    }
  }

  /**
   * Check if element exists
   */
  async elementExists(selector: string): Promise<boolean> {
    try {
      await this.page.waitForSelector(selector, { timeout: 1000 })
      return true
    } catch {
      return false
    }
  }

  /**
   * Get element count
   */
  async getElementCount(selector: string): Promise<number> {
    return await this.page.locator(selector).count()
  }
}

/**
 * Create test data for common scenarios
 */
export const TestData = {
  patients: {
    valid: {
      name: 'John Doe',
      phone: '123-456-7890',
      email: 'john.doe@example.com',
      dateOfBirth: '1990-01-01',
      age: '33',
      gender: 'Male'
    },
    minimal: {
      name: 'Jane Smith',
      phone: '098-765-4321'
    }
  },
  
  medications: {
    valid: {
      name: 'Amoxicillin',
      dosage: '500mg',
      frequency: '3 times daily',
      duration: '7 days'
    }
  },
  
  users: {
    admin: {
      username: 'admin',
      password: 'admin123'
    },
    receptionist: {
      username: 'receptionist',
      password: 'receptionist123'
    },
    doctor: {
      username: 'doctor',
      password: 'doctor123'
    }
  }
}

/**
 * Common selectors for testing
 */
export const Selectors = {
  auth: {
    username: '[data-testid="username"]',
    password: '[data-testid="password"]',
    loginButton: '[data-testid="login-button"]',
    logoutButton: '[data-testid="logout-button"]'
  },
  
  common: {
    submitButton: '[data-testid="submit-button"]',
    cancelButton: '[data-testid="cancel-button"]',
    saveButton: '[data-testid="save-button"]',
    deleteButton: '[data-testid="delete-button"]',
    editButton: '[data-testid="edit-button"]',
    addButton: '[data-testid="add-button"]'
  },
  
  forms: {
    patientName: '[data-testid="patient-name"]',
    patientPhone: '[data-testid="patient-phone"]',
    patientEmail: '[data-testid="patient-email"]',
    patientAge: '[data-testid="patient-age"]',
    patientDob: '[data-testid="patient-dob"]',
    patientGender: '[data-testid="patient-gender"]',
    patientAddress: '[data-testid="patient-address"]',
    patientNotes: '[data-testid="patient-notes"]'
  }
}
