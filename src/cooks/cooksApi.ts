import { authedRequest } from '../api/httpClient'
import type { CookApplication, PendingCookEntry, RawPendingCook } from './types'

/** `GET /admin/cooks/pending` → entries (unsorted; caller sorts). */
export async function listPendingCooks(signal?: AbortSignal): Promise<PendingCookEntry[]> {
  const raw = await authedRequest<RawPendingCook[]>('/admin/cooks/pending', { signal })
  return raw.map((r) => ({ profile: r.cook_profile, contract: r.contract }))
}

/** `POST /admin/cooks/{id}/approve` — no body. Propagates `ApiError`. */
export function approveCook(id: number): Promise<CookApplication> {
  return authedRequest<CookApplication>(`/admin/cooks/${id}/approve`, { method: 'POST' })
}

/** `POST /admin/cooks/{id}/reject` — body `{ reason }`. Propagates `ApiError`. */
export function rejectCook(id: number, reason: string): Promise<CookApplication> {
  return authedRequest<CookApplication>(`/admin/cooks/${id}/reject`, {
    method: 'POST',
    body: { reason },
  })
}
