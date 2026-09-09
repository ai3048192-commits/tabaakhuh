import { useEffect, useRef, type ReactNode } from 'react'
import { createPortal } from 'react-dom'

/**
 * Modal shell for the approve/reject/confirm dialogs: portal to `<body>`,
 * backdrop, `role="dialog"` + `aria-modal`, `Esc` to dismiss, a lightweight
 * focus trap, and focus restore to whatever was focused before it opened.
 *
 * Feature-neutral. Shared by cook-review, driver-review, and cities-management.
 * (`src/review/DialogShell.tsx` is kept as a one-line re-export of this file.)
 */
export default function DialogShell({
  label,
  onDismiss,
  children,
  padded = true,
  size = 'sm',
}: {
  label: string
  onDismiss: () => void
  children: ReactNode
  /** `false` lets the content own its padding (e.g. an edge-to-edge header). */
  padded?: boolean
  size?: 'sm' | 'md'
}) {
  const boxRef = useRef<HTMLDivElement>(null)
  const restoreRef = useRef<Element | null>(null)

  useEffect(() => {
    restoreRef.current = document.activeElement
    return () => {
      if (restoreRef.current instanceof HTMLElement) restoreRef.current.focus()
    }
  }, [])

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      e.preventDefault()
      onDismiss()
      return
    }
    if (e.key !== 'Tab') return
    const f = boxRef.current?.querySelectorAll<HTMLElement>(
      'button, a[href], input, textarea, [tabindex]:not([tabindex="-1"])',
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
      className="fixed inset-0 z-[70] flex items-center justify-center bg-black/50 p-4"
      onKeyDown={onKeyDown}
    >
      <div
        ref={boxRef}
        role="dialog"
        aria-modal="true"
        aria-label={label}
        dir="rtl"
        className={[
          'w-full overflow-hidden bg-white shadow-2xl font-[\'Tajawal\']',
          size === 'md' ? 'max-w-md' : 'max-w-sm',
          padded ? 'rounded-2xl p-6' : 'rounded-3xl',
        ].join(' ')}
      >
        {children}
      </div>
    </div>,
    document.body,
  )
}
