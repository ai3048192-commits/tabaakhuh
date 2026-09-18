import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { screen, within, fireEvent } from '@testing-library/react'
import { renderAtDashboard } from '../helpers/harness'
import { installFetchMock, type FetchMock } from '../helpers/fetchMock'
import { ok, overviewResponse, deliveryDriversResponse, ordersPage, ordersDaily } from '../helpers/fixtures'
import { overviewMessages as M } from '../../src/overview/messages'

let fm: FetchMock
beforeEach(() => {
  fm = installFetchMock()
})
afterEach(() => {
  vi.unstubAllGlobals()
  localStorage.clear()
})

/**
 * Regression coverage for the bug reported 2026-09-12: the live backend sends
 * each active delivery's order id as `id`, not the documented `order_id`. Every
 * row's `order_id` came back `undefined`, and the live-deliveries table's React
 * key was `d.order_id` — so every `<tr>` shared the same key. On a re-render,
 * React could then keep a stale row's DOM (and its status text) attached to the
 * wrong order number, which is how "TBK-2026-003014" was seen labelled
 * "on_the_way" on `/dashboard` while its real status was `ready_for_pickup`.
 *
 * This exercises the exact wire shape (raw `id`, no `order_id`) end to end and
 * checks each order keeps its own status — covering both fixes: normalising
 * the id in `deliveryApi.ts`, and keying the row on `order_number` instead.
 */
describe('dashboard live-deliveries table — order id / key regression (2026-09-12)', () => {
  it('keeps each row on its own order and status when the backend sends `id` for every row', async () => {
    fm.reply('GET /admin/reports/overview', { json: overviewResponse() })
    fm.reply('GET /admin/delivery/active', {
      json: ok([
        {
          id: 3013,
          order_number: 'TBK-2026-003013',
          status: 'on_the_way',
          delivery_address_text: 'مدينة نصر',
          subtotal: 200,
          delivery_fee: 20,
          total: 220,
          commission: 20,
          driver: { id: 500, name: 'كريم السائق', phone: '+201000000500' },
          customer: null,
          cook: { id: 1, store_name: 'مطبخ سارة' },
          assigned_at: null,
          picked_up_at: null,
        },
        {
          id: 3014,
          order_number: 'TBK-2026-003014',
          status: 'ready_for_pickup',
          delivery_address_text: 'المعادي',
          subtotal: 170,
          delivery_fee: 20,
          total: 190,
          commission: 20,
          driver: null,
          customer: null,
          cook: { id: 2, store_name: 'مطبخ أحمد' },
          assigned_at: null,
          picked_up_at: null,
        },
      ]),
    })
    fm.reply('GET /admin/delivery/drivers', { json: deliveryDriversResponse([]) })
    fm.reply('GET /admin/orders?status=preparing&page=1', { json: ordersPage([], { total: 0 }) })
    fm.reply('GET /admin/orders?status=delivered&page=1', { json: ordersPage([], { total: 0 }) })
    fm.reply('GET /admin/orders?status=completed&page=1', { json: ordersPage([], { total: 0 }) })
    fm.reply('GET /admin/reports/orders-daily?days=7', { json: ok(ordersDaily(7)) })
    fm.reply('GET /admin/cooks/recent?limit=5', { json: ok([]) })

    renderAtDashboard(fm)
    await screen.findByText(M.deliveriesTitle)

    // The table doesn't print the order number as a column — its area and
    // assigned driver are the visible, per-row identity, so key on those.
    const onTheWayRow = (await screen.findByText('مدينة نصر')).closest('tr') as HTMLElement
    const readyRow = screen.getByText('المعادي').closest('tr') as HTMLElement

    // each order carries its own status, not a shared/leftover one
    expect(within(onTheWayRow).getByText('كريم السائق')).toBeInTheDocument()
    expect(within(onTheWayRow).getByText(M.statusLabel.on_the_way)).toBeInTheDocument()
    expect(within(readyRow).getByText(M.statusLabel.ready_for_pickup)).toBeInTheDocument()
    expect(within(readyRow).queryByText(M.statusLabel.on_the_way)).toBeNull()

    // opening the "ready" order's own detail dialog shows its own order number,
    // not the other row's
    const detailButtons = screen.getAllByRole('button', { name: M.colDetails })
    fireEvent.click(within(readyRow).getByRole('button', { name: M.colDetails }))
    expect(await screen.findByText('TBK-2026-003014')).toBeInTheDocument()
    expect(screen.queryByText('TBK-2026-003013')).toBeNull()
    expect(detailButtons).toHaveLength(2)
  })
})
