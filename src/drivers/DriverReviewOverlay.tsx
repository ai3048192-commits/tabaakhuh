import { useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { Check, X } from 'lucide-react'
import { driverMessages as M } from './messages'
import { buildDocs, DocTile, DriverDetails } from './driverDetail'
import type { DriverApplication } from './types'

interface Props {
  entry: DriverApplication
  cityName: string
  busy: boolean
  onView: (docs: ReturnType<typeof buildDocs>, index: number) => void
  onApprove: () => void
  onReject: () => void
  onClose: () => void
}

/**
 * The review screen (FR: US1–US3): opened from a queue row's eye action, it
 * shows the full application — identity/vehicle facts and the verification
 * images — and carries the approve / reject decision. Rendered as a full-screen
 * overlay so the queue keeps its scroll position underneath. The approve/reject
 * confirmation dialogs and the image viewer portal above this layer.
 */
export default function DriverReviewOverlay({
  entry,
  cityName,
  busy,
  onView,
  onApprove,
  onReject,
  onClose,
}: Props) {
  const docs = buildDocs(entry)
  const closeRef = useRef<HTMLButtonElement>(null)
  const restoreRef = useRef<Element | null>(null)

  useEffect(() => {
    restoreRef.current = document.activeElement
    closeRef.current?.focus()
    return () => {
      if (restoreRef.current instanceof HTMLElement) restoreRef.current.focus()
    }
  }, [])

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-stretch justify-center bg-black/40 p-0 sm:items-center sm:p-4"
      onKeyDown={(e) => {
        if (e.key === 'Escape') {
          e.preventDefault()
          onClose()
        }
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={M.reviewHeading}
        dir="rtl"
        className="flex h-full w-full max-w-3xl flex-col overflow-hidden bg-white font-['Tajawal'] shadow-2xl sm:h-auto sm:max-h-[92vh] sm:rounded-2xl"
      >
        <header className="flex items-center justify-between border-b border-gray-100 p-4">
          <div className="min-w-0">
            <p className="text-[11px] font-bold text-gray-400">
              {M.reviewHeading}
              {entry.name && entry.name.trim() ? ` · ${M.driverLabel(entry.id)}` : ''}
            </p>
            <h2 className="truncate text-base font-black text-gray-800">
              {M.driverName(entry.name, entry.id)}
            </h2>
          </div>
          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
            aria-label={M.closeReview}
            className="shrink-0 rounded-lg p-2 text-gray-400 hover:bg-gray-50 hover:text-gray-700"
          >
            <X size={18} aria-hidden="true" />
          </button>
        </header>

        <div className="flex-1 overflow-y-auto p-5">
          <section className="mb-5">
            <DriverDetails entry={entry} cityName={cityName} />
          </section>

          <section>
            <h3 className="mb-2 text-xs font-bold text-gray-400">{M.fieldDocuments}</h3>
            <div className="grid grid-cols-3 gap-2">
              {docs.map((doc, i) => (
                <DocTile key={doc.kind} doc={doc} onOpen={() => onView(docs, i)} />
              ))}
            </div>
          </section>
        </div>

        <footer className="flex gap-3 border-t border-gray-100 p-4">
          <button
            type="button"
            onClick={onApprove}
            disabled={busy}
            aria-busy={busy}
            className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-green-600 py-2.5 text-sm font-black text-white disabled:opacity-50"
          >
            <Check size={16} aria-hidden="true" />
            {M.approve}
          </button>
          <button
            type="button"
            onClick={onReject}
            disabled={busy}
            aria-busy={busy}
            className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-[#7a0d0d] py-2.5 text-sm font-black text-white disabled:opacity-50"
          >
            <X size={16} aria-hidden="true" />
            {M.reject}
          </button>
        </footer>
      </div>
    </div>,
    document.body,
  )
}
