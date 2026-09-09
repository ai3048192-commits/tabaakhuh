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
  const field = 'rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm'

  return (
    <div className="mb-5 flex flex-wrap items-end gap-3 rounded-2xl border border-gray-100 bg-white p-4">
      <div className="flex flex-col gap-1">
        <label htmlFor={`${uid}-status`} className="text-xs font-bold text-gray-500">
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
        <label htmlFor={`${uid}-city`} className="text-xs font-bold text-gray-500">
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
        <label htmlFor={`${uid}-from`} className="text-xs font-bold text-gray-500">
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
        <label htmlFor={`${uid}-to`} className="text-xs font-bold text-gray-500">
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
        className="rounded-lg bg-[#7a0d0d] px-4 py-2 text-sm font-black text-white"
      >
        {M.apply}
      </button>
      <button
        type="button"
        onClick={onReset}
        className="rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-bold text-gray-600"
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
