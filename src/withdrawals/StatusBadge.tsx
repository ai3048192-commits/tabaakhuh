import { Clock, CheckCircle2, XCircle, BadgeCheck, type LucideIcon } from 'lucide-react'
import { withdrawalMessages as M } from './messages'
import type { WithdrawalStatus } from './types'

const ICONS: Record<WithdrawalStatus, LucideIcon> = {
  pending: Clock,
  approved: CheckCircle2,
  rejected: XCircle,
  paid: BadgeCheck,
}

const LABELS: Record<WithdrawalStatus, string> = {
  pending: M.statusPending,
  approved: M.statusApproved,
  rejected: M.statusRejected,
  paid: M.statusPaid,
}

const TONE: Record<WithdrawalStatus, string> = {
  pending: 'border-amber-300 bg-amber-50 text-amber-800',
  approved: 'border-blue-300 bg-blue-50 text-blue-800',
  rejected: 'border-red-300 bg-red-50 text-red-700 ring-1 ring-red-200',
  paid: 'border-emerald-300 bg-emerald-50 text-emerald-800',
}

/** Status chip: icon + label, never colour-only (FR-003 / FR-040 / SC-003). */
export default function StatusBadge({ status }: { status: WithdrawalStatus }) {
  const Icon = ICONS[status]
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-lg border px-2 py-1 text-xs font-bold ${TONE[status]}`}
    >
      <Icon size={13} aria-hidden="true" />
      {LABELS[status]}
    </span>
  )
}
