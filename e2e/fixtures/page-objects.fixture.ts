import { test as base, Page, expect } from '@playwright/test'

export type PageObjectsFixture = {
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

export const test = base.extend<PageObjectsFixture>({
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
