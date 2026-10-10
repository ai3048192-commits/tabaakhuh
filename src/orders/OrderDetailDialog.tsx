import { useEffect, useRef, useState, type ReactNode } from 'react'
import {
  X, Copy, Check, User, ChefHat, Bike, Phone, MapPin, CalendarClock, Store, Truck,
  StickyNote, XCircle, Receipt, Sparkles, Loader2, RotateCcw, ExternalLink, History,
} from 'lucide-react'
import DrawerShell from '../shared/DrawerShell'
import { safeUrl } from '../shared/safeUrl'
import OrderTypeBadge from './OrderTypeBadge'
import OrderStatusBadge from './OrderStatusBadge'
import CancelOrderPanel from './CancelOrderPanel'
import { isCancelled, statusLabel, STATUS_ICONS } from './orderStatus'
import { formatOrderDate, formatOrderDateTime } from './cairoDates'
import { orderMessages as M } from './messages'
import { useOrderDetail } from './useOrderDetail'
import type { Order, OrderStatus } from './types'

/**
 * The order in full, as a side panel: who is on it (customer, cook, driver —
 * with call links), where and when it goes, what was ordered (sizes and
 * add-ons), the money, a custom order's request and quote, and every status
 * change. Opens on the list's copy and fills in from `GET /admin/orders/{id}`.
 */
