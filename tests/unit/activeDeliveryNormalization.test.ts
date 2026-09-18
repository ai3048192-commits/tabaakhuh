import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { installFetchMock, type FetchMock } from '../helpers/fetchMock'
import { ok } from '../helpers/fixtures'
import { setTokenProvider } from '../../src/api/httpClient'
import { listActiveDeliveries } from '../../src/delivery/deliveryApi'

let fm: FetchMock
beforeEach(() => {
  fm = installFetchMock()
  setTokenProvider(() => 'tok-admin')
})
afterEach(() => {
  vi.unstubAllGlobals()
  setTokenProvider(null)
})

/**
 * The live backend sends the order id as `id`, not the `order_id` documented in
 * admin-dashboard-api.md (confirmed against the running API 2026-09-12, via the
 * Orders Oversight → Delivery deep link always reporting "not in pipeline").
 * `listActiveDeliveries` must normalise either shape to `ActiveDelivery.order_id`.
 */
describe('listActiveDeliveries — order id key normalisation', () => {
  it('reads the order id from `id` when `order_id` is absent (the actual backend shape)', async () => {
    fm.reply('GET /admin/delivery/active', {
      json: ok([
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
          cook: { id: 1, store_name: 'مطبخ أحمد' },
          assigned_at: null,
          picked_up_at: null,
        },
      ]),
    })

    const [row] = await listActiveDeliveries()
    expect(row.order_id).toBe(3014)
    expect(row.order_number).toBe('TBK-2026-003014')
  })

  it('still reads `order_id` when the documented shape is what comes back', async () => {
    fm.reply('GET /admin/delivery/active', {
      json: ok([
        {
          order_id: 42,
          order_number: 'ORD-2026-000042',
          status: 'ready_for_pickup',
          delivery_address_text: null,
          subtotal: 100,
          delivery_fee: 25,
          total: 125,
          commission: 25,
          driver: null,
          customer: null,
          cook: null,
          assigned_at: null,
          picked_up_at: null,
        },
      ]),
    })

    const [row] = await listActiveDeliveries()
    expect(row.order_id).toBe(42)
  })
})
