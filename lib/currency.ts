/**
 * Currency utility functions for consistent KES formatting across the application
 */

export const CURRENCY_CONFIG = {
  code: 'KES',
  symbol: 'KES',
  locale: 'en-KE',
  decimalPlaces: 2,
} as const

/**
 * Format a number as Kenyan Shillings currency
 * @param amount - The amount to format
 * @param options - Formatting options
 * @returns Formatted currency string
 */
export function formatCurrency(
  amount: number,
  options: {
    showSymbol?: boolean
    showCode?: boolean
    minimumFractionDigits?: number
    maximumFractionDigits?: number
  } = {}
): string {
  const {
    showSymbol = true,
    showCode = false,
    minimumFractionDigits = CURRENCY_CONFIG.decimalPlaces,
    maximumFractionDigits = CURRENCY_CONFIG.decimalPlaces,
  } = options

  const formatter = new Intl.NumberFormat(CURRENCY_CONFIG.locale, {
    style: 'currency',
    currency: CURRENCY_CONFIG.code,
    minimumFractionDigits,
    maximumFractionDigits,
  })

  let formatted = formatter.format(amount)

  // Customize the output based on options
  if (!showSymbol && !showCode) {
    // Remove currency symbol and code, keep only the number
    formatted = formatted.replace(/[^\d.,]/g, '')
  } else if (showCode && !showSymbol) {
    // Replace symbol with code
    formatted = formatted.replace(/KES\s*/, `${CURRENCY_CONFIG.code} `)
  }

  return formatted
}

/**
 * Format currency for display in tables and lists
 * @param amount - The amount to format
 * @returns Formatted currency string
 */
export function formatCurrencyDisplay(amount: number): string {
  return formatCurrency(amount, { showSymbol: true })
}

/**
 * Format currency for input fields (no symbol)
 * @param amount - The amount to format
 * @returns Formatted number string
 */
export function formatCurrencyInput(amount: number): string {
  return formatCurrency(amount, { showSymbol: false, showCode: false })
}

/**
 * Parse currency string to number
 * @param currencyString - The currency string to parse
 * @returns Parsed number
 */
export function parseCurrency(currencyString: string): number {
  // Remove all non-numeric characters except decimal point
  const cleaned = currencyString.replace(/[^\d.]/g, '')
  return parseFloat(cleaned) || 0
}

/**
 * Validate if a string is a valid currency amount
 * @param value - The value to validate
 * @returns True if valid currency amount
 */
export function isValidCurrencyAmount(value: string): boolean {
  const parsed = parseCurrency(value)
  return !isNaN(parsed) && parsed >= 0
}

/**
 * Get currency symbol
 * @returns Currency symbol
 */
export function getCurrencySymbol(): string {
  return CURRENCY_CONFIG.symbol
}

/**
 * Get currency code
 * @returns Currency code
 */
export function getCurrencyCode(): string {
  return CURRENCY_CONFIG.code
}

/**
 * Format currency for SHA invoices (specific formatting for insurance)
 * @param amount - The amount to format
 * @returns Formatted currency string for SHA
 */
export function formatSHACurrency(amount: number): string {
  return formatCurrency(amount, { showSymbol: true })
}

/**
 * Format currency for M-Pesa transactions
 * @param amount - The amount to format
 * @returns Formatted currency string for M-Pesa
 */
export function formatMpesaCurrency(amount: number): string {
  return formatCurrency(amount, { showSymbol: true })
}

/**
 * Format currency for reports and exports
 * @param amount - The amount to format
 * @returns Formatted currency string for reports
 */
export function formatReportCurrency(amount: number): string {
  return formatCurrency(amount, { showSymbol: true })
}
