import { createI18n } from 'vue-i18n'
import ar from '../../locales/ar.json'
import en from '../../locales/en.json'
import es from '../../locales/es.json'
import fr from '../../locales/fr.json'
import hi from '../../locales/hi.json'
import ptBR from '../../locales/pt-BR.json'
import zhHANS from '../../locales/zh-HANS.json'

/**
 * Languages shipped with the frontend.
 *
 * One list drives everything: the `messages` map below, the language selector
 * and `scripts/check-i18n.mjs`. A bundle therefore cannot be imported without
 * being offered, nor offered without being imported. To add a language: copy
 * `locales/en.json` to `locales/<code>.json`, translate the values, add a
 * `"language"` key holding the native name, import the file here and add the
 * code to this list.
 */
export const SUPPORTED_LOCALES = ['en', 'pt-BR', 'es', 'fr', 'zh-HANS', 'hi', 'ar'] as const
export type SupportedLocale = (typeof SUPPORTED_LOCALES)[number]

/** Base languages written right to left, used to set the document direction. */
const RTL_LANGUAGES = new Set(['ar', 'fa', 'he', 'ur'])

/**
 * Where the visitor's choice is remembered. The key predates SUPPORTED_LOCALES
 * and is kept as-is so an existing visitor does not lose the language they
 * picked.
 */
export const LOCALE_STORAGE_KEY = 'preferred-language'

/**
 * Codes written by earlier builds (the selector used to store `ptBR`,
 * `zhHANS`, …). They are mapped instead of being dropped, for the same reason.
 */
const LEGACY_LOCALE_ALIASES: Record<string, SupportedLocale> = {
  pt: 'pt-BR',
  ptBR: 'pt-BR',
  ptPT: 'pt-BR',
  zh: 'zh-HANS',
  zhHANS: 'zh-HANS'
}

export const i18n = createI18n({
  legacy: false,
  locale: 'en',
  // Every shipped bundle carries every key: `pnpm check:i18n` fails otherwise.
  // The fallback stays as a last resort so a regression renders English rather
  // than a raw key, and the console warnings stay quiet in normal use.
  fallbackLocale: 'en',
  missingWarn: false,
  fallbackWarn: false,
  globalInjection: true,
  messages: {
    en,
    'pt-BR': ptBR,
    es,
    fr,
    'zh-HANS': zhHANS,
    hi,
    ar
  }
})

/** Guards a locale code coming from storage or from the browser. */
export function isSupportedLocale(value: unknown): value is SupportedLocale {
  return typeof value === 'string' && (SUPPORTED_LOCALES as readonly string[]).includes(value)
}

/** Reports whether a language is written right to left. */
export function isRtlLocale(locale: string): boolean {
  return RTL_LANGUAGES.has(locale.split('-')[0].toLowerCase())
}

/**
 * Keeps `<html lang>` and `<html dir>` in sync with the active language, so
 * assistive technology reads the page in the right language and an RTL
 * language (Arabic) mirrors the whole layout.
 */
export function applyDocumentDirection(locale: string): void {
  if (typeof document === 'undefined') return

  document.documentElement.lang = locale
  document.documentElement.dir = isRtlLocale(locale) ? 'rtl' : 'ltr'
}

/** Switches the UI language and the document direction together. */
export function applyLocale(locale: SupportedLocale): SupportedLocale {
  i18n.global.locale.value = locale
  applyDocumentDirection(locale)
  return locale
}

/**
 * Native name of a language, read from its own bundle (`"language": "Français"`).
 *
 * The selector shows these instead of a translation of the name: the list is
 * then readable and searchable whatever language the UI is currently in, and
 * switching language never reorders it.
 */
export function localeLabel(locale: SupportedLocale): string {
  const messages = i18n.global.getLocaleMessage(locale) as { language?: string }
  return messages.language ?? locale
}

/**
 * Maps a stored or browser-supplied code to a shipped bundle, or `null` when
 * QRLight does not ship that language.
 */
export function resolveStoredLocale(value: string | null | undefined): SupportedLocale | null {
  if (!value) return null
  if (isSupportedLocale(value)) return value

  const alias = LEGACY_LOCALE_ALIASES[value]
  if (alias) return alias

  // `pt-br` / `ZH-Hans` / `PT-BR` all mean the same bundle.
  const match = SUPPORTED_LOCALES.find((locale) => locale.toLowerCase() === value.toLowerCase())
  return match ?? null
}

/**
 * Reads the language remembered by this browser, or `null` when there is none
 * or when storage is blocked (private windows).
 */
export function readStoredLocale(): SupportedLocale | null {
  try {
    return resolveStoredLocale(localStorage.getItem(LOCALE_STORAGE_KEY))
  } catch {
    return null
  }
}

/** Remembers the visitor's choice. Storage can be blocked: then nothing is saved. */
export function writeStoredLocale(locale: string): void {
  try {
    localStorage.setItem(LOCALE_STORAGE_KEY, locale)
  } catch {
    /* private mode or a full quota: the UI still switches, it just forgets */
  }
}

/**
 * Picks the best supported language of the browser, or `null` when the browser
 * asks for a language QRLight does not ship.
 *
 * The full code is tried first (`pt-BR` must not degrade to another Portuguese
 * bundle), then the base language (`es-AR` → `es`, `ar-EG` → `ar`).
 */
export function detectBrowserLocale(): SupportedLocale | null {
  if (typeof navigator === 'undefined') return null

  const candidates = [navigator.language, ...(navigator.languages ?? [])].filter(Boolean)
  for (const candidate of candidates) {
    const exact = resolveStoredLocale(candidate)
    if (exact) return exact

    const base = candidate.split('-')[0].toLowerCase()
    const baseMatch = SUPPORTED_LOCALES.find(
      (locale) => locale.split('-')[0].toLowerCase() === base
    )
    if (baseMatch) return baseMatch
  }

  return null
}

/**
 * Picks the language for a visitor:
 *  1. the choice stored in this browser;
 *  2. the browser languages;
 *  3. English, the fallback bundle.
 */
export function detectLocale(): SupportedLocale {
  return readStoredLocale() ?? detectBrowserLocale() ?? 'en'
}
