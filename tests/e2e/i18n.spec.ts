import { test, expect, type Page } from '@playwright/test'

declare global {
  interface Window {
    printCallCount: number
  }
}

/**
 * The language is resolved from `preferred-language` before the first render,
 * so seeding storage and loading the app is all a test needs to switch it.
 */
async function openApp(page: Page, locale: string) {
  await page.addInitScript((code) => {
    localStorage.setItem('preferred-language', code)
    // window.print() opens a native dialog and would block the runner: count
    // the calls so the sheet stays in the DOM for the assertions.
    window.printCallCount = 0
    window.print = () => {
      window.printCallCount += 1
    }
  }, locale)

  await page.goto('/')
}

const printSheet = (page: Page) => page.locator('#qr-print-sheet')

async function printWifiCard(page: Page) {
  await page.locator('#data').fill('WIFI:T:WPA;S:CafeGuest;P:welcome123;;')
  await page.locator('#print-qr-image-button').click()
  await expect(printSheet(page)).toHaveCount(1)
}

test.describe('Translations', () => {
  test('prints the Wi-Fi card in the selected language', async ({ page }) => {
    await openApp(page, 'fr')
    await printWifiCard(page)

    const sheet = printSheet(page)
    // Regression: these strings were only in en.json, so the card printed in
    // English on an otherwise French page.
    await expect(sheet).toContainText('Scannez pour rejoindre le Wi-Fi')
    await expect(sheet).toContainText('Nom du réseau (SSID)')
    await expect(sheet).toContainText('Mot de passe')
    await expect(sheet).not.toContainText('Scan to join the Wi-Fi')
  })

  test('sets the document language', async ({ page }) => {
    await openApp(page, 'fr')

    await expect(page.locator('html')).toHaveAttribute('lang', 'fr')
    await expect(page.locator('html')).toHaveAttribute('dir', 'ltr')
    await expect(page.locator('#print-qr-image-button')).toHaveAttribute(
      'aria-label',
      'Imprimer le code QR'
    )
  })

  test('marks a right-to-left language on the document', async ({ page }) => {
    await openApp(page, 'ar')

    await expect(page.locator('html')).toHaveAttribute('lang', 'ar')
    await expect(page.locator('html')).toHaveAttribute('dir', 'rtl')
    await expect(page.getByRole('combobox', { name: 'اختر اللغة' })).toBeVisible()
  })

  test('lists the languages by their native names', async ({ page }) => {
    await openApp(page, 'fr')
    await page.getByRole('combobox', { name: 'Sélectionner la langue' }).click()

    // The list must stay readable in a UI that is already translated.
    await expect(page.getByRole('option', { name: 'English' })).toBeVisible()
    await expect(page.getByRole('option', { name: 'Français' })).toBeVisible()
    await expect(page.getByRole('option', { name: '简体中文' })).toBeVisible()
  })

  test('keeps a language saved by an older build', async ({ page }) => {
    await openApp(page, 'ptBR')

    await expect(page.locator('html')).toHaveAttribute('lang', 'pt-BR')
    await expect(page.locator('#print-qr-image-button')).toHaveAttribute(
      'aria-label',
      'Imprimir código QR'
    )
    expect(await page.evaluate(() => localStorage.getItem('preferred-language'))).toBe('pt-BR')
  })
})
