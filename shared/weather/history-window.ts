import type { WindHistoryRequest } from './types'

/**
 * The last `years` complete calendar years before `today` (UTC).
 * Complete years keep request URLs (and cache keys) stable for a whole year.
 */
export function completeYearsWindow(
  today: Date,
  years: number
): Pick<WindHistoryRequest, 'startDate' | 'endDate'> {
  if (!Number.isInteger(years) || years < 1) {
    throw new RangeError(`years must be a positive integer, got ${years}`)
  }
  const lastYear = today.getUTCFullYear() - 1
  const firstYear = lastYear - years + 1
  return { startDate: `${firstYear}-01-01`, endDate: `${lastYear}-12-31` }
}
