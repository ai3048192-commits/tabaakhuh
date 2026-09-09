import type { AccountProfile } from '../../src/auth/types'
import type { CookApplication, RawPendingCook, SignedContract } from '../../src/cooks/types'
import type { DriverApplication } from '../../src/drivers/types'
import type { City } from '../../src/cities/types'
import type { PlatformSettings } from '../../src/settings/types'
import type { RawOverview } from '../../src/overview/types'
import type { Order, OrderItem } from '../../src/orders/types'
import type { Withdrawal } from '../../src/withdrawals/types'
import type { AdminUser } from '../../src/users/types'
import type { Complaint, ComplaintDetail } from '../../src/complaints/types'
import type { FinancialReport } from '../../src/reports/types'
import type { RawActiveDelivery, RawDeliveryDriver } from '../../src/delivery/types'
import type { OrdersDailyPoint, RecentCook } from '../../src/overview/homeApi'

export const adminUser: AccountProfile = {
  id: 1,
  first_name: 'Site',
  last_name: 'Admin',
  email: 'admin@tabbakha.com',
  phone: '+201000000000',
  role: 'admin',
  status: 'active',
  email_verified: true,
  avatar_url: null,
}

export const customerUser: AccountProfile = {
  ...adminUser,
  id: 2,
  role: 'customer',
  first_name: 'Reda',
  last_name: 'Customer',
}

/** Standard success envelope. */
export function ok<T>(data: T, message = 'OK') {
  return { success: true, data, message, errors: null }
}

/** Standard error envelope. */
export function fail(message: string, errors: Record<string, string[]> | null = null) {
  return { success: false, data: null, message, errors }
}

// --- Cook applications review (Phase 2) -------------------------------------

let cookSeq = 10

export function cookProfile(overrides: Partial<CookApplication> = {}): CookApplication {
  const id = overrides.id ?? cookSeq++
  return {
    id,
    store_name: `مطبخ رقم ${id}`,
    bio: 'أكل بيتي مصري',
    avatar_url: `https://cdn.test/${id}/avatar.jpg`,
    national_id_front_url: `https://cdn.test/${id}/id-front.jpg`,
    national_id_back_url: `https://cdn.test/${id}/id-back.jpg`,
    banner_url: `https://cdn.test/${id}/banner.jpg`,
    city_id: 3,
    area: 'المعادي',
    address_text: 'شارع 9',
    lat: 29.96,
    lng: 31.25,
    delivery_radius_km: 5,
    is_open: false,
    approval_status: 'pending',
    rejection_reason: null,
    rating_avg: 0,
    rating_count: 0,
    ...overrides,
  }
}

export function signedContract(overrides: Partial<SignedContract> = {}): SignedContract {
  return {
    template_version: 'v1',
    signed_file_url: 'https://cdn.test/contract.pdf',
    signed_at: '2026-09-01T12:30:00+00:00',
    ...overrides,
  }
}

/** One `GET /admin/cooks/pending` row. Pass `contract: null` for an unsigned application. */
export function pendingCook(
  profile: Partial<CookApplication> = {},
  contract: Partial<SignedContract> | null = {},
): RawPendingCook {
  return {
    cook_profile: cookProfile(profile),
    contract: contract === null ? null : signedContract(contract),
  }
}

// --- Driver applications review (Phase 3) ---------------------------------

let driverSeq = 5

export function pendingDriver(overrides: Partial<DriverApplication> = {}): DriverApplication {
  const id = overrides.id ?? driverSeq++
  return {
    id,
    vehicle_type: 'motorcycle',
    vehicle_model: 'Halawa',
    vehicle_year: 2020,
    vehicle_color: 'أحمر',
    vehicle_plate_no: String(1000 + id),
    vehicle_plate_letters: 'ن م ص',
    national_id_front_url: `https://cdn.test/${id}/id-front.jpg`,
    national_id_back_url: `https://cdn.test/${id}/id-back.jpg`,
    license_url: `https://cdn.test/${id}/license.jpg`,
    city_id: 3,
    birth_date: '1995-04-10',
    is_available: false,
    submitted_at: '2026-09-02T09:00:00+00:00',
    approval_status: 'pending',
    rejection_reason: null,
    rating_avg: 0,
    rating_count: 0,
    ...overrides,
  }
}

