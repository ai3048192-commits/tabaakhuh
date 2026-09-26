import { useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { Check, X, FileText } from 'lucide-react'
import { cookMessages as M } from './messages'
import { buildDocs, DocTile, CookDetails, formatDate } from './cookDetail'
import type { PendingCookEntry } from './types'

interface Props {
  entry: PendingCookEntry
  cityName: string
  busy: boolean
  onView: (docs: ReturnType<typeof buildDocs>, index: number) => void
  onApprove: () => void
  onReject: () => void
  onClose: () => void
}

/**
 * The review screen (FR: US1–US3): opened from a queue row's eye action, it
 * shows the full application — submitted facts, the verification images, and the
 * signed contract — and carries the approve / reject decision. Rendered as a
 * full-screen overlay so the queue keeps its scroll position underneath. The
 * approve/reject confirmation dialogs and the document viewer portal above it.
 */
export default function CookReviewOverlay({
  entry,
  cityName,
  busy,
  onView,
  onApprove,
  onReject,
  onClose,
}: Props) {
  const p = entry.profile
  const named = Boolean(p.name && p.name.trim())
  const docs = buildDocs(entry)
  const imageDocs = docs.filter((d) => d.kind !== 'contract')
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
              {named ? ` · ${p.store_name}` : ''}
            </p>
            <h2 className="truncate text-base font-black text-gray-800">
              {M.cookName(p.name, p.store_name)}
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
            <CookDetails entry={entry} cityName={cityName} />
          </section>

          <section className="mb-5">
            <h3 className="mb-2 text-xs font-bold text-gray-400">{M.fieldDocuments}</h3>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {imageDocs.map((doc, i) => (
                <DocTile key={doc.kind} doc={doc} onOpen={() => onView(docs, i)} />
              ))}
            </div>
          </section>

          <div className="rounded-lg bg-[#fcf8f0] p-3 text-xs">
            {entry.contract ? (
              <div className="flex items-center justify-between gap-2">
                <span className="text-gray-600">
                  {M.contractLine(
                    entry.contract.template_version,
                    formatDate(entry.contract.signed_at),
                  )}
                </span>
                <button
                  type="button"
                  onClick={() => onView(docs, docs.length - 1)}
                  className="flex items-center gap-1 font-bold text-[#7a0d0d]"
                >
                  <FileText size={14} aria-hidden="true" />
                  {M.openContract}
                </button>
              </div>
            ) : (
              <span className="text-gray-500">{M.noContractSigned}</span>
            )}
          </div>
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
