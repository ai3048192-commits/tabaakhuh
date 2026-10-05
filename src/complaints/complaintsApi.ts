import { authedRequest } from '../api/httpClient'
import type {
  ComplaintDetail,
  ComplaintsFilters,
  ComplaintsPage,
  ComplaintStatus,
  SendersPage,
} from './types'

function pageParam(page: number): string {
  return String(Math.max(1, Math.trunc(page) || 1))
}

/** `GET /admin/complaints/senders?type=&status=&role=&page=` → one row per sender. */
export function listSenders(
  { filters, page }: { filters: ComplaintsFilters; page: number },
  signal?: AbortSignal,
): Promise<SendersPage> {
  const sp = new URLSearchParams()
  if (filters.type !== 'all') sp.set('type', filters.type)
  if (filters.status !== 'all') sp.set('status', filters.status)
  if (filters.role !== 'all') sp.set('role', filters.role)
  sp.set('page', pageParam(page))
  return authedRequest<SendersPage>(`/admin/complaints/senders?${sp.toString()}`, { signal })
}

/** `GET /admin/complaints?user_id=&page=` → everything one person sent, newest first. */
export function listSenderComplaints(
  userId: number,
  page: number,
  signal?: AbortSignal,
): Promise<ComplaintsPage> {
  const sp = new URLSearchParams({ user_id: String(userId), page: pageParam(page) })
  return authedRequest<ComplaintsPage>(`/admin/complaints?${sp.toString()}`, { signal })
}

/** `GET /admin/complaints/{id}` → the complaint plus its message thread. */
export function getComplaint(id: number, signal?: AbortSignal): Promise<ComplaintDetail> {
  return authedRequest<ComplaintDetail>(`/admin/complaints/${id}`, { signal })
}

/** `POST /admin/complaints/{id}/reply` — body `{ body }`. */
export function replyToComplaint(id: number, body: string): Promise<ComplaintDetail> {
  return authedRequest<ComplaintDetail>(`/admin/complaints/${id}/reply`, {
    method: 'POST',
    body: { body },
  })
}

/** `PATCH /admin/complaints/{id}/status` — body `{ status }`. */
export function setComplaintStatus(
  id: number,
  status: ComplaintStatus,
): Promise<ComplaintDetail> {
  return authedRequest<ComplaintDetail>(`/admin/complaints/${id}/status`, {
    method: 'PATCH',
    body: { status },
  })
}

/** `DELETE /admin/complaints/{id}` — removes it and its thread for good. */
export function deleteComplaint(id: number): Promise<unknown> {
  return authedRequest<unknown>(`/admin/complaints/${id}`, { method: 'DELETE' })
}
