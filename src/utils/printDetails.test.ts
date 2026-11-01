import { describe, it, expect } from 'vitest'
import {
  buildPrintDetails,
  describeDataType,
  getPrintableBackground,
  type PrintDetailsTranslator
} from './printDetails'

// Identity translator: the assertion then reads the translation key, which is
// exactly what `t` returns for an untranslated English string.
const t: PrintDetailsTranslator = (key) => key

describe('print details', () => {
  it('falls back to white for transparent backgrounds', () => {
    expect(getPrintableBackground('transparent')).toBe('#ffffff')
    expect(getPrintableBackground(undefined)).toBe('#ffffff')
    expect(getPrintableBackground('')).toBe('#ffffff')
    expect(getPrintableBackground('#123456')).toBe('#123456')
    expect(getPrintableBackground('rgb(255, 0, 0)')).toBe('rgb(255, 0, 0)')
  })

  it('describes the payload type', () => {
    expect(describeDataType('https://example.com', t)).toBe('URL')
    expect(describeDataType('mailto:test@example.com', t)).toBe('Email')
    expect(describeDataType('WIFI:T:SAE;S:Net;P:pw;;', t)).toBe('WiFi')
    expect(describeDataType('tel:+123456', t)).toBe('Phone Number')
    expect(describeDataType('SMSTO:+123456:hi', t)).toBe('SMS')
    expect(describeDataType('just some text', t)).toBe('Text')
  })

  it('returns no rows without data', () => {
    expect(buildPrintDetails({ data: '', t })).toEqual([])
  })

  it('prints the data type and the encoded content', () => {
    expect(buildPrintDetails({ data: 'https://example.com', t })).toEqual([
      { label: 'Data type', value: 'URL' },
      { label: 'Encoded content', value: 'https://example.com' }
    ])
  })

  it('prints the frame caption only when it is set', () => {
    expect(buildPrintDetails({ data: 'hi', frameText: '  Scan me  ', t })).toEqual([
      { label: 'Data type', value: 'Text' },
      { label: 'Encoded content', value: 'hi' },
      { label: 'Caption', value: 'Scan me' }
    ])
    expect(buildPrintDetails({ data: 'hi', frameText: '   ', t })).toHaveLength(2)
    expect(buildPrintDetails({ data: 'hi', frameText: '', t })).toHaveLength(2)
  })

  it('keeps multi-line payloads intact', () => {
    const vcard = 'BEGIN:VCARD\nVERSION:3.0\nFN:Jane Doe\nEND:VCARD'
    const details = buildPrintDetails({ data: vcard, t })

    expect(details[0]).toEqual({ label: 'Data type', value: 'Contact Card' })
    expect(details[1]?.value).toBe(vcard)
  })
})
