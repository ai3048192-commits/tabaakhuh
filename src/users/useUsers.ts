import { useCallback, useEffect, useRef, useState } from 'react'
import { ApiError } from '../api/envelope'
import { deleteUser, listUsers, setUserStatus } from './usersApi'
import { userMessages as M } from './messages'
import type {
  AdminUser,
  UserActionOutcome,
  UsersFilters,
  UsersPage,
  UsersScreenStatus,
  UserStatus,
} from './types'

const EMPTY_FILTERS: UsersFilters = { role: 'all', status: 'all', verified: 'all', q: '' }

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
  deleting: AdminUser | null

  setRole: (r: UsersFilters['role']) => void
  setStatusFilter: (s: UsersFilters['status']) => void
  setVerified: (v: UsersFilters['verified']) => void
  setQuery: (q: string) => void
  setPage: (n: number) => void
  refresh: () => void
  openDetail: (u: AdminUser) => void
  closeDetail: () => void
  askStatus: (u: AdminUser, next: UserStatus) => void
  cancelStatus: () => void
  confirmStatus: (reason?: string) => Promise<UserActionOutcome>
  askDelete: (u: AdminUser) => void
  cancelDelete: () => void
  confirmDelete: () => Promise<void>
}

/**
 * Owns the users list: role/status filters + debounced text search + server
 * pagination, plus the status-change flow. Wired to the PROVISIONAL
 * `/admin/users*` contract.
 */
export function useUsers({ role, approval }: { role?: UsersFilters['role']; approval?: 'approved' } = {}): UseUsers {
  const [filters, setFilters] = useState<UsersFilters>(() => ({ ...EMPTY_FILTERS, role: role ?? 'all' }))
  const [pageNum, setPageNum] = useState(1)
  const [pageData, setPageData] = useState<UsersPage | null>(null)
  const [status, setStatus] = useState<UsersScreenStatus>('loading')
  const [toast, setToast] = useState<string | null>(null)
  const [busyId, setBusyId] = useState<number | null>(null)
  const [detail, setDetail] = useState<AdminUser | null>(null)
  const [confirming, setConfirming] = useState<{ user: AdminUser; next: UserStatus } | null>(null)
  const [deleting, setDeleting] = useState<AdminUser | null>(null)

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
      const data = await listUsers({ filters, page: pageNum, approval })
      // The backend may not filter on `email_verified` yet — enforce it on the page we got.
      const want = filters.verified === 'all' ? null : filters.verified === 'yes'
      setPageData(
        want == null
          ? data
          : { ...data, items: data.items.filter((u) => u.email_verified == null || u.email_verified === want) },
      )
      setStatus('ready')
    } catch {
      if (hasPageRef.current) {
        setStatus('ready')
        showToast('تعذّر التحديث. حاول مرة أخرى.')
      } else {
        setStatus('error')
      }
    }
  }, [filters, pageNum, approval, showToast])

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

  const confirmDelete = useCallback(async () => {
    if (!deleting) return
    const user = deleting
    const name = `${user.first_name} ${user.last_name}`.trim()
    setBusyId(user.id)
    try {
      await deleteUser(user.id)
      setDeleting(null)
      setDetail((d) => (d?.id === user.id ? null : d))
      showToast(M.deletedToast(name))
      await load()
    } catch (err) {
      setDeleting(null)
      if (err instanceof ApiError && err.status === 409) showToast(M.deleteBlockedToast)
      else if (err instanceof ApiError && err.status === 403) showToast(M.deleteForbiddenToast)
      else if (err instanceof ApiError && err.status === 404) {
        showToast(M.notFoundToast)
        await load()
      } else showToast(M.retryToast)
    } finally {
      setBusyId(null)
    }
  }, [deleting, load, showToast])

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
    deleting,
    setRole: (r) => patchFilters({ role: r }),
    setStatusFilter: (s) => patchFilters({ status: s }),
    setVerified: (v) => patchFilters({ verified: v }),
    setQuery: (q) => patchFilters({ q }),
    setPage: (n) => setPageNum(Math.max(1, Math.min(n, Math.max(1, totalPages)))),
    refresh: () => void load(),
    openDetail: setDetail,
    closeDetail: () => setDetail(null),
    askStatus: (user, next) => setConfirming({ user, next }),
    cancelStatus: () => setConfirming(null),
    confirmStatus,
    askDelete: setDeleting,
    cancelDelete: () => setDeleting(null),
    confirmDelete,
  }
}
