import { describe, expect, it } from 'vitest'
import { distanceKm } from '../../../shared/weather/geo'

describe('distanceKm', () => {
  it('is zero for the same point', () => {
    const p = { latitude: 43.1, longitude: 6.1 }
    expect(distanceKm(p, p)).toBe(0)
  })

  it('matches one degree of latitude (~111.2 km)', () => {
    expect(
      distanceKm({ latitude: 0, longitude: 0 }, { latitude: 1, longitude: 0 })
    ).toBeCloseTo(111.2, 1)
  })

  it('is symmetric', () => {
    const a = { latitude: 37.08, longitude: 25.15 }
    const b = { latitude: 23.68, longitude: -15.96 }
    expect(distanceKm(a, b)).toBeCloseTo(distanceKm(b, a), 9)
  })
})
