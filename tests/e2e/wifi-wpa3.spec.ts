import { test, expect, type Page } from '@playwright/test'

/**
 * WPA3-Personal networks can require the explicit `T:SAE` token instead of the
 * generic `T:WPA` one, and scanned codes must round-trip back into the form.
 */
test.describe('WiFi data templates', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
  })

  async function openWifiTemplate(page: Page) {
    // The trigger's aria-label ("Open data type generator") overrides its text.
    await page.getByRole('button', { name: /open data type generator/i }).click()
    await expect(page.getByRole('dialog', { name: /data to encode/i })).toBeVisible()
    await page.locator('#dataType').selectOption('wifi')
  }

  test('generates a WPA3 (SAE) payload', async ({ page }) => {
    await openWifiTemplate(page)

    await page.locator('#wifiSSID').fill('QRLightNet')
    await page.locator('#wifiEncryption').selectOption('SAE')
    await page.locator('#wifiPassword').fill('hunter2')
    await page.getByRole('button', { name: /^save$/i }).click()

    await expect(page.locator('#data')).toHaveValue('WIFI:T:SAE;S:QRLightNet;P:hunter2;;')
  })

  test('keeps the default WPA token as WPA/WPA2/WPA3', async ({ page }) => {
    await openWifiTemplate(page)

    await expect(page.locator('#wifiEncryption option[value="WPA"]')).toHaveText('WPA/WPA2/WPA3')
    await page.locator('#wifiSSID').fill('QRLightNet')
    await page.locator('#wifiEncryption').selectOption('WPA')
    await page.locator('#wifiPassword').fill('hunter2')
    await page.getByRole('button', { name: /^save$/i }).click()

    await expect(page.locator('#data')).toHaveValue('WIFI:T:WPA;S:QRLightNet;P:hunter2;;')
  })

  test('round-trips a scanned SAE code into the form', async ({ page }) => {
    await page.locator('#data').fill('WIFI:T:SAE;S:OfficeNet;P:secret;;')
    await openWifiTemplate(page)

    await expect(page.locator('#wifiSSID')).toHaveValue('OfficeNet')
    await expect(page.locator('#wifiEncryption')).toHaveValue('SAE')
    await expect(page.locator('#wifiPassword')).toHaveValue('secret')
  })

  test('normalises a scanned lowercase wpa token', async ({ page }) => {
    await page.locator('#data').fill('WIFI:T:wpa;S:OfficeNet;P:secret;;')
    await openWifiTemplate(page)

    await expect(page.locator('#wifiEncryption')).toHaveValue('WPA')
  })
})
