import { lazy, Suspense, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Users, ChefHat, Bike, MapPin, ShoppingCart, Coins,
  PlusCircle, Send, UserPlus, RefreshCw, AlertTriangle, Eye, X, ArrowLeft,
  CalendarDays, Flame, CheckCircle2, Store, BarChart3, Zap, Truck,
} from 'lucide-react'
import type { ReactNode } from 'react'
import { useOverview } from './useOverview'
import { useHomeExtras } from './useHomeExtras'
import { useCityNames } from '../cities/useCityNames'
import { formatCount, formatCurrency, formatTime } from './format'
import { overviewMessages as M } from './messages'
import type { ActiveDelivery } from '../delivery/types'
import type { Order } from '../orders/types'

/** Chart.js is pulled in only when there is actually a chart to draw. */
const OrdersBarChart = lazy(() => import('./OrdersBarChart'))

/** Backend order-status enum → Arabic label, with a fallback for unknown values. */
const statusText = (s: string): string =>
  (M.statusLabel as Record<string, string>)[s] ?? M.unknownStatusLabel(s)

interface Props {
  onQuickAction?: (type: string) => void
}

/** Status → pill colours, grouped by where the order is in its lifecycle. */
function statusTone(s: string): string {
  if (['delivered', 'completed'].includes(s)) return 'bg-emerald-50 text-emerald-700 ring-emerald-200'
  if (['cancelled'].includes(s)) return 'bg-red-50 text-red-700 ring-red-200'
  if (['on_the_way', 'picked_up', 'assigned_to_driver'].includes(s)) return 'bg-sky-50 text-sky-700 ring-sky-200'
  if (['ready_for_pickup'].includes(s)) return 'bg-violet-50 text-violet-700 ring-violet-200'
  return 'bg-amber-50 text-amber-800 ring-amber-200'
}

