import { useEffect, useRef, useState } from 'react'
import { X, Send, CheckCircle2, RotateCcw, User, Package, Loader2, ShieldCheck } from 'lucide-react'
import { StatusPill, TypePill } from './ComplaintsTable'
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
    <DialogShell label={label} onDismiss={onClose} size="md">
      <div className="max-h-[80vh] overflow-y-auto">
        <div className="mb-4 flex items-start justify-between gap-3 border-b border-[#f3ead9] pb-4">
          <div className="min-w-0">
            {detail && (
              <div className="mb-2 flex flex-wrap items-center gap-2">
                <TypePill type={detail.type} />
                <StatusPill status={detail.status} />
              </div>
            )}
            <p className="text-lg font-black text-gray-900">
              {detail ? detail.subject : ''}
            </p>
          </div>
          <button ref={closeRef} type="button" onClick={onClose} aria-label={M.close} className="grid h-9 w-9 shrink-0 place-items-center rounded-xl text-gray-400 transition hover:bg-[#faf3e7] hover:text-[#7a0d0d]">
            <X size={18} aria-hidden="true" />
          </button>
        </div>

        {detailStatus === 'loading' && (
          <p className="flex items-center gap-2 text-sm text-gray-500">
            <Loader2 size={14} className="animate-spin" aria-hidden="true" /> {M.loading}
          </p>
        )}
        {detailStatus === 'error' && <p className="text-sm text-red-600">{M.listError}</p>}

        {detail && detailStatus === 'idle' && (
          <>
            <div className="mb-4 flex flex-wrap gap-2 text-[11px] font-bold text-gray-500">
              <span className="inline-flex items-center gap-1 rounded-lg bg-gray-50 px-2.5 py-1.5">
                <User size={12} aria-hidden="true" /> {M.fromCustomer(detail.customer_id)}
              </span>
              {detail.order_id != null && (
                <span className="inline-flex items-center gap-1 rounded-lg bg-gray-50 px-2.5 py-1.5">
                  <Package size={12} aria-hidden="true" /> {M.relatedOrder(detail.order_id)}
                </span>
              )}
            </div>

            <div className="mb-5 rounded-2xl border border-[#efe3cc] bg-[#fffaf1] p-4 text-sm leading-relaxed text-gray-800">
              {detail.body}
            </div>

            <p className="mb-3 text-xs font-black text-[#6b4f3a]">{M.thread}</p>
            <ul className="mb-5 space-y-3">
              {detail.thread.map((m) => {
                const admin = m.author === 'admin'
                return (
                  <li key={m.id} className={`flex ${admin ? 'justify-end' : 'justify-start'}`}>
                    <div
                      className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                        admin
                          ? 'rounded-bl-md bg-[#7a0d0d] text-white'
                          : 'rounded-br-md bg-gray-100 text-gray-800'
                      }`}
                    >
                      <span className={`mb-1 flex items-center gap-1 text-[10px] font-bold ${admin ? 'text-white/60' : 'text-gray-400'}`}>
                        {admin ? <ShieldCheck size={10} aria-hidden="true" /> : <User size={10} aria-hidden="true" />}
                        {admin ? M.authorAdmin : M.authorCustomer} · <span dir="ltr">{m.created_at?.slice(0, 10)}</span>
                      </span>
                      {m.body}
                    </div>
                  </li>
                )
              })}
              {detail.thread.length === 0 && (
                <li className="rounded-xl border border-dashed border-[#efe3cc] py-4 text-center text-xs text-gray-400">—</li>
              )}
            </ul>

            <div className="rounded-2xl border border-[#efe3cc] bg-white p-3">
              <label className="mb-1.5 block text-xs font-black text-[#6b4f3a]" htmlFor="cmp-reply">
                {M.replyLabel}
              </label>
              <textarea
                id="cmp-reply"
                rows={3}
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                placeholder={M.replyPlaceholder}
                className="mb-3 w-full resize-y rounded-xl border border-[#e8dcc4] p-3 text-sm outline-none transition focus:border-[#7a0d0d] focus:ring-4 focus:ring-[#7a0d0d]/10"
              />
              <div className="flex flex-wrap items-center justify-between gap-2">
                <button
                  type="button"
                  disabled={busy || draft.trim() === ''}
                  aria-busy={busy}
                  onClick={() => onReply(draft)}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-[#7a0d0d] px-5 py-2.5 text-sm font-black text-white shadow-sm transition hover:bg-[#5a0909] disabled:opacity-50"
                >
                  <Send size={14} aria-hidden="true" />
                  {M.send}
                </button>
                {detail.status === 'open' ? (
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => onChangeStatus('resolved')}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-50 px-4 py-2.5 text-sm font-black text-emerald-700 ring-1 ring-emerald-200 transition hover:bg-emerald-100 disabled:opacity-50"
                  >
                    <CheckCircle2 size={15} aria-hidden="true" />
                    {M.markResolved}
                  </button>
                ) : (
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => onChangeStatus('open')}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-[#e8dcc4] bg-white px-4 py-2.5 text-sm font-bold text-gray-600 transition hover:bg-[#faf3e7] disabled:opacity-50"
                  >
                    <RotateCcw size={14} aria-hidden="true" />
                    {M.reopen}
                  </button>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </DialogShell>
  )
}
