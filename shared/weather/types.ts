/**
 * A selectable location: a known kite spot (`spot`) or a place returned by
 * the geocoding service (`place`).
 */
export interface Spot {
  /** Unique across kinds, e.g. `spot:pounda` or `geonames:2463447`. */
  id: string
  kind: 'spot' | 'place'
  name: string
  latitude: number
  longitude: number
  country?: string
  countryCode?: string
  /** First-level administrative area (region). */
  admin1?: string
  /** Second-level administrative area (département, county…). */
  admin2?: string
  timezone?: string
}

export interface WindHistoryRequest {
  latitude: number
  longitude: number
  /** ISO date, inclusive (yyyy-mm-dd). */
  startDate: string
  /** ISO date, inclusive (yyyy-mm-dd). */
  endDate: string
}

/**
 * Hourly wind history at the model grid point closest to the request.
 * All series are parallel to `time`. Missing values are `null`.
 */
export interface WindHistory {
  request: WindHistoryRequest
  /** Model grid point actually used by the data source (may differ from the spot). */
  gridLatitude: number
  gridLongitude: number
  elevation: number | null
  timezone: string
  utcOffsetSeconds: number
  /** Local time of each hour, ISO 8601 without offset (e.g. `2024-07-01T14:00`). */
  time: string[]
  windSpeedKn: (number | null)[]
  windGustKn: (number | null)[]
  windDirectionDeg: (number | null)[]
  isDay: (boolean | null)[]
}

/** Structural subset of AbortSignal, so that this module stays free of DOM types. */
export interface AbortSignalLike {
  readonly aborted: boolean
}

export interface RequestOptions {
  signal?: AbortSignalLike
}

/** Replaceable data source (SPEC §5). */
export interface WindDataSource {
  searchSpots(query: string, options?: RequestOptions): Promise<Spot[]>
  getWindHistory(
    request: WindHistoryRequest,
    options?: RequestOptions
  ): Promise<WindHistory>
}
