import { useEffect, useRef, useState } from 'react'
import DialogShell from '../shared/DialogShell'
import { deliveryMessages as M } from './messages'
import type { ActiveDelivery, DeliveryDriver } from './types'

export default function AssignDriverDialog({
  delivery,
  drivers,
  busy,
  onConfirm,
  onCancel,
}: {
  delivery: ActiveDelivery
  drivers: DeliveryDriver[]
  busy: boolean
  onConfirm: (driverId: number) => void
  onCancel: () => void
}) {
  const selectRef = useRef<HTMLSelectElement>(null)
  const [driverId, setDriverId] = useState<number | ''>('')
  useEffect(() => {
    selectRef.current?.focus()
  }, [])

  return (
    <DialogShell label={M.assignTitle(delivery.order_number)} onDismiss={onCancel}>
      <h2 className="mb-3 text-base font-black text-gray-800">
        {M.assignTitle(delivery.order_number)}
      </h2>
      <label htmlFor="assign-driver" className="mb-1 block text-xs font-bold text-gray-500">
        {M.pickDriver}
      </label>
      <select
        ref={selectRef}
        id="assign-driver"
        className="mb-5 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm"
        value={driverId}
        onChange={(e) => setDriverId(Number(e.target.value) || '')}
      >
        <option value="">—</option>
        {drivers.map((d) => {
          const free = d.is_available && !d.is_busy
          return (
            <option key={d.id} value={d.id} disabled={!free}>
              {(d.name ?? '—') + ' — ' + (free ? M.available : M.busy)}
            </option>
          )
        })}
      </select>
      <div className="flex gap-3">
        <button
          type="button"
          onClick={onCancel}
          disabled={busy}
          className="flex-1 rounded-xl border border-gray-200 py-2.5 text-sm font-bold text-gray-600 disabled:opacity-50"
        >
          {M.cancel}
        </button>
        <button
          type="button"
          onClick={() => driverId !== '' && onConfirm(driverId)}
          disabled={busy || driverId === ''}
          aria-busy={busy}
          className="flex-1 rounded-xl bg-[#7a0d0d] py-2.5 text-sm font-black text-white disabled:opacity-50"
        >
          {M.confirm}
        </button>
      </div>
    </DialogShell>
  )
}
