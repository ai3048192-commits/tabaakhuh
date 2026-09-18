import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  __resetCityDirectory,
  createCity,
  listCities,
  setCityStatus,
} from './citiesApi'
import { filterCities } from './citySearch'
import { buildRows } from './governorateSelection'
import type { GovernorateAction, GovernorateRow } from './governorateSelection'
import { matchKey } from './governorates'
import { cityMessages as M } from './messages'
import { classifyMutation } from './mutationOutcome'
import type {
  CitiesStatus,
  City,
  CityMutationOutcome,
  DialogState,
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
  /** Every governorate — catalogue plus live extras — for the picker dialog. */
  governorateRows: GovernorateRow[]
  rowState: (id: number) => RowState
  refresh: () => void
  setSearch: (term: string) => void
  openPicker: () => void
  openPickerAt: (city: City) => void
  openToggle: (city: City) => void
  closeDialog: () => void
  /** Apply the picker's create/enable/disable actions, in order. */
  applyPlan: (plan: GovernorateAction[]) => Promise<CityMutationOutcome>
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

  const openPicker = useCallback(() => setDialog({ kind: 'picker', busy: false }), [])
  const openPickerAt = useCallback(
    (city: City) => setDialog({ kind: 'picker', focusKey: matchKey(city), busy: false }),
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

  const setFormError = useCallback((message: string) => {
    setDialog((d) => {
      if (!d) return d
      if (d.kind === 'picker') return { ...d, busy: false, progress: undefined, formError: message }
      return { ...d, busy: false, formError: message }
    })
  }, [])

  const runMutation = useCallback(
    async (call: () => Promise<City>, rowId?: number): Promise<CityMutationOutcome> => {
      // Clear any prior server error so a re-submit shows a fresh one.
      setDialog((d) => (d ? { ...d, busy: true, formError: undefined } : d))
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
          setFormError(outcome.message)
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
    [closeDialog, load, setBusy, setFormError, setRow],
  )

  /**
   * Run the picker's plan sequentially, reporting progress as it goes. A failed
   * action stops the run: the dialog stays open showing how far it got, the
   * list is re-fetched so the applied changes are visible, and the admin's
   * un-applied ticks are still in the picker for a retry.
   */
  const applyPlan = useCallback(
    async (plan: GovernorateAction[]): Promise<CityMutationOutcome> => {
      if (plan.length === 0) return { ok: true, message: '' }
      setDialog((d) =>
        d ? { ...d, busy: true, formError: undefined, progress: { done: 0, total: plan.length } } : d,
      )
      for (let i = 0; i < plan.length; i++) {
        const action = plan[i]
        try {
          if (action.op === 'create') {
            await createCity({ name_ar: action.name_ar, name_en: action.name_en })
          } else {
            await setCityStatus(action.city.id, action.op === 'enable')
          }
        } catch (err) {
          const outcome = classifyMutation(err)
          if (outcome.ok) continue
          // Whatever landed before the failure is real — show it.
          void load()
          __resetCityDirectory()
          if (outcome.reason === 'not_found') {
            // The city vanished server-side; the re-fetch above resolves it.
            continue
          }
          setFormError(M.pickerPartialError)
          return outcome
        }
        setDialog((d) =>
          d?.kind === 'picker' ? { ...d, progress: { done: i + 1, total: plan.length } } : d,
        )
      }
      closeDialog()
      void load()
      __resetCityDirectory()
      return { ok: true, message: '' }
    },
    [closeDialog, load, setFormError],
  )

  const toggleStatus = useCallback(
    (city: City) => runMutation(() => setCityStatus(city.id, !city.is_active), city.id),
    [runMutation],
  )

  const cities = useMemo(() => filterCities(allCities, search), [allCities, search])
  const governorateRows = useMemo(() => buildRows(allCities), [allCities])
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
    governorateRows,
    rowState,
    refresh: load,
    setSearch,
    openPicker,
    openPickerAt,
    openToggle,
    closeDialog,
    applyPlan,
    toggleStatus,
  }
}
