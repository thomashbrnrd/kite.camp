import type { WindHistory } from '../weather/types'
import type { WindRange } from './kite-range'

export interface CoverageOptions {
  /** Multiplier applied to the wind data (SPEC §6), e.g. 1.2 for a windier spot. */
  windCorrection: number
  /** Months to include (1–12). All months when omitted or empty. */
  months?: readonly number[]
  /** Consecutive rideable daylight hours needed for a rideable day. */
  minConsecutiveRideableHours: number
}

export interface CoverageResult {
  /** Daylight hours, in the selected months, with a known wind speed. */
  countedHours: number
  rideableHours: number
  /** rideableHours / countedHours, between 0 and 1. */
  hourShare: number
  /** Local dates with at least one counted hour. */
  countedDays: number
  rideableDays: number
  /** rideableDays / countedDays, between 0 and 1. */
  dayShare: number
}

type CoverageInput = Pick<WindHistory, 'time' | 'windSpeedKn' | 'isDay'>

/**
 * Coverage of a quiver over a wind history (SPEC §6):
 * - an hour is rideable when the corrected wind falls in at least one range (bounds included);
 * - a day is rideable with at least N consecutive rideable daylight hours on the same local date,
 *   any kite of the quiver (switching kites during a session is fine).
 * Night hours and hours without data break a run of consecutive hours.
 */
export function computeCoverage(
  history: CoverageInput,
  ranges: readonly WindRange[],
  options: CoverageOptions
): CoverageResult {
  const { windCorrection, minConsecutiveRideableHours } = options
  if (!(windCorrection > 0)) {
    throw new RangeError(
      `windCorrection must be positive, got ${windCorrection}`
    )
  }
  if (
    !Number.isInteger(minConsecutiveRideableHours) ||
    minConsecutiveRideableHours < 1
  ) {
    throw new RangeError(
      'minConsecutiveRideableHours must be a positive integer'
    )
  }
  const months = options.months?.length ? new Set(options.months) : null

  let countedHours = 0
  let rideableHours = 0
  let countedDays = 0
  let rideableDays = 0

  let currentDate = ''
  let dayCounted = false
  let dayRideable = false
  let run = 0

  const closeDay = () => {
    if (dayCounted) countedDays++
    if (dayRideable) rideableDays++
  }

  for (let i = 0; i < history.time.length; i++) {
    const time = history.time[i]!
    const date = time.slice(0, 10)
    if (date !== currentDate) {
      closeDay()
      currentDate = date
      dayCounted = false
      dayRideable = false
      run = 0
    }

    const speed = history.windSpeedKn[i]
    const inSelection =
      history.isDay[i] === true &&
      speed !== null &&
      speed !== undefined &&
      (months === null || months.has(Number(time.slice(5, 7))))

    if (!inSelection) {
      run = 0
      continue
    }

    countedHours++
    dayCounted = true
    const wind = speed * windCorrection
    const rideable = ranges.some((r) => wind >= r.minKn && wind <= r.maxKn)

    if (rideable) {
      rideableHours++
      run++
      if (run >= minConsecutiveRideableHours) dayRideable = true
    } else {
      run = 0
    }
  }
  closeDay()

  return {
    countedHours,
    rideableHours,
    hourShare: countedHours > 0 ? rideableHours / countedHours : 0,
    countedDays,
    rideableDays,
    dayShare: countedDays > 0 ? rideableDays / countedDays : 0
  }
}
