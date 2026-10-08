import { useState } from 'react'
import { RefreshCw } from 'lucide-react'
import PageHeader from '../shared/PageHeader'
import { bannerBtnLight, pageCls } from '../shared/ui'
import Pager from '../withdrawals/Pager'
import ActionDialog from './ActionDialog'
import DepositCard from './DepositCard'
import ProofViewer from './ProofViewer'
import { useDeposits } from './useDeposits'
import { depositMessages as M } from './messages'
import type { ActionOutcome, Deposit, DepositAction, DepositFilter } from './types'

const TABS: DepositFilter[] = ['submitted', 'verified', 'paid_to_cook', 'rejected', 'all']

/** `/deposits` — check customers' deposit transfers and forward them to the cooks. */
export default function DepositsPage() {
  const q = useDeposits()
  const [toast, setToast] = useState<string | null>(null)
  const [dialog, setDialog] = useState<{ deposit: Deposit; action: DepositAction } | null>(null)
  const [proof, setProof] = useState<{ url: string; orderNumber: string | null } | null>(null)

  const say = (text: string) => {
    setToast(text)
    window.setTimeout(() => setToast((t) => (t === text ? null : t)), 6000)
  }

  const outcomeText = (o: ActionOutcome, action: DepositAction) =>
    o.ok ? M.doneToast[action] : o.reason === 'conflict' ? o.message : o.reason === 'not_found' ? M.notFoundToast : M.retryToast

  const confirm = (note: string | null) => {
    if (!dialog) return
    const { deposit, action } = dialog
    void q.run(deposit.id, action, note).then((o) => {
      if (o.ok || o.reason !== 'transient') setDialog(null)
      say(outcomeText(o, action))
    })
  }

  const liveMsg = toast ?? q.toast
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

      <div role="group" aria-label={M.pageTitle} className="mb-5 flex flex-wrap gap-1 rounded-xl border border-gray-200 bg-white p-1">
        {TABS.map((t) => {
          const active = t === q.filter
          const n = t === 'all' ? undefined : counts[t]
          return (
            <button
              key={t}
              type="button"
              aria-pressed={active}
              onClick={() => q.setFilter(t)}
              className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold ${
                active ? 'bg-[#7a0d0d] text-white' : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              {M.filters[t]}
              {n ? (
                <span className={`rounded-full px-1.5 text-[10px] font-black ${active ? 'bg-white/20' : 'bg-amber-100 text-amber-800'}`}>
                  {n}
                </span>
              ) : null}
            </button>
          )
        })}
      </div>

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
            {M.emptyFor(q.filter)}
          </p>
          {q.beyondRange && (
            <Pager page={q.pageNum} totalPages={q.totalPages} total={q.page.total} beyondRange onPage={q.setPage} />
          )}
        </>
      )}

      {q.status === 'ready' && q.page && q.page.items.length > 0 && (
        <>
          <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
            {q.page.items.map((d) => (
              <DepositCard
                key={d.id}
                deposit={d}
                busy={q.busyId === d.id}
                onAction={(action) => setDialog({ deposit: d, action })}
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

      {dialog && (
        <ActionDialog
          deposit={dialog.deposit}
          action={dialog.action}
          busy={q.busyId === dialog.deposit.id}
          onConfirm={confirm}
          onCancel={() => setDialog(null)}
        />
      )}
      {proof && <ProofViewer url={proof.url} orderNumber={proof.orderNumber} onClose={() => setProof(null)} />}
    </div>
  )
}
