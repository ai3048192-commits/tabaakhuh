import { useState } from 'react'
import { Eye, EyeOff, Loader2, Pencil, Plus, RefreshCw, Tags, Trash2, UtensilsCrossed } from 'lucide-react'
import PageHeader from '../shared/PageHeader'
import DialogShell from '../shared/DialogShell'
import FoodCategoryFormDialog from './FoodCategoryFormDialog'
import { useFoodCategories } from './useFoodCategories'
import type { FoodCategory } from './types'

/**
 * `/food-categories` — the categories customers browse dishes by
 * (specs/067-food-categories). The admin adds, edits, orders, hides and
 * deletes them; cooks file each dish under one from the app.
 */
export default function FoodCategoriesPage() {
  const c = useFoodCategories()
  const [editing, setEditing] = useState<FoodCategory | 'new' | null>(null)
  const [deleting, setDeleting] = useState<FoodCategory | null>(null)
  const [busyId, setBusyId] = useState<number | null>(null)
  const [toast, setToast] = useState<string | null>(null)

  const showToast = (msg: string) => {
    setToast(msg)
    window.setTimeout(() => setToast((t) => (t === msg ? null : t)), 5000)
  }

  const toggle = async (cat: FoodCategory) => {
    setBusyId(cat.id)
    const failure = await c.setActive(cat, !cat.is_active)
    setBusyId(null)
    showToast(failure ?? (cat.is_active ? 'التصنيف اتخفى من التطبيق.' : 'التصنيف ظاهر في التطبيق.'))
  }

  return (
    <div className="min-h-full bg-[#f7f1e6] p-4 font-['Tajawal'] md:p-8" dir="rtl">
      <PageHeader
        title="تصنيفات الأكل"
        subtitle="العميل بيتصفّح الأكلات بالتصنيفات دي، والطباخة بتختار تصنيف لكل أكلة"
        actions={
          <button
            type="button"
            onClick={() => setEditing('new')}
            className="inline-flex items-center gap-1.5 rounded-xl bg-white px-4 py-2.5 text-sm font-black text-[#7a0d0d] shadow transition hover:bg-[#fff5e1]"
          >
            <Plus size={16} aria-hidden="true" /> إضافة تصنيف
          </button>
        }
      />

      {c.status === 'loading' && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3" aria-hidden="true">
          {[0, 1, 2, 3, 4, 5].map((i) => <div key={i} className="h-28 animate-pulse rounded-3xl bg-white/70" />)}
        </div>
      )}

      {c.status === 'error' && (
        <div className="max-w-md rounded-3xl border border-red-100 bg-red-50 p-6 text-center">
          <p className="mb-3 text-sm text-red-700">تعذّر تحميل التصنيفات.</p>
          <button type="button" onClick={c.reload} className="inline-flex items-center gap-2 rounded-xl bg-[#7a0d0d] px-4 py-2 text-sm font-black text-white">
            <RefreshCw size={14} aria-hidden="true" /> إعادة المحاولة
          </button>
        </div>
      )}

      {c.status === 'ready' && c.items.length === 0 && (
        <div className="rounded-3xl bg-white p-10 text-center shadow-sm ring-1 ring-[#efe3cc]">
          <Tags size={32} className="mx-auto mb-3 text-[#b68614]" aria-hidden="true" />
          <p className="text-sm text-gray-500">مفيش تصنيفات لسه. ابدأ بإضافة أول تصنيف.</p>
        </div>
      )}

      {c.status === 'ready' && c.items.length > 0 && (
        <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {c.items.map((cat) => (
            <li
              key={cat.id}
              className={`flex items-center gap-4 rounded-3xl bg-white p-4 shadow-sm ring-1 transition ${
                cat.is_active ? 'ring-[#efe3cc]' : 'opacity-70 ring-gray-200'
              }`}
            >
              {cat.image_url ? (
                <img src={cat.image_url} alt="" className="h-20 w-20 shrink-0 rounded-2xl object-cover" />
              ) : (
                <span className="grid h-20 w-20 shrink-0 place-items-center rounded-2xl bg-[#faf3e7] text-[#b68614]">
                  <UtensilsCrossed size={28} aria-hidden="true" />
                </span>
              )}
              <div className="min-w-0 flex-1">
                <p className="truncate text-base font-black text-[#3a2a1a]">{cat.name_ar}</p>
                <p className="truncate text-xs text-gray-500" dir="ltr">{cat.name_en}</p>
                <p className="mt-1.5 flex flex-wrap items-center gap-1.5 text-[11px] font-bold">
                  <span className="rounded-full bg-[#faf3e7] px-2 py-0.5 text-[#6b4f3a]">{cat.dishes_count} أكلة</span>
                  <span className="rounded-full bg-gray-100 px-2 py-0.5 text-gray-500">ترتيب {cat.sort_order}</span>
                  {!cat.is_active && <span className="rounded-full bg-gray-200 px-2 py-0.5 text-gray-600">مخفي</span>}
                </p>
              </div>
              <div className="flex shrink-0 flex-col gap-1.5">
                <button
                  type="button"
                  onClick={() => toggle(cat)}
                  disabled={busyId === cat.id}
                  aria-label={cat.is_active ? `إخفاء ${cat.name_ar}` : `إظهار ${cat.name_ar}`}
                  title={cat.is_active ? 'إخفاء من التطبيق' : 'إظهار في التطبيق'}
                  className={`grid h-9 w-9 place-items-center rounded-xl transition ${
                    cat.is_active ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                  }`}
                >
                  {busyId === cat.id ? <Loader2 size={15} className="animate-spin" aria-hidden="true" /> : cat.is_active ? <Eye size={15} aria-hidden="true" /> : <EyeOff size={15} aria-hidden="true" />}
                </button>
                <button
                  type="button"
                  onClick={() => setEditing(cat)}
                  aria-label={`تعديل ${cat.name_ar}`}
                  title="تعديل"
                  className="grid h-9 w-9 place-items-center rounded-xl bg-[#faf3e7] text-[#7a0d0d] transition hover:bg-[#f3e6cc]"
                >
                  <Pencil size={15} aria-hidden="true" />
                </button>
                <button
                  type="button"
                  onClick={() => setDeleting(cat)}
                  aria-label={`مسح ${cat.name_ar}`}
                  title="مسح"
                  className="grid h-9 w-9 place-items-center rounded-xl bg-red-50 text-red-600 transition hover:bg-red-100"
                >
                  <Trash2 size={15} aria-hidden="true" />
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      {editing !== null && (
        <FoodCategoryFormDialog
          category={editing === 'new' ? null : editing}
          onSave={async (input) => {
            const failure = await c.save(editing === 'new' ? null : editing.id, input)
            if (!failure) showToast(editing === 'new' ? 'التصنيف اتضاف.' : 'التصنيف اتعدّل.')
            return failure
          }}
          onClose={() => setEditing(null)}
        />
      )}

      {deleting && (
        <DeleteDialog
          category={deleting}
          onConfirm={async () => {
            const failure = await c.remove(deleting)
            showToast(failure ?? 'التصنيف اتمسح.')
            setDeleting(null)
          }}
          onClose={() => setDeleting(null)}
        />
      )}

      <div aria-live="polite" role="status" className="sr-only">{toast}</div>
      {toast && (
        <div className="fixed bottom-6 left-1/2 z-[80] -translate-x-1/2 rounded-xl bg-gray-900 px-4 py-2.5 text-sm text-white shadow-lg">
          {toast}
        </div>
      )}
    </div>
  )
}

function DeleteDialog({
  category,
  onConfirm,
  onClose,
}: {
  category: FoodCategory
  onConfirm: () => Promise<void>
  onClose: () => void
}) {
  const [busy, setBusy] = useState(false)
  return (
    <DialogShell label="مسح التصنيف" onDismiss={onClose}>
      <div className="space-y-4 font-['Tajawal']" dir="rtl">
        <h2 className="text-lg font-black text-[#7a0d0d]">مسح «{category.name_ar}»؟</h2>
        <p className="text-sm text-gray-600">
          {category.dishes_count > 0
            ? `${category.dishes_count} أكلة هترجع من غير تصنيف، والطباخات هيتطلب منهم يختاروا تصنيف تاني. لو عايز تشيله من التطبيق مؤقتًا، اخفيه بدل ما تمسحه.`
            : 'مفيش أكلات في التصنيف ده.'}
        </p>
        <div className="flex justify-end gap-2">
          <button type="button" onClick={onClose} className="rounded-xl px-4 py-2.5 text-sm font-bold text-gray-600 hover:bg-gray-100">
            إلغاء
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={async () => { setBusy(true); await onConfirm() }}
            className="inline-flex items-center gap-1.5 rounded-xl bg-red-600 px-5 py-2.5 text-sm font-black text-white transition hover:bg-red-700 disabled:opacity-50"
          >
            {busy ? <Loader2 size={15} className="animate-spin" aria-hidden="true" /> : <Trash2 size={15} aria-hidden="true" />}
            مسح
          </button>
        </div>
      </div>
    </DialogShell>
  )
}
