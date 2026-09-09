import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { screen } from '@testing-library/react'
import { axe } from 'vitest-axe'
import { renderAtDashboard } from '../helpers/harness'
import { installFetchMock, type FetchMock } from '../helpers/fetchMock'
import {
  ok, fail, overviewResponse, activeDelivery, deliveryDriver, deliveryDriversResponse, order, ordersPage, ordersDaily, recentCook,
} from '../helpers/fixtures'
import { overviewMessages as M } from '../../src/overview/messages'

const AXE_WCAG = { runOnly: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'] } as const
let fm: FetchMock
const OVERVIEW = 'GET /admin/reports/overview'

beforeEach(() => { fm = installFetchMock() })
afterEach(() => { vi.unstubAllGlobals(); localStorage.clear() })

function stubAll() {
  fm.reply(OVERVIEW, { json: overviewResponse() })
  fm.reply('GET /admin/delivery/active', { json: ok([activeDelivery({ order_id: 800, driver_name: 'أحمد', total: 150, commission: 15 })]) })
  fm.reply('GET /admin/delivery/drivers', { json: deliveryDriversResponse([deliveryDriver({ id: 900 })]) })
  fm.reply('GET /admin/orders?status=preparing&page=1', { json: ordersPage([order({ id: 901, status: 'preparing', total: 450 })], { total: 1 }) })
  fm.reply('GET /admin/reports/orders-daily?days=7', { json: ok(ordersDaily(7)) })
  fm.reply('GET /admin/cooks/recent?limit=5', { json: ok([recentCook({ id: 3001 })]) })
}

describe('Dashboard home — accessibility (WCAG 2.1 AA)', () => {
  it('the populated home has no AA violations; RTL; Western digits', async () => {
    stubAll()
    const { container } = renderAtDashboard(fm)
    await screen.findByText(M.deliveriesTitle)

    expect(container.querySelector('[dir="rtl"]')).toBeTruthy()
    for (const el of container.querySelectorAll('[dir="ltr"]')) {
      expect(el.textContent ?? '').not.toMatch(/[٠-٩]/)
    }
    expect(await axe(container, AXE_WCAG)).toHaveNoViolations()
  })

  it('the loading and error states have no AA violations', async () => {
    fm.reply(OVERVIEW, { status: 500, json: fail('boom') })
    const { container } = renderAtDashboard(fm)
    await screen.findByText(M.loadError)
    expect(await axe(container, AXE_WCAG)).toHaveNoViolations()
  })

  it('the detail modal has no AA violations', async () => {
    stubAll()
    const { container } = renderAtDashboard(fm)
    await screen.findByText('أحمد')
    const btn = screen.getAllByRole('button', { name: M.colDetails })[0]
    btn.click()
    await screen.findByRole('dialog')
    expect(await axe(container, AXE_WCAG)).toHaveNoViolations()
  })
})

