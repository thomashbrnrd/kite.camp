import { describe, expect, it, vi } from 'vitest'
import archiveItarema from '../../fixtures/archive-itarema-2024-09-01.json'
import geocodingDakhla from '../../fixtures/geocoding-dakhla.json'
import { DataSourceError } from '../../../shared/weather/errors'
import {
  buildArchiveUrl,
  buildGeocodingUrl,
  createOpenMeteoSource,
  parseArchiveResponse,
  parseGeocodingResponse
} from '../../../shared/weather/open-meteo'

const fixtures: Record<string, unknown> = {
  'archive-itarema-2024-09-01.json': archiveItarema,
  'geocoding-dakhla.json': geocodingDakhla
}
// Deep copy so that a test can never mutate a shared fixture.
const fixture = (name: string): unknown => structuredClone(fixtures[name])

const request = {
  latitude: -2.92,
  longitude: -39.915,
  startDate: '2024-09-01',
  endDate: '2024-09-01'
}

describe('buildGeocodingUrl', () => {
  it('encodes the trimmed query and options', () => {
    const url = new URL(
      buildGeocodingUrl('  Hyères ', { count: 8, language: 'fr' })
    )
    expect(url.origin + url.pathname).toBe(
      'https://geocoding-api.open-meteo.com/v1/search'
    )
    expect(Object.fromEntries(url.searchParams)).toEqual({
      name: 'Hyères',
      count: '8',
      language: 'fr',
      format: 'json'
    })
  })
})

describe('buildArchiveUrl', () => {
  it('requests hourly wind in knots with local time and rounded coordinates', () => {
    const url = new URL(
      buildArchiveUrl(
        { ...request, latitude: 37.083333, longitude: 25.15 },
        { model: 'best_match', coordinateDecimals: 3 }
      )
    )
    expect(url.origin + url.pathname).toBe(
      'https://archive-api.open-meteo.com/v1/archive'
    )
    expect(Object.fromEntries(url.searchParams)).toEqual({
      latitude: '37.083',
      longitude: '25.150',
      start_date: '2024-09-01',
      end_date: '2024-09-01',
      hourly: 'wind_speed_10m,wind_gusts_10m,wind_direction_10m,is_day',
      models: 'best_match',
      wind_speed_unit: 'kn',
      timezone: 'auto'
    })
  })
})

describe('parseGeocodingResponse', () => {
  it('maps real results, including one without country', () => {
    const spots = parseGeocodingResponse(fixture('geocoding-dakhla.json'))
    expect(spots).toHaveLength(3)
    expect(spots[0]).toMatchObject({
      id: 'geonames:2463447',
      kind: 'place',
      name: 'Dakhla',
      latitude: 23.68477,
      longitude: -15.95798
    })
    expect(spots[0]?.country).toBeUndefined()
    expect(spots[1]).toMatchObject({ country: 'Maroc', countryCode: 'MA' })
  })

  it('returns an empty list when the API omits results', () => {
    expect(parseGeocodingResponse({ generationtime_ms: 0.06 })).toEqual([])
  })

  it('skips malformed entries', () => {
    expect(
      parseGeocodingResponse({
        results: [{ id: 1, name: 'No coordinates' }, null]
      })
    ).toEqual([])
  })

  it('rejects a non-object body', () => {
    expect(() => parseGeocodingResponse('oops')).toThrow(DataSourceError)
  })
})

describe('parseArchiveResponse', () => {
  it('parses a real hourly response into parallel series', () => {
    const history = parseArchiveResponse(
      fixture('archive-itarema-2024-09-01.json'),
      request
    )
    expect(history.time).toHaveLength(24)
    expect(history.time[14]).toBe('2024-09-01T14:00')
    expect(history.windSpeedKn[14]).toBe(18.1)
    expect(history.windGustKn).toHaveLength(24)
    expect(history.windDirectionDeg).toHaveLength(24)
    expect(history.isDay.filter(Boolean)).toHaveLength(12)
    expect(history.isDay[5]).toBe(false)
    expect(history.isDay[6]).toBe(true)
    expect(history).toMatchObject({
      request,
      gridLatitude: -2.917399,
      gridLongitude: -39.895416,
      timezone: 'America/Fortaleza',
      utcOffsetSeconds: -10800
    })
  })

  it('keeps missing values as null', () => {
    const history = parseArchiveResponse(
      {
        latitude: 1,
        longitude: 2,
        hourly: {
          time: ['2024-01-01T00:00', '2024-01-01T01:00'],
          wind_speed_10m: [null, 10],
          wind_gusts_10m: [12, null],
          wind_direction_10m: [180, 190],
          is_day: [0, null]
        }
      },
      request
    )
    expect(history.windSpeedKn).toEqual([null, 10])
    expect(history.windGustKn).toEqual([12, null])
    expect(history.isDay).toEqual([false, null])
  })

  it('rejects series whose length differs from time', () => {
    expect(() =>
      parseArchiveResponse(
        {
          latitude: 1,
          longitude: 2,
          hourly: {
            time: ['2024-01-01T00:00'],
            wind_speed_10m: [],
            wind_gusts_10m: [1],
            wind_direction_10m: [1],
            is_day: [1]
          }
        },
        request
      )
    ).toThrow(/wind_speed_10m/)
  })
})

describe('createOpenMeteoSource', () => {
  const make = () => {
    const fetchJson =
      vi.fn<(url: string, options?: object) => Promise<unknown>>()
    const source = createOpenMeteoSource({
      fetchJson,
      model: 'best_match',
      coordinateDecimals: 3,
      geocodingResultCount: 8,
      geocodingLanguage: 'fr'
    })
    return { fetchJson, source }
  }

  it('does not call the API for queries shorter than 2 characters', async () => {
    const { fetchJson, source } = make()
    expect(await source.searchSpots(' a ')).toEqual([])
    expect(fetchJson).not.toHaveBeenCalled()
  })

  it('searches without cache', async () => {
    const { fetchJson, source } = make()
    fetchJson.mockResolvedValue(fixture('geocoding-dakhla.json'))
    const spots = await source.searchSpots('Dakhla')
    expect(spots).toHaveLength(3)
    expect(fetchJson).toHaveBeenCalledWith(
      expect.stringContaining('name=Dakhla'),
      { signal: undefined }
    )
  })

  it('fetches history through the cache', async () => {
    const { fetchJson, source } = make()
    fetchJson.mockResolvedValue(fixture('archive-itarema-2024-09-01.json'))
    const history = await source.getWindHistory(request)
    expect(history.time).toHaveLength(24)
    expect(fetchJson).toHaveBeenCalledWith(
      expect.stringContaining('archive-api.open-meteo.com'),
      { signal: undefined, cacheable: true }
    )
  })
})
