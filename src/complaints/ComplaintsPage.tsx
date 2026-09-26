import { useId } from 'react'
import { RefreshCw, ChevronRight, ChevronLeft } from 'lucide-react'
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
  const field = 'rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm'

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

      <div className="mb-5 flex flex-wrap gap-3 rounded-2xl border border-gray-100 bg-white p-4">
        <div className="flex flex-col gap-1">
          <label htmlFor={`${uid}-type`} className="text-xs font-bold text-gray-500">{M.filterType}</label>
          <select id={`${uid}-type`} className={field} value={q.filters.type} onChange={(e) => q.setType(e.target.value as ComplaintsFilters['type'])}>
            <option value="all">{M.allTypes}</option>
            <option value="complaint">{M.typeLabels.complaint}</option>
            <option value="suggestion">{M.typeLabels.suggestion}</option>
          </select>
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor={`${uid}-status`} className="text-xs font-bold text-gray-500">{M.filterStatus}</label>
          <select id={`${uid}-status`} className={field} value={q.filters.status} onChange={(e) => q.setStatusFilter(e.target.value as ComplaintsFilters['status'])}>
            <option value="all">{M.allStatuses}</option>
            <option value="open">{M.statusLabels.open}</option>
            <option value="resolved">{M.statusLabels.resolved}</option>
          </select>
        </div>
      </div>

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
          <ComplaintsTable items={items} onOpen={q.openDetail} />
          <nav className="mt-4 flex items-center justify-between gap-3" aria-label={`صفحة ${q.page.page} من ${q.totalPages}`}>
            <p className="text-xs font-bold text-gray-500" dir="rtl">صفحة {q.page.page} من {q.totalPages} · {q.page.total}</p>
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
