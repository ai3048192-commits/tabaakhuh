/** Order status → pill colours, grouped by where the order is in its lifecycle. */
export function statusTone(s: string): string {
  if (s === 'delivered' || s === 'completed') return 'bg-emerald-50 text-emerald-700 ring-emerald-200'
  if (s === 'cancelled') return 'bg-red-50 text-red-700 ring-red-200'
  if (s === 'on_the_way' || s === 'picked_up' || s === 'assigned_to_driver') return 'bg-sky-50 text-sky-700 ring-sky-200'
  if (s === 'ready_for_pickup') return 'bg-violet-50 text-violet-700 ring-violet-200'
  return 'bg-amber-50 text-amber-800 ring-amber-200'
}

/** The pill shape every status / type chip shares. */
export const pillCls = 'inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-1 text-[11px] font-black ring-1'
