<script setup lang="ts">
import { nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import type { PrintSheetPayload } from '@/utils/printDetails'

const props = defineProps<{ payload: PrintSheetPayload | null }>()
const emit = defineEmits<{ (e: 'done'): void }>()

const artContainer = ref<HTMLElement | null>(null)
let previousDocumentTitle = ''

/**
 * Mounts the exported SVG markup into the sheet.
 *
 * The markup is parsed with `DOMParser` and adopted with `importNode` instead
 * of being bound with `v-html`, so the export string is never executed as HTML
 * (same approach as `StyledQRCode.vue`). Frame, caption, logo and corners all
 * live inside that SVG, which is why every code type prints identically to the
 * "Download SVG" output.
 */
async function renderArt() {
  await nextTick()
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
}

function restoreDocumentTitle() {
  if (previousDocumentTitle) {
    document.title = previousDocumentTitle
    previousDocumentTitle = ''
  }
}

watch(
  () => props.payload,
  async (payload) => {
    if (payload) {
      previousDocumentTitle = previousDocumentTitle || document.title
      document.title = payload.title
    } else {
      restoreDocumentTitle()
    }
    await renderArt()
  },
  { immediate: true }
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
      :style="{ background: payload.background }"
    >
      <div ref="artContainer" class="qr-print-sheet__art"></div>
      <div v-if="payload.details.length > 0" class="qr-print-sheet__details">
        <div v-for="detail in payload.details" :key="detail.label" class="qr-print-sheet__row">
          <span class="qr-print-sheet__label">{{ detail.label }}</span>
          <span class="qr-print-sheet__value">{{ detail.value }}</span>
        </div>
      </div>
    </section>
  </Teleport>
</template>
