import { ChevronRight, ChevronLeft, ChevronsRight } from 'lucide-react'
import { orderMessages as M } from './messages'

/**
 * First / previous / next pager. RTL: "next" advances to a higher page number,
 * "previous" / "first" go back. Controls disable at the ends (FR-003 / FR-035).
 */
export default function Pagination({
  page,
  totalPages,
  total,
  onFirst,
  onPrev,
  onNext,
}: {
  page: number
  totalPages: number
  total: number
  onFirst: () => void
  onPrev: () => void
  onNext: () => void
}) {
  const atStart = page <= 1
  const atEnd = page >= totalPages
  const btn =
    'inline-flex items-center gap-1 rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs font-bold text-gray-700 disabled:opacity-40'

  return (
    <nav className="mt-4 flex flex-wrap items-center justify-between gap-3" aria-label={M.pageIndicator(page, totalPages)}>
      <p className="flex flex-wrap items-center gap-2 text-xs font-bold text-gray-500" dir="rtl">
        <span>{M.pageIndicator(page, totalPages)}</span>
        <span aria-hidden="true">·</span>
        <span>{M.totalInRange(total)}</span>
      </p>
      <div className="flex items-center gap-2">
        <button type="button" className={btn} onClick={onFirst} disabled={atStart}>
          <ChevronsRight size={14} aria-hidden="true" />
          {M.backToFirst}
        </button>
        <button type="button" className={btn} onClick={onPrev} disabled={atStart} aria-label="الصفحة السابقة">
          <ChevronRight size={14} aria-hidden="true" />
          السابق
        </button>
        <button type="button" className={btn} onClick={onNext} disabled={atEnd} aria-label="الصفحة التالية">
          التالي
          <ChevronLeft size={14} aria-hidden="true" />
        </button>
      </div>
    </nav>
  )
}
