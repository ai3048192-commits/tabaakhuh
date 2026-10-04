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
      <h2 className="mb-4 text-lg font-black text-[#7a0d0d]">
        {M.assignTitle(delivery.order_number)}
      </h2>
      <label htmlFor="assign-driver" className="mb-1.5 block text-xs font-black text-[#6b4f3a]">
        {M.pickDriver}
      </label>
      <select
        ref={selectRef}
        id="assign-driver"
        className="mb-5 w-full rounded-xl border border-[#e8dcc4] bg-white px-3.5 py-2.5 text-sm shadow-sm outline-none focus:border-[#7a0d0d] focus:ring-4 focus:ring-[#7a0d0d]/10"
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
          className="flex-1 rounded-xl border border-[#e8dcc4] py-2.5 text-sm font-bold text-gray-600 transition hover:bg-[#faf3e7] disabled:opacity-50"
        >
          {M.cancel}
        </button>
        <button
          type="button"
          onClick={() => driverId !== '' && onConfirm(driverId)}
          disabled={busy || driverId === ''}
          aria-busy={busy}
          className="flex-1 rounded-xl bg-[#7a0d0d] py-2.5 text-sm font-black text-white shadow-md transition hover:bg-[#5a0909] disabled:opacity-50"
        >
          {M.confirm}
        </button>
      </div>
    </DialogShell>
  )
}
