<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, watch } from 'vue'
import type { PrintSheetPayload } from '@/utils/printDetails'

const props = defineProps<{ payload: PrintSheetPayload | null }>()
const emit = defineEmits<{ (e: 'done'): void }>()

const artContainer = ref<HTMLElement | null>(null)
let previousDocumentTitle = ''

/**
 * Waits until the browser has decoded everything inside the sheet.
 *
 * A logo is inlined as a `data:` URI by the export, but drawing it is still
 * asynchronous — a print snapshot taken while it decodes prints a blank spot.
 * Framed codes use the configured font family, hence the font wait. The final
 * frame gives the engine a chance to lay the SVG out before the dialog opens.
 */
async function waitForPrintAssets(container: HTMLElement) {
  const images = Array.from(container.querySelectorAll('image'))

  await Promise.all(
    images.map((image) => {
      const href = image.getAttribute('href') ?? image.getAttribute('xlink:href')
      if (!href) return Promise.resolve()

      return new Promise<void>((resolve) => {
        const probe = new Image()
        probe.onload = () => resolve()
        probe.onerror = () => resolve()
        probe.src = href
      })
    })
  )

  if (document.fonts) {
    await document.fonts.ready
  }

  await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()))
}

/**
 * Mounts the exported SVG markup into the sheet.
 *
 * The markup is parsed with `DOMParser` and adopted with `importNode` instead
 * of being bound with `v-html`, so the export string is never executed as HTML
 * (same approach as `StyledQRCode.vue`). Frame, caption, logo and corners all
 * live inside that SVG, which is why every code type prints identically to the
 * "Download SVG" output.
 *
 * Exposed to the parent as `renderArt()` because `window.print()` has to run
 * *after* this resolves: browsers snapshot the document when `print()` is
 * called, so a snapshot taken while the art container is still empty prints a
 * sheet without a code.
 */
async function renderArt(): Promise<void> {
  const container = artContainer.value
  if (!container) return

  container.replaceChildren()

  const svg = props.payload?.svg
  if (!svg) return

  const doc = new DOMParser().parseFromString(svg, 'image/svg+xml')
  const root = doc.documentElement
  if (!root || root.nodeName.toLowerCase() !== 'svg') {
    console.error('Print sheet: the export did not produce an SVG document')
    return
  }

  container.appendChild(document.importNode(root, true))
  await waitForPrintAssets(container)
}

defineExpose({ renderArt })

function restoreDocumentTitle() {
  if (previousDocumentTitle) {
    document.title = previousDocumentTitle
    previousDocumentTitle = ''
  }
}

// Rendering is driven by `renderArt()`: the parent awaits it before opening the
// print dialog. Only the page title is kept in sync here, so the printed page
// header uses the export filename.
watch(
  () => props.payload,
  (payload) => {
    if (payload) {
      previousDocumentTitle = previousDocumentTitle || document.title
      document.title = payload.title
    } else {
      restoreDocumentTitle()
    }
  }
)

/*
 * The sheet has to stay in the document while the browser rasterizes it, so it
 * is only torn down once the print dialog reports that it closed.
 */
const handleAfterPrint = () => emit('done')

onMounted(() => window.addEventListener('afterprint', handleAfterPrint))
onBeforeUnmount(() => {
  window.removeEventListener('afterprint', handleAfterPrint)
  restoreDocumentTitle()
})
</script>

<template>
  <Teleport to="body">
    <section
      v-if="payload"
      id="qr-print-sheet"
      class="qr-print-sheet"
      :class="{ 'qr-print-sheet--wifi': !!payload.wifi }"
      :style="{ background: payload.background }"
    >
      <div ref="artContainer" class="qr-print-sheet__art"></div>

      <div v-if="payload.wifi" class="qr-print-sheet__wifi">
        <div class="qr-print-sheet__wifi-title">{{ payload.wifi.heading }}</div>
        <div v-for="row in payload.wifi.rows" :key="row.label" class="qr-print-sheet__wifi-row">
          <span class="qr-print-sheet__wifi-label">{{ row.label }}</span>
          <span
            class="qr-print-sheet__wifi-value"
            :class="{ 'qr-print-sheet__wifi-value--emphasis': row.emphasis }"
            >{{ row.value }}</span
          >
        </div>
      </div>

      <div v-if="payload.details.length > 0" class="qr-print-sheet__details">
        <div v-for="detail in payload.details" :key="detail.label" class="qr-print-sheet__row">
          <span class="qr-print-sheet__label">{{ detail.label }}</span>
          <span class="qr-print-sheet__value">{{ detail.value }}</span>
        </div>
      </div>
    </section>
  </Teleport>
</template>
