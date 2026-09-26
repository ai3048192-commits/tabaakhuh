/**
 * Neutral full-screen loading state shown while startup session validity is
 * still unknown (FR-017, SC-008). Deliberately carries no authenticated-area
 * chrome and no sign-in form.
 */
export default function FullScreenLoader() {
  return (
    <div
      dir="rtl"
      role="status"
      aria-live="polite"
      className="flex min-h-screen items-center justify-center bg-papyrus"
    >
      <div className="flex flex-col items-center gap-4">
        <div
          className="h-10 w-10 animate-spin rounded-full border-4 border-line border-t-brand"
          aria-hidden="true"
        />
        <p className="text-sm font-bold text-gray-500">جارٍ التحميل…</p>
      </div>
    </div>
  )
}