export default function OrderDetailDialog({
  order: snapshot,
  onClose,
  onChanged,
}: {
  order: Order
  onClose: () => void
  /** Called after the order was changed here (cancelled), so the list can refresh. */
  onChanged?: () => void
}) {
  const { order, status, retry } = useOrderDetail(snapshot)
  const closeRef = useRef<HTMLButtonElement>(null)
  useEffect(() => {
    closeRef.current?.focus()
  }, [])

  const cancelled = isCancelled(order.status)
  const note = order.customer_note?.trim()
  const reason = order.cancel_reason?.trim()

  return (
    <DrawerShell label={M.detailTitle(order.order_number)} onDismiss={onClose} width="lg">
      <Header order={order} closeRef={closeRef} onClose={onClose} />

      <div className="flex-1 space-y-4 overflow-y-auto bg-[#f7f1e6] p-4 sm:p-5">
        {status === 'loading' && (
          <p className="flex items-center gap-2 text-xs font-bold text-gray-500">
            <Loader2 size={13} className="animate-spin" aria-hidden="true" /> {M.detailLoading}
          </p>
        )}
        {status === 'error' && (
          <div className="flex flex-wrap items-center justify-between gap-2 rounded-2xl bg-amber-50 px-4 py-3 text-xs font-bold text-amber-800 ring-1 ring-amber-200">
            {M.detailError}
            <button type="button" onClick={retry} className="inline-flex items-center gap-1 rounded-lg bg-white px-2.5 py-1.5 text-[#7a0d0d] ring-1 ring-amber-200">
              <RotateCcw size={12} aria-hidden="true" /> {M.retry}
            </button>
          </div>
        )}

        {cancelled ? (
          <div className="rounded-2xl bg-red-50 p-4 ring-1 ring-red-100">
            <p className="flex items-center gap-2 text-sm font-black text-red-700">
              <XCircle size={16} aria-hidden="true" /> {statusLabel('cancelled')}
            </p>
            {reason && (
              <p className="mt-2 text-sm text-red-900">
                <span className="font-black">{M.cancelReason}: </span>
                {reason}
              </p>
            )}
          </div>
        ) : (
          <Progress status={order.status} pickup={order.delivery_type === 'pickup'} />
        )}

        <Section title={M.sectionPeople}>
          <div className="grid gap-3 sm:grid-cols-3">
            <PersonCard
              icon={User}
              role={M.roleCustomer}
              name={order.customer_name ?? (status === 'loading' ? null : M.customerNumber(order.customer_id))}
              phone={order.customer_phone}
              loading={status === 'loading' && !order.customer_name}
            />
            <PersonCard
              icon={ChefHat}
              role={M.roleCook}
              name={order.cook_name?.trim() || M.unknownCook}
              phone={order.cook_phone}
              avatar={order.cook_avatar_url}
            />
            <PersonCard
              icon={Bike}
              role={M.roleDriver}
              name={order.driver_name ?? null}
              phone={order.driver_phone}
              loading={status === 'loading' && !order.driver_name}
              empty={order.delivery_type === 'pickup' ? M.noDriverPickup : M.noDriverYet}
            />
          </div>
        </Section>

        <Section title={M.sectionDelivery}>
          <dl className="space-y-3">
            <InfoRow icon={order.delivery_type === 'pickup' ? Store : Truck} label={M.deliveryType}>
              {order.delivery_type === 'pickup' ? M.deliveryTypePickup : order.delivery_type ? M.deliveryTypeDelivery : '—'}
            </InfoRow>
            <InfoRow icon={CalendarClock} label={M.deliveryWhen}>
              {formatOrderDate(order.requested_delivery_date)}
              {order.delivery_time_slot ? ` · ${order.delivery_time_slot}` : ''}
            </InfoRow>
            {order.delivery_type === 'pickup' ? (
              <InfoRow icon={MapPin} label={M.pickupAddress}>
                {order.cook_address_text ?? '—'}
              </InfoRow>
            ) : (
              <InfoRow icon={MapPin} label={M.deliveryAddress}>
                <span>{order.delivery_address_text ?? M.addressFallback(order.delivery_address_id)}</span>
                {order.delivery_address_lat != null && order.delivery_address_lng != null && (
                  <a
                    href={`https://www.google.com/maps?q=${order.delivery_address_lat},${order.delivery_address_lng}`}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-1 inline-flex items-center gap-1 text-xs font-black text-[#7a0d0d] hover:underline"
                  >
                    <ExternalLink size={12} aria-hidden="true" /> {M.openMap}
                  </a>
                )}
              </InfoRow>
            )}
          </dl>
        </Section>

        {order.type === 'custom' && order.custom_details && <CustomRequest order={order} />}
        {order.quote && <Quote order={order} />}

        <Section title={M.lineItems}>
          {order.items.length === 0 ? (
            <p className="text-sm text-gray-500">{M.noLineItems}</p>
          ) : (
            <ul className="divide-y divide-[#f3ead9]">
              {order.items.map((it) => (
                <li key={it.id} className="flex items-start justify-between gap-3 py-2.5">
                  <div className="min-w-0">
                    <p className="text-sm font-black text-gray-900">{it.item_name}</p>
                    {it.size && <p className="text-xs text-gray-500">{M.sizeLabel(it.size.name)}</p>}
                    {it.add_ons && it.add_ons.length > 0 && (
                      <p className="text-xs text-gray-500">{M.addOnsLabel(it.add_ons.map((a) => a.name).join('، '))}</p>
                    )}
                    <p className="mt-0.5 text-xs font-bold text-gray-400" dir="rtl">
                      {M.qtyTimes(it.quantity, M.currency(it.unit_price))}
                    </p>
                  </div>
                  <span className="shrink-0 text-sm font-black text-[#8f680d]">{M.currency(it.line_total)}</span>
                </li>
              ))}
            </ul>
          )}
        </Section>

        <Section title={M.sectionPayment}>
          <dl className="space-y-2 text-sm">
            <Money label={M.colSubtotal} value={order.subtotal} />
            <Money label={M.colDeliveryFee} value={order.delivery_fee} />
            <div className="mt-2 flex items-center justify-between rounded-xl bg-[#7a0d0d] px-3.5 py-2.5 text-white">
              <dt className="text-sm font-black">{M.colTotal}</dt>
              <dd className="text-base font-black">{M.currency(order.total)}</dd>
            </div>
          </dl>
        </Section>

        {note && (
          <Section title={M.customerNote}>
            <p className="flex gap-2 text-sm leading-relaxed text-gray-700">
              <StickyNote size={15} className="mt-0.5 shrink-0 text-[#b68614]" aria-hidden="true" />
              {note}
            </p>
          </Section>
        )}

        {status === 'ready' && <Timeline order={order} />}

        <CancelOrderPanel
          order={order}
          onCancelled={() => {
            retry()
            onChanged?.()
          }}
        />
      </div>
    </DrawerShell>
  )
}

function Header({
  order,
  closeRef,
  onClose,
}: {
  order: Order
  closeRef: React.RefObject<HTMLButtonElement | null>
  onClose: () => void
}) {
  const [copied, setCopied] = useState(false)
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(order.order_number)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1500)
    } catch {
      /* clipboard blocked — nothing to do */
    }
  }
  return (
    <div className="bg-gradient-to-l from-[#7a0d0d] to-[#3a0507] p-5 text-white">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <p className="text-lg font-black tracking-wide" dir="ltr">{order.order_number}</p>
            <button type="button" onClick={() => void copy()} aria-label={M.copy} className="grid h-7 w-7 place-items-center rounded-lg text-white/70 transition hover:bg-white/10 hover:text-white">
              {copied ? <Check size={14} aria-hidden="true" /> : <Copy size={14} aria-hidden="true" />}
            </button>
            {copied && <span className="text-[11px] font-bold text-[#ffd27a]">{M.copied}</span>}
          </div>
          {order.created_at && (
            <p className="mt-0.5 text-xs font-bold text-white/60">{M.placedAt(formatOrderDateTime(order.created_at))}</p>
          )}
        </div>
        <button ref={closeRef} type="button" onClick={onClose} aria-label={M.close} className="grid h-9 w-9 shrink-0 place-items-center rounded-xl text-white/70 transition hover:bg-white/10 hover:text-white">
          <X size={18} aria-hidden="true" />
        </button>
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <OrderTypeBadge type={order.type} />
        <OrderStatusBadge status={order.status} />
        <span className="mr-auto text-xl font-black text-[#ffd27a]">{M.currency(order.total)}</span>
      </div>
    </div>
  )
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="rounded-2xl bg-white p-4 shadow-[0_12px_30px_-24px_rgba(122,13,13,0.5)] ring-1 ring-[#efe3cc]">
      <h3 className="mb-3 text-xs font-black text-[#6b4f3a]">{title}</h3>
      {children}
    </section>
  )
}

