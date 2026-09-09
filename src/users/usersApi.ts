import { authedRequest } from '../api/httpClient'
import type { AdminUser, UsersFilters, UsersPage, UserStatus } from './types'

/**
 * `/admin/users*` — Phase 9 of the backend's
 * `docs/admin-dashboard-missing-endpoints.md` (branch
 * `feat/admin-users-management`).
 */

/** `GET /admin/users?role=&status=&q=&page=` → `{ items, page, per_page, total }`. */
export function listUsers(
  { filters, page }: { filters: UsersFilters; page: number },
  signal?: AbortSignal,
): Promise<UsersPage> {
  const sp = new URLSearchParams()
  if (filters.role !== 'all') sp.set('role', filters.role)
  if (filters.status !== 'all') sp.set('status', filters.status)
  if (filters.q.trim() !== '') sp.set('q', filters.q.trim())
  sp.set('page', String(Math.max(1, Math.trunc(page) || 1)))
  return authedRequest<UsersPage>(`/admin/users?${sp.toString()}`, { signal })
}

/** `GET /admin/users/{id}` → `{ user }`. */
export function getUser(id: number, signal?: AbortSignal): Promise<AdminUser> {
  return authedRequest<{ user: AdminUser }>(`/admin/users/${id}`, { signal }).then((d) => d.user)
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
