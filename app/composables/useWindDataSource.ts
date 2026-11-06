import { DATA_CONFIG } from '#shared/config'
import {
  createJsonFetcher,
  type CacheStorageLike
} from '#shared/weather/json-fetcher'
import { createOpenMeteoSource } from '#shared/weather/open-meteo'
import type { WindDataSource } from '#shared/weather/types'

let source: WindDataSource | undefined

/**
 * The wind data source used by the app (Open-Meteo, cached in Cache Storage).
 * Swap the implementation here to change provider.
 */
export function useWindDataSource(): WindDataSource {
  source ??= createOpenMeteoSource({
    fetchJson: createJsonFetcher({
      fetch: (url, init) =>
        globalThis.fetch(url, {
          signal: init.signal as AbortSignal | undefined
        }),
      caches: browserCaches(),
      cacheName: DATA_CONFIG.cacheName
    }),
    model: DATA_CONFIG.weatherModel,
    coordinateDecimals: DATA_CONFIG.coordinateDecimals,
    geocodingResultCount: DATA_CONFIG.geocodingResultCount,
    geocodingLanguage: DATA_CONFIG.geocodingLanguage
  })
  return source
}

/** Cache Storage only exists in secure contexts (https, localhost). */
function browserCaches(): CacheStorageLike | undefined {
  return typeof globalThis.caches === 'undefined'
    ? undefined
    : globalThis.caches
}
