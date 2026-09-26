/** Shared status banner + Cancel / Save bar for the quick-action forms. */
export default function SubmitBar({
  banner,
  busy,
  saveLabel,
  onCancel,
  onSave,
}: {
  banner: { tone: 'ok' | 'err'; text: string } | null
  busy: boolean
  saveLabel: string
  onCancel: () => void
  onSave: () => void
}) {
  return (
    <>
      <div aria-live="polite" role="status" className="sr-only">
        {banner?.text ?? ''}
      </div>
      {banner && (
        <div
          className={`mt-6 rounded-2xl border px-4 py-3 text-sm font-bold ${
            banner.tone === 'ok'
              ? 'border-emerald-300 bg-emerald-50 text-emerald-800'
              : 'border-red-300 bg-red-50 text-red-700'
          }`}
        >
          {banner.text}
        </div>
      )}
      <div className="mt-8 flex gap-4">
        <button
          type="button"
          onClick={onCancel}
          disabled={busy}
          className="flex-1 rounded-2xl border border-[#e8dfc9] py-4 font-bold text-gray-600 transition hover:bg-gray-50 disabled:opacity-50"
        >
          إلغاء
        </button>
        <button
          type="button"
          onClick={onSave}
          disabled={busy}
          aria-busy={busy}
          className="flex-1 rounded-2xl bg-[#7a0d0d] py-4 font-black text-white shadow-lg shadow-[#7a0d0d]/30 transition hover:bg-[#9a1212] disabled:opacity-50"
        >
          {busy ? 'جارٍ الحفظ…' : saveLabel}
        </button>
      </div>
    </>
  )
}
