/**
 * i18n-utils.mjs
 *
 * Helpers shared by the translation scripts:
 *   - sync-i18n.mjs  adds every string used in src/ to locales/en.json
 *   - check-i18n.mjs fails when a bundle drifts out of sync with en.json
 *
 * Keeping the source scan in one place means both scripts always agree on
 * which strings are actually used.
 */

import { readFileSync, readdirSync, statSync } from 'fs'
import { join, extname, dirname } from 'path'
import { fileURLToPath } from 'url'

export const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
export const SRC_DIR = join(ROOT, 'src')
export const LOCALES_DIR = join(ROOT, 'locales')
export const EN_JSON_PATH = join(LOCALES_DIR, 'en.json')
export const I18N_SOURCE_PATH = join(SRC_DIR, 'utils', 'i18n.ts')

// ANSI colours
export const GREEN = '\x1b[0;32m'
export const YELLOW = '\x1b[1;33m'
export const RED = '\x1b[0;31m'
export const NC = '\x1b[0m'

export const log = (color, msg) => console.log(`${color}${msg}${NC}`)

/**
 * Matches t('some string'), t("some string"), $t('some string') and
 * .global.t('some string'), preceded by a non-identifier character so calls
 * like .split(',') or text.replace(...) are not picked up.
 */
const T_REGEX = /(?<![a-zA-Z0-9_$])\$?t\s*\(\s*(['"])((?:(?!\1)(?:\\.|[^\\]))*)\1/g

/** Extracts the translation strings used in a file's content. */
export function extractKeys(content) {
  const keys = new Set()
  let match
  T_REGEX.lastIndex = 0
  while ((match = T_REGEX.exec(content)) !== null) {
    const raw = match[2]
    // Unescape basic escape sequences
    const str = raw.replace(/\\'/g, "'").replace(/\\"/g, '"').replace(/\\\\/g, '\\')
    // Skip blank, whitespace-only, or single-character non-letter strings
    if (!str || str.trim().length === 0) continue
    if (str.length === 1 && !/[a-zA-Z]/.test(str)) continue
    // Skip strings that look like file extensions, CSS selectors, or code patterns
    if (/^[.#]/.test(str)) continue
    // Skip strings that are purely numeric or date format tokens without letters
    if (/^[^a-zA-Z]+$/.test(str) && !/[{}]/.test(str)) continue
    keys.add(str)
  }
  return keys
}

/** Recursively lists the files of `dir` having one of the given extensions. */
export function walkDir(dir, exts, files = []) {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry)
    const stat = statSync(full)
    if (stat.isDirectory()) {
      walkDir(full, exts, files)
    } else if (exts.includes(extname(entry))) {
      files.push(full)
    }
  }
  return files
}

/** Every translation string used in src/, in source order. */
export function collectSourceKeys() {
  const foundKeys = new Set()

  for (const file of walkDir(SRC_DIR, ['.vue', '.ts', '.js'])) {
    for (const key of extractKeys(readFileSync(file, 'utf8'))) {
      foundKeys.add(key)
    }
  }

  return foundKeys
}

/**
 * The languages shipped by the UI, read from `SUPPORTED_LOCALES` in
 * src/utils/i18n.ts — the single source of truth, never a copy.
 */
export function supportedLocales() {
  const source = readFileSync(I18N_SOURCE_PATH, 'utf8')
  const match = /SUPPORTED_LOCALES\s*=\s*\[([^\]]*)\]/.exec(source)

  if (!match) {
    throw new Error('Could not find SUPPORTED_LOCALES in src/utils/i18n.ts')
  }

  return match[1]
    .split(',')
    .map((code) => code.trim().replace(/^['"]|['"]$/g, ''))
    .filter(Boolean)
}

/** Reads a JSON file. */
export function readJson(path) {
  return JSON.parse(readFileSync(path, 'utf8'))
}

let sourceBlob

/**
 * The concatenated source of src/, used to look up string literals.
 *
 * Escaped apostrophes are unescaped so a key written `t('It\'s ready')` is
 * found by its plain text (`It's ready`).
 */
export function sourceText() {
  if (sourceBlob === undefined) {
    sourceBlob = walkDir(SRC_DIR, ['.vue', '.ts', '.js'])
      .map((file) => readFileSync(file, 'utf8'))
      .join('\n')
      .replace(/\\'/g, "'")
  }

  return sourceBlob
}

const escapeRegExp = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

/**
 * Whether the code still references a key.
 *
 * Looking for the literal rather than only for t('…') catches the keys that are
 * translated through a lookup table — `t(preset.name)`, `t(DATA_TYPE_LABEL_KEYS
 * [type])` — which are just as live as a direct call.
 */
export function isReferencedBySource(key) {
  return new RegExp('[\'"`]' + escapeRegExp(key) + '[\'"`]').test(sourceText())
}

/** The `{placeholder}` names used by one message. */
export function placeholders(message) {
  const found = new Set()
  for (const [, name] of String(message).matchAll(/\{\s*([a-zA-Z0-9_]+)\s*\}/g)) {
    found.add(name)
  }
  return found
}
