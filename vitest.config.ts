import { defineConfig } from 'vitest/config'

// Pure TypeScript unit tests (business logic, no Nuxt runtime, no DOM).
// A `nuxt` project (@nuxt/test-utils) can be added later for component tests.
export default defineConfig({
  test: {
    projects: [
      {
        test: {
          name: 'unit',
          include: ['test/unit/**/*.{test,spec}.ts'],
          environment: 'node'
        }
      }
    ]
  }
})
