import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderAtOrders } from '../helpers/harness'
import { installFetchMock, type FetchMock } from '../helpers/fetchMock'
import { ok, order, ordersPage, cityList } from '../helpers/fixtures'
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

const F = daysAgoCairo(30)

describe('Orders Oversight — URL-synced state (FR-036, SC-017)', () => {
  it('a full query string in the URL drives one exact GET and shows that page', async () => {
    const key =
      'GET /admin/orders?status=completed&city_id=3&placed_from=2026-08-01&placed_to=2026-08-31&page=2'
    fm.reply(key, { json: ordersPage([order({ id: 42, status: 'completed' })], { page: 2, total: 45 }) })

    renderAtOrders(fm, {
      path: '/orders?status=completed&city=3&from=2026-08-01&to=2026-08-31&page=2',
    })

    await screen.findByText('ORD-2026-000042')
    expect(fm.count(key)).toBe(1)
    expect(screen.getByText(M.pageIndicator(2, 3))).toBeInTheDocument()
    // filters reflect the URL
    expect((screen.getByLabelText(M.filterStatus) as HTMLSelectElement).value).toBe('completed')
    expect((screen.getByLabelText(M.filterCity) as HTMLSelectElement).value).toBe('3')
  })

  it('changing a filter rewrites the query and resets to page 1', async () => {
    const user = userEvent.setup()
    fm.reply(`GET /admin/orders?status=completed&placed_from=${F}&page=2`, {
      json: ordersPage([order({ id: 1, status: 'completed' })], { page: 2, total: 45 }),
    })
    fm.reply(`GET /admin/orders?status=cancelled&placed_from=${F}&page=1`, {
      json: ordersPage([order({ id: 2, status: 'cancelled' })], { page: 1, total: 3 }),
    })
    renderAtOrders(fm, { path: '/orders?status=completed&page=2' })
    await screen.findByText('ORD-2026-000001')

    await user.selectOptions(screen.getByLabelText(M.filterStatus), 'cancelled')
    await screen.findByText('ORD-2026-000002')
    expect(fm.count(`GET /admin/orders?status=cancelled&placed_from=${F}&page=1`)).toBe(1)
  })

  it('no query params → the default last-30-days page-1 view', async () => {
    fm.reply(`GET /admin/orders?placed_from=${F}&page=1`, {
      json: ordersPage([order({ id: 5 })], { total: 1 }),
    })
    renderAtOrders(fm, { path: '/orders' })
    await screen.findByText('ORD-2026-000005')
    expect(fm.count(`GET /admin/orders?placed_from=${F}&page=1`)).toBe(1)
  })

  it('opening the detail does not issue any request or change the query', async () => {
    const user = userEvent.setup()
    fm.reply(`GET /admin/orders?placed_from=${F}&page=1`, {
      json: ordersPage([order({ id: 9 })], { total: 1 }),
    })
    renderAtOrders(fm, { path: '/orders' })
    await screen.findByText('ORD-2026-000009')
    const before = fm.calls.length

    await user.click(screen.getByRole('button', { name: new RegExp(M.viewDetails) }))
    await screen.findByRole('dialog')
    expect(fm.calls.length).toBe(before)
  })
})
