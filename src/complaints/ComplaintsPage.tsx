import { useId } from 'react'
import { RefreshCw, ChevronRight, ChevronLeft, Filter, Inbox } from 'lucide-react'
import { useComplaints } from './useComplaints'
import ComplaintsTable from './ComplaintsTable'
import ComplaintDetailDialog from './ComplaintDetailDialog'
import { complaintMessages as M } from './messages'
import type { ComplaintsFilters } from './types'

export default function ComplaintsPage() {
  const q = useComplaints()
  const uid = useId()
  const items = q.page?.items ?? []
  const filtered = q.filters.type !== 'all' || q.filters.status !== 'all'
  const field =
    'min-w-[10rem] rounded-xl border border-[#e8dcc4] bg-white px-3.5 py-2.5 text-sm font-bold text-gray-700 shadow-sm outline-none focus:border-[#7a0d0d] focus:ring-4 focus:ring-[#7a0d0d]/10'

  return (
    <div className="min-h-full bg-[#f7f1e6] p-4 font-['Tajawal'] md:p-8" dir="rtl">
      {/* Header */}
      <div className="relative mb-6 overflow-hidden rounded-[2rem] bg-gradient-to-l from-[#7a0d0d] via-[#5e0a0a] to-[#2e0404] p-6 text-white shadow-[0_30px_60px_-30px_rgba(122,13,13,0.8)] md:p-8">
        <div className="pointer-events-none absolute inset-0 opacity-[0.07] [background-image:radial-gradient(circle,#fff_1.5px,transparent_1.5px)] [background-size:22px_22px]" aria-hidden="true" />
        <div className="relative flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-2xl font-black md:text-3xl">{M.pageTitle}</h1>
            <p className="mt-1.5 text-sm text-white/70">{M.subtitle}</p>
          </div>
          {q.status === 'ready' && (
            <button type="button" onClick={q.refresh} className="flex items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-xs font-black text-[#7a0d0d] shadow-lg transition hover:bg-[#fff7e6]">
              <RefreshCw size={14} aria-hidden="true" />
              {M.refresh}
            </button>
          )}
        </div>
      </div>

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
          <ComplaintsTable items={items} onOpen={q.openDetail} />
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

      {(q.detail || q.detailStatus !== 'idle') && (
        <ComplaintDetailDialog
          detail={q.detail}
          detailStatus={q.detailStatus}
          busy={q.busy}
          onClose={q.closeDetail}
          onReply={(b) => void q.reply(b)}
          onChangeStatus={(n) => void q.changeStatus(n)}
        />
      )}
    </div>
  )
}
