/**
 * The admin dashboard's shared look — every screen builds from these so the
 * pages stay consistent (the style the Delivery screen introduced).
 */

/** The page canvas under the shell's header. */
export const pageCls = "min-h-full bg-[#f7f1e6] p-4 font-['Tajawal'] md:p-8"

/** A white content card. */
export const cardCls =
  'rounded-3xl bg-white shadow-[0_18px_40px_-30px_rgba(122,13,13,0.45)] ring-1 ring-[#efe3cc]'

/** Text inputs, selects, dates. */
export const fieldCls =
  'rounded-xl border border-[#e8dcc4] bg-white px-3.5 py-2.5 text-sm text-gray-800 shadow-sm outline-none transition placeholder:text-gray-300 focus:border-[#7a0d0d] focus:ring-4 focus:ring-[#7a0d0d]/10 disabled:opacity-50'

export const labelCls = 'text-xs font-black text-[#6b4f3a]'

export const btnPrimary =
  'inline-flex items-center justify-center gap-1.5 rounded-xl bg-[#7a0d0d] px-4 py-2.5 text-sm font-black text-white shadow-sm transition hover:bg-[#5a0909] disabled:opacity-50'

export const btnSecondary =
  'inline-flex items-center justify-center gap-1.5 rounded-xl border border-[#e8dcc4] bg-white px-4 py-2.5 text-sm font-bold text-gray-700 transition hover:bg-[#faf3e7] disabled:opacity-40'

/** Small row action (e.g. "عرض التفاصيل"). */
export const btnRow =
  'inline-flex items-center gap-1.5 whitespace-nowrap rounded-xl border border-[#e8dcc4] bg-white px-3 py-2 text-xs font-black text-[#7a0d0d] transition hover:bg-[#faf3e7] disabled:opacity-50'

/** Buttons that sit on the dark page banner. */
export const bannerBtnLight =
  'inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-xs font-black text-[#7a0d0d] shadow-lg transition hover:bg-[#fff7e6] disabled:opacity-60'
export const bannerBtnGold =
  'inline-flex items-center gap-2 rounded-xl bg-[#e0a52e] px-4 py-2.5 text-xs font-black text-[#1c0204] shadow-lg transition hover:brightness-110 disabled:opacity-60'

/** Tables: header cell, body cell, body row. */
export const thCls = 'px-4 py-3 text-right text-xs font-bold text-gray-400'
export const tdCls = 'px-4 py-3.5 text-right align-middle text-sm text-gray-700'
export const trCls = 'border-t border-[#f3ead9] transition hover:bg-[#fffaf1]'

/** A centered empty / info state inside a card. */
export const emptyCls = `${cardCls} p-10 text-center text-sm font-bold text-gray-400`

export const errorBoxCls = 'max-w-md rounded-3xl border border-red-100 bg-red-50 p-6 text-center'
