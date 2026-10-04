import { useEffect, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { RefreshCw, UserPlus, Truck, Clock, Bike, Activity, Star, Phone, Store, MapPin, Info } from 'lucide-react'
import { useDelivery } from './useDelivery'
import AssignDriverDialog from './AssignDriverDialog'
import AddDriverModal from '../components/AddDriverModal'
import { deliveryMessages as M } from './messages'

export default function DeliveryPage() {
  const q = useDelivery()
  const [addDriverOpen, setAddDriverOpen] = useState(false)

  // Deep link from Orders Oversight's per-row "assign driver" link
  // (`/delivery?order=<id>`): once the active-deliveries list is in, jump
  // straight to that order's assign dialog instead of making the admin find
  // it in the table. `handledOrderRef` guards against reopening the dialog
  // (e.g. if the admin cancels it) as long as the param stays in the URL.
  const [searchParams, setSearchParams] = useSearchParams()
  const requestedOrderId = searchParams.get('order')
  const [orderNotFound, setOrderNotFound] = useState(false)
  const handledOrderRef = useRef<string | null>(null)

  useEffect(() => {
    if (!requestedOrderId || q.status !== 'ready') return
    if (handledOrderRef.current === requestedOrderId) return
    handledOrderRef.current = requestedOrderId

    const match = q.active.find((d) => d.order_id === Number(requestedOrderId))
    if (match) {
      q.openAssign(match)
    } else {
      setOrderNotFound(true)
    }
    // Clear the param so a refresh or a "back" navigation doesn't reopen it.
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev)
      next.delete('order')
      return next
    }, { replace: true })
  }, [requestedOrderId, q, setSearchParams])
  const th = 'px-4 pb-3 text-right text-xs font-bold text-gray-400'
  const td = 'px-4 py-3.5 text-right align-middle text-sm text-gray-700'

  const waiting = q.active.filter((d) => d.driver_id == null).length
  const free = q.drivers.filter((d) => d.is_available && !d.is_busy).length
  const busy = q.drivers.filter((d) => d.is_busy).length
  const stats = [
    { label: M.statActive, value: q.active.length, icon: Truck, tone: 'bg-[#7a0d0d]/10 text-[#7a0d0d]' },
    { label: M.statWaiting, value: waiting, icon: Clock, tone: 'bg-amber-100 text-amber-700' },
    { label: M.statFree, value: free, icon: Bike, tone: 'bg-emerald-100 text-emerald-700' },
    { label: M.statBusy, value: busy, icon: Activity, tone: 'bg-sky-100 text-sky-700' },
  ]

  return (
    <div className="min-h-full bg-[#f7f1e6] p-4 font-['Tajawal'] md:p-8" dir="rtl">
      {/* Header */}
      <div className="relative mb-6 overflow-hidden rounded-[2rem] bg-gradient-to-l from-[#7a0d0d] via-[#5e0a0a] to-[#2e0404] p-6 text-white shadow-[0_30px_60px_-30px_rgba(122,13,13,0.8)] md:p-8">
        <div className="pointer-events-none absolute inset-0 opacity-[0.07] [background-image:radial-gradient(circle,#fff_1.5px,transparent_1.5px)] [background-size:22px_22px]" aria-hidden="true" />
        <div className="relative flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-2xl font-black md:text-3xl">{M.pageTitle}</h1>
            <p className="mt-1.5 text-sm text-white/70">{M.subtitle}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setAddDriverOpen(true)}
              className="flex items-center gap-2 rounded-xl bg-[#e0a52e] px-4 py-2.5 text-xs font-black text-[#1c0204] shadow-lg transition hover:brightness-110"
            >
              <UserPlus size={15} aria-hidden="true" />
              {M.addDriver}
            </button>
            {q.status === 'ready' && (
              <button type="button" onClick={q.refresh} className="flex items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-xs font-black text-[#7a0d0d] shadow-lg transition hover:bg-[#fff7e6]">
                <RefreshCw size={14} aria-hidden="true" />
                {M.refresh}
              </button>
            )}
          </div>
        </div>
      </div>

      <p className="mb-5 flex items-start gap-2 text-[11px] font-bold text-amber-700">
        <Info size={13} className="mt-0.5 shrink-0" aria-hidden="true" />
        {M.provisionalNote}
      </p>

      {orderNotFound && (
        <div className="mb-5 flex items-center justify-between gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs font-bold text-amber-800">
          <span>{M.orderNotInPipeline}</span>
          <button
            type="button"
            onClick={() => setOrderNotFound(false)}
            className="shrink-0 text-amber-700 underline"
          >
            {M.close}
          </button>
        </div>
      )}

      {q.status === 'loading' && (
        <>
          <p className="sr-only">{M.loading}</p>
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4" aria-hidden="true">
            {[0, 1, 2, 3].map((i) => <div key={i} className="h-24 animate-pulse rounded-3xl bg-white/70" />)}
          </div>
        </>
      )}

      {q.status === 'error' && (
        <div className="max-w-md rounded-3xl border border-red-100 bg-red-50 p-6 text-center">
          <p className="mb-3 text-sm text-red-700">{M.listError}</p>
          <button type="button" onClick={q.refresh} className="rounded-xl bg-[#7a0d0d] px-4 py-2 text-sm font-black text-white">{M.retry}</button>
        </div>
      )}

      {q.status === 'ready' && (
        <>
          {/* Stats */}
          <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
            {stats.map((st) => (
              <div key={st.label} className="flex items-center gap-4 rounded-3xl bg-white p-5 shadow-[0_18px_40px_-30px_rgba(122,13,13,0.45)] ring-1 ring-[#efe3cc]">
                <span className={`grid h-12 w-12 shrink-0 place-items-center rounded-2xl ${st.tone}`}>
                  <st.icon size={20} aria-hidden="true" />
                </span>
                <div>
                  <p className="text-2xl font-black text-gray-900" dir="ltr">{st.value}</p>
                  <p className="text-xs font-bold text-gray-500">{st.label}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="space-y-6">
            {/* Active deliveries */}
            <section className="rounded-3xl bg-white p-5 shadow-[0_18px_40px_-30px_rgba(122,13,13,0.45)] ring-1 ring-[#efe3cc] md:p-6">
              <h2 className="mb-5 flex items-center gap-2.5 font-black text-gray-900">
                <span className="grid h-9 w-9 place-items-center rounded-xl bg-[#7a0d0d]/[0.07] text-[#7a0d0d]">
                  <Truck size={17} aria-hidden="true" />
                </span>
                {M.activeTitle}
                <span className="rounded-full bg-[#faf3e7] px-2.5 py-0.5 text-xs font-black text-[#b68614]">{q.active.length}</span>
              </h2>
              {q.active.length === 0 ? (
                <p className="rounded-2xl border border-dashed border-[#efe3cc] bg-[#fffaf1] py-12 text-center text-sm font-bold text-gray-400">{M.noActive}</p>
              ) : (
                <div className="-mx-2 overflow-x-auto">
                  <table className="w-full min-w-[720px] border-collapse">
                    <thead>
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
                      {q.active.map((d) => {
                        const unassigned = d.driver_id == null
                        return (
                          // `order_number`, not `order_id` — see the note on the same
                          // choice in OverviewPage's live-deliveries table.
                          <tr key={d.order_number} className={`border-t border-[#f3ead9] transition hover:bg-[#fffaf1] ${unassigned ? 'bg-amber-50/40' : ''}`}>
                            <td className={`${td} whitespace-nowrap font-black text-[#7a0d0d]`}><span dir="ltr">{d.order_number}</span></td>
                            <td className={td}>
                              <span className="inline-flex whitespace-nowrap rounded-full bg-sky-50 px-2.5 py-1 text-[11px] font-black text-sky-700 ring-1 ring-sky-200">
                                {M.statusLabel[d.status] ?? d.status}
                              </span>
                            </td>
                            <td className={td}>
                              <span className="flex items-center gap-1.5 whitespace-nowrap"><Store size={13} className="shrink-0 text-gray-300" aria-hidden="true" />{d.cook_name ?? '—'}</span>
                            </td>
                            <td className={td}>
                              <span className="flex items-center gap-1.5 whitespace-nowrap"><MapPin size={13} className="shrink-0 text-gray-300" aria-hidden="true" />{d.area ?? '—'}</span>
                            </td>
                            <td className={td}>
                              {d.driver_name ? (
                                <span className="font-bold text-gray-900">{d.driver_name}</span>
                              ) : (
                                <span className="inline-flex items-center gap-1 whitespace-nowrap rounded-full bg-amber-100 px-2.5 py-1 text-[11px] font-black text-amber-800">
                                  <Clock size={11} aria-hidden="true" />{M.unassigned}
                                </span>
                              )}
                            </td>
                            <td className={td}>
                              <button
                                type="button"
                                onClick={() => q.openAssign(d)}
                                className={`whitespace-nowrap rounded-xl px-3 py-2 text-xs font-black transition ${
                                  unassigned
                                    ? 'bg-[#7a0d0d] text-white shadow-sm hover:bg-[#5a0909]'
                                    : 'border border-[#e8dcc4] bg-white text-[#7a0d0d] hover:bg-[#faf3e7]'
                                }`}
                              >
                                {unassigned ? M.assign : M.reassign}
                              </button>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </section>

            {/* Drivers */}
            <section className="rounded-3xl bg-white p-5 shadow-[0_18px_40px_-30px_rgba(122,13,13,0.45)] ring-1 ring-[#efe3cc] md:p-6">
              <h2 className="mb-5 flex items-center gap-2.5 font-black text-gray-900">
                <span className="grid h-9 w-9 place-items-center rounded-xl bg-[#7a0d0d]/[0.07] text-[#7a0d0d]">
                  <Bike size={17} aria-hidden="true" />
                </span>
                {M.driversTitle}
                <span className="rounded-full bg-[#faf3e7] px-2.5 py-0.5 text-xs font-black text-[#b68614]">{q.drivers.length}</span>
              </h2>
              {q.drivers.length === 0 ? (
                <p className="rounded-2xl border border-dashed border-[#efe3cc] bg-[#fffaf1] py-12 text-center text-sm font-bold text-gray-400">{M.noDrivers}</p>
              ) : (
                <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
                  {q.drivers.map((dr) => {
                    const isFree = dr.is_available && !dr.is_busy
                    return (
                      <li key={dr.id} className="flex items-center gap-3 rounded-2xl border border-[#f3ead9] bg-[#fffdf8] p-3 transition hover:border-[#e8dcc4]">
                        <span className="relative grid h-11 w-11 shrink-0 place-items-center rounded-full bg-[#7a0d0d] text-sm font-black text-[#ffd27a]">
                          {(dr.name ?? '؟').trim().charAt(0)}
                          <span className={`absolute -bottom-0.5 -left-0.5 h-3.5 w-3.5 rounded-full ring-2 ring-white ${isFree ? 'bg-emerald-500' : dr.is_busy ? 'bg-sky-500' : 'bg-gray-300'}`} aria-hidden="true" />
                        </span>
                        <div className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-black text-gray-900">{dr.name ?? '—'}</span>
                          <span className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[11px] text-gray-400">
                            {dr.phone && (
                              <span className="flex items-center gap-1"><Phone size={10} aria-hidden="true" /><span dir="ltr">{dr.phone}</span></span>
                            )}
                            <span className="flex items-center gap-1" title={M.rating}>
                              <Star size={10} className="fill-[#e0a52e] text-[#e0a52e]" aria-hidden="true" />
                              <span dir="ltr">{Number(dr.rating_avg ?? 0).toFixed(1)}</span>
                            </span>
                          </span>
                        </div>
                        <div className="flex flex-col items-end gap-1">
                          <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-black ring-1 ${isFree ? 'bg-emerald-50 text-emerald-700 ring-emerald-200' : 'bg-gray-50 text-gray-500 ring-gray-200'}`}>
                            {isFree ? M.available : M.busy}
                          </span>
                          <span className="text-[10px] font-bold text-gray-400">{M.colLoad}: {dr.is_busy ? 1 : 0}</span>
                        </div>
                      </li>
                    )
                  })}
                </ul>
              )}
            </section>
          </div>
        </>
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
