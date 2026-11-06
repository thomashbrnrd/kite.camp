import { DataSourceError } from './errors'
import type { AbortSignalLike } from './types'

/** Structural subset of the Fetch API Response. */
export interface ResponseLike {
  readonly ok: boolean
  readonly status: number
  json(): Promise<unknown>
  clone(): ResponseLike
}

export type FetchLike = (
  url: string,
  init: { signal?: AbortSignalLike }
) => Promise<ResponseLike>

/** Structural subset of the Cache Storage API. */
export interface CacheStorageLike {
  open(cacheName: string): Promise<{
    match(url: string): Promise<ResponseLike | undefined>
    put(url: string, response: ResponseLike): Promise<void>
  }>
}

export interface JsonFetchOptions {
  signal?: AbortSignalLike
  /** Store successful responses and serve them from the cache afterwards. */
  cacheable?: boolean
}

export type JsonFetcher = (
  url: string,
  options?: JsonFetchOptions
) => Promise<unknown>

/**
 * Fetches JSON, optionally through a persistent cache.
 * Cache failures (private mode, quota, unsupported) never break the request:
 * the fetcher silently falls back to the network.
 */
export function createJsonFetcher(deps: {
  fetch: FetchLike
  caches?: CacheStorageLike
  cacheName: string
}): JsonFetcher {
  const openCache = async () => {
    if (!deps.caches) return undefined
    try {
      return await deps.caches.open(deps.cacheName)
    } catch {
      return undefined
    }
  }

  return async (url, options = {}) => {
    const cache = options.cacheable ? await openCache() : undefined

    if (cache) {
      try {
        const cached = await cache.match(url)
        if (cached) return await cached.json()
      } catch {
        // Corrupted or unreadable entry: refetch.
      }
    }

    let response: ResponseLike
    try {
      response = await deps.fetch(url, { signal: options.signal })
    } catch (error) {
      if (options.signal?.aborted) {
        throw new DataSourceError('aborted', 'Request aborted', {
          cause: error
        })
      }
      throw new DataSourceError('network', 'Network request failed', {
        cause: error
      })
    }

    if (!response.ok) {
      const reason = await readErrorReason(response)
      throw new DataSourceError(
        'http',
        reason ?? `HTTP error ${response.status}`,
        { status: response.status }
      )
    }

    if (cache) {
      try {
        await cache.put(url, response.clone())
      } catch {
        // Quota exceeded or storage unavailable: keep going without cache.
      }
    }

    try {
      return await response.json()
    } catch (error) {
      throw new DataSourceError('invalid-response', 'Response is not JSON', {
        cause: error
      })
    }
  }
}

/** Open-Meteo errors are `{ "error": true, "reason": "…" }`. */
async function readErrorReason(
  response: ResponseLike
): Promise<string | undefined> {
  try {
    const body = await response.json()
    if (
      typeof body === 'object' &&
      body !== null &&
      'reason' in body &&
      typeof body.reason === 'string'
    ) {
      return body.reason
    }
  } catch {
    // Not JSON.
  }
  return undefined
}
