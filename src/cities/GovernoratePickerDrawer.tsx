import { useEffect, useMemo, useRef, useState } from 'react'
import { MapPin, X, Search, Check, Plus, Power } from 'lucide-react'
import DrawerShell from '../shared/DrawerShell'
import { cityMessages as M } from './messages'
import { initialSelection, planActions, rowMatches } from './governorateSelection'
import type { GovernorateAction, GovernorateRow } from './governorateSelection'

interface Props {
  rows: GovernorateRow[]
  /** Scrolled to and highlighted on open — set when entered from a row's Edit. */
  focusKey?: string
  busy: boolean
  /** `{ done, total }` while a save is running, for the footer progress label. */
  progress?: { done: number; total: number }
  formError?: string
  onSubmit: (plan: GovernorateAction[]) => void
  onCancel: () => void
}

/**
 * The governorate picker — a side drawer listing every Egyptian governorate
 * with a switch each, replacing the old free-text add/edit form. Ticking a
 * governorate that isn't on the platform creates it; ticking a deactivated one
 * re-activates it; un-ticking deactivates (never deletes — FR-026). Saving
 * applies only the rows that actually changed.
 *
 * A drawer rather than a centred modal: 27 rows need the full viewport height,
 * and the cities table stays visible beside it while the admin picks.
 */
