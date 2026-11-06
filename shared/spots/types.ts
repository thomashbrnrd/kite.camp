/** A well-known kite spot from `spots.json` (see shared/spots/README.md). */
export interface KnownSpot {
  /** Stable slug, unique in the list. */
  id: string
  name: string
  /** Other names people search for: nearby town, island, local spelling… */
  aliases: string[]
  country?: string
  /** ISO 3166-1 alpha-2, lower case, as reported by OpenStreetMap. */
  countryCode: string
  region?: string
  latitude: number
  longitude: number
  /** Where the spot name comes from (wikipedia-fr, wikipedia-nl, owner, curated). */
  nameSource: string
  /** URL of the OpenStreetMap object or Wikidata item the coordinates come from. */
  coordinatesSource: string
}
