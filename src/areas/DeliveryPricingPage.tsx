import { useId, useState } from 'react'
import { Info, Pencil, Plus, Power, PowerOff, RefreshCw } from 'lucide-react'
import DialogShell from '../shared/DialogShell'
import AreaFormDialog from './AreaFormDialog'
import { areaMessages as M } from './messages'
import { useDeliveryAreas } from './useDeliveryAreas'
import type { Area, AreaMutationOutcome } from './types'

type Dialog = null | { kind: 'add' } | { kind: 'edit'; area: Area } | { kind: 'toggle'; area: Area; busy: boolean }

/**
 * `/delivery-pricing` — the admin sets a delivery fee per area of each city.
 * That fee is what a delivered order to an address in the area costs: the
 * customer sees it in the cart, the cook on the order, the driver on the
 * offer before accepting. Areas not listed (or switched off) get no delivery.
 */
export default function DeliveryPricingPage() {
  const q = useDeliveryAreas()
  const [dialog, setDialog] = useState<Dialog>(null)
  const [toast, setToast] = useState<string | null>(null)
  const citySelectId = useId()

  const showToast = (msg: string) => {
    setToast(msg)
    window.setTimeout(() => setToast((t) => (t === msg ? null : t)), 5000)
  }

  const afterMutation = (o: AreaMutationOutcome, success: string) => {
    if (o.ok) showToast(success)
    else if (o.reason === 'not_found') showToast(M.notFoundToast)
    else if (o.reason === 'transient') showToast(M.retryToast)
  }

  const confirmToggle = async () => {
    if (dialog?.kind !== 'toggle') return
    setDialog({ ...dialog, busy: true })
    const o = await q.toggle(dialog.area)
    setDialog(null)
    afterMutation(o, M.statusToast)
  }

  return (
    <div className="min-h-full bg-[#fcf9f2] p-4 font-['Tajawal'] md:p-6" dir="rtl">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div className="max-w-2xl">
          <h1 className="text-xl font-black text-[#7a0d0d]">{M.pageTitle}</h1>
          <p className="mt-1 text-xs font-bold text-gray-500">{M.subtitle}</p>
        </div>
        {q.selectedCity && q.areasStatus === 'ready' && (
          <button
            type="button"
            onClick={() => setDialog({ kind: 'add' })}
            className="flex items-center gap-2 rounded-xl bg-[#7a0d0d] px-3 py-2 text-xs font-black text-white"
          >
            <Plus size={14} aria-hidden="true" />
            {M.addArea}
          </button>
        )}
      </div>

      <p className="mb-6 flex items-start gap-2 rounded-2xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
        <Info size={14} className="mt-0.5 shrink-0" aria-hidden="true" />
        {M.unservedNote}
      </p>

      {q.citiesStatus === 'loading' && <p className="text-sm text-gray-500">{M.citiesLoading}</p>}
      {q.citiesStatus === 'error' && (
        <ErrorBox message={M.citiesError} onRetry={q.reloadCities} />
      )}
      {q.citiesStatus === 'ready' && q.cities.length === 0 && (
        <p className="rounded-2xl border border-gray-100 bg-white p-10 text-center text-sm text-gray-500">{M.noCities}</p>
      )}

      {q.citiesStatus === 'ready' && q.cities.length > 0 && (
        <>
          <div className="mb-4 flex flex-wrap items-end gap-3">
            <div>
              <label htmlFor={citySelectId} className="mb-1 block text-xs font-bold text-gray-500">
                {M.cityLabel}
              </label>
              <select
                id={citySelectId}
                value={q.cityId ?? ''}
                onChange={(e) => q.selectCity(Number(e.target.value))}
                className="min-w-[12rem] rounded-xl border border-gray-200 bg-white p-2.5 text-sm font-bold"
              >
                {q.cities.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name_ar} {c.is_active ? '' : M.cityInactiveTag}
                  </option>
                ))}
              </select>
            </div>
            {q.areasStatus === 'ready' && (
              <>
                <span className="pb-3 text-xs font-bold text-gray-400">{M.count(q.areas.length)}</span>
                <button
                  type="button"
                  onClick={() => void q.reloadAreas()}
                  className="mb-1 flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs font-bold text-gray-600"
                >
                  <RefreshCw size={14} aria-hidden="true" />
                  {M.retry}
                </button>
              </>
            )}
          </div>

          {q.areasStatus === 'loading' && <p className="text-sm text-gray-500">{M.loading}</p>}
          {q.areasStatus === 'error' && <ErrorBox message={M.listError} onRetry={() => void q.reloadAreas()} />}
          {q.areasStatus === 'ready' && q.areas.length === 0 && (
            <p className="rounded-2xl border border-gray-100 bg-white p-10 text-center text-sm text-gray-500">{M.empty}</p>
          )}
          {q.areasStatus === 'ready' && q.areas.length > 0 && (
            <div className="overflow-x-auto rounded-2xl border border-gray-100 bg-white">
              <table className="w-full min-w-[40rem] text-right">
                <thead>
                  <tr className="border-b border-gray-200 bg-gray-50 text-xs font-bold text-gray-500">
                    <th scope="col" className="px-4 py-3">{M.colNameAr}</th>
                    <th scope="col" className="px-4 py-3">{M.colNameEn}</th>
                    <th scope="col" className="px-4 py-3">{M.colFee}</th>
                    <th scope="col" className="px-4 py-3">{M.colStatus}</th>
                    <th scope="col" className="px-4 py-3">{M.colActions}</th>
                  </tr>
                </thead>
                <tbody>
                  {q.areas.map((a) => (
                    <tr key={a.id} className="border-b border-gray-100 last:border-0">
                      <td className="px-4 py-3 text-sm font-bold text-gray-800">{a.name_ar}</td>
                      <td className="px-4 py-3 text-sm text-gray-600" dir="ltr">{a.name_en}</td>
                      <td className="px-4 py-3 text-sm font-black text-[#7a0d0d]">{M.fee(a.delivery_fee)}</td>
                      <td className="px-4 py-3">
                        <span
                          className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${
                            a.is_active ? 'bg-emerald-50 text-emerald-700' : 'bg-gray-100 text-gray-500'
                          }`}
                        >
                          {a.is_active ? M.statusActive : M.statusInactive}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <button
                            type="button"
                            onClick={() => setDialog({ kind: 'edit', area: a })}
                            aria-label={M.editLabel(a.name_ar)}
                            className="flex items-center gap-1 rounded-lg border border-gray-200 px-2.5 py-1.5 text-xs font-bold text-gray-600 hover:border-[#7a0d0d]"
                          >
                            <Pencil size={13} aria-hidden="true" />
                            {M.edit}
                          </button>
                          <button
                            type="button"
                            onClick={() => setDialog({ kind: 'toggle', area: a, busy: false })}
                            aria-label={M.toggleLabel(a.name_ar, a.is_active)}
                            className="flex items-center gap-1 rounded-lg border border-gray-200 px-2.5 py-1.5 text-xs font-bold text-gray-600 hover:border-amber-400"
                          >
                            {a.is_active ? <PowerOff size={13} aria-hidden="true" /> : <Power size={13} aria-hidden="true" />}
                            {a.is_active ? M.deactivate : M.activate}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      <div aria-live="polite" role="status" className="sr-only">
        {toast}
      </div>
      {toast && (
        <div className="fixed bottom-6 left-1/2 z-[80] -translate-x-1/2 rounded-xl bg-gray-900 px-4 py-2.5 text-sm text-white shadow-lg">
          {toast}
        </div>
      )}

      {dialog?.kind === 'add' && q.selectedCity && (
        <AreaFormDialog
          title={M.formAddTitle(q.selectedCity.name_ar)}
          onSubmit={q.create}
          onDone={() => {
            setDialog(null)
            showToast(M.createdToast)
          }}
          onCancel={() => setDialog(null)}
        />
      )}
      {dialog?.kind === 'edit' && (
        <AreaFormDialog
          title={M.formEditTitle(dialog.area.name_ar)}
          area={dialog.area}
          onSubmit={(v) => q.update(dialog.area.id, v)}
          onDone={() => {
            setDialog(null)
            showToast(M.updatedToast)
          }}
          onCancel={() => setDialog(null)}
        />
      )}
      {dialog?.kind === 'toggle' && (
        <DialogShell
          label={dialog.area.is_active ? M.toggleOffTitle(dialog.area.name_ar) : M.toggleOnTitle(dialog.area.name_ar)}
          onDismiss={() => !dialog.busy && setDialog(null)}
        >
          <h2 className="mb-2 text-base font-black text-gray-800">
            {dialog.area.is_active ? M.toggleOffTitle(dialog.area.name_ar) : M.toggleOnTitle(dialog.area.name_ar)}
          </h2>
          <p className="mb-6 text-sm text-gray-600">{dialog.area.is_active ? M.toggleOffBody : M.toggleOnBody}</p>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => setDialog(null)}
              disabled={dialog.busy}
              className="flex-1 rounded-xl border border-gray-200 py-2.5 text-sm font-bold text-gray-600 disabled:opacity-50"
            >
              {M.cancel}
            </button>
            <button
              type="button"
              onClick={() => void confirmToggle()}
              disabled={dialog.busy}
              aria-busy={dialog.busy}
              className="flex-1 rounded-xl bg-[#7a0d0d] py-2.5 text-sm font-black text-white disabled:opacity-50"
            >
              {M.confirm}
            </button>
          </div>
        </DialogShell>
      )}
    </div>
  )
}

function ErrorBox({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="rounded-2xl border border-red-100 bg-red-50 p-6 text-center">
      <p className="mb-3 text-sm text-red-700">{message}</p>
      <button type="button" onClick={onRetry} className="rounded-xl bg-[#7a0d0d] px-4 py-2 text-sm font-black text-white">
        {M.retry}
      </button>
    </div>
  )
}
