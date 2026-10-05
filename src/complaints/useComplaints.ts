import { useCallback, useEffect, useRef, useState } from 'react'
import { listSenders } from './complaintsApi'
import { complaintMessages as M } from './messages'
import type {
  ComplaintSender,
  ComplaintsFilters,
  ComplaintsScreenStatus,
  SendersPage,
} from './types'

const EMPTY_FILTERS: ComplaintsFilters = { type: 'all', status: 'all', role: 'all' }

export interface UseComplaints {
  status: ComplaintsScreenStatus
  page: SendersPage | null
  filters: ComplaintsFilters
  totalPages: number
  toast: string | null
  /** The sender whose messages are open in the side panel. */
  selected: ComplaintSender | null

  setType: (t: ComplaintsFilters['type']) => void
  setStatusFilter: (s: ComplaintsFilters['status']) => void
  setRole: (r: ComplaintsFilters['role']) => void
  setPage: (n: number) => void
  refresh: () => void
  openSender: (s: ComplaintSender) => void
  closeSender: () => void
  showToast: (msg: string) => void
}

/** Owns the by-sender list (filters + paging), the open sender and the toast. */
export function useComplaints(): UseComplaints {
  const [filters, setFilters] = useState<ComplaintsFilters>(EMPTY_FILTERS)
  const [pageNum, setPageNum] = useState(1)
  const [pageData, setPageData] = useState<SendersPage | null>(null)
  const [status, setStatus] = useState<ComplaintsScreenStatus>('loading')
  const [toast, setToast] = useState<string | null>(null)
  const [selected, setSelected] = useState<ComplaintSender | null>(null)

  const hasPageRef = useRef(false)
  useEffect(() => {
    hasPageRef.current = pageData != null
  }, [pageData])

  const showToast = useCallback((msg: string) => {
    setToast(msg)
    window.setTimeout(() => setToast((t) => (t === msg ? null : t)), 6000)
  }, [])

  const load = useCallback(async () => {
    if (!hasPageRef.current) setStatus('loading')
    try {
      const data = await listSenders({ filters, page: pageNum })
      setPageData(data)
      setStatus('ready')
    } catch {
      if (hasPageRef.current) {
        setStatus('ready')
        showToast(M.refreshFailedToast)
      } else {
        setStatus('error')
      }
    }
  }, [filters, pageNum, showToast])

  useEffect(() => {
    void load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters, pageNum])

  const totalPages = pageData
    ? Math.max(1, Math.ceil(pageData.total / Math.max(1, pageData.per_page)))
    : 1

  const patch = (p: Partial<ComplaintsFilters>) => {
    setFilters((f) => ({ ...f, ...p }))
    setPageNum(1)
  }

  return {
    status,
    page: pageData,
    filters,
    totalPages,
    toast,
    selected,
    setType: (t) => patch({ type: t }),
    setStatusFilter: (s) => patch({ status: s }),
    setRole: (r) => patch({ role: r }),
    setPage: (n) => setPageNum(Math.max(1, Math.min(n, Math.max(1, totalPages)))),
    refresh: () => void load(),
    openSender: setSelected,
    closeSender: () => setSelected(null),
    showToast,
  }
}
