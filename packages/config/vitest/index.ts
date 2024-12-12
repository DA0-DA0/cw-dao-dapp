import { ViteUserConfig, defaultExclude, defineConfig } from 'vitest/config'

export const vitestConfig: Required<
  Pick<
    Required<ViteUserConfig>['test'],
    'exclude' | 'setupFiles' | 'testTimeout' | 'hookTimeout' | 'server'
  >
> = {
  exclude: [...defaultExclude, '**/.next/**'],
  setupFiles: ['@dao-dao/config/vitest/setup.ts'],
  // 1 hour timeout for tests.
  testTimeout: 3_600_000,
  hookTimeout: 3_600_000,
  server: {
    deps: {
      inline: ['@cosmos-kit/web3auth'],
    },
  },
}

export default defineConfig({
  test: vitestConfig,
})
