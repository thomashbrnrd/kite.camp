import type { Spot } from '../weather/types'
import type { KnownSpot } from './types'

/** Lower case, no diacritics, punctuation collapsed to single spaces. */
export function normalizeForSearch(text: string): string {
  return text
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .replace(/[^\p{Letter}\p{Number}]+/gu, ' ')
    .trim()
}

const SCORE = { exact: 4, prefix: 3, wordPrefix: 2, substring: 1 } as const

function matchScore(candidate: string, query: string): number {
  if (candidate === query) return SCORE.exact
  if (candidate.startsWith(query)) return SCORE.prefix
  if (candidate.split(' ').some((word) => word.startsWith(query))) {
    return SCORE.wordPrefix
  }
  if (candidate.includes(query)) return SCORE.substring
  return 0
}

/**
 * Known spots matching `query` on their name or aliases, best matches first.
 * A match on the name ranks above the same kind of match on an alias.
 */
export function searchKnownSpots(
  spots: readonly KnownSpot[],
  query: string,
  limit: number
): KnownSpot[] {
  const q = normalizeForSearch(query)
  if (q.length < 2) return []

  return spots
    .map((spot) => {
      const nameScore = matchScore(normalizeForSearch(spot.name), q) * 2
      const aliasScore = Math.max(
        0,
        ...spot.aliases.map(
          (alias) => matchScore(normalizeForSearch(alias), q) * 2 - 1
        )
      )
      return { spot, score: Math.max(nameScore, aliasScore) }
    })
    .filter((result) => result.score > 0)
    .sort(
      (a, b) =>
        b.score - a.score || a.spot.name.localeCompare(b.spot.name, 'fr')
    )
    .slice(0, limit)
    .map((result) => result.spot)
}

export function knownSpotToSpot(spot: KnownSpot): Spot {
  return {
    id: `spot:${spot.id}`,
    kind: 'spot',
    name: spot.name,
    latitude: spot.latitude,
    longitude: spot.longitude,
    country: spot.country,
    countryCode: spot.countryCode,
    admin1: spot.region
  }
}
