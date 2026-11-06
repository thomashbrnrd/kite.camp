export interface HistogramBin {
  /** Inclusive lower bound, in knots. */
  fromKn: number
  /** Exclusive upper bound, in knots. `null` for the last, open-ended bin. */
  toKn: number | null
  hours: number
  /** Share of counted hours, between 0 and 1. */
  share: number
}

export interface WindHistogram {
  bins: HistogramBin[]
  /** Hours that were counted (selected and with a known speed). */
  countedHours: number
  /** Selected hours skipped because the speed is missing. */
  missingHours: number
}

/**
 * Distribution of wind speeds in fixed-width bins `[from, to)`.
 * Speeds `>= maxKn` fall in a last open-ended bin.
 * `include(i)` selects which hours are counted (e.g. daylight only).
 */
export function windSpeedHistogram(
  speedsKn: readonly (number | null)[],
  options: {
    binWidthKn: number
    maxKn: number
    include?: (index: number) => boolean
  }
): WindHistogram {
  const { binWidthKn, maxKn, include = () => true } = options
  if (!(binWidthKn > 0) || !(maxKn > 0) || maxKn % binWidthKn !== 0) {
    throw new RangeError('maxKn must be a positive multiple of binWidthKn')
  }

  const closedBinCount = maxKn / binWidthKn
  const counts = new Array<number>(closedBinCount + 1).fill(0)
  let countedHours = 0
  let missingHours = 0

  speedsKn.forEach((speed, index) => {
    if (!include(index)) return
    if (speed === null || speed < 0) {
      missingHours++
      return
    }
    const binIndex = Math.min(Math.floor(speed / binWidthKn), closedBinCount)
    counts[binIndex] = (counts[binIndex] ?? 0) + 1
    countedHours++
  })

  const bins = counts.map((hours, i) => ({
    fromKn: i * binWidthKn,
    toKn: i < closedBinCount ? (i + 1) * binWidthKn : null,
    hours,
    share: countedHours > 0 ? hours / countedHours : 0
  }))

  return { bins, countedHours, missingHours }
}
