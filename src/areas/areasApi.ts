import { authedRequest } from '../api/httpClient'
import type { Area, AreaChanges, NewAreaInput } from './types'

/** `GET /admin/areas?city_id=` → one city's areas, active and inactive. */
export function listAreas(cityId: number, signal?: AbortSignal): Promise<Area[]> {
  return authedRequest<Area[]>(`/admin/areas?city_id=${cityId}`, { signal })
}

/** `POST /admin/areas` → the created area (`201`). */
export function createArea(input: NewAreaInput): Promise<Area> {
  return authedRequest<Area>('/admin/areas', { method: 'POST', body: input })
}

/** `PUT /admin/areas/{id}` — rename and/or reprice. */
export function updateArea(id: number, changes: AreaChanges): Promise<Area> {
  return authedRequest<Area>(`/admin/areas/${id}`, { method: 'PUT', body: changes })
}

/** `PATCH /admin/areas/{id}/status`, body `{ is_active }`. */
export function setAreaStatus(id: number, is_active: boolean): Promise<Area> {
  return authedRequest<Area>(`/admin/areas/${id}/status`, { method: 'PATCH', body: { is_active } })
}
