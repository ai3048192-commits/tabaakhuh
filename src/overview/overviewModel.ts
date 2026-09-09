/**
 * Pure normalisation of the raw overview payload into a fixed-shape snapshot.
 * No `Date`, no I/O, no `messages` import — deterministic for a given input.
 */
import {
  ROLE_ORDER,
  STATUS_ORDER,
  type OverviewSnapshot,
  type RawOverview,
  type StatusCount,
} from './types'

/** Coerce an unknown wire value to a finite `>= 0` number; anything else → `0`. */
function nonNegative(value: unknown): number {
  const n = Number(value)
  return Number.isFinite(n) && n > 0 ? n : 0
}

const KNOWN_STATUSES = new Set<string>(STATUS_ORDER)

/**
 * Turn a `RawOverview` (possibly partial, possibly with extra `orders_by_status`
 * keys) into the `OverviewSnapshot` the screen renders:
 *
 * - every role in `ROLE_ORDER`, in order, missing wire key → `0` (FR-006 / FR-017)
 * - every status in `STATUS_ORDER`, in order, missing wire key → `0` (FR-006 / FR-017)
 * - any `orders_by_status` key not in `STATUS_ORDER` appended as `known: false`,
 *   in object-key order (FR-018)
 * - `revenue` coerced to a finite `>= 0` number, else `0`
 * - `normalizeOverview({})` → all zeros, no unknown rows (FR-010 / FR-017)
 */
export function normalizeOverview(raw: RawOverview): OverviewSnapshot {
  const usersByRole = raw?.users_by_role ?? {}
  const ordersByStatus = raw?.orders_by_status ?? {}

  const roles = ROLE_ORDER.map((role) => ({
    role,
    count: nonNegative(usersByRole[role]),
  }))

  const knownStatuses: StatusCount[] = STATUS_ORDER.map((status) => ({
    status,
    count: nonNegative(ordersByStatus[status]),
    known: true,
  }))

  const unknownStatuses: StatusCount[] = Object.keys(ordersByStatus)
    .filter((key) => !KNOWN_STATUSES.has(key))
    .map((key) => ({
      status: key,
      count: nonNegative(ordersByStatus[key]),
      known: false,
    }))

  return {
    roles,
    statuses: [...knownStatuses, ...unknownStatuses],
    revenue: nonNegative(raw?.total_sales_revenue),
  }
}
