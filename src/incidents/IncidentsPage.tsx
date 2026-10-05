import { useId } from 'react'
import { RefreshCw, ChevronRight, ChevronLeft } from 'lucide-react'
import { useIncidents } from './useIncidents'
import IncidentsTable from './IncidentsTable'
import IncidentDetailDialog from './IncidentDetailDialog'
import { incidentMessages as M } from './messages'
import type { IncidentsFilters } from './types'
import PageHeader from '../shared/PageHeader'
import { bannerBtnLight } from '../shared/ui'

export default function IncidentsPage() {
  const q = useIncidents()
  const uid = useId()
  const items = q.page?.items ?? []
  const filtered = q.filters.status !== 'all'
  const field = 'rounded-xl border border-[#e8dcc4] bg-white px-3.5 py-2.5 text-sm text-gray-800 shadow-sm outline-none transition focus:border-[#7a0d0d] focus:ring-4 focus:ring-[#7a0d0d]/10 disabled:opacity-50'

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

      <div className="mb-5 flex flex-wrap gap-3 rounded-3xl bg-white shadow-[0_18px_40px_-30px_rgba(122,13,13,0.45)] ring-1 ring-[#efe3cc] p-4">
        <div className="flex flex-col gap-1">
          <label htmlFor={`${uid}-status`} className="text-xs font-black text-[#6b4f3a]">{M.filterStatus}</label>
          <select id={`${uid}-status`} className={field} value={q.filters.status} onChange={(e) => q.setStatusFilter(e.target.value as IncidentsFilters['status'])}>
            <option value="all">{M.allStatuses}</option>
            <option value="open">{M.statusLabels.open}</option>
            <option value="pending">{M.statusLabels.pending}</option>
            <option value="resolved">{M.statusLabels.resolved}</option>
            <option value="closed">{M.statusLabels.closed}</option>
          </select>
        </div>
      </div>

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
          <IncidentsTable items={items} onOpen={q.openDetail} />
          <nav className="mt-4 flex items-center justify-between gap-3" aria-label={`صفحة ${q.page.page} من ${q.totalPages}`}>
            <p className="text-xs font-bold text-gray-500" dir="rtl">صفحة {q.page.page} من {q.totalPages} · {q.page.total}</p>
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
        <IncidentDetailDialog
          detail={q.detail}
          detailStatus={q.detailStatus}
          busy={q.busy}
          onClose={q.closeDetail}
          onReply={q.reply}
          onChangeStatus={(n) => void q.changeStatus(n)}
        />
      )}
    </div>
  )
}
