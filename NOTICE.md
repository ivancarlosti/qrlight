# Notice

QRLight is a modified version of **Mini QR**, distributed under the
[GNU General Public License v3.0](LICENSE).

## Upstream

- Project: Mini QR — _A minimal QR code generator and scanner_
- Source: <https://github.com/lyqht/mini-qr>
- Version this fork was taken from: **v0.33.0**
- Author: Estee Tey and the Mini QR contributors
- Licence: GNU GPL v3.0 (see [LICENSE](LICENSE), which retains the upstream
  copyright notice)

## Modifications in this fork

1. The upstream update check was removed. QRLight never polls a remote version
   endpoint.
2. A **Print** action was added. It reuses the SVG export pipeline, renders the
   result into a print-only sheet (`src/components/QRCodePrintSheet.vue`,
   `src/print.css`) and opens the print dialog only after the code is mounted, so
   every browser rasterizes it. It optionally prints a details block
   (`src/utils/printDetails.ts`): the data type, encoded payload and frame caption
   for most payloads. Wi-Fi payloads always print a card with the SSID, password,
   security mode and hidden flag (`parseWifiPayload` in
   `src/utils/dataEncoding.ts`) instead of the raw `WIFI:` string, whether or not
   the details block is enabled.
3. Wi-Fi QR codes gained **WPA3 (SAE)** support: the payload can be emitted as
   `WIFI:T:SAE;...` for WPA3-Personal-only networks, and scanned security tokens
   (`WPA2`, `WPA3`, mixed case) are normalised into the form.
4. Branding, copy, default sample data, PWA manifest and the preset list (Plain
   only, as the default) were changed from Mini QR to QRLight. The application
   source is vendored in this repository, so the Docker image builds without
   cloning upstream.
5. The Crowdin translation sync, DeepL helper script, Storybook deployment
   workflow, Docker publishing workflow and the update-check workflow bundled
   with upstream were removed. The translation files themselves are kept as they
   were shipped.

No other functional changes were made.

## Third-party assets

The QR renderer, presets, fonts loading strategy, icons, translations and test
suites are upstream work and remain covered by the GNU GPL v3.0. The bundled
`Plain` preset derives from upstream's plain preset; the branded sample presets
(Vercel, Supabase, Vue, …) that shipped with it were removed.
