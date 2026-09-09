import { useCallback, useEffect, useRef, useState } from 'react'
import { ApiError } from '../api/envelope'
import { assignDriver, listActiveDeliveries, listDeliveryDrivers } from './deliveryApi'
import type { ActiveDelivery, DeliveryDriver, DeliveryScreenStatus } from './types'

export interface UseDelivery {
  status: DeliveryScreenStatus
  active: ActiveDelivery[]
  drivers: DeliveryDriver[]
  toast: string | null
  assigning: ActiveDelivery | null
  busy: boolean

  refresh: () => void
  openAssign: (d: ActiveDelivery) => void
  closeAssign: () => void
  confirmAssign: (driverId: number) => Promise<boolean>
}

/** Loads active deliveries + drivers together; assigns a driver to an order. Provisional contract. */
export function useDelivery(): UseDelivery {
  const [status, setStatus] = useState<DeliveryScreenStatus>('loading')
  const [active, setActive] = useState<ActiveDelivery[]>([])
  const [drivers, setDrivers] = useState<DeliveryDriver[]>([])
  const [toast, setToast] = useState<string | null>(null)
  const [assigning, setAssigning] = useState<ActiveDelivery | null>(null)
  const [busy, setBusy] = useState(false)

  const loadedRef = useRef(false)
  useEffect(() => {
    loadedRef.current = status === 'ready'
  }, [status])

  const showToast = useCallback((msg: string) => {
    setToast(msg)
    window.setTimeout(() => setToast((t) => (t === msg ? null : t)), 6000)
  }, [])

  const load = useCallback(async () => {
    if (!loadedRef.current) setStatus('loading')
    try {
      const [a, d] = await Promise.all([listActiveDeliveries(), listDeliveryDrivers()])
      setActive(a)
      setDrivers(d.drivers)
      setStatus('ready')
    } catch {
      if (loadedRef.current) {
        showToast('تعذّر التحديث. حاول مرة أخرى.')
      } else {
        setStatus('error')
      }
    }
  }, [showToast])

  useEffect(() => {
    void load()
  }, [load])

  const confirmAssign = useCallback(
    async (driverId: number): Promise<boolean> => {
      if (!assigning) return false
      setBusy(true)
      try {
        await assignDriver(assigning.order_id, driverId)
        setAssigning(null)
        showToast('تم إسناد السائق.')
        await load()
        return true
      } catch (err) {
        setAssigning(null)
        showToast(
          err instanceof ApiError && err.status === 404
            ? 'تعذّر العثور على الطلب أو السائق.'
            : 'تعذّر إتمام العملية. حاول مرة أخرى.',
        )
        return false
      } finally {
        setBusy(false)
      }
    },
    [assigning, load, showToast],
  )

  return {
    status,
    active,
    drivers,
    toast,
    assigning,
    busy,
    refresh: () => void load(),
    openAssign: setAssigning,
    closeAssign: () => setAssigning(null),
    confirmAssign,
  }
}
