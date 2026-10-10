import { useState } from 'react'
import { RefreshCw } from 'lucide-react'
import PageHeader from '../shared/PageHeader'
import { bannerBtnLight, pageCls } from '../shared/ui'
import Pager from '../withdrawals/Pager'
import DepositCard from './DepositCard'
import ProofViewer from './ProofViewer'
import { useDeposits } from './useDeposits'
import { depositMessages as M } from './messages'
import { formatAmount } from '../withdrawals/format'

/** `/deposits` — read-only monitoring of customers' deposits to cooks. */
export default function DepositsPage() {
  const q = useDeposits()
  const [proof, setProof] = useState<{ url: string; orderNumber: string | null } | null>(null)

  const liveMsg = q.toast
  const counts = q.page?.counts ?? {}

  return (
    <div className={pageCls} dir="rtl">
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

      {q.page && (
        <section aria-label={M.summaryTitle} className="mb-5 flex flex-wrap items-baseline gap-x-6 gap-y-1 rounded-2xl bg-white p-4 ring-1 ring-[#efe3cc]">
          <p className="text-xs font-black text-gray-500">{M.summaryTotal}</p>
          <p className="text-2xl font-black text-emerald-800" dir="ltr">{formatAmount(q.page.confirmed_total)}</p>
          <p className="text-xs font-bold text-gray-500">{M.summaryCount(counts.confirmed ?? 0)}</p>
        </section>
      )}

      {q.status === 'loading' && <p className="text-sm text-gray-500">{M.loading}</p>}

      {q.status === 'error' && (
        <div className="max-w-md rounded-3xl border border-red-100 bg-red-50 p-6 text-center">
          <p className="mb-3 text-sm text-red-700">{M.queueError}</p>
          <button
            type="button"
            onClick={q.refresh}
            className="rounded-xl bg-[#7a0d0d] px-4 py-2.5 text-sm font-black text-white shadow-sm transition hover:bg-[#5a0909]"
          >
            {M.retry}
          </button>
        </div>
      )}

      {q.status === 'ready' && q.page && q.page.items.length === 0 && (
        <>
          <p className="rounded-3xl bg-white p-10 text-center text-sm font-bold text-gray-400 shadow-[0_18px_40px_-30px_rgba(122,13,13,0.45)] ring-1 ring-[#efe3cc]">
            {M.empty}
          </p>
          {q.beyondRange && (
            <Pager page={q.pageNum} totalPages={q.totalPages} total={q.page.total} beyondRange onPage={q.setPage} />
          )}
        </>
      )}

      {q.status === 'ready' && q.page && q.page.items.length > 0 && (
        <>
          {/* items-start: a card opened by a tap must not stretch the closed one beside it */}
          <div className="grid grid-cols-1 items-start gap-4 xl:grid-cols-2">
            {q.page.items.map((d) => (
              <DepositCard
                key={d.deposit.id}
                item={d}
                onOpenProof={(url) => setProof({ url, orderNumber: d.order_number })}
              />
            ))}
          </div>
          <Pager page={q.page.page} totalPages={q.totalPages} total={q.page.total} beyondRange={false} onPage={q.setPage} />
        </>
      )}

      <div aria-live="polite" role="status" className="sr-only">
        {liveMsg}
      </div>
      {liveMsg && (
        <div className="fixed bottom-6 left-1/2 z-[80] -translate-x-1/2 rounded-xl bg-gray-900 px-4 py-2.5 text-sm text-white shadow-lg">
          {liveMsg}
        </div>
      )}

      {proof && <ProofViewer url={proof.url} orderNumber={proof.orderNumber} onClose={() => setProof(null)} />}
    </div>
  )
}
