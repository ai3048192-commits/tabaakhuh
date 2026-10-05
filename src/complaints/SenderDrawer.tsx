import { useEffect, useRef, useState } from 'react'
import {
  X, Send, CheckCircle2, RotateCcw, Package, Loader2, ShieldCheck, User, Trash2, ChevronDown, CalendarDays,
} from 'lucide-react'
import DrawerShell from '../shared/DrawerShell'
import { complaintMessages as M, senderName } from './messages'
import { RolePill, SenderAvatar, StatusPill, TypePill } from './pills'
import { useSenderComplaints, type UseSenderComplaints } from './useSenderComplaints'
import type { Complaint, ComplaintSender } from './types'

/**
 * Side panel for one sender: every complaint / suggestion they sent, newest
 * first. Expanding one shows its thread with reply, resolve / reopen and
 * delete (behind an inline confirm).
 */
export default function SenderDrawer({
  sender,
  onClose,
  onChanged,
  showToast,
}: {
  sender: ComplaintSender
  onClose: () => void
  onChanged: () => void
  showToast: (msg: string) => void
}) {
  const q = useSenderComplaints(sender.user_id, { onChanged, showToast })
  const closeRef = useRef<HTMLButtonElement>(null)
  useEffect(() => {
    closeRef.current?.focus()
  }, [])

  const name = senderName(sender.name, sender.user_id)

  return (
    <DrawerShell label={`${M.senderMessages} — ${name}`} onDismiss={onClose} width="lg">
      <div className="flex items-center gap-3 border-b border-[#f3ead9] bg-[#fffaf1] p-5">
        <SenderAvatar name={name} avatarUrl={sender.avatar_url} size={44} />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="truncate text-lg font-black text-gray-900">{name}</p>
            <RolePill role={sender.role} />
          </div>
          <p className="text-xs font-bold text-gray-500">
            {M.senderMessages} · {M.messagesCount(q.status === 'ready' ? q.total : sender.total)}
          </p>
        </div>
        <button ref={closeRef} type="button" onClick={onClose} aria-label={M.close} className="grid h-9 w-9 shrink-0 place-items-center rounded-xl text-gray-400 transition hover:bg-white hover:text-[#7a0d0d]">
          <X size={18} aria-hidden="true" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto bg-[#f7f1e6] p-4">
        {q.status === 'loading' && (
          <p className="flex items-center gap-2 text-sm text-gray-500">
            <Loader2 size={14} className="animate-spin" aria-hidden="true" /> {M.loading}
          </p>
        )}
        {q.status === 'error' && (
          <div className="rounded-2xl border border-red-100 bg-red-50 p-4 text-center">
            <p className="mb-2 text-sm text-red-700">{M.listError}</p>
            <button type="button" onClick={q.retry} className="rounded-xl bg-[#7a0d0d] px-4 py-2 text-xs font-black text-white">{M.retry}</button>
          </div>
        )}
        {q.status === 'ready' && q.items.length === 0 && (
          <p className="rounded-2xl border border-dashed border-[#e8dcc4] bg-white/60 p-8 text-center text-sm font-bold text-gray-400">{M.empty}</p>
        )}
        {q.status === 'ready' && q.items.length > 0 && (
          <ul className="space-y-3">
            {q.items.map((c) => (
              <MessageCard key={c.id} complaint={c} q={q} />
            ))}
          </ul>
        )}
        {q.status === 'ready' && q.hasMore && (
          <button type="button" onClick={q.loadMore} disabled={q.loadingMore} className="mx-auto mt-4 flex items-center gap-1.5 rounded-xl border border-[#e8dcc4] bg-white px-4 py-2 text-xs font-black text-[#7a0d0d] transition hover:bg-[#faf3e7] disabled:opacity-50">
            {q.loadingMore && <Loader2 size={12} className="animate-spin" aria-hidden="true" />}
            {M.loadMore}
          </button>
        )}
      </div>
    </DrawerShell>
  )
}

function MessageCard({ complaint: c, q }: { complaint: Complaint; q: UseSenderComplaints }) {
  const expanded = q.expandedId === c.id
  const [confirming, setConfirming] = useState(false)
  const [draft, setDraft] = useState('')
  const detail = expanded ? q.detail : null

  useEffect(() => {
    setDraft('')
  }, [detail?.id, detail?.thread.length])

  return (
    <li className={`overflow-hidden rounded-2xl bg-white ring-1 transition ${expanded ? 'ring-[#7a0d0d]/30' : 'ring-[#efe3cc]'}`}>
      <button
        type="button"
        onClick={() => q.toggle(c.id)}
        aria-expanded={expanded}
        aria-label={`${expanded ? M.collapse : M.expand} #${c.id}`}
        className="flex w-full items-start gap-3 p-4 text-right transition hover:bg-[#fffaf1]"
      >
        <div className="min-w-0 flex-1">
          <div className="mb-1.5 flex flex-wrap items-center gap-2">
            <TypePill type={c.type} />
            <StatusPill status={c.status} />
            <span className="flex items-center gap-1 text-[11px] font-bold text-gray-400">
              <CalendarDays size={11} aria-hidden="true" />
              <span dir="ltr">{c.created_at?.slice(0, 10) ?? '—'}</span>
            </span>
            {c.order_id != null && (
              <span className="flex items-center gap-1 text-[11px] font-bold text-gray-400">
                <Package size={11} aria-hidden="true" /> {M.relatedOrder(c.order_id)}
              </span>
            )}
          </div>
          <p className={`text-sm leading-relaxed text-gray-700 ${expanded ? '' : 'line-clamp-2'}`}>{c.body}</p>
        </div>
        <ChevronDown size={16} className={`mt-1 shrink-0 text-gray-400 transition ${expanded ? 'rotate-180' : ''}`} aria-hidden="true" />
      </button>

      {expanded && (
        <div className="border-t border-[#f3ead9] p-4">
          {q.detailStatus === 'loading' && (
            <p className="flex items-center gap-2 text-sm text-gray-500">
              <Loader2 size={14} className="animate-spin" aria-hidden="true" /> {M.loading}
            </p>
          )}
          {q.detailStatus === 'error' && <p className="text-sm text-red-600">{M.listError}</p>}

          {detail && q.detailStatus === 'idle' && (
            <>
              <p className="mb-2 text-xs font-black text-[#6b4f3a]">{M.thread}</p>
              <ul className="mb-4 space-y-2.5">
                {detail.thread.map((m) => {
                  const admin = m.author === 'admin'
                  return (
                    <li key={m.id} className={`flex ${admin ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-[85%] rounded-2xl px-3.5 py-2 text-sm leading-relaxed ${admin ? 'rounded-bl-md bg-[#7a0d0d] text-white' : 'rounded-br-md bg-gray-100 text-gray-800'}`}>
                        <span className={`mb-0.5 flex items-center gap-1 text-[10px] font-bold ${admin ? 'text-white/60' : 'text-gray-400'}`}>
                          {admin ? <ShieldCheck size={10} aria-hidden="true" /> : <User size={10} aria-hidden="true" />}
                          {admin ? M.authorAdmin : M.authorSender} · <span dir="ltr">{m.created_at?.slice(0, 10)}</span>
                        </span>
                        {m.body}
                      </div>
                    </li>
                  )
                })}
              </ul>

              <label className="mb-1.5 block text-xs font-black text-[#6b4f3a]" htmlFor={`cmp-reply-${c.id}`}>
                {M.replyLabel}
              </label>
              <textarea
                id={`cmp-reply-${c.id}`}
                rows={2}
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                placeholder={M.replyPlaceholder}
                className="mb-3 w-full resize-y rounded-xl border border-[#e8dcc4] p-3 text-sm outline-none transition focus:border-[#7a0d0d] focus:ring-4 focus:ring-[#7a0d0d]/10"
              />
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  disabled={q.busy || draft.trim() === ''}
                  aria-busy={q.busy}
                  onClick={() => void q.reply(draft)}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-[#7a0d0d] px-4 py-2 text-sm font-black text-white shadow-sm transition hover:bg-[#5a0909] disabled:opacity-50"
                >
                  <Send size={14} aria-hidden="true" />
                  {M.send}
                </button>
                {detail.status === 'open' ? (
                  <button type="button" disabled={q.busy} onClick={() => void q.changeStatus('resolved')} className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-50 px-3.5 py-2 text-sm font-black text-emerald-700 ring-1 ring-emerald-200 transition hover:bg-emerald-100 disabled:opacity-50">
                    <CheckCircle2 size={15} aria-hidden="true" />
                    {M.markResolved}
                  </button>
                ) : (
                  <button type="button" disabled={q.busy} onClick={() => void q.changeStatus('open')} className="inline-flex items-center gap-1.5 rounded-xl border border-[#e8dcc4] bg-white px-3.5 py-2 text-sm font-bold text-gray-600 transition hover:bg-[#faf3e7] disabled:opacity-50">
                    <RotateCcw size={14} aria-hidden="true" />
                    {M.reopen}
                  </button>
                )}
                <span className="flex-1" />
                {confirming ? (
                  <span className="flex flex-wrap items-center gap-2 rounded-xl bg-red-50 px-3 py-1.5 ring-1 ring-red-100">
                    <span className="text-xs font-bold text-red-700">{M.confirmRemove}</span>
                    <button type="button" disabled={q.busy} onClick={() => void q.remove(c.id)} className="rounded-lg bg-red-600 px-3 py-1.5 text-xs font-black text-white transition hover:bg-red-700 disabled:opacity-50">
                      {M.confirmRemoveYes}
                    </button>
                    <button type="button" onClick={() => setConfirming(false)} className="rounded-lg px-2 py-1.5 text-xs font-bold text-gray-600 hover:bg-white">
                      {M.cancel}
                    </button>
                  </span>
                ) : (
                  <button type="button" disabled={q.busy} onClick={() => setConfirming(true)} className="inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-sm font-bold text-red-600 transition hover:bg-red-50 disabled:opacity-50">
                    <Trash2 size={14} aria-hidden="true" />
                    {M.remove}
                  </button>
                )}
              </div>
            </>
          )}
        </div>
      )}
    </li>
  )
}
