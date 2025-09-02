import { test, expect } from './fixtures'

test.describe('Simple Fixture Tests', () => {
  test('should use test data fixtures', async ({ testPatient, testPrescription }) => {
    // Use predefined test data
    expect(testPatient.name).toBe('John Doe')
    expect(testPatient.phone).toBe('123-456-7890')
    expect(testPatient.email).toBe('john.doe@example.com')
    
    expect(testPrescription.medication).toBe('Amoxicillin')
    expect(testPrescription.dosage).toBe('500mg')
    expect(testPrescription.frequency).toBe('3 times daily')
  })

  test('should use page helpers', async ({ page, pageHelpers }) => {
    // Navigate to a simple page
    await page.goto('/')
    
    // Use page helpers
    await pageHelpers.waitForPageLoad()
    
    // Check if we can get page title
    const title = await page.title()
    expect(title).toContain('Seth Medical Clinic CMS')
  })

  test('should combine multiple fixtures', async ({ page, testPatient, pageHelpers }) => {
    // Navigate to a simple page
    await page.goto('/')
    
    // Use page helpers
    await pageHelpers.waitForPageLoad()
    
    // Use test data
    expect(testPatient.name).toBe('John Doe')
    
    // Check if we can get page title
    const title = await page.title()
    expect(title).toContain('Seth Medical Clinic CMS')
  })

  test('should handle authentication gracefully', async ({ adminPage }) => {
    // Try to navigate to a page that might exist
    await adminPage.goto('/')
    
    // Check if we can get page title
    const title = await adminPage.title()
    expect(title).toContain('Seth Medical Clinic CMS')
  })
})
