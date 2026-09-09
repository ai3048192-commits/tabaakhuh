import type { PendingCookEntry } from './types'

/**
 * Oldest-first, first-come-first-served (FR-011):
 *  1. entries with a signed contract before entries without one;
 *  2. within the signed group, ascending by `contract.signed_at`;
 *  3. ties (and the whole unsigned group) broken by ascending `profile.id`
 *     — the pending payload carries no submission timestamp, so the id is the
 *     creation-order proxy.
 *
 * Pure: returns a new array, does not mutate the input. The comparator is a
 * total order, so the result is stable across repeated calls with equal input.
 */
export function sortQueue(entries: PendingCookEntry[]): PendingCookEntry[] {
  return [...entries].sort((a, b) => {
    const aHas = a.contract ? 0 : 1
    const bHas = b.contract ? 0 : 1
    if (aHas !== bHas) return aHas - bHas

    const aAt = a.contract?.signed_at ?? ''
    const bAt = b.contract?.signed_at ?? ''
    if (aAt !== bAt) return aAt < bAt ? -1 : 1

    return a.profile.id - b.profile.id
  })
}
