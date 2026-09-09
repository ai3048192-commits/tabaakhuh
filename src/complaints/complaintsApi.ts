import { authedRequest } from '../api/httpClient'
import type {
  ComplaintDetail,
  ComplaintsFilters,
  ComplaintsPage,
  ComplaintStatus,
} from './types'

/**
 * ⚠️ PROVISIONAL — endpoints per `backend-requirements.md` §ب. Update the paths
 * here if the finalised backend spec differs.
 */

/** `GET /admin/complaints?type=&status=&page=` → paginated list. */
export function listComplaints(
  { filters, page }: { filters: ComplaintsFilters; page: number },
  signal?: AbortSignal,
): Promise<ComplaintsPage> {
  const sp = new URLSearchParams()
  if (filters.type !== 'all') sp.set('type', filters.type)
  if (filters.status !== 'all') sp.set('status', filters.status)
  sp.set('page', String(Math.max(1, Math.trunc(page) || 1)))
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
