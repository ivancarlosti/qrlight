import { SUPPORTED_LOCALES, localeLabel, type SupportedLocale } from './i18n'

/**
 * The languages offered by the selector, ordered by their native name.
 *
 * There is no second list to keep in sync: `SUPPORTED_LOCALES` is the source of
 * truth and every label comes from the bundle itself. A fixed collator keeps
 * the order stable, so the entry a visitor is looking for stays in the same
 * place whatever language the UI is in.
 */
export const sortedLocales: SupportedLocale[] = [...SUPPORTED_LOCALES].sort((a, b) =>
  localeLabel(a).localeCompare(localeLabel(b), 'en')
)

export { localeLabel }
