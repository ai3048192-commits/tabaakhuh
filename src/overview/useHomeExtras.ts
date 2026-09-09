import { useCallback, useEffect, useState } from 'react'
import { listActiveDeliveries, listDeliveryDrivers } from '../delivery/deliveryApi'
import { listOrders } from '../orders/ordersApi'
import { getOrdersDaily, getRecentCooks, type OrdersDailyPoint, type RecentCook } from './homeApi'
import type { ActiveDelivery } from '../delivery/types'
import type { Order } from '../orders/types'

/** Each section: `null` = still loading OR its endpoint is unavailable (see `ok`). */
export interface HomeExtras {
  deliveries: ActiveDelivery[] | null
  deliveriesOk: boolean
  driversAvailable: number | null
  driversBusy: number | null
  driversOk: boolean
  preparing: Order[] | null
  preparingOk: boolean
  ordersDaily: OrdersDailyPoint[] | null
  ordersDailyOk: boolean
  recentCooks: RecentCook[] | null
  recentCooksOk: boolean
  loading: boolean
  refresh: () => void
}

/**
 * Fans out the extra fetches the rich home needs beyond `GET /admin/reports/overview`.
 * `Promise.allSettled` — a missing / failing endpoint only blanks its own section.
 */
export function useHomeExtras(): HomeExtras {
  const [deliveries, setDeliveries] = useState<ActiveDelivery[] | null>(null)
  const [deliveriesOk, setDeliveriesOk] = useState(true)
  const [drivers, setDrivers] = useState<{ available: number; busy: number } | null>(null)
  const [driversOk, setDriversOk] = useState(true)
  const [preparing, setPreparing] = useState<Order[] | null>(null)
  const [preparingOk, setPreparingOk] = useState(true)
  const [ordersDaily, setOrdersDaily] = useState<OrdersDailyPoint[] | null>(null)
  const [ordersDailyOk, setOrdersDailyOk] = useState(true)
  const [recentCooks, setRecentCooks] = useState<RecentCook[] | null>(null)
  const [recentCooksOk, setRecentCooksOk] = useState(true)
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    const [d, dr, pr, od, rc] = await Promise.allSettled([
      listActiveDeliveries(),
      listDeliveryDrivers(),
      listOrders({ filters: { status: 'preparing', cityId: null, from: null, to: null }, page: 1 }),
      getOrdersDaily(7),
      getRecentCooks(5),
    ])

    if (d.status === 'fulfilled' && Array.isArray(d.value)) { setDeliveries(d.value); setDeliveriesOk(true) }
    else { setDeliveries([]); setDeliveriesOk(false) }

    if (dr.status === 'fulfilled' && dr.value && typeof dr.value.available_count === 'number') {
      setDrivers({ available: dr.value.available_count, busy: dr.value.busy_count })
      setDriversOk(true)
    } else { setDrivers(null); setDriversOk(false) }

    if (pr.status === 'fulfilled' && Array.isArray(pr.value?.items)) {
      setPreparing(pr.value.items.slice(0, 5)); setPreparingOk(true)
    } else { setPreparing([]); setPreparingOk(false) }

    if (od.status === 'fulfilled' && Array.isArray(od.value)) { setOrdersDaily(od.value); setOrdersDailyOk(true) }
    else { setOrdersDaily([]); setOrdersDailyOk(false) }

    if (rc.status === 'fulfilled' && Array.isArray(rc.value)) { setRecentCooks(rc.value); setRecentCooksOk(true) }
    else { setRecentCooks([]); setRecentCooksOk(false) }

    setLoading(false)
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  return {
    deliveries,
    deliveriesOk,
    driversAvailable: drivers?.available ?? null,
    driversBusy: drivers?.busy ?? null,
    driversOk,
    preparing,
    preparingOk,
    ordersDaily,
    ordersDailyOk,
    recentCooks,
    recentCooksOk,
    loading,
    refresh: () => void load(),
  }
}
