import { useEffect, useRef } from 'react'
import DialogShell from '../shared/DialogShell'
import { withdrawalMessages as M } from './messages'
import type { ActionKind } from './types'

const COPY: Record<ActionKind, { title: string; body: string; cta: string; tone: string }> = {
  approve: {
    title: M.confirmApproveTitle,
    body: M.confirmApproveBody,
    cta: M.confirmApproveCta,
    tone: 'bg-emerald-600',
  },
  reject: {
    title: M.confirmRejectTitle,
    body: M.confirmRejectBody,
    cta: M.confirmRejectCta,
    tone: 'bg-red-600',
  },
  mark_paid: {
    title: M.confirmMarkPaidTitle,
    body: M.confirmMarkPaidBody,
    cta: M.confirmMarkPaidCta,
    tone: 'bg-blue-600',
  },
}

/** Confirm-only dialog (no reason field) for approve / reject / mark-paid (FR-018/022/026). */
export default function ConfirmDialog({
  kind,
  busy,
  onConfirm,
  onCancel,
}: {
  kind: ActionKind
  busy: boolean
  onConfirm: () => void
  onCancel: () => void
}) {
  const confirmRef = useRef<HTMLButtonElement>(null)
  useEffect(() => {
    confirmRef.current?.focus()
  }, [])

  const c = COPY[kind]
  return (
    <DialogShell label={c.title} onDismiss={onCancel}>
      <h2 className="mb-2 text-base font-black text-gray-800">{c.title}</h2>
      <p className="mb-6 text-sm text-gray-600">{c.body}</p>
      <div className="flex gap-3">
        <button
          type="button"
          onClick={onCancel}
          disabled={busy}
          className="flex-1 rounded-xl border border-gray-200 py-2.5 text-sm font-bold text-gray-600 disabled:opacity-50"
        >
          {M.cancel}
        </button>
        <button
          ref={confirmRef}
          type="button"
          onClick={onConfirm}
          disabled={busy}
          aria-busy={busy}
          className={`flex-1 rounded-xl py-2.5 text-sm font-black text-white disabled:opacity-50 ${c.tone}`}
        >
          {c.cta}
        </button>
      </div>
    </DialogShell>
  )
}
