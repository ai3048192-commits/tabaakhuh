import { useState } from 'react'
import { Plus, RefreshCw } from 'lucide-react'
import { useCitiesManagement } from './useCitiesManagement'
import CitiesTable from './CitiesTable'
import SearchBox from './SearchBox'
import GovernoratePickerDrawer from './GovernoratePickerDrawer'
import StatusToggleDialog from './StatusToggleDialog'
import { cityMessages as M } from './messages'
import type { GovernorateAction } from './governorateSelection'
import type { CityMutationOutcome } from './types'

/** `/cities` — the Cities Management screen (US1–US4). */
export default function CitiesPage() {
  const q = useCitiesManagement()
  const [toast, setToast] = useState<string | null>(null)

  const showToast = (msg: string) => {
    setToast(msg)
    window.setTimeout(() => setToast((t) => (t === msg ? null : t)), 6000)
  }

  const handleOutcome = (o: CityMutationOutcome, successFallback: string) => {
    if (o.ok) showToast(o.message || successFallback)
    else if (o.reason === 'not_found') showToast(M.notFoundToast)
    else if (o.reason === 'transient') showToast(M.mutationRetryToast)
    // 'validation' → surfaced inside the open dialog, no toast
  }

  const submitPlan = async (plan: GovernorateAction[]) => {
    handleOutcome(await q.applyPlan(plan), M.updatedToast)
  }
  const submitToggle = async () => {
    if (q.dialog?.kind !== 'toggle') return
    handleOutcome(await q.toggleStatus(q.dialog.city), M.statusUpdatedToast)
  }

  const addButton = (
    <button
      type="button"
      onClick={q.openPicker}
      className="flex items-center gap-2 rounded-xl bg-brand px-3 py-2 text-xs font-black text-white"
    >
      <Plus size={14} aria-hidden="true" />
      {M.addCity}
    </button>
  )

  const searchActive = q.status === 'ready' && q.search.trim() !== ''

  return (
    <div className="min-h-full bg-ivory p-4 font-['Tajawal'] md:p-6" dir="rtl">
      <div className="mb-6 flex items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-black text-brand">{M.pageTitle}</h1>
          {q.status === 'ready' && (
            <p className="mt-1 text-xs font-bold text-gray-400">{M.subtitle(q.totalCount)}</p>
          )}
        </div>
        {q.status === 'ready' && (
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={q.refresh}
              className="flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs font-bold text-gray-600"
            >
              <RefreshCw size={14} aria-hidden="true" />
              {M.refresh}
            </button>
            {addButton}
          </div>
        )}
      </div>

      {q.status === 'loading' && <p className="text-sm text-gray-500">{M.loading}</p>}

      {q.status === 'error' && (
        <div className="rounded-2xl border border-red-100 bg-red-50 p-6 text-center">
          <p className="mb-3 text-sm text-red-700">{M.listError}</p>
          <button
            type="button"
            onClick={q.refresh}
            className="rounded-xl bg-brand px-4 py-2 text-sm font-black text-white"
          >
            {M.retry}
          </button>
        </div>
      )}

      {q.status === 'ready' && (
        <>
          <div className="mb-4 max-w-sm">
            <SearchBox value={q.search} onChange={q.setSearch} />
          </div>

          {q.noCities && (
            <p className="rounded-2xl border border-gray-100 bg-white p-10 text-center text-sm text-gray-500">
              {M.emptyNoCities}
            </p>
          )}

          {q.noMatch && (
            <p className="rounded-2xl border border-gray-100 bg-white p-10 text-center text-sm text-gray-500">
              {M.emptyNoMatch}
            </p>
          )}

          {!q.noCities && !q.noMatch && (
            <CitiesTable
              cities={q.cities}
              rowState={q.rowState}
              onEdit={q.openPickerAt}
              onToggle={q.openToggle}
            />
          )}
        </>
      )}

      {/* Toast announcements */}
      <div aria-live="polite" role="status" className="sr-only">
        {toast}
      </div>
      {/* Filtered-result-count announcement (FR-041) */}
      <div aria-live="polite" className="sr-only">
        {searchActive ? M.subtitle(q.cities.length) : ''}
      </div>
      {toast && (
        <div className="fixed bottom-6 left-1/2 z-[80] -translate-x-1/2 rounded-xl bg-gray-900 px-4 py-2.5 text-sm text-white shadow-lg">
          {toast}
        </div>
      )}

      {q.dialog?.kind === 'picker' && (
        <GovernoratePickerDrawer
          rows={q.governorateRows}
          focusKey={q.dialog.focusKey}
          busy={q.dialog.busy}
          progress={q.dialog.progress}
          formError={q.dialog.formError}
          onSubmit={submitPlan}
          onCancel={q.closeDialog}
        />
      )}
      {q.dialog?.kind === 'toggle' && (
        <StatusToggleDialog
          city={q.dialog.city}
          nextActive={!q.dialog.city.is_active}
          busy={q.dialog.busy}
          formError={q.dialog.formError}
          onConfirm={submitToggle}
          onCancel={q.closeDialog}
        />
      )}
    </div>
  )
}
