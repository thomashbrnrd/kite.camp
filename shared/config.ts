/**
 * Single source of truth for tunable parameters (data, histogram, model).
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

export type Discipline = 'twintip' | 'directional' | 'foil'
export type Level = 'beginner' | 'intermediate' | 'advanced'

/**
 * Kite range model (SPEC §6). All values are starting hypotheses from common
 * rules of thumb, to be calibrated with the project owner (SPEC §12.5).
 */
export const MODEL_CONFIG = {
  /** ideal wind (kn) = k × weight (kg) / size (m²) */
  kByDiscipline: {
    twintip: 2.2,
    directional: 2.0,
    foil: 1.0
  } satisfies Record<Discipline, number>,
  /** Lower bound of the range = ideal × low. */
  lowMultiplier: 0.75,
  /** Upper bound of the range = ideal × high. */
  highMultiplierByLevel: {
    beginner: 1.1,
    intermediate: 1.3,
    advanced: 1.4
  } satisfies Record<Level, number>,
  /** Multiplier applied to the wind data to compensate local effects. */
  windCorrection: { default: 1, min: 0.8, max: 1.4 },
  /** A day is rideable with at least this many consecutive rideable daylight hours. */
  minConsecutiveRideableHours: 2
} as const
