// Dev-only guard for requests of a missing Vue SFC <style> block.
//
// Some client (browser extension or tool, not identified yet) sometimes requests
// `app/pages/index.vue?vue&type=style&index=0&lang.css` although the component has
// no <style>. @vitejs/plugin-vue then finds no block, Vite falls back to reading the
// whole .vue file and PostCSS fails ("CssSyntaxError: Invalid declaration"), which
// leaves a sticky error overlay until the dev server restarts.
//
// This module answers such requests with an empty stylesheet and logs where the
// request came from, so that the real source can be identified. Production builds
// are not affected. Written in JS because the Nuxt node tsconfig has no Node types.

import { readFile } from 'node:fs/promises'
import { addVitePlugin, defineNuxtModule } from 'nuxt/kit'
import { parse } from 'vue/compiler-sfc'

const STYLE_REQUEST_RE = /^(.+\.vue)\?vue&type=style&index=(\d+)/
const STYLE_URL_RE = /\.vue\?vue&type=style&index=\d+/
const EMPTY_STYLE_ID = '\0kite-camp:missing-sfc-style.css'

/** True when the SFC at `file` has a <style> block at `index`. */
async function hasStyleBlock(file, index) {
  try {
    const { descriptor } = parse(await readFile(file, 'utf8'), {
      filename: file
    })
    return index < descriptor.styles.length
  } catch {
    // Unreadable file: let Vite report the real problem.
    return true
  }
}

export default defineNuxtModule({
  meta: { name: 'kite-camp:dev-sfc-style-guard' },
  setup(_options, nuxt) {
    if (!nuxt.options.dev) return

    addVitePlugin({
      name: 'kite-camp:dev-sfc-style-guard',
      apply: 'serve',
      enforce: 'pre',

      configureServer(server) {
        // Log who sends the request, to find the client behind it.
        server.middlewares.use(async (req, _res, next) => {
          const url = req.url && decodeURIComponent(req.url)
          const match = url && STYLE_REQUEST_RE.exec(url)
          const fsPath = match?.[1].split('/@fs/')[1]
          if (
            fsPath &&
            !(await hasStyleBlock(`/${fsPath}`, Number(match[2])))
          ) {
            server.config.logger.warn(
              `[sfc-style-guard] missing <style> requested: ${url} ` +
                `(referer=${req.headers.referer ?? '-'}, ` +
                `user-agent=${req.headers['user-agent'] ?? '-'})`
            )
          }
          next()
        })
      },

      async resolveId(source, importer, options) {
        if (!STYLE_URL_RE.test(source)) return
        const resolved = await this.resolve(source, importer, {
          ...options,
          skipSelf: true
        })
        const match = resolved && STYLE_REQUEST_RE.exec(resolved.id)
        if (!match) return
        const [, file, index] = match
        if (await hasStyleBlock(file, Number(index))) return
        this.warn(
          `[sfc-style-guard] ${file} has no <style> block #${index}; served an empty stylesheet`
        )
        return EMPTY_STYLE_ID
      },

      load(id) {
        if (id === EMPTY_STYLE_ID) return ''
      }
    })
  }
})
