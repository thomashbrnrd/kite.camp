import { describe, expect, it } from 'vitest'
import { windSpeedHistogram } from '../../../shared/weather/histogram'

describe('windSpeedHistogram', () => {
  const options = { binWidthKn: 5, maxKn: 15 }

  it('counts speeds in [from, to) bins plus an open-ended last bin', () => {
    const { bins, countedHours, missingHours } = windSpeedHistogram(
      [0, 4.9, 5, 14.9, 15, 32],
      options
    )
    expect(bins.map((b) => [b.fromKn, b.toKn, b.hours])).toEqual([
      [0, 5, 2],
      [5, 10, 1],
      [10, 15, 1],
      [15, null, 2]
    ])
    expect(countedHours).toBe(6)
    expect(missingHours).toBe(0)
  })

  it('computes shares of counted hours', () => {
    const { bins } = windSpeedHistogram([1, 2, 6, 20], options)
    expect(bins.map((b) => b.share)).toEqual([0.5, 0.25, 0, 0.25])
  })

  it('only counts selected hours and reports missing ones', () => {
    const speeds = [1, null, 7, 8]
    const isDay = [true, true, false, true]
    const { bins, countedHours, missingHours } = windSpeedHistogram(speeds, {
      ...options,
      include: (i) => isDay[i] === true
    })
    expect(countedHours).toBe(2)
    expect(missingHours).toBe(1)
    expect(bins.map((b) => b.hours)).toEqual([1, 1, 0, 0])
  })

  it('returns zero shares when nothing is counted', () => {
    const { bins, countedHours } = windSpeedHistogram([], options)
    expect(countedHours).toBe(0)
    expect(bins.every((b) => b.share === 0)).toBe(true)
  })

  it('rejects a max that is not a multiple of the bin width', () => {
    expect(() => windSpeedHistogram([1], { binWidthKn: 3, maxKn: 10 })).toThrow(
      RangeError
    )
  })
})
