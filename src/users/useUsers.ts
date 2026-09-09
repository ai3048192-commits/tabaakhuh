import { useCallback, useEffect, useRef, useState } from 'react'
import { ApiError } from '../api/envelope'
import { listUsers, setUserStatus } from './usersApi'
import type {
  AdminUser,
  UserActionOutcome,
  UsersFilters,
  UsersPage,
  UsersScreenStatus,
  UserStatus,
} from './types'

const EMPTY_FILTERS: UsersFilters = { role: 'all', status: 'all', q: '' }

export interface UseUsers {
  status: UsersScreenStatus
  page: UsersPage | null
  filters: UsersFilters
  pageNum: number
  totalPages: number
  toast: string | null
  busyId: number | null
  detail: AdminUser | null
  confirming: { user: AdminUser; next: UserStatus } | null

  setRole: (r: UsersFilters['role']) => void
  setStatusFilter: (s: UsersFilters['status']) => void
  setQuery: (q: string) => void
  setPage: (n: number) => void
  refresh: () => void
  openDetail: (u: AdminUser) => void
  closeDetail: () => void
  askStatus: (u: AdminUser, next: UserStatus) => void
  cancelStatus: () => void
  confirmStatus: (reason?: string) => Promise<UserActionOutcome>
}

/**
 * Owns the users list: role/status filters + debounced text search + server
 * pagination, plus the status-change flow. Wired to the PROVISIONAL
 * `/admin/users*` contract.
 */
export function useUsers(): UseUsers {
  const [filters, setFilters] = useState<UsersFilters>(EMPTY_FILTERS)
  const [pageNum, setPageNum] = useState(1)
  const [pageData, setPageData] = useState<UsersPage | null>(null)
  const [status, setStatus] = useState<UsersScreenStatus>('loading')
  const [toast, setToast] = useState<string | null>(null)
  const [busyId, setBusyId] = useState<number | null>(null)
  const [detail, setDetail] = useState<AdminUser | null>(null)
  const [confirming, setConfirming] = useState<{ user: AdminUser; next: UserStatus } | null>(null)

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
      const data = await listUsers({ filters, page: pageNum })
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

  // Debounce the search term; role/status apply immediately.
  const debounced = useRef<number | undefined>(undefined)
  useEffect(() => {
    window.clearTimeout(debounced.current)
    debounced.current = window.setTimeout(() => void load(), filters.q ? 300 : 0)
    return () => window.clearTimeout(debounced.current)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters, pageNum])

  const totalPages = pageData
    ? Math.max(1, Math.ceil(pageData.total / Math.max(1, pageData.per_page)))
    : 1

  const patchFilters = (p: Partial<UsersFilters>) => {
    setFilters((f) => ({ ...f, ...p }))
    setPageNum(1)
  }

  const confirmStatus = useCallback(async (reason?: string): Promise<UserActionOutcome> => {
    if (!confirming) return { ok: false, reason: 'transient' }
    const { user, next } = confirming
    setBusyId(user.id)
    try {
      await setUserStatus(user.id, next, reason)
      setConfirming(null)
      showToast('تم تحديث حالة المستخدم.')
      await load()
      setBusyId(null)
      return { ok: true }
    } catch (err) {
      setConfirming(null)
      setBusyId(null)
      if (err instanceof ApiError && err.status === 404) {
        showToast('تعذّر العثور على المستخدم.')
        await load()
        return { ok: false, reason: 'not_found' }
      }
      showToast('تعذّر إتمام العملية. حاول مرة أخرى.')
      return { ok: false, reason: 'transient' }
    }
  }, [confirming, load, showToast])

  return {
    status,
    page: pageData,
    filters,
    pageNum,
    totalPages,
    toast,
    busyId,
    detail,
    confirming,
    setRole: (r) => patchFilters({ role: r }),
    setStatusFilter: (s) => patchFilters({ status: s }),
    setQuery: (q) => patchFilters({ q }),
    setPage: (n) => setPageNum(Math.max(1, Math.min(n, Math.max(1, totalPages)))),
    refresh: () => void load(),
    openDetail: setDetail,
    closeDetail: () => setDetail(null),
    askStatus: (user, next) => setConfirming({ user, next }),
    cancelStatus: () => setConfirming(null),
    confirmStatus,
  }
}