/** `GET /admin/drivers/pending` body — a flat array in `data`. */
export function pendingDriversResponse(drivers: DriverApplication[]) {
  return ok(drivers)
}

/** `POST /admin/drivers/{id}/approve` 200 body. */
export function approvedDriver(overrides: Partial<DriverApplication> = {}) {
  return ok(
    pendingDriver({ approval_status: 'approved', ...overrides }),
    'Application approved.',
  )
}

/** `POST /admin/drivers/{id}/reject` 200 body. */
export function rejectedDriver(overrides: Partial<DriverApplication> = {}) {
  return ok(
    pendingDriver({
      approval_status: 'rejected',
      rejection_reason: overrides.rejection_reason ?? 'الرخصة منتهية',
      ...overrides,
    }),
    'Application rejected.',
  )
}

// --- Platform settings (Phase 6) ----------------------------------------

/** One `PlatformSettings` object. */
export function settings(fee = 25): PlatformSettings {
  return { delivery_fee: fee }
}

/** `GET /admin/settings` 200 body. */
/** The full System Settings object (`admin-dashboard-api.md` §6.1), backend defaults. */
export function systemSettings(overrides: Record<string, unknown> = {}) {
  return {
    delivery_fee: 25,
    commission_percent: 0,
    min_order_total: 0,
    first_order_discount_enabled: false,
    cashback_enabled: false,
    store_name: null,
    support_email: null,
    support_phone: null,
    logo_url: null,
    icon_url: null,
    notif_push_enabled: true,
    notif_new_orders_enabled: true,
    notif_sms_cooks_enabled: true,
    notif_order_status_enabled: true,
    default_delivery_radius_km: null,
    ...overrides,
  }
}

export function settingsResponse(fee = 25, overrides: Record<string, unknown> = {}) {
  return ok(systemSettings({ delivery_fee: fee, ...overrides }))
}

/** `PUT /admin/settings` 200 body — fee-only body still replies "Delivery fee updated.". */
export function updatedSettings(fee = 30, overrides: Record<string, unknown> = {}) {
  return ok(systemSettings({ delivery_fee: fee, ...overrides }), 'Delivery fee updated.')
}

/** `PUT /admin/settings` 200 body for a multi-field patch. */
export function updatedSystemSettings(overrides: Record<string, unknown> = {}) {
  return ok(systemSettings(overrides), 'Settings updated.')
}

export function cityList(overrides: City[] = []): City[] {
  return overrides.length > 0
    ? overrides
    : [
        { id: 1, name_ar: 'القاهرة', name_en: 'Cairo', is_active: true },
        { id: 2, name_ar: 'الجيزة', name_en: 'Giza', is_active: false },
        { id: 3, name_ar: 'المعادي', name_en: 'Maadi', is_active: true },
      ]
}

// --- Cities management (Phase 5) -----------------------------------------

let citySeq = 100

/** One `City` — sequential id, active by default. */
export function city(overrides: Partial<City> = {}): City {
  const id = overrides.id ?? citySeq++
  return {
    id,
    name_ar: `مدينة رقم ${id}`,
    name_en: `City ${id}`,
    is_active: true,
    ...overrides,
  }
}

/** `GET /admin/cities` body — the flat array in `data`. */
export function citiesResponse(cities: City[]) {
  return ok(cities)
}

/** `POST /admin/cities` 201 body. */
export function createdCity(overrides: Partial<City> = {}) {
  return ok(city({ is_active: true, ...overrides }), 'City created.')
}

