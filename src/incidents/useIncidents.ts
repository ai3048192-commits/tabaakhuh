import { useCallback, useEffect, useRef, useState } from 'react'
import { ApiError } from '../api/envelope'
import { getIncident, listIncidents, replyToIncident, setIncidentStatus } from './incidentsApi'
import type {
  IncidentDetail,
  IncidentsFilters,
  IncidentsPage,
  IncidentsScreenStatus,
  IncidentStatus,
} from './types'

const EMPTY_FILTERS: IncidentsFilters = { status: 'all' }
/** How often the open detail dialog re-polls its thread for new messages from the driver. */
const DETAIL_POLL_MS = 5_000

export interface UseIncidents {
  status: IncidentsScreenStatus
  page: IncidentsPage | null
  filters: IncidentsFilters
  pageNum: number
  totalPages: number
  toast: string | null
  detail: IncidentDetail | null
  detailStatus: 'idle' | 'loading' | 'error'
  busy: boolean

  setStatusFilter: (s: IncidentsFilters['status']) => void
  setPage: (n: number) => void
  refresh: () => void
  openDetail: (id: number) => void
  closeDetail: () => void
  reply: (body: string) => Promise<boolean>
  changeStatus: (next: IncidentStatus) => Promise<boolean>
}

/** Owns the incident-reports list + the open-thread detail (reply / status). Mirrors `useComplaints`. */
export function useIncidents(): UseIncidents {
  const [filters, setFilters] = useState<IncidentsFilters>(EMPTY_FILTERS)
  const [pageNum, setPageNum] = useState(1)
  const [pageData, setPageData] = useState<IncidentsPage | null>(null)
  const [status, setStatus] = useState<IncidentsScreenStatus>('loading')
  const [toast, setToast] = useState<string | null>(null)
  const [detail, setDetail] = useState<IncidentDetail | null>(null)
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
      const data = await listIncidents({ filters, page: pageNum })
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

  const patch = (p: Partial<IncidentsFilters>) => {
    setFilters((f) => ({ ...f, ...p }))
    setPageNum(1)
  }

  const openDetail = useCallback(async (id: number) => {
    setDetail(null)
    setDetailStatus('loading')
    try {
      setDetail(await getIncident(id))
      setDetailStatus('idle')
    } catch {
      setDetailStatus('error')
    }
  }, [])

  // Keeps an admin who leaves the dialog open watching a live conversation —
  // a driver's reply (e.g. "لم يتم الحل") shows up on its own instead of
  // needing a close/reopen. Skipped while a reply/status change is in
  // flight (`busy`) so it never clobbers that request's own optimistic
  // update; a failed tick just retries silently on the next one.
  const busyRef = useRef(busy)
  useEffect(() => {
    busyRef.current = busy
  }, [busy])

  useEffect(() => {
    if (detail == null || detailStatus !== 'idle') return
    const id = detail.id
    const timer = window.setInterval(() => {
      if (busyRef.current) return
      getIncident(id)
        .then((fresh) => setDetail((cur) => (cur && cur.id === id ? fresh : cur)))
        .catch(() => {
          // transient — the next tick tries again
        })
    }, DETAIL_POLL_MS)
    return () => window.clearInterval(timer)
    // Deliberately keyed on the id, not `detail` itself — `detail` is a new
    // object every poll tick, which would otherwise restart this interval
    // on every single tick instead of once per opened ticket.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [detail?.id, detailStatus])

  const reply = useCallback(
    async (body: string): Promise<boolean> => {
      if (!detail || body.trim() === '') return false
      setBusy(true)
      try {
        await replyToIncident(detail.id, body.trim())
        setDetail(await getIncident(detail.id))
        showToast('تم إرسال الرد.')
        void load()
        return true
      } catch (err) {
        showToast(
          err instanceof ApiError && err.status === 404
            ? 'تعذّر العثور على البلاغ.'
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
    async (next: IncidentStatus): Promise<boolean> => {
      if (!detail) return false
      setBusy(true)
      try {
        setDetail(await setIncidentStatus(detail.id, next))
        showToast('تم تحديث حالة البلاغ.')
        void load()
        return true
      } catch (err) {
        showToast(
          err instanceof ApiError && err.status === 404
            ? 'تعذّر العثور على البلاغ.'
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
