import { useCallback, useEffect, useRef, useState } from 'react'
import { ApiError } from '../api/envelope'
import {
  getComplaint,
  listComplaints,
  replyToComplaint,
  setComplaintStatus,
} from './complaintsApi'
import type {
  ComplaintDetail,
  ComplaintsFilters,
  ComplaintsPage,
  ComplaintsScreenStatus,
  ComplaintStatus,
} from './types'

const EMPTY_FILTERS: ComplaintsFilters = { type: 'all', status: 'all' }

export interface UseComplaints {
  status: ComplaintsScreenStatus
  page: ComplaintsPage | null
  filters: ComplaintsFilters
  pageNum: number
  totalPages: number
  toast: string | null
  detail: ComplaintDetail | null
  detailStatus: 'idle' | 'loading' | 'error'
  busy: boolean

  setType: (t: ComplaintsFilters['type']) => void
  setStatusFilter: (s: ComplaintsFilters['status']) => void
  setPage: (n: number) => void
  refresh: () => void
  openDetail: (id: number) => void
  closeDetail: () => void
  reply: (body: string) => Promise<boolean>
  changeStatus: (next: ComplaintStatus) => Promise<boolean>
}

/** Owns the complaints list + the open-thread detail (reply / resolve). Provisional contract. */
export function useComplaints(): UseComplaints {
  const [filters, setFilters] = useState<ComplaintsFilters>(EMPTY_FILTERS)
  const [pageNum, setPageNum] = useState(1)
  const [pageData, setPageData] = useState<ComplaintsPage | null>(null)
  const [status, setStatus] = useState<ComplaintsScreenStatus>('loading')
  const [toast, setToast] = useState<string | null>(null)
  const [detail, setDetail] = useState<ComplaintDetail | null>(null)
  const [detailStatus, setDetailStatus] = useState<'idle' | 'loading' | 'error'>('idle')
  const [busy, setBusy] = useState(false)

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
      const data = await listComplaints({ filters, page: pageNum })
      setPageData(data)
      setStatus('ready')
    } catch {
      if (hasPageRef.current) {
        setStatus('ready')
        showToast('تعذّر التحديث. حاول مرة أخرى.')
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

  const openDetail = useCallback(async (id: number) => {
    setDetail(null)
    setDetailStatus('loading')
    try {
      setDetail(await getComplaint(id))
      setDetailStatus('idle')
    } catch {
      setDetailStatus('error')
    }
  }, [])

  const reply = useCallback(
    async (body: string): Promise<boolean> => {
      if (!detail || body.trim() === '') return false
      setBusy(true)
      try {
        setDetail(await replyToComplaint(detail.id, body.trim()))
        showToast('تم إرسال الرد.')
        void load()
        return true
      } catch (err) {
        showToast(
          err instanceof ApiError && err.status === 404
            ? 'تعذّر العثور على الرسالة.'
            : 'تعذّر إتمام العملية. حاول مرة أخرى.',
        )
        return false
      } finally {
        setBusy(false)
      }
    },
    [detail, load, showToast],
  )

  const changeStatus = useCallback(
    async (next: ComplaintStatus): Promise<boolean> => {
      if (!detail) return false
      setBusy(true)
      try {
        setDetail(await setComplaintStatus(detail.id, next))
        showToast('تم تحديث حالة الرسالة.')
        void load()
        return true
      } catch (err) {
        showToast(
          err instanceof ApiError && err.status === 404
            ? 'تعذّر العثور على الرسالة.'
            : 'تعذّر إتمام العملية. حاول مرة أخرى.',
        )
        return false
      } finally {
        setBusy(false)
      }
    },
    [detail, load, showToast],
  )

  return {
    status,
    page: pageData,
    filters,
    pageNum,
    totalPages,
    toast,
    detail,
    detailStatus,
    busy,
    setType: (t) => patch({ type: t }),
    setStatusFilter: (s) => patch({ status: s }),
    setPage: (n) => setPageNum(Math.max(1, Math.min(n, Math.max(1, totalPages)))),
    refresh: () => void load(),
    openDetail: (id) => void openDetail(id),
    closeDetail: () => {
      setDetail(null)
      setDetailStatus('idle')
    },
    reply,
    changeStatus,
  }
}
