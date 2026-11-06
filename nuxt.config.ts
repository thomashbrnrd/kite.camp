// https://nuxt.com/docs/api/configuration/nuxt-config
// Base URL: set NUXT_APP_BASE_URL at build time (e.g. /kite.camp/ for a GitHub Pages project site).
export default defineNuxtConfig({
  modules: ['@nuxt/eslint', '@nuxt/ui'],

  devtools: {
    enabled: true
  },

  css: ['~/assets/css/main.css'],

  routeRules: {
    '/': { prerender: true }
  },

  compatibilityDate: '2026-06-30',

  typescript: {
    // Type-check unit tests and Vitest config too (paths are relative to .nuxt/).
    nodeTsConfig: {
      include: ['../test/**/*', '../vitest.config.ts']
    }
  },

  eslint: {
    config: {
      // Formatting is handled by Prettier (see .prettierrc.json).
      stylistic: false
    }
  }
})
