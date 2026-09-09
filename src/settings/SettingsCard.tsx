import type { ReactNode } from 'react'
import { settingsMessages as M } from './messages'

/** A settings section card with a title, a brand accent line, and an optional "pending backend" pill. */
export default function SettingsCard({
  title,
  icon,
  pending = false,
  children,
}: {
  title: string
  icon: ReactNode
  pending?: boolean
  children: ReactNode
}) {
  return (
    <section className="relative overflow-hidden rounded-3xl border border-gray-100 bg-white p-6 shadow-sm">
      <div className="absolute right-0 top-0 h-1 w-full bg-gradient-to-l from-[#7a0d0d] to-orange-300" />
      <div className="mb-5 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="rounded-xl bg-orange-50 p-2 text-[#7a0d0d]">{icon}</span>
          <h2 className="text-lg font-black text-[#7a0d0d]">{title}</h2>
        </div>
        {pending && (
          <span className="rounded-full border border-amber-300 bg-amber-50 px-2.5 py-1 text-[10px] font-bold text-amber-700">
            {M.pendingBackend}
          </span>
        )}
      </div>
      <div className={pending ? 'pointer-events-none opacity-60' : undefined}>{children}</div>
    </section>
  )
}
