// vitest.config.ts
import { fileURLToPath, URL } from 'node:url'
import vue from '@vitejs/plugin-vue'
import { playwright } from '@vitest/browser-playwright'
import { defineConfig } from 'vitest/config'

// Tests that need a real browser (DOM, canvas, IndexedDB, etc.) — opt-in.
// Everything else runs in the `node` project and is picked up by glob,
// so new test files don't need to touch this config.
const BROWSER_TESTS = [
  'src/utils/useQRCodeStorage.test.ts',
  'src/utils/css.test.ts',
  'src/utils/framePresets.test.ts',
  'src/utils/qrCodePresets.test.ts',
  'src/utils/download.test.ts',
  'src/utils/convertToImage.test.ts',
  'src/utils/useFitScale.test.ts',
  'src/lib/qr-code/legacy-adapter.test.ts',
  'src/lib/qr-code/render/canvas.test.ts'
]

export default defineConfig({
  // Shared by every project below: inline project configs extend this one.
  plugins: [vue()],
  assetsInclude: ['**/*.png'],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url))
    }
  },
  test: {
    globals: true,
    // Coverage only works in the root config, never inside a project.
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      include: ['src/**/*.{ts,vue}'],
      exclude: ['src/**/*.test.ts', 'src/**/*.stories.ts', 'src/**/*.d.ts']
    },
    projects: [
      {
        test: {
          name: 'node',
          environment: 'node',
          include: ['src/**/*.test.ts'],
          exclude: BROWSER_TESTS
        }
      },
      {
        test: {
          name: 'browser',
          include: BROWSER_TESTS,
          browser: {
            enabled: true,
            provider: playwright(),
            headless: true,
            instances: [{ browser: 'chromium' }]
          }
        }
      }
    ]
  }
})
