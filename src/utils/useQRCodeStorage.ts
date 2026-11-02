import type { Options as StyledQRCodeProps } from '@/lib/qr-code'
import type { FrameStyle } from './framePresets'
import { isValidQRCodeConfig } from './qrCodePresets'
import { sanitizeSimpleFields, type QRViewMode, type SimpleFieldKey } from './simpleModeFields'

export interface QRCodeFrameConfig {
  text: string
  position: 'top' | 'bottom' | 'left' | 'right'
  style: FrameStyle
  /** Side captions only: caption column width in px (default 200). */
  captionWidth?: number
}

export interface QRCodeConfig {
  props: StyledQRCodeProps & { name?: string }
  style: {
    borderRadius: string
    background?: string
  }
  frame?: QRCodeFrameConfig | null
}

export const QR_CODE_STORAGE_KEY = 'qrCodeConfig'
export const LAST_LOADED_LOCALLY_PRESET_KEY = 'Last saved locally'
export const LOADED_FROM_FILE_PRESET_KEY = 'Loaded from file'
export const CUSTOM_LOADED_PRESET_KEYS = [
  LAST_LOADED_LOCALLY_PRESET_KEY,
  LOADED_FROM_FILE_PRESET_KEY
] as const

export function isLocalStorageEnabled(): boolean {
  return import.meta.env?.VITE_DISABLE_LOCAL_STORAGE !== 'true'
}

export function hasStoredQRConfig(): boolean {
  return localStorage.getItem(QR_CODE_STORAGE_KEY) !== null
}

export function serializeQRConfig(
  props: StyledQRCodeProps & { name?: string },
  style: { borderRadius: string; background?: string },
  frame: QRCodeFrameConfig | null
): QRCodeConfig {
  return { props, style, frame }
}

/**
 * Returns a copy of `props` without the encoded payload.
 *
 * `props.data` *is* the payload: a URL, but just as often a Wi-Fi password, the
 * contact details in a vCard or the body of a `mailto:` link. The stored config
 * is only ever used to restore the design — `applyQRConfig` is called without
 * `restoreData`, and presets deliberately never touch the user's data — so a
 * clear-text copy in localStorage buys nothing and leaks PII (CWE-312).
 */
export function stripSensitivePayload(
  props: StyledQRCodeProps & { name?: string }
): StyledQRCodeProps & { name?: string } {
  const { data: _payload, ...persistable } = props
  return persistable
}

export function saveQRConfig(config: QRCodeConfig): void {
  // Rebuild the config field by field instead of spreading `config`, so the
  // payload cannot ride along with the object that gets serialised.
  const persistable: QRCodeConfig = {
    props: stripSensitivePayload(config.props),
    style: { borderRadius: config.style.borderRadius, background: config.style.background },
    frame: config.frame
      ? {
          text: config.frame.text,
          position: config.frame.position,
          style: { ...config.frame.style },
          captionWidth: config.frame.captionWidth
        }
      : null
  }
  localStorage.setItem(QR_CODE_STORAGE_KEY, JSON.stringify(persistable))
}

export function loadQRConfig(): QRCodeConfig | null {
  const stored = localStorage.getItem(QR_CODE_STORAGE_KEY)
  if (!stored) return null
  try {
    const parsed: unknown = JSON.parse(stored)
    if (!isValidQRCodeConfig(parsed)) return null
    return parsed
  } catch {
    return null
  }
}

// --- Simple Mode view preferences -----------------------------------------
// Persisted separately from the QR config so toggling the view never mutates
// the stored design. Both reads tolerate missing/corrupt values by returning a
// safe default, mirroring loadQRConfig.

export const QR_VIEW_MODE_STORAGE_KEY = 'qrViewMode'
export const QR_SIMPLE_FIELDS_STORAGE_KEY = 'qrSimpleFields'

export function saveViewMode(mode: QRViewMode): void {
  localStorage.setItem(QR_VIEW_MODE_STORAGE_KEY, mode)
}

export function loadViewMode(): QRViewMode | null {
  const stored = localStorage.getItem(QR_VIEW_MODE_STORAGE_KEY)
  return stored === 'simple' || stored === 'full' ? stored : null
}

export function saveSimpleFields(keys: SimpleFieldKey[]): void {
  localStorage.setItem(QR_SIMPLE_FIELDS_STORAGE_KEY, JSON.stringify(keys))
}

export function loadSimpleFields(): SimpleFieldKey[] {
  const stored = localStorage.getItem(QR_SIMPLE_FIELDS_STORAGE_KEY)
  if (!stored) return []
  try {
    return sanitizeSimpleFields(JSON.parse(stored))
  } catch {
    return []
  }
}