function InfoRow({ icon: Icon, label, children }: { icon: typeof MapPin; label: string; children: ReactNode }) {
  return (
    <div className="flex items-start gap-3">
      <span className="grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-[#faf3e7] text-[#7a0d0d]">
        <Icon size={15} aria-hidden="true" />
      </span>
      <div className="min-w-0">
        <dt className="text-[11px] font-bold text-gray-400">{label}</dt>
        <dd className="flex flex-col text-sm font-bold text-gray-800">{children}</dd>
      </div>
    </div>
  )
}

function Money({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex items-center justify-between px-1">
      <dt className="text-gray-500">{label}</dt>
      <dd className="font-bold text-gray-800">{M.currency(value)}</dd>
    </div>
  )
}

function PersonCard({
  icon: Icon,
  role,
  name,
  phone,
  avatar,
  loading = false,
  empty,
}: {
  icon: typeof User
  role: string
  name: string | null
  phone?: string | null
  avatar?: string | null
  loading?: boolean
  empty?: string
}) {
  const src = safeUrl(avatar)
  return (
    <div className="flex flex-col gap-2 rounded-xl bg-[#fffaf1] p-3 ring-1 ring-[#f3ead9]">
      <div className="flex items-center gap-2">
        {src ? (
          <img src={src} alt="" className="h-8 w-8 rounded-lg object-cover" />
        ) : (
          <span className="grid h-8 w-8 place-items-center rounded-lg bg-[#7a0d0d]/10 text-[#7a0d0d]">
            <Icon size={15} aria-hidden="true" />
          </span>
        )}
        <span className="text-[11px] font-black text-[#8f680d]">{role}</span>
      </div>
      {loading ? (
        <span className="h-4 w-24 animate-pulse rounded bg-[#efe3cc]" aria-hidden="true" />
      ) : name ? (
        <p className="truncate text-sm font-black text-gray-900">{name}</p>
      ) : (
        <p className="text-xs font-bold text-gray-400">{empty ?? '—'}</p>
      )}
      {phone && (
        <a href={`tel:${phone}`} aria-label={M.call(role)} className="inline-flex items-center gap-1.5 text-xs font-bold text-[#7a0d0d] hover:underline" dir="ltr">
          <Phone size={12} aria-hidden="true" /> {phone}
        </a>
      )}
    </div>
  )
}

/** The five stages a customer would recognise, with the current one lit. */
const STAGES: { label: string; pickupLabel?: string; statuses: OrderStatus[] }[] = [
  { label: 'اتطلب', statuses: ['pending', 'pending_review', 'quoted'] },
  { label: 'اتقبل', statuses: ['accepted'] },
  { label: 'بيتحضر', statuses: ['preparing'] },
  { label: 'في الطريق', pickupLabel: 'جاهز للاستلام', statuses: ['ready_for_pickup', 'assigned_to_driver', 'picked_up', 'on_the_way'] },
  { label: 'وصل', pickupLabel: 'اتسلّم', statuses: ['delivered', 'completed'] },
]

