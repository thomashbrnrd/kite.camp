import { describe, expect, it, vi } from 'vitest'
import { DataSourceError } from '../../../shared/weather/errors'
import {
  createJsonFetcher,
  type CacheStorageLike,
  type FetchLike,
  type ResponseLike
} from '../../../shared/weather/json-fetcher'

const URL_A = 'https://example.test/a'

function response(body: unknown, status = 200): ResponseLike {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => {
      if (body instanceof Error) throw body
      return body
    },
    clone: () => response(body, status)
  }
}

function memoryCaches() {
  const store = new Map<string, ResponseLike>()
  const caches: CacheStorageLike = {
    open: async () => ({
      match: async (url) => store.get(url),
      put: async (url, res) => {
        store.set(url, res)
      }
    })
  }
  return { store, caches }
}

describe('createJsonFetcher', () => {
  it('returns parsed JSON', async () => {
    const fetch = vi.fn<FetchLike>().mockResolvedValue(response({ a: 1 }))
    const fetchJson = createJsonFetcher({ fetch, cacheName: 'test' })
    expect(await fetchJson(URL_A)).toEqual({ a: 1 })
  })

  it('stores cacheable responses and serves them without network afterwards', async () => {
    const { store, caches } = memoryCaches()
    const fetch = vi.fn<FetchLike>().mockResolvedValue(response({ a: 1 }))
    const fetchJson = createJsonFetcher({ fetch, caches, cacheName: 'test' })

    expect(await fetchJson(URL_A, { cacheable: true })).toEqual({ a: 1 })
    expect(store.has(URL_A)).toBe(true)
    expect(await fetchJson(URL_A, { cacheable: true })).toEqual({ a: 1 })
    expect(fetch).toHaveBeenCalledTimes(1)
  })

  it('does not touch the cache for non-cacheable requests', async () => {
    const { store, caches } = memoryCaches()
    const fetch = vi.fn<FetchLike>().mockResolvedValue(response({ a: 1 }))
    const fetchJson = createJsonFetcher({ fetch, caches, cacheName: 'test' })
    await fetchJson(URL_A)
    expect(store.size).toBe(0)
  })

  it('falls back to the network when the cache is unavailable', async () => {
    const caches: CacheStorageLike = {
      open: () => Promise.reject(new Error('SecurityError'))
    }
    const fetch = vi.fn<FetchLike>().mockResolvedValue(response({ a: 1 }))
    const fetchJson = createJsonFetcher({ fetch, caches, cacheName: 'test' })
    expect(await fetchJson(URL_A, { cacheable: true })).toEqual({ a: 1 })
  })

  it('still returns data when storing in the cache fails', async () => {
    const caches: CacheStorageLike = {
      open: async () => ({
        match: async () => undefined,
        put: () => Promise.reject(new Error('QuotaExceededError'))
      })
    }
    const fetch = vi.fn<FetchLike>().mockResolvedValue(response({ a: 1 }))
    const fetchJson = createJsonFetcher({ fetch, caches, cacheName: 'test' })
    expect(await fetchJson(URL_A, { cacheable: true })).toEqual({ a: 1 })
  })

  it('does not cache error responses', async () => {
    const { store, caches } = memoryCaches()
    const fetch = vi
      .fn<FetchLike>()
      .mockResolvedValue(response({ error: true, reason: 'Bad date' }, 400))
    const fetchJson = createJsonFetcher({ fetch, caches, cacheName: 'test' })
    await expect(fetchJson(URL_A, { cacheable: true })).rejects.toMatchObject({
      kind: 'http',
      status: 400,
      message: 'Bad date'
    })
    expect(store.size).toBe(0)
  })

  it('reports network failures', async () => {
    const fetch = vi
      .fn<FetchLike>()
      .mockRejectedValue(new TypeError('Failed to fetch'))
    const fetchJson = createJsonFetcher({ fetch, cacheName: 'test' })
    await expect(fetchJson(URL_A)).rejects.toMatchObject({ kind: 'network' })
  })

  it('reports aborted requests as aborted', async () => {
    const fetch = vi.fn<FetchLike>().mockRejectedValue(new Error('AbortError'))
    const fetchJson = createJsonFetcher({ fetch, cacheName: 'test' })
    await expect(
      fetchJson(URL_A, { signal: { aborted: true } })
    ).rejects.toMatchObject({ kind: 'aborted' })
  })

  it('reports non-JSON bodies', async () => {
    const fetch = vi
      .fn<FetchLike>()
      .mockResolvedValue(response(new SyntaxError('Unexpected token')))
    const fetchJson = createJsonFetcher({ fetch, cacheName: 'test' })
    const error = await fetchJson(URL_A).catch((e: unknown) => e)
    expect(error).toBeInstanceOf(DataSourceError)
    expect(error).toMatchObject({ kind: 'invalid-response' })
  })
})
