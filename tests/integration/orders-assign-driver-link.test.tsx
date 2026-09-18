import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { screen, within } from '@testing-library/react'
import { renderAtOrders } from '../helpers/harness'
import { installFetchMock, type FetchMock } from '../helpers/fetchMock'
import { ok, order, ordersPage, cityList } from '../helpers/fixtures'
import { orderMessages as M } from '../../src/orders/messages'
import { daysAgoCairo } from '../../src/orders/cairoDates'
import type { OrderStatus } from '../../src/orders/types'

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

describe('the Orders Oversight screen links to Delivery for driver assignment', () => {
  it.each<OrderStatus>(['ready_for_pickup', 'assigned_to_driver', 'picked_up', 'on_the_way'])(
    'shows the "assign driver" link for a %s order, pointing at that order on /delivery',
    async (status) => {
      fm.reply(DEFAULT_KEY, { json: ordersPage([order({ id: 700, status })], { total: 1 }) })
      renderAtOrders(fm)
      await screen.findByText('ORD-2026-000700')

      const row = screen.getByText('ORD-2026-000700').closest('tr') as HTMLElement
      const link = within(row).getByRole('link', { name: M.assignDriver })
      expect(link).toHaveAttribute('href', '/delivery?order=700')
    },
  )

  it.each<OrderStatus>(['pending', 'accepted', 'preparing', 'delivered', 'completed', 'cancelled', 'pending_review', 'quoted'])(
    'hides the link for a %s order — outside the driver-assignment pipeline',
    async (status) => {
      fm.reply(DEFAULT_KEY, { json: ordersPage([order({ id: 701, status })], { total: 1 }) })
      renderAtOrders(fm)
      await screen.findByText('ORD-2026-000701')

      const row = screen.getByText('ORD-2026-000701').closest('tr') as HTMLElement
      expect(within(row).queryByRole('link', { name: M.assignDriver })).toBeNull()
      // the read-only "view details" action is still there
      expect(within(row).getByRole('button', { name: M.viewDetails })).toBeInTheDocument()
    },
  )

  it('never issues any mutating request — this screen stays read-only (FR-028)', async () => {
    fm.reply(DEFAULT_KEY, {
      json: ordersPage([order({ id: 702, status: 'ready_for_pickup' })], { total: 1 }),
    })
    renderAtOrders(fm)
    await screen.findByText('ORD-2026-000702')

    expect(fm.count('POST /admin/delivery/orders/702/assign')).toBe(0)
    expect(fm.count('POST /admin/orders/702/assign')).toBe(0)
  })
})
