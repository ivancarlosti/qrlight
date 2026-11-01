import { test, expect, type Page } from '@playwright/test'

declare global {
  interface Window {
    printCallCount: number
  }
}

/**
 * The print sheet is the only element that survives `@media print`, so these
 * tests assert on its DOM (kept mounted until `afterprint`) and on the layout
 * with the print media emulated.
 */
test.describe('Print QR Code', () => {
  test.beforeEach(async ({ page }) => {
    // window.print() opens a native dialog that would block the runner: count
    // the calls instead so the sheet stays in the DOM for assertions.
    await page.addInitScript(() => {
      window.printCallCount = 0
      window.print = () => {
        window.printCallCount += 1
      }
    })
    await page.goto('/')
  })

  const printButton = (page: Page) => page.locator('#print-qr-image-button')
  const printSheet = (page: Page) => page.locator('#qr-print-sheet')

  async function triggerPrint(page: Page) {
    await printButton(page).click()
    await expect(printSheet(page)).toHaveCount(1)
  }

  test('is disabled until there is data to encode', async ({ page }) => {
    await page.locator('#data').fill('')
    await expect(printButton(page)).toBeDisabled()

    await page.locator('#data').fill('https://example.com/qr')
    await expect(printButton(page)).toBeEnabled()
  })

  test('renders the QR code and its details on the sheet', async ({ page }) => {
    await page.locator('#data').fill('https://example.com/qr')
    await triggerPrint(page)

    const sheet = printSheet(page)
    await expect(sheet.locator('.qr-print-sheet__art svg')).toHaveCount(1)
    await expect(sheet).toContainText('Data type')
    await expect(sheet).toContainText('Encoded content')
    await expect(sheet).toContainText('https://example.com/qr')
    expect(await page.evaluate(() => window.printCallCount)).toBe(1)
  })

  test('omits the details block when the checkbox is cleared', async ({ page }) => {
    await page.locator('#data').fill('https://example.com/qr')
    await page.locator('#include-print-details').uncheck()
    await triggerPrint(page)

    const sheet = printSheet(page)
    await expect(sheet.locator('.qr-print-sheet__art svg')).toHaveCount(1)
    await expect(sheet.locator('.qr-print-sheet__details')).toHaveCount(0)
  })

  test('prints the frame caption with a framed code', async ({ page }) => {
    await page.locator('#data').fill('https://example.com/qr')
    await page.getByRole('button', { name: /frame settings/i }).click()
    await page.locator('#show-frame').check()
    await page.locator('#frame-text').fill('Scan me')

    await triggerPrint(page)
    await expect(printSheet(page)).toContainText('Scan me')
  })

  test('hides the app and shows the sheet when printing', async ({ page }) => {
    await page.locator('#data').fill('https://example.com/qr')
    await triggerPrint(page)

    await expect(printSheet(page)).toBeHidden()

    await page.emulateMedia({ media: 'print' })
    await expect(printSheet(page)).toBeVisible()
    await expect(page.locator('#app')).toBeHidden()

    await page.emulateMedia({ media: 'screen' })
    await expect(printSheet(page)).toBeHidden()
  })

  test('clears the sheet once the print dialog closes', async ({ page }) => {
    await page.locator('#data').fill('https://example.com/qr')
    await triggerPrint(page)

    await page.evaluate(() => window.dispatchEvent(new Event('afterprint')))
    await expect(printSheet(page)).toHaveCount(0)
  })

  test('is limited to single exports', async ({ page }) => {
    await page.getByRole('button', { name: /batch export/i }).click()

    await expect(printButton(page)).toBeDisabled()
    await expect(printButton(page)).toHaveAttribute('title', 'Printing works with a single QR code')
    await expect(page.locator('#include-print-details')).toBeHidden()
  })
})
