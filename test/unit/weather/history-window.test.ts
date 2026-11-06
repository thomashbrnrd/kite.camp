import { describe, expect, it } from 'vitest'
import { completeYearsWindow } from '../../../shared/weather/history-window'

describe('completeYearsWindow', () => {
  it('returns the last complete calendar years', () => {
    expect(completeYearsWindow(new Date('2026-11-06T12:00:00Z'), 5)).toEqual({
      startDate: '2021-01-01',
      endDate: '2025-12-31'
    })
  })

  it('stays stable for the whole year', () => {
    const jan = completeYearsWindow(new Date('2026-01-01T00:00:00Z'), 5)
    const dec = completeYearsWindow(new Date('2026-12-31T23:59:59Z'), 5)
    expect(jan).toEqual(dec)
  })

  it('supports a single year', () => {
    expect(completeYearsWindow(new Date('2026-06-01T00:00:00Z'), 1)).toEqual({
      startDate: '2025-01-01',
      endDate: '2025-12-31'
    })
  })

  it('rejects invalid year counts', () => {
    expect(() => completeYearsWindow(new Date(), 0)).toThrow(RangeError)
    expect(() => completeYearsWindow(new Date(), 2.5)).toThrow(RangeError)
  })
})
