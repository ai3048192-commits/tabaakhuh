import { MessageSquareWarning, Lightbulb, ChefHat, User, Bike } from 'lucide-react'
import { complaintMessages as M } from './messages'
import { safeUrl } from '../shared/safeUrl'
import type { Complaint, ComplaintStatus, SenderRole } from './types'

export function StatusPill({ status }: { status: ComplaintStatus }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-1 text-[11px] font-black ring-1 ${
        status === 'resolved'
          ? 'bg-emerald-50 text-emerald-700 ring-emerald-200'
          : 'bg-amber-50 text-amber-800 ring-amber-200'
      }`}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current" aria-hidden="true" />
      {M.statusLabels[status]}
    </span>
  )
}

export function TypePill({ type }: { type: Complaint['type'] }) {
  const Icon = type === 'suggestion' ? Lightbulb : MessageSquareWarning
  return (
    <span
      className={`inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2.5 py-1 text-[11px] font-black ${
        type === 'suggestion' ? 'bg-sky-50 text-sky-700' : 'bg-[#7a0d0d]/[0.08] text-[#7a0d0d]'
      }`}
    >
      <Icon size={12} aria-hidden="true" />
      {M.typeLabels[type]}
    </span>
  )
}

const ROLE_TONE: Record<SenderRole, string> = {
  customer: 'bg-gray-100 text-gray-700',
  cook: 'bg-[#e0a52e]/15 text-[#8f680d]',
  driver: 'bg-emerald-50 text-emerald-700',
}
const ROLE_ICON = { customer: User, cook: ChefHat, driver: Bike } as const

export function RolePill({ role }: { role: SenderRole | null }) {
  if (role == null || !(role in ROLE_TONE)) return null
  const Icon = ROLE_ICON[role]
  return (
    <span className={`inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2.5 py-1 text-[11px] font-black ${ROLE_TONE[role]}`}>
      <Icon size={12} aria-hidden="true" />
      {M.roleLabels[role]}
    </span>
  )
}

/** The sender's photo, or their initial on a tinted disc. */
export function SenderAvatar({ name, avatarUrl, size = 48 }: { name: string; avatarUrl: string | null; size?: number }) {
  const src = safeUrl(avatarUrl)
  const style = { width: size, height: size }
  if (src) {
    return <img src={src} alt="" style={style} className="shrink-0 rounded-2xl object-cover ring-1 ring-[#efe3cc]" />
  }
  return (
    <span style={style} className="grid shrink-0 place-items-center rounded-2xl bg-[#7a0d0d]/10 text-lg font-black text-[#7a0d0d]" aria-hidden="true">
      {name.trim().charAt(0) || '؟'}
    </span>
  )
}
