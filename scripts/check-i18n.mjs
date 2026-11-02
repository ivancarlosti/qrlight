#!/usr/bin/env node
/**
 * check-i18n.mjs
 *
 * Fails when a translation bundle drifts away from en.json. A missing string
 * used to be invisible: `fallbackLocale: 'en'` silently printed English inside
 * a translated page (that is how "Scan to join the Wi-Fi" ended up untranslated
 * on the printed Wi-Fi card in every language).
 *
 * Checks:
 *   1. every string used through t('…') in src/ exists in en.json;
 *   2. no en.json string is left unused by src/ (dead key);
 *   3. every language in SUPPORTED_LOCALES has a bundle with every key;
 *   4. no bundle has a key that en.json does not have (stale key);
 *   5. every bundle has a non-empty `language` key (its native name);
 *   6. no locale file exists outside SUPPORTED_LOCALES (orphan bundle);
 *   7. every message compiles and keeps the placeholders of the English one.
 *
 * Run with `pnpm check:i18n`.
 */

import { readdirSync } from 'fs'
import { relative, join } from 'path'
import { createI18n } from 'vue-i18n'
import {
  EN_JSON_PATH,
  GREEN,
  LOCALES_DIR,
  RED,
  ROOT,
  YELLOW,
  collectSourceKeys,
  isReferencedBySource,
  log,
  placeholders,
  readJson,
  supportedLocales
} from './i18n-utils.mjs'

/** A key whose value is metadata rather than a translatable UI string. */
const META_KEYS = new Set(['language'])

const problems = []

/** Reports one failure, pointing at the file that has to be fixed. */
const fail = (file, message) => problems.push(`${relative(ROOT, file)}: ${message}`)

const locales = supportedLocales()
const sourceKeys = collectSourceKeys()
const en = readJson(EN_JSON_PATH)
const enKeys = Object.keys(en).filter((key) => !META_KEYS.has(key))

if (!en.language) {
  fail(EN_JSON_PATH, 'missing the "language" native-name key')
}

// 1 + 2 — en.json and the source must describe the same set of strings
for (const key of sourceKeys) {
  if (!(key in en)) {
    fail(EN_JSON_PATH, `missing "${key}" (string used in src/)`)
  }
}
for (const key of enKeys) {
  if (!isReferencedBySource(key)) {
    fail(EN_JSON_PATH, `"${key}" is not used in src/ any more (stale key)`)
  }
}

// 6 — a bundle nobody imports can never be shown, and silently rots
const localeFiles = readdirSync(LOCALES_DIR)
  .filter((name) => name.endsWith('.json'))
  .map((name) => name.replace(/\.json$/, ''))

for (const code of localeFiles) {
  if (!locales.includes(code)) {
    fail(
      join(LOCALES_DIR, `${code}.json`),
      `not listed in SUPPORTED_LOCALES (src/utils/i18n.ts) — register it or delete the file`
    )
  }
}

// 3 to 7 — every shipped bundle
for (const locale of locales) {
  const path = join(LOCALES_DIR, `${locale}.json`)
  let messages

  try {
    messages = readJson(path)
  } catch {
    fail(path, `cannot be read (is the file missing or invalid JSON?)`)
    continue
  }

  if (typeof messages.language !== 'string' || messages.language.trim() === '') {
    fail(path, 'missing the "language" native-name key')
  }

  const missing = enKeys.filter((key) => !(key in messages))
  const stale = Object.keys(messages).filter((key) => !META_KEYS.has(key) && !(key in en))

  for (const key of missing) {
    fail(path, `missing "${key}"`)
  }
  for (const key of stale) {
    fail(path, `"${key}" does not exist in en.json (stale key)`)
  }

  // A message that does not compile would throw in the browser at render time;
  // a dropped placeholder would print "{max}" or crash the same way.
  const i18n = createI18n({
    legacy: false,
    locale,
    missingWarn: false,
    fallbackWarn: false,
    messages: { [locale]: messages }
  })

  for (const key of Object.keys(messages)) {
    if (META_KEYS.has(key) || !(key in en)) continue

    const expected = placeholders(en[key])
    const actual = placeholders(messages[key])
    const lost = [...expected].filter((name) => !actual.has(name))
    const unknown = [...actual].filter((name) => !expected.has(name))

    if (lost.length > 0) {
      fail(path, `"${key}" is missing the placeholder ${lost.map((n) => `{${n}}`).join(', ')}`)
    }
    if (unknown.length > 0) {
      fail(path, `"${key}" uses the unknown placeholder ${unknown.map((n) => `{${n}}`).join(', ')}`)
    }

    const params = Object.fromEntries([...actual].map((name) => [name, '1']))
    try {
      i18n.global.t(key, params)
    } catch (error) {
      fail(path, `"${key}" does not compile — ${String(error.message).split('\n')[0]}`)
    }
  }

  if (missing.length === 0 && stale.length === 0) {
    log(GREEN, `✓ ${locale.padEnd(8)} ${String(enKeys.length).padStart(3)} strings — in sync`)
  }
}

// ---------------------------------------------------------------------------
// Summary
// ---------------------------------------------------------------------------
if (problems.length > 0) {
  log(RED, `✗ ${problems.length} translation problem(s) found:`)
  for (const problem of problems) {
    log(RED, `  ${problem}`)
  }
  log(RED, '')
  log(YELLOW, 'Run "pnpm sync-i18n" for en.json, then fix the bundles.')
  log(YELLOW, `Shipped languages: ${locales.join(', ')}`)
  process.exit(1)
}

log(GREEN, `\n✅ ${locales.length} bundles, ${enKeys.length} strings each — all in sync.`)
