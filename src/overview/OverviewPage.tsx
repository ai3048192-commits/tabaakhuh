import { lazy, Suspense, useMemo, useState } from 'react'
import { useAppConfig } from '../shared/useAppConfig'
import { Link } from 'react-router-dom'
import {
  Users, ChefHat, Bike, MapPin, ShoppingCart, Coins,
  PlusCircle, Send, UserPlus, RefreshCw, AlertTriangle, Eye, ArrowLeft,
  CalendarDays, Flame, CheckCircle2, Store, BarChart3, Zap, Truck, PieChart, Receipt, ChevronLeft,
} from 'lucide-react'
import type { ReactNode } from 'react'
import { useOverview } from './useOverview'
import { useHomeExtras } from './useHomeExtras'
import { useCityNames } from '../cities/useCityNames'
import { formatCount, formatCurrency, formatTime } from './format'
import { overviewMessages as M } from './messages'
import type { ActiveDelivery } from '../delivery/types'
import type { Order } from '../orders/types'
import PageHeader from '../shared/PageHeader'
import OrderDetailDialog from '../orders/OrderDetailDialog'
import { bannerBtnLight } from '../shared/ui'
import { pillCls, statusTone } from '../shared/statusTone'

/** Chart.js is pulled in only when there is actually a chart to draw. */
const OrdersBarChart = lazy(() => import('./OrdersBarChart'))

/** Backend order-status enum → Arabic label, with a fallback for unknown values. */
const statusText = (s: string): string =>
  (M.statusLabel as Record<string, string>)[s] ?? M.unknownStatusLabel(s)

interface Props {
  onQuickAction?: (type: string) => void
}

function StatusPill({ status }: { status: string }) {
  return (
    <span className={`${pillCls} ${statusTone(status)}`}>
      <span className="h-1.5 w-1.5 rounded-full bg-current" aria-hidden="true" />
      {statusText(status)}
    </span>
  )
}

