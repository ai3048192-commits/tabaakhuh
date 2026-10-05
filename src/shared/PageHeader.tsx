import type { ReactNode } from 'react'

/**
 * The dark-red banner every admin screen opens with: title, one-line
 * description, and the screen's main actions on the opposite side.
 */
export default function PageHeader({
  title,
  subtitle,
  eyebrow,
  actions,
  children,
}: {
  title: string
  subtitle?: ReactNode
  /** Small chip above the title (e.g. today's date). */
  eyebrow?: ReactNode
  actions?: ReactNode
  /** Rendered under the title row (e.g. tabs). */
  children?: ReactNode
}) {
  return (
    <div className="relative mb-6 overflow-hidden rounded-[2rem] bg-gradient-to-l from-[#7a0d0d] via-[#5e0a0a] to-[#2e0404] p-6 text-white shadow-[0_30px_60px_-30px_rgba(122,13,13,0.8)] md:p-8">
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.07] [background-image:radial-gradient(circle,#fff_1.5px,transparent_1.5px)] [background-size:22px_22px]"
        aria-hidden="true"
      />
      <div className="pointer-events-none absolute -left-16 -top-20 h-64 w-64 rounded-full bg-[#e0a52e]/15 blur-3xl" aria-hidden="true" />
      <div className="relative flex flex-wrap items-end justify-between gap-4">
        <div>
          {eyebrow && (
            <p className="mb-2 inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 text-[11px] font-bold text-[#ffd27a] ring-1 ring-white/10">
              {eyebrow}
            </p>
          )}
          <h1 className="text-2xl font-black md:text-3xl">{title}</h1>
          {subtitle && <div className="mt-1.5 text-sm text-white/70">{subtitle}</div>}
        </div>
        {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
      </div>
      {children && <div className="relative mt-6">{children}</div>}
    </div>
  )
}
