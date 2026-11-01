<div align="center">

# QRLight

A self-contained QR code generator and scanner, with a first-class **Print**
action and **WPA3** Wi-Fi codes.

QRLight is a fork of [Mini QR](https://github.com/lyqht/mini-qr) by Estee Tey
(GPL-3.0). The fork exists to add two things — printing a code together with
its frame and caption, and Wi-Fi codes that work with WPA3-only access points —
and to drop the upstream update check so the app never phones home. Everything
else is upstream's work.

</div>

<!-- buttons -->

<!-- endbuttons -->

## Features

- **Print** — sends the code to the browser print dialog exactly as previewed:
  same dots, corners, logo, frame, caption and colours. Optionally prints a
  details block underneath: the data type and exact encoded payload (so the paper
  code can be re-created later), or — for Wi-Fi codes — a card with the network
  name, password, security and hidden flag so a visitor can also join by hand.
- **All code types** — text, URL, e-mail, phone, SMS, Wi-Fi, vCard, location,
  calendar event and SEPA payment; printing goes through the same SVG export path,
  so every type prints identically.
- **WPA3 (SAE) Wi-Fi codes** — besides the classic `WPA/WPA2/WPA3` token, the
  Wi-Fi form can emit the explicit `T:SAE` token used for WPA3-Personal networks
  that reject WPA2 clients.
- **Design controls** — dot styles and colours, corner styles, gradients, logos,
  frames with captions and Google Fonts.
- **Export** — PNG, JPG, SVG, ASCII/Unicode text, batch export from CSV, and
  copy-to-clipboard.
- **Scanner** — scan codes with the camera or from an image file.
- **Offline PWA** — installable, and every feature works without a backend.
- **No update check** — nothing in this fork polls a remote endpoint.

## Getting started

Requirements: Node.js 20 or newer and [pnpm](https://pnpm.io) 10.

```bash
pnpm install
pnpm dev          # http://localhost:5173
```

Other scripts:

| Command                     | What it does                                                                |
| --------------------------- | --------------------------------------------------------------------------- |
| `pnpm build`                | Production build into `dist/`                                               |
| `pnpm preview`              | Serve the production build locally                                          |
| `pnpm vitest run`           | Unit and browser tests                                                      |
| `pnpm test:e2e`             | Playwright end-to-end tests (needs `pnpm exec playwright install chromium`) |
| `pnpm type-check`           | `vue-tsc --noEmit`                                                          |
| `pnpm lint` / `pnpm format` | ESLint / Prettier                                                           |
| `pnpm sync-i18n`            | Adds missing `t()` keys to `locales/en.json`                                |

## Printing

The **Print** button lives in the _Export QR code_ section, next to PNG/JPG/SVG/TXT.
It renders the same SVG that _Download SVG_ produces (frame, caption and logo
included), mounts it into a print-only sheet and opens the browser print dialog.
The dialog is opened only after the code is in the DOM and its images and fonts
have decoded, because browsers snapshot the page when `print()` is called — an
earlier snapshot reaches paper printers with an empty code area.

- `Include details on the printed page` (on by default) adds a details block under
  the code.
- For Wi-Fi payloads that block is a card with the network name (SSID), the
  password in large monospace type, the security mode (`No encryption`, `WEP`,
  `WPA/WPA2/WPA3` or `WPA3 (SAE)`) and, for hidden networks, `Hidden SSID: Yes`.
  The raw `WIFI:T:…` payload is not printed — the card says the same thing in a
  form a visitor can type in.
- Every other payload type prints its data type and exact encoded payload, plus
  the frame caption when one is set.
- A transparent QR background is printed as white — paper is opaque, so dots on
  transparent would otherwise be invisible.
- Printing is available for single exports; batch export keeps its ZIP flow.

The sheet is styled by `src/print.css`. While printing, every other element in
`<body>` is hidden, so dialogs, drawers and toasts never reach the paper.

## WPA3 Wi-Fi codes

Wi-Fi QR payloads follow the de-facto spec everyone implements
([ZXing](https://github.com/zxing/zxing/wiki/Barcode-Contents#wi-fi-network-config-android-ios-11)):
`WIFI:T:<security>;S:<ssid>;P:<password>;H:<hidden>;;`.

| Option in the form | Payload    | When to use it                                                                               |
| ------------------ | ---------- | -------------------------------------------------------------------------------------------- |
| No encryption      | `T:nopass` | Open network                                                                                 |
| WEP                | `T:WEP`    | Legacy WEP                                                                                   |
| WPA/WPA2/WPA3      | `T:WPA`    | Default. Android and iOS negotiate the strongest protocol the network offers, including WPA3 |
| WPA3 (SAE)         | `T:SAE`    | Networks that only accept WPA3-Personal (SAE) clients                                        |

Scanned codes are normalised back into these four options, so `T:wpa2`,
`T:WPA3`, `T:sae` and mixed-case tokens all round-trip into the form instead of
silently becoming an open network.

## Configuration

Copy `.env.example` to `.env` and adjust as needed. All variables are inlined at
build time (`VITE_*`) except `BASE_PATH`.

| Variable                                   | Default      | Description                                                                                   |
| ------------------------------------------ | ------------ | --------------------------------------------------------------------------------------------- |
| `BASE_PATH`                                | `./`         | Base path the app is served from, e.g. `/qrlight`                                             |
| `VITE_APP_VERSION`                         | –            | Version shown in the footer. `vX.Y.Z` overrides the changelog lookup; set by the Docker build |
| `VITE_DEFAULT_PRESET`                      | first preset | Preset name used for a fresh session, e.g. `Plain`                                            |
| `VITE_DEFAULT_DATA_TO_ENCODE`              | –            | Pre-filled data for the create form                                                           |
| `VITE_QR_CODE_PRESETS`                     | all          | Comma-separated whitelist of preset names                                                     |
| `VITE_FRAME_PRESET` / `VITE_FRAME_PRESETS` | –            | Default / whitelisted frame presets                                                           |
| `VITE_HIDE_CREDITS`                        | `false`      | Hides the footer credit line and the changelog dialog                                         |
| `VITE_DISABLE_LOCAL_STORAGE`               | `false`      | Disables persisting the config in `localStorage`                                              |
| `VITE_ENABLE_ANALYTICS`                    | `false`      | Enables Vercel Web Analytics                                                                  |
| `VITE_QR_CREATE_SIMPLE_FULL_MODE_TOGGLE`   | `false`      | Shows the Simple/Full mode toggle                                                             |
| `VITE_FIELDS_VISIBLE`                      | –            | Comma-separated field keys for a fixed Simple mode                                            |

## Docker

```bash
# Build (the tag is shown in the footer)
docker build -t qrlight:1.0.20 --build-arg VERSION=v1.0.20 .

# Run
docker run --rm -p 8080:8080 qrlight:1.0.20
```

The image is a two-stage build: Node builds the static bundle, then a slim
runtime serves `dist/` on port 8080. The build bakes in `VITE_DEFAULT_PRESET=Plain`,
`VITE_HIDE_CREDITS=true` and `VITE_DISABLE_LOCAL_STORAGE=true`; override them in
the `Dockerfile` (or your own build stage) if you want the full experience.

## Differences from upstream

| Change                   | Notes                                                                        |
| ------------------------ | ---------------------------------------------------------------------------- |
| Removed the update check | No polling of a remote version endpoint                                      |
| Added printing           | `QRCodePrintSheet.vue`, `src/print.css`, `printDetails.ts`                   |
| Added WPA3 (SAE)         | `WifiEncryption` gained `SAE`; scanned aliases are normalised                |
| Rebranded                | QRLight naming, locales and PWA manifest; upstream credit kept               |
| Vendored source          | Built straight from this repository, no upstream clone during `docker build` |

Upstream version this fork tracks: **Mini QR v0.33.0**.

## Credits and licence

QRLight is free software under the [GNU GPL v3](LICENSE), the same licence as
upstream. It is based on [Mini QR](https://github.com/lyqht/mini-qr) by
[Estee Tey](https://esteetey.dev) and its contributors; see [NOTICE.md](NOTICE.md)
for the full attribution. The internal QR renderer, presets, translations and
test suites come from that project.

<!-- footer -->

---

Based on [Mini QR](https://github.com/lyqht/mini-qr) by Estee Tey, licensed under GPL-3.0.
