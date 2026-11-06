import { KNOWN_SPOTS } from '#shared/spots'
import { knownSpotToSpot, searchKnownSpots } from '#shared/spots/search'
import type { Spot } from '#shared/weather/types'

const KNOWN_SPOT_LIMIT = 6
const DEBOUNCE_MS = 300
export const MIN_QUERY_LENGTH = 2

/**
 * Search-as-you-type: known kite spots are matched locally on every keystroke,
 * places are fetched from the geocoding service after a short pause.
 */
export function useSpotSearch() {
  const source = useWindDataSource()
  const searchTerm = ref('')
  const places = useAbortableRequest((signal, query: string) =>
    source.searchSpots(query, { signal })
  )

  const query = computed(() => searchTerm.value.trim())
  const isQueryTooShort = computed(() => query.value.length < MIN_QUERY_LENGTH)

  const knownSpots = computed<Spot[]>(() =>
    searchKnownSpots(KNOWN_SPOTS, query.value, KNOWN_SPOT_LIMIT).map(
      knownSpotToSpot
    )
  )

  let timer: ReturnType<typeof setTimeout> | undefined
  watch(query, (value) => {
    clearTimeout(timer)
    if (value.length < MIN_QUERY_LENGTH) {
      places.reset()
      return
    }
    timer = setTimeout(() => places.run(value), DEBOUNCE_MS)
  })
  if (getCurrentScope()) onScopeDispose(() => clearTimeout(timer))

  const placeResults = computed<Spot[]>(() => places.data.value ?? [])

  return {
    searchTerm,
    isQueryTooShort,
    knownSpots,
    places: placeResults,
    placesStatus: places.status,
    placesError: places.error
  }
}
