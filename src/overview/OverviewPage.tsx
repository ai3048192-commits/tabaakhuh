import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Bar } from 'react-chartjs-2'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Tooltip,
  Legend,
} from 'chart.js'
import {
  Users, ChefHat, Bike, MapPin, ShoppingCart, Coins,
  PlusCircle, Send, UserPlus, RefreshCw, AlertTriangle, Eye, X, TableProperties,
} from 'lucide-react'
import { useOverview } from './useOverview'
import { useHomeExtras } from './useHomeExtras'
import { useCityNames } from '../cities/useCityNames'
import { formatCount, formatCurrency, formatTime } from './format'
import { overviewMessages as M } from './messages'
import type { ActiveDelivery } from '../delivery/types'
import type { Order } from '../orders/types'

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip, Legend)

/** Backend order-status enum → Arabic label, with a fallback for unknown values. */
const statusText = (s: string): string =>
  (M.statusLabel as Record<string, string>)[s] ?? M.unknownStatusLabel(s)

interface Props {
  onQuickAction?: (type: string) => void
}

function Kpi({ label, value, icon: Icon, tone }: { label: string; value: string; icon: typeof Users; tone: string }) {
  return (
    <div className="flex items-center justify-between rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
      <div>
        <p className="mb-1 text-[10px] font-bold text-gray-400">{label}</p>
        <h3 className="text-2xl font-black text-gray-800" dir="ltr">{value}</h3>
      </div>
      <span className={`rounded-xl p-3 ${tone}`}>
        <Icon size={24} aria-hidden="true" />
      </span>
    </div>
  )
}

type DetailModal =
  | { kind: 'delivery'; row: ActiveDelivery }
  | { kind: 'order'; row: Order }
  | null

