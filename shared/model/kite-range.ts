import { MODEL_CONFIG, type Discipline, type Level } from '../config'

/** Inclusive wind range, in knots. */
export interface WindRange {
  minKn: number
  maxKn: number
}

export interface KiteRange extends WindRange {
  sizeM2: number
  idealKn: number
}

export interface RiderProfile {
  weightKg: number
  discipline: Discipline
  level: Level
}

export interface RangeCoefficients {
  kByDiscipline: Readonly<Record<Discipline, number>>
  lowMultiplier: number
  highMultiplierByLevel: Readonly<Record<Level, number>>
}

function assertPositive(name: string, value: number) {
  if (!Number.isFinite(value) || value <= 0) {
    throw new RangeError(`${name} must be a positive number, got ${value}`)
  }
}

/** ideal wind (kn) = k × weight (kg) / size (m²) — SPEC §6. */
export function idealWindKn(weightKg: number, sizeM2: number, k: number) {
  assertPositive('weightKg', weightKg)
  assertPositive('sizeM2', sizeM2)
  assertPositive('k', k)
  return (k * weightKg) / sizeM2
}

/** Rideable range of one kite: [ideal × low, ideal × high] — SPEC §6. */
export function kiteRange(
  sizeM2: number,
  profile: RiderProfile,
  coefficients: RangeCoefficients = MODEL_CONFIG
): KiteRange {
  const ideal = idealWindKn(
    profile.weightKg,
    sizeM2,
    coefficients.kByDiscipline[profile.discipline]
  )
  return {
    sizeM2,
    idealKn: ideal,
    minKn: ideal * coefficients.lowMultiplier,
    maxKn: ideal * coefficients.highMultiplierByLevel[profile.level]
  }
}

/** Ranges of a whole quiver, sorted from the smallest to the largest kite. */
export function quiverRanges(
  sizesM2: readonly number[],
  profile: RiderProfile,
  coefficients: RangeCoefficients = MODEL_CONFIG
): KiteRange[] {
  return [...sizesM2]
    .sort((a, b) => a - b)
    .map((size) => kiteRange(size, profile, coefficients))
}

/** Union of ranges as disjoint intervals, sorted by lower bound. */
export function mergeRanges(ranges: readonly WindRange[]): WindRange[] {
  const sorted = [...ranges].sort((a, b) => a.minKn - b.minKn)
  const merged: WindRange[] = []
  for (const range of sorted) {
    const last = merged.at(-1)
    if (last && range.minKn <= last.maxKn) {
      last.maxKn = Math.max(last.maxKn, range.maxKn)
    } else {
      merged.push({ minKn: range.minKn, maxKn: range.maxKn })
    }
  }
  return merged
}
