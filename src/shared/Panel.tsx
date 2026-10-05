import type { ReactNode } from 'react'
import type { LucideIcon } from 'lucide-react'
import { cardCls } from './ui'

/** A titled white card: icon chip + title (+ optional count and action). */
export default function Panel({
  title,
  icon: Icon,
  count,
  action,
  children,
  className = '',
}: {
  title: string
  icon?: LucideIcon
  count?: number
  action?: ReactNode
  children: ReactNode
  className?: string
}) {
  return (
    <section className={`${cardCls} p-5 md:p-6 ${className}`}>
      <div className="mb-5 flex items-center justify-between gap-3">
        <h2 className="flex items-center gap-2.5 font-black text-gray-900">
          {Icon && (
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-[#7a0d0d]/[0.07] text-[#7a0d0d]">
              <Icon size={17} aria-hidden="true" />
            </span>
          )}
          {title}
          {count != null && (
            <span className="rounded-full bg-[#faf3e7] px-2.5 py-0.5 text-xs font-black text-[#b68614]">{count}</span>
          )}
        </h2>
        {action}
      </div>
      {children}
    </section>
  )
}
