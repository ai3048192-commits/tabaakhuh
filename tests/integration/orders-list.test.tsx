import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { screen, within, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderAtOrders } from '../helpers/harness'
import { installFetchMock, type FetchMock } from '../helpers/fetchMock'
import { ok, order, customOrder, ordersPage, cityList } from '../helpers/fixtures'
import { orderMessages as M } from '../../src/orders/messages'
import { daysAgoCairo } from '../../src/orders/cairoDates'

let fm: FetchMock
beforeEach(() => {
  fm = installFetchMock()
  fm.reply('GET /admin/cities', { json: ok(cityList()) })
})
afterEach(() => {
  vi.unstubAllGlobals()
  localStorage.clear()
})

const DEFAULT_KEY = `GET /admin/orders?placed_from=${daysAgoCairo(30)}&page=1`

describe('US1 — review the paginated orders list', () => {
  it('AC1: clean URL → one GET with the default 30-day placed_from and the table columns', async () => {
    fm.reply(DEFAULT_KEY, {
      json: ordersPage([order({ id: 901, cook_name: 'مطبخ أم أحمد' })], { total: 42 }),
    })
    renderAtOrders(fm)

    await screen.findByText('ORD-2026-000901')
    expect(fm.count(DEFAULT_KEY)).toBe(1)
    expect(screen.getByText('مطبخ أم أحمد')).toBeInTheDocument()
    expect(screen.getByText(M.colOrderNumber)).toBeInTheDocument()
    // count is labelled "within the range", not a bare total
    expect(screen.getByText(new RegExp(M.totalInRange(42)))).toBeInTheDocument()
    // no customer column
    expect(screen.queryByText(/رقم العميل/)).toBeNull()
  })

  it('AC2/AC3: a slow load shows loading; an empty default view shows "no orders"', async () => {
    fm.reply(DEFAULT_KEY, { delayMs: 20, json: ordersPage([], { total: 0 }) })
    renderAtOrders(fm)
    expect(await screen.findByText(M.loading)).toBeInTheDocument()
    expect(await screen.findByText(M.emptyNoOrders)).toBeInTheDocument()
  })

  it('AC6/AC7: custom and cancelled orders are marked (icon + label), cancel reason reachable', async () => {
    fm.reply(DEFAULT_KEY, {
      json: ordersPage([
        customOrder({ id: 902 }),
        order({ id: 903, status: 'cancelled', cancel_reason: 'العميل ألغى' }),
      ]),
    })
    renderAtOrders(fm)
    await screen.findByText('ORD-2026-000902')
    expect(screen.getByText(M.typeCustom)).toBeInTheDocument()
    expect(screen.getAllByText(M.statusLabels.cancelled).length).toBeGreaterThan(0)

    await userEvent.setup().click(
      within(screen.getByText('ORD-2026-000903').closest('tr')!).getByRole('button', {
        name: new RegExp(M.viewDetails),
      }),
    )
    expect(await screen.findByText('العميل ألغى')).toBeInTheDocument()
  })

  it('AC4/AC5: Next / Prev / First issue the right page query and toggle disabled states', async () => {
    const user = userEvent.setup()
    fm.reply(DEFAULT_KEY, { json: ordersPage([order({ id: 1 })], { page: 1, total: 45 }) })
    fm.reply(`GET /admin/orders?placed_from=${daysAgoCairo(30)}&page=2`, {
      json: ordersPage([order({ id: 21 })], { page: 2, total: 45 }),
    })
    renderAtOrders(fm)

    await screen.findByText(M.pageIndicator(1, 3))
    expect(screen.getByRole('button', { name: 'الصفحة السابقة' })).toBeDisabled()

    await user.click(screen.getByRole('button', { name: 'الصفحة التالية' }))
    await screen.findByText(M.pageIndicator(2, 3))
    expect(fm.count(`GET /admin/orders?placed_from=${daysAgoCairo(30)}&page=2`)).toBe(1)
    expect(screen.getByRole('button', { name: 'الصفحة السابقة' })).toBeEnabled()

    await user.click(screen.getByRole('button', { name: 'الصفحة السابقة' }))
    await screen.findByText(M.pageIndicator(1, 3))
  })

  it('AC8: an offline first load shows a screen error + Retry that recovers', async () => {
    const user = userEvent.setup()
    fm.reply(
      DEFAULT_KEY,
      { networkError: true },
      { json: ordersPage([order({ id: 5 })], { total: 1 }) },
    )
    renderAtOrders(fm)

    expect(await screen.findByText(M.listError)).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: M.retry }))
    expect(await screen.findByText('ORD-2026-000005')).toBeInTheDocument()
  })

  it('AC9: a page beyond the last shows "no orders on this page" + back-to-first', async () => {
    const user = userEvent.setup()
    fm.reply(`GET /admin/orders?placed_from=${daysAgoCairo(30)}&page=999`, {
      json: ordersPage([], { page: 999, total: 40 }),
    })
    fm.reply(DEFAULT_KEY, { json: ordersPage([order({ id: 1 })], { page: 1, total: 40 }) })
    renderAtOrders(fm, { path: '/orders?page=999' })

    expect(await screen.findByText(M.emptyBeyondRange)).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: M.backToFirst }))
    await waitFor(() => expect(fm.count(DEFAULT_KEY)).toBe(1))
  })
})
