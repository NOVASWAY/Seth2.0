import { test, expect } from "@playwright/test"

test.describe("Patient Registration", () => {
  test.beforeEach(async ({ page }) => {
    // Login as receptionist
    await page.goto("/login")
    await page.fill('[data-testid="username"]', "receptionist")
    await page.fill('[data-testid="password"]', "receptionist123")
    await page.click('[data-testid="login-button"]')
    await expect(page).toHaveURL("/dashboard")
  })

  test("should register a new patient", async ({ page }) => {
    await page.goto("/patients/register")

    await page.fill('[data-testid="first-name"]', "John")
    await page.fill('[data-testid="last-name"]', "Doe")
    await page.fill('[data-testid="phone-number"]', "+254712345678")
    await page.selectOption('[data-testid="gender"]', "male")
    await page.fill('[data-testid="date-of-birth"]', "1990-01-01")

    await page.click('[data-testid="register-button"]')

    await expect(page.locator('[data-testid="success-message"]')).toBeVisible()
    await expect(page.locator('[data-testid="op-number"]')).toBeVisible()
  })

  test("should validate required fields", async ({ page }) => {
    await page.goto("/patients/register")

    await page.click('[data-testid="register-button"]')

    await expect(page.locator('[data-testid="first-name-error"]')).toBeVisible()
    await expect(page.locator('[data-testid="last-name-error"]')).toBeVisible()
  })

  test("should show patient in queue after registration", async ({ page }) => {
    // Register patient
    await page.goto("/patients/register")
    await page.fill('[data-testid="first-name"]', "Jane")
    await page.fill('[data-testid="last-name"]', "Smith")
    await page.fill('[data-testid="phone-number"]', "+254712345679")
    await page.selectOption('[data-testid="gender"]', "female")
    await page.click('[data-testid="register-button"]')

    // Check queue
    await page.goto("/queue")
    await expect(page.locator('[data-testid="queue-item"]').first()).toContainText("Jane Smith")
  })
})
