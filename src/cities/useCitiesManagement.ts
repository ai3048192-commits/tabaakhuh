import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  __resetCityDirectory,
  createCity,
  listCities,
  setCityStatus,
  updateCity,
} from './citiesApi'
import { filterCities } from './citySearch'
import { classifyMutation } from './mutationOutcome'
import type {
  CitiesStatus,
  City,
  CityMutationOutcome,
  CityNamePatch,
  DialogState,
  NameErrors,
  NewCityInput,
  RowState,
} from './types'

export interface UseCitiesManagement {
  status: CitiesStatus
  /** `filterCities(allCities, search)` — the rows to render. */
  cities: City[]
  /** `allCities.length` — for the subtitle and AT announcements. */
  totalCount: number
  search: string
  noCities: boolean
  noMatch: boolean
  dialog: DialogState
  rowState: (id: number) => RowState
  refresh: () => void
  setSearch: (term: string) => void
  openAdd: () => void
  openEdit: (city: City) => void
  openToggle: (city: City) => void
  closeDialog: () => void
  create: (input: NewCityInput) => Promise<CityMutationOutcome>
  update: (id: number, patch: CityNamePatch) => Promise<CityMutationOutcome>
  toggleStatus: (city: City) => Promise<CityMutationOutcome>
}

/**
 * Owns the cities-management screen state: the full list, the search term, the
 * one open dialog, per-row toggle state, and the create/edit/toggle outcome
 * handling (FR-001…FR-034). A `401` on any call is handled upstream by the
 * shared unauthorized handler (FR-035) and never seen here.
 */
export function useCitiesManagement(): UseCitiesManagement {
  const [allCities, setAllCities] = useState<City[]>([])
  const [status, setStatus] = useState<CitiesStatus>('loading')
  const [search, setSearch] = useState('')
  const [rowStates, setRowStates] = useState<Map<number, RowState>>(new Map())
  const [dialog, setDialog] = useState<DialogState>(null)

  const load = useCallback(async () => {
    setStatus((s) => (s === 'ready' ? s : 'loading'))
    try {
      const list = await listCities()
      setAllCities(list)
      setStatus('ready')
    } catch {
      // A failed first load shows the screen error; a failed reload with a list
      // already on screen keeps it (mirrors the review screens).
      setStatus((s) => (s === 'ready' ? s : 'error'))
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const setRow = useCallback((id: number, next: RowState) => {
    setRowStates((prev) => {
      const m = new Map(prev)
      if (next === 'idle') m.delete(id)
      else m.set(id, next)
      return m
    })
  }, [])

  const rowState = useCallback(
    (id: number): RowState => rowStates.get(id) ?? 'idle',
    [rowStates],
  )

  const openAdd = useCallback(
    () => setDialog({ kind: 'add', busy: false, serverErrors: {} }),
    [],
  )
  const openEdit = useCallback(
    (city: City) => setDialog({ kind: 'edit', city, busy: false, serverErrors: {} }),
    [],
  )
  const openToggle = useCallback(
    (city: City) => setDialog({ kind: 'toggle', city, busy: false }),
    [],
  )
  const closeDialog = useCallback(() => {
    setDialog(null)
    // Only ever one action in flight; clearing all row states is safe.
    setRowStates((prev) => (prev.size === 0 ? prev : new Map()))
  }, [])

  const setBusy = useCallback((busy: boolean) => {
    setDialog((d) => (d ? { ...d, busy } : d))
  }, [])

  const setServerErrors = useCallback((errors: NameErrors, formMessage: string) => {
    setDialog((d) => {
      if (!d) return d
      if (d.kind === 'toggle') return { ...d, busy: false, formError: errors.form ?? formMessage }
      return {
        ...d,
        busy: false,
        serverErrors: Object.keys(errors).length > 0 ? errors : { form: formMessage },
      }
    })
  }, [])

  const runMutation = useCallback(
    async (call: () => Promise<City>, rowId?: number): Promise<CityMutationOutcome> => {
      // Clear any prior server errors so a re-submit shows fresh ones.
      setDialog((d) => {
        if (!d) return d
        if (d.kind === 'toggle') return { ...d, busy: true, formError: undefined }
        return { ...d, busy: true, serverErrors: {} }
      })
      if (rowId !== undefined) setRow(rowId, 'submitting')
      try {
        await call()
        const outcome = classifyMutation(null)
        closeDialog()
        void load()
        __resetCityDirectory()
        return outcome
      } catch (err) {
        const outcome = classifyMutation(err)
        if (outcome.ok) {
          closeDialog()
          void load()
          __resetCityDirectory()
          return outcome
        }
        if (outcome.reason === 'validation') {
          setServerErrors(outcome.fieldErrors ?? {}, outcome.message)
          if (rowId !== undefined) setRow(rowId, 'idle')
          return outcome
        }
        if (outcome.reason === 'not_found') {
          closeDialog()
          void load()
          __resetCityDirectory()
          return outcome
        }
        // transient — leave the dialog open with its values; no re-fetch.
        setBusy(false)
        if (rowId !== undefined) setRow(rowId, 'idle')
        return outcome
      }
    },
    [closeDialog, load, setBusy, setRow, setServerErrors],
  )

  const create = useCallback(
    (input: NewCityInput) => runMutation(() => createCity(input)),
    [runMutation],
  )
  const update = useCallback(
    (id: number, patch: CityNamePatch) => runMutation(() => updateCity(id, patch)),
    [runMutation],
  )
  const toggleStatus = useCallback(
    (city: City) => runMutation(() => setCityStatus(city.id, !city.is_active), city.id),
    [runMutation],
  )

  const cities = useMemo(() => filterCities(allCities, search), [allCities, search])
  const noCities = status === 'ready' && allCities.length === 0
  const noMatch = status === 'ready' && allCities.length > 0 && cities.length === 0

  return {
    status,
    cities,
    totalCount: allCities.length,
    search,
    noCities,
    noMatch,
    dialog,
    rowState,
    refresh: load,
    setSearch,
    openAdd,
    openEdit,
    openToggle,
    closeDialog,
    create,
    update,
    toggleStatus,
  }
}
