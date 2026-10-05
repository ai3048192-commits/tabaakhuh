import { useCallback, useEffect, useRef, useState } from 'react'
import { RefreshCw, ChevronRight, ChevronLeft } from 'lucide-react'
import { useAuth } from '../auth/AuthContext'
import { displayName } from '../auth/types'
import IssueWarningDialog from '../warnings/IssueWarningDialog'
import { warningMessages as WM } from '../warnings/messages'
import { fullName } from '../warnings/warningDocument'
import type { AdminUser } from './types'
import { useUsers } from './useUsers'
import UsersFilters from './UsersFilters'
import UsersTable from './UsersTable'
import UserDetailDialog from './UserDetailDialog'
import StatusChangeDialog from './StatusChangeDialog'
import { userMessages as M } from './messages'
import PageHeader from '../shared/PageHeader'
import { bannerBtnLight } from '../shared/ui'

/** `/users` — user directory: filter by role/status, search, paginate, view, change status. */
export default function UsersPage() {
  const q = useUsers()
  const { account } = useAuth()
  const filtered = q.filters.role !== 'all' || q.filters.status !== 'all' || q.filters.q.trim() !== ''
  const items = q.page?.items ?? []

  // Warnings are generated entirely client-side (no backend record), so their
  // dialog and toast live here rather than in `useUsers`.
  const [warning, setWarning] = useState<AdminUser | null>(null)
  const [warnToast, setWarnToast] = useState<string | null>(null)
  const toastTimer = useRef<number | undefined>(undefined)
  const flash = useCallback((msg: string) => {
    setWarnToast(msg)
    window.clearTimeout(toastTimer.current)
    toastTimer.current = window.setTimeout(() => setWarnToast(null), 6000)
  }, [])
  useEffect(() => () => window.clearTimeout(toastTimer.current), [])
  const toast = warnToast ?? q.toast

  return (
    <div className="min-h-full bg-[#f7f1e6] p-4 font-['Tajawal'] md:p-8" dir="rtl">
      <PageHeader
        title={M.pageTitle}
        subtitle={M.subtitle}
        actions={q.status === 'ready' && (
          <button type="button" onClick={q.refresh} className={bannerBtnLight}>
            <RefreshCw size={14} aria-hidden="true" />
            {M.refresh}
          </button>
        )}
      />

      <UsersFilters filters={q.filters} onRole={q.setRole} onStatus={q.setStatusFilter} onQuery={q.setQuery} />

      {q.status === 'loading' && <p className="text-sm text-gray-500">{M.loading}</p>}

      {q.status === 'error' && (
        <div className="max-w-md rounded-3xl border border-red-100 bg-red-50 p-6 text-center">
          <p className="mb-3 text-sm text-red-700">{M.listError}</p>
          <button type="button" onClick={q.refresh} className="rounded-xl bg-[#7a0d0d] px-4 py-2.5 text-sm font-black text-white shadow-sm transition hover:bg-[#5a0909]">{M.retry}</button>
        </div>
      )}

      {q.status === 'ready' && items.length === 0 && (
        <p className="rounded-3xl bg-white shadow-[0_18px_40px_-30px_rgba(122,13,13,0.45)] ring-1 ring-[#efe3cc] p-10 text-center text-sm font-bold text-gray-400">
          {filtered ? M.emptyFiltered : M.empty}
        </p>
      )}

      {q.status === 'ready' && items.length > 0 && q.page && (
        <>
          <UsersTable items={items} busyId={q.busyId} currentUserId={account?.id ?? null} onView={q.openDetail} onStatus={q.askStatus} onWarn={setWarning} />
          <nav className="mt-4 flex items-center justify-between gap-3" aria-label={`صفحة ${q.page.page} من ${q.totalPages}`}>
            <p className="text-xs font-bold text-gray-500" dir="rtl">
              صفحة {q.page.page} من {q.totalPages} · {q.page.total} مستخدم
            </p>
            <div className="flex items-center gap-2">
              <button type="button" aria-label="الصفحة السابقة" disabled={q.page.page <= 1} onClick={() => q.setPage(q.page!.page - 1)} className="inline-flex items-center gap-1 rounded-xl border border-[#e8dcc4] bg-white px-3.5 py-2 text-xs font-black text-gray-700 transition hover:bg-[#faf3e7] disabled:opacity-40">
                <ChevronRight size={14} aria-hidden="true" /> السابق
              </button>
              <button type="button" aria-label="الصفحة التالية" disabled={q.page.page >= q.totalPages} onClick={() => q.setPage(q.page!.page + 1)} className="inline-flex items-center gap-1 rounded-xl border border-[#e8dcc4] bg-white px-3.5 py-2 text-xs font-black text-gray-700 transition hover:bg-[#faf3e7] disabled:opacity-40">
                التالي <ChevronLeft size={14} aria-hidden="true" />
              </button>
            </div>
          </nav>
        </>
      )}

      <div aria-live="polite" role="status" className="sr-only">{toast}</div>
      {toast && (
        <div className="fixed bottom-6 left-1/2 z-[80] -translate-x-1/2 rounded-xl bg-gray-900 px-4 py-2.5 text-sm text-white shadow-lg">
          {toast}
        </div>
      )}

      {warning && (warning.role === 'cook' || warning.role === 'driver') && (
        <IssueWarningDialog
          user={{ ...warning, role: warning.role }}
          issuerName={account ? displayName(account) : ''}
          onIssued={() => {
            flash(WM.issuedToast(fullName(warning)))
            setWarning(null)
          }}
          onBlocked={() => flash(WM.popupBlocked)}
          onCancel={() => setWarning(null)}
        />
      )}
      {q.detail && <UserDetailDialog user={q.detail} onClose={q.closeDetail} />}
      {q.confirming && (
        <StatusChangeDialog
          user={q.confirming.user}
          next={q.confirming.next}
          busy={q.busyId === q.confirming.user.id}
          onConfirm={(reason) => void q.confirmStatus(reason)}
          onCancel={q.cancelStatus}
        />
      )}
    </div>
  )
}
