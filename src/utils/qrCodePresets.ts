import PlainConfig from '@/assets/presets/plain.json'
import { isValidFrameConfig } from './framePresets'
import type { DrawType, Options as StyledQRCodeProps } from '@/lib/qr-code'
import type { QRCodeConfig } from './useQRCodeStorage'

export interface CustomStyleProps {
  borderRadius?: string
  background?: string
}

export type PresetAttributes = {
  style: CustomStyleProps
  name: string
}

export type Preset = Omit<
  Required<StyledQRCodeProps>,
  'shape' | 'qrOptions' | 'nodeCanvas' | 'jsdom'
> &
  PresetAttributes

const defaultPresetOptions = {
  backgroundOptions: {
    color: 'transparent'
  },
  imageOptions: {
    margin: 0
  },
  width: 200,
  height: 200,
  margin: 0,
  type: 'svg' as DrawType
}

/**
 * The only built-in design preset.
 *
 * QRLight ships one neutral, print-friendly style instead of the branded
 * samples upstream carried. Deployments that want their own designs can
 * replace the list entirely with `VITE_QR_CODE_PRESETS` (a JSON array of
 * `Preset` objects).
 */
export const plainPreset = {
  ...defaultPresetOptions,
  name: 'Plain',
  ...PlainConfig.props,
  style: PlainConfig.style
} as Preset

export const builtInPresets: Preset[] = [plainPreset]

function parsePresetsFromEnv(envVal?: string): Preset[] | undefined {
  if (!envVal) return undefined
  try {
    return JSON.parse(envVal) as Preset[]
  } catch (err) {
    console.error('Failed to parse VITE_QR_CODE_PRESETS', err)
    return undefined
  }
}

const envPresets = parsePresetsFromEnv(import.meta.env.VITE_QR_CODE_PRESETS)
export const allQrCodePresets: Preset[] = envPresets ?? builtInPresets

/**
 * Resolution order:
 * 1. `VITE_DEFAULT_PRESET` when it names a configured preset.
 * 2. `Plain` (the shipped default).
 * 3. The first configured preset, for deployments whose env list replaces the
 *    built-in presets and does not include a `Plain` entry.
 */
export const defaultPreset: Preset =
  allQrCodePresets.find(
    (p) => p.name === (import.meta.env.VITE_DEFAULT_PRESET || plainPreset.name)
  ) ?? allQrCodePresets[0]

/**
 * Logo image URLs are looser than frame background images
 * (isValidFrameBackgroundImage): besides http(s) and data:image, custom
 * presets may use Vite asset paths (e.g. /assets/logo-<hash>.png), so
 * scheme-less same-origin paths must stay loadable. Only an explicit
 * non-http(s), non-image scheme (javascript:, file:, data:text/html, …) is
 * rejected — those have no business in an <image href>.
 */
export function isSafeImageUrl(value: string): boolean {
  if (value === '') return true
  if (/^data:/i.test(value)) return /^data:image\//i.test(value)
  const scheme = /^[a-z][a-z0-9+.-]*:/i.exec(value)
  if (scheme) return /^https?:$/i.test(scheme[0])
  return true // scheme-less: relative or root-relative same-origin path
}

export function isValidQRCodeConfig(value: unknown): value is QRCodeConfig {
  if (!value || typeof value !== 'object') return false
  const c = value as Record<string, unknown>
  if (!c.props || typeof c.props !== 'object') return false
  const props = c.props as Record<string, unknown>
  if (props.image != null && (typeof props.image !== 'string' || !isSafeImageUrl(props.image))) {
    return false
  }
  if (!c.style || typeof c.style !== 'object') return false
  const style = c.style as Record<string, unknown>
  if (typeof style.borderRadius !== 'string') return false
  if (c.frame != null && !isValidFrameConfig(c.frame)) return false
  return true
}