function Progress({ status, pickup }: { status: OrderStatus; pickup: boolean }) {
  const current = STAGES.findIndex((s) => s.statuses.includes(status))
  return (
    <ol className="flex items-start rounded-2xl bg-white p-4 ring-1 ring-[#efe3cc]" aria-label={M.sectionTimeline}>
      {STAGES.map((stage, i) => {
        const done = i < current
        const now = i === current
        return (
          <li key={stage.label} className="relative flex flex-1 flex-col items-center gap-1.5 text-center" aria-current={now ? 'step' : undefined}>
            {i > 0 && (
              <span className={`absolute left-1/2 top-3 h-0.5 w-full -translate-y-1/2 ${i <= current ? 'bg-[#7a0d0d]' : 'bg-[#efe3cc]'}`} aria-hidden="true" />
            )}
            <span
              className={`relative z-10 grid h-6 w-6 place-items-center rounded-full text-[10px] font-black ${
                now
                  ? 'bg-[#e0a52e] text-[#1c0204] ring-4 ring-[#e0a52e]/25'
                  : done
                    ? 'bg-[#7a0d0d] text-white'
                    : 'bg-[#efe3cc] text-gray-400'
              }`}
            >
              {done ? <Check size={12} aria-hidden="true" /> : i + 1}
            </span>
            <span className={`text-[11px] font-black ${now ? 'text-[#7a0d0d]' : done ? 'text-gray-700' : 'text-gray-400'}`}>
              {pickup && stage.pickupLabel ? stage.pickupLabel : stage.label}
            </span>
          </li>
        )
      })}
    </ol>
  )
}

function CustomRequest({ order }: { order: Order }) {
  const cd = order.custom_details!
  const budget =
    cd.budget_min != null || cd.budget_max != null
      ? `${cd.budget_min != null ? M.currency(cd.budget_min) : '—'} – ${cd.budget_max != null ? M.currency(cd.budget_max) : '—'}`
      : null
  return (
    <Section title={M.customDetails}>
      <dl className="grid gap-3 sm:grid-cols-2">
        {cd.occasion_type != null && <Fact label={M.occasionType} value={cd.occasion_type} />}
        {cd.guest_count != null && <Fact label={M.guestCount} value={String(cd.guest_count)} />}
        {budget != null && <Fact label={M.budgetRange} value={budget} />}
        {cd.requested_delivery_date_time != null && (
          <Fact label={M.requestedDeliveryDateTime} value={formatOrderDateTime(cd.requested_delivery_date_time)} />
        )}
        {cd.requested_dishes_text != null && (
          <div className="sm:col-span-2">
            <Fact label={M.requestedDishes} value={cd.requested_dishes_text} />
          </div>
        )}
      </dl>
    </Section>
  )
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-[#fffaf1] px-3 py-2 ring-1 ring-[#f3ead9]">
      <dt className="text-[11px] font-bold text-gray-400">{label}</dt>
      <dd className="text-sm font-bold text-gray-800" dir="auto">{value}</dd>
    </div>
  )
}

function Quote({ order }: { order: Order }) {
  const q = order.quote!
  return (
    <Section title={M.sectionQuote}>
      <div className="flex items-start gap-3">
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-[#b68614]/10 text-[#8f680d]">
          <Sparkles size={16} aria-hidden="true" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-base font-black text-gray-900">{M.currency(q.price)}</span>
            <span className="rounded-full bg-[#faf3e7] px-2.5 py-0.5 text-[11px] font-black text-[#6b4f3a]">
              {M.quoteStatus[q.status] ?? q.status}
            </span>
          </div>
          {q.proposed_delivery_date && (
            <p className="mt-1 text-xs font-bold text-gray-500">
              {M.quoteDate}: {formatOrderDateTime(q.proposed_delivery_date)}
            </p>
          )}
          {q.message && <p className="mt-2 text-sm leading-relaxed text-gray-700">{q.message}</p>}
        </div>
      </div>
    </Section>
  )
}

function Timeline({ order }: { order: Order }) {
  const entries = order.status_history
  return (
    <Section title={M.sectionTimeline}>
      {entries.length === 0 ? (
        <p className="flex items-center gap-2 text-sm text-gray-500">
          <History size={14} aria-hidden="true" /> {M.timelineEmpty}
        </p>
      ) : (
        <ol className="relative space-y-4 border-r-2 border-[#efe3cc] pr-5">
          {entries.map((e, i) => {
            const Icon = STATUS_ICONS[e.status] ?? Receipt
            const last = i === entries.length - 1
            return (
              <li key={`${e.status}-${e.created_at}-${i}`} className="relative">
                <span
                  className={`absolute -right-[31px] top-0 grid h-6 w-6 place-items-center rounded-full ring-4 ring-white ${
                    e.status === 'cancelled' ? 'bg-red-100 text-red-600' : last ? 'bg-[#e0a52e] text-[#1c0204]' : 'bg-[#7a0d0d] text-white'
                  }`}
                >
                  <Icon size={12} aria-hidden="true" />
                </span>
                <p className="text-sm font-black text-gray-900">{statusLabel(e.status)}</p>
                <p className="text-[11px] font-bold text-gray-400">{formatOrderDateTime(e.created_at)}</p>
                {e.note && <p className="mt-1 text-xs text-gray-600">{e.note}</p>}
              </li>
            )
          })}
        </ol>
      )}
    </Section>
  )
}