/** `PUT /admin/cities/{id}` 200 body. */
export function updatedCity(overrides: Partial<City> = {}) {
  return ok(city(overrides), 'City updated.')
}

/** `PATCH /admin/cities/{id}/status` 200 body. */
export function cityStatusChanged(overrides: Partial<City> = {}) {
  return ok(city(overrides), 'City status updated.')
}

// --- Dashboard reports / overview (Phase 8) -----------------------------

/**
 * A full `RawOverview` payload (all four roles, all twelve statuses, a sample
 * revenue). `overrides` is shallow-merged, so a test can pass
 * `{ users_by_role: {} }`, `{ orders_by_status: { pending: 0, ... } }`,
 * `{ total_sales_revenue: 0 }`, or an extra key
 * `{ orders_by_status: { ...allTwelve, archived: 5 } }`.
 */
export function overview(overrides: Partial<RawOverview> = {}): RawOverview {
  return {
    users_by_role: { customer: 1240, cook: 85, driver: 60, admin: 3 },
    orders_by_status: {
      pending: 12,
      accepted: 5,
      preparing: 8,
      ready_for_pickup: 2,
      assigned_to_driver: 3,
      picked_up: 1,
      on_the_way: 4,
      delivered: 6,
      completed: 980,
      cancelled: 47,
      pending_review: 2,
      quoted: 1,
    },
    total_sales_revenue: 154300,
    ...overrides,
  }
}

/** `GET /admin/reports/overview` 200 body. */
export function overviewResponse(data: RawOverview = overview()) {
  return ok(data)
}

// --- Orders Oversight (Phase 7) ---------------------------------------

let orderItemSeq = 1
let orderSeq = 900

/** One order line item. */
export function orderItem(overrides: Partial<OrderItem> = {}): OrderItem {
  const id = overrides.id ?? orderItemSeq++
  const unit_price = overrides.unit_price ?? 45
  const quantity = overrides.quantity ?? 1
  return {
    id,
    dish_id: 300 + id,
    item_name: `صنف ${id}`,
    unit_price,
    quantity,
    line_total: overrides.line_total ?? unit_price * quantity,
    ...overrides,
  }
}

/** One `Order` from `data.items`. `quote`/`status_history` are always null/[] here. */
export function order(overrides: Partial<Order> = {}): Order {
  const id = overrides.id ?? orderSeq++
  const items = overrides.items ?? [orderItem()]
  const subtotal = overrides.subtotal ?? items.reduce((s, i) => s + i.line_total, 0)
  const delivery_fee = overrides.delivery_fee ?? 25
  return {
    id,
    order_number: `ORD-2026-${String(id).padStart(6, '0')}`,
    customer_id: 55,
    cook_id: 12,
    cook_name: `مطبخ ${id}`,
    cook_avatar_url: `https://cdn.test/${id}/a.jpg`,
    type: 'regular',
    status: 'completed',
    delivery_address_id: 88,
    requested_delivery_date: '2026-09-05',
    delivery_time_slot: '13:00-15:00',
    subtotal,
    delivery_fee,
    total: overrides.total ?? subtotal + delivery_fee,
    customer_note: null,
    cancel_reason: null,
    items,
    custom_details: null,
    quote: null,
    status_history: [],
    ...overrides,
  }
}

/** A custom order — empty `items` by default, `custom_details` populated. */
export function customOrder(overrides: Partial<Order> = {}): Order {
  return order({
    type: 'custom',
    items: [],
    custom_details: {
      occasion_type: 'زفاف',
      guest_count: 120,
      requested_dishes_text: 'أرز وخروف وحلويات',
      budget_min: 5000,
      budget_max: 8000,
      requested_delivery_date_time: '2026-10-01T18:00:00+02:00',
    },
    ...overrides,
  })
}

/** `GET /admin/orders` 200 body — the paginated `{ items, page, per_page, total }` envelope. */
export function ordersPage(
  items: Order[],
  { page = 1, per_page = 20, total = items.length }: { page?: number; per_page?: number; total?: number } = {},
) {
  return ok({ items, page, per_page, total })
}

