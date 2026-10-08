import { useEffect, useId, useRef, useState } from 'react'
import DialogShell from '../shared/DialogShell'
import { fieldCls, labelCls } from '../shared/ui'
import { formatAmount } from '../withdrawals/format'
import { depositMessages as M } from './messages'
import type { Deposit, DepositAction } from './types'

const TONE: Record<DepositAction, string> = {
  verify: 'bg-emerald-600 hover:bg-emerald-700',
  reject: 'bg-red-600 hover:bg-red-700',
  mark_paid: 'bg-blue-600 hover:bg-blue-700',
}

/**
 * Confirms one admin decision on a deposit. A rejection needs a reason (the
 * customer reads it); a payout takes an optional reference note.
 */
export default function ActionDialog({
  deposit,
  action,
  busy,
  onConfirm,
  onCancel,
}: {
  deposit: Deposit
  action: DepositAction
  busy: boolean
  onConfirm: (note: string | null) => void
  onCancel: () => void
}) {
  const copy = M.dialog[action]
  const [note, setNote] = useState('')
  const [touched, setTouched] = useState(false)
  const fieldId = useId()
  const errId = useId()
  const firstRef = useRef<HTMLTextAreaElement & HTMLButtonElement>(null)

  useEffect(() => {
    firstRef.current?.focus()
  }, [])

  const hasField = action !== 'verify'
  const reasonError = action === 'reject' && note.trim().length < 3 ? M.reasonTooShort : null

  const submit = () => {
    setTouched(true)
    if (reasonError) return
    onConfirm(hasField && note.trim() !== '' ? note.trim() : null)
  }

  return (
    <DialogShell label={copy.title} onDismiss={onCancel} size="md">
      <h2 className="mb-2 text-lg font-black text-[#7a0d0d]">{copy.title}</h2>
      <p className="mb-1 text-sm font-black text-gray-800">
        {M.order(deposit.order_number, deposit.order_id)} — <span dir="ltr">{formatAmount(deposit.amount)}</span>
      </p>
      <p className="mb-4 text-sm text-gray-600">
        {action === 'mark_paid' ? `${copy.body} ${M.sendToCookHint(deposit.cook.phone)}` : copy.body}
      </p>

      {hasField && 'field' in copy && (
        <div className="mb-4 flex flex-col gap-1">
          <label htmlFor={fieldId} className={labelCls}>{copy.field}</label>
          <textarea
            id={fieldId}
            ref={firstRef}
            rows={3}
            maxLength={500}
            value={note}
            placeholder={copy.placeholder}
            onChange={(e) => setNote(e.target.value)}
            aria-invalid={touched && reasonError ? true : undefined}
            aria-describedby={touched && reasonError ? errId : undefined}
            className={`${fieldCls} resize-none`}
          />
          <p id={errId} aria-live="polite" className="min-h-[0.9rem] text-[11px] text-red-600">
            {touched && reasonError ? reasonError : ''}
          </p>
        </div>
      )}

      <div className="flex gap-3">
        <button
          type="button"
          onClick={onCancel}
          disabled={busy}
          className="flex-1 rounded-xl border border-[#e8dcc4] py-2.5 text-sm font-bold text-gray-600 transition hover:bg-[#faf3e7] disabled:opacity-50"
        >
          {M.cancel}
        </button>
        <button
          ref={hasField ? undefined : firstRef}
          type="button"
          onClick={submit}
          disabled={busy}
          aria-busy={busy}
          className={`flex-1 rounded-xl py-2.5 text-sm font-black text-white transition disabled:opacity-50 ${TONE[action]}`}
        >
          {copy.cta}
        </button>
      </div>
    </DialogShell>
  )
}
