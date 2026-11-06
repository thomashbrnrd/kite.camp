import { describe, expect, it } from 'vitest'
import { KNOWN_SPOTS } from '../../../shared/spots'
import { searchKnownSpots } from '../../../shared/spots/search'

describe('spots.json', () => {
  it('has unique ids', () => {
    const ids = KNOWN_SPOTS.map((s) => s.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('has valid coordinates, country codes and sources', () => {
    for (const s of KNOWN_SPOTS) {
      expect(s.latitude, s.id).toBeGreaterThanOrEqual(-90)
      expect(s.latitude, s.id).toBeLessThanOrEqual(90)
      expect(s.longitude, s.id).toBeGreaterThanOrEqual(-180)
      expect(s.longitude, s.id).toBeLessThanOrEqual(180)
      expect(s.countryCode, s.id).toMatch(/^[a-z]{2}$/)
      expect(s.coordinatesSource, s.id).toMatch(
        /^https:\/\/www\.(openstreetmap\.org|wikidata\.org)\//
      )
    }
  })

  it.each([
    ['Guajiru', 'ilha-do-guajiru'],
    ['Pounda', 'pounda'],
    ['Almanarre', 'l-almanarre'],
    ['Dakhla', 'dakhla']
  ])('finds the reference spot "%s"', (query, id) => {
    expect(searchKnownSpots(KNOWN_SPOTS, query, 5).map((s) => s.id)).toContain(
      id
    )
  })
})
