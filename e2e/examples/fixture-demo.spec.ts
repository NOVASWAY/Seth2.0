import { test, expect } from '../fixtures'
import { TestUtils, TestData, Selectors } from '../utils/test-utils'

test.describe('Fixture Demo Tests', () => {
  test('should login as admin using auth fixture', async ({ adminPage }) => {
    // adminPage is already authenticated
    await expect(adminPage).toHaveURL(/.*dashboard/)
    
    // Verify we're on the dashboard
    await expect(adminPage.locator('h1')).toContainText(/dashboard/i)
  })

  test('should login as receptionist using auth fixture', async ({ receptionistPage }) => {
    // receptionistPage is already authenticated
    await expect(receptionistPage).toHaveURL(/.*dashboard/)
    
    // Verify receptionist-specific content
    await expect(receptionistPage.locator('body')).toContainText(/receptionist/i)
  })

  test('should use test data fixtures', async ({ page, testPatient, testPrescription }) => {
    // Use the test data
    expect(testPatient.name).toBe('John Doe')
    expect(testPatient.phone).toBe('123-456-7890')
    
    expect(testPrescription.medication).toBe('Amoxicillin')
    expect(testPrescription.dosage).toBe('500mg')
  })

  test('should use page helpers fixture', async ({ page, pageHelpers }) => {
    await page.goto('/login')
    
    // Use page helpers for common operations
    await pageHelpers.fillFormField(Selectors.auth.username, 'admin')
    await pageHelpers.fillFormField(Selectors.auth.password, 'admin123')
    await pageHelpers.clickButton(Selectors.auth.loginButton)
    
    // Wait for navigation
    await pageHelpers.waitForPageLoad()
    
    // Verify successful login
    await pageHelpers.verifyElementVisible('h1')
  })

  test('should use test utils class', async ({ page }) => {
    const testUtils = new TestUtils(page)
    
    await page.goto('/login')
    
    // Set test mode
    await testUtils.setTestMode()
    
    // Fill form using test utils
    await testUtils.fillFormField(Selectors.auth.username, TestData.users.admin.username)
    await testUtils.fillFormField(Selectors.auth.password, TestData.users.admin.password)
    await testUtils.clickButton(Selectors.auth.loginButton)
    
    // Wait for authentication
    await testUtils.waitForAuth()
    
    // Verify we're authenticated
    await testUtils.verifyURL('dashboard')
  })

  test('should handle form submission with fixtures', async ({ receptionistPage, testPatient, pageHelpers }) => {
    // Navigate to patient registration
    await pageHelpers.navigateTo('/patients/register')
    
    // Fill patient form using test data
    await pageHelpers.fillFormField(Selectors.forms.patientName, testPatient.name)
    await pageHelpers.fillFormField(Selectors.forms.patientPhone, testPatient.phone)
    await pageHelpers.fillFormField(Selectors.forms.patientEmail, testPatient.email)
    await pageHelpers.fillFormField(Selectors.forms.patientAge, testPatient.age)
    await pageHelpers.selectOption(Selectors.forms.patientGender, testPatient.gender)
    
    // Submit form
    await pageHelpers.clickButton(Selectors.common.submitButton)
    
    // Wait for success message or redirect
    await pageHelpers.waitForPageLoad()
    
    // Verify success (adjust based on your app's behavior)
    await expect(receptionistPage.locator('body')).toContainText(/success|created|registered/i)
  })

  test('should use combined fixtures for complex workflow', async ({ 
    adminPage, 
    testPatient, 
    testPrescription, 
    pageHelpers 
  }) => {
    // Admin creates a patient
    await pageHelpers.navigateTo('/patients/register')
    await pageHelpers.fillFormField(Selectors.forms.patientName, testPatient.name)
    await pageHelpers.fillFormField(Selectors.forms.patientPhone, testPatient.phone)
    await pageHelpers.clickButton(Selectors.common.submitButton)
    await pageHelpers.waitForPageLoad()
    
    // Admin creates a prescription for the patient
    await pageHelpers.navigateTo('/prescriptions/create')
    await pageHelpers.fillFormField('[data-testid="medication-name"]', testPrescription.medication)
    await pageHelpers.fillFormField('[data-testid="dosage"]', testPrescription.dosage)
    await pageHelpers.fillFormField('[data-testid="frequency"]', testPrescription.frequency)
    await pageHelpers.clickButton(Selectors.common.submitButton)
    await pageHelpers.waitForPageLoad()
    
    // Verify prescription was created
    await expect(adminPage.locator('body')).toContainText(testPrescription.medication)
  })
})
