import type { Spot } from '#shared/weather/types'

export function useSpotSearch() {
  const source = useWindDataSource()
  const lastQuery = ref('')
  const { data, status, error, run } = useAbortableRequest(
    (signal, query: string) => source.searchSpots(query, { signal })
  )

  function search(query: string) {
    lastQuery.value = query.trim()
    return run(query)
  }

  const results = computed<Spot[]>(() => data.value ?? [])

  return { results, status, error, lastQuery, search }
}
