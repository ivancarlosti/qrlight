import { detectDataType } from './dataEncoding'

/** A label/value pair rendered under the QR code on the printed sheet. */
export interface PrintDetail {
  label: string
  value: string
}

/** Everything the print sheet needs to render one page. */
export interface PrintSheetPayload {
  /** Inlined SVG markup of the QR code (frame, caption and logo included). */
  svg: string
  /** Rows printed under the QR code; empty when details are switched off. */
  details: PrintDetail[]
  /** Opaque page background derived from the configured QR background. */
  background: string
  /** Document title while the print dialog is open (used in page headers). */
  title: string
}

type QrDataType = ReturnType<typeof detectDataType>['type']

/**
 * Translation keys describing each payload type. They all already exist in
 * `locales/*.json` (the scanner uses the same wording), so the printed sheet
 * is localized without adding new strings for every language.
 */
const DATA_TYPE_LABEL_KEYS: Record<QrDataType, string> = {
  text: 'Text',
  url: 'URL',
  email: 'Email',
  phone: 'Phone Number',
  sms: 'SMS',
  wifi: 'WiFi',
  vcard: 'Contact Card',
  location: 'Location',
  event: 'Calendar Event',
  epc: 'SEPA Payment'
}

/** Translator signature — same contract as vue-i18n's `t`. */
export type PrintDetailsTranslator = (key: string) => string

/**
 * Paper is opaque, so a QR code configured with a transparent background would
 * print its dots over whatever happens to be behind the sheet (often nothing,
 * which renders them effectively invisible). Fall back to white.
 */
export const getPrintableBackground = (background: string | undefined): string => {
  if (!background || background === 'transparent') return '#ffffff'
  return background
}

/** Human readable, localized description of what a payload contains. */
export const describeDataType = (data: string, t: PrintDetailsTranslator): string =>
  t(DATA_TYPE_LABEL_KEYS[detectDataType(data).type])

/**
 * Builds the rows printed under the QR code: which kind of data is encoded,
 * the exact payload (so the code can be re-generated from the paper), and the
 * frame caption when the code has one.
 */
export const buildPrintDetails = (options: {
  data: string
  frameText?: string
  t: PrintDetailsTranslator
}): PrintDetail[] => {
  const { data, frameText, t } = options

  if (!data) return []

  const details: PrintDetail[] = [
    { label: t('Data type'), value: describeDataType(data, t) },
    { label: t('Encoded content'), value: data }
  ]

  const caption = frameText?.trim()
  if (caption) {
    details.push({ label: t('Caption'), value: caption })
  }

  return details
}
