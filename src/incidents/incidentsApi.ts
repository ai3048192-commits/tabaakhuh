import { authedRequest } from '../api/httpClient'
import type { IncidentDetail, IncidentsFilters, IncidentsPage, IncidentStatus } from './types'

/**
 * `/admin/support/tickets` narrowed to `category=incident` — the same
 * surface `/admin/complaints` narrows to `complaint`/`suggestion`
 * (`routes/api.php` on the backend). See `admin-dashboard-api.md` Phase
 * 15 for the general support-ticket contract.
 */

/** `GET /admin/support/tickets?category=incident&status=&page=`. */
export function listIncidents(
  { filters, page }: { filters: IncidentsFilters; page: number },
  signal?: AbortSignal,
): Promise<IncidentsPage> {
  const sp = new URLSearchParams()
  sp.set('category', 'incident')
  if (filters.status !== 'all') sp.set('status', filters.status)
  sp.set('page', String(Math.max(1, Math.trunc(page) || 1)))
  return authedRequest<IncidentsPage>(`/admin/support/tickets?${sp.toString()}`, { signal })
}

/** `GET /admin/support/tickets/{id}` → `{ ticket: { ...IncidentDetail } }`. */
export async function getIncident(id: number, signal?: AbortSignal): Promise<IncidentDetail> {
  const res = await authedRequest<{ ticket: IncidentDetail }>(`/admin/support/tickets/${id}`, { signal })
  return res.ticket
}

/** `POST /admin/support/tickets/{id}/replies` — body `{ message }`. */
export async function replyToIncident(id: number, message: string): Promise<void> {
  await authedRequest(`/admin/support/tickets/${id}/replies`, {
    method: 'POST',
    body: { message },
  })
}

/** `PATCH /admin/support/tickets/{id}/status` — body `{ status }` → `{ ticket: { ...IncidentDetail } }`. */
export async function setIncidentStatus(id: number, status: IncidentStatus): Promise<IncidentDetail> {
  const res = await authedRequest<{ ticket: IncidentDetail }>(`/admin/support/tickets/${id}/status`, {
    method: 'PATCH',
    body: { status },
  })
  return res.ticket
}
