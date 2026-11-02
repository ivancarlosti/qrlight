<script setup lang="ts">
import { Combobox } from '@/components/ui/Combobox'
import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { localeLabel, sortedLocales } from '@/utils/language'
import { readStoredLocale, writeStoredLocale } from '@/utils/i18n'

const isLocaleSelectOpen = ref(false)
const { t, locale } = useI18n()

/**
 * Each language is labelled with its own name ("Français", "العربية"), never
 * with a translation of it: the list stays readable and searchable whatever
 * language the UI is in, and switching language does not reorder it. The code
 * is appended to the search text so "pt" or "zh" finds the entry too.
 */
const locales = computed(() =>
  sortedLocales.map((loc) => ({
    value: loc,
    label: localeLabel(loc),
    textValue: `${localeLabel(loc)} ${loc}`
  }))
)

// A code stored by an older build (`ptBR`, `zhHANS`, …) is rewritten to the one
// this build ships. The active language itself is applied by main.js before the
// first render; here we only remember what the visitor picks.
const storedLocale = readStoredLocale()

if (storedLocale) {
  writeStoredLocale(storedLocale)
}

watch(locale, (newLocale) => {
  if (newLocale) {
    writeStoredLocale(newLocale)
  }
})
</script>

<template>
  <Combobox
    :items="locales"
    v-model:value="locale"
    v-model:open="isLocaleSelectOpen"
    :button-label="t('Select language')"
    :search-placeholder="t('Search language')"
    :empty-label="t('No matching language')"
  >
    <template #button-icon>
      <svg
        xmlns="http://www.w3.org/2000/svg"
        class="icon -ms-1.5 size-6 shrink-0"
        width="36"
        height="36"
        viewBox="0 0 24 24"
      >
        <g
          fill="none"
          stroke="#abcbca"
          stroke-linecap="round"
          stroke-linejoin="round"
          stroke-width="2"
        >
          <path d="M4 5h7M7 4c0 4.846 0 7 .5 8" />
          <path
            d="M10 8.5c0 2.286-2 4.5-3.5 4.5S4 11.865 4 11c0-2 1-3 3-3s5 .57 5 2.857c0 1.524-.667 2.571-2 3.143m2 6l4-9l4 9m-.9-2h-6.2"
          />
        </g>
      </svg>
    </template>
  </Combobox>
</template>
