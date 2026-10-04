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
    <section className="relative overflow-hidden rounded-3xl bg-white p-6 shadow-[0_20px_45px_-30px_rgba(122,13,13,0.35)] ring-1 ring-[#efe3cc]">
      <div className="mb-5 flex items-center justify-between gap-3 border-b border-[#f3ead9] pb-4">
        <div className="flex items-center gap-3">
          <span className="grid h-10 w-10 place-items-center rounded-2xl bg-gradient-to-br from-[#7a0d0d] to-[#9a1212] text-[#ffd27a] shadow-md shadow-[#7a0d0d]/20">{icon}</span>
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
