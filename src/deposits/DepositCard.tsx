import { useState } from 'react'
import { AlertTriangle, Copy, ImageOff, Phone } from 'lucide-react'
import { cardCls } from '../shared/ui'
import { safeUrl } from '../shared/safeUrl'
import { formatAmount, formatDateTime } from '../withdrawals/format'
import DepositStatusBadge from './DepositStatusBadge'
import { depositMessages as M } from './messages'
import type { Deposit, DepositAction, DepositParty } from './types'

function Party({ label, party }: { label: string; party: DepositParty }) {
  const [copied, setCopied] = useState(false)
  const copy = () => {
    if (!party.phone) return
    void navigator.clipboard?.writeText(party.phone).then(() => {
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1500)
    })
  }
  return (
    <div className="min-w-0">
      <p className="text-[11px] font-black text-gray-400">{label}</p>
      <p className="truncate text-sm font-bold text-gray-800">{party.name ?? '—'}</p>
      {party.phone && (
        <button
          type="button"
          onClick={copy}
          className="mt-0.5 inline-flex items-center gap-1 rounded-md text-xs font-bold text-[#7a0d0d] hover:underline"
          title={M.copy}
        >
          <Phone size={12} aria-hidden="true" />
          <span dir="ltr">{party.phone}</span>
          <Copy size={11} aria-hidden="true" />
          <span className="sr-only">{M.copy}</span>
          {copied && <span className="text-[10px] text-emerald-700">{M.copied}</span>}
        </button>
      )}
    </div>
  )
}

/** One deposit in the queue — the proof, the people, and the next step. */
export default function DepositCard({
  deposit,
  busy,
  onAction,
  onOpenProof,
}: {
  deposit: Deposit
  busy: boolean
  onAction: (action: DepositAction) => void
  onOpenProof: (url: string) => void
}) {
  const proof = safeUrl(deposit.proof_image_url)
  const cancelled = deposit.order_status === 'cancelled'
  const btn = 'rounded-xl border px-3.5 py-2 text-xs font-black transition disabled:opacity-50'

  return (
    <article className={`${cardCls} flex flex-col gap-4 p-5 sm:flex-row`}>
      <div className="shrink-0">
        {proof ? (
          <button
            type="button"
            onClick={() => onOpenProof(proof)}
            className="block overflow-hidden rounded-2xl ring-1 ring-[#efe3cc] transition hover:ring-[#7a0d0d]"
            title={M.openProof}
          >
            <img
              src={proof}
              alt={M.proofAlt(deposit.order_number)}
              className="h-40 w-full object-cover sm:h-36 sm:w-28"
              loading="lazy"
            />
          </button>
        ) : (
          <div className="grid h-24 w-full place-items-center rounded-2xl bg-[#faf3e7] text-gray-400 sm:h-36 sm:w-28">
            <span className="flex flex-col items-center gap-1 text-[11px] font-bold">
              <ImageOff size={18} aria-hidden="true" />
              {M.noProof}
            </span>
          </div>
        )}
      </div>

      <div className="min-w-0 flex-1 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-base font-black text-[#7a0d0d]">{M.order(deposit.order_number, deposit.order_id)}</h3>
          <DepositStatusBadge status={deposit.status} />
        </div>

        <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
          <p className="text-2xl font-black text-gray-900" dir="ltr">{formatAmount(deposit.amount)}</p>
          <p className="text-xs font-bold text-gray-500">{M.ofSubtotal(deposit.percentage)}</p>
          {deposit.method && (
            <p className="text-xs font-bold text-gray-600">
              {M.sentVia} <span className="text-[#7a0d0d]">{M.method[deposit.method]}</span>
            </p>
          )}
          {deposit.submitted_at && (
            <p className="text-xs text-gray-400">
              {M.submittedAt}: <span dir="ltr">{formatDateTime(deposit.submitted_at)}</span>
            </p>
          )}
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Party label={M.customer} party={deposit.customer} />
          <Party label={M.cook} party={deposit.cook} />
        </div>

        {deposit.rejection_reason && deposit.status === 'rejected' && (
          <p className="rounded-xl bg-red-50 px-3 py-2 text-xs text-red-700">
            <span className="font-black">{M.rejectionReason}: </span>{deposit.rejection_reason}
          </p>
        )}
        {deposit.payout_note && (
          <p className="rounded-xl bg-emerald-50 px-3 py-2 text-xs text-emerald-800">
            <span className="font-black">{M.payoutNote}: </span>{deposit.payout_note}
          </p>
        )}
        {cancelled && deposit.status !== 'rejected' && (
          <p className="flex items-start gap-2 rounded-xl bg-amber-50 px-3 py-2 text-xs font-bold text-amber-800">
            <AlertTriangle size={14} className="mt-0.5 shrink-0" aria-hidden="true" />
            {M.orderCancelled}
          </p>
        )}

        <div className="flex flex-wrap gap-2 pt-1">
          {deposit.status === 'submitted' && (
            <>
              <button type="button" disabled={busy} aria-busy={busy} onClick={() => onAction('verify')} className={`${btn} border-emerald-300 bg-emerald-50 text-emerald-800 hover:bg-emerald-100`}>
                {M.actionVerify}
              </button>
              <button type="button" disabled={busy} aria-busy={busy} onClick={() => onAction('reject')} className={`${btn} border-red-300 bg-red-50 text-red-700 hover:bg-red-100`}>
                {M.actionReject}
              </button>
            </>
          )}
          {deposit.status === 'verified' && !cancelled && (
            <button type="button" disabled={busy} aria-busy={busy} onClick={() => onAction('mark_paid')} className={`${btn} border-blue-300 bg-blue-50 text-blue-800 hover:bg-blue-100`}>
              {M.actionMarkPaid}
            </button>
          )}
        </div>
      </div>
    </article>
  )
}
