import { useCallback, useEffect, useState } from 'react'
import { getOrder } from './ordersApi'
import type { Order } from './types'

/**
 * The list's copy of an order shows at once; the full record (people,
 * address, timeline, quote) is fetched from `GET /admin/orders/{id}` and
 * merged over it. A failed fetch keeps the list copy and offers a retry.
 */
export function useOrderDetail(snapshot: Order) {
  const [full, setFull] = useState<Order | null>(null)
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading')

  const load = useCallback(
    async (signal?: AbortSignal) => {
      setStatus('loading')
      try {
        setFull(await getOrder(snapshot.id, signal))
        setStatus('ready')
      } catch (err) {
        if ((err as Error | undefined)?.name === 'AbortError') return
        setStatus('error')
      }
    },
    [snapshot.id],
  )

  useEffect(() => {
    const ctrl = new AbortController()
    void load(ctrl.signal)
    return () => ctrl.abort()
  }, [load])

  return { order: full ?? snapshot, status, retry: () => void load() }
}
