import { useId } from 'react'
import { RefreshCw, ChevronRight, ChevronLeft, Filter, Inbox } from 'lucide-react'
import { useComplaints } from './useComplaints'
import SendersList from './SendersList'
import SenderDrawer from './SenderDrawer'
import { complaintMessages as M } from './messages'
import type { ComplaintsFilters } from './types'
import PageHeader from '../shared/PageHeader'
import { bannerBtnLight } from '../shared/ui'

export default function ComplaintsPage() {
  const q = useComplaints()
  const uid = useId()
  const items = q.page?.items ?? []
  const filtered = q.filters.type !== 'all' || q.filters.status !== 'all' || q.filters.role !== 'all'
  const field =
    'min-w-[10rem] rounded-xl border border-[#e8dcc4] bg-white px-3.5 py-2.5 text-sm font-bold text-gray-700 shadow-sm outline-none focus:border-[#7a0d0d] focus:ring-4 focus:ring-[#7a0d0d]/10'

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

      {/* Filters */}
      <div className="mb-5 flex flex-wrap items-end justify-between gap-4 rounded-3xl bg-white p-4 shadow-[0_18px_40px_-30px_rgba(122,13,13,0.45)] ring-1 ring-[#efe3cc] md:p-5">
        <div className="flex flex-wrap items-end gap-3">
          <span className="mb-2.5 hidden h-9 w-9 place-items-center rounded-xl bg-[#7a0d0d]/[0.07] text-[#7a0d0d] sm:grid" aria-hidden="true">
            <Filter size={16} />
          </span>
          <div className="flex flex-col gap-1.5">
            <label htmlFor={`${uid}-type`} className="text-xs font-black text-[#6b4f3a]">{M.filterType}</label>
            <select id={`${uid}-type`} className={field} value={q.filters.type} onChange={(e) => q.setType(e.target.value as ComplaintsFilters['type'])}>
              <option value="all">{M.allTypes}</option>
              <option value="complaint">{M.typeLabels.complaint}</option>
              <option value="suggestion">{M.typeLabels.suggestion}</option>
            </select>
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor={`${uid}-status`} className="text-xs font-black text-[#6b4f3a]">{M.filterStatus}</label>
            <select id={`${uid}-status`} className={field} value={q.filters.status} onChange={(e) => q.setStatusFilter(e.target.value as ComplaintsFilters['status'])}>
              <option value="all">{M.allStatuses}</option>
              <option value="open">{M.statusLabels.open}</option>
              <option value="resolved">{M.statusLabels.resolved}</option>
            </select>
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor={`${uid}-role`} className="text-xs font-black text-[#6b4f3a]">{M.filterRole}</label>
            <select id={`${uid}-role`} className={field} value={q.filters.role} onChange={(e) => q.setRole(e.target.value as ComplaintsFilters['role'])}>
              <option value="all">{M.allRoles}</option>
              <option value="customer">{M.roleLabels.customer}</option>
              <option value="cook">{M.roleLabels.cook}</option>
              <option value="driver">{M.roleLabels.driver}</option>
            </select>
          </div>
        </div>
        {q.status === 'ready' && q.page && (
          <p className="rounded-xl bg-[#faf3e7] px-3.5 py-2 text-xs font-black text-[#8f680d]">{M.totalCount(q.page.total)}</p>
        )}
      </div>

      {q.status === 'loading' && (
        <>
          <p className="sr-only">{M.loading}</p>
          <div className="space-y-3" aria-hidden="true">
            {[0, 1, 2].map((i) => <div key={i} className="h-28 animate-pulse rounded-3xl bg-white/70" />)}
          </div>
        </>
      )}

      {q.status === 'error' && (
        <div className="max-w-md rounded-3xl border border-red-100 bg-red-50 p-6 text-center">
          <p className="mb-3 text-sm text-red-700">{M.listError}</p>
          <button type="button" onClick={q.refresh} className="rounded-xl bg-[#7a0d0d] px-4 py-2 text-sm font-black text-white">{M.retry}</button>
        </div>
      )}

      {q.status === 'ready' && items.length === 0 && (
        <div className="flex flex-col items-center gap-3 rounded-3xl border border-dashed border-[#e8dcc4] bg-white/60 p-12 text-center">
          <span className="grid h-14 w-14 place-items-center rounded-2xl bg-[#faf3e7] text-[#b68614]">
            <Inbox size={24} aria-hidden="true" />
          </span>
          <p className="text-sm font-bold text-gray-500">{filtered ? M.emptyFiltered : M.empty}</p>
        </div>
      )}

      {q.status === 'ready' && items.length > 0 && q.page && (
        <>
          <SendersList items={items} onOpen={q.openSender} />
          <nav className="mt-5 flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-white p-3 ring-1 ring-[#efe3cc]" aria-label={`صفحة ${q.page.page} من ${q.totalPages}`}>
            <p className="px-2 text-xs font-bold text-gray-500" dir="rtl">صفحة {q.page.page} من {q.totalPages} · {q.page.total}</p>
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

      <div aria-live="polite" role="status" className="sr-only">{q.toast}</div>
      {q.toast && (
        <div className="fixed bottom-6 left-1/2 z-[80] -translate-x-1/2 rounded-xl bg-gray-900 px-4 py-2.5 text-sm text-white shadow-lg">{q.toast}</div>
      )}

      {q.selected && (
        <SenderDrawer
          key={q.selected.user_id}
          sender={q.selected}
          onClose={q.closeSender}
          onChanged={q.refresh}
          showToast={q.showToast}
        />
      )}
    </div>
  )
}
