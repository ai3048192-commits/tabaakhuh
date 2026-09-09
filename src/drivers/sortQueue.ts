import type { DriverApplication } from './types'

/**
 * Oldest-first, first-come-first-served (FR-010):
 *  1. ascending by `submitted_at` (ISO 8601 strings compare lexicographically =
 *     chronologically);
 *  2. ties broken by ascending `id`.
 *
 * Pure: returns a new array, does not mutate the input. The comparator is a
 * total order, so the result is stable and identical across repeated calls with
 * equal input (SC-010).
 */
export function sortQueue(entries: DriverApplication[]): DriverApplication[] {
  return [...entries].sort((a, b) => {
    if (a.submitted_at !== b.submitted_at) return a.submitted_at < b.submitted_at ? -1 : 1
    return a.id - b.id
  })
}