function StatusPill({ status }: { status: string }) {
  return (
    <span className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-1 text-[11px] font-black ring-1 ${statusTone(status)}`}>
      <span className="h-1.5 w-1.5 rounded-full bg-current" aria-hidden="true" />
      {statusText(status)}
    </span>
  )
}

function Kpi({ label, value, icon: Icon, tone }: { label: string; value: string; icon: typeof Users; tone: string }) {
  return (
    <div className="group relative flex items-center justify-between gap-4 overflow-hidden rounded-3xl bg-white p-5 shadow-[0_18px_40px_-28px_rgba(122,13,13,0.45)] ring-1 ring-[#efe3cc] transition hover:-translate-y-0.5 hover:shadow-[0_24px_50px_-28px_rgba(122,13,13,0.55)]">
      <div className="min-w-0">
        <p className="mb-1.5 text-xs font-bold text-gray-500">{label}</p>
        <h3 className="whitespace-nowrap text-2xl font-black tracking-tight text-gray-900" dir="ltr">{value}</h3>
      </div>
      <span className={`grid h-12 w-12 shrink-0 place-items-center rounded-2xl ${tone}`}>
        <Icon size={22} aria-hidden="true" />
      </span>
    </div>
  )
}

function Panel({
  title, icon: Icon, action, children, className = '',
}: {
  title: string
  icon: typeof Users
  action?: ReactNode
  children: ReactNode
  className?: string
}) {
  return (
    <section className={`rounded-3xl bg-white p-5 shadow-[0_18px_40px_-30px_rgba(122,13,13,0.45)] ring-1 ring-[#efe3cc] md:p-6 ${className}`}>
      <div className="mb-5 flex items-center justify-between gap-3">
        <h2 className="flex items-center gap-2.5 font-black text-gray-900">
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-[#7a0d0d]/[0.07] text-[#7a0d0d]">
            <Icon size={17} aria-hidden="true" />
          </span>
          {title}
        </h2>
        {action}
      </div>
      {children}
    </section>
  )
}

function ViewAll({ to }: { to: string }) {
  return (
    <Link to={to} className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-black text-[#b68614] transition hover:bg-[#faf3e7]">
      {M.viewAll} <ArrowLeft size={13} aria-hidden="true" />
    </Link>
  )
}

function Empty({ children, warn }: { children: ReactNode; warn?: boolean }) {
  return (
    <p className={`rounded-2xl border border-dashed py-8 text-center text-xs font-bold ${warn ? 'border-amber-200 bg-amber-50/60 text-amber-700' : 'border-[#efe3cc] bg-[#fffaf1] text-gray-400'}`}>
      {children}
    </p>
  )
}

const todayLabel = () =>
  new Date().toLocaleDateString('ar-EG', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })

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
          hoverBackgroundColor: '#b68614',
          borderRadius: 10,
          borderSkipped: false,
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
          x: { grid: { display: false }, border: { display: false }, ticks: { color: '#8a6f55', font: { size: 11, weight: 'bold' as const } } },
        },
      },
    }
  }, [extras.ordersDaily])

  const fire = (t: string) => onQuickAction?.(t)

  const quickActions = [
    { key: 'إضافة طباخة', label: M.qaAddCook, icon: PlusCircle, tone: 'from-[#7a0d0d] to-[#9a1212]' },
    { key: 'إضافة سائق', label: M.qaAddDriver, icon: Bike, tone: 'from-[#0f5e8c] to-[#1679b3]' },
    { key: 'إشعار عام', label: M.qaBroadcast, icon: Send, tone: 'from-[#b68614] to-[#d9a21c]' },
    { key: 'مستخدم جديد', label: M.qaNewUser, icon: UserPlus, tone: 'from-[#1f7a4d] to-[#28995f]' },
  ]

  return (
    <div className="min-h-full bg-[#f7f1e6] p-4 font-['Tajawal'] md:p-8" dir="rtl">
      {/* Welcome banner */}
      <div className="relative mb-6 overflow-hidden rounded-[2rem] bg-gradient-to-l from-[#7a0d0d] via-[#5e0a0a] to-[#2e0404] p-6 text-white shadow-[0_30px_60px_-30px_rgba(122,13,13,0.8)] md:p-8">
        <div className="pointer-events-none absolute inset-0 opacity-[0.07] [background-image:radial-gradient(circle,#fff_1.5px,transparent_1.5px)] [background-size:22px_22px]" aria-hidden="true" />
        <div className="pointer-events-none absolute -left-16 -top-20 h-64 w-64 rounded-full bg-[#e0a52e]/15 blur-3xl" aria-hidden="true" />
        <div className="relative flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="mb-2 inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 text-[11px] font-bold text-[#ffd27a] ring-1 ring-white/10">
              <CalendarDays size={12} aria-hidden="true" /> {todayLabel()}
            </p>
            <h1 className="text-2xl font-black md:text-3xl">{M.pageTitle}</h1>
            <p className="mt-1.5 text-sm text-white/70">{M.subtitle}</p>
            {status === 'ready' && lastUpdated && (
              <p className="mt-1 text-xs font-bold text-white/50">{M.lastUpdated(formatTime(lastUpdated))}</p>
            )}
          </div>
          {status === 'ready' && (
            <button
              type="button"
              onClick={() => { refresh(); extras.refresh() }}
              disabled={refreshing}
              aria-busy={refreshing}
              className="flex items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-xs font-black text-[#7a0d0d] shadow-lg transition hover:bg-[#fff7e6] disabled:opacity-60"
            >
              <RefreshCw size={14} aria-hidden="true" className={refreshing ? 'animate-spin' : undefined} />
              {refreshing ? M.refreshing : M.refresh}
            </button>
          )}
        </div>
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

      {status === 'loading' && (
        <>
          <p className="sr-only">{M.loading}</p>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3" aria-hidden="true">
            {[0, 1, 2, 3, 4, 5].map((i) => <div key={i} className="h-24 animate-pulse rounded-3xl bg-white/70" />)}
          </div>
        </>
      )}

      {status === 'error' && (
        <div className="max-w-md rounded-3xl border border-red-100 bg-red-50 p-6 text-center">
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
          <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
            <Kpi label={M.kpiUsers} value={formatCount(usersTotal)} icon={Users} tone="bg-slate-100 text-slate-700" />
            <Kpi label={M.kpiCooks} value={formatCount(cooksTotal)} icon={ChefHat} tone="bg-[#7a0d0d]/10 text-[#7a0d0d]" />
            <Kpi label={M.kpiDriversAvailable} value={extras.driversOk && extras.driversAvailable != null ? formatCount(extras.driversAvailable) : M.na} icon={Bike} tone="bg-sky-100 text-sky-700" />
            <Kpi label={M.kpiDriversBusy} value={extras.driversOk && extras.driversBusy != null ? formatCount(extras.driversBusy) : M.na} icon={MapPin} tone="bg-orange-100 text-orange-700" />
            <Kpi label={M.kpiOrders} value={formatCount(ordersTotal)} icon={ShoppingCart} tone="bg-emerald-100 text-emerald-700" />
            <Kpi label={M.kpiRevenue} value={formatCurrency(snapshot.revenue)} icon={Coins} tone="bg-[#b68614]/15 text-[#8f680d]" />
          </div>

          {/* Chart + quick actions */}
          <div className="mb-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
            <Panel title={M.chartTitle} icon={BarChart3} className="lg:col-span-2">
              {!extras.ordersDailyOk ? (
                <Empty warn>{M.chartError}</Empty>
              ) : (extras.ordersDaily?.length ?? 0) === 0 ? (
                <Empty>{M.chartEmpty}</Empty>
              ) : (
                <div className="h-56">
                  <Suspense fallback={<div className="h-full w-full animate-pulse rounded-2xl bg-[#f6eddc]" />}>
                    <OrdersBarChart
                      data={chart.data}
                      options={chart.options}
                      label={M.chartTitle}
                    />
                  </Suspense>
                </div>
              )}
            </Panel>

            <Panel title={M.quickActionsTitle} icon={Zap}>
              <div className="grid grid-cols-2 gap-3">
                {quickActions.map((a) => (
                  <button
                    key={a.key}
                    type="button"
                    onClick={() => fire(a.key)}
                    className={`group flex min-h-[7rem] flex-col items-start justify-between rounded-2xl bg-gradient-to-br ${a.tone} p-4 text-right text-white shadow-md transition hover:-translate-y-0.5 hover:shadow-lg`}
                  >
                    <span className="grid h-9 w-9 place-items-center rounded-xl bg-white/15 transition group-hover:scale-110">
                      <a.icon size={18} aria-hidden="true" />
                    </span>
                    <span className="text-sm font-black leading-snug">{a.label}</span>
                  </button>
                ))}
              </div>
            </Panel>
          </div>

          {/* Live deliveries */}
          <Panel title={M.deliveriesTitle} icon={Truck} action={<ViewAll to="/delivery" />} className="mb-6">
            {!extras.deliveriesOk ? (
              <Empty warn>{M.deliveriesError}</Empty>
            ) : (extras.deliveries?.length ?? 0) === 0 ? (
              <Empty>{M.noDeliveries}</Empty>
            ) : (
              <div className="-mx-2 overflow-x-auto">
                <table className="w-full min-w-[720px] text-right text-sm">
                  <thead>
                    <tr className="text-xs text-gray-400">
                      <th scope="col" className="px-3 pb-3 font-bold">{M.colDriver}</th>
                      <th scope="col" className="px-3 pb-3 font-bold">{M.colOrderAddress}</th>
                      <th scope="col" className="px-3 pb-3 font-bold">{M.colPrice}</th>
                      <th scope="col" className="px-3 pb-3 font-bold">{M.colCommission}</th>
                      <th scope="col" className="px-3 pb-3 font-bold">{M.colStatus}</th>
                      <th scope="col" className="px-3 pb-3 font-bold">{M.colDetails}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(extras.deliveries ?? []).map((d) => (
                      // `order_number` (not `order_id`): a defence-in-depth choice — the
                      // backend has already once sent the order id under an unexpected
                      // field name, which silently made every `order_id` here identical
                      // and let React misattribute a stale row's content across refreshes.
                      // `order_number` is always a distinct, non-empty string.
                      <tr key={d.order_number} className="border-t border-[#f3ead9] transition hover:bg-[#fffaf1]">
                        <td className="px-3 py-3.5">
                          <span className="flex items-center gap-2.5">
                            <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-[#7a0d0d]/10 text-[#7a0d0d]">
                              <Bike size={14} aria-hidden="true" />
                            </span>
                            <span className="font-black text-gray-900">{d.driver_name ?? M.na}</span>
                          </span>
                        </td>
                        <td className="px-3 py-3.5 text-gray-600">{d.area ?? M.na}</td>
                        <td className="px-3 py-3.5 font-bold text-gray-700" dir="ltr">{d.total != null ? formatCurrency(d.total) : M.na}</td>
                        <td className="px-3 py-3.5 font-black text-emerald-600" dir="ltr">{d.commission != null ? formatCurrency(d.commission) : M.na}</td>
                        <td className="px-3 py-3.5"><StatusPill status={d.status} /></td>
                        <td className="px-3 py-3.5">
                          <button
                            type="button"
                            aria-label={M.colDetails}
                            onClick={() => setDetail({ kind: 'delivery', row: d })}
                            className="grid h-9 w-9 place-items-center rounded-xl text-[#7a0d0d] transition hover:bg-[#7a0d0d]/10"
                          >
                            <Eye size={17} aria-hidden="true" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Panel>

          {/* Queues */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 2xl:grid-cols-3">
            <Panel title={M.preparingTitle} icon={Flame} action={<ViewAll to="/orders?status=preparing" />}>
              {(extras.preparing?.length ?? 0) === 0 ? (
                <Empty>{M.noPreparing}</Empty>
              ) : (
                <ul className="divide-y divide-[#f3ead9]">
                  {(extras.preparing ?? []).map((o) => (
                    <li key={o.id} className="flex items-center justify-between gap-3 py-3 text-sm">
                      <span className="font-black text-[#7a0d0d]" dir="ltr">{o.order_number}</span>
                      <span className="font-bold text-gray-500" dir="ltr">{formatCurrency(o.total)}</span>
                      <button
                        type="button"
                        aria-label={M.colDetails}
                        onClick={() => setDetail({ kind: 'order', row: o })}
                        className="grid h-8 w-8 place-items-center rounded-lg text-[#7a0d0d] transition hover:bg-[#7a0d0d]/10"
                      >
                        <Eye size={16} aria-hidden="true" />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </Panel>

            <Panel title={M.recentCooksTitle} icon={Store} action={<ViewAll to="/cooks" />}>
              {!extras.recentCooksOk ? (
                <Empty warn>{M.recentCooksError}</Empty>
              ) : (extras.recentCooks?.length ?? 0) === 0 ? (
                <Empty>{M.noRecentCooks}</Empty>
              ) : (
                <ul className="divide-y divide-[#f3ead9]">
                  {(extras.recentCooks ?? []).map((c) => (
                    <li key={c.id} className="flex items-center gap-3 py-3 text-sm">
                      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-[#b68614]/15 text-[#8f680d]">
                        <ChefHat size={16} aria-hidden="true" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate font-black text-gray-900">{c.store_name}</span>
                        <span className="block text-xs text-gray-400">
                          {c.city_id != null ? cityNames.resolve(c.city_id) : (c.area ?? M.na)}
                        </span>
                      </span>
                      <span className="text-xs font-bold text-gray-400" dir="ltr">{c.joined_at?.slice(0, 10) ?? M.na}</span>
                    </li>
                  ))}
                </ul>
              )}
            </Panel>

            <Panel title={M.completedOrdersTitle} icon={CheckCircle2} action={<ViewAll to="/orders?status=delivered" />} className="lg:col-span-2 2xl:col-span-1">
              {!extras.completedOrdersOk ? (
                <Empty warn>{M.completedOrdersError}</Empty>
              ) : (extras.completedOrders?.length ?? 0) === 0 ? (
                <Empty>{M.noCompletedOrders}</Empty>
              ) : (
                <ul className="divide-y divide-[#f3ead9]">
                  {(extras.completedOrders ?? []).map((o) => (
                    <li key={o.id} className="flex items-center justify-between gap-3 py-3 text-sm">
                      <span className="font-black text-[#7a0d0d]" dir="ltr">{o.order_number}</span>
                      <StatusPill status={o.status} />
                      <span className="font-bold text-gray-500" dir="ltr">{formatCurrency(o.total)}</span>
                      <button
                        type="button"
                        aria-label={M.colDetails}
                        onClick={() => setDetail({ kind: 'order', row: o })}
                        className="grid h-8 w-8 place-items-center rounded-lg text-[#7a0d0d] transition hover:bg-[#7a0d0d]/10"
                      >
                        <Eye size={16} aria-hidden="true" />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </Panel>
          </div>
        </>
      )}

      {detail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-label={detail.kind === 'delivery' ? M.detailDeliveryTitle : M.detailOrderTitle}>
          <div className="w-full max-w-lg overflow-hidden rounded-3xl bg-white shadow-2xl">
            <div className="flex items-center justify-between bg-gradient-to-l from-[#7a0d0d] to-[#3d0606] px-6 py-5 text-white">
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
            <div className="flex justify-end border-t border-[#f3ead9] bg-[#fffaf1] px-8 py-5">
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
    <div className="flex justify-between border-b border-[#f3ead9] py-3 last:border-0">
      <span className="text-gray-500">{label}</span>
      <span className="font-bold text-gray-800" dir={ltr ? 'ltr' : undefined}>{value}</span>
    </div>
  )
}
