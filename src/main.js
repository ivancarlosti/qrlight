import { createApp } from 'vue'
import { applyLocale, detectLocale, i18n } from './utils/i18n'
import App from './App.vue'
import './index.css'
import './style.css'
import './print.css'
import { registerSW } from 'virtual:pwa-register'
import { inject } from '@vercel/analytics'

if (['1', 'true'].includes((import.meta.env.VITE_ENABLE_ANALYTICS ?? '').toLowerCase())) {
  inject()
}

registerSW({ immediate: true })

// The stored language (or the browser one) is applied before the first render,
// so a translated page never flashes English — and `<html lang>`/`dir` are set
// before the layout is painted.
applyLocale(detectLocale())

createApp(App).use(i18n).mount('#app')