/** Stat card: coloured icon chip, big number, label, optional hint. `accent` = the maroon hero card. */
function Kpi({
  label, value, icon: Icon, tone, hint, accent = false,
}: {
  label: string
  value: string
  icon: typeof Users
  tone: string
  hint?: string
  accent?: boolean
}) {
  return (
    <div
      className={`group relative overflow-hidden rounded-3xl p-5 transition duration-200 hover:-translate-y-0.5 ${
        accent
          ? 'bg-gradient-to-bl from-[#8f1414] via-[#6a0b0b] to-[#2e0405] text-white shadow-[0_22px_44px_-24px_rgba(122,13,13,0.9)]'
          : 'bg-white shadow-[0_18px_40px_-30px_rgba(122,13,13,0.45)] ring-1 ring-[#efe3cc] hover:shadow-[0_24px_48px_-28px_rgba(122,13,13,0.55)]'
      }`}
    >
      <span
        className={`pointer-events-none absolute -left-10 -top-10 h-32 w-32 rounded-full blur-2xl ${accent ? 'bg-[#e0a52e]/25' : 'bg-[#7a0d0d]/[0.04]'}`}
        aria-hidden="true"
      />
      <div className="relative flex items-center gap-4">
        <span className={`grid h-12 w-12 shrink-0 place-items-center rounded-2xl ${accent ? 'bg-white/10 text-[#ffd27a] ring-1 ring-white/15' : tone}`}>
          <Icon size={20} aria-hidden="true" />
        </span>
        <div className="min-w-0">
          <p className={`text-xs font-bold ${accent ? 'text-white/65' : 'text-gray-500'}`}>{label}</p>
          <h3 className={`whitespace-nowrap text-2xl font-black ${accent ? 'text-[#ffd27a]' : 'text-gray-900'}`} dir="ltr">
            <span className="block text-right">{value}</span>
          </h3>
          {hint && <p className={`mt-0.5 truncate text-[11px] font-bold ${accent ? 'text-white/55' : 'text-gray-400'}`}>{hint}</p>}
        </div>
      </div>
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

/** One colour per status for the share bar (the pills use `statusTone`). */
const STATUS_BAR: Record<string, string> = {
  pending: '#d97706',
  pending_review: '#b68614',
  quoted: '#e0a52e',
  accepted: '#0284c7',
  preparing: '#ea580c',
  ready_for_pickup: '#7c3aed',
  assigned_to_driver: '#2563eb',
  picked_up: '#4f46e5',
  on_the_way: '#0891b2',
  delivered: '#16a34a',
  completed: '#047857',
  cancelled: '#dc2626',
}

/** Every status with orders in it: one stacked share bar, then a card per status linking to the filtered list. */
function StatusBreakdown({ statuses, total }: { statuses: { status: string; count: number; known: boolean }[]; total: number }) {
  const rows = statuses.filter((s) => s.count > 0).sort((a, b) => b.count - a.count)
  if (rows.length === 0 || total === 0) return <Empty>{M.noOrdersYet}</Empty>
  const pct = (n: number) => (n / total) * 100
  return (
    <>
      <div className="mb-5 flex h-3 w-full overflow-hidden rounded-full bg-[#f3ead9]" aria-hidden="true">
        {rows.map((r) => (
          <span key={r.status} style={{ width: `${pct(r.count)}%`, background: STATUS_BAR[r.status] ?? '#9ca3af' }} />
        ))}
      </div>
      <ul className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-4 2xl:grid-cols-6">
        {rows.map((r) => {
          const label = statusText(r.status)
          const count = formatCount(r.count)
          const share = pct(r.count)
          const body = (
            <>
              <span className="flex items-center gap-1.5 text-[11px] font-bold text-gray-500">
                <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: STATUS_BAR[r.status] ?? '#9ca3af' }} aria-hidden="true" />
                <span className="truncate">{label}</span>
              </span>
              <span className="mt-1 flex items-baseline justify-between gap-2">
                <span className="text-lg font-black text-gray-900" dir="ltr">{count}</span>
                <span className="text-[11px] font-black text-[#8f680d]" dir="ltr">{M.statusShare(share < 1 ? share.toFixed(1) : String(Math.round(share)))}</span>
              </span>
            </>
          )
          const cls = 'flex flex-col rounded-2xl bg-[#fffaf1] px-3.5 py-3 ring-1 ring-[#f3ead9] transition'
          return (
            <li key={r.status}>
              {r.known ? (
                <Link
                  to={`/orders?status=${r.status}`}
                  aria-label={M.statusCardLinkLabel(label, count)}
                  className={`${cls} hover:-translate-y-0.5 hover:bg-white hover:shadow-[0_14px_28px_-20px_rgba(122,13,13,0.5)] hover:ring-[#e6d3ae]`}
                >
                  {body}
                </Link>
              ) : (
                <div className={cls}>{body}</div>
              )}
            </li>
          )
        })}
      </ul>
    </>
  )
}

