import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { ApiError } from '../api/envelope'
import { listOrders } from './ordersApi'
import { validateDateRange } from './ordersQuery'
import { filtersFromSearchParams, filtersToSearchParams, defaultFrom } from './urlState'
import { isDefaultOrWiderRange } from './cairoDates'
import type {
  DateRangeError,
  DetailState,
  EmptyKind,
  Order,
  OrderFieldError,
  OrderFilters,
  OrderPage,
  OrderStatus,
  OrdersStatus,
} from './types'

/** Auto-refresh cadence for the "monitoring" view (dashboard-side, not backend-driven). */
export const AUTO_REFRESH_MS = 30_000

export interface UseOrdersOversight {
  status: OrdersStatus
  page: OrderPage | null
  filters: OrderFilters
  pageNumber: number
  totalPages: number
  emptyKind: EmptyKind
  fieldError: OrderFieldError
  draftFrom: string | null
  draftTo: string | null
  dateFieldError: DateRangeError
  autoRefreshOn: boolean
  detail: DetailState
  toast: string | null

  refresh: () => void
  setStatusFilter: (s: OrderStatus | 'all') => void
  setCityFilter: (id: number | null) => void
  setDraftFrom: (v: string | null) => void
  setDraftTo: (v: string | null) => void
  applyRange: () => void
  resetFilters: () => void
  goToPage: (n: number) => void
  firstPage: () => void
  prevPage: () => void
  nextPage: () => void
  setAutoRefresh: (on: boolean) => void
  openDetail: (order: Order) => void
  closeDetail: () => void
}

/**
 * Owns the Orders Oversight screen: URL-derived filters + page, one server page
 * held in memory, the order-detail snapshot, and the conditional auto-refresh
 * (FR-001…FR-036). A `401` on the list call is handled upstream by the shared
 * unauthorized handler (FR-029) and never seen here. Read-only — no mutations.
 */
