import { authedDownload, authedRequest } from '../api/httpClient'
import type { AccountExportRow, AccountOverview, AdminUser, UsersFilters, UsersPage, UserStatus } from './types'

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
  if (filters.verified !== 'all') sp.set('email_verified', filters.verified === 'yes' ? '1' : '0')
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

/** `GET /admin/users/export` — every account (all roles, unpaged), for the Excel export. */
export function exportAccounts(signal?: AbortSignal): Promise<AccountExportRow[]> {
  return authedRequest<{ items: AccountExportRow[] }>('/admin/users/export', { signal }).then((d) => d.items)
}

/** `GET /admin/users/export/pdf` — the same accounts as a server-rendered PDF. */
export function downloadAccountsPdf(signal?: AbortSignal): Promise<Blob> {
  return authedDownload('/admin/users/export/pdf', { signal }).then((d) => d.blob)
}

/**
 * `DELETE /admin/users/{id}` — permanently deletes the account and all of its
 * data (orders, profile, dishes, wallet, files). 409 while it has an open
 * order, 403 for an admin account.
 */
export function deleteUser(id: number): Promise<void> {
  return authedRequest<unknown>(`/admin/users/${id}`, { method: 'DELETE' }).then(() => undefined)
}

/**
 * `PATCH /admin/users/{id}/contact` — change an account's email and / or phone.
 * 422 (with the server's message) when the value belongs to another account.
 */
export function updateUserContact(id: number, body: { email?: string; phone?: string }): Promise<AdminUser> {
  return authedRequest<{ user: AdminUser }>(`/admin/users/${id}/contact`, {
    method: 'PATCH',
    body,
    headers: { 'Accept-Language': 'ar' },
  }).then((d) => d.user)
}

/**
 * `POST /admin/users/{id}/verification` (multipart: full_name, national_id,
 * id_front, id_back) — upload a cook's identity verification on her behalf.
 */
export function uploadCookVerification(
  id: number,
  input: { fullName: string; nationalId: string; idFront: File; idBack: File },
): Promise<void> {
  const fd = new FormData()
  fd.append('full_name', input.fullName)
  fd.append('national_id', input.nationalId)
  fd.append('id_front', input.idFront)
  fd.append('id_back', input.idBack)
  return authedRequest<unknown>(`/admin/users/${id}/verification`, {
    method: 'POST',
    body: fd,
    headers: { 'Accept-Language': 'ar' },
  }).then(() => undefined)
}
