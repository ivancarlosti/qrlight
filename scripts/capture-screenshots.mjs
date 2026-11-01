#!/usr/bin/env node
/**
 * capture-screenshots.mjs
 *
 * Regenerates the README screenshots in `docs/screenshots/` from the app.
 *
 * Boots a throwaway Vite dev server (unless SCREENSHOT_BASE_URL points at an
 * already running one), drives it with Playwright chromium and writes PNGs.
 *
 *   pnpm screenshots
 *
 * Requires the chromium browser: `pnpm exec playwright install chromium`.
 * Ports/timeouts can be overridden with SCREENSHOT_PORT / SCREENSHOT_BASE_URL.
 */

import { spawn } from 'node:child_process'
import { mkdir } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { chromium } from 'playwright'
import sharp from 'sharp'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(__dirname, '..')
const OUT_DIR = path.join(ROOT, 'docs', 'screenshots')

const PORT = Number(process.env.SCREENSHOT_PORT ?? 5183)
const BASE_URL = process.env.SCREENSHOT_BASE_URL ?? `http://localhost:${PORT}`
const SAMPLE_DATA = 'https://qrlight.example/menu'
const FRAME_CAPTION = 'Scan for the menu'

const DESKTOP_VIEWPORT = { width: 1440, height: 960 }
const MOBILE_VIEWPORT = { width: 430, height: 932 }
// A4 at 96 dpi — the print stylesheet sizes the sheet in millimetres.
const PRINT_VIEWPORT = { width: 794, height: 1123 }

const log = (message) => console.log(`  ${message}`)

async function waitForServer(url, timeoutMs = 60_000) {
  const start = Date.now()
  while (Date.now() - start < timeoutMs) {
    try {
      const res = await fetch(url)
      if (res.ok) return
    } catch {
      // server not up yet
    }
    await new Promise((resolve) => setTimeout(resolve, 250))
  }
  throw new Error(`Vite dev server at ${url} did not become ready within ${timeoutMs}ms`)
}

async function startDevServer() {
  if (process.env.SCREENSHOT_BASE_URL) return null
  const server = spawn(
    process.execPath,
    [path.join(ROOT, 'node_modules/vite/bin/vite.js'), '--port', String(PORT), '--strictPort'],
    {
      cwd: ROOT,
      env: {
        ...process.env,
        // Screenshots should show the shipped UI: the dev-only Simple/Full
        // toggle (see .env.development) stays hidden and the floating credit
        // badge is off, matching the Docker build.
        VITE_QR_CREATE_SIMPLE_FULL_MODE_TOGGLE: 'false',
        VITE_HIDE_CREDITS: 'true'
      },
      stdio: ['ignore', 'ignore', 'inherit']
    }
  )
  await waitForServer(BASE_URL)
  return server
}

async function openCreatePage(browser, { viewport, colorScheme = 'light', mobile = false }) {
  const context = await browser.newContext({
    viewport,
    deviceScaleFactor: 2,
    colorScheme,
    reducedMotion: 'reduce',
    isMobile: mobile,
    hasTouch: mobile,
    locale: 'en-US'
  })
  const page = await context.newPage()
  // window.print() would block headless chromium on the native dialog.
  await page.addInitScript(() => {
    window.print = () => {}
  })
  await page.goto(BASE_URL, { waitUntil: 'load' })
  await page.locator('#data').waitFor()
  // Desktop renders the preview in `#element-to-export`; on small screens it
  // lives in the fixed bottom sheet instead.
  await page
    .locator('#element-to-export svg, #drawer-preview-container svg')
    .first()
    .waitFor({ state: 'visible' })
  await page.evaluate(() => document.fonts.ready)
  return { context, page }
}

/** Type into the data field and wait for the debounced re-render. */
async function fillData(page, data) {
  await page.locator('#data').fill(data)
  await page.waitForTimeout(600)
}

async function openFrameSettings(page) {
  await page.getByRole('button', { name: /frame settings/i }).click()
  // Let the accordion animation finish before touching its inputs.
  await page.locator('#show-frame').waitFor({ state: 'visible' })
  await page.waitForTimeout(300)
}

