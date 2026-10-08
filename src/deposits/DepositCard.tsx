import { useState } from 'react'
import { AlertTriangle, Copy, ImageOff, Phone } from 'lucide-react'
import { cardCls } from '../shared/ui'
import { safeUrl } from '../shared/safeUrl'
import { formatAmount, formatDateTime } from '../withdrawals/format'
import DepositStatusBadge from './DepositStatusBadge'
import { depositMessages as M } from './messages'
import type { Deposit } from './types'

interface Party {
  name: string | null
  phone: string | null
}

function PartyInfo({ label, party }: { label: string; party: Party }) {
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

/** One deposit in the monitoring list — read-only. */
export default function DepositCard({
  item,
  onOpenProof,
}: {
  item: Deposit
  onOpenProof: (url: string) => void
}) {
  const d = item.deposit
  const proof = safeUrl(d.proof_image_url)
  const cancelled = item.order_status === 'cancelled'
  const disputed = d.reject_count >= 2 && d.status !== 'confirmed'
  const payTo = d.pay_to
  const cookName = item.cook_name ?? d.cook_name

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
              alt={M.proofAlt(item.order_number)}
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
          <h3 className="text-base font-black text-[#7a0d0d]">{M.order(item.order_number, d.order_id)}</h3>
          <div className="flex flex-wrap items-center gap-1.5">
            {disputed && (
              <span className="inline-flex items-center gap-1 rounded-full border border-red-300 bg-red-50 px-2.5 py-1 text-[11px] font-black text-red-700">
                <AlertTriangle size={13} aria-hidden="true" />
                {M.disputed}
              </span>
            )}
            <DepositStatusBadge status={d.status} />
          </div>
        </div>

        <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
          <p className="text-2xl font-black text-gray-900" dir="ltr">{formatAmount(d.amount)}</p>
          <p className="text-xs font-bold text-gray-500">{M.ofSubtotal(d.percent)}</p>
          {d.method && (
            <p className="text-xs font-bold text-gray-600">
              {M.sentVia} <span className="text-[#7a0d0d]">{M.method[d.method]}</span>
            </p>
          )}
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <PartyInfo label={M.customer} party={{ name: item.customer_name, phone: item.customer_phone }} />
          <PartyInfo label={M.cook} party={{ name: cookName, phone: item.cook_phone }} />
        </div>

        <div className="rounded-xl bg-[#faf3e7] px-3 py-2 text-xs text-gray-700">
          <p className="mb-1 font-black text-gray-500">{M.payTo}</p>
          {payTo && (payTo.vodafone_cash || payTo.instapay) ? (
            <ul className="space-y-0.5 font-bold">
              {payTo.vodafone_cash && (
                <li>{M.vodafoneCash}: <span dir="ltr">{payTo.vodafone_cash}</span></li>
              )}
              {payTo.instapay && (
                <li>{M.instapay}: <span dir="ltr">{payTo.instapay}</span></li>
              )}
            </ul>
          ) : (
            <p className="text-gray-400">{M.noAccount}</p>
          )}
        </div>

        <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-400">
          {d.submitted_at && (
            <p>{M.submittedAt}: <span dir="ltr">{formatDateTime(d.submitted_at)}</span></p>
          )}
          {d.confirmed_at && (
            <p>{M.confirmedAt}: <span dir="ltr">{formatDateTime(d.confirmed_at)}</span></p>
          )}
          {d.reject_count > 0 && (
            <p className="font-bold text-red-700">{M.rejectCount(d.reject_count)}</p>
          )}
        </div>

        {d.rejection_reason && d.reject_count > 0 && (
          <p className="rounded-xl bg-red-50 px-3 py-2 text-xs text-red-700">
            <span className="font-black">{M.rejectionReason}: </span>{d.rejection_reason}
          </p>
        )}
        {cancelled && (
          <p className="flex items-start gap-2 rounded-xl bg-amber-50 px-3 py-2 text-xs font-bold text-amber-800">
            <AlertTriangle size={14} className="mt-0.5 shrink-0" aria-hidden="true" />
            {M.orderCancelled}
          </p>
        )}
      </div>
    </article>
  )
}
