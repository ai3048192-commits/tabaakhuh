import { ChevronRight, ChevronLeft } from 'lucide-react'
import { withdrawalMessages as M } from './messages'

/**
 * Page position + total, Previous/Next (disabled at the ends), and — when the
 * requested page is past the end — a single "back to first page" button (FR-016).
 */
export default function Pager({
  page,
  totalPages,
  total,
  beyondRange,
  onPage,
}: {
  page: number
  totalPages: number
  total: number
  beyondRange: boolean
  onPage: (n: number) => void
}) {
  const btn =
    'inline-flex items-center gap-1 rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs font-bold text-gray-700 disabled:opacity-40'

  if (beyondRange) {
    return (
      <nav className="mt-4 flex justify-center" aria-label={M.colActions}>
        <button type="button" className={btn} onClick={() => onPage(1)}>
          {M.backToFirstPage}
        </button>
      </nav>
    )
  }

  return (
    <nav
      className="mt-4 flex flex-wrap items-center justify-between gap-3"
      aria-label={M.pagerPosition(page, totalPages)}
    >
      <p className="flex flex-wrap items-center gap-2 text-xs font-bold text-gray-500" dir="rtl">
        <span>{M.pagerPosition(page, totalPages)}</span>
        <span aria-hidden="true">·</span>
        <span>{M.pagerTotal(total)}</span>
      </p>
      <div className="flex items-center gap-2">
        <button
          type="button"
          className={btn}
          onClick={() => onPage(page - 1)}
          disabled={page <= 1}
          aria-label="الصفحة السابقة"
        >
          <ChevronRight size={14} aria-hidden="true" />
          السابق
        </button>
        <button
          type="button"
          className={btn}
          onClick={() => onPage(page + 1)}
          disabled={page >= totalPages}
          aria-label="الصفحة التالية"
        >
          التالي
          <ChevronLeft size={14} aria-hidden="true" />
        </button>
      </div>
    </nav>
  )
}