/** Screenshot `target` (page or locator), downscaled to a sane README width. */
async function shoot(target, filename, maxWidth) {
  const buffer = await target.screenshot()
  await sharp(buffer)
    .resize({ width: maxWidth, withoutEnlargement: true })
    .png({ compressionLevel: 9 })
    .toFile(path.join(OUT_DIR, filename))
  log(`wrote docs/screenshots/${filename}`)
}

async function main() {
  await mkdir(OUT_DIR, { recursive: true })
  const server = await startDevServer()
  const browser = await chromium.launch()
  try {
    // --- Create, light mode, Plain preset (the default) --------------------
    const light = await openCreatePage(browser, { viewport: DESKTOP_VIEWPORT })
    await fillData(light.page, SAMPLE_DATA)
    await shoot(light.page, 'create-plain-desktop.png', 1600)

    // --- Same view with a frame and caption --------------------------------
    await openFrameSettings(light.page)
    const showFrame = light.page.locator('#show-frame')
    if (!(await showFrame.isChecked())) await showFrame.check()
    await light.page.locator('#frame-text').fill(FRAME_CAPTION)
    await light.page.waitForTimeout(600)
    await shoot(light.page, 'create-with-frame.png', 1600)
    await light.context.close()

    // --- Print preview: code, caption and the details block ----------------
    const print = await openCreatePage(browser, { viewport: PRINT_VIEWPORT })
    await fillData(print.page, SAMPLE_DATA)
    await openFrameSettings(print.page)
    const printShowFrame = print.page.locator('#show-frame')
    if (!(await printShowFrame.isChecked())) await printShowFrame.check()
    await print.page.locator('#frame-text').fill(FRAME_CAPTION)
    const includeDetails = print.page.locator('#include-print-details')
    if (!(await includeDetails.isChecked())) await includeDetails.check()
    await print.page.waitForTimeout(600)
    await print.page.locator('#print-qr-image-button').click()
    const sheet = print.page.locator('#qr-print-sheet')
    // The sheet is display:none until @media print applies, so wait for it to be
    // mounted rather than visible, then switch to print media.
    await print.page.waitForFunction(
      () => document.querySelectorAll('#qr-print-sheet .qr-print-sheet__art svg').length === 1
    )
    await print.page.emulateMedia({ media: 'print' })
    await sheet.locator('.qr-print-sheet__art svg').waitFor()
    await print.page.waitForTimeout(300)
    await shoot(sheet, 'print-preview.png', 1000)
    await print.page.emulateMedia({ media: 'screen' })
    await print.context.close()

    // --- Scan view ---------------------------------------------------------
    const scan = await openCreatePage(browser, { viewport: DESKTOP_VIEWPORT })
    await scan.page.getByRole('button', { name: 'Switch to Scan Mode' }).first().click()
    await scan.page.getByText('Scan a QR Code').first().waitFor()
    await scan.page.waitForTimeout(300)
    await shoot(scan.page, 'scan-desktop.png', 1600)
    await scan.context.close()

    // --- Mobile create view ------------------------------------------------
    const mobile = await openCreatePage(browser, {
      viewport: MOBILE_VIEWPORT,
      mobile: true
    })
    await fillData(mobile.page, SAMPLE_DATA)
    // Tapping the fixed preview opens the export bottom sheet, which shows the
    // code, the export actions and the file-name controls together.
    await mobile.page.locator('#drawer-preview-container').click()
    await mobile.page.waitForTimeout(800)
    await shoot(mobile.page, 'create-mobile.png', 780)
    await mobile.context.close()

    // --- Dark mode (follows the system preference by default) --------------
    const dark = await openCreatePage(browser, {
      viewport: DESKTOP_VIEWPORT,
      colorScheme: 'dark'
    })
    await fillData(dark.page, SAMPLE_DATA)
    await shoot(dark.page, 'create-dark-desktop.png', 1600)
    await dark.context.close()
  } finally {
    await browser.close()
    server?.kill('SIGTERM')
  }
}

main().catch((err) => {
  console.error(err)
  process.exitCode = 1
})
