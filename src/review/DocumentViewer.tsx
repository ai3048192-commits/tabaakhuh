import { useCallback, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import {
  X, ChevronLeft, ChevronRight, ZoomIn, ZoomOut, RotateCcw, ExternalLink, AlertTriangle,
} from 'lucide-react'
import { safeUrl } from '../shared/safeUrl'
import { reviewMessages, type ReviewMessages } from './messages'
import { resolveMedia } from './documentMedia'
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
 * How long a framed document may take before the viewer stops waiting and
 * offers the new-tab route instead. Generous: a large PDF over a slow link
 * should still win the race.
 */
const FRAME_TIMEOUT_MS = 8000

/** Shown in place of a document that could not be displayed inline. */
function DocFailure({ url, M }: { url: string; M: ReviewMessages }) {
  return (
    <div className="flex max-w-sm flex-col items-center gap-3 p-8 text-center">
      <AlertTriangle size={28} className="text-amber-500" aria-hidden="true" />
      <p className="text-sm font-bold text-gray-700">{M.docLoadFailed}</p>
      <p className="text-xs leading-relaxed text-gray-500">{M.docLoadFailedHint}</p>
      <a
        href={safeUrl(url)}
        target="_blank"
        rel="noreferrer"
        className="flex items-center gap-1.5 rounded-xl bg-[#7a0d0d] px-4 py-2 text-xs font-black text-white hover:bg-[#9a1212]"
      >
        <ExternalLink size={14} aria-hidden="true" />
        {M.openInNewTab}
      </a>
    </div>
  )
}

/**
 * In-dashboard overlay for verification images and the signed contract —
 * FR-004 / FR-004a. The raw file URL is never navigated to as a top-level page;
 * nothing is copied to storage (FR-031). Image zoom is CSS-transform only.
 * Keyboard: Esc closes, Arrow keys move between the application's documents
 * (RTL-aware), +/-/0 zoom. Focus is trapped and restored.
 *
 * How each document renders is decided by `resolveMedia`, not by its kind: a
 * contract may come back from the backend as a PDF *or* as a scanned photo, and
 * framing a photo (or showing a PDF in an `<img>`) yields a blank box.
 *
 * Inline display can also fail for reasons no detection can see — a
 * cross-origin frame that loads a 401 page looks exactly like one that loaded
 * the file. So the new-tab route is always on screen for framed documents,
 * rather than appearing only when a heuristic fires.
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
  // Inline-display failures, per document.
  const [imgFailed, setImgFailed] = useState(false)
  const [frameLoaded, setFrameLoaded] = useState(false)
  const [frameTimedOut, setFrameTimedOut] = useState(false)

  useEffect(() => {
    restoreRef.current = document.activeElement
    closeRef.current?.focus()
    return () => {
      if (restoreRef.current instanceof HTMLElement) restoreRef.current.focus()
    }
  }, [])

  useEffect(() => {
    setZoom(1)
    setImgFailed(false)
    setFrameLoaded(false)
    setFrameTimedOut(false)
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

  const media = current ? resolveMedia(current) : 'unknown'
  // Zoom applies to the image renderer only.
  const isImage = media === 'image' && !imgFailed

  // A framed document that never fires `load` is stuck — stop showing an empty
  // rectangle and hand over the new-tab route. (A frame that loads an error
  // page fires `load` normally and cannot be caught here; that is what the
  // always-visible link below is for.)
  const framedUrl = media === 'image' ? null : (current?.url ?? null)
  useEffect(() => {
    if (framedUrl === null || frameLoaded) return
    const t = window.setTimeout(() => setFrameTimedOut(true), FRAME_TIMEOUT_MS)
    return () => window.clearTimeout(t)
  }, [framedUrl, frameLoaded])

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
          ) : media === 'image' ? (
            imgFailed ? (
              <DocFailure url={current.url} M={M} />
            ) : (
              <img
                src={current.url}
                alt={current.label}
                referrerPolicy="no-referrer"
                onError={() => setImgFailed(true)}
                style={{ transform: `scale(${zoom})` }}
                className="max-w-full origin-center transition-transform"
              />
            )
          ) : (
            <div className="flex h-[70vh] w-full flex-col">
              {frameTimedOut ? (
                <div className="flex flex-1 items-center justify-center">
                  <DocFailure url={current.url} M={M} />
                </div>
              ) : (
                <iframe
                  // Remount on navigation so a stale frame never lingers.
                  key={current.url}
                  title={current.label}
                  src={safeUrl(current.url)}
                  onLoad={() => setFrameLoaded(true)}
                  onError={() => setFrameTimedOut(true)}
                  className="w-full flex-1 border-0"
                />
              )}
              {/* Always on screen, never behind a heuristic: a cross-origin
                  frame that loaded a 401 page reports success just like a real
                  one, so the admin always needs this way out. */}
              <div className="flex shrink-0 items-center justify-center gap-2 border-t border-gray-200 p-2 text-xs">
                {!frameTimedOut && <span className="text-gray-500">{M.docNotShowing}</span>}
                <a
                  href={safeUrl(current.url)}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-1 font-bold text-blue-600 underline"
                >
                  <ExternalLink size={12} aria-hidden="true" />
                  {M.openInNewTab}
                </a>
              </div>
            </div>
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
