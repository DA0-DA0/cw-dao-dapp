import { defineConfig } from 'vitest/config'

import { vitestConfig } from './packages/config/vitest'

export default defineConfig({
  test: {
    ...vitestConfig,
    exclude: [
      ...vitestConfig.exclude,
      // playwright e2e tests, not unit tests. unit tests are spread throughout
      '**/apps/dapp/tests/**/*',
    ],
  },
})
