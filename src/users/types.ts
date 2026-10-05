/**
 * Users Management shapes.
 *
 * Contract: backend `feat/admin-users-management` — Phase 9 of
 * `docs/admin-dashboard-missing-endpoints.md` (`GET /admin/users`,
 * `GET /admin/users/{id}`, `PATCH /admin/users/{id}/status`). Account status is
 * `active | suspended`; suspending requires a `reason`. `created_at` is part of
 * the 9.1 item shape (the table null-guards it until the backend Resource emits
 * it).
 */

export type UserRole = 'customer' | 'cook' | 'driver' | 'admin'
export type UserStatus = 'active' | 'suspended'

export interface AdminUser {
  id: number
  first_name: string
  last_name: string
  email: string
  phone: string
  role: UserRole
  status: UserStatus
  /** ISO 8601. */
  created_at: string
}

export interface UsersPage {
  items: AdminUser[]
  page: number
  per_page: number
  total: number
}

export interface UsersFilters {
  role: UserRole | 'all'
  status: UserStatus | 'all'
  q: string
}

export type UsersScreenStatus = 'loading' | 'ready' | 'error'

/**
 * Which accounts a users screen lists: everyone (`/users`), or one role's
 * management screen. Cook / driver management lists approved accounts only —
 * applicants stay on the applications screens until they're approved.
 */
export type UsersScope = 'all' | 'customer' | 'cook' | 'driver'

/** `GET /admin/users/{id}/overview` — the account page. */
export interface AccountOverview {
  user: AdminUser & { avatar_url?: string | null; email_verified?: boolean }
  /** Same shape as a cook application's `cook_profile`. */
  cook_profile: import('../cooks/types').CookApplication | null
  contract: import('../cooks/types').SignedContract | null
  /** Same shape as a driver application row. */
  driver_profile: import('../drivers/types').DriverApplication | null
  stats: {
    /** Whose side of the order the tally counts. */
    party: 'customer' | 'cook' | 'driver'
    total_orders: number
    completed_orders: number
    cancelled_orders: number
    /** Paid (customer), earned from dishes (cook) or from delivery fees (driver) — finished orders only. */
    amount_egp: number
  }
}

/** Result of a status-change attempt. */
export type UserActionOutcome =
  | { ok: true }
  | { ok: false; reason: 'not_found' | 'transient' }
