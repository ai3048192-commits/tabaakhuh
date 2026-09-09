import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { screen, within, waitFor, act } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderAtDashboard } from '../helpers/harness'
import { installFetchMock, type FetchMock } from '../helpers/fetchMock'
import {
  ok, fail, overview, overviewResponse,
  activeDelivery, deliveryDriver, deliveryDriversResponse, order, ordersPage,
  ordersDaily, recentCook,
} from '../helpers/fixtures'
import { overviewMessages as M } from '../../src/overview/messages'
import { REFRESH_INTERVAL_MS } from '../../src/overview/types'

let fm: FetchMock
const OVERVIEW = 'GET /admin/reports/overview'

beforeEach(() => {
  fm = installFetchMock()
})
afterEach(() => {
  vi.unstubAllGlobals()
  localStorage.clear()
})

/** Stub the overview + all five "extras" endpoints. */
function stubAll(over = overviewResponse()) {
  fm.reply(OVERVIEW, { json: over })
  fm.reply('GET /admin/delivery/active', { json: ok([
    activeDelivery({ order_id: 800, order_number: 'ORD-2026-000800', driver_name: 'أحمد الدليفري', customer_area: 'المعادي', status: 'on_the_way', total: 150, commission: 15 }),
  ]) })
  fm.reply('GET /admin/delivery/drivers', { json: deliveryDriversResponse([
    deliveryDriver({ id: 900, is_available: true }),
    deliveryDriver({ id: 901, is_available: true }),
    deliveryDriver({ id: 902, is_available: true, active_deliveries: true }),
  ]) })
  fm.reply('GET /admin/orders?status=preparing&page=1', { json: ordersPage([
    order({ id: 901, order_number: 'ORD-2026-000901', status: 'preparing', total: 450 }),
  ], { total: 1 }) })
  fm.reply('GET /admin/reports/orders-daily?days=7', { json: ok(ordersDaily(7)) })
  fm.reply('GET /admin/cooks/recent?limit=5', { json: ok([recentCook({ id: 3001, store_name: 'مطبخ زينب' })]) })
}

