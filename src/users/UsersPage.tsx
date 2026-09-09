import { RefreshCw, ChevronRight, ChevronLeft } from 'lucide-react'
import { useAuth } from '../auth/AuthContext'
import { useUsers } from './useUsers'
import UsersFilters from './UsersFilters'
import UsersTable from './UsersTable'
import UserDetailDialog from './UserDetailDialog'
import StatusChangeDialog from './StatusChangeDialog'
import { userMessages as M } from './messages'

/** `/users` — user directory: filter by role/status, search, paginate, view, change status. */
export default function UsersPage() {
  const q = useUsers()
  const { account } = useAuth()
  const filtered = q.filters.role !== 'all' || q.filters.status !== 'all' || q.filters.q.trim() !== ''
  const items = q.page?.items ?? []

  return (
    <div className="min-h-full bg-[#fcf9f2] p-4 font-['Tajawal'] md:p-6" dir="rtl">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-black text-[#7a0d0d]">{M.pageTitle}</h1>
        {q.status === 'ready' && (
          <button type="button" onClick={q.refresh} className="flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs font-bold text-gray-600">
            <RefreshCw size={14} aria-hidden="true" />
            {M.refresh}
          </button>
        )}
      </div>

      <UsersFilters filters={q.filters} onRole={q.setRole} onStatus={q.setStatusFilter} onQuery={q.setQuery} />

      {q.status === 'loading' && <p className="text-sm text-gray-500">{M.loading}</p>}

      {q.status === 'error' && (
        <div className="rounded-2xl border border-red-100 bg-red-50 p-6 text-center">
          <p className="mb-3 text-sm text-red-700">{M.listError}</p>
          <button type="button" onClick={q.refresh} className="rounded-xl bg-[#7a0d0d] px-4 py-2 text-sm font-black text-white">{M.retry}</button>
        </div>
      )}

      {q.status === 'ready' && items.length === 0 && (
        <p className="rounded-2xl border border-gray-100 bg-white p-10 text-center text-sm text-gray-500">
          {filtered ? M.emptyFiltered : M.empty}
        </p>
      )}

      {q.status === 'ready' && items.length > 0 && q.page && (
        <>
          <UsersTable items={items} busyId={q.busyId} currentUserId={account?.id ?? null} onView={q.openDetail} onStatus={q.askStatus} />
          <nav className="mt-4 flex items-center justify-between gap-3" aria-label={`صفحة ${q.page.page} من ${q.totalPages}`}>
            <p className="text-xs font-bold text-gray-500" dir="rtl">
              صفحة {q.page.page} من {q.totalPages} · {q.page.total} مستخدم
            </p>
            <div className="flex items-center gap-2">
              <button type="button" aria-label="الصفحة السابقة" disabled={q.page.page <= 1} onClick={() => q.setPage(q.page!.page - 1)} className="inline-flex items-center gap-1 rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs font-bold text-gray-700 disabled:opacity-40">
                <ChevronRight size={14} aria-hidden="true" /> السابق
              </button>
              <button type="button" aria-label="الصفحة التالية" disabled={q.page.page >= q.totalPages} onClick={() => q.setPage(q.page!.page + 1)} className="inline-flex items-center gap-1 rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs font-bold text-gray-700 disabled:opacity-40">
                التالي <ChevronLeft size={14} aria-hidden="true" />
              </button>
            </div>
          </nav>
        </>
      )}

      <div aria-live="polite" role="status" className="sr-only">{q.toast}</div>
      {q.toast && (
        <div className="fixed bottom-6 left-1/2 z-[80] -translate-x-1/2 rounded-xl bg-gray-900 px-4 py-2.5 text-sm text-white shadow-lg">
          {q.toast}
        </div>
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
