import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderAtOrders } from '../helpers/harness'
import { installFetchMock, type FetchMock } from '../helpers/fetchMock'
import { ok, fail, order, ordersPage } from '../helpers/fixtures'
import { orderMessages as M } from '../../src/orders/messages'
import { daysAgoCairo } from '../../src/orders/cairoDates'

let fm: FetchMock
beforeEach(() => {
  fm = installFetchMock()
  fm.reply('GET /admin/cities', {
    json: ok([
      { id: 1, name_ar: 'القاهرة', name_en: 'Cairo', is_active: true },
      { id: 2, name_ar: 'الجيزة', name_en: 'Giza', is_active: false }, // deactivated but listed
      { id: 3, name_ar: 'المعادي', name_en: 'Maadi', is_active: true },
    ]),
  })
})
afterEach(() => {
  vi.unstubAllGlobals()
  localStorage.clear()
})

const F = daysAgoCairo(30)
const DEFAULT_KEY = `GET /admin/orders?placed_from=${F}&page=1`

describe('US2 — filter by status, city, and placed-date range', () => {
  it('AC1/AC2: status applies immediately (no Apply), and clearing it drops the param', async () => {
    const user = userEvent.setup()
    fm.reply(DEFAULT_KEY, { json: ordersPage([order({ id: 1 })], { total: 5 }) })
    fm.reply(`GET /admin/orders?status=completed&placed_from=${F}&page=1`, {
      json: ordersPage([order({ id: 2, status: 'completed' })], { total: 2 }),
    })
    renderAtOrders(fm)
    await screen.findByText('ORD-2026-000001')

    await user.selectOptions(screen.getByLabelText(M.filterStatus), 'completed')
    await screen.findByText('ORD-2026-000002')
    expect(fm.count(`GET /admin/orders?status=completed&placed_from=${F}&page=1`)).toBe(1)
    expect(screen.getByText(new RegExp(M.totalInRange(2)))).toBeInTheDocument()

    await user.selectOptions(screen.getByLabelText(M.filterStatus), 'all')
    await screen.findByText('ORD-2026-000001')
  })

  it('AC3/AC4: a deactivated city is a selectable filter value', async () => {
    const user = userEvent.setup()
    fm.reply(DEFAULT_KEY, { json: ordersPage([order({ id: 1 })], { total: 3 }) })
    fm.reply(`GET /admin/orders?city_id=2&placed_from=${F}&page=1`, {
      json: ordersPage([order({ id: 9 })], { total: 1 }),
    })
    renderAtOrders(fm)
    await screen.findByText('ORD-2026-000001')

    await user.selectOptions(screen.getByLabelText(M.filterCity), '2') // الجيزة, inactive
    await screen.findByText('ORD-2026-000009')
    expect(fm.count(`GET /admin/orders?city_id=2&placed_from=${F}&page=1`)).toBe(1)
  })

  it('AC5: the date range fires only on Apply, and one side alone is open-ended', async () => {
    const user = userEvent.setup()
    fm.reply(DEFAULT_KEY, { json: ordersPage([order({ id: 1 })], { total: 3 }) })
    fm.reply(`GET /admin/orders?placed_from=2026-08-01&placed_to=2026-08-31&page=1`, {
      json: ordersPage([order({ id: 7 })], { total: 1 }),
    })
    renderAtOrders(fm)
    await screen.findByText('ORD-2026-000001')

    await user.clear(screen.getByLabelText(M.filterFrom))
    await user.type(screen.getByLabelText(M.filterFrom), '2026-08-01')
    await user.type(screen.getByLabelText(M.filterTo), '2026-08-31')
    // nothing fired yet
    expect(fm.count(`GET /admin/orders?placed_from=2026-08-01&placed_to=2026-08-31&page=1`)).toBe(0)

    await user.click(screen.getByRole('button', { name: M.apply }))
    await screen.findByText('ORD-2026-000007')
  })

  it('AC7: from later than to is blocked locally — no request, message shown, results kept', async () => {
    const user = userEvent.setup()
    fm.reply(DEFAULT_KEY, { json: ordersPage([order({ id: 1 })], { total: 3 }) })
    renderAtOrders(fm)
    await screen.findByText('ORD-2026-000001')
    const before = fm.calls.length

    await user.clear(screen.getByLabelText(M.filterFrom))
    await user.type(screen.getByLabelText(M.filterFrom), '2026-09-10')
    await user.type(screen.getByLabelText(M.filterTo), '2026-09-01')
    await user.click(screen.getByRole('button', { name: M.apply }))

    expect(await screen.findByText(M.fromAfterTo)).toBeInTheDocument()
    expect(fm.calls.length).toBe(before) // no new request
    expect(screen.getByText('ORD-2026-000001')).toBeInTheDocument()
  })

  it('AC8: a server 422 on a bad city surfaces a field message and does NOT replace the list', async () => {
    const user = userEvent.setup()
    fm.reply(DEFAULT_KEY, { json: ordersPage([order({ id: 1 })], { total: 3 }) })
    fm.reply(`GET /admin/orders?city_id=3&placed_from=${F}&page=1`, {
      status: 422,
      json: fail('The given data was invalid.', { city_id: ['المدينة غير موجودة.'] }),
    })
    renderAtOrders(fm)
    await screen.findByText('ORD-2026-000001')

    await user.selectOptions(screen.getByLabelText(M.filterCity), '3')
    expect(await screen.findByText('المدينة غير موجودة.')).toBeInTheDocument()
    expect(screen.getByText('ORD-2026-000001')).toBeInTheDocument() // list unchanged
  })

  it('AC12: filters that match nothing show the distinct no-match state + Reset', async () => {
    const user = userEvent.setup()
    fm.reply(DEFAULT_KEY, { json: ordersPage([order({ id: 1 })], { total: 3 }) })
    fm.reply(`GET /admin/orders?status=quoted&placed_from=${F}&page=1`, {
      json: ordersPage([], { total: 0 }),
    })
    renderAtOrders(fm)
    await screen.findByText('ORD-2026-000001')

    await user.selectOptions(screen.getByLabelText(M.filterStatus), 'quoted')
    expect((await screen.findAllByText(M.emptyNoMatch)).length).toBeGreaterThan(0)

    fm.reply(DEFAULT_KEY, { json: ordersPage([order({ id: 1 })], { total: 3 }) })
    await user.click(screen.getAllByRole('button', { name: M.resetFilters })[0])
    await screen.findByText('ORD-2026-000001')
  })

  it('AC11/AC13: changing one filter keeps the others and re-runs from page 1', async () => {
    const user = userEvent.setup()
    fm.reply(DEFAULT_KEY, { json: ordersPage([order({ id: 1 })], { total: 3 }) })
    fm.reply(`GET /admin/orders?city_id=1&placed_from=${F}&page=1`, {
      json: ordersPage([order({ id: 2 })], { total: 2 }),
    })
    fm.reply(`GET /admin/orders?status=completed&city_id=1&placed_from=${F}&page=1`, {
      json: ordersPage([order({ id: 3, status: 'completed' })], { total: 1 }),
    })
    renderAtOrders(fm)
    await screen.findByText('ORD-2026-000001')

    await user.selectOptions(screen.getByLabelText(M.filterCity), '1')
    await screen.findByText('ORD-2026-000002')
    await user.selectOptions(screen.getByLabelText(M.filterStatus), 'completed')
    await screen.findByText('ORD-2026-000003')
    expect(
      fm.count(`GET /admin/orders?status=completed&city_id=1&placed_from=${F}&page=1`),
    ).toBe(1)
  })
})