describe('Dashboard home — rich layout', () => {
  it('renders the 6 KPI tiles from overview + drivers', async () => {
    stubAll()
    renderAtDashboard(fm)

    await screen.findByText(M.kpiUsers)
    // users total = 1240 + 85 + 60 + 3 = 1388
    expect(screen.getByText('1,388')).toBeInTheDocument()
    // cooks = 85
    expect(screen.getByText('85')).toBeInTheDocument()
    // drivers available = 2, busy = 1 (from delivery/drivers)
    const avail = screen.getByText(M.kpiDriversAvailable).closest('div')!
    expect(within(avail).getByText('2')).toBeInTheDocument()
    const busy = screen.getByText(M.kpiDriversBusy).closest('div')!
    expect(within(busy).getByText('1')).toBeInTheDocument()
    // revenue
    expect(screen.getByText('154,300.00 ج.م')).toBeInTheDocument()
  })

  it('shows the live-deliveries table and the two queue lists', async () => {
    stubAll()
    renderAtDashboard(fm)

    await screen.findByText(M.deliveriesTitle)
    expect(screen.getByText('أحمد الدليفري')).toBeInTheDocument()
    expect(screen.getByText('ORD-2026-000901')).toBeInTheDocument() // preparing queue
    expect(screen.getByText('مطبخ زينب')).toBeInTheDocument() // recent cooks
  })

  it('opening a delivery row shows its detail modal', async () => {
    const user = userEvent.setup()
    stubAll()
    renderAtDashboard(fm)
    await screen.findByText('أحمد الدليفري')

    await user.click(
      within(screen.getByText('أحمد الدليفري').closest('tr')!).getByRole('button', { name: M.colDetails }),
    )
    const dialog = await screen.findByRole('dialog')
    expect(within(dialog).getByText('ORD-2026-000800')).toBeInTheDocument()
    expect(within(dialog).getByText('150.00 ج.م')).toBeInTheDocument()
    await user.click(within(dialog).getAllByRole('button', { name: M.close })[0])
    expect(screen.queryByRole('dialog')).toBeNull()
  })

  it('quick-action buttons fire onQuickAction with the right key', async () => {
    const user = userEvent.setup()
    const spy = vi.fn()
    stubAll()
    renderAtDashboard(fm, { onQuickAction: spy })
    await screen.findByText(M.quickActionsTitle)

    await user.click(screen.getByRole('button', { name: M.qaAddCook }))
    await user.click(screen.getByRole('button', { name: M.qaBroadcast }))
    await user.click(screen.getByRole('button', { name: M.qaNewUser }))
    expect(spy.mock.calls.map((c) => c[0])).toEqual(['إضافة طباخة', 'إشعار عام', 'مستخدم جديد'])
  })

  it('degrades gracefully when the provisional extras endpoints are missing', async () => {
    fm.reply(OVERVIEW, { json: overviewResponse() })
    // no stubs for delivery/orders-daily/cooks-recent → they reject
    renderAtDashboard(fm)

    await screen.findByText(M.kpiUsers)
    expect(screen.getByText(M.chartError)).toBeInTheDocument()
    expect(screen.getByText(M.deliveriesError)).toBeInTheDocument()
    expect(screen.getByText(M.recentCooksError)).toBeInTheDocument()
    // drivers tiles fall back to —
    const avail = screen.getByText(M.kpiDriversAvailable).closest('div')!
    expect(within(avail).getByText(M.na)).toBeInTheDocument()
    // the KPI tiles from overview still render
    expect(screen.getByText('1,388')).toBeInTheDocument()
  })

  it('a failed first overview load shows a retryable error; Retry recovers', async () => {
    fm.reply(OVERVIEW, { status: 500, json: fail('boom') }, { json: overviewResponse() })
    renderAtDashboard(fm)

    expect(await screen.findByText(M.loadError)).toBeInTheDocument()
    await userEvent.setup().click(screen.getByRole('button', { name: M.retry }))
    await screen.findByText(M.kpiUsers)
  })

  it('a manual refresh re-fetches the overview', async () => {
    const user = userEvent.setup()
    fm.reply(OVERVIEW,
      { json: overviewResponse() },
      { json: overviewResponse(overview({ users_by_role: { customer: 5000, cook: 1, driver: 1, admin: 1 } })) },
    )
    fm.reply('GET /admin/delivery/active', { json: ok([]) })
    fm.reply('GET /admin/delivery/drivers', { json: deliveryDriversResponse([]) })
    fm.reply('GET /admin/orders?status=preparing&page=1', { json: ordersPage([], { total: 0 }) })
    fm.reply('GET /admin/reports/orders-daily?days=7', { json: ok([]) })
    fm.reply('GET /admin/cooks/recent?limit=5', { json: ok([]) })
    renderAtDashboard(fm)

    await screen.findByText('1,388')
    await user.click(screen.getByRole('button', { name: M.refresh }))
    await screen.findByText('5,003')
    expect(fm.count(OVERVIEW)).toBe(2)
  })

  it('auto-refreshes the overview after the 60s interval', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
    stubAll()
    fm.reply(OVERVIEW,
      { json: overviewResponse() },
      { json: overviewResponse(overview({ users_by_role: { customer: 7000, cook: 0, driver: 0, admin: 0 } })) },
    )
    renderAtDashboard(fm)
    await screen.findByText('1,388')

    await act(async () => { await vi.advanceTimersByTimeAsync(REFRESH_INTERVAL_MS) })
    await waitFor(() => expect(fm.count(OVERVIEW)).toBe(2))
    vi.useRealTimers()
  })

  it('a 401 on the overview load redirects to /login', async () => {
    fm.reply(OVERVIEW, { status: 401, json: fail('Unauthenticated.') })
    renderAtDashboard(fm)
    expect(await screen.findByText('صفحة تسجيل الدخول')).toBeInTheDocument()
  })
})
