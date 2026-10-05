import { authedRequest } from '../api/httpClient'
import type { AccountOverview, AdminUser, UsersFilters, UsersPage, UserStatus } from './types'

/**
 * `/admin/users*` — Phase 9 of the backend's
 * `docs/admin-dashboard-missing-endpoints.md` (branch
 * `feat/admin-users-management`).
 */

/** `GET /admin/users?role=&status=&q=&page=` → `{ items, page, per_page, total }`. */
export function listUsers(
  { filters, page, approval }: { filters: UsersFilters; page: number; approval?: 'approved' },
  signal?: AbortSignal,
): Promise<UsersPage> {
  const sp = new URLSearchParams()
  if (filters.role !== 'all') sp.set('role', filters.role)
  if (approval) sp.set('approval', approval)
  if (filters.status !== 'all') sp.set('status', filters.status)
  if (filters.q.trim() !== '') sp.set('q', filters.q.trim())
  sp.set('page', String(Math.max(1, Math.trunc(page) || 1)))
  return authedRequest<UsersPage>(`/admin/users?${sp.toString()}`, { signal })
}

/** `GET /admin/users/{id}` → `{ user }`. */
export function getUser(id: number, signal?: AbortSignal): Promise<AdminUser> {
  return authedRequest<{ user: AdminUser }>(`/admin/users/${id}`, { signal }).then((d) => d.user)
}

/** `GET /admin/users/{id}/overview` — profile, registration data and order tally. */
export function getAccountOverview(id: number, signal?: AbortSignal): Promise<AccountOverview> {
  return authedRequest<AccountOverview>(`/admin/users/${id}/overview`, { signal })
}

/**
 * `PATCH /admin/users/{id}/status` — body `{ status, reason? }`. `reason` is
 * mandatory when suspending (backend `UpdateUserStatusRequest`), ignored when
 * reactivating. Returns the updated `{ user }`.
 */
export function setUserStatus(
  id: number,
  status: UserStatus,
  reason?: string,
): Promise<AdminUser> {
  const body: { status: UserStatus; reason?: string } = { status }
  if (status === 'suspended' && reason != null && reason.trim() !== '') {
    body.reason = reason.trim()
  }
  return authedRequest<{ user: AdminUser }>(`/admin/users/${id}/status`, {
    method: 'PATCH',
    body,
  }).then((d) => d.user)
}
