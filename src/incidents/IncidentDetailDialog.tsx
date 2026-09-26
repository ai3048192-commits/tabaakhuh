import { useEffect, useRef, useState } from 'react'
import { X } from 'lucide-react'
import DialogShell from '../shared/DialogShell'
import { safeUrl } from '../shared/safeUrl'
import { incidentMessages as M } from './messages'
import type { IncidentDetail, IncidentStatus } from './types'

/** Valid next statuses from each current one — mirrors `TicketStatus::canTransitionTo` on the backend. */
const NEXT_STATUSES: Record<IncidentStatus, IncidentStatus[]> = {
  open: ['pending', 'resolved', 'closed'],
  pending: ['open', 'resolved', 'closed'],
  resolved: ['open', 'closed'],
  closed: ['open'],
}

const ACTION_LABEL: Record<IncidentStatus, string> = {
  open: M.reopen,
  pending: M.markPending,
  resolved: M.markResolved,
  closed: M.markClosed,
}

const ACTION_STYLE: Record<IncidentStatus, string> = {
  open: 'border-gray-200 bg-white text-gray-600',
  pending: 'border-amber-300 bg-amber-50 text-amber-800',
  resolved: 'border-emerald-300 bg-emerald-50 text-emerald-800',
  closed: 'border-gray-300 bg-gray-100 text-gray-600',
}

export default function IncidentDetailDialog({
  detail,
  detailStatus,
  busy,
  onClose,
  onReply,
  onChangeStatus,
}: {
  detail: IncidentDetail | null
  detailStatus: 'idle' | 'loading' | 'error'
  busy: boolean
  onClose: () => void
  onReply: (body: string) => Promise<boolean>
  onChangeStatus: (next: IncidentStatus) => void
}) {
  const closeRef = useRef<HTMLButtonElement>(null)
  const [draft, setDraft] = useState('')
  useEffect(() => {
    closeRef.current?.focus()
  }, [])
  // Only on switching to a different ticket — NOT on every thread update, since
  // the dialog polls for the driver's new messages while it's open (live
  // thread) and that must never wipe out an admin's in-progress draft reply.
  useEffect(() => {
    setDraft('')
  }, [detail?.id])

  const send = async () => {
    if (await onReply(draft)) setDraft('')
  }

  const label = detail ? M.detailTitle(detail.subject) : M.pageTitle
  const opening = detail?.thread[0] ?? null
  const attachment = detail?.thread.find((m) => m.attachment_url)?.attachment_url ?? null

  return (
    <DialogShell label={label} onDismiss={onClose} size="md">
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
              {M.fromDriver(detail.user?.name ?? null, detail.user_id)}
              {detail.order_id != null && <> · {M.relatedOrder(detail.order_id)}</>}
            </p>

            {opening && (
              <div className="mb-3 rounded-xl border border-gray-100 bg-gray-50 p-3 text-sm whitespace-pre-line text-gray-800">
                {opening.body}
              </div>
            )}

            {attachment && (
              <div className="mb-4">
                <p className="mb-1 text-xs font-black text-gray-500">{M.attachment}</p>
                <a href={safeUrl(attachment)} target="_blank" rel="noreferrer">
                  <img src={safeUrl(attachment)} alt="" className="max-h-48 rounded-xl border border-gray-100 object-cover" />
                </a>
              </div>
            )}

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

            <label className="mb-1 block text-xs font-bold text-gray-500" htmlFor="inc-reply">
              {M.replyLabel}
            </label>
            <textarea
              id="inc-reply"
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
                onClick={() => void send()}
                className="rounded-xl bg-[#7a0d0d] px-4 py-2 text-sm font-black text-white disabled:opacity-50"
              >
                {M.send}
              </button>
              {(NEXT_STATUSES[detail.status] ?? []).map((next) => (
                <button
                  key={next}
                  type="button"
                  disabled={busy}
                  onClick={() => onChangeStatus(next)}
                  className={`rounded-xl border px-4 py-2 text-sm font-bold disabled:opacity-50 ${ACTION_STYLE[next]}`}
                >
                  {ACTION_LABEL[next]}
                </button>
              ))}
            </div>
          </>
        )}
      </div>
    </DialogShell>
  )
}
