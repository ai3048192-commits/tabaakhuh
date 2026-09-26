import { useEffect, useRef } from 'react'
import DialogShell from '../shared/DialogShell'
import { cityMessages as M } from './messages'
import type { City } from './types'

interface Props {
  city: City
  nextActive: boolean
  busy: boolean
  formError?: string
  onConfirm: () => void
  onCancel: () => void
}

/** Explicit confirmation before a city's active/inactive state is changed (FR-027). */
export default function StatusToggleDialog({
  city,
  nextActive,
  busy,
  formError,
  onConfirm,
  onCancel,
}: Props) {
  const confirmRef = useRef<HTMLButtonElement>(null)
  useEffect(() => {
    confirmRef.current?.focus()
  }, [])

  const title = nextActive
    ? M.toggleToActiveTitle(city.name_ar)
    : M.toggleToInactiveTitle(city.name_ar)
  const body = nextActive ? M.toggleToActiveBody : M.toggleToInactiveBody

  return (
    <DialogShell label={title} onDismiss={onCancel}>
      <h2 className="mb-2 text-base font-black text-gray-800">{title}</h2>
      <p className="mb-6 text-sm text-gray-600">{body}</p>
      {formError && <p className="mb-3 text-xs text-red-600">{formError}</p>}
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
          ref={confirmRef}
          type="button"
          onClick={onConfirm}
          disabled={busy}
          aria-busy={busy}
          className="flex-1 rounded-xl bg-[#7a0d0d] py-2.5 text-sm font-black text-white disabled:opacity-50"
        >
          {M.confirmToggle}
        </button>
      </div>
    </DialogShell>
  )
}