/** A dashboard queue row: order number + cook, optional status, total, and the details button. */
function OrderLine({ order: o, onOpen, showStatus = false }: { order: Order; onOpen: () => void; showStatus?: boolean }) {
  return (
    <li className="flex items-center gap-3 py-3 text-sm">
      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-[#7a0d0d]/[0.07] text-[#7a0d0d]">
        <Receipt size={15} aria-hidden="true" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block font-black text-[#7a0d0d]" dir="ltr"><span className="block text-right">{o.order_number}</span></span>
        {o.cook_name && <span className="block truncate text-xs text-gray-400">{o.cook_name}</span>}
      </span>
      {showStatus && <StatusPill status={o.status} />}
      <span className="shrink-0 font-bold text-gray-700" dir="ltr">{formatCurrency(o.total)}</span>
      <button
        type="button"
        aria-label={M.colDetails}
        onClick={onOpen}
        className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-[#7a0d0d] transition hover:bg-[#7a0d0d]/10"
      >
        <ChevronLeft size={16} aria-hidden="true" />
      </button>
    </li>
  )
}

const todayLabel = () =>
  new Date().toLocaleDateString('ar-EG', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })

/**
 * A live-delivery row carries only a slice of its order. Shape it as the
 * order panel's opening snapshot — the panel fetches the full record
 * (`GET /admin/orders/{id}`) and fills in people, items, address and timeline.
 */
function deliveryAsOrder(d: ActiveDelivery): Order {
  return {
    id: d.order_id,
    order_number: d.order_number,
    customer_id: 0,
    cook_id: 0,
    cook_name: d.cook_name,
    cook_avatar_url: null,
    type: 'regular',
    status: d.status as Order['status'],
    delivery_address_id: 0,
    requested_delivery_date: '',
    delivery_time_slot: null,
    subtotal: Math.max(0, (d.total ?? 0) - (d.commission ?? 0)),
    delivery_fee: d.commission ?? 0,
    total: d.total ?? 0,
    customer_note: null,
    cancel_reason: null,
    items: [],
    custom_details: null,
    quote: null,
    status_history: [],
    delivery_type: 'delivery',
    driver_id: d.driver_id,
    driver_name: d.driver_name,
    delivery_address_text: d.area,
  }
}

/** `/dashboard` — the platform home: KPIs, daily-orders chart, quick actions, live deliveries, queues. */
export default function OverviewPage({ onQuickAction }: Props) {
  const { status, snapshot, lastUpdated, refreshing, refreshError, refresh } = useOverview()
  const extras = useHomeExtras()
  const cityNames = useCityNames()
  const [detail, setDetail] = useState<Order | null>(null)

  const usersTotal = snapshot ? snapshot.roles.reduce((s, r) => s + r.count, 0) : 0
  const cooksTotal = snapshot ? (snapshot.roles.find((r) => r.role === 'cook')?.count ?? 0) : 0
  const ordersTotal = snapshot ? snapshot.statuses.reduce((s, x) => s + x.count, 0) : 0
  const FINAL = ['delivered', 'completed', 'cancelled']
  const ordersActive = snapshot ? snapshot.statuses.filter((x) => !FINAL.includes(x.status)).reduce((s, x) => s + x.count, 0) : 0
  const customers = snapshot ? (snapshot.roles.find((r) => r.role === 'customer')?.count ?? 0) : 0
  const weekTotal = (extras.ordersDaily ?? []).reduce((s, p) => s + p.count, 0)

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
  // specs/070 — driver tiles/actions hidden while the platform's drivers are off.
  const { driver_delivery_enabled: driversEnabled } = useAppConfig()

  const quickActions = [
    { key: 'إضافة طباخة', label: M.qaAddCook, icon: PlusCircle, tone: 'from-[#7a0d0d] to-[#9a1212]' },
    ...(driversEnabled ? [{ key: 'إضافة سائق', label: M.qaAddDriver, icon: Bike, tone: 'from-[#0f5e8c] to-[#1679b3]' }] : []),
    { key: 'إشعار عام', label: M.qaBroadcast, icon: Send, tone: 'from-[#b68614] to-[#d9a21c]' },
    { key: 'مستخدم جديد', label: M.qaNewUser, icon: UserPlus, tone: 'from-[#1f7a4d] to-[#28995f]' },
  ]

  return (
    <div className="min-h-full bg-[#f7f1e6] p-4 font-['Tajawal'] md:p-8" dir="rtl">
      <PageHeader
        title={M.pageTitle}
        eyebrow={<><CalendarDays size={12} aria-hidden="true" /> {todayLabel()}</>}
        subtitle={
          <>
            {M.subtitle}
            {status === 'ready' && lastUpdated && (
              <span className="mt-1 block text-xs font-bold text-white/50">{M.lastUpdated(formatTime(lastUpdated))}</span>
            )}
          </>
        }
        actions={status === 'ready' && (
          <button
            type="button"
            onClick={() => { refresh(); extras.refresh() }}
            disabled={refreshing}
            aria-busy={refreshing}
            className={bannerBtnLight}
          >
            <RefreshCw size={14} aria-hidden="true" className={refreshing ? 'animate-spin' : undefined} />
            {refreshing ? M.refreshing : M.refresh}
          </button>
        )}
      />

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
          {/* KPI cards — column count follows the tile count so no card is left alone on a row */}
          <div className={`mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 ${driversEnabled ? 'xl:grid-cols-3' : 'xl:grid-cols-4'}`}>
            <Kpi label={M.kpiRevenue} value={formatCurrency(snapshot.revenue)} icon={Coins} tone="" hint={M.revenueScopeNote} accent />
            <Kpi label={M.kpiOrders} value={formatCount(ordersTotal)} icon={ShoppingCart} tone="bg-emerald-100 text-emerald-700" hint={M.kpiOrdersActive(formatCount(ordersActive))} />
            <Kpi label={M.kpiUsers} value={formatCount(usersTotal)} icon={Users} tone="bg-slate-100 text-slate-700" hint={M.kpiUsersHint(formatCount(customers))} />
            <Kpi label={M.kpiCooks} value={formatCount(cooksTotal)} icon={ChefHat} tone="bg-[#7a0d0d]/10 text-[#7a0d0d]" />
            {driversEnabled && (
              <>
                <Kpi label={M.kpiDriversAvailable} value={extras.driversOk && extras.driversAvailable != null ? formatCount(extras.driversAvailable) : M.na} icon={Bike} tone="bg-sky-100 text-sky-700" />
                <Kpi label={M.kpiDriversBusy} value={extras.driversOk && extras.driversBusy != null ? formatCount(extras.driversBusy) : M.na} icon={MapPin} tone="bg-orange-100 text-orange-700" />
              </>
            )}
          </div>

          {/* Chart + quick actions */}
          <div className="mb-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
            <Panel
              title={M.chartTitle}
              icon={BarChart3}
              className="lg:col-span-2"
              action={weekTotal > 0 ? (
                <span className="rounded-full bg-[#faf3e7] px-3 py-1 text-xs font-black text-[#8f680d]">{M.chartWeekTotal(formatCount(weekTotal))}</span>
              ) : undefined}
            >
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

          {/* Orders by status */}
          <Panel
            title={M.ordersGroupTitle}
            icon={PieChart}
            action={<ViewAll to="/orders" />}
            className="mb-6"
          >
            <StatusBreakdown statuses={snapshot.statuses} total={ordersTotal} />
          </Panel>

          {/* Live deliveries */}
{driversEnabled && (
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
                            onClick={() => setDetail(deliveryAsOrder(d))}
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
          )}

          {/* Queues */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 2xl:grid-cols-3">
            <Panel title={M.preparingTitle} icon={Flame} action={<ViewAll to="/orders?status=preparing" />}>
              {(extras.preparing?.length ?? 0) === 0 ? (
                <Empty>{M.noPreparing}</Empty>
              ) : (
                <ul className="divide-y divide-[#f3ead9]">
                  {(extras.preparing ?? []).map((o) => (
                    <OrderLine key={o.id} order={o} onOpen={() => setDetail(o)} />
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
                    <OrderLine key={o.id} order={o} onOpen={() => setDetail(o)} showStatus />
                  ))}
                </ul>
              )}
            </Panel>
          </div>
        </>
      )}

      {detail && <OrderDetailDialog order={detail} onClose={() => setDetail(null)} onChanged={() => void refresh()} />}

      <div aria-live="polite" role="status" className="sr-only">
        {refreshError ? M.refreshFailedNotice : lastUpdated ? M.lastUpdated(formatTime(lastUpdated)) : ''}
      </div>
    </div>
  )
}

