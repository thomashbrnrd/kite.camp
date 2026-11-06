import type { WeatherModel } from '../config'
import { DataSourceError } from './errors'
import type { JsonFetcher } from './json-fetcher'
import type {
  Spot,
  WindDataSource,
  WindHistory,
  WindHistoryRequest
} from './types'

export const OPEN_METEO_GEOCODING_URL =
  'https://geocoding-api.open-meteo.com/v1/search'
export const OPEN_METEO_ARCHIVE_URL =
  'https://archive-api.open-meteo.com/v1/archive'

const HOURLY_VARIABLES = [
  'wind_speed_10m',
  'wind_gusts_10m',
  'wind_direction_10m',
  'is_day'
] as const

export function buildGeocodingUrl(
  query: string,
  options: { count: number; language: string }
): string {
  const params = new URLSearchParams({
    name: query.trim(),
    count: String(options.count),
    language: options.language,
    format: 'json'
  })
  return `${OPEN_METEO_GEOCODING_URL}?${params}`
}

export function buildArchiveUrl(
  request: WindHistoryRequest,
  options: { model: WeatherModel; coordinateDecimals: number }
): string {
  const params = new URLSearchParams({
    latitude: request.latitude.toFixed(options.coordinateDecimals),
    longitude: request.longitude.toFixed(options.coordinateDecimals),
    start_date: request.startDate,
    end_date: request.endDate,
    hourly: HOURLY_VARIABLES.join(','),
    models: options.model,
    wind_speed_unit: 'kn',
    timezone: 'auto'
  })
  return `${OPEN_METEO_ARCHIVE_URL}?${params}`
}

/** Geocoding answers without a `results` key when nothing matches. */
export function parseGeocodingResponse(body: unknown): Spot[] {
  if (!isRecord(body)) throw invalid('Geocoding response is not an object')
  if (body.results === undefined) return []
  if (!Array.isArray(body.results)) {
    throw invalid('Geocoding results is not an array')
  }

  return body.results.flatMap((item): Spot[] => {
    if (
      !isRecord(item) ||
      typeof item.id !== 'number' ||
      typeof item.name !== 'string' ||
      !isFiniteNumber(item.latitude) ||
      !isFiniteNumber(item.longitude)
    ) {
      return []
    }
    return [
      {
        id: `geonames:${item.id}`,
        kind: 'place',
        name: item.name,
        latitude: item.latitude,
        longitude: item.longitude,
        country: optionalString(item.country),
        countryCode: optionalString(item.country_code),
        admin1: optionalString(item.admin1),
        admin2: optionalString(item.admin2),
        timezone: optionalString(item.timezone)
      }
    ]
  })
}

export function parseArchiveResponse(
  body: unknown,
  request: WindHistoryRequest
): WindHistory {
  if (!isRecord(body)) throw invalid('Archive response is not an object')
  const { hourly } = body
  if (!isRecord(hourly)) throw invalid('Archive response has no hourly data')

  const time = hourly.time
  if (!Array.isArray(time) || !time.every((t) => typeof t === 'string')) {
    throw invalid('Archive hourly.time is missing or malformed')
  }

  const series = (key: (typeof HOURLY_VARIABLES)[number]) => {
    const values = hourly[key]
    if (!Array.isArray(values) || values.length !== time.length) {
      throw invalid(`Archive hourly.${key} is missing or has a wrong length`)
    }
    return values.map((v): number | null => (isFiniteNumber(v) ? v : null))
  }

  if (!isFiniteNumber(body.latitude) || !isFiniteNumber(body.longitude)) {
    throw invalid('Archive response has no grid coordinates')
  }

  return {
    request,
    gridLatitude: body.latitude,
    gridLongitude: body.longitude,
    elevation: isFiniteNumber(body.elevation) ? body.elevation : null,
    timezone: typeof body.timezone === 'string' ? body.timezone : 'GMT',
    utcOffsetSeconds: isFiniteNumber(body.utc_offset_seconds)
      ? body.utc_offset_seconds
      : 0,
    time,
    windSpeedKn: series('wind_speed_10m'),
    windGustKn: series('wind_gusts_10m'),
    windDirectionDeg: series('wind_direction_10m'),
    isDay: series('is_day').map((v) => (v === null ? null : v === 1))
  }
}

export function createOpenMeteoSource(deps: {
  fetchJson: JsonFetcher
  model: WeatherModel
  coordinateDecimals: number
  geocodingResultCount: number
  geocodingLanguage: string
}): WindDataSource {
  return {
    async searchSpots(query, options = {}) {
      // The API returns nothing for fewer than 2 characters.
      if (query.trim().length < 2) return []
      const url = buildGeocodingUrl(query, {
        count: deps.geocodingResultCount,
        language: deps.geocodingLanguage
      })
      const body = await deps.fetchJson(url, { signal: options.signal })
      return parseGeocodingResponse(body)
    },

    async getWindHistory(request, options = {}) {
      const url = buildArchiveUrl(request, {
        model: deps.model,
        coordinateDecimals: deps.coordinateDecimals
      })
      const body = await deps.fetchJson(url, {
        signal: options.signal,
        cacheable: true
      })
      return parseArchiveResponse(body, request)
    }
  }
}

function invalid(message: string) {
  return new DataSourceError('invalid-response', message)
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value)
}

function optionalString(value: unknown): string | undefined {
  return typeof value === 'string' && value.length > 0 ? value : undefined
}
