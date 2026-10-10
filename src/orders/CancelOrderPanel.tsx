import { useState } from 'react'
import { Ban, Loader2 } from 'lucide-react'
import { ApiError } from '../api/envelope'
import { cancelOrder } from './ordersApi'
import { orderMessages as M } from './messages'
import type { Order } from './types'

/** An order that is delivered, completed or already cancelled can no longer be cancelled. */
const FINISHED = new Set(['delivered', 'completed', 'cancelled'])

/**
 * Support's way out of a problem order (a dispute, a no-show, a stuck order):
 * cancels it from any live status. A first tap only opens the form — the
 * reason is required, and nothing is sent until it is confirmed.
 */
export default function CancelOrderPanel({
  order,
  onCancelled,
}: {
  order: Order
  onCancelled: () => void
}) {
  const [open, setOpen] = useState(false)
  const [reason, setReason] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (FINISHED.has(order.status)) return null

  const valid = reason.trim().length >= 3

  const submit = async () => {
    if (!valid || busy) return
    setBusy(true)
    setError(null)
    try {
      await cancelOrder(order.id, reason.trim())
      onCancelled()
    } catch (err) {
      // 409/422 carry the server's own Arabic message; anything else is generic.
      setError(
        err instanceof ApiError && err.status >= 400 && err.status < 500 && err.message
          ? err.message
          : M.cancelOrderError,
      )
      setBusy(false)
    }
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-white px-4 py-3 text-sm font-black text-red-700 ring-1 ring-red-200 transition hover:bg-red-50"
      >
        <Ban size={16} aria-hidden="true" /> {M.cancelOrderAction}
      </button>
    )
  }

  return (
    <div className="space-y-3 rounded-2xl bg-red-50 p-4 ring-1 ring-red-100">
      <p className="text-sm font-bold text-red-900">{M.cancelOrderWarning}</p>
      <label className="block text-xs font-black text-red-900" htmlFor="admin-cancel-reason">
        {M.cancelOrderReasonLabel}
      </label>
      <textarea
        id="admin-cancel-reason"
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        maxLength={500}
        rows={3}
        placeholder={M.cancelOrderReasonHint}
        className="w-full rounded-xl border border-red-200 bg-white p-3 text-sm outline-none focus:border-red-400"
      />
      {error && <p role="alert" className="text-xs font-bold text-red-700">{error}</p>}
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => void submit()}
          disabled={!valid || busy}
          className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-red-700 px-4 py-2.5 text-sm font-black text-white transition hover:bg-red-800 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {busy ? <Loader2 size={15} className="animate-spin" aria-hidden="true" /> : <Ban size={15} aria-hidden="true" />}
          {M.cancelOrderConfirm}
        </button>
        <button
          type="button"
          onClick={() => { setOpen(false); setError(null) }}
          disabled={busy}
          className="rounded-xl bg-white px-4 py-2.5 text-sm font-bold text-gray-700 ring-1 ring-gray-200 hover:bg-gray-50"
        >
          {M.cancelOrderBack}
        </button>
      </div>
    </div>
  )
}
