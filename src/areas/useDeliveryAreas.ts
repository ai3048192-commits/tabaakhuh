import { useCallback, useEffect, useRef, useState } from 'react'
import { listCities } from '../cities/citiesApi'
import type { City } from '../cities/types'
import { createArea, listAreas, setAreaStatus, updateArea } from './areasApi'
import { classifyAreaMutation } from './mutationOutcome'
import type { Area, AreaChanges, AreaMutationOutcome, LoadStatus } from './types'

/**
 * State for the delivery-pricing screen: the city list, which city is
 * selected, that city's areas, and the create / edit / status mutations.
 * Every successful mutation re-fetches the selected city's areas, so the
 * table always shows the server's numbers (the ones customers are charged).
 */
export function useDeliveryAreas() {
  const [cities, setCities] = useState<City[]>([])
  const [citiesStatus, setCitiesStatus] = useState<LoadStatus>('loading')
  const [cityId, setCityId] = useState<number | null>(null)

  const [areas, setAreas] = useState<Area[]>([])
  const [areasStatus, setAreasStatus] = useState<LoadStatus>('loading')
  const areasAbort = useRef<AbortController | null>(null)

  const loadCities = useCallback(async () => {
    setCitiesStatus('loading')
    try {
      const list = await listCities()
      setCities(list)
      setCitiesStatus('ready')
      setCityId((current) => {
        if (current !== null && list.some((c) => c.id === current)) return current
        return (list.find((c) => c.is_active) ?? list[0])?.id ?? null
      })
    } catch {
      setCitiesStatus('error')
    }
  }, [])

  const loadAreas = useCallback(async (id: number) => {
    areasAbort.current?.abort()
    const ctrl = new AbortController()
    areasAbort.current = ctrl
    setAreasStatus('loading')
    try {
      const list = await listAreas(id, ctrl.signal)
      if (ctrl.signal.aborted) return
      setAreas(list)
      setAreasStatus('ready')
    } catch {
      if (ctrl.signal.aborted) return
      setAreasStatus('error')
    }
  }, [])

  useEffect(() => {
    void loadCities()
  }, [loadCities])

  useEffect(() => {
    if (cityId !== null) void loadAreas(cityId)
    return () => areasAbort.current?.abort()
  }, [cityId, loadAreas])

  const run = useCallback(
    async (op: () => Promise<unknown>): Promise<AreaMutationOutcome> => {
      let outcome: AreaMutationOutcome
      try {
        await op()
        outcome = classifyAreaMutation(null)
      } catch (err) {
        outcome = classifyAreaMutation(err)
      }
      // A success changed the list; a 404 means it's stale. Either way, re-read.
      if (cityId !== null && (outcome.ok || outcome.reason === 'not_found')) void loadAreas(cityId)
      return outcome
    },
    [cityId, loadAreas],
  )

  return {
    cities,
    citiesStatus,
    reloadCities: loadCities,
    cityId,
    selectedCity: cities.find((c) => c.id === cityId) ?? null,
    selectCity: setCityId,

    areas,
    areasStatus,
    reloadAreas: () => (cityId !== null ? loadAreas(cityId) : Promise.resolve()),

    create: (input: { name_ar: string; name_en: string; delivery_fee: number }) =>
      run(() => createArea({ city_id: cityId as number, ...input })),
    update: (id: number, changes: AreaChanges) => run(() => updateArea(id, changes)),
    toggle: (area: Area) => run(() => setAreaStatus(area.id, !area.is_active)),
  }
}
