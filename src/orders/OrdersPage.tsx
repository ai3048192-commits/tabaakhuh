import { useEffect, useState } from 'react'
import { RefreshCw } from 'lucide-react'
import PageHeader from '../shared/PageHeader'
import { bannerBtnLight, btnPrimary, btnSecondary, emptyCls, errorBoxCls, pageCls } from '../shared/ui'
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
    <div className={pageCls} dir="rtl">
      <PageHeader
        title={M.pageTitle}
        subtitle={M.subtitle}
        actions={
          <>
            <label className="flex cursor-pointer items-center gap-2 rounded-xl bg-white/10 px-3.5 py-2.5 text-xs font-bold text-white ring-1 ring-white/15">
              <input
                type="checkbox"
                checked={q.autoRefreshOn}
                onChange={(e) => q.setAutoRefresh(e.target.checked)}
                className="h-4 w-4 accent-[#e0a52e]"
              />
              {M.autoRefresh}
            </label>
            <button type="button" onClick={q.refresh} className={bannerBtnLight}>
              <RefreshCw size={14} aria-hidden="true" />
              {M.refresh}
            </button>
          </>
        }
      />

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

      {q.status === 'loading' && <p className={emptyCls}>{M.loading}</p>}

      {q.status === 'error' && (
        <div className={errorBoxCls}>
          <p className="mb-3 text-sm text-red-700">{M.listError}</p>
          <button
            type="button"
            onClick={q.refresh}
            className={btnPrimary}
          >
            {M.retry}
          </button>
        </div>
      )}

      {q.status === 'ready' && q.emptyKind === 'unfiltered' && (
        <p className={emptyCls}>
          {M.emptyNoOrders}
        </p>
      )}

      {q.status === 'ready' && q.emptyKind === 'filtered' && (
        <div className={emptyCls}>
          <p className="mb-3">{M.emptyNoMatch}</p>
          <button
            type="button"
            onClick={q.resetFilters}
            className={btnSecondary}
          >
            {M.resetFilters}
          </button>
        </div>
      )}

      {q.status === 'ready' && q.emptyKind === 'beyond-range' && (
        <div className={emptyCls}>
          <p className="mb-3">{M.emptyBeyondRange}</p>
          <button
            type="button"
            onClick={q.firstPage}
            className={btnPrimary}
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
