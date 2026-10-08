import { useCallback, useEffect, useRef, useState } from 'react'
import { ApiError } from '../api/envelope'
import { clampPage, totalPages as calcTotalPages } from '../withdrawals/pagination'
import { listDeposits, markDepositPaid, rejectDeposit, verifyDeposit } from './depositsApi'
import { depositMessages as M } from './messages'
import type {
  ActionOutcome,
  DepositAction,
  DepositFilter,
  DepositPage,
  DepositsStatus,
} from './types'

export interface UseDeposits {
  status: DepositsStatus
  page: DepositPage | null
  filter: DepositFilter
  pageNum: number
  totalPages: number
  beyondRange: boolean
  toast: string | null
  busyId: number | null
  setFilter: (next: DepositFilter) => void
  setPage: (n: number) => void
  refresh: () => void
  run: (id: number, action: DepositAction, note: string | null) => Promise<ActionOutcome>
}

function classify(err: unknown): ActionOutcome {
  if (err instanceof ApiError) {
    // 409 — someone acted first / the order was cancelled; 422 — the move isn't allowed.
    if (err.status === 409 || err.status === 422) return { ok: false, reason: 'conflict', message: err.message }
    if (err.status === 404) return { ok: false, reason: 'not_found' }
  }
  return { ok: false, reason: 'transient' }
}

/**
 * Owns the deposits queue: the server-paginated list per tab, and the
 * verify / reject / mark-paid runners, which re-fetch the page afterwards so
 * a row that changed status moves to its new tab. A `401` is handled upstream.
 */
export function useDeposits(): UseDeposits {
  const [filter, setFilterState] = useState<DepositFilter>('submitted')
  const [pageNum, setPageNum] = useState(1)
  const [pageData, setPageData] = useState<DepositPage | null>(null)
  const [status, setStatus] = useState<DepositsStatus>('loading')
  const [busyId, setBusyId] = useState<number | null>(null)
  const [toast, setToast] = useState<string | null>(null)

  const hasPageRef = useRef(false)
  useEffect(() => {
    hasPageRef.current = pageData != null
  }, [pageData])

  const showToast = useCallback((msg: string) => {
    setToast(msg)
    window.setTimeout(() => setToast((t) => (t === msg ? null : t)), 6000)
  }, [])

  const load = useCallback(
    async (next: { filter: DepositFilter; page: number }) => {
      if (!hasPageRef.current) setStatus('loading')
      try {
        const data = await listDeposits(next)
        setPageData(data)
        setStatus('ready')
        return data
      } catch {
        if (hasPageRef.current) {
          setStatus('ready')
          showToast(M.refreshFailed)
        } else {
          setStatus('error')
        }
        return null
      }
    },
    [showToast],
  )

  useEffect(() => {
    void load({ filter, page: pageNum })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter, pageNum])

  const totalPages = pageData ? calcTotalPages(pageData.total, Math.max(1, pageData.per_page)) : 1
  const beyondRange = pageData != null && pageData.items.length === 0 && pageNum > 1

  const setFilter = useCallback((next: DepositFilter) => {
    setFilterState(next)
    setPageNum(1)
  }, [])

  const setPage = useCallback(
    (n: number) => setPageNum((cur) => clampPage(n, Math.max(1, totalPages)) || cur),
    [totalPages],
  )

  const refresh = useCallback(() => {
    void load({ filter, page: pageNum })
  }, [load, filter, pageNum])

  const run = useCallback(
    async (id: number, action: DepositAction, note: string | null): Promise<ActionOutcome> => {
      if (busyId !== null) return { ok: false, reason: 'transient' }
      setBusyId(id)
      try {
        if (action === 'verify') await verifyDeposit(id)
        else if (action === 'reject') await rejectDeposit(id, note ?? '')
        else await markDepositPaid(id, note)
        const refreshed = await load({ filter, page: pageNum })
        if (refreshed && refreshed.items.length === 0 && pageNum > 1) {
          setPageNum(clampPage(pageNum, calcTotalPages(refreshed.total, Math.max(1, refreshed.per_page))))
        }
        return { ok: true }
      } catch (err) {
        const o = classify(err)
        if (!o.ok && o.reason !== 'transient') await load({ filter, page: pageNum })
        return o
      } finally {
        setBusyId(null)
      }
    },
    [busyId, load, filter, pageNum],
  )

  return { status, page: pageData, filter, pageNum, totalPages, beyondRange, toast, busyId, setFilter, setPage, refresh, run }
}