// --- Withdrawals Management (Phase 4) ---------------------------------

let withdrawalSeq = 40

/** One withdrawal request from `data.items`. */
export function withdrawal(overrides: Partial<Withdrawal> = {}): Withdrawal {
  const id = overrides.id ?? withdrawalSeq++
  return {
    id,
    amount: 500,
    payment_details: 'InstaPay: 01000000000',
    status: 'pending',
    requested_at: '2026-09-03T08:00:00+00:00',
    processed_at: null,
    ...overrides,
  }
}

/** `GET /admin/withdrawals` 200 body — the paginated envelope. */
export function withdrawalPage(
  items: Withdrawal[],
  meta: { page?: number; per_page?: number; total?: number } = {},
) {
  return ok({
    items,
    page: meta.page ?? 1,
    per_page: meta.per_page ?? 20,
    total: meta.total ?? items.length,
  })
}

/** `POST /admin/withdrawals/{id}/(approve|reject|mark-paid)` 200 body. */
export function decidedWithdrawal(
  status: Withdrawal['status'],
  message: string,
  overrides: Partial<Withdrawal> = {},
) {
  return ok(
    withdrawal({ status, processed_at: '2026-09-06T10:00:00+00:00', ...overrides }),
    message,
  )
}

// --- Users Management (provisional /admin/users*) --------------------

let adminUserSeq = 500

export function adminUserRow(overrides: Partial<AdminUser> = {}): AdminUser {
  const id = overrides.id ?? adminUserSeq++
  return {
    id,
    first_name: 'مستخدم',
    last_name: String(id),
    email: `user${id}@test.com`,
    phone: `0100000${id}`,
    role: 'customer',
    status: 'active',
    created_at: '2026-03-13T10:00:00+00:00',
    ...overrides,
  }
}

export function usersPage(
  items: AdminUser[],
  meta: { page?: number; per_page?: number; total?: number } = {},
) {
  return ok({
    items,
    page: meta.page ?? 1,
    per_page: meta.per_page ?? 20,
    total: meta.total ?? items.length,
  })
}

// --- Complaints (provisional /admin/complaints*) --------------------

let complaintSeq = 700

export function complaint(overrides: Partial<Complaint> = {}): Complaint {
  const id = overrides.id ?? complaintSeq++
  return {
    id,
    type: 'complaint',
    subject: `موضوع ${id}`,
    body: 'نص الرسالة',
    customer_id: 55,
    order_id: null,
    status: 'open',
    created_at: '2026-09-01T10:00:00+00:00',
    ...overrides,
  }
}

export function complaintDetail(overrides: Partial<ComplaintDetail> = {}): ComplaintDetail {
  const base = complaint(overrides)
  return { ...base, thread: overrides.thread ?? [], ...overrides }
}

export function complaintsPage(
  items: Complaint[],
  meta: { page?: number; per_page?: number; total?: number } = {},
) {
  return ok({
    items,
    page: meta.page ?? 1,
    per_page: meta.per_page ?? 20,
    total: meta.total ?? items.length,
  })
}

// --- Financial Reports (/admin/reports/financial) --------

export function financialReport(overrides: Partial<FinancialReport> = {}): FinancialReport {
  return {
    totals: { revenue: 154300, commission: 15430, payouts: 120000, orders: 980 },
    series: [
      { period: '2026-08-10', revenue: 5000, commission: 500, payouts: 4000 },
      { period: '2026-08-11', revenue: 7200, commission: 720, payouts: 5800 },
    ],
    breakdown: [
      { label: 'القاهرة', revenue: 90000, orders: 600 },
      { label: 'الجيزة', revenue: 64300, orders: 380 },
    ],
    ...overrides,
  }
}

export function financialReportResponse(data: FinancialReport = financialReport()) {
  return ok(data)
}

