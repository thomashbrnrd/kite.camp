import { DATA_CONFIG } from '#shared/config'
import { completeYearsWindow } from '#shared/weather/history-window'
import type { Spot } from '#shared/weather/types'

/** Hourly wind history of a spot over the last complete years (SPEC §5). */
export function useWindHistory() {
  const source = useWindDataSource()
  const { data, status, error, run } = useAbortableRequest(
    (signal, spot: Spot) =>
      source.getWindHistory(
        {
          latitude: spot.latitude,
          longitude: spot.longitude,
          ...completeYearsWindow(new Date(), DATA_CONFIG.historyYears)
        },
        { signal }
      )
  )

  return { history: data, status, error, load: run }
}
