import { useCallback, useEffect, useRef, useState } from 'react'
import { clampPage, totalPages as calcTotalPages } from '../withdrawals/pagination'
import { listDeposits } from './depositsApi'
import { depositMessages as M } from './messages'
import type { DepositPage, DepositsStatus } from './types'

export interface UseDeposits {
  status: DepositsStatus
  page: DepositPage | null
  pageNum: number
  totalPages: number
  beyondRange: boolean
  toast: string | null
  setPage: (n: number) => void
  refresh: () => void
}

/**
 * Owns the deposits monitoring list: the server-paginated deposits, newest
 * first. Read-only — there are no actions. A `401` is handled upstream.
 */
export function useDeposits(): UseDeposits {
  const [pageNum, setPageNum] = useState(1)
  const [pageData, setPageData] = useState<DepositPage | null>(null)
  const [status, setStatus] = useState<DepositsStatus>('loading')
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
    async (page: number) => {
      if (!hasPageRef.current) setStatus('loading')
      try {
        const data = await listDeposits(page)
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
    void load(pageNum)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pageNum])

  const totalPages = pageData ? calcTotalPages(pageData.total, Math.max(1, pageData.per_page)) : 1
  const beyondRange = pageData != null && pageData.items.length === 0 && pageNum > 1

  const setPage = useCallback(
    (n: number) => setPageNum((cur) => clampPage(n, Math.max(1, totalPages)) || cur),
    [totalPages],
  )

  const refresh = useCallback(() => {
    void load(pageNum)
  }, [load, pageNum])

  return { status, page: pageData, pageNum, totalPages, beyondRange, toast, setPage, refresh }
}
