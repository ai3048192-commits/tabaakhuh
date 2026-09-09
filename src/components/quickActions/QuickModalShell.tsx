import { useEffect, useRef, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { X } from 'lucide-react'

/**
 * Modal shell for the quick-action forms: portal, backdrop, `role="dialog"` +
 * `aria-modal`, `Esc` to dismiss, a lightweight focus trap and focus restore.
 * Wider than the shared `DialogShell` (`src/shared/DialogShell` is `max-w-sm`),
 * hence a local shell rather than editing the shared one.
 */
export default function QuickModalShell({
  title,
  onClose,
  children,
  maxWidth = 'max-w-2xl',
}: {
  title: string
  onClose: () => void
  children: ReactNode
  maxWidth?: string
}) {
  const boxRef = useRef<HTMLDivElement>(null)
  const restoreRef = useRef<Element | null>(null)

  useEffect(() => {
    restoreRef.current = document.activeElement
    boxRef.current?.querySelector<HTMLElement>(
      'input, select, textarea, button',
    )?.focus()
    return () => {
      if (restoreRef.current instanceof HTMLElement) restoreRef.current.focus()
    }
  }, [])

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      e.preventDefault()
      onClose()
      return
    }
    if (e.key !== 'Tab') return
    const f = boxRef.current?.querySelectorAll<HTMLElement>(
      'button, a[href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
    )
    if (!f || f.length === 0) return
    const first = f[0]
    const last = f[f.length - 1]
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault()
      last.focus()
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault()
      first.focus()
    }
  }

  return createPortal(
    <div
      className="fixed inset-0 z-[70] flex items-start justify-center overflow-y-auto bg-black/50 p-4 backdrop-blur-sm"
      onKeyDown={onKeyDown}
    >
      <div
        ref={boxRef}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        dir="rtl"
        className={`my-8 w-full ${maxWidth} rounded-[2rem] border border-[#e8dfc9] bg-[#fcf9f2] p-6 font-['Tajawal'] shadow-2xl md:p-8`}
      >
        <div className="mb-6 flex items-start justify-between">
          <h2 className="text-2xl font-black text-[#7a0d0d]">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="إغلاق"
            className="rounded-full p-2 text-gray-500 transition hover:bg-gray-200"
          >
            <X size={20} aria-hidden="true" />
          </button>
        </div>
        {children}
      </div>
    </div>,
    document.body,
  )
}
