import { useEffect, useState } from 'react'
import { RefreshCw } from 'lucide-react'
import { fetchCityDirectory } from '../cities/citiesApi'
import { useOrdersOversight } from './useOrdersOversight'
import OrdersFilters from './OrdersFilters'
import OrdersTable from './OrdersTable'
import Pagination from './Pagination'
import OrderDetailDialog from './OrderDetailDialog'
import { orderMessages as M } from './messages'

/** `/orders` — the read-only Orders Oversight screen (US1–US3 + conditional auto-refresh). */
export default function OrdersPage() {
  const q = useOrdersOversight()
  const [cities, setCities] = useState<{ id: number; name_ar: string }[]>([])

  useEffect(() => {
    let live = true
    fetchCityDirectory()
      .then((dir) => {
        if (!live) return
        setCities(
          [...dir.entries()].map(([id, v]) => ({ id, name_ar: v.name_ar })),
        )
      })
      .catch(() => {
        // A missing city list only disables the city filter; the page still works.
        if (live) setCities([])
      })
    return () => {
      live = false
    }
  }, [])

  const shown = q.page?.items.length ?? 0
  const total = q.page?.total ?? 0

  return (
    <div className="min-h-full bg-[#fcf9f2] p-4 font-['Tajawal'] md:p-6" dir="rtl">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-black text-[#7a0d0d]">{M.pageTitle}</h1>
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 text-xs font-bold text-gray-600">
            <input
              type="checkbox"
              checked={q.autoRefreshOn}
              onChange={(e) => q.setAutoRefresh(e.target.checked)}
            />
            {M.autoRefresh}
          </label>
          <button
            type="button"
            onClick={q.refresh}
            className="flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs font-bold text-gray-600"
          >
            <RefreshCw size={14} aria-hidden="true" />
            {M.refresh}
          </button>
        </div>
      </div>

      <OrdersFilters
        filters={q.filters}
        cities={cities}
        draftFrom={q.draftFrom}
        draftTo={q.draftTo}
        dateFieldError={q.dateFieldError}
        serverFieldError={q.fieldError}
        onStatus={q.setStatusFilter}
        onCity={q.setCityFilter}
        onDraftFrom={q.setDraftFrom}
        onDraftTo={q.setDraftTo}
        onApply={q.applyRange}
        onReset={q.resetFilters}
      />

      {q.status === 'loading' && <p className="text-sm text-gray-500">{M.loading}</p>}

      {q.status === 'error' && (
        <div className="rounded-2xl border border-red-100 bg-red-50 p-6 text-center">
          <p className="mb-3 text-sm text-red-700">{M.listError}</p>
          <button
            type="button"
            onClick={q.refresh}
            className="rounded-xl bg-[#7a0d0d] px-4 py-2 text-sm font-black text-white"
          >
            {M.retry}
          </button>
        </div>
      )}

      {q.status === 'ready' && q.emptyKind === 'unfiltered' && (
        <p className="rounded-2xl border border-gray-100 bg-white p-10 text-center text-sm text-gray-500">
          {M.emptyNoOrders}
        </p>
      )}

      {q.status === 'ready' && q.emptyKind === 'filtered' && (
        <div className="rounded-2xl border border-gray-100 bg-white p-10 text-center">
          <p className="mb-3 text-sm text-gray-500">{M.emptyNoMatch}</p>
          <button
            type="button"
            onClick={q.resetFilters}
            className="rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-bold text-gray-600"
          >
            {M.resetFilters}
          </button>
        </div>
      )}

      {q.status === 'ready' && q.emptyKind === 'beyond-range' && (
        <div className="rounded-2xl border border-gray-100 bg-white p-10 text-center">
          <p className="mb-3 text-sm text-gray-500">{M.emptyBeyondRange}</p>
          <button
            type="button"
            onClick={q.firstPage}
            className="rounded-xl bg-[#7a0d0d] px-4 py-2 text-sm font-black text-white"
          >
            {M.backToFirst}
          </button>
        </div>
      )}

      {q.status === 'ready' && q.page && q.emptyKind === 'none' && (
        <>
          <OrdersTable items={q.page.items} onOpenDetail={q.openDetail} />
          <Pagination
            page={q.pageNumber}
            totalPages={q.totalPages}
            total={total}
            onFirst={q.firstPage}
            onPrev={q.prevPage}
            onNext={q.nextPage}
          />
        </>
      )}

      <div aria-live="polite" role="status" className="sr-only">
        {q.toast}
      </div>
      <div aria-live="polite" className="sr-only">
        {q.status === 'ready' && q.emptyKind === 'filtered'
          ? M.emptyNoMatch
          : q.status === 'ready'
            ? M.resultSummary(shown, total)
            : ''}
      </div>
      {q.toast && (
        <div className="fixed bottom-6 left-1/2 z-[80] -translate-x-1/2 rounded-xl bg-gray-900 px-4 py-2.5 text-sm text-white shadow-lg">
          {q.toast}
        </div>
      )}

      {q.detail && <OrderDetailDialog order={q.detail.order} onClose={q.closeDetail} />}
    </div>
  )
}
