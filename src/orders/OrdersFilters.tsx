import { useId } from 'react'
import { ORDER_STATUSES, statusLabel } from './orderStatus'
import { orderMessages as M } from './messages'
import type { DateRangeError, OrderFieldError, OrderFilters, OrderStatus } from './types'

/**
 * The filter bar. Status and city apply immediately on change; the placed-date
 * range applies only via Apply, with a local from ≤ to pre-check (FR-011..FR-014).
 */
export default function OrdersFilters({
  filters,
  cities,
  draftFrom,
  draftTo,
  dateFieldError,
  serverFieldError,
  onStatus,
  onCity,
  onDraftFrom,
  onDraftTo,
  onApply,
  onReset,
}: {
  filters: OrderFilters
  cities: { id: number; name_ar: string }[]
  draftFrom: string | null
  draftTo: string | null
  dateFieldError: DateRangeError
  serverFieldError: OrderFieldError
  onStatus: (s: OrderStatus | 'all') => void
  onCity: (id: number | null) => void
  onDraftFrom: (v: string | null) => void
  onDraftTo: (v: string | null) => void
  onApply: () => void
  onReset: () => void
}) {
  const uid = useId()
  const rangeMsg = dateFieldError ? M.fromAfterTo : (serverFieldError.from ?? serverFieldError.to)
  const field = 'rounded-xl border border-[#e8dcc4] bg-white px-3.5 py-2.5 text-sm text-gray-800 shadow-sm outline-none transition focus:border-[#7a0d0d] focus:ring-4 focus:ring-[#7a0d0d]/10 disabled:opacity-50'

  return (
    <div className="mb-5 flex flex-wrap items-end gap-3 rounded-3xl bg-white shadow-[0_18px_40px_-30px_rgba(122,13,13,0.45)] ring-1 ring-[#efe3cc] p-4">
      <div className="flex flex-col gap-1">
        <label htmlFor={`${uid}-status`} className="text-xs font-black text-[#6b4f3a]">
          {M.filterStatus}
        </label>
        <select
          id={`${uid}-status`}
          className={field}
          value={filters.status}
          onChange={(e) => onStatus(e.target.value as OrderStatus | 'all')}
          aria-invalid={serverFieldError.status ? true : undefined}
          aria-describedby={serverFieldError.status ? `${uid}-status-err` : undefined}
        >
          <option value="all">{M.allStatuses}</option>
          {ORDER_STATUSES.map((s) => (
            <option key={s} value={s}>
              {statusLabel(s)}
            </option>
          ))}
        </select>
        {serverFieldError.status && (
          <p id={`${uid}-status-err`} className="text-xs text-red-600">
            {serverFieldError.status}
          </p>
        )}
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor={`${uid}-city`} className="text-xs font-black text-[#6b4f3a]">
          {M.filterCity}
        </label>
        <select
          id={`${uid}-city`}
          className={field}
          value={filters.cityId ?? ''}
          onChange={(e) => onCity(Number(e.target.value) || null)}
          aria-invalid={serverFieldError.city ? true : undefined}
          aria-describedby={serverFieldError.city ? `${uid}-city-err` : undefined}
        >
          <option value="">{M.allCities}</option>
          {cities.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name_ar}
            </option>
          ))}
        </select>
        {serverFieldError.city && (
          <p id={`${uid}-city-err`} className="text-xs text-red-600">
            {serverFieldError.city}
          </p>
        )}
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor={`${uid}-from`} className="text-xs font-black text-[#6b4f3a]">
          {M.filterFrom}
        </label>
        <input
          id={`${uid}-from`}
          type="date"
          dir="ltr"
          className={field}
          value={draftFrom ?? ''}
          onChange={(e) => onDraftFrom(e.target.value || null)}
          aria-invalid={rangeMsg ? true : undefined}
          aria-describedby={rangeMsg ? `${uid}-range-err` : undefined}
        />
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor={`${uid}-to`} className="text-xs font-black text-[#6b4f3a]">
          {M.filterTo}
        </label>
        <input
          id={`${uid}-to`}
          type="date"
          dir="ltr"
          className={field}
          value={draftTo ?? ''}
          onChange={(e) => onDraftTo(e.target.value || null)}
          aria-invalid={rangeMsg ? true : undefined}
          aria-describedby={rangeMsg ? `${uid}-range-err` : undefined}
        />
      </div>

      <button
        type="button"
        onClick={onApply}
        className="rounded-xl bg-[#7a0d0d] px-4 py-2.5 text-sm font-black text-white shadow-sm transition hover:bg-[#5a0909] disabled:opacity-50"
      >
        {M.apply}
      </button>
      <button
        type="button"
        onClick={onReset}
        className="rounded-xl border border-[#e8dcc4] bg-white px-4 py-2.5 text-sm font-bold text-gray-700 transition hover:bg-[#faf3e7]"
      >
        {M.resetFilters}
      </button>

      {rangeMsg && (
        <p id={`${uid}-range-err`} className="w-full text-xs text-red-600" role="alert">
          {rangeMsg}
        </p>
      )}
    </div>
  )
}