export default function GovernoratePickerDrawer({
  rows,
  focusKey,
  busy,
  progress,
  formError,
  onSubmit,
  onCancel,
}: Props) {
  const [selected, setSelected] = useState(() => initialSelection(rows))
  const [search, setSearch] = useState('')
  const searchRef = useRef<HTMLInputElement>(null)
  const focusRef = useRef<HTMLInputElement>(null)

  // Focus always lands inside the dialog on open: on the governorate the admin
  // came in on, or on the search box when they opened the full list.
  useEffect(() => {
    if (!focusKey) {
      searchRef.current?.focus()
      return
    }
    focusRef.current?.focus()
    // The input itself is visually hidden — scroll its row into view instead.
    // (Guarded: jsdom has no scrollIntoView.)
    focusRef.current?.closest('li')?.scrollIntoView?.({ block: 'center' })
  }, [focusKey])

  const plan = useMemo(() => planActions(rows, selected), [rows, selected])
  const planByKey = useMemo(
    () => new Map(plan.map((a) => [a.key, a.op] as const)),
    [plan],
  )
  const visible = useMemo(() => rows.filter((r) => rowMatches(r, search)), [rows, search])
  const activeCount = selected.size

  const toggle = (key: string) => {
    if (busy) return
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  const pendingHint = (key: string) => {
    switch (planByKey.get(key)) {
      case 'create':
        return { text: M.pickerWillAdd, tone: 'text-emerald-600', Icon: Plus }
      case 'enable':
        return { text: M.pickerWillEnable, tone: 'text-emerald-600', Icon: Power }
      case 'disable':
        return { text: M.pickerWillDisable, tone: 'text-amber-600', Icon: Power }
      default:
        return null
    }
  }

  return (
    <DrawerShell label={M.pickerTitle} onDismiss={onCancel} side="left" width="md">
      {/* Header */}
      <div className="relative shrink-0 overflow-hidden bg-gradient-to-l from-[#7a0d0d] to-[#9a1212] px-5 py-4 text-white">
        <div className="pointer-events-none absolute inset-0 opacity-[0.06] [background-image:radial-gradient(circle,#fff_1.5px,transparent_1.5px)] [background-size:20px_20px]" />
        <div className="relative flex items-start justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/15">
              <MapPin size={18} aria-hidden="true" />
            </span>
            <div>
              <h2 className="text-base font-black leading-tight">{M.pickerTitle}</h2>
              <p className="mt-0.5 text-[11px] font-bold text-white/75">
                {M.pickerSelectedCount(activeCount)}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onCancel}
            disabled={busy}
            aria-label={M.close}
            className="rounded-lg p-1.5 text-white/80 transition hover:bg-white/15 hover:text-white disabled:opacity-50"
          >
            <X size={20} aria-hidden="true" />
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="shrink-0 border-b border-[#f0e9db] bg-[#fcf9f2] px-5 py-3">
        <p className="mb-2 text-[11px] font-bold text-gray-500">{M.pickerSubtitle}</p>
        <div className="relative">
          <Search
            size={15}
            aria-hidden="true"
            className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"
          />
          <input
            ref={searchRef}
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            aria-label={M.pickerSearch}
            placeholder={M.pickerSearch}
            className="w-full rounded-xl border border-[#e8dfc9] bg-white py-2 pr-9 pl-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#7a0d0d]/20"
          />
        </div>
      </div>

      {/* List — the only scrolling region, so the header and footer stay put. */}
      <div className="min-h-0 flex-1 overflow-y-auto px-2 py-2">
        {visible.length === 0 ? (
          <p className="px-3 py-10 text-center text-sm text-gray-500">{M.pickerEmptyMatch}</p>
        ) : (
          <ul className="space-y-0.5">
            {visible.map((row) => {
              const checked = selected.has(row.key)
              const hint = pendingHint(row.key)
              return (
                <li key={row.key}>
                  <label
                    className={[
                      'flex cursor-pointer items-center gap-3 rounded-xl px-3 py-2.5 transition',
                      hint ? 'bg-[#fcf9f2]' : 'hover:bg-gray-50',
                      row.key === focusKey ? 'ring-1 ring-[#7a0d0d]/30' : '',
                      busy ? 'cursor-not-allowed opacity-60' : '',
                    ].join(' ')}
                  >
                    <input
                      ref={row.key === focusKey ? focusRef : undefined}
                      type="checkbox"
                      className="sr-only"
                      checked={checked}
                      disabled={busy}
                      aria-label={M.pickerRowLabel(row.name_ar)}
                      onChange={() => toggle(row.key)}
                    />
                    <span
                      aria-hidden="true"
                      className={[
                        'flex h-5 w-5 shrink-0 items-center justify-center rounded-md border transition',
                        checked
                          ? 'border-[#7a0d0d] bg-[#7a0d0d] text-white'
                          : 'border-[#ddd3bd] bg-white',
                      ].join(' ')}
                    >
                      {checked && <Check size={13} strokeWidth={3} />}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center gap-2">
                        <span className="truncate text-sm font-bold text-gray-800">
                          {row.name_ar}
                        </span>
                        {row.custom && (
                          <span className="shrink-0 rounded-md bg-gray-100 px-1.5 py-0.5 text-[10px] font-black text-gray-500">
                            {M.pickerCustomTag}
                          </span>
                        )}
                      </span>
                      <span className="block truncate text-xs text-gray-500" dir="ltr">
                        {row.name_en}
                      </span>
                    </span>
                    {hint && (
                      <span
                        className={`flex shrink-0 items-center gap-1 text-[11px] font-bold ${hint.tone}`}
                      >
                        <hint.Icon size={12} aria-hidden="true" />
                        {hint.text}
                      </span>
                    )}
                  </label>
                </li>
              )
            })}
          </ul>
        )}
      </div>

      {/* Footer */}
      <div className="shrink-0 border-t border-gray-100 bg-gray-50 px-5 py-4">
        {formError && (
          <p className="mb-3 text-xs font-bold text-red-600" role="alert">
            {formError}
          </p>
        )}
        <div className="flex items-center gap-3">
          <p className="min-w-0 flex-1 truncate text-xs font-bold text-gray-500">
            {plan.length === 0 ? M.pickerNoChanges : M.pickerChangeCount(plan.length)}
          </p>
          <button
            type="button"
            onClick={onCancel}
            disabled={busy}
            className="rounded-xl border border-[#e8dfc9] bg-white px-4 py-2.5 text-sm font-bold text-gray-600 transition hover:bg-gray-100 disabled:opacity-50"
          >
            {M.cancel}
          </button>
          <button
            type="button"
            onClick={() => plan.length > 0 && !busy && onSubmit(plan)}
            disabled={plan.length === 0 || busy}
            aria-busy={busy}
            className={[
              'rounded-xl px-4 py-2.5 text-sm font-black transition disabled:cursor-not-allowed',
              plan.length === 0
                ? 'bg-gray-200 text-gray-400'
                : 'bg-[#7a0d0d] text-white shadow-lg shadow-[#7a0d0d]/25 hover:bg-[#9a1212]',
            ].join(' ')}
          >
            {busy && progress ? M.pickerApplying(progress.done, progress.total) : M.pickerApply}
          </button>
        </div>
      </div>
    </DrawerShell>
  )
}
