import { authedRequest } from '../api/httpClient'
import type { DriverApplication } from './types'

/** `GET /admin/drivers/pending` → the flat array as-is (caller sorts). */
export async function listPendingDrivers(signal?: AbortSignal): Promise<DriverApplication[]> {
  const raw = await authedRequest<DriverApplication[]>('/admin/drivers/pending', { signal })
  return raw.map((d) => ({
    ...d,
    name: d.applicant?.name ?? d.name,
    phone: d.applicant?.phone ?? null,
    email: d.applicant?.email ?? null,
  }))
}

/** `POST /admin/drivers/{id}/approve` — no body. Propagates `ApiError`. */
export function approveDriver(id: number): Promise<DriverApplication> {
  return authedRequest<DriverApplication>(`/admin/drivers/${id}/approve`, { method: 'POST' })
}

/** `POST /admin/drivers/{id}/reject` — body `{ reason }`. Propagates `ApiError`. */
export function rejectDriver(id: number, reason: string): Promise<DriverApplication> {
  return authedRequest<DriverApplication>(`/admin/drivers/${id}/reject`, {
    method: 'POST',
    body: { reason },
  })
}
