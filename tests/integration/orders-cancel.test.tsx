import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { screen, within, waitFor } from '@testing-library/react'
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

const LIST = `GET /admin/orders?placed_from=${daysAgoCairo(30)}&page=1`

async function openDetail(orderNumber: string) {
  const user = userEvent.setup()
  const row = screen.getByText(orderNumber).closest('tr')!
  await user.click(within(row).getByRole('button', { name: new RegExp(M.viewDetails) }))
  return { user, dialog: await screen.findByRole('dialog') }
}

describe('Orders Oversight — cancel a problem order', () => {
  it('asks for a reason, sends it, and shows the order as cancelled', async () => {
    fm.reply(LIST, { json: ordersPage([order({ id: 910, status: 'ready_for_pickup' })], { total: 1 }) })
    fm.reply('GET /admin/orders/910', {
      json: ok(order({ id: 910, status: 'ready_for_pickup' })),
    })
    fm.reply('POST /admin/orders/910/cancel', {
      json: ok(order({ id: 910, status: 'cancelled', cancel_reason: 'العميل مش بيرد' })),
    })
    renderAtOrders(fm)
    await screen.findByText('ORD-2026-000910')
    const { user, dialog } = await openDetail('ORD-2026-000910')

    await user.click(await within(dialog).findByRole('button', { name: new RegExp(M.cancelOrderAction) }))
    const confirm = within(dialog).getByRole('button', { name: new RegExp(M.cancelOrderConfirm) })
    expect(confirm).toBeDisabled() // a reason is required

    await user.type(within(dialog).getByLabelText(M.cancelOrderReasonLabel), 'العميل مش بيرد')
    expect(confirm).toBeEnabled()
    await user.click(confirm)

    await waitFor(() => expect(fm.count('POST /admin/orders/910/cancel')).toBe(1))
    expect(fm.lastCall('POST /admin/orders/910/cancel')?.body).toEqual({ reason: 'العميل مش بيرد' })
  })

  it('offers no cancel button on a delivered order', async () => {
    fm.reply(LIST, { json: ordersPage([order({ id: 911, status: 'delivered' })], { total: 1 }) })
    fm.reply('GET /admin/orders/911', { json: ok(order({ id: 911, status: 'delivered' })) })
    renderAtOrders(fm)
    await screen.findByText('ORD-2026-000911')
    const { dialog } = await openDetail('ORD-2026-000911')

    expect(within(dialog).queryByRole('button', { name: new RegExp(M.cancelOrderAction) })).toBeNull()
  })
})
