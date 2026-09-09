import { authedRequest } from '../api/httpClient'
import type { City, CityNamePatch, NewCityInput } from './types'

export type CityDirectory = Map<number, { name_ar: string; name_en: string }>

let cache: Promise<CityDirectory> | null = null

async function load(): Promise<CityDirectory> {
  const cities = await authedRequest<City[]>('/admin/cities')
  const map: CityDirectory = new Map()
  // Inactive cities are kept — a cook may belong to a city that was later disabled.
  for (const c of cities) map.set(c.id, { name_ar: c.name_ar, name_en: c.name_en })
  return map
}

/**
 * The city directory, fetched once per browser session and memoised (research
 * R5). A failed fetch clears the memo so a later screen open can retry.
 */
export function fetchCityDirectory(): Promise<CityDirectory> {
  if (!cache) {
    cache = load().catch((err) => {
      cache = null
      throw err
    })
  }
  return cache
}

/**
 * Drop the module memo. Used by tests between cases, and — in production — by
 * the cities-management screen after any successful create / edit / status
 * change, so cook/driver review re-fetch a directory that includes the change
 * on their next mount (research R8).
 */
export function __resetCityDirectory(): void {
  cache = null
}

// --- Cities management (admin-dashboard-api.md Phase 5) --------------------
// Additive: the read-only directory above (fetchCityDirectory / useCityNames)
// is untouched. These use a fresh GET on every call and never read the memo.

/** `GET /admin/cities` → every city (active and inactive), unpaginated. */
export function listCities(signal?: AbortSignal): Promise<City[]> {
  return authedRequest<City[]>('/admin/cities', { signal })
}

/** `POST /admin/cities`, body `{ name_ar, name_en }`. Resolves with the `201` city. */
export function createCity(input: NewCityInput): Promise<City> {
  return authedRequest<City>('/admin/cities', { method: 'POST', body: input })
}

/** `PUT /admin/cities/{id}`, body = only the changed name key(s). */
export function updateCity(id: number, patch: CityNamePatch): Promise<City> {
  return authedRequest<City>(`/admin/cities/${id}`, { method: 'PUT', body: patch })
}

/** `PATCH /admin/cities/{id}/status`, body `{ is_active }` (always a boolean). */
export function setCityStatus(id: number, is_active: boolean): Promise<City> {
  return authedRequest<City>(`/admin/cities/${id}/status`, {
    method: 'PATCH',
    body: { is_active },
  })
}
