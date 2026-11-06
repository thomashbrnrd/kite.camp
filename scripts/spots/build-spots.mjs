#!/usr/bin/env node
// Builds shared/spots/spots.json from scripts/spots/seed.json.
//
// Coordinates come from OpenStreetMap via Nominatim (ODbL). The Nominatim usage policy
// (https://operations.osmfoundation.org/policies/nominatim/) is respected: single thread,
// at most 1 request per second, identifying User-Agent, and results cached on disk
// (scripts/spots/.cache, git-ignored) so that re-runs do not hit the service again.
//
// A seed entry can bypass geocoding with `"coordinates": { "latitude", "longitude", "source" }`
// when the geocoder result is wrong (see the review report printed at the end).
//
// Usage: node scripts/spots/build-spots.mjs

import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { createHash } from 'node:crypto'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const root = join(here, '..', '..')
const cacheDir = join(here, '.cache')
const outFile = join(root, 'shared', 'spots', 'spots.json')

const USER_AGENT =
  'kite-camp-spots-builder/0.1 (+https://github.com/thomashbrnrd/kite.camp)'
const MIN_INTERVAL_MS = 1100

// Territories that OSM may report under another country code.
const COUNTRY_GROUPS = [
  ['fr', 're', 'mq', 'gp', 'gf', 'yt', 'bl', 'mf', 'nc', 'pf', 'pm'],
  ['nl', 'bq', 'aw', 'cw', 'sx'],
  ['ma', 'eh'],
  ['tz'],
  ['mu']
]

function sameCountry(expected, actual) {
  if (expected === actual) return true
  return COUNTRY_GROUPS.some((g) => g.includes(expected) && g.includes(actual))
}

function slugify(text) {
  return text
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

let lastRequest = 0
const NEAR_DEGREES = 0.15

async function nominatim(query, near) {
  const key = createHash('sha1')
    .update(near ? `${query}|${near.join(',')}` : query)
    .digest('hex')
  const cacheFile = join(cacheDir, `${key}.json`)
  try {
    return JSON.parse(await readFile(cacheFile, 'utf8'))
  } catch {
    // Not cached yet.
  }

  const wait = lastRequest + MIN_INTERVAL_MS - Date.now()
  if (wait > 0) await new Promise((resolve) => setTimeout(resolve, wait))
  lastRequest = Date.now()

  const url = new URL('https://nominatim.openstreetmap.org/search')
  url.search = new URLSearchParams({
    q: query,
    format: 'jsonv2',
    limit: '5',
    addressdetails: '1',
    'accept-language': 'fr',
    // `near` = [lat, lon]: restrict the search to a box of about ±15 km.
    ...(near && {
      viewbox: [
        near[1] - NEAR_DEGREES,
        near[0] + NEAR_DEGREES,
        near[1] + NEAR_DEGREES,
        near[0] - NEAR_DEGREES
      ].join(','),
      bounded: '1'
    })
  }).toString()

  const response = await fetch(url, { headers: { 'User-Agent': USER_AGENT } })
  if (!response.ok) {
    throw new Error(`Nominatim ${response.status} for "${query}"`)
  }
  const results = await response.json()
  await writeFile(cacheFile, JSON.stringify({ query, results }, null, 2))
  return { query, results }
}

function regionOf(address = {}) {
  return (
    address.state ??
    address.region ??
    address.province ??
    address.county ??
    address.archipelago ??
    undefined
  )
}

const normalize = (text) =>
  text
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()

/** Locality expected in the result address: `expect`, or the last part of the query. */
function expectedLocality(entry) {
  if (entry.expect !== undefined) return entry.expect
  const parts = entry.query.split(',')
  return parts.length > 1 ? parts.at(-1).trim() : null
}

const round = (value) => Math.round(Number(value) * 1e5) / 1e5

async function main() {
  await mkdir(cacheDir, { recursive: true })
  const seed = JSON.parse(await readFile(join(here, 'seed.json'), 'utf8'))
  const spots = []
  const report = []
  const ids = new Set()

  for (const entry of seed.spots) {
    const id = slugify(entry.name)
    if (ids.has(id)) throw new Error(`Duplicate spot id: ${id}`)
    ids.add(id)

    let spot
    if (entry.coordinates) {
      spot = {
        latitude: entry.coordinates.latitude,
        longitude: entry.coordinates.longitude,
        coordinatesSource: entry.coordinates.source
      }
      report.push({ id, status: 'MANUAL', detail: entry.coordinates.source })
    } else {
      const { results } = await nominatim(entry.query, entry.near)
      const match = results.find((r) =>
        sameCountry(entry.country, r.address?.country_code)
      )
      if (!match) {
        report.push({
          id,
          status: results.length ? 'COUNTRY_MISMATCH' : 'NO_RESULT',
          detail: results[0]?.display_name ?? entry.query
        })
        continue
      }
      spot = {
        latitude: round(match.lat),
        longitude: round(match.lon),
        country: match.address?.country,
        countryCode: match.address?.country_code,
        region: regionOf(match.address),
        coordinatesSource: `https://www.openstreetmap.org/${match.osm_type}/${match.osm_id}`
      }
      const expected = expectedLocality(entry)
      const located =
        !expected || normalize(match.display_name).includes(normalize(expected))
      report.push({
        id,
        status: located ? 'OK' : 'CHECK_LOCALITY',
        detail: `${match.category}=${match.type} | ${match.display_name}`
      })
    }

    spots.push({
      id,
      name: entry.name,
      aliases: entry.aliases ?? [],
      country: spot.country ?? entry.countryName,
      countryCode: spot.countryCode ?? entry.country,
      region: spot.region ?? entry.region,
      latitude: spot.latitude,
      longitude: spot.longitude,
      nameSource: entry.nameSource,
      coordinatesSource: spot.coordinatesSource
    })
  }

  spots.sort((a, b) => a.name.localeCompare(b.name, 'fr'))
  await mkdir(dirname(outFile), { recursive: true })
  await writeFile(outFile, `${JSON.stringify(spots, null, 2)}\n`)

  for (const line of report) {
    console.log(
      `${line.status.padEnd(16)} ${line.id.padEnd(28)} ${line.detail}`
    )
  }
  console.log(`\n${spots.length} spots written to ${outFile}`)
  const problems = report.filter(
    (r) => !['OK', 'MANUAL', 'CHECK_LOCALITY'].includes(r.status)
  )
  const checks = report.filter((r) => r.status === 'CHECK_LOCALITY')
  if (checks.length) {
    console.log(
      `${checks.length} spots to double-check (locality not found in address).`
    )
  }
  if (problems.length) {
    console.log(`${problems.length} spots need a manual fix (see above).`)
    process.exitCode = 1
  }
}

await main()
