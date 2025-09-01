import { test, expect } from "@playwright/test"

test.describe("Prescription System", () => {
  test.beforeEach(async ({ page }) => {
    // Login before each test
    await page.goto("/login")
    await page.fill('[data-testid="username"]', "admin")
    await page.fill('[data-testid="password"]', "admin123")
    await page.click('[data-testid="login-button"]')
    await expect(page).toHaveURL("/dashboard")
  })

  test.describe("Prescription Creation", () => {
    test("should create a new prescription", async ({ page }) => {
      await page.goto("/prescriptions/new")
      
      // Select patient
      await page.click('[data-testid="patient-selector"]')
      await page.click('[data-testid="patient-option"]:first-child')
      
      // Add medication
      await page.click('[data-testid="add-medication"]')
      await page.fill('[data-testid="medication-name"]', "Amoxicillin")
      await page.fill('[data-testid="dosage"]', "500mg")
      await page.fill('[data-testid="frequency"]', "3 times daily")
      await page.fill('[data-testid="duration"]', "7 days")
      await page.fill('[data-testid="instructions"]', "Take with food")
      
      await page.click('[data-testid="save-medication"]')
      
      // Add diagnosis
      await page.fill('[data-testid="diagnosis"]', "Upper respiratory infection")
      
      await page.click('[data-testid="create-prescription"]')
      
      await expect(page.locator('[data-testid="success-message"]')).toContainText("Prescription created")
    })

    test("should validate medication dosage", async ({ page }) => {
      await page.goto("/prescriptions/new")
      
      await page.click('[data-testid="patient-selector"]')
      await page.click('[data-testid="patient-option"]:first-child')
      
      await page.click('[data-testid="add-medication"]')
      await page.fill('[data-testid="medication-name"]', "Paracetamol")
      
      // Test invalid dosage
      await page.fill('[data-testid="dosage"]', "5000mg") // Too high
      await page.click('[data-testid="save-medication"]')
      
      await expect(page.locator('[data-testid="error-message"]')).toContainText("dosage")
      
      // Test valid dosage
      await page.fill('[data-testid="dosage"]', "500mg")
      await page.click('[data-testid="save-medication"]')
      
      await expect(page.locator('[data-testid="medication-list"]')).toContainText("Paracetamol")
    })

    test("should check for drug interactions", async ({ page }) => {
      await page.goto("/prescriptions/new")
      
      await page.click('[data-testid="patient-selector"]')
      await page.click('[data-testid="patient-option"]:first-child')
      
      // Add first medication
      await page.click('[data-testid="add-medication"]')
      await page.fill('[data-testid="medication-name"]', "Warfarin")
      await page.fill('[data-testid="dosage"]', "5mg")
      await page.click('[data-testid="save-medication"]')
      
      // Add interacting medication
      await page.click('[data-testid="add-medication"]')
      await page.fill('[data-testid="medication-name"]', "Aspirin")
      await page.fill('[data-testid="dosage"]', "100mg")
      await page.click('[data-testid="save-medication"]')
      
      // Should show interaction warning
      await expect(page.locator('[data-testid="interaction-warning"]')).toBeVisible()
      await expect(page.locator('[data-testid="interaction-warning"]')).toContainText("Warfarin")
    })

    test("should calculate dosage based on patient weight", async ({ page }) => {
      await page.goto("/prescriptions/new")
      
      await page.click('[data-testid="patient-selector"]')
      await page.click('[data-testid="patient-option"]:first-child')
      
      await page.click('[data-testid="add-medication"]')
      await page.fill('[data-testid="medication-name"]', "Gentamicin")
      await page.selectOption('[data-testid="dosage-type"]', "weight-based")
      await page.fill('[data-testid="dosage-per-kg"]', "2mg/kg")
      
      // System should calculate dosage based on patient weight
      await expect(page.locator('[data-testid="calculated-dosage"]')).toContainText("120mg") // Assuming 60kg patient
    })
  })

  test.describe("Prescription Management", () => {
    test("should view prescription history", async ({ page }) => {
      await page.goto("/prescriptions")
      
      await expect(page.locator('[data-testid="prescription-list"]')).toBeVisible()
      await expect(page.locator('[data-testid="prescription-item"]')).toBeVisible()
    })

    test("should edit existing prescription", async ({ page }) => {
      await page.goto("/prescriptions")
      await page.click('[data-testid="prescription-item"]:first-child')
      
      await page.click('[data-testid="edit-prescription"]')
      
      // Modify dosage
      await page.fill('[data-testid="dosage"]', "750mg")
      await page.fill('[data-testid="instructions"]', "Take with food, avoid alcohol")
      
      await page.click('[data-testid="save-prescription"]')
      
      await expect(page.locator('[data-testid="success-message"]')).toContainText("updated")
    })

    test("should refill prescription", async ({ page }) => {
      await page.goto("/prescriptions")
      await page.click('[data-testid="prescription-item"]:first-child')
      
      await page.click('[data-testid="refill-prescription"]')
      
      // Should create new prescription with same details
      await expect(page.locator('[data-testid="success-message"]')).toContainText("refilled")
    })

    test("should discontinue prescription", async ({ page }) => {
      await page.goto("/prescriptions")
      await page.click('[data-testid="prescription-item"]:first-child')
      
      await page.click('[data-testid="discontinue-prescription"]')
      await page.fill('[data-testid="discontinuation-reason"]', "Patient allergic reaction")
      await page.click('[data-testid="confirm-discontinue"]')
      
      await expect(page.locator('[data-testid="success-message"]')).toContainText("discontinued")
    })
  })

  test.describe("Medication Inventory Integration", () => {
    test("should check medication availability", async ({ page }) => {
      await page.goto("/prescriptions/new")
      
      await page.click('[data-testid="patient-selector"]')
      await page.click('[data-testid="patient-option"]:first-child')
      
      await page.click('[data-testid="add-medication"]')
      await page.fill('[data-testid="medication-name"]', "Rare Medication")
      
      // Should show low stock warning
      await expect(page.locator('[data-testid="low-stock-warning"]')).toBeVisible()
    })

    test("should suggest alternatives for out-of-stock medications", async ({ page }) => {
      await page.goto("/prescriptions/new")
      
      await page.click('[data-testid="patient-selector"]')
      await page.click('[data-testid="patient-option"]:first-child')
      
      await page.click('[data-testid="add-medication"]')
      await page.fill('[data-testid="medication-name"]', "Out of Stock Med")
      
      // Should show alternative suggestions
      await expect(page.locator('[data-testid="alternative-suggestions"]')).toBeVisible()
      await expect(page.locator('[data-testid="alternative-option"]')).toBeVisible()
    })
  })

  test.describe("Prescription Printing and Export", () => {
    test("should print prescription", async ({ page }) => {
      await page.goto("/prescriptions")
      await page.click('[data-testid="prescription-item"]:first-child')
      
      await page.click('[data-testid="print-prescription"]')
      
      // Should open print dialog or generate PDF
      await expect(page.locator('[data-testid="print-preview"]')).toBeVisible()
    })

    test("should export prescription to PDF", async ({ page }) => {
      await page.goto("/prescriptions")
      await page.click('[data-testid="prescription-item"]:first-child')
      
      const downloadPromise = page.waitForEvent('download')
      await page.click('[data-testid="export-pdf"]')
      const download = await downloadPromise
      
      expect(download.suggestedFilename()).toMatch(/prescription.*\.pdf/)
    })

    test("should send prescription to pharmacy", async ({ page }) => {
      await page.goto("/prescriptions")
      await page.click('[data-testid="prescription-item"]:first-child')
      
      await page.click('[data-testid="send-to-pharmacy"]')
      await page.fill('[data-testid="pharmacy-email"]', "pharmacy@example.com")
      await page.click('[data-testid="send-prescription"]')
      
      await expect(page.locator('[data-testid="success-message"]')).toContainText("sent to pharmacy")
    })
  })

  test.describe("Prescription Analytics", () => {
    test("should view prescription statistics", async ({ page }) => {
      await page.goto("/prescriptions/analytics")
      
      await expect(page.locator('[data-testid="prescription-stats"]')).toBeVisible()
      await expect(page.locator('[data-testid="medication-usage-chart"]')).toBeVisible()
    })

    test("should filter prescriptions by date range", async ({ page }) => {
      await page.goto("/prescriptions/analytics")
      
      await page.fill('[data-testid="start-date"]', "2024-01-01")
      await page.fill('[data-testid="end-date"]', "2024-12-31")
      await page.click('[data-testid="apply-filter"]')
      
      await expect(page.locator('[data-testid="filtered-stats"]')).toBeVisible()
    })

    test("should view most prescribed medications", async ({ page }) => {
      await page.goto("/prescriptions/analytics")
      
      await expect(page.locator('[data-testid="top-medications"]')).toBeVisible()
      await expect(page.locator('[data-testid="medication-rank"]')).toBeVisible()
    })
  })

  test.describe("Prescription Safety Checks", () => {
    test("should validate age-appropriate medications", async ({ page }) => {
      await page.goto("/prescriptions/new")
      
      // Select a pediatric patient
      await page.click('[data-testid="patient-selector"]')
      await page.click('[data-testid="pediatric-patient"]')
      
      await page.click('[data-testid="add-medication"]')
      await page.fill('[data-testid="medication-name"]', "Adult-only medication")
      
      // Should show age restriction warning
      await expect(page.locator('[data-testid="age-restriction-warning"]')).toBeVisible()
    })

    test("should check for duplicate prescriptions", async ({ page }) => {
      await page.goto("/prescriptions/new")
      
      await page.click('[data-testid="patient-selector"]')
      await page.click('[data-testid="patient-option"]:first-child')
      
      await page.click('[data-testid="add-medication"]')
      await page.fill('[data-testid="medication-name"]', "Already Prescribed Med")
      
      // Should show duplicate warning
      await expect(page.locator('[data-testid="duplicate-warning"]')).toBeVisible()
    })

    test("should validate pregnancy-safe medications", async ({ page }) => {
      await page.goto("/prescriptions/new")
      
      // Select pregnant patient
      await page.click('[data-testid="patient-selector"]')
      await page.click('[data-testid="pregnant-patient"]')
      
      await page.click('[data-testid="add-medication"]')
      await page.fill('[data-testid="medication-name"]', "Teratogenic medication")
      
      // Should show pregnancy warning
      await expect(page.locator('[data-testid="pregnancy-warning"]')).toBeVisible()
    })
  })
})
