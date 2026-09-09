import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { screen, fireEvent } from '@testing-library/react'
import { renderAtOrders } from '../helpers/harness'
import { installFetchMock, type FetchMock } from '../helpers/fetchMock'
import { ok, order, ordersPage, cityList } from '../helpers/fixtures'
import { orderMessages as M } from '../../src/orders/messages'
import { daysAgoCairo } from '../../src/orders/cairoDates'
import { AUTO_REFRESH_MS } from '../../src/orders/useOrdersOversight'

let fm: FetchMock
beforeEach(() => {
  vi.useFakeTimers()
  fm = installFetchMock()
  fm.reply('GET /admin/cities', { json: ok(cityList()) })
})
afterEach(() => {
  vi.runOnlyPendingTimers()
  vi.useRealTimers()
  vi.unstubAllGlobals()
  localStorage.clear()
})

const F = daysAgoCairo(30)
const DEFAULT_KEY = `GET /admin/orders?placed_from=${F}&page=1`
const tick = () => vi.advanceTimersByTimeAsync(AUTO_REFRESH_MS + 10)

describe('Orders Oversight — conditional auto-refresh (FR-009 / FR-009a / FR-009b, SC-013b)', () => {
  it('page 1 + default range → a second identical GET fires after the interval', async () => {
    fm.reply(DEFAULT_KEY, { json: ordersPage([order({ id: 1 })], { total: 3 }) })
    renderAtOrders(fm)
    await vi.waitFor(() => expect(screen.getByText('ORD-2026-000001')).toBeInTheDocument())
    expect(fm.count(DEFAULT_KEY)).toBe(1)

    await tick()
    await vi.waitFor(() => expect(fm.count(DEFAULT_KEY)).toBe(2))

    // toggling auto-refresh off stops further auto GETs; manual Refresh still works
    fireEvent.click(screen.getByLabelText(M.autoRefresh))
    await tick()
    await tick()
    expect(fm.count(DEFAULT_KEY)).toBe(2)

    fireEvent.click(screen.getByRole('button', { name: M.refresh }))
    await vi.waitFor(() => expect(fm.count(DEFAULT_KEY)).toBe(3))
  })

  it('on page 2 → no automatic GET', async () => {
    fm.reply(`GET /admin/orders?placed_from=${F}&page=2`, {
      json: ordersPage([order({ id: 21 })], { page: 2, total: 45 }),
    })
    renderAtOrders(fm, { path: '/orders?page=2' })
    await vi.waitFor(() => expect(screen.getByText('ORD-2026-000021')).toBeInTheDocument())
    const key = `GET /admin/orders?placed_from=${F}&page=2`
    expect(fm.count(key)).toBe(1)

    tick()
    tick()
    expect(fm.count(key)).toBe(1)
  })

  it('with a custom narrower date range → no automatic GET', async () => {
    const narrow = daysAgoCairo(3)
    const key = `GET /admin/orders?placed_from=${narrow}&page=1`
    fm.reply(key, { json: ordersPage([order({ id: 7 })], { total: 1 }) })
    renderAtOrders(fm, { path: `/orders?from=${narrow}` })
    await vi.waitFor(() => expect(screen.getByText('ORD-2026-000007')).toBeInTheDocument())
    expect(fm.count(key)).toBe(1)

    tick()
    tick()
    expect(fm.count(key)).toBe(1)
  })
})
