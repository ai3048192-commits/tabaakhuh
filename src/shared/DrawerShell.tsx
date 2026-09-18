import { useEffect, useRef, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'

/**
 * Side-panel shell — the drawer counterpart to `DialogShell`, with the same
 * accessibility contract: portal to `<body>`, backdrop, `role="dialog"` +
 * `aria-modal`, `Esc` to dismiss, a lightweight focus trap, and focus restore
 * to whatever was focused before it opened.
 *
 * Anchored to the viewport's left edge by default: the app's nav sidebar owns
 * the right edge under RTL, so a left-anchored drawer never covers the menu.
 * Full height, so a long list scrolls inside the panel rather than the page.
 *
 * Feature-neutral. The children own the panel's internal layout — give the
 * scrolling region `flex-1 overflow-y-auto` to pin a header and footer.
 */
export default function DrawerShell({
  label,
  onDismiss,
  children,
  side = 'left',
  width = 'md',
}: {
  label: string
  onDismiss: () => void
  children: ReactNode
  side?: 'left' | 'right'
  width?: 'sm' | 'md'
}) {
  const boxRef = useRef<HTMLDivElement>(null)
  const restoreRef = useRef<Element | null>(null)
  // Starts off-screen and slides in on the first paint after mount. Purely
  // decorative — the panel is in the DOM and focusable either way.
  const [shown, setShown] = useState(false)

  useEffect(() => {
    restoreRef.current = document.activeElement
    const id = requestAnimationFrame(() => setShown(true))
    return () => {
      cancelAnimationFrame(id)
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

  const closed = side === 'left' ? '-translate-x-full' : 'translate-x-full'

  return createPortal(
    <div className="fixed inset-0 z-[70]" onKeyDown={onKeyDown}>
      <div
        className={`absolute inset-0 bg-black/50 transition-opacity duration-300 ${
          shown ? 'opacity-100' : 'opacity-0'
        }`}
        onClick={onDismiss}
        aria-hidden="true"
      />
      <div
        ref={boxRef}
        role="dialog"
        aria-modal="true"
        aria-label={label}
        dir="rtl"
        className={[
          "absolute inset-y-0 flex h-full w-full flex-col bg-white shadow-2xl font-['Tajawal']",
          'transition-transform duration-300 ease-out',
          side === 'left' ? 'left-0' : 'right-0',
          width === 'md' ? 'max-w-md' : 'max-w-sm',
          shown ? 'translate-x-0' : closed,
        ].join(' ')}
      >
        {children}
      </div>
    </div>,
    document.body,
  )
}
