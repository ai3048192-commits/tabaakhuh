import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { screen, within, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderAtDelivery } from '../helpers/harness'
import { installFetchMock, type FetchMock } from '../helpers/fetchMock'
import { ok, fail, activeDelivery, deliveryDriver, deliveryDriversResponse } from '../helpers/fixtures'
import { deliveryMessages as M } from '../../src/delivery/messages'

let fm: FetchMock
beforeEach(() => {
  fm = installFetchMock()
})
afterEach(() => {
  vi.unstubAllGlobals()
  localStorage.clear()
})

const ACTIVE = 'GET /admin/delivery/active'
const DRIVERS = 'GET /admin/delivery/drivers'

describe('Delivery Operations (provisional /admin/delivery/*)', () => {
  it('loads both panels', async () => {
    fm.reply(ACTIVE, { json: ok([activeDelivery({ order_id: 800, order_number: 'ORD-2026-000800' })]) })
    fm.reply(DRIVERS, { json: deliveryDriversResponse([deliveryDriver({ id: 900, name: 'سائق 900' })]) })
    renderAtDelivery(fm)

    await screen.findByText('ORD-2026-000800')
    expect(screen.getByText('سائق 900')).toBeInTheDocument()
    expect(screen.getAllByText(M.unassigned).length).toBeGreaterThan(0)
  })

  it('assigning a driver POSTs { driver_id } and re-fetches both panels', async () => {
    const user = userEvent.setup()
    fm.reply(
      ACTIVE,
      { json: ok([activeDelivery({ order_id: 800, order_number: 'ORD-2026-000800', driver_id: null })]) },
      { json: ok([activeDelivery({ order_id: 800, order_number: 'ORD-2026-000800', driver_id: 900, driver_name: 'سائق 900' })]) },
    )
    fm.reply(
      DRIVERS,
      { json: deliveryDriversResponse([deliveryDriver({ id: 900, name: 'سائق 900', is_available: true })]) },
      { json: deliveryDriversResponse([deliveryDriver({ id: 900, name: 'سائق 900', is_available: true, active_deliveries: 1 })]) },
    )
    fm.reply('POST /admin/delivery/orders/800/assign', {
      json: ok(activeDelivery({ order_id: 800, driver_id: 900, driver_name: 'سائق 900' })),
    })
    renderAtDelivery(fm)
    await screen.findByText('ORD-2026-000800')

    await user.click(screen.getByRole('button', { name: M.assign }))
    const dialog = await screen.findByRole('dialog')
    await user.selectOptions(within(dialog).getByLabelText(M.pickDriver), '900')
    await user.click(within(dialog).getByRole('button', { name: M.confirm }))

    await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent(M.assignedToast))
    expect(fm.lastCall('POST /admin/delivery/orders/800/assign')?.body).toEqual({ driver_id: 900 })
    expect(fm.count(ACTIVE)).toBe(2)
    expect(fm.count(DRIVERS)).toBe(2)
  })

  it('an offline first load shows a screen error + Retry', async () => {
    const user = userEvent.setup()
    fm.reply(ACTIVE, { networkError: true }, { json: ok([activeDelivery({ order_id: 1 })]) })
    fm.reply(DRIVERS, { json: deliveryDriversResponse([]) }, { json: deliveryDriversResponse([]) })
    renderAtDelivery(fm)
    expect(await screen.findByText(M.listError)).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: M.retry }))
    await screen.findByText('ORD-2026-000001')
  })

  it('a non-admin never reaches /delivery', async () => {
    fm.reply(ACTIVE, { status: 401, json: fail('Unauthenticated.') })
    fm.reply(DRIVERS, { status: 401, json: fail('Unauthenticated.') })
    renderAtDelivery(fm, { admin: false })
    expect(await screen.findByText('صفحة تسجيل الدخول')).toBeInTheDocument()
  })
})
