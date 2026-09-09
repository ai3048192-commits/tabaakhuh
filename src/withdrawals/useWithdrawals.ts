import { useCallback, useEffect, useRef, useState } from 'react'
import {
  approveWithdrawal,
  listWithdrawals,
  markWithdrawalPaid,
  rejectWithdrawal,
} from './withdrawalsApi'
import { classifyActionError } from './outcome'
import { clampPage, totalPages as calcTotalPages } from './pagination'
import type {
  ActionKind,
  ActionOutcome,
  RowStatus,
  StatusFilter,
  Withdrawal,
  WithdrawalPage,
  WithdrawalsStatus,
} from './types'

export interface UseWithdrawals {
  status: WithdrawalsStatus
  page: WithdrawalPage | null
  filter: StatusFilter
  pageNum: number
  totalPages: number
  beyondRange: boolean
  toast: string | null

  rowState: (id: number) => RowStatus
  confirming: { id: number; kind: ActionKind } | null

  setFilter: (next: StatusFilter) => void
  setPage: (n: number) => void
  refresh: () => void
  openConfirm: (id: number, kind: ActionKind) => void
  closeConfirm: (id: number) => void
  approve: (id: number) => Promise<ActionOutcome>
  reject: (id: number) => Promise<ActionOutcome>
  markPaid: (id: number) => Promise<ActionOutcome>
}

/**
 * Owns the withdrawals queue: server-paginated list with a status filter, the
 * per-row confirm/submit state, and the approve/reject/mark-paid runners
 * (FR-001…FR-038). A `401` is handled upstream and never seen here.
 */
export function useWithdrawals(): UseWithdrawals {
  const [filter, setFilterState] = useState<StatusFilter>('pending')
  const [pageNum, setPageNum] = useState(1)
  const [pageData, setPageData] = useState<WithdrawalPage | null>(null)
  const [status, setStatus] = useState<WithdrawalsStatus>('loading')
  const [rowStates, setRowStates] = useState<Map<number, Exclude<RowStatus, 'idle'>>>(new Map())
  const [confirming, setConfirming] = useState<{ id: number; kind: ActionKind } | null>(null)
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
    async (next: { filter: StatusFilter; page: number }) => {
      if (!hasPageRef.current) setStatus('loading')
      try {
        const data = await listWithdrawals(next)
        setPageData(data)
        setStatus('ready')
        return data
      } catch {
        if (hasPageRef.current) {
          setStatus('ready')
          showToast('تعذّر التحديث. حاول مرة أخرى.')
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

  const totalPages = pageData
    ? calcTotalPages(pageData.total, Math.max(1, pageData.per_page))
    : 1
  const beyondRange = pageData != null && pageData.items.length === 0 && pageNum > 1

  const setFilter = useCallback((next: StatusFilter) => {
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

  const setRow = useCallback((id: number, next: RowStatus) => {
    setRowStates((prev) => {
      const m = new Map(prev)
      if (next === 'idle') m.delete(id)
      else m.set(id, next)
      return m
    })
  }, [])

  const rowState = useCallback(
    (id: number): RowStatus =>
      rowStates.get(id) ?? (confirming?.id === id ? 'confirming' : 'idle'),
    [rowStates, confirming],
  )

  const openConfirm = useCallback((id: number, kind: ActionKind) => {
    setConfirming({ id, kind })
  }, [])
  const closeConfirm = useCallback((id: number) => {
    setConfirming((c) => (c?.id === id ? null : c))
    setRow(id, 'idle')
  }, [setRow])

  const runAction = useCallback(
    async (id: number, call: (id: number) => Promise<Withdrawal>): Promise<ActionOutcome> => {
      if (rowStates.get(id) === 'submitting') return { ok: false, reason: 'transient' }
      setRow(id, 'submitting')
      try {
        await call(id)
        setConfirming((c) => (c?.id === id ? null : c))
        const refreshed = await load({ filter, page: pageNum })
        if (refreshed && refreshed.items.length === 0 && pageNum > 1) {
          const pages = calcTotalPages(refreshed.total, Math.max(1, refreshed.per_page))
          setPageNum(clampPage(pageNum, pages))
        }
        setRow(id, 'idle')
        return { ok: true, message: '' }
      } catch (err) {
        const o = classifyActionError(err)
        setConfirming((c) => (c?.id === id ? null : c))
        if (o.reason === 'transient') {
          setRow(id, 'idle')
          return { ok: false, reason: 'transient' }
        }
        // invalid_transition / not_found → reconcile via re-fetch
        await load({ filter, page: pageNum })
        setRow(id, 'idle')
        return o.reason === 'not_found'
          ? { ok: false, reason: 'not_found' }
          : { ok: false, reason: 'invalid_transition', message: o.message }
      }
    },
    [rowStates, setRow, load, filter, pageNum],
  )

  const approve = useCallback((id: number) => runAction(id, approveWithdrawal), [runAction])
  const reject = useCallback((id: number) => runAction(id, rejectWithdrawal), [runAction])
  const markPaid = useCallback((id: number) => runAction(id, markWithdrawalPaid), [runAction])

  return {
    status,
    page: pageData,
    filter,
    pageNum,
    totalPages,
    beyondRange,
    toast,
    rowState,
    confirming,
    setFilter,
    setPage,
    refresh,
    openConfirm,
    closeConfirm,
    approve,
    reject,
    markPaid,
  }
}
