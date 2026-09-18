import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderAtDelivery } from '../helpers/harness'
import { installFetchMock, type FetchMock } from '../helpers/fetchMock'
import { ok, activeDelivery, deliveryDriver, deliveryDriversResponse } from '../helpers/fixtures'
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

describe('arriving at /delivery?order= from the Orders Oversight link', () => {
  it('opens the assign dialog for the matching order once the list is in', async () => {
    fm.reply(
      ACTIVE,
      { json: ok([activeDelivery({ order_id: 800, order_number: 'ORD-2026-000800', driver_id: null })]) },
    )
    fm.reply(DRIVERS, { json: deliveryDriversResponse([deliveryDriver({ id: 900, name: 'سائق 900' })]) })

    renderAtDelivery(fm, { path: '/delivery?order=800' })

    const dialog = await screen.findByRole('dialog', { name: M.assignTitle('ORD-2026-000800') })
    expect(dialog).toBeInTheDocument()
  })

  it('shows a banner instead, when the order is not in the active-deliveries list', async () => {
    fm.reply(ACTIVE, { json: ok([activeDelivery({ order_id: 800, order_number: 'ORD-2026-000800' })]) })
    fm.reply(DRIVERS, { json: deliveryDriversResponse([]) })

    renderAtDelivery(fm, { path: '/delivery?order=999' })

    expect(await screen.findByText(M.orderNotInPipeline)).toBeInTheDocument()
    expect(screen.queryByRole('dialog')).toBeNull()
  })

  it('dismissing the banner clears it', async () => {
    const user = userEvent.setup()
    fm.reply(ACTIVE, { json: ok([]) })
    fm.reply(DRIVERS, { json: deliveryDriversResponse([]) })

    renderAtDelivery(fm, { path: '/delivery?order=999' })
    await screen.findByText(M.orderNotInPipeline)

    await user.click(screen.getByRole('button', { name: M.close }))
    await waitFor(() => expect(screen.queryByText(M.orderNotInPipeline)).toBeNull())
  })

  it('a plain visit with no order param opens nothing extra', async () => {
    fm.reply(ACTIVE, { json: ok([activeDelivery({ order_id: 800, order_number: 'ORD-2026-000800' })]) })
    fm.reply(DRIVERS, { json: deliveryDriversResponse([]) })

    renderAtDelivery(fm)

    await screen.findByText('ORD-2026-000800')
    expect(screen.queryByRole('dialog')).toBeNull()
    expect(screen.queryByText(M.orderNotInPipeline)).toBeNull()
  })
})
