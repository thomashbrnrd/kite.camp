import { describe, expect, it } from 'vitest'
import { MODEL_CONFIG } from '../../../shared/config'
import {
  idealWindKn,
  kiteRange,
  mergeRanges,
  quiverRanges,
  type RiderProfile
} from '../../../shared/model/kite-range'

const round1 = (x: number) => Math.round(x * 10) / 10

// SPEC §6 control example: 70 kg, twintip (k 2.2), low 0.75, high 1.3 (intermediate).
const rider: RiderProfile = {
  weightKg: 70,
  discipline: 'twintip',
  level: 'intermediate'
}

describe('SPEC §6 control example', () => {
  it.each([
    [7, 22.0, 16.5, 28.6],
    [9, 17.1, 12.8, 22.2],
    [12, 12.8, 9.6, 16.7]
  ])('%i m: ideal %f kn, range %f – %f kn', (size, ideal, min, max) => {
    const range = kiteRange(size, rider)
    expect(round1(range.idealKn)).toBe(ideal)
    expect(round1(range.minKn)).toBe(min)
    expect(round1(range.maxKn)).toBe(max)
  })

  it('quiver {7, 9, 12} covers 9.6 to 28.6 kn without gap', () => {
    const merged = mergeRanges(quiverRanges([12, 7, 9], rider))
    expect(merged).toHaveLength(1)
    expect(round1(merged[0]!.minKn)).toBe(9.6)
    expect(round1(merged[0]!.maxKn)).toBe(28.6)
  })
})

describe('kiteRange', () => {
  it('uses the discipline coefficient', () => {
    expect(kiteRange(10, { ...rider, discipline: 'foil' }).idealKn).toBeCloseTo(
      7
    )
    expect(
      kiteRange(10, { ...rider, discipline: 'directional' }).idealKn
    ).toBeCloseTo(14)
  })

  it('uses the level for the upper bound only', () => {
    const beginner = kiteRange(10, { ...rider, level: 'beginner' })
    const advanced = kiteRange(10, { ...rider, level: 'advanced' })
    expect(beginner.minKn).toBeCloseTo(advanced.minKn)
    expect(beginner.maxKn).toBeCloseTo(15.4 * 1.1)
    expect(advanced.maxKn).toBeCloseTo(15.4 * 1.4)
  })

  it('accepts custom coefficients', () => {
    const range = kiteRange(10, rider, {
      ...MODEL_CONFIG,
      lowMultiplier: 0.5
    })
    expect(range.minKn).toBeCloseTo(7.7)
  })

  it('rejects invalid inputs', () => {
    expect(() => idealWindKn(0, 9, 2.2)).toThrow(RangeError)
    expect(() => idealWindKn(70, -9, 2.2)).toThrow(RangeError)
    expect(() => idealWindKn(70, Number.NaN, 2.2)).toThrow(RangeError)
  })
})

describe('quiverRanges', () => {
  it('sorts kites by size', () => {
    expect(quiverRanges([12, 7, 9], rider).map((r) => r.sizeM2)).toEqual([
      7, 9, 12
    ])
  })
})

describe('mergeRanges', () => {
  it('keeps gaps between disjoint ranges', () => {
    expect(
      mergeRanges([
        { minKn: 20, maxKn: 30 },
        { minKn: 8, maxKn: 12 },
        { minKn: 11, maxKn: 15 }
      ])
    ).toEqual([
      { minKn: 8, maxKn: 15 },
      { minKn: 20, maxKn: 30 }
    ])
  })

  it('merges touching ranges and does not mutate its input', () => {
    const input = [
      { minKn: 8, maxKn: 12 },
      { minKn: 12, maxKn: 15 }
    ]
    expect(mergeRanges(input)).toEqual([{ minKn: 8, maxKn: 15 }])
    expect(input[0]).toEqual({ minKn: 8, maxKn: 12 })
  })

  it('returns nothing for an empty quiver', () => {
    expect(mergeRanges([])).toEqual([])
  })
})
