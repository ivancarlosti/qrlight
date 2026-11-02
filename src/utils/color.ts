/**
 * Uniform random integer in [0, maxExclusive).
 *
 * Uses the Web Crypto CSPRNG instead of `Math.random()`: the values produced
 * here are purely cosmetic, but a non-cryptographic PRNG is a CWE-338 weakness
 * and these colours end up inside the config objects the app persists.
 * `getRandomValues` (unlike `crypto.subtle`) is also available outside secure
 * contexts, so serving the app over plain HTTP on a LAN keeps working.
 */
function randomInt(maxExclusive: number): number {
  if (maxExclusive <= 0) return 0
  const buffer = new Uint32Array(1)
  crypto.getRandomValues(buffer)
  return Math.floor((buffer[0] / 0x100000000) * maxExclusive)
}

/**
 * A random `#rrggbb` colour.
 *
 * The zero padding is required: `toString(16)` drops leading zeros, so shorter
 * values (e.g. `#abcde`) are not valid hex colours for `<input type="color">`
 * or for the CSS/SVG consumers of this value.
 */
export function createRandomColor(): string {
  return '#' + randomInt(0x1000000).toString(16).padStart(6, '0')
}

export function getRandomItemInArray<T>(array: T[]): T {
  return array[randomInt(array.length)]
}
