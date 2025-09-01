import { test, expect } from "@playwright/test"

test.describe("Patient Management System", () => {
  test.beforeEach(async ({ page }) => {
    // Login before each test
    await page.goto("/login")
    await page.fill('[data-testid="username"]', "admin")
    await page.fill('[data-testid="password"]', "admin123")
    await page.click('[data-testid="login-button"]')
    await expect(page).toHaveURL("/dashboard")
  })

  test.describe("Patient Registration", () => {
    test("should register a new patient with complete information", async ({ page }) => {
      await page.goto("/patients/register")
      
      // Fill all required fields
      await page.fill('[data-testid="patient-name"]', "John Doe")
      await page.fill('[data-testid="patient-phone"]', "123-456-7890")
      await page.fill('[data-testid="patient-email"]', "john.doe@example.com")
      await page.fill('[data-testid="patient-dob"]', "1990-01-01")
      await page.fill('[data-testid="patient-address"]', "123 Main St, City, State 12345")
      await page.selectOption('[data-testid="patient-gender"]', "male")
      await page.fill('[data-testid="patient-emergency-contact"]', "Jane Doe")
      await page.fill('[data-testid="patient-emergency-phone"]', "098-765-4321")
      
      await page.click('[data-testid="submit-button"]')
      
      // Should redirect to patient detail page
      await expect(page).toHaveURL(/\/patients\/\d+/)
      await expect(page.locator('[data-testid="patient-name"]')).toContainText("John Doe")
    })

    test("should register patient with minimal required information", async ({ page }) => {
      await page.goto("/patients/register")
      
      // Fill only required fields
      await page.fill('[data-testid="patient-name"]', "Jane Smith")
      await page.fill('[data-testid="patient-phone"]', "555-123-4567")
      
      await page.click('[data-testid="submit-button"]')
      
      await expect(page).toHaveURL(/\/patients\/\d+/)
    })

    test("should show validation errors for missing required fields", async ({ page }) => {
      await page.goto("/patients/register")
      
      // Try to submit without filling required fields
      await page.click('[data-testid="submit-button"]')
      
      await expect(page.locator('[data-testid="error-message"]')).toBeVisible()
      await expect(page.locator('[data-testid="error-message"]')).toContainText("required")
    })

    test("should handle duplicate patient registration", async ({ page }) => {
      await page.goto("/patients/register")
      
      // Register first patient
      await page.fill('[data-testid="patient-name"]', "Duplicate Patient")
      await page.fill('[data-testid="patient-phone"]', "111-222-3333")
      await page.click('[data-testid="submit-button"]')
      
      await expect(page).toHaveURL(/\/patients\/\d+/)
      
      // Try to register same patient again
      await page.goto("/patients/register")
      await page.fill('[data-testid="patient-name"]', "Duplicate Patient")
      await page.fill('[data-testid="patient-phone"]', "111-222-3333")
      await page.click('[data-testid="submit-button"]')
      
      // Should show duplicate error
      await expect(page.locator('[data-testid="error-message"]')).toContainText("already exists")
    })
  })

  test.describe("Patient Search and Filtering", () => {
    test("should search patients by name", async ({ page }) => {
      await page.goto("/patients")
      
      await page.fill('[data-testid="search-input"]', "John")
      await page.click('[data-testid="search-button"]')
      
      await expect(page.locator('[data-testid="search-results"]')).toBeVisible()
    })

    test("should search patients by phone number", async ({ page }) => {
      await page.goto("/patients")
      
      await page.fill('[data-testid="search-input"]', "123-456")
      await page.click('[data-testid="search-button"]')
      
      await expect(page.locator('[data-testid="search-results"]')).toBeVisible()
    })

    test("should filter patients by age range", async ({ page }) => {
      await page.goto("/patients")
      
      await page.fill('[data-testid="min-age"]', "18")
      await page.fill('[data-testid="max-age"]', "65")
      await page.click('[data-testid="filter-button"]')
      
      await expect(page.locator('[data-testid="filtered-results"]')).toBeVisible()
    })

    test("should filter patients by gender", async ({ page }) => {
      await page.goto("/patients")
      
      await page.selectOption('[data-testid="gender-filter"]', "female")
      await page.click('[data-testid="filter-button"]')
      
      await expect(page.locator('[data-testid="filtered-results"]')).toBeVisible()
    })

    test("should handle no search results", async ({ page }) => {
      await page.goto("/patients")
      
      await page.fill('[data-testid="search-input"]', "NonExistentPatient")
      await page.click('[data-testid="search-button"]')
      
      await expect(page.locator('[data-testid="no-results"]')).toBeVisible()
    })
  })

  test.describe("Patient Details and Editing", () => {
    test("should view patient details", async ({ page }) => {
      await page.goto("/patients")
      
      // Click on first patient in list
      await page.click('[data-testid="patient-row"]:first-child')
      
      await expect(page).toHaveURL(/\/patients\/\d+/)
      await expect(page.locator('[data-testid="patient-details"]')).toBeVisible()
    })

    test("should edit patient information", async ({ page }) => {
      await page.goto("/patients")
      await page.click('[data-testid="patient-row"]:first-child')
      
      await page.click('[data-testid="edit-button"]')
      
      // Update patient information
      await page.fill('[data-testid="patient-address"]', "456 New Address St")
      await page.fill('[data-testid="patient-email"]', "updated@example.com")
      
      await page.click('[data-testid="save-button"]')
      
      await expect(page.locator('[data-testid="success-message"]')).toBeVisible()
      await expect(page.locator('[data-testid="patient-address"]')).toContainText("456 New Address St")
    })

    test("should add medical history", async ({ page }) => {
      await page.goto("/patients")
      await page.click('[data-testid="patient-row"]:first-child')
      
      await page.click('[data-testid="add-medical-history"]')
      
      await page.fill('[data-testid="condition"]', "Hypertension")
      await page.fill('[data-testid="diagnosis-date"]', "2023-01-15")
      await page.fill('[data-testid="notes"]', "Patient has high blood pressure")
      
      await page.click('[data-testid="save-history"]')
      
      await expect(page.locator('[data-testid="medical-history"]')).toContainText("Hypertension")
    })
  })

  test.describe("Patient Deletion and Archiving", () => {
    test("should archive patient", async ({ page }) => {
      await page.goto("/patients")
      await page.click('[data-testid="patient-row"]:first-child')
      
      await page.click('[data-testid="archive-button"]')
      await page.click('[data-testid="confirm-archive"]')
      
      await expect(page.locator('[data-testid="success-message"]')).toContainText("archived")
    })

    test("should restore archived patient", async ({ page }) => {
      await page.goto("/patients/archived")
      
      await page.click('[data-testid="patient-row"]:first-child')
      await page.click('[data-testid="restore-button"]')
      
      await expect(page.locator('[data-testid="success-message"]')).toContainText("restored")
    })

    test("should permanently delete patient", async ({ page }) => {
      await page.goto("/patients/archived")
      
      await page.click('[data-testid="patient-row"]:first-child')
      await page.click('[data-testid="delete-permanently"]')
      
      // Should show confirmation dialog
      await expect(page.locator('[data-testid="delete-confirmation"]')).toBeVisible()
      
      await page.click('[data-testid="confirm-delete"]')
      
      await expect(page.locator('[data-testid="success-message"]')).toContainText("deleted")
    })
  })

  test.describe("Patient Data Export", () => {
    test("should export patient data to CSV", async ({ page }) => {
      await page.goto("/patients")
      
      await page.click('[data-testid="export-button"]')
      await page.click('[data-testid="export-csv"]')
      
      // Should trigger download
      const downloadPromise = page.waitForEvent('download')
      await page.click('[data-testid="confirm-export"]')
      const download = await downloadPromise
      
      expect(download.suggestedFilename()).toMatch(/patients.*\.csv/)
    })

    test("should export patient data to PDF", async ({ page }) => {
      await page.goto("/patients")
      
      await page.click('[data-testid="export-button"]')
      await page.click('[data-testid="export-pdf"]')
      
      const downloadPromise = page.waitForEvent('download')
      await page.click('[data-testid="confirm-export"]')
      const download = await downloadPromise
      
      expect(download.suggestedFilename()).toMatch(/patients.*\.pdf/)
    })
  })

  test.describe("Patient Queue Management", () => {
    test("should add patient to queue", async ({ page }) => {
      await page.goto("/patients")
      await page.click('[data-testid="patient-row"]:first-child')
      
      await page.click('[data-testid="add-to-queue"]')
      await page.selectOption('[data-testid="queue-priority"]', "high")
      await page.fill('[data-testid="queue-notes"]', "Urgent consultation needed")
      
      await page.click('[data-testid="confirm-add-queue"]')
      
      await expect(page.locator('[data-testid="success-message"]')).toContainText("added to queue")
    })

    test("should view patient in queue", async ({ page }) => {
      await page.goto("/dashboard")
      
      await expect(page.locator('[data-testid="queue-list"]')).toBeVisible()
      await expect(page.locator('[data-testid="queue-item"]')).toBeVisible()
    })

    test("should remove patient from queue", async ({ page }) => {
      await page.goto("/dashboard")
      
      await page.click('[data-testid="queue-item"]:first-child')
      await page.click('[data-testid="remove-from-queue"]')
      
      await expect(page.locator('[data-testid="success-message"]')).toContainText("removed from queue")
    })
  })
})
