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
  /** Did the user confirm their email (activate the account)? Absent until the list endpoint emits it. */
  email_verified?: boolean
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
  /** Email confirmed (account activated) or not. */
  verified: 'all' | 'yes' | 'no'
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

/** One row of `GET /admin/users/export` — every account, flattened for Excel. */
export interface AccountExportRow {
  id: number
  first_name: string
  last_name: string
  email: string
  phone: string
  role: UserRole
  status: UserStatus
  email_verified: boolean
  /** ISO 8601. */
  created_at: string | null
  city: string | null
  /** Cook / driver application state; null for customers and admins. */
  approval_status: 'pending' | 'approved' | 'rejected' | null
  store_name: string | null
  area: string | null
  address: string | null
  delivery_radius_km: number | null
  rating_avg: number | null
  rating_count: number | null
  is_open: boolean | null
  vodafone_cash: string | null
  instapay: string | null
  vehicle_type: string | null
  vehicle_model: string | null
  vehicle_color: string | null
  vehicle_plate: string | null
  vehicle_year: number | null
  total_orders: number
  completed_orders: number
  cancelled_orders: number
  /** What a customer paid / a cook or driver earned, on delivered + completed orders. */
  amount_egp: number
}
