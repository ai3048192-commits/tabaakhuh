/**
 * Dashboard Reports / Overview shapes (admin-dashboard-api.md Phase 8). Client-only —
 * these are the in-memory shapes the dashboard holds, not database rows.
 */

/** The four user roles the platform recognises. */
export type Role = 'customer' | 'cook' | 'driver' | 'admin'

/** The twelve order statuses (`OrderStatus`). */
export type OrderStatus =
  | 'pending'
  | 'accepted'
  | 'preparing'
  | 'ready_for_pickup'
  | 'assigned_to_driver'
  | 'picked_up'
  | 'on_the_way'
  | 'delivered'
  | 'completed'
  | 'cancelled'
  | 'pending_review'
  | 'quoted'

/**
 * The `data` object of `GET /admin/reports/overview`, exactly as received.
 * `users_by_role` may be partial; `orders_by_status` may be partial AND may
 * carry keys that are not one of the twelve known statuses (FR-017 / FR-018).
 */
export interface RawOverview {
  users_by_role: Partial<Record<Role, number>>
  orders_by_status: Record<string, number>
  total_sales_revenue: number
}

/** A role paired with its current user count. */
export interface RoleCount {
  role: Role
  count: number
}

/** A status paired with its current order count. */
export interface StatusCount {
  /** An `OrderStatus`, or an unrecognised key when `known === false`. */
  status: string
  count: number
  /** `true` → `status` is one of the twelve known values; `false` → unknown key. */
  known: boolean
}

/** The normalised snapshot the screen renders. Produced only by `normalizeOverview`. */
export interface OverviewSnapshot {
  /** Exactly `ROLE_ORDER.length` rows, in `ROLE_ORDER` order. */
  roles: RoleCount[]
  /** The twelve known rows first (in `STATUS_ORDER` order), then any unknown rows. */
  statuses: StatusCount[]
  /** `>= 0`; a non-finite / negative / missing wire value becomes `0`. */
  revenue: number
}

export type OverviewStatus = 'loading' | 'ready' | 'error'

/** Fixed display order for the users-by-role group (FR-006). */
export const ROLE_ORDER: readonly Role[] = ['customer', 'cook', 'driver', 'admin']

/** Fixed display order for the orders-by-status group (FR-006). */
export const STATUS_ORDER: readonly OrderStatus[] = [
  'pending',
  'accepted',
  'preparing',
  'ready_for_pickup',
  'assigned_to_driver',
  'picked_up',
  'on_the_way',
  'delivered',
  'completed',
  'cancelled',
  'pending_review',
  'quoted',
]

/** Auto-refresh cadence for the overview screen (FR-016). */
export const REFRESH_INTERVAL_MS = 60_000
