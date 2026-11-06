import { describe, expect, it } from 'vitest'
import {
  knownSpotToSpot,
  normalizeForSearch,
  searchKnownSpots
} from '../../../shared/spots/search'
import type { KnownSpot } from '../../../shared/spots/types'

// Synthetic entries for ranking tests only (not real data).
const spot = (id: string, name: string, aliases: string[] = []): KnownSpot => ({
  id,
  name,
  aliases,
  countryCode: 'fr',
  latitude: 0,
  longitude: 0,
  nameSource: 'test',
  coordinatesSource: 'test'
})

const spots = [
  spot('le-morne', 'Le Morne', ['Maurice']),
  spot('les-coussoules', 'Les Coussoules', ['Leucate', 'La Franqui']),
  spot('les-dosses', 'Les Dosses', ['Le Barcarès', 'Leucate']),
  spot('l-almanarre', "L'Almanarre", ['Hyères']),
  spot('moreton', 'Moreton')
]

describe('normalizeForSearch', () => {
  it('removes accents, case and punctuation', () => {
    expect(normalizeForSearch("  L'Almanarre — Hyères ")).toBe(
      'l almanarre hyeres'
    )
    expect(normalizeForSearch('Klitmøller')).toBe('klitmøller')
  })
})

describe('searchKnownSpots', () => {
  const ids = (q: string, limit = 10) =>
    searchKnownSpots(spots, q, limit).map((s) => s.id)

  it('ignores queries shorter than 2 characters', () => {
    expect(ids('l')).toEqual([])
    expect(ids('  ')).toEqual([])
  })

  it('matches names regardless of accents and case', () => {
    expect(ids('hyeres')).toEqual(['l-almanarre'])
    expect(ids('ALMANARRE')).toEqual(['l-almanarre'])
  })

  it('ranks name prefixes above word prefixes and substrings', () => {
    expect(ids('mor')).toEqual(['moreton', 'le-morne'])
  })

  it('ranks a name match above the same match on an alias', () => {
    expect(ids('leu')).toEqual(['les-coussoules', 'les-dosses'])
    expect(ids('les')).toEqual(['les-coussoules', 'les-dosses'])
  })

  it('finds spots by alias', () => {
    expect(ids('franqui')).toEqual(['les-coussoules'])
  })

  it('respects the limit', () => {
    expect(ids('le', 2)).toHaveLength(2)
  })
})

describe('knownSpotToSpot', () => {
  it('maps to a selectable spot with a prefixed id', () => {
    expect(
      knownSpotToSpot({
        ...spots[0]!,
        country: 'Maurice',
        region: 'Rivière Noire'
      })
    ).toEqual({
      id: 'spot:le-morne',
      kind: 'spot',
      name: 'Le Morne',
      latitude: 0,
      longitude: 0,
      country: 'Maurice',
      countryCode: 'fr',
      admin1: 'Rivière Noire'
    })
  })
})
