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

/** Result of a status-change attempt. */
export type UserActionOutcome =
  | { ok: true }
  | { ok: false; reason: 'not_found' | 'transient' }
