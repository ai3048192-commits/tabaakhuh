import { BadgeCheck, CheckCircle2, Clock, Hourglass, XCircle, type LucideIcon } from 'lucide-react'
import { depositMessages as M } from './messages'
import type { DepositStatus } from './types'

const ICONS: Record<DepositStatus, LucideIcon> = {
  awaiting_payment: Hourglass,
  submitted: Clock,
  rejected: XCircle,
  verified: CheckCircle2,
  paid_to_cook: BadgeCheck,
}

const TONE: Record<DepositStatus, string> = {
  awaiting_payment: 'border-gray-300 bg-gray-50 text-gray-600',
  submitted: 'border-amber-300 bg-amber-50 text-amber-800',
  rejected: 'border-red-300 bg-red-50 text-red-700',
  verified: 'border-blue-300 bg-blue-50 text-blue-800',
  paid_to_cook: 'border-emerald-300 bg-emerald-50 text-emerald-800',
}

/** Status chip: icon + label, never colour-only. */
export default function DepositStatusBadge({ status }: { status: DepositStatus }) {
  const Icon = ICONS[status]
  return (
    <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-black ${TONE[status]}`}>
      <Icon size={13} aria-hidden="true" />
      {M.status[status]}
    </span>
  )
}
