import type { StorybookConfig } from '@storybook/vue3-vite'

const config: StorybookConfig = {
  stories: ['../src/lib/qr-code/**/*.stories.@(ts|js)'],
  // Storybook 10: addon-essentials is part of the core packages, so the
  // addons array stays empty instead of listing it.
  addons: [],
  framework: {
    name: '@storybook/vue3-vite',
    options: {}
  },
  docs: { autodocs: false },
  core: { disableTelemetry: true }
}

export default config
