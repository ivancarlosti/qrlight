#!/usr/bin/env node
/**
 * sync-i18n.mjs
 *
 * Scans the codebase for all translation strings used via t() / $t() and
 * adds any missing strings to locales/en.json.
 *
 * `en.json` is the source of truth for the key set: run this after adding or
 * removing a string, then translate the new keys in every bundle listed in
 * SUPPORTED_LOCALES (src/utils/i18n.ts) and verify with `pnpm check:i18n`.
 */

import { writeFileSync } from 'fs'
import {
  EN_JSON_PATH,
  GREEN,
  YELLOW,
  collectSourceKeys,
  log,
  readJson,
  supportedLocales
} from './i18n-utils.mjs'

// ---------------------------------------------------------------------------
// 1. Scan src/ and collect all translation keys
// ---------------------------------------------------------------------------
log(YELLOW, '🔍 Scanning source files for translation strings...')

const foundKeys = collectSourceKeys()

log(GREEN, `✓ Found ${foundKeys.size} unique translation strings in source`)

// ---------------------------------------------------------------------------
// 2. Load en.json and find missing keys
// ---------------------------------------------------------------------------
const enJson = readJson(EN_JSON_PATH)
const existingKeys = new Set(Object.keys(enJson))

const missingKeys = [...foundKeys].filter((k) => !existingKeys.has(k))
const hasNewKeys = missingKeys.length > 0

if (!hasNewKeys) {
  log(GREEN, '✓ No new translation strings found — en.json is up to date')
} else {
  log(YELLOW, `📝 Adding ${missingKeys.length} new string(s) to en.json:`)
  for (const key of missingKeys) {
    log(YELLOW, `   + ${key}`)
    enJson[key] = key
  }

  // Write back with stable, sorted key order
  // Keep the `language` native-name key on top, then the UI strings sorted
  const metaEntries = Object.entries(enJson).filter(([k, v]) => k !== v)
  const uiEntries = Object.entries(enJson)
    .filter(([k, v]) => k === v)
    .sort(([a], [b]) => a.localeCompare(b))

  const sorted = Object.fromEntries([...metaEntries, ...uiEntries])
  writeFileSync(EN_JSON_PATH, JSON.stringify(sorted, null, 2) + '\n')
  log(GREEN, '✓ en.json updated')
}

// ---------------------------------------------------------------------------
// 3. Done — the bundles are maintained in this repository
// ---------------------------------------------------------------------------
const locales = supportedLocales()

if (hasNewKeys) {
  log(GREEN, `✅ Added ${missingKeys.length} new string(s) to locales/en.json.`)
  log(
    YELLOW,
    `   Next: translate them in ${locales.slice(1).join(', ')} and run "pnpm check:i18n".`
  )
} else {
  log(GREEN, '✅ en.json is already up to date — nothing to do.')
}
