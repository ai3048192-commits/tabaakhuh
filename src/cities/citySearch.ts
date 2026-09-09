import type { City } from './types'

/**
 * Client-side filter for the cities list (FR-042). Keeps a city when the trimmed,
 * lower-cased term appears in either `name_ar` or `name_en`. An empty/whitespace
 * term returns the list unchanged. Pure; preserves input order.
 */
export function filterCities(list: City[], term: string): City[] {
  const q = term.trim().toLowerCase()
  if (q === '') return list
  return list.filter(
    (c) => c.name_ar.toLowerCase().includes(q) || c.name_en.toLowerCase().includes(q),
  )
}
