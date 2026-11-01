import { describe, it, expect } from 'vitest'
import {
  buildPrintDetails,
  buildPrintSheetContent,
  buildPrintWifiCard,
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

  describe('Wi-Fi handouts', () => {
    it('prints the credentials instead of the raw payload', () => {
      expect(buildPrintSheetContent({ data: 'WIFI:T:WPA;S:CafeGuest;P:welcome123;;', t })).toEqual({
        details: [],
        wifi: {
          heading: 'Scan to join the Wi-Fi',
          rows: [
            { label: 'Network Name (SSID)', value: 'CafeGuest' },
            { label: 'Password', value: 'welcome123', emphasis: true },
            { label: 'Encryption', value: 'WPA/WPA2/WPA3' }
          ]
        }
      })
    })

    it('describes every security mode', () => {
      const security = (data: string) =>
        buildPrintWifiCard({ data, t })?.rows.find((row) => row.label === 'Encryption')?.value

      expect(security('WIFI:T:WEP;S:Net;P:pw;;')).toBe('WEP')
      expect(security('WIFI:T:SAE;S:Net;P:pw;;')).toBe('WPA3 (SAE)')
      expect(security('WIFI:T:nopass;S:Net;;;')).toBe('No encryption')
    })

    it('omits the password row for open networks', () => {
      expect(buildPrintWifiCard({ data: 'WIFI:T:nopass;S:Guest;;;', t })?.rows).toEqual([
        { label: 'Network Name (SSID)', value: 'Guest' },
        { label: 'Encryption', value: 'No encryption' }
      ])
    })

    it('omits an empty password instead of printing a blank row', () => {
      expect(buildPrintWifiCard({ data: 'WIFI:T:WPA;S:Net;P:;;', t })?.rows).toEqual([
        { label: 'Network Name (SSID)', value: 'Net' },
        { label: 'Encryption', value: 'WPA/WPA2/WPA3' }
      ])
    })

    it('unescapes the SSID and flags hidden networks', () => {
      expect(
        buildPrintWifiCard({ data: 'WIFI:T:WPA;S:Cafe\\;Bar;P:pw;H:true;;', t })?.rows
      ).toEqual([
        { label: 'Network Name (SSID)', value: 'Cafe;Bar' },
        { label: 'Password', value: 'pw', emphasis: true },
        { label: 'Encryption', value: 'WPA/WPA2/WPA3' },
        { label: 'Hidden SSID', value: 'Yes' }
      ])
    })

    it('keeps the frame caption with the card', () => {
      const content = buildPrintSheetContent({
        data: 'WIFI:T:WPA;S:Net;P:pw;;',
        frameText: '  Scan me  ',
        t
      })

      expect(content.details).toEqual([{ label: 'Caption', value: 'Scan me' }])
      expect(content.wifi?.rows).toHaveLength(3)
    })

    it('falls back to the generic rows without a network name', () => {
      expect(buildPrintWifiCard({ data: 'WIFI:T:WPA;P:pw;;', t })).toBeNull()
      expect(buildPrintSheetContent({ data: 'WIFI:T:WPA;P:pw;;', t })).toEqual({
        details: [
          { label: 'Data type', value: 'WiFi' },
          { label: 'Encoded content', value: 'WIFI:T:WPA;P:pw;;' }
        ]
      })
    })

    it('leaves other payload types on the generic rows', () => {
      expect(buildPrintSheetContent({ data: 'https://example.com', t })).toEqual({
        details: [
          { label: 'Data type', value: 'URL' },
          { label: 'Encoded content', value: 'https://example.com' }
        ]
      })
    })
  })
})