// --- Delivery ops (provisional /admin/delivery/*) -------------------

let deliverySeq = 800

/**
 * One `GET /admin/delivery/active` row — the real *nested* wire shape
 * (`cook.store_name`, `driver.name`, `delivery_address_text`, …). Accepts the
 * flat convenience keys `cook_name`, `area` / `customer_area`, `driver_id`,
 * `driver_name` and folds them into the nested objects.
 */
export function activeDelivery(
  o: {
    order_id?: number
    order_number?: string
    status?: string
    cook_name?: string
    area?: string
    customer_area?: string
    driver_id?: number | null
    driver_name?: string | null
    subtotal?: number
    delivery_fee?: number
    total?: number
    commission?: number
    assigned_at?: string | null
    picked_up_at?: string | null
  } = {},
): RawActiveDelivery {
  const id = o.order_id ?? deliverySeq++
  const hasDriver = o.driver_id != null || o.driver_name != null
  const driverId = o.driver_id ?? (hasDriver ? 9500 + id : null)
  const fee = o.delivery_fee ?? 25
  return {
    order_id: id,
    order_number: o.order_number ?? `ORD-2026-${String(id).padStart(6, '0')}`,
    status: o.status ?? 'ready_for_pickup',
    delivery_address_text: o.area ?? o.customer_area ?? 'المعادي',
    subtotal: o.subtotal ?? 100,
    delivery_fee: fee,
    total: o.total ?? 125,
    commission: o.commission ?? fee,
    driver:
      driverId == null
        ? null
        : { id: driverId, name: o.driver_name ?? `سائق ${driverId}`, phone: `+20100${driverId}` },
    customer: { id: 55, name: 'عميل', phone: '+201200000000' },
    cook: { id: 12, store_name: o.cook_name ?? `مطبخ ${id}` },
    assigned_at: o.assigned_at ?? null,
    picked_up_at: o.picked_up_at ?? null,
  }
}

export function deliveryDriversResponse(
  items: RawDeliveryDriver[],
  meta: { available_count?: number; busy_count?: number } = {},
) {
  return ok({
    available_count:
      meta.available_count ??
      items.filter((d) => d.is_available && d.active_delivery_id == null).length,
    busy_count: meta.busy_count ?? items.filter((d) => d.active_delivery_id != null).length,
    items,
  })
}

/**
 * One `items[]` entry of `GET /admin/delivery/drivers` — real wire shape
 * (`full_name`, `active_delivery_id`). Accepts `name` and the boolean
 * `active_deliveries` as convenience keys.
 */
export function deliveryDriver(
  o: {
    id?: number
    name?: string
    full_name?: string
    phone?: string
    city_id?: number | null
    is_available?: boolean
    active_deliveries?: number | boolean
    active_delivery_id?: number | null
    rating_avg?: number
  } = {},
): RawDeliveryDriver {
  const id = o.id ?? deliverySeq++
  return {
    id,
    full_name: o.full_name ?? o.name ?? `سائق ${id}`,
    phone: o.phone ?? `+20100${id}`,
    city_id: o.city_id ?? 3,
    is_available: o.is_available ?? true,
    active_delivery_id: o.active_delivery_id ?? (o.active_deliveries ? 9000 + id : null),
    rating_avg: o.rating_avg ?? 4.5,
  }
}

// --- Dashboard home extras (provisional) ---------------------------

export function ordersDaily(days = 7): OrdersDailyPoint[] {
  return Array.from({ length: days }, (_, i) => ({
    date: `2026-09-0${i + 1}`,
    count: 40 + i * 5,
  }))
}

export function recentCook(overrides: Partial<RecentCook> = {}): RecentCook {
  const id = overrides.id ?? 3000 + Math.floor(Math.random() * 999)
  return {
    id,
    store_name: `مطبخ ${id}`,
    area: 'المعادي',
    city_id: 3,
    joined_at: '2026-09-01T10:00:00+00:00',
    ...overrides,
  }
}
