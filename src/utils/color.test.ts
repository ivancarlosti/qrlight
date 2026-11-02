import { afterEach, describe, expect, it, vi } from 'vitest'
import { createRandomColor, getRandomItemInArray } from './color'

/** Replaces the Web Crypto CSPRNG with a fixed value for deterministic runs. */
function stubRandomValues(value: number): void {
  vi.stubGlobal('crypto', {
    getRandomValues: (array: Uint32Array) => {
      array[0] = value
      return array
    }
  })
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('createRandomColor', () => {
  it('returns a 6-digit lowercase hex colour', () => {
    for (let i = 0; i < 500; i++) {
      expect(createRandomColor()).toMatch(/^#[0-9a-f]{6}$/)
    }
  })

  it('zero-pads the hex digits', () => {
    // A 32-bit draw of 0x100 maps to index 1, which used to be rendered as `#1`
    // — not a valid value for <input type="color">.
    stubRandomValues(0x100)
    expect(createRandomColor()).toBe('#000001')
  })

  it('reaches the top of the range', () => {
    // The old `Math.random() * 16777215` bound made `#ffffff` unreachable.
    stubRandomValues(0xffffffff)
    expect(createRandomColor()).toBe('#ffffff')
  })

  it('uses the crypto CSPRNG, not Math.random', () => {
    const random = vi.spyOn(Math, 'random')
    createRandomColor()
    expect(random).not.toHaveBeenCalled()
    random.mockRestore()
  })
})

describe('getRandomItemInArray', () => {
  const items = ['a', 'b', 'c']

  it('picks the first element for the lowest random value', () => {
    stubRandomValues(0)
    expect(getRandomItemInArray(items)).toBe('a')
  })

  it('picks the last element for the highest random value', () => {
    stubRandomValues(0xffffffff)
    expect(getRandomItemInArray(items)).toBe('c')
  })

  it('returns undefined for an empty array', () => {
    stubRandomValues(0)
    expect(getRandomItemInArray<string>([])).toBeUndefined()
  })

  it('uses the crypto CSPRNG, not Math.random', () => {
    const random = vi.spyOn(Math, 'random')
    getRandomItemInArray(items)
    expect(random).not.toHaveBeenCalled()
    random.mockRestore()
  })
})
