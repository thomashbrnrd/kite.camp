/**
 * Single source of truth for tunable parameters.
 * Business-model coefficients (SPEC §6) will be added here in M2.
 */

/** Open-Meteo weather model. `best_match` is the API default (owner decision, M1). */
export type WeatherModel = 'best_match' | 'ecmwf_ifs' | 'era5' | 'era5_land'

export const DATA_CONFIG = {
  /** Number of complete calendar years of hourly history (SPEC §5). */
  historyYears: 5,
  weatherModel: 'best_match' as WeatherModel,
  /** Coordinates are rounded before querying so that cache keys stay stable (3 decimals ≈ 100 m). */
  coordinateDecimals: 3,
  /** Max number of geocoding results shown. */
  geocodingResultCount: 8,
  geocodingLanguage: 'fr',
  /** Cache Storage bucket. Bump the version suffix when the request format changes. */
  cacheName: 'kite-camp-open-meteo-v1'
} as const

export const HISTOGRAM_CONFIG = {
  binWidthKn: 2,
  /** Speeds at or above this value are grouped in one open-ended bin. */
  maxKn: 40
} as const
