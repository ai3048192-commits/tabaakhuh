import { useId } from 'react'
import { RefreshCw, TrendingUp, Wallet, Percent, ShoppingBag } from 'lucide-react'
import { useReports } from './useReports'
import { reportMessages as M } from './messages'
import type { GroupBy } from './types'

function Kpi({ label, value, icon: Icon }: { label: string; value: string; icon: typeof TrendingUp }) {
  return (
    <div className="flex items-center justify-between rounded-2xl border border-gray-100 bg-white p-4">
      <div>
        <p className="text-[11px] font-bold text-gray-400">{label}</p>
        <p className="mt-1 text-lg font-black text-[#7a0d0d]" dir="ltr">{value}</p>
      </div>
      <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#7a0d0d]/5 text-[#7a0d0d]">
        <Icon size={20} aria-hidden="true" />
      </span>
    </div>
  )
}

export default function ReportsPage() {
  const q = useReports()
  const uid = useId()
  const field = 'rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm'
  const th = 'px-3 py-2 text-right text-xs font-black text-gray-500'
  const td = 'px-3 py-2 text-right text-sm text-gray-700'
  const r = q.report

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
      <p className="mb-5 text-xs text-gray-500">{M.metricsNote}</p>

      <div className="mb-5 flex flex-wrap items-end gap-3 rounded-2xl border border-gray-100 bg-white p-4">
        <div className="flex flex-col gap-1">
          <label htmlFor={`${uid}-from`} className="text-xs font-bold text-gray-500">{M.filterFrom}</label>
          <input id={`${uid}-from`} type="date" dir="ltr" className={field} value={q.draftFrom} onChange={(e) => q.setDraftFrom(e.target.value)} />
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor={`${uid}-to`} className="text-xs font-bold text-gray-500">{M.filterTo}</label>
          <input id={`${uid}-to`} type="date" dir="ltr" className={field} value={q.draftTo} onChange={(e) => q.setDraftTo(e.target.value)} />
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor={`${uid}-group`} className="text-xs font-bold text-gray-500">{M.groupBy}</label>
          <select id={`${uid}-group`} className={field} value={q.draftGroupBy} onChange={(e) => q.setDraftGroupBy(e.target.value as GroupBy)}>
            <option value="day">{M.groupByDay}</option>
            <option value="month">{M.groupByMonth}</option>
          </select>
        </div>
        <button type="button" onClick={q.apply} className="rounded-lg bg-[#7a0d0d] px-4 py-2 text-sm font-black text-white">{M.apply}</button>
        {q.dateError && <p className="w-full text-xs text-red-600" role="alert">{M.fromAfterTo}</p>}
      </div>

      {q.status === 'loading' && <p className="text-sm text-gray-500">{M.loading}</p>}

      {q.status === 'error' && (
        <div className="rounded-2xl border border-red-100 bg-red-50 p-6 text-center">
          <p className="mb-3 text-sm text-red-700">{M.listError}</p>
          <button type="button" onClick={q.refresh} className="rounded-xl bg-[#7a0d0d] px-4 py-2 text-sm font-black text-white">{M.retry}</button>
        </div>
      )}

      {q.status === 'ready' && r && (
        <>
          <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Kpi label={M.kpiRevenue} value={M.money(r.totals.revenue)} icon={TrendingUp} />
            <Kpi label={M.kpiCommission} value={M.money(r.totals.commission)} icon={Percent} />
            <Kpi label={M.kpiPayouts} value={M.money(r.totals.payouts)} icon={Wallet} />
            <Kpi label={M.kpiOrders} value={M.count(r.totals.orders)} icon={ShoppingBag} />
          </div>

          {r.series.length === 0 && r.breakdown.length === 0 ? (
            <p className="rounded-2xl border border-gray-100 bg-white p-10 text-center text-sm text-gray-500">{M.empty}</p>
          ) : (
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
              <section className="rounded-2xl border border-gray-100 bg-white p-4">
                <h2 className="mb-3 text-sm font-black text-gray-700">{M.seriesTitle}</h2>
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse">
                    <thead className="border-b border-gray-100">
                      <tr>
                        <th scope="col" className={th}>{M.colPeriod}</th>
                        <th scope="col" className={th}>{M.colRevenue}</th>
                        <th scope="col" className={th}>{M.colCommission}</th>
                        <th scope="col" className={th}>{M.colPayouts}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {r.series.map((p) => (
                        <tr key={p.period} className="border-b border-gray-50 last:border-0">
                          <td className={td} dir="ltr">{p.period}</td>
                          <td className={td} dir="ltr">{M.money(p.revenue)}</td>
                          <td className={td} dir="ltr">{M.money(p.commission)}</td>
                          <td className={td} dir="ltr">{M.money(p.payouts)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>

              <section className="rounded-2xl border border-gray-100 bg-white p-4">
                <h2 className="mb-3 text-sm font-black text-gray-700">{M.breakdownTitle}</h2>
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse">
                    <thead className="border-b border-gray-100">
                      <tr>
                        <th scope="col" className={th}>{M.colCity}</th>
                        <th scope="col" className={th}>{M.colRevenue}</th>
                        <th scope="col" className={th}>{M.colOrders}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {r.breakdown.map((b) => (
                        <tr key={b.label} className="border-b border-gray-50 last:border-0">
                          <td className={td}>{b.label}</td>
                          <td className={td} dir="ltr">{M.money(b.revenue)}</td>
                          <td className={td} dir="ltr">{M.count(b.orders)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>
            </div>
          )}
        </>
      )}
    </div>
  )
}
