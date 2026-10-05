import { useId } from 'react'
import { RefreshCw, TrendingUp, Wallet, Percent, ShoppingBag, MapPin } from 'lucide-react'
import { useReports } from './useReports'
import { reportMessages as M } from './messages'
import type { GroupBy } from './types'
import PageHeader from '../shared/PageHeader'
import { bannerBtnLight, cardCls } from '../shared/ui'

/** Same stat card as the Delivery screen: coloured icon chip, big number, label under it. */
function Kpi({ label, value, icon: Icon, tone }: { label: string; value: string; icon: typeof TrendingUp; tone: string }) {
  return (
    <div className={`flex items-center gap-4 ${cardCls} p-5`}>
      <span className={`grid h-12 w-12 shrink-0 place-items-center rounded-2xl ${tone}`}>
        <Icon size={20} aria-hidden="true" />
      </span>
      <div className="min-w-0">
        <p className="whitespace-nowrap text-2xl font-black text-gray-900" dir="ltr">{value}</p>
        <p className="text-xs font-bold text-gray-500">{label}</p>
      </div>
    </div>
  )
}

export default function ReportsPage() {
  const q = useReports()
  const uid = useId()
  const field = 'rounded-xl border border-[#e8dcc4] bg-white px-3.5 py-2.5 text-sm text-gray-800 shadow-sm outline-none transition focus:border-[#7a0d0d] focus:ring-4 focus:ring-[#7a0d0d]/10 disabled:opacity-50'
  const th = 'px-4 py-3 text-right text-xs font-bold text-gray-400'
  const td = 'border-t border-[#f3ead9] px-4 py-3 text-right text-sm text-gray-700'
  const r = q.report

  return (
    <div className="min-h-full bg-[#f7f1e6] p-4 font-['Tajawal'] md:p-8" dir="rtl">
      <PageHeader
        title={M.pageTitle}
        subtitle={M.metricsNote}
        actions={q.status === 'ready' && (
          <button type="button" onClick={q.refresh} className={bannerBtnLight}>
            <RefreshCw size={14} aria-hidden="true" />
            {M.refresh}
          </button>
        )}
      />

      <div className="mb-5 flex flex-wrap items-end gap-3 rounded-3xl bg-white shadow-[0_18px_40px_-30px_rgba(122,13,13,0.45)] ring-1 ring-[#efe3cc] p-4">
        <div className="flex flex-col gap-1">
          <label htmlFor={`${uid}-from`} className="text-xs font-black text-[#6b4f3a]">{M.filterFrom}</label>
          <input id={`${uid}-from`} type="date" dir="ltr" className={field} value={q.draftFrom} onChange={(e) => q.setDraftFrom(e.target.value)} />
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor={`${uid}-to`} className="text-xs font-black text-[#6b4f3a]">{M.filterTo}</label>
          <input id={`${uid}-to`} type="date" dir="ltr" className={field} value={q.draftTo} onChange={(e) => q.setDraftTo(e.target.value)} />
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor={`${uid}-group`} className="text-xs font-black text-[#6b4f3a]">{M.groupBy}</label>
          <select id={`${uid}-group`} className={field} value={q.draftGroupBy} onChange={(e) => q.setDraftGroupBy(e.target.value as GroupBy)}>
            <option value="day">{M.groupByDay}</option>
            <option value="month">{M.groupByMonth}</option>
          </select>
        </div>
        <button type="button" onClick={q.apply} className="rounded-xl bg-[#7a0d0d] px-4 py-2.5 text-sm font-black text-white shadow-sm transition hover:bg-[#5a0909] disabled:opacity-50">{M.apply}</button>
        {q.dateError && <p className="w-full text-xs text-red-600" role="alert">{M.fromAfterTo}</p>}
      </div>

      {q.status === 'loading' && <p className="text-sm text-gray-500">{M.loading}</p>}

      {q.status === 'error' && (
        <div className="max-w-md rounded-3xl border border-red-100 bg-red-50 p-6 text-center">
          <p className="mb-3 text-sm text-red-700">{M.listError}</p>
          <button type="button" onClick={q.refresh} className="rounded-xl bg-[#7a0d0d] px-4 py-2.5 text-sm font-black text-white shadow-sm transition hover:bg-[#5a0909]">{M.retry}</button>
        </div>
      )}

      {q.status === 'ready' && r && (() => {
        // Days / cities with no activity at all are noise — show only rows that moved.
        const series = r.series.filter((p) => p.revenue !== 0 || p.commission !== 0 || p.payouts !== 0)
        const breakdown = r.breakdown.filter((b) => b.revenue !== 0 || b.orders !== 0)
        return (
        <>
          <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Kpi label={M.kpiRevenue} value={M.money(r.totals.revenue)} icon={TrendingUp} tone="bg-emerald-100 text-emerald-700" />
            <Kpi label={M.kpiCommission} value={M.money(r.totals.commission)} icon={Percent} tone="bg-[#7a0d0d]/10 text-[#7a0d0d]" />
            <Kpi label={M.kpiPayouts} value={M.money(r.totals.payouts)} icon={Wallet} tone="bg-amber-100 text-amber-700" />
            <Kpi label={M.kpiOrders} value={M.count(r.totals.orders)} icon={ShoppingBag} tone="bg-sky-100 text-sky-700" />
          </div>

          {series.length === 0 && breakdown.length === 0 ? (
            <p className="rounded-3xl bg-white shadow-[0_18px_40px_-30px_rgba(122,13,13,0.45)] ring-1 ring-[#efe3cc] p-10 text-center text-sm font-bold text-gray-400">{M.empty}</p>
          ) : (
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
              <section className="rounded-3xl bg-white shadow-[0_18px_40px_-30px_rgba(122,13,13,0.45)] ring-1 ring-[#efe3cc] p-5 md:p-6">
                <h2 className="mb-5 flex items-center gap-2.5 font-black text-gray-900"><span className="grid h-9 w-9 place-items-center rounded-xl bg-[#7a0d0d]/[0.07] text-[#7a0d0d]"><TrendingUp size={17} aria-hidden="true" /></span>{M.seriesTitle}</h2>
                {series.length === 0 ? (
                  <p className="rounded-2xl border border-dashed border-[#efe3cc] bg-[#fffaf1] py-8 text-center text-xs font-bold text-gray-400">{M.noActivity}</p>
                ) : (
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse">
                    <thead className="bg-[#fffaf1]">
                      <tr>
                        <th scope="col" className={th}>{M.colPeriod}</th>
                        <th scope="col" className={th}>{M.colRevenue}</th>
                        <th scope="col" className={th}>{M.colCommission}</th>
                        <th scope="col" className={th}>{M.colPayouts}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {series.map((p) => (
                        <tr key={p.period} className="transition hover:bg-[#fffaf1]">
                          <td className={td} dir="ltr">{p.period}</td>
                          <td className={td} dir="ltr">{M.money(p.revenue)}</td>
                          <td className={td} dir="ltr">{M.money(p.commission)}</td>
                          <td className={td} dir="ltr">{M.money(p.payouts)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                )}
              </section>

              <section className="rounded-3xl bg-white shadow-[0_18px_40px_-30px_rgba(122,13,13,0.45)] ring-1 ring-[#efe3cc] p-5 md:p-6">
                <h2 className="mb-5 flex items-center gap-2.5 font-black text-gray-900"><span className="grid h-9 w-9 place-items-center rounded-xl bg-[#7a0d0d]/[0.07] text-[#7a0d0d]"><MapPin size={17} aria-hidden="true" /></span>{M.breakdownTitle}</h2>
                {breakdown.length === 0 ? (
                  <p className="rounded-2xl border border-dashed border-[#efe3cc] bg-[#fffaf1] py-8 text-center text-xs font-bold text-gray-400">{M.noActivity}</p>
                ) : (
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse">
                    <thead className="bg-[#fffaf1]">
                      <tr>
                        <th scope="col" className={th}>{M.colCity}</th>
                        <th scope="col" className={th}>{M.colRevenue}</th>
                        <th scope="col" className={th}>{M.colOrders}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {breakdown.map((b) => (
                        <tr key={b.label} className="transition hover:bg-[#fffaf1]">
                          <td className={td}>{b.label}</td>
                          <td className={td} dir="ltr">{M.money(b.revenue)}</td>
                          <td className={td} dir="ltr">{M.count(b.orders)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                )}
              </section>
            </div>
          )}
        </>
        )
      })()}
    </div>
  )
}