export function useOrdersOversight(): UseOrdersOversight {
  const [searchParams, setSearchParams] = useSearchParams()
  const { filters, page } = useMemo(
    () => filtersFromSearchParams(searchParams),
    [searchParams],
  )

  const [pageData, setPageData] = useState<OrderPage | null>(null)
  const [status, setStatus] = useState<OrdersStatus>('loading')
  const [fieldError, setFieldError] = useState<OrderFieldError>({})
  const [detail, setDetail] = useState<DetailState>(null)
  const [toast, setToast] = useState<string | null>(null)
  const [autoRefreshOn, setAutoRefreshOn] = useState(true)

  const [draftFrom, setDraftFrom] = useState<string | null>(filters.from)
  const [draftTo, setDraftTo] = useState<string | null>(filters.to)
  const [dateFieldError, setDateFieldError] = useState<DateRangeError>(null)

  // Re-sync the date drafts whenever the committed URL range changes.
  const lastRange = useRef<string>('')
  useEffect(() => {
    const key = `${filters.from ?? ''}|${filters.to ?? ''}`
    if (key !== lastRange.current) {
      lastRange.current = key
      setDraftFrom(filters.from)
      setDraftTo(filters.to)
      setDateFieldError(null)
    }
  }, [filters.from, filters.to])

  const hasPageRef = useRef(false)
  useEffect(() => {
    hasPageRef.current = pageData != null
  }, [pageData])

  const showToast = useCallback((msg: string) => {
    setToast(msg)
    window.setTimeout(() => setToast((t) => (t === msg ? null : t)), 6000)
  }, [])

  const load = useCallback(
    async (opts: { silent?: boolean } = {}) => {
      if (!opts.silent && !hasPageRef.current) setStatus('loading')
      try {
        const data = await listOrders({ filters, page })
        setPageData(data)
        setFieldError({})
        setStatus('ready')
      } catch (err) {
        if (err instanceof ApiError && err.status === 422) {
          const fe = err.fieldErrors ?? {}
          const mapped: OrderFieldError = {}
          if (fe.status?.length) mapped.status = fe.status[0]
          if (fe.city_id?.length) mapped.city = fe.city_id[0]
          if (fe.placed_from?.length) mapped.from = fe.placed_from[0]
          if (fe.placed_to?.length) mapped.to = fe.placed_to[0]
          if (Object.keys(mapped).length > 0) {
            setFieldError(mapped)
          } else {
            showToast(err.message)
          }
          // FR-015 / FR-031: do NOT replace the current results for an invalid filter.
          if (hasPageRef.current) setStatus('ready')
          else setStatus('error')
          return
        }
        // 0 (network) / >= 500 / unexpected → transient
        if (hasPageRef.current) {
          setStatus('ready')
          showToast('تعذّر التحديث. حاول مرة أخرى.')
        } else {
          setStatus('error')
        }
      }
    },
    [filters, page, showToast],
  )

  useEffect(() => {
    void load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams])

  // Conditional auto-refresh (FR-009a): page 1 + default-or-wider range + not off.
  useEffect(() => {
    const eligible =
      page === 1 && isDefaultOrWiderRange(filters.from, filters.to) && autoRefreshOn
    if (!eligible) return
    const id = window.setInterval(() => {
      void load({ silent: true })
    }, AUTO_REFRESH_MS)
    return () => window.clearInterval(id)
  }, [page, filters.from, filters.to, autoRefreshOn, load])

  const totalPages = pageData
    ? Math.max(1, Math.ceil(pageData.total / Math.max(1, pageData.per_page)))
    : 1

  const emptyKind: EmptyKind = useMemo(() => {
    if (status !== 'ready' || !pageData || pageData.items.length > 0) return 'none'
    if (page > 1) return 'beyond-range'
    const unfiltered =
      filters.status === 'all' &&
      filters.cityId == null &&
      isDefaultOrWiderRange(filters.from, filters.to)
    return unfiltered ? 'unfiltered' : 'filtered'
  }, [status, pageData, page, filters])

  const writeUrl = useCallback(
    (next: OrderFilters, nextPage: number, replace: boolean) => {
      setSearchParams(filtersToSearchParams(next, nextPage), { replace })
    },
    [setSearchParams],
  )

  const setStatusFilter = useCallback(
    (s: OrderStatus | 'all') => writeUrl({ ...filters, status: s }, 1, true),
    [filters, writeUrl],
  )
  const setCityFilter = useCallback(
    (id: number | null) => writeUrl({ ...filters, cityId: id }, 1, true),
    [filters, writeUrl],
  )
  const applyRange = useCallback(() => {
    const err = validateDateRange(draftFrom, draftTo)
    if (err) {
      setDateFieldError(err)
      return
    }
    setDateFieldError(null)
    writeUrl({ ...filters, from: draftFrom, to: draftTo }, 1, true)
  }, [draftFrom, draftTo, filters, writeUrl])
  const resetFilters = useCallback(() => {
    writeUrl({ status: 'all', cityId: null, from: defaultFrom(), to: null }, 1, true)
  }, [writeUrl])

  const goToPage = useCallback(
    (n: number) => writeUrl(filters, Math.max(1, n), false),
    [filters, writeUrl],
  )
  const firstPage = useCallback(() => goToPage(1), [goToPage])
  const prevPage = useCallback(() => goToPage(page - 1), [goToPage, page])
  const nextPage = useCallback(() => goToPage(page + 1), [goToPage, page])

  const openDetail = useCallback((order: Order) => setDetail({ order }), [])
  const closeDetail = useCallback(() => setDetail(null), [])

  return {
    status,
    page: pageData,
    filters,
    pageNumber: page,
    totalPages,
    emptyKind,
    fieldError,
    draftFrom,
    draftTo,
    dateFieldError,
    autoRefreshOn,
    detail,
    toast,
    refresh: () => void load(),
    setStatusFilter,
    setCityFilter,
    setDraftFrom,
    setDraftTo,
    applyRange,
    resetFilters,
    goToPage,
    firstPage,
    prevPage,
    nextPage,
    setAutoRefresh: setAutoRefreshOn,
    openDetail,
    closeDetail,
  }
}
