import { useEffect, useState } from 'react'
import { fetchCityDirectory, type CityDirectory } from './citiesApi'

export interface UseCityNames {
  /** `name_ar` for a known id; the raw id as a string otherwise (FR-003a). */
  resolve: (cityId: number) => string
  ready: boolean
  /** The directory fetch failed; `resolve` returns raw ids and the screen still works. */
  failed: boolean
}

/**
 * Resolves cook `city_id`s to display names. Loads the directory in parallel
 * with whatever else the screen is doing; never throws and never blocks review.
 */
export function useCityNames(): UseCityNames {
  const [dir, setDir] = useState<CityDirectory | null>(null)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    let cancelled = false
    fetchCityDirectory()
      .then((d) => {
        if (!cancelled) setDir(d)
      })
      .catch(() => {
        if (!cancelled) setFailed(true)
      })
    return () => {
      cancelled = true
    }
  }, [])

  return {
    ready: dir !== null,
    failed,
    resolve: (cityId: number) => dir?.get(cityId)?.name_ar ?? String(cityId),
  }
}