/** `/dashboard` — the platform home: KPIs, daily-orders chart, quick actions, live deliveries, queues. */
export default function OverviewPage({ onQuickAction }: Props) {
  const { status, snapshot, lastUpdated, refreshing, refreshError, refresh } = useOverview()
  const extras = useHomeExtras()
  const cityNames = useCityNames()
  const [detail, setDetail] = useState<DetailModal>(null)

  const usersTotal = snapshot ? snapshot.roles.reduce((s, r) => s + r.count, 0) : 0
  const cooksTotal = snapshot ? (snapshot.roles.find((r) => r.role === 'cook')?.count ?? 0) : 0
  const ordersTotal = snapshot ? snapshot.statuses.reduce((s, x) => s + x.count, 0) : 0

  const chart = useMemo(() => {
    const pts = extras.ordersDaily ?? []
    return {
      data: {
        labels: pts.map((p) => p.date.slice(5)),
        datasets: [{
          label: M.chartLabel,
          data: pts.map((p) => p.count),
          backgroundColor: '#7a0d0d',
          hoverBackgroundColor: '#9a1212',
          borderRadius: 8,
          barThickness: 22,
          maxBarThickness: 34,
        }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
          y: { display: false },
          x: { grid: { display: false }, ticks: { color: '#7a0d0d', font: { size: 11, weight: 'bold' as const } } },
        },
      },
    }
  }, [extras.ordersDaily])

  const fire = (t: string) => onQuickAction?.(t)

  return (
    <div className="min-h-full bg-[#fcf9f2] p-4 font-['Tajawal'] md:p-6" dir="rtl">
      <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-black text-[#7a0d0d]">{M.pageTitle}</h1>
          <p className="mt-1 text-xs font-bold text-gray-400">{M.subtitle}</p>
          {status === 'ready' && lastUpdated && (
            <p className="mt-1 text-xs font-bold text-gray-400">{M.lastUpdated(formatTime(lastUpdated))}</p>
          )}
        </div>
        {status === 'ready' && (
          <button
            type="button"
            onClick={() => { refresh(); extras.refresh() }}
            disabled={refreshing}
            aria-busy={refreshing}
            className="flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs font-bold text-gray-600 disabled:opacity-60"
          >
            <RefreshCw size={14} aria-hidden="true" className={refreshing ? 'animate-spin' : undefined} />
            {refreshing ? M.refreshing : M.refresh}
          </button>
        )}
      </div>

      {status === 'ready' && refreshError && (
        <div className="mb-6 flex flex-wrap items-center gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
          <AlertTriangle size={16} aria-hidden="true" />
          <span>{M.refreshFailedNotice}</span>
          <button type="button" onClick={refresh} disabled={refreshing} className="rounded-lg bg-[#7a0d0d] px-3 py-1.5 text-xs font-black text-white disabled:opacity-60">
            {M.retry}
          </button>
        </div>
      )}

      {status === 'loading' && <p className="text-sm text-gray-500">{M.loading}</p>}

      {status === 'error' && (
        <div className="max-w-md rounded-2xl border border-red-100 bg-red-50 p-6 text-center">
          <p className="mb-3 text-sm text-red-700">{M.loadError}</p>
          <button type="button" onClick={refresh} className="inline-flex items-center gap-2 rounded-xl bg-[#7a0d0d] px-4 py-2 text-sm font-black text-white">
            <RefreshCw size={14} aria-hidden="true" />
            {M.retry}
          </button>
        </div>
      )}

      {status === 'ready' && snapshot && (
        <>
          {/* KPI cards */}
          <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <Kpi label={M.kpiUsers} value={formatCount(usersTotal)} icon={Users} tone="bg-gray-50 text-gray-800" />
            <Kpi label={M.kpiCooks} value={formatCount(cooksTotal)} icon={ChefHat} tone="bg-red-50 text-red-800" />
            <Kpi label={M.kpiDriversAvailable} value={extras.driversOk && extras.driversAvailable != null ? formatCount(extras.driversAvailable) : M.na} icon={Bike} tone="bg-blue-50 text-blue-600" />
            <Kpi label={M.kpiDriversBusy} value={extras.driversOk && extras.driversBusy != null ? formatCount(extras.driversBusy) : M.na} icon={MapPin} tone="bg-orange-50 text-orange-600" />
            <Kpi label={M.kpiOrders} value={formatCount(ordersTotal)} icon={ShoppingCart} tone="bg-green-50 text-green-600" />
            <Kpi label={M.kpiRevenue} value={formatCurrency(snapshot.revenue)} icon={Coins} tone="bg-red-50 text-red-800" />
          </div>

          {/* Chart + quick actions */}
          <div className="mb-8 grid grid-cols-1 gap-6 lg:grid-cols-3">
            <section className="rounded-[2rem] border border-[#e8dfc9] bg-[#fcf9f2] p-6 lg:col-span-2">
              <h2 className="text-[10px] font-black uppercase tracking-widest text-gray-400">{M.chartTitle}</h2>
              {!extras.ordersDailyOk ? (
                <p className="mt-6 text-xs text-amber-700">{M.chartError}</p>
              ) : (extras.ordersDaily?.length ?? 0) === 0 ? (
                <p className="mt-6 text-xs text-gray-400">{M.chartEmpty}</p>
              ) : (
                <div className="mt-4 h-48">
                  <Bar
                    data={chart.data}
                    options={chart.options}
                    role="img"
                    aria-label={M.chartTitle}
                  />
                </div>
              )}
            </section>

            <section className="flex flex-col gap-4 rounded-[2rem] border border-[#e8dfc9] bg-[#fcf9f2] p-4">
              <p className="text-center text-[10px] font-black uppercase text-gray-400">{M.quickActionsTitle}</p>
              <button type="button" onClick={() => fire('إضافة طباخة')} className="flex w-full items-center justify-center gap-3 rounded-xl bg-[#7a0d0d] py-4 text-sm font-black text-white">
                <PlusCircle size={20} aria-hidden="true" /> {M.qaAddCook}
              </button>
              <button type="button" onClick={() => fire('إشعار عام')} className="flex w-full items-center justify-center gap-3 rounded-xl bg-[#7a0d0d] py-4 text-sm font-black text-white">
                <Send size={20} aria-hidden="true" /> {M.qaBroadcast}
              </button>
              <button type="button" onClick={() => fire('مستخدم جديد')} className="flex w-full items-center justify-center gap-3 rounded-xl bg-[#7a0d0d] py-4 text-sm font-black text-white">
                <UserPlus size={20} aria-hidden="true" /> {M.qaNewUser}
              </button>
            </section>
          </div>

          {/* Live deliveries */}
          <section className="mb-8 rounded-2xl border border-[#e8dfc9] bg-[#fcf9f2] p-6">
            <div className="mb-6 flex items-center justify-between">
              <h2 className="font-black text-gray-800">{M.deliveriesTitle}</h2>
              <Link to="/delivery" className="flex items-center gap-2 text-xs font-bold text-[#b68614] hover:underline">
                <TableProperties size={16} aria-hidden="true" /> {M.viewAll}
              </Link>
            </div>
            {!extras.deliveriesOk ? (
              <p className="py-6 text-center text-xs text-amber-700">{M.deliveriesError}</p>
            ) : (extras.deliveries?.length ?? 0) === 0 ? (
              <p className="py-6 text-center text-sm text-gray-400">{M.noDeliveries}</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[720px] text-right text-sm">
                  <thead className="border-b border-[#e8dfc9] text-gray-400">
                    <tr>
                      <th scope="col" className="pb-3 font-bold">{M.colDriver}</th>
                      <th scope="col" className="pb-3 font-bold">{M.colOrderAddress}</th>
                      <th scope="col" className="pb-3 font-bold">{M.colPrice}</th>
                      <th scope="col" className="pb-3 font-bold">{M.colCommission}</th>
                      <th scope="col" className="pb-3 font-bold">{M.colStatus}</th>
                      <th scope="col" className="pb-3 font-bold">{M.colDetails}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(extras.deliveries ?? []).map((d) => (
                      <tr key={d.order_id} className="border-b border-[#e8dfc9] last:border-0 hover:bg-white/50">
                        <td className="py-4 font-bold text-[#7a0d0d]">{d.driver_name ?? M.na}</td>
                        <td className="py-4 text-gray-600">{d.area ?? M.na}</td>
                        <td className="py-4 text-gray-600" dir="ltr">{d.total != null ? formatCurrency(d.total) : M.na}</td>
                        <td className="py-4 font-bold text-green-600" dir="ltr">{d.commission != null ? formatCurrency(d.commission) : M.na}</td>
                        <td className="py-4">
                          <span className="rounded-full bg-green-100 px-3 py-1 text-[10px] text-green-700">{statusText(d.status)}</span>
                        </td>
                        <td className="py-4">
                          <button type="button" aria-label={M.colDetails} onClick={() => setDetail({ kind: 'delivery', row: d })}>
                            <Eye size={18} className="text-[#7a0d0d] hover:text-red-700" aria-hidden="true" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          {/* Queues */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <section className="rounded-2xl border border-[#e8dfc9] bg-[#fcf9f2] p-6">
              <div className="mb-6 flex items-center justify-between">
                <h2 className="font-black text-gray-800">{M.preparingTitle}</h2>
                <Link to="/orders?status=preparing" className="text-xs font-bold text-[#b68614] hover:underline">{M.viewAll}</Link>
              </div>
              {(extras.preparing?.length ?? 0) === 0 ? (
                <p className="py-4 text-center text-sm text-gray-400">{M.noPreparing}</p>
              ) : (
                <ul className="space-y-3">
                  {(extras.preparing ?? []).map((o) => (
                    <li key={o.id} className="flex items-center justify-between gap-3 border-b pb-3 text-sm last:border-0">
                      <span className="font-bold text-[#7a0d0d]" dir="ltr">{o.order_number}</span>
                      <span className="text-gray-500" dir="ltr">{formatCurrency(o.total)}</span>
                      <button type="button" aria-label={M.colDetails} onClick={() => setDetail({ kind: 'order', row: o })}>
                        <Eye size={18} className="text-[#7a0d0d]" aria-hidden="true" />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <section className="rounded-2xl border border-[#e8dfc9] bg-[#fcf9f2] p-6">
              <div className="mb-6 flex items-center justify-between">
                <h2 className="font-black text-gray-800">{M.recentCooksTitle}</h2>
                <Link to="/cooks" className="text-xs font-bold text-[#b68614] hover:underline">{M.viewAll}</Link>
              </div>
              {!extras.recentCooksOk ? (
                <p className="py-4 text-center text-xs text-amber-700">{M.recentCooksError}</p>
              ) : (extras.recentCooks?.length ?? 0) === 0 ? (
                <p className="py-4 text-center text-sm text-gray-400">{M.noRecentCooks}</p>
              ) : (
                <ul className="space-y-3">
                  {(extras.recentCooks ?? []).map((c) => (
                    <li key={c.id} className="flex items-center justify-between gap-3 border-b pb-3 text-sm last:border-0">
                      <span className="font-bold text-gray-800">{c.store_name}</span>
                      <span className="text-gray-400">
                        {c.city_id != null ? cityNames.resolve(c.city_id) : (c.area ?? M.na)}
                      </span>
                      <span className="text-gray-400" dir="ltr">{c.joined_at?.slice(0, 10) ?? M.na}</span>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </div>
        </>
      )}

      {detail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" role="dialog" aria-modal="true" aria-label={detail.kind === 'delivery' ? M.detailDeliveryTitle : M.detailOrderTitle}>
          <div className="w-full max-w-lg overflow-hidden rounded-3xl bg-white shadow-2xl">
            <div className="flex items-center justify-between bg-gradient-to-r from-[#7a0d0d] to-[#9a1212] px-6 py-5 text-white">
              <h3 className="text-lg font-black">{detail.kind === 'delivery' ? M.detailDeliveryTitle : M.detailOrderTitle}</h3>
              <button type="button" onClick={() => setDetail(null)} aria-label={M.close} className="rounded-xl p-2 transition hover:bg-white/20">
                <X size={24} aria-hidden="true" />
              </button>
            </div>
            <div className="space-y-4 p-8 text-sm">
              {detail.kind === 'delivery' ? (
                <>
                  <Row label={M.fDriver} value={detail.row.driver_name ?? M.na} />
                  <Row label={M.fOrderNo} value={detail.row.order_number} ltr />
                  <Row label={M.fAddress} value={detail.row.area ?? M.na} />
                  <Row label={M.fPrice} value={detail.row.total != null ? formatCurrency(detail.row.total) : M.na} ltr />
                  <Row label={M.fCommission} value={detail.row.commission != null ? formatCurrency(detail.row.commission) : M.na} ltr />
                </>
              ) : (
                <>
                  <Row label={M.fOrderNumber} value={detail.row.order_number} ltr />
                  <Row label={M.fOrderStatus} value={statusText(detail.row.status)} />
                  <Row label={M.fPrice} value={formatCurrency(detail.row.total)} ltr />
                </>
              )}
            </div>
            <div className="flex justify-end border-t bg-gray-50 px-8 py-6">
              <button type="button" onClick={() => setDetail(null)} className="rounded-2xl bg-[#7a0d0d] px-8 py-3 font-black text-white transition hover:bg-[#9a1212]">
                {M.close}
              </button>
            </div>
          </div>
        </div>
      )}

      <div aria-live="polite" role="status" className="sr-only">
        {refreshError ? M.refreshFailedNotice : lastUpdated ? M.lastUpdated(formatTime(lastUpdated)) : ''}
      </div>
    </div>
  )
}

function Row({ label, value, ltr }: { label: string; value: string; ltr?: boolean }) {
  return (
    <div className="flex justify-between border-b py-3 last:border-0">
      <span className="text-gray-500">{label}</span>
      <span className="font-bold text-gray-800" dir={ltr ? 'ltr' : undefined}>{value}</span>
    </div>
  )
}
