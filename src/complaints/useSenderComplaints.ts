import { useCallback, useEffect, useState } from 'react'
import { ApiError } from '../api/envelope'
import {
  deleteComplaint,
  getComplaint,
  listSenderComplaints,
  replyToComplaint,
  setComplaintStatus,
} from './complaintsApi'
import { complaintMessages as M } from './messages'
import type { Complaint, ComplaintDetail, ComplaintStatus, ComplaintsScreenStatus } from './types'

export interface UseSenderComplaints {
  status: ComplaintsScreenStatus
  items: Complaint[]
  total: number
  hasMore: boolean
  loadingMore: boolean
  loadMore: () => void
  retry: () => void

  /** The one message expanded to show its thread. */
  expandedId: number | null
  detail: ComplaintDetail | null
  detailStatus: 'idle' | 'loading' | 'error'
  busy: boolean
  toggle: (id: number) => void
  reply: (body: string) => Promise<boolean>
  changeStatus: (next: ComplaintStatus) => Promise<boolean>
  remove: (id: number) => Promise<boolean>
}

/**
 * Everything one person sent (newest first, paged), with one message at a
 * time expanded to its thread for reply / resolve / delete. `onChanged`
 * lets the senders list re-count after any write.
 */
export function useSenderComplaints(
  userId: number,
  { onChanged, showToast }: { onChanged: () => void; showToast: (msg: string) => void },
): UseSenderComplaints {
  const [status, setStatus] = useState<ComplaintsScreenStatus>('loading')
  const [items, setItems] = useState<Complaint[]>([])
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [perPage, setPerPage] = useState(20)
  const [loadingMore, setLoadingMore] = useState(false)

  const [expandedId, setExpandedId] = useState<number | null>(null)
  const [detail, setDetail] = useState<ComplaintDetail | null>(null)
  const [detailStatus, setDetailStatus] = useState<'idle' | 'loading' | 'error'>('idle')
  const [busy, setBusy] = useState(false)

  const loadFirst = useCallback(async () => {
    setStatus('loading')
    try {
      const data = await listSenderComplaints(userId, 1)
      setItems(data.items)
      setPage(1)
      setTotal(data.total)
      setPerPage(data.per_page)
      setStatus('ready')
    } catch {
      setStatus('error')
    }
  }, [userId])

  useEffect(() => {
    setExpandedId(null)
    setDetail(null)
    void loadFirst()
  }, [loadFirst])

  const loadMore = useCallback(async () => {
    setLoadingMore(true)
    try {
      const data = await listSenderComplaints(userId, page + 1)
      setItems((prev) => [...prev, ...data.items.filter((c) => !prev.some((p) => p.id === c.id))])
      setPage(data.page)
      setTotal(data.total)
    } catch {
      showToast(M.retryToast)
    } finally {
      setLoadingMore(false)
    }
  }, [userId, page, showToast])

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

  const toggle = (id: number) => {
    if (expandedId === id) {
      setExpandedId(null)
      setDetail(null)
      setDetailStatus('idle')
      return
    }
    setExpandedId(id)
    void openDetail(id)
  }

  const failToast = (err: unknown) =>
    showToast(err instanceof ApiError && err.status === 404 ? M.notFoundToast : M.retryToast)

  /** Swap the updated message into the list (status may have moved). */
  const applyDetail = (d: ComplaintDetail) => {
    setDetail(d)
    setItems((prev) => prev.map((c) => (c.id === d.id ? { ...c, status: d.status } : c)))
  }

  const reply = async (body: string): Promise<boolean> => {
    if (!detail || body.trim() === '') return false
    setBusy(true)
    try {
      applyDetail(await replyToComplaint(detail.id, body.trim()))
      showToast(M.replySentToast)
      onChanged()
      return true
    } catch (err) {
      failToast(err)
      return false
    } finally {
      setBusy(false)
    }
  }

  const changeStatus = async (next: ComplaintStatus): Promise<boolean> => {
    if (!detail) return false
    setBusy(true)
    try {
      applyDetail(await setComplaintStatus(detail.id, next))
      showToast(M.statusDoneToast)
      onChanged()
      return true
    } catch (err) {
      failToast(err)
      return false
    } finally {
      setBusy(false)
    }
  }

  const remove = async (id: number): Promise<boolean> => {
    setBusy(true)
    try {
      await deleteComplaint(id)
      setItems((prev) => prev.filter((c) => c.id !== id))
      setTotal((t) => Math.max(0, t - 1))
      if (expandedId === id) {
        setExpandedId(null)
        setDetail(null)
      }
      showToast(M.removedToast)
      onChanged()
      return true
    } catch (err) {
      failToast(err)
      return false
    } finally {
      setBusy(false)
    }
  }

  return {
    status,
    items,
    total,
    hasMore: items.length < total && page < Math.ceil(total / Math.max(1, perPage)),
    loadingMore,
    loadMore: () => void loadMore(),
    retry: () => void loadFirst(),
    expandedId,
    detail,
    detailStatus,
    busy,
    toggle,
    reply,
    changeStatus,
    remove,
  }
}
