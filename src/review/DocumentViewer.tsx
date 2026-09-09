import { useCallback, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { X, ChevronLeft, ChevronRight, ZoomIn, ZoomOut, RotateCcw } from 'lucide-react'
import { reviewMessages, type ReviewMessages } from './messages'
import type { DocumentRef } from './types'

interface Props {
  docs: DocumentRef[]
  index: number
  onIndexChange: (next: number) => void
  onClose: () => void
  /** Per-feature overrides for the viewer chrome strings; defaults to `reviewMessages`. */
  strings?: Partial<ReviewMessages>
}

const MIN_ZOOM = 1
const MAX_ZOOM = 4
const STEP = 0.5

/**
 * In-dashboard overlay for verification images (and, for cook-review, the signed
 * contract PDF) — FR-004 / FR-004a. The raw file URL is never navigated to as a
 * top-level page; nothing is copied to storage (FR-031). Image zoom is
 * CSS-transform only. Keyboard: Esc closes, Arrow keys move between the
 * application's documents (RTL-aware), +/-/0 zoom. Focus is trapped and restored.
 *
 * Shared by the cook-review and driver-review features.
 */
export default function DocumentViewer({ docs, index, onIndexChange, onClose, strings }: Props) {
  const M = strings ? { ...reviewMessages, ...strings } : reviewMessages
  const current = docs[index] as DocumentRef | undefined
  const boxRef = useRef<HTMLDivElement>(null)
  const closeRef = useRef<HTMLButtonElement>(null)
  const restoreRef = useRef<Element | null>(null)
  const [zoom, setZoom] = useState(1)

  useEffect(() => {
    restoreRef.current = document.activeElement
    closeRef.current?.focus()
    return () => {
      if (restoreRef.current instanceof HTMLElement) restoreRef.current.focus()
    }
  }, [])

  useEffect(() => {
    setZoom(1)
  }, [index])

  const go = useCallback(
    (delta: number) => {
      const n = index + delta
      if (n >= 0 && n < docs.length) onIndexChange(n)
    },
    [index, docs.length, onIndexChange],
  )

  const onKeyDown = (e: React.KeyboardEvent) => {
    switch (e.key) {
      case 'Escape':
        e.preventDefault()
        onClose()
        break
      case 'ArrowLeft': // RTL: visual "next"
        e.preventDefault()
        go(1)
        break
      case 'ArrowRight':
        e.preventDefault()
        go(-1)
        break
      case '+':
      case '=':
        setZoom((z) => Math.min(MAX_ZOOM, z + STEP))
        break
      case '-':
        setZoom((z) => Math.max(MIN_ZOOM, z - STEP))
        break
      case '0':
        setZoom(1)
        break
      case 'Tab': {
        const f = boxRef.current?.querySelectorAll<HTMLElement>('button, a[href], iframe')
        if (!f || f.length === 0) break
        const first = f[0]
        const last = f[f.length - 1]
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault()
          last.focus()
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault()
          first.focus()
        }
        break
      }
    }
  }

  const isImage = current && current.kind !== 'contract' && current.url !== null

  return createPortal(
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 p-4"
      onKeyDown={onKeyDown}
    >
      <div
        ref={boxRef}
        role="dialog"
        aria-modal="true"
        aria-label={current?.label ?? M.docContract}
        dir="rtl"
        className="flex max-h-[90vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl bg-white font-['Tajawal']"
      >
        <div className="flex items-center justify-between border-b p-4">
          <h2 className="text-sm font-bold text-gray-800">{current?.label}</h2>
          <div className="flex items-center gap-1">
            {isImage && (
              <>
                <button
                  type="button"
                  onClick={() => setZoom((z) => Math.max(MIN_ZOOM, z - STEP))}
                  aria-label={M.viewerZoomOut}
                  className="p-2 text-gray-500 hover:text-gray-900"
                >
                  <ZoomOut size={18} aria-hidden="true" />
                </button>
                <button
                  type="button"
                  onClick={() => setZoom(1)}
                  aria-label={M.viewerZoomReset}
                  className="p-2 text-gray-500 hover:text-gray-900"
                >
                  <RotateCcw size={18} aria-hidden="true" />
                </button>
                <button
                  type="button"
                  onClick={() => setZoom((z) => Math.min(MAX_ZOOM, z + STEP))}
                  aria-label={M.viewerZoomIn}
                  className="p-2 text-gray-500 hover:text-gray-900"
                >
                  <ZoomIn size={18} aria-hidden="true" />
                </button>
              </>
            )}
            <button
              ref={closeRef}
              type="button"
              onClick={onClose}
              aria-label={M.viewerClose}
              className="p-2 text-gray-500 hover:text-gray-900"
            >
              <X size={18} aria-hidden="true" />
            </button>
          </div>
        </div>

        <div className="flex min-h-[240px] flex-1 items-center justify-center overflow-auto bg-gray-50 p-2">
          {!current || current.url === null ? (
            <p className="p-8 text-sm text-gray-500">{M.docUnavailable}</p>
          ) : current.kind === 'contract' ? (
            <div className="flex h-[70vh] w-full flex-col">
              <iframe title={M.docContract} src={current.url} className="w-full flex-1 border-0" />
              <a
                href={current.url}
                target="_blank"
                rel="noreferrer"
                className="p-2 text-center text-xs text-blue-600 underline"
              >
                {M.openInNewTab}
              </a>
            </div>
          ) : (
            <img
              src={current.url}
              alt={current.label}
              referrerPolicy="no-referrer"
              style={{ transform: `scale(${zoom})` }}
              className="max-w-full origin-center transition-transform"
            />
          )}
        </div>

        {docs.length > 1 && (
          <div className="flex items-center justify-between border-t p-3 text-sm">
            <button
              type="button"
              onClick={() => go(-1)}
              disabled={index === 0}
              aria-label={M.viewerPrev}
              className="flex items-center gap-1 px-2 py-1 text-gray-600 disabled:opacity-40"
            >
              <ChevronRight size={16} aria-hidden="true" />
              {M.viewerPrev}
            </button>
            {/* One LTR text node: inside the RTL dialog, three separate children
                ({n} / {total}) let the bidi algorithm swap the numbers, so "1 / 5"
                renders as "5 / 1". */}
            <span className="text-gray-400" dir="ltr">
              {`${index + 1} / ${docs.length}`}
            </span>
            <button
              type="button"
              onClick={() => go(1)}
              disabled={index === docs.length - 1}
              aria-label={M.viewerNext}
              className="flex items-center gap-1 px-2 py-1 text-gray-600 disabled:opacity-40"
            >
              {M.viewerNext}
              <ChevronLeft size={16} aria-hidden="true" />
            </button>
          </div>
        )}
      </div>
    </div>,
    document.body,
  )
}
