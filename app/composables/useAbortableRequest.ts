import { DataSourceError } from '#shared/weather/errors'
import type { AbortSignalLike } from '#shared/weather/types'

export type RequestStatus = 'idle' | 'pending' | 'success' | 'error'

/**
 * Runs an async request, keeping only the latest call:
 * starting a new call aborts the previous one and ignores its result.
 */
export function useAbortableRequest<TArgs extends unknown[], TResult>(
  request: (signal: AbortSignalLike, ...args: TArgs) => Promise<TResult>
) {
  const data = shallowRef<TResult | null>(null)
  const status = ref<RequestStatus>('idle')
  const error = shallowRef<DataSourceError | null>(null)
  let controller: AbortController | undefined

  async function run(...args: TArgs): Promise<void> {
    controller?.abort()
    const current = new AbortController()
    controller = current
    status.value = 'pending'
    error.value = null

    try {
      const result = await request(current.signal, ...args)
      if (current.signal.aborted) return
      data.value = result
      status.value = 'success'
    } catch (cause) {
      if (current.signal.aborted) return
      error.value =
        cause instanceof DataSourceError
          ? cause
          : new DataSourceError('invalid-response', String(cause), { cause })
      status.value = 'error'
    }
  }

  function cancel() {
    controller?.abort()
    controller = undefined
    status.value = 'idle'
  }

  /** Cancels any pending call and clears the previous result. */
  function reset() {
    cancel()
    data.value = null
    error.value = null
  }

  if (getCurrentScope()) onScopeDispose(cancel)

  return { data, status, error, run, cancel, reset }
}
