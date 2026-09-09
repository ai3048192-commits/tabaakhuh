import { useState } from 'react'
import { RefreshCw } from 'lucide-react'
import { useWithdrawals } from './useWithdrawals'
import StatusFilter from './StatusFilter'
import WithdrawalsTable from './WithdrawalsTable'
import Pager from './Pager'
import ConfirmDialog from './ConfirmDialog'
import { withdrawalMessages as M } from './messages'
import type { ActionKind, ActionOutcome } from './types'

/** `/withdrawals` — the withdrawal-requests queue (US1–US4). */
export default function WithdrawalsPage() {
  const q = useWithdrawals()
  const [toast, setToast] = useState<string | null>(null)

  const SUCCESS: Record<ActionKind, string> = {
    approve: M.approveDoneToast,
    reject: M.rejectDoneToast,
    mark_paid: M.markPaidDoneToast,
  }

  const showActionToast = (o: ActionOutcome, kind: ActionKind) => {
    const text = o.ok
      ? SUCCESS[kind]
      : o.reason === 'invalid_transition'
        ? o.message
        : o.reason === 'not_found'
          ? M.notFoundToast
          : M.actionRetryToast
    setToast(text)
    window.setTimeout(() => setToast((t) => (t === text ? null : t)), 6000)
  }

  const run = (id: number, kind: ActionKind) => {
    const p =
      kind === 'approve' ? q.approve(id) : kind === 'reject' ? q.reject(id) : q.markPaid(id)
    void p.then((o) => showActionToast(o, kind))
  }

  const confirming = q.confirming
  const liveMsg = toast ?? q.toast

  return (
    <div className="min-h-full bg-[#fcf9f2] p-4 font-['Tajawal'] md:p-6" dir="rtl">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-black text-[#7a0d0d]">{M.pageTitle}</h1>
        {q.status === 'ready' && (
          <button
            type="button"
            onClick={q.refresh}
            className="flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs font-bold text-gray-600"
          >
            <RefreshCw size={14} aria-hidden="true" />
            {M.refresh}
          </button>
        )}
      </div>

      <div className="mb-5">
        <StatusFilter value={q.filter} onChange={q.setFilter} />
      </div>

      {q.status === 'loading' && <p className="text-sm text-gray-500">{M.loading}</p>}

      {q.status === 'error' && (
        <div className="rounded-2xl border border-red-100 bg-red-50 p-6 text-center">
          <p className="mb-3 text-sm text-red-700">{M.queueError}</p>
          <button
            type="button"
            onClick={q.refresh}
            className="rounded-xl bg-[#7a0d0d] px-4 py-2 text-sm font-black text-white"
          >
            {M.retry}
          </button>
        </div>
      )}

      {q.status === 'ready' && q.page && q.page.items.length === 0 && (
        <>
          <p className="rounded-2xl border border-gray-100 bg-white p-10 text-center text-sm text-gray-500">
            {M.emptyFor(q.filter)}
          </p>
          {q.beyondRange && (
            <Pager
              page={q.pageNum}
              totalPages={q.totalPages}
              total={q.page.total}
              beyondRange
              onPage={q.setPage}
            />
          )}
        </>
      )}

      {q.status === 'ready' && q.page && q.page.items.length > 0 && (
        <>
          <WithdrawalsTable items={q.page.items} rowState={q.rowState} onAction={q.openConfirm} />
          <Pager
            page={q.page.page}
            totalPages={q.totalPages}
            total={q.page.total}
            beyondRange={false}
            onPage={q.setPage}
          />
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

      {confirming && (
        <ConfirmDialog
          kind={confirming.kind}
          busy={q.rowState(confirming.id) === 'submitting'}
          onConfirm={() => run(confirming.id, confirming.kind)}
          onCancel={() => q.closeConfirm(confirming.id)}
        />
      )}
    </div>
  )
}
