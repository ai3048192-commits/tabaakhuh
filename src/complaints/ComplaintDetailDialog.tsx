import { useEffect, useRef, useState } from 'react'
import { X } from 'lucide-react'
import DialogShell from '../shared/DialogShell'
import { complaintMessages as M } from './messages'
import type { ComplaintDetail } from './types'

export default function ComplaintDetailDialog({
  detail,
  detailStatus,
  busy,
  onClose,
  onReply,
  onChangeStatus,
}: {
  detail: ComplaintDetail | null
  detailStatus: 'idle' | 'loading' | 'error'
  busy: boolean
  onClose: () => void
  onReply: (body: string) => void
  onChangeStatus: (next: 'open' | 'resolved') => void
}) {
  const closeRef = useRef<HTMLButtonElement>(null)
  const [draft, setDraft] = useState('')
  useEffect(() => {
    closeRef.current?.focus()
  }, [])
  useEffect(() => {
    setDraft('')
  }, [detail?.id, detail?.thread.length])

  const label = detail ? M.detailTitle(detail.subject) : M.pageTitle

  return (
    <DialogShell label={label} onDismiss={onClose}>
      <div className="max-h-[80vh] overflow-y-auto">
        <div className="mb-3 flex items-start justify-between gap-3">
          <p className="text-base font-black text-gray-900">
            {detail ? detail.subject : ''}
          </p>
          <button ref={closeRef} type="button" onClick={onClose} aria-label={M.close} className="rounded-lg p-1 text-gray-400 hover:bg-gray-100">
            <X size={18} aria-hidden="true" />
          </button>
        </div>

        {detailStatus === 'loading' && <p className="text-sm text-gray-500">{M.loading}</p>}
        {detailStatus === 'error' && <p className="text-sm text-red-600">{M.listError}</p>}

        {detail && detailStatus === 'idle' && (
          <>
            <p className="mb-3 text-xs text-gray-400">
              {M.typeLabels[detail.type]} · {M.fromCustomer(detail.customer_id)}
              {detail.order_id != null && <> · {M.relatedOrder(detail.order_id)}</>}
            </p>

            <div className="mb-4 rounded-xl border border-gray-100 bg-gray-50 p-3 text-sm text-gray-800">
              {detail.body}
            </div>

            <p className="mb-2 text-xs font-black text-gray-500">{M.thread}</p>
            <ul className="mb-4 space-y-2">
              {detail.thread.map((m) => (
                <li
                  key={m.id}
                  className={`rounded-xl p-2.5 text-sm ${
                    m.author === 'admin'
                      ? 'bg-[#7a0d0d]/5 text-gray-800'
                      : 'bg-gray-100 text-gray-700'
                  }`}
                >
                  <span className="mb-0.5 block text-[10px] font-bold text-gray-400">
                    {m.author === 'admin' ? M.authorAdmin : M.authorCustomer} · {m.created_at?.slice(0, 10)}
                  </span>
                  {m.body}
                </li>
              ))}
              {detail.thread.length === 0 && (
                <li className="text-xs text-gray-400">—</li>
              )}
            </ul>

            <label className="mb-1 block text-xs font-bold text-gray-500" htmlFor="cmp-reply">
              {M.replyLabel}
            </label>
            <textarea
              id="cmp-reply"
              rows={3}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder={M.replyPlaceholder}
              className="mb-3 w-full rounded-xl border border-gray-200 p-2.5 text-sm outline-none"
            />
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                disabled={busy || draft.trim() === ''}
                aria-busy={busy}
                onClick={() => onReply(draft)}
                className="rounded-xl bg-[#7a0d0d] px-4 py-2 text-sm font-black text-white disabled:opacity-50"
              >
                {M.send}
              </button>
              {detail.status === 'open' ? (
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => onChangeStatus('resolved')}
                  className="rounded-xl border border-emerald-300 bg-emerald-50 px-4 py-2 text-sm font-bold text-emerald-800 disabled:opacity-50"
                >
                  {M.markResolved}
                </button>
              ) : (
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => onChangeStatus('open')}
                  className="rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-bold text-gray-600 disabled:opacity-50"
                >
                  {M.reopen}
                </button>
              )}
            </div>
          </>
        )}
      </div>
    </DialogShell>
  )
}
