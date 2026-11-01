import { detectDataType, parseWifiPayload, type WifiEncryption } from './dataEncoding'

/** A label/value pair rendered under the QR code on the printed sheet. */
export interface PrintDetail {
  label: string
  value: string
  /** Rendered larger and bolder — used for the Wi-Fi password. */
  emphasis?: boolean
}

/** The Wi-Fi card printed under the code so a visitor can join by hand. */
export interface PrintWifiCard {
  /** Localized heading above the fields, e.g. "Scan to join the Wi-Fi". */
  heading: string
  rows: PrintDetail[]
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
  /** Set for Wi-Fi payloads; replaces the generic data type / payload rows. */
  wifi?: PrintWifiCard
}

/** What the details area of the sheet shows for a given payload. */
export interface PrintSheetContent {
  details: PrintDetail[]
  wifi?: PrintWifiCard
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

/**
 * Localized name of a Wi-Fi security mode. Written as explicit `t()` calls (and
 * not looked up from a record) so `pnpm sync-i18n` finds every key in the
 * source instead of adding them by hand.
 */
const describeWifiSecurity = (encryption: WifiEncryption, t: PrintDetailsTranslator): string => {
  switch (encryption) {
    case 'nopass':
      return t('No encryption')
    case 'WEP':
      return t('WEP')
    case 'SAE':
      return t('WPA3 (SAE)')
    default:
      return t('WPA/WPA2/WPA3')
  }
}

/**
 * Builds the Wi-Fi card printed for handouts: the network name, its password and
 * the security mode, so a visitor can also join by typing them in.
 *
 * Returns `null` for every other payload type, and for `WIFI:` payloads without
 * a network name (nothing useful to print).
 */
export const buildPrintWifiCard = (options: {
  data: string
  t: PrintDetailsTranslator
}): PrintWifiCard | null => {
  const { data, t } = options
  const wifi = parseWifiPayload(data)

  if (!wifi || !wifi.ssid) return null

  const rows: PrintDetail[] = [{ label: t('Network Name (SSID)'), value: wifi.ssid }]

  // Open networks have no password to type in, and neither has an empty one.
  if (wifi.encryption !== 'nopass' && wifi.password) {
    rows.push({ label: t('Password'), value: wifi.password, emphasis: true })
  }

  rows.push({ label: t('Encryption'), value: describeWifiSecurity(wifi.encryption, t) })

  if (wifi.hidden) {
    rows.push({ label: t('Hidden SSID'), value: t('Yes') })
  }

  return { heading: t('Scan to join the Wi-Fi'), rows }
}

/**
 * Chooses what to print under the code: the Wi-Fi card for Wi-Fi payloads (the
 * raw `WIFI:T:…` string is noise on a visitor handout), the data type and exact
 * payload for everything else. The frame caption is printed either way, so the
 * paper code can still be re-created later.
 */
export const buildPrintSheetContent = (options: {
  data: string
  frameText?: string
  t: PrintDetailsTranslator
}): PrintSheetContent => {
  const { data, frameText, t } = options
  const wifi = buildPrintWifiCard({ data, t })

  if (!wifi) return { details: buildPrintDetails({ data, frameText, t }) }

  const caption = frameText?.trim()
  return {
    details: caption ? [{ label: t('Caption'), value: caption }] : [],
    wifi
  }
}
