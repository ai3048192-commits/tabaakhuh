import { useState } from 'react'
import { RefreshCw, UserPlus } from 'lucide-react'
import { useDelivery } from './useDelivery'
import AssignDriverDialog from './AssignDriverDialog'
import AddDriverModal from '../components/AddDriverModal'
import { deliveryMessages as M } from './messages'

export default function DeliveryPage() {
  const q = useDelivery()
  const [addDriverOpen, setAddDriverOpen] = useState(false)
  const th = 'px-3 py-2 text-right text-xs font-black text-gray-500'
  const td = 'px-3 py-2.5 text-right align-middle text-sm text-gray-700'

  return (
    <div className="min-h-full bg-[#fcf9f2] p-4 font-['Tajawal'] md:p-6" dir="rtl">
      <div className="mb-2 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-black text-[#7a0d0d]">{M.pageTitle}</h1>
        {q.status === 'ready' && (
          <button type="button" onClick={q.refresh} className="flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs font-bold text-gray-600">
            <RefreshCw size={14} aria-hidden="true" />
            {M.refresh}
          </button>
        )}
      </div>
      <p className="mb-5 text-xs text-amber-700">{M.provisionalNote}</p>

      {q.status === 'loading' && <p className="text-sm text-gray-500">{M.loading}</p>}

      {q.status === 'error' && (
        <div className="rounded-2xl border border-red-100 bg-red-50 p-6 text-center">
          <p className="mb-3 text-sm text-red-700">{M.listError}</p>
          <button type="button" onClick={q.refresh} className="rounded-xl bg-[#7a0d0d] px-4 py-2 text-sm font-black text-white">{M.retry}</button>
        </div>
      )}

      {q.status === 'ready' && (
        <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
          <section className="xl:col-span-2 rounded-2xl border border-gray-100 bg-white p-4">
            <h2 className="mb-3 text-sm font-black text-gray-700">{M.activeTitle}</h2>
            {q.active.length === 0 ? (
              <p className="py-8 text-center text-sm text-gray-400">{M.noActive}</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[720px] border-collapse">
                  <thead className="border-b border-gray-100">
                    <tr>
                      <th scope="col" className={th}>{M.colOrder}</th>
                      <th scope="col" className={th}>{M.colStatus}</th>
                      <th scope="col" className={th}>{M.colCook}</th>
                      <th scope="col" className={th}>{M.colArea}</th>
                      <th scope="col" className={th}>{M.colDriver}</th>
                      <th scope="col" className={th}>{M.colActions}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {q.active.map((d) => (
                      <tr key={d.order_id} className="border-b border-gray-50 last:border-0">
                        <td className={`${td} font-bold text-gray-900`}><span dir="ltr">{d.order_number}</span></td>
                        <td className={td}>{M.statusLabel[d.status] ?? d.status}</td>
                        <td className={td}>{d.cook_name ?? '—'}</td>
                        <td className={td}>{d.area ?? '—'}</td>
                        <td className={td}>
                          {d.driver_name ?? <span className="text-amber-700">{M.unassigned}</span>}
                        </td>
                        <td className={td}>
                          <button
                            type="button"
                            onClick={() => q.openAssign(d)}
                            className="rounded-lg border border-gray-200 bg-white px-2.5 py-1.5 text-xs font-bold text-[#7a0d0d]"
                          >
                            {d.driver_id == null ? M.assign : M.reassign}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          <section className="rounded-2xl border border-gray-100 bg-white p-4">
            <div className="mb-3 flex items-center justify-between gap-2">
              <h2 className="text-sm font-black text-gray-700">{M.driversTitle}</h2>
              <button
                type="button"
                onClick={() => setAddDriverOpen(true)}
                className="flex items-center gap-1.5 rounded-xl bg-[#7a0d0d] px-3 py-1.5 text-xs font-black text-white"
              >
                <UserPlus size={14} aria-hidden="true" />
                {M.addDriver}
              </button>
            </div>
            {q.drivers.length === 0 ? (
              <p className="py-8 text-center text-sm text-gray-400">{M.noDrivers}</p>
            ) : (
              <table className="w-full border-collapse">
                <thead className="border-b border-gray-100">
                  <tr>
                    <th scope="col" className={th}>{M.colName}</th>
                    <th scope="col" className={th}>{M.colAvailability}</th>
                    <th scope="col" className={th}>{M.colLoad}</th>
                  </tr>
                </thead>
                <tbody>
                  {q.drivers.map((dr) => {
                    const free = dr.is_available && !dr.is_busy
                    return (
                      <tr key={dr.id} className="border-b border-gray-50 last:border-0">
                        <td className={td}>
                          <span className="block font-bold text-gray-900">{dr.name ?? '—'}</span>
                          <span className="block text-xs text-gray-400"><span dir="ltr">{dr.phone ?? ''}</span></span>
                        </td>
                        <td className={td}>
                          <span className={`inline-flex items-center rounded-lg border px-2 py-1 text-xs font-bold ${free ? 'border-emerald-300 bg-emerald-50 text-emerald-800' : 'border-gray-200 bg-gray-50 text-gray-500'}`}>
                            {free ? M.available : M.busy}
                          </span>
                        </td>
                        <td className={td}>{dr.is_busy ? 1 : 0}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            )}
          </section>
        </div>
      )}

      <div aria-live="polite" role="status" className="sr-only">{q.toast}</div>
      {q.toast && (
        <div className="fixed bottom-6 left-1/2 z-[80] -translate-x-1/2 rounded-xl bg-gray-900 px-4 py-2.5 text-sm text-white shadow-lg">{q.toast}</div>
      )}

      {q.assigning && (
        <AssignDriverDialog
          delivery={q.assigning}
          drivers={q.drivers}
          busy={q.busy}
          onConfirm={(id) => void q.confirmAssign(id)}
          onCancel={q.closeAssign}
        />
      )}

      {addDriverOpen && (
        <AddDriverModal
          onClose={() => setAddDriverOpen(false)}
          onCreated={() => q.refresh()}
        />
      )}
    </div>
  )
}
