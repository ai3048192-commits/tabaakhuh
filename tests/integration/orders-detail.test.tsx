import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderAtOrders } from '../helpers/harness'
import { installFetchMock, type FetchMock } from '../helpers/fetchMock'
import { ok, order, customOrder, orderItem, ordersPage, cityList } from '../helpers/fixtures'
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

async function openDetail(id: string) {
  const user = userEvent.setup()
  const row = screen.getByText(id).closest('tr')!
  await user.click(within(row).getByRole('button', { name: new RegExp(M.viewDetails) }))
  return screen.findByRole('dialog')
}

describe('US3 — inspect one order in detail', () => {
  it('AC1: opening the detail issues no extra request; header + reference ids shown', async () => {
    fm.reply(DEFAULT_KEY, {
      json: ordersPage([order({ id: 901, customer_id: 55, delivery_address_id: 88 })], { total: 1 }),
    })
    renderAtOrders(fm)
    await screen.findByText('ORD-2026-000901')
    const before = fm.calls.length

    const dialog = await openDetail('ORD-2026-000901')
    expect(fm.calls.length).toBe(before)
    expect(within(dialog).getByText('55')).toBeInTheDocument()
    expect(within(dialog).getByText('88')).toBeInTheDocument()
    expect(within(dialog).getByText(M.customerLabel)).toBeInTheDocument()
    // no customer name / address text
    expect(within(dialog).queryByText(/شارع|عنوان نصّي/)).toBeNull()
  })

  it('AC2: every line item is shown; line totals match the subtotal', async () => {
    fm.reply(DEFAULT_KEY, {
      json: ordersPage(
        [
          order({
            id: 902,
            items: [
              orderItem({ id: 1, item_name: 'كشري', unit_price: 45, quantity: 4, line_total: 180 }),
            ],
            subtotal: 180,
          }),
        ],
        { total: 1 },
      ),
    })
    renderAtOrders(fm)
    await screen.findByText('ORD-2026-000902')
    const dialog = await openDetail('ORD-2026-000902')
    expect(within(dialog).getByText('كشري')).toBeInTheDocument()
    expect(within(dialog).getByText('4')).toBeInTheDocument()
  })

  it('AC2b: an unquoted custom order shows "no line items yet"', async () => {
    fm.reply(DEFAULT_KEY, { json: ordersPage([customOrder({ id: 903 })], { total: 1 }) })
    renderAtOrders(fm)
    await screen.findByText('ORD-2026-000903')
    const dialog = await openDetail('ORD-2026-000903')
    expect(within(dialog).getByText(M.noLineItems)).toBeInTheDocument()
  })

  it('AC3/AC4: note only when present; cancel reason only when cancelled', async () => {
    fm.reply(DEFAULT_KEY, {
      json: ordersPage(
        [
          order({ id: 904, customer_note: 'بدون شطة' }),
          order({ id: 905, status: 'cancelled', cancel_reason: 'العميل ألغى' }),
          order({ id: 906 }),
        ],
        { total: 3 },
      ),
    })
    renderAtOrders(fm)
    await screen.findByText('ORD-2026-000904')

    let dialog = await openDetail('ORD-2026-000904')
    expect(within(dialog).getByText('بدون شطة')).toBeInTheDocument()
    expect(within(dialog).queryByText(M.cancelReason)).toBeNull()
    await userEvent.setup().keyboard('{Escape}')

    dialog = await openDetail('ORD-2026-000905')
    expect(within(dialog).getByText('العميل ألغى')).toBeInTheDocument()
    await userEvent.setup().keyboard('{Escape}')

    dialog = await openDetail('ORD-2026-000906')
    expect(within(dialog).queryByText(M.customerNote)).toBeNull()
    expect(within(dialog).queryByText(M.cancelReason)).toBeNull()
  })

  it('AC5/AC6/AC8: custom-details for a custom order, none for a regular; no timeline/quote', async () => {
    fm.reply(DEFAULT_KEY, {
      json: ordersPage(
        [
          customOrder({ id: 907 }),
          order({ id: 908 }),
        ],
        { total: 2 },
      ),
    })
    renderAtOrders(fm)
    await screen.findByText('ORD-2026-000907')

    let dialog = await openDetail('ORD-2026-000907')
    expect(within(dialog).getByText(M.customDetails)).toBeInTheDocument()
    expect(within(dialog).getByText(M.occasionType)).toBeInTheDocument()
    expect(within(dialog).getByText('زفاف')).toBeInTheDocument()
    // no status timeline / no quote section
    expect(within(dialog).queryByText(/الخط الزمني|عرض السعر|timeline|quote/i)).toBeNull()
    await userEvent.setup().keyboard('{Escape}')

    dialog = await openDetail('ORD-2026-000908')
    expect(within(dialog).queryByText(M.customDetails)).toBeNull()
  })

  it('AC7: closing returns to the same page with focus restored', async () => {
    const user = userEvent.setup()
    fm.reply(DEFAULT_KEY, { json: ordersPage([order({ id: 909 })], { total: 1 }) })
    renderAtOrders(fm)
    await screen.findByText('ORD-2026-000909')
    const trigger = screen.getByRole('button', { name: new RegExp(M.viewDetails) })

    await user.click(trigger)
    await screen.findByRole('dialog')
    await user.keyboard('{Escape}')

    expect(screen.queryByRole('dialog')).toBeNull()
    expect(screen.getByText('ORD-2026-000909')).toBeInTheDocument()
    expect(trigger).toHaveFocus()
  })
})
