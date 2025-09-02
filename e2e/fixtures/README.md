# Playwright Fixtures Documentation

This directory contains a comprehensive fixtures system for Playwright tests that provides:

- **Authentication Fixtures** - Pre-authenticated page objects
- **Data Fixtures** - Reusable test data
- **Page Object Fixtures** - Common page interaction helpers
- **Test Utilities** - Helper classes and functions

## Quick Start

```typescript
import { test, expect } from '../fixtures'

test('should use admin page fixture', async ({ adminPage }) => {
  // adminPage is already authenticated as admin
  await expect(adminPage).toHaveURL(/.*dashboard/)
})
```

## Available Fixtures

### Authentication Fixtures

#### `adminPage`
Pre-authenticated page object with admin privileges.

```typescript
test('admin test', async ({ adminPage }) => {
  // Already logged in as admin
  await adminPage.goto('/admin/users')
})
```

#### `receptionistPage`
Pre-authenticated page object with receptionist privileges.

```typescript
test('receptionist test', async ({ receptionistPage }) => {
  // Already logged in as receptionist
  await receptionistPage.goto('/patients/register')
})
```

#### `doctorPage`
Pre-authenticated page object with doctor privileges.

```typescript
test('doctor test', async ({ doctorPage }) => {
  // Already logged in as doctor
  await doctorPage.goto('/prescriptions/create')
})
```

#### `authenticatedPage`
Generic authenticated page object (defaults to admin).

```typescript
test('generic auth test', async ({ authenticatedPage }) => {
  // Already logged in
  await authenticatedPage.goto('/dashboard')
})
```

### Data Fixtures

#### `testPatient`
Standard patient test data.

```typescript
test('patient test', async ({ testPatient }) => {
  expect(testPatient.name).toBe('John Doe')
  expect(testPatient.phone).toBe('123-456-7890')
})
```

#### `testPrescription`
Standard prescription test data.

```typescript
test('prescription test', async ({ testPrescription }) => {
  expect(testPrescription.medication).toBe('Amoxicillin')
  expect(testPrescription.dosage).toBe('500mg')
})
```

#### `testMedication`
Standard medication test data.

```typescript
test('medication test', async ({ testMedication }) => {
  expect(testMedication.name).toBe('Amoxicillin')
  expect(testMedication.price).toBe(15.99)
})
```

#### `testUser`
Standard user test data.

```typescript
test('user test', async ({ testUser }) => {
  expect(testUser.username).toBe('testuser')
  expect(testUser.role).toBe('receptionist')
})
```

### Page Object Fixtures

#### `pageHelpers`
Common page interaction methods.

```typescript
test('page helpers test', async ({ page, pageHelpers }) => {
  await page.goto('/login')
  
  await pageHelpers.fillFormField('[data-testid="username"]', 'admin')
  await pageHelpers.fillFormField('[data-testid="password"]', 'admin123')
  await pageHelpers.clickButton('[data-testid="login-button"]')
  
  await pageHelpers.waitForPageLoad()
  await pageHelpers.verifyElementVisible('h1')
})
```

Available methods:
- `waitForPageLoad()` - Wait for network idle
- `waitForElement(selector, timeout)` - Wait for element
- `fillFormField(selector, value)` - Fill form field
- `clickButton(selector)` - Click button
- `selectOption(selector, value)` - Select dropdown option
- `uploadFile(selector, filePath)` - Upload file
- `verifyElementVisible(selector)` - Verify element is visible
- `verifyElementText(selector, text)` - Verify element text
- `navigateTo(path)` - Navigate to path
- `getElementText(selector)` - Get element text
- `isElementVisible(selector)` - Check if element is visible

## Test Utilities

### TestUtils Class

```typescript
import { TestUtils } from '../utils/test-utils'

test('test utils test', async ({ page }) => {
  const testUtils = new TestUtils(page)
  
  await testUtils.setTestMode()
  await testUtils.fillFormField('[data-testid="username"]', 'admin')
  await testUtils.clickButton('[data-testid="login-button"]')
  await testUtils.waitForAuth()
})
```

### TestData Constants

```typescript
import { TestData } from '../utils/test-utils'

test('test data test', async ({ page }) => {
  const patient = TestData.patients.valid
  const user = TestData.users.admin
  
  // Use predefined test data
})
```

### Selectors Constants

```typescript
import { Selectors } from '../utils/test-utils'

test('selectors test', async ({ page }) => {
  await page.fill(Selectors.auth.username, 'admin')
  await page.fill(Selectors.auth.password, 'admin123')
  await page.click(Selectors.auth.loginButton)
})
```

## Combining Fixtures

You can use multiple fixtures in a single test:

```typescript
test('complex test', async ({ 
  adminPage, 
  testPatient, 
  testPrescription, 
  pageHelpers 
}) => {
  // Use adminPage (pre-authenticated)
  // Use testPatient and testPrescription data
  // Use pageHelpers for interactions
})
```

## Custom Fixtures

To create custom fixtures, extend the base test:

```typescript
import { test as base } from '../fixtures'

export const test = base.extend({
  customFixture: async ({ page }, use) => {
    // Setup custom fixture
    const customData = { /* ... */ }
    
    await use(customData)
  }
})
```

## Best Practices

1. **Use authentication fixtures** instead of manual login in each test
2. **Use data fixtures** for consistent test data across tests
3. **Use page helpers** for common page interactions
4. **Use test utilities** for complex operations
5. **Combine fixtures** for comprehensive test coverage
6. **Keep fixtures focused** on single responsibilities
7. **Use descriptive names** for fixture methods and properties

## Error Handling

Fixtures include built-in error handling:

- **Retry logic** for flaky operations
- **Timeout handling** for slow operations
- **Screenshot capture** on failures
- **Graceful degradation** for missing elements

## Performance

- **Fixtures are cached** between tests for better performance
- **Authentication is reused** when possible
- **Test data is lightweight** and fast to generate
- **Page helpers optimize** common operations
