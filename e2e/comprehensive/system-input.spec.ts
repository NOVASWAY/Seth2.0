import { test, expect } from "@playwright/test"

test.describe("System Input Interpretation & Validation", () => {
  test.beforeEach(async ({ page }) => {
    // Login before each test
    await page.goto("/login")
    await page.fill('[data-testid="username"]', "admin")
    await page.fill('[data-testid="password"]', "admin123")
    await page.click('[data-testid="login-button"]')
    await expect(page).toHaveURL("/dashboard")
  })

  test.describe("Text Input Validation", () => {
    test("should handle special characters in text fields", async ({ page }) => {
      await page.goto("/patients/register")
      
      const specialChars = "!@#$%^&*()_+-=[]{}|;':\",./<>?`~"
      await page.fill('[data-testid="patient-name"]', specialChars)
      await page.fill('[data-testid="patient-phone"]', "123-456-7890")
      
      // Should not crash or show errors for special characters
      await expect(page.locator('[data-testid="patient-name"]')).toHaveValue(specialChars)
    })

    test("should handle unicode characters", async ({ page }) => {
      await page.goto("/patients/register")
      
      const unicodeText = "José María O'Connor-Smith 你好世界"
      await page.fill('[data-testid="patient-name"]', unicodeText)
      
      await expect(page.locator('[data-testid="patient-name"]')).toHaveValue(unicodeText)
    })

    test("should handle very long text inputs", async ({ page }) => {
      await page.goto("/patients/register")
      
      const longText = "A".repeat(1000)
      await page.fill('[data-testid="patient-notes"]', longText)
      
      // Should handle long text without crashing
      await expect(page.locator('[data-testid="patient-notes"]')).toHaveValue(longText)
    })

    test("should handle empty and whitespace-only inputs", async ({ page }) => {
      await page.goto("/patients/register")
      
      // Test empty input
      await page.fill('[data-testid="patient-name"]', "")
      await page.click('[data-testid="submit-button"]')
      
      // Should show validation error
      await expect(page.locator('[data-testid="error-message"]')).toBeVisible()
      
      // Test whitespace-only input
      await page.fill('[data-testid="patient-name"]', "   ")
      await page.click('[data-testid="submit-button"]')
      
      // Should show validation error
      await expect(page.locator('[data-testid="error-message"]')).toBeVisible()
    })
  })

  test.describe("Numeric Input Validation", () => {
    test("should handle phone number formats", async ({ page }) => {
      await page.goto("/patients/register")
      
      const phoneNumbers = [
        "123-456-7890",
        "(123) 456-7890",
        "123.456.7890",
        "1234567890",
        "+1-123-456-7890"
      ]
      
      for (const phone of phoneNumbers) {
        await page.fill('[data-testid="patient-phone"]', phone)
        await expect(page.locator('[data-testid="patient-phone"]')).toHaveValue(phone)
      }
    })

    test("should handle age validation", async ({ page }) => {
      await page.goto("/patients/register")
      
      // Test valid ages
      const validAges = ["0", "1", "18", "65", "120"]
      for (const age of validAges) {
        await page.fill('[data-testid="patient-age"]', age)
        await expect(page.locator('[data-testid="patient-age"]')).toHaveValue(age)
      }
      
      // Test invalid ages
      const invalidAges = ["-1", "150", "abc", "12.5"]
      for (const age of invalidAges) {
        await page.fill('[data-testid="patient-age"]', age)
        await page.click('[data-testid="submit-button"]')
        // Should show validation error
        await expect(page.locator('[data-testid="error-message"]')).toBeVisible()
      }
    })

    test("should handle price/currency inputs", async ({ page }) => {
      await page.goto("/inventory")
      
      const prices = [
        "0.00",
        "10.50",
        "1000.99",
        "0",
        "1000000"
      ]
      
      for (const price of prices) {
        await page.fill('[data-testid="item-price"]', price)
        await expect(page.locator('[data-testid="item-price"]')).toHaveValue(price)
      }
    })
  })

  test.describe("Date Input Validation", () => {
    test("should handle various date formats", async ({ page }) => {
      await page.goto("/patients/register")
      
      const dates = [
        "2024-01-01",
        "2024-12-31",
        "2000-02-29", // Leap year
        "2023-02-28"  // Non-leap year
      ]
      
      for (const date of dates) {
        await page.fill('[data-testid="patient-dob"]', date)
        await expect(page.locator('[data-testid="patient-dob"]')).toHaveValue(date)
      }
    })

    test("should reject invalid dates", async ({ page }) => {
      await page.goto("/patients/register")
      
      const invalidDates = [
        "2024-13-01", // Invalid month
        "2024-01-32", // Invalid day
        "2024-02-30", // Invalid day for February
        "2023-02-29", // Invalid leap day in non-leap year
        "abc",
        "2024/01/01", // Wrong format
        "01-01-2024"  // Wrong format
      ]
      
      for (const date of invalidDates) {
        await page.fill('[data-testid="patient-dob"]', date)
        await page.click('[data-testid="submit-button"]')
        await expect(page.locator('[data-testid="error-message"]')).toBeVisible()
      }
    })
  })

  test.describe("Email Input Validation", () => {
    test("should accept valid email formats", async ({ page }) => {
      await page.goto("/patients/register")
      
      const validEmails = [
        "test@example.com",
        "user.name@domain.co.uk",
        "user+tag@example.org",
        "123@numbers.com",
        "test.email@subdomain.example.com"
      ]
      
      for (const email of validEmails) {
        await page.fill('[data-testid="patient-email"]', email)
        await expect(page.locator('[data-testid="patient-email"]')).toHaveValue(email)
      }
    })

    test("should reject invalid email formats", async ({ page }) => {
      await page.goto("/patients/register")
      
      const invalidEmails = [
        "invalid-email",
        "@example.com",
        "user@",
        "user@.com",
        "user..name@example.com",
        "user@example..com"
      ]
      
      for (const email of invalidEmails) {
        await page.fill('[data-testid="patient-email"]', email)
        await page.click('[data-testid="submit-button"]')
        await expect(page.locator('[data-testid="error-message"]')).toBeVisible()
      }
    })
  })

  test.describe("File Upload Validation", () => {
    test("should handle image uploads", async ({ page }) => {
      await page.goto("/patients/register")
      
      // Test with a small image file
      await page.setInputFiles('[data-testid="patient-photo"]', {
        name: 'test-image.jpg',
        mimeType: 'image/jpeg',
        buffer: Buffer.from('fake-image-data')
      })
      
      await expect(page.locator('[data-testid="upload-success"]')).toBeVisible()
    })

    test("should reject invalid file types", async ({ page }) => {
      await page.goto("/patients/register")
      
      // Test with invalid file type
      await page.setInputFiles('[data-testid="patient-photo"]', {
        name: 'test.txt',
        mimeType: 'text/plain',
        buffer: Buffer.from('fake-text-data')
      })
      
      await expect(page.locator('[data-testid="upload-error"]')).toBeVisible()
    })
  })

  test.describe("Form Submission Edge Cases", () => {
    test("should handle rapid form submissions", async ({ page }) => {
      await page.goto("/patients/register")
      
      // Fill form
      await page.fill('[data-testid="patient-name"]', "Test Patient")
      await page.fill('[data-testid="patient-phone"]', "123-456-7890")
      
      // Rapidly click submit multiple times
      for (let i = 0; i < 5; i++) {
        await page.click('[data-testid="submit-button"]')
      }
      
      // Should only process one submission
      await expect(page).toHaveURL(/\/patients\/\d+/) // Should redirect to patient detail
    })

    test("should handle form submission with network issues", async ({ page }) => {
      await page.goto("/patients/register")
      
      // Fill form
      await page.fill('[data-testid="patient-name"]', "Test Patient")
      await page.fill('[data-testid="patient-phone"]', "123-456-7890")
      
      // Simulate network failure
      await page.route('**/api/patients', route => route.abort())
      
      await page.click('[data-testid="submit-button"]')
      
      // Should show error message
      await expect(page.locator('[data-testid="error-message"]')).toBeVisible()
    })
  })

  test.describe("Search and Filter Inputs", () => {
    test("should handle search queries with special characters", async ({ page }) => {
      await page.goto("/patients")
      
      const searchQueries = [
        "O'Connor",
        "José María",
        "Smith & Sons",
        "Test@123",
        "Patient (VIP)",
        "Dr. Smith's Patient"
      ]
      
      for (const query of searchQueries) {
        await page.fill('[data-testid="search-input"]', query)
        await page.click('[data-testid="search-button"]')
        
        // Should not crash and should show results or no results message
        await expect(page.locator('[data-testid="search-results"]')).toBeVisible()
      }
    })

    test("should handle empty search queries", async ({ page }) => {
      await page.goto("/patients")
      
      await page.fill('[data-testid="search-input"]', "")
      await page.click('[data-testid="search-button"]')
      
      // Should show all patients or appropriate message
      await expect(page.locator('[data-testid="patient-list"]')).toBeVisible()
    })
  })
})
