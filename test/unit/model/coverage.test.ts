import { describe, expect, it } from 'vitest'
import archiveItarema from '../../fixtures/archive-itarema-2024-09-01.json'
import { computeCoverage } from '../../../shared/model/coverage'
import { kiteRange } from '../../../shared/model/kite-range'
import { parseArchiveResponse } from '../../../shared/weather/open-meteo'

const options = { windCorrection: 1, minConsecutiveRideableHours: 2 }
const range = [{ minKn: 10, maxKn: 20 }]

/** Synthetic hourly series for one or more days; `null` speed = missing value. */
function series(days: Record<string, (number | null)[]>, dayHours = [8, 18]) {
  const time: string[] = []
  const windSpeedKn: (number | null)[] = []
  const isDay: boolean[] = []
  for (const [date, speeds] of Object.entries(days)) {
    speeds.forEach((speed, hour) => {
      time.push(`${date}T${String(hour).padStart(2, '0')}:00`)
      windSpeedKn.push(speed)
      isDay.push(hour >= dayHours[0]! && hour < dayHours[1]!)
    })
  }
  return { time, windSpeedKn, isDay }
}

/** 24 hours with the given speeds set at given hours, 0 kn elsewhere. */
const day = (speeds: Record<number, number | null>) =>
  Array.from({ length: 24 }, (_, h) => (h in speeds ? speeds[h]! : 0))

describe('computeCoverage', () => {
  it('counts daylight hours only', () => {
    const result = computeCoverage(
      series({ '2024-01-01': day({ 2: 15, 3: 15, 10: 15 }) }),
      range,
      options
    )
    expect(result.countedHours).toBe(10)
    expect(result.rideableHours).toBe(1)
    expect(result.hourShare).toBeCloseTo(0.1)
  })

  it('includes both bounds of a range', () => {
    const result = computeCoverage(
      series({ '2024-01-01': day({ 10: 10, 11: 20, 12: 20.01, 13: 9.99 }) }),
      range,
      options
    )
    expect(result.rideableHours).toBe(2)
  })

  it('needs 2 consecutive rideable hours for a rideable day', () => {
    const result = computeCoverage(
      series({
        '2024-01-01': day({ 10: 15, 12: 15 }),
        '2024-01-02': day({ 10: 15, 11: 15 })
      }),
      range,
      options
    )
    expect(result.countedDays).toBe(2)
    expect(result.rideableDays).toBe(1)
    expect(result.dayShare).toBe(0.5)
  })

  it('accepts any kite of the quiver for consecutive hours', () => {
    const result = computeCoverage(
      series({ '2024-01-01': day({ 10: 12, 11: 25 }) }),
      [
        { minKn: 10, maxKn: 15 },
        { minKn: 20, maxKn: 30 }
      ],
      options
    )
    expect(result.rideableDays).toBe(1)
  })

  it('breaks a run on a missing value', () => {
    const result = computeCoverage(
      series({ '2024-01-01': day({ 10: 15, 11: null, 12: 15 }) }),
      range,
      options
    )
    expect(result.countedHours).toBe(9)
    expect(result.rideableHours).toBe(2)
    expect(result.rideableDays).toBe(0)
  })

  it('does not chain hours across midnight', () => {
    const result = computeCoverage(
      series(
        { '2024-01-01': day({ 23: 15 }), '2024-01-02': day({ 0: 15 }) },
        [0, 24]
      ),
      range,
      options
    )
    expect(result.rideableHours).toBe(2)
    expect(result.rideableDays).toBe(0)
  })

  it('applies the wind correction to the data', () => {
    const history = series({ '2024-01-01': day({ 10: 8.5, 11: 8.5 }) })
    expect(computeCoverage(history, range, options).rideableDays).toBe(0)
    expect(
      computeCoverage(history, range, { ...options, windCorrection: 1.2 })
        .rideableDays
    ).toBe(1)
  })

  it('filters by month', () => {
    const history = series({
      '2024-01-15': day({ 10: 15, 11: 15 }),
      '2024-07-15': day({})
    })
    const winter = computeCoverage(history, range, { ...options, months: [1] })
    expect(winter.countedDays).toBe(1)
    expect(winter.dayShare).toBe(1)
    const all = computeCoverage(history, range, { ...options, months: [] })
    expect(all.countedDays).toBe(2)
  })

  it('returns zero shares when nothing is counted', () => {
    const result = computeCoverage(series({}), range, options)
    expect(result).toEqual({
      countedHours: 0,
      rideableHours: 0,
      hourShare: 0,
      countedDays: 0,
      rideableDays: 0,
      dayShare: 0
    })
  })

  it('returns zero coverage for an empty quiver', () => {
    const result = computeCoverage(
      series({ '2024-01-01': day({ 10: 15 }) }),
      [],
      options
    )
    expect(result.rideableHours).toBe(0)
    expect(result.countedDays).toBe(1)
  })

  it('rejects invalid options', () => {
    const history = series({})
    expect(() =>
      computeCoverage(history, range, { ...options, windCorrection: 0 })
    ).toThrow(RangeError)
    expect(() =>
      computeCoverage(history, range, {
        ...options,
        minConsecutiveRideableHours: 0
      })
    ).toThrow(RangeError)
  })

  it('works on a real Open-Meteo day (Itarema, 2024-09-01)', () => {
    const history = parseArchiveResponse(archiveItarema, {
      latitude: -2.92,
      longitude: -39.915,
      startDate: '2024-09-01',
      endDate: '2024-09-01'
    })
    // 70 kg, twintip, intermediate, 9 m: 12.8 – 22.2 kn (SPEC §6).
    const nine = kiteRange(9, {
      weightKg: 70,
      discipline: 'twintip',
      level: 'intermediate'
    })
    const result = computeCoverage(history, [nine], options)
    // Daylight 06:00–17:00; 12.8 kn at 06:00 is just below 12.83 kn,
    // then 12:00–17:00 (13.9 to 18.7 kn) are rideable.
    expect(result.countedHours).toBe(12)
    expect(result.rideableHours).toBe(6)
    expect(result.countedDays).toBe(1)
    expect(result.rideableDays).toBe(1)
  })
})
