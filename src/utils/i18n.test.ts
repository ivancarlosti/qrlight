import { afterEach, describe, expect, it } from 'vitest'
import {
  LOCALE_STORAGE_KEY,
  SUPPORTED_LOCALES,
  applyLocale,
  detectBrowserLocale,
  detectLocale,
  i18n,
  isRtlLocale,
  isSupportedLocale,
  localeLabel,
  resolveStoredLocale
} from './i18n'
import { sortedLocales } from './language'

/** Replaces the browser languages; they live on the prototype in real browsers. */
function setBrowserLanguages(languages: string[]) {
  Object.defineProperty(navigator, 'language', { value: languages[0], configurable: true })
  Object.defineProperty(navigator, 'languages', { value: languages, configurable: true })
}

function clearBrowserLanguages() {
  delete (navigator as unknown as Record<string, unknown>).language
  delete (navigator as unknown as Record<string, unknown>).languages
}

afterEach(() => {
  clearBrowserLanguages()
  localStorage.clear()
  applyLocale('en')
})

describe('shipped languages', () => {
  it('offers exactly the bundles that are imported', () => {
    expect([...SUPPORTED_LOCALES]).toEqual(['en', 'pt-BR', 'es', 'fr', 'zh-HANS', 'hi', 'ar'])
    expect(sortedLocales).toHaveLength(SUPPORTED_LOCALES.length)
  })

  it('labels every language with its own name', () => {
    expect(sortedLocales.map(localeLabel)).toEqual([
      'English',
      'Español',
      'Français',
      'Português (Brasil)',
      'العربية',
      'हिन्दी',
      '简体中文'
    ])
  })

  it('translates the printed Wi-Fi card in every language', () => {
    // Regression: this string lived only in en.json, so every translated page
    // printed the English heading on the Wi-Fi handout.
    const key = 'Scan to join the Wi-Fi'

    i18n.global.locale.value = 'en'
    expect(i18n.global.t(key)).toBe(key)

    for (const locale of SUPPORTED_LOCALES.slice(1)) {
      i18n.global.locale.value = locale
      expect(i18n.global.t(key), `${locale} is still English`).not.toBe(key)
    }

    i18n.global.locale.value = 'fr'
    expect(i18n.global.t(key)).toBe('Scannez pour rejoindre le Wi-Fi')
  })

  it('knows the right-to-left languages', () => {
    expect(isRtlLocale('ar')).toBe(true)
    expect(isRtlLocale('ar-EG')).toBe(true)
    expect(isRtlLocale('he')).toBe(true)
    expect(isRtlLocale('fa')).toBe(true)
    expect(isRtlLocale('ur-PK')).toBe(true)
    expect(isRtlLocale('fr')).toBe(false)
  })
})

describe('stored language', () => {
  it('accepts the codes this build ships', () => {
    expect(resolveStoredLocale('pt-BR')).toBe('pt-BR')
    expect(resolveStoredLocale('zh-hans')).toBe('zh-HANS')
    expect(resolveStoredLocale('FR')).toBe('fr')
  })

  it('maps the codes written by older builds', () => {
    expect(resolveStoredLocale('ptBR')).toBe('pt-BR')
    expect(resolveStoredLocale('ptPT')).toBe('pt-BR')
    expect(resolveStoredLocale('pt')).toBe('pt-BR')
    expect(resolveStoredLocale('zhHANS')).toBe('zh-HANS')
    expect(resolveStoredLocale('zh')).toBe('zh-HANS')
  })

  it('rejects everything else', () => {
    expect(resolveStoredLocale('de')).toBeNull()
    expect(resolveStoredLocale('fr-CA')).toBeNull()
    expect(resolveStoredLocale('')).toBeNull()
    expect(resolveStoredLocale(null)).toBeNull()
    expect(isSupportedLocale('de')).toBe(false)
    expect(isSupportedLocale('ar')).toBe(true)
  })
})

describe('language detection', () => {
  it('prefers the stored choice over the browser languages', () => {
    setBrowserLanguages(['fr-FR'])
    localStorage.setItem(LOCALE_STORAGE_KEY, 'ptBR')

    expect(detectLocale()).toBe('pt-BR')
  })

  it('falls back to the browser language when nothing is stored', () => {
    setBrowserLanguages(['es-AR', 'en-US'])

    expect(detectBrowserLocale()).toBe('es')
    expect(detectLocale()).toBe('es')
  })

  it('matches the full code before the base language', () => {
    setBrowserLanguages(['pt-BR'])
    expect(detectBrowserLocale()).toBe('pt-BR')

    setBrowserLanguages(['zh-Hans-CN'])
    expect(detectBrowserLocale()).toBe('zh-HANS')
  })

  it('keeps the browser preference order', () => {
    setBrowserLanguages(['de-DE', 'ar-EG'])

    expect(detectBrowserLocale()).toBe('ar')
  })

  it('falls back to English when no language matches', () => {
    setBrowserLanguages(['de-DE', 'ja-JP'])

    expect(detectBrowserLocale()).toBeNull()
    expect(detectLocale()).toBe('en')
  })
})

describe('applying a language', () => {
  it('keeps the document language and direction in sync', () => {
    expect(applyLocale('ar')).toBe('ar')
    expect(i18n.global.locale.value).toBe('ar')
    expect(document.documentElement.lang).toBe('ar')
    expect(document.documentElement.dir).toBe('rtl')

    applyLocale('fr')
    expect(i18n.global.locale.value).toBe('fr')
    expect(document.documentElement.lang).toBe('fr')
    expect(document.documentElement.dir).toBe('ltr')
  })
})
