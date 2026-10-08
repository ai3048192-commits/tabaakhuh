import { useId, useState } from 'react'
import { Loader2, Save } from 'lucide-react'
import DialogShell from '../shared/DialogShell'
import ImageUploadField from '../settings/ImageUploadField'
import type { FoodCategory, FoodCategoryInput } from './types'
import type { MutationResult } from './useFoodCategories'

const fieldCls =
  'w-full rounded-xl border border-[#e8dcc4] bg-white px-3.5 py-2.5 text-sm text-gray-800 shadow-sm outline-none transition placeholder:text-gray-300 focus:border-[#7a0d0d] focus:ring-4 focus:ring-[#7a0d0d]/10'

/** Add (`category` null) or edit a food category: names, picture, order. */
export default function FoodCategoryFormDialog({
  category,
  onSave,
  onClose,
}: {
  category: FoodCategory | null
  onSave: (input: FoodCategoryInput) => Promise<MutationResult>
  onClose: () => void
}) {
  const [nameAr, setNameAr] = useState(category?.name_ar ?? '')
  const [nameEn, setNameEn] = useState(category?.name_en ?? '')
  const [imageUrl, setImageUrl] = useState(category?.image_url ?? '')
  const [order, setOrder] = useState(category ? String(category.sort_order) : '')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const arId = useId()
  const enId = useId()
  const orderId = useId()

  const orderValid = order.trim() === '' || /^\d{1,6}$/.test(order.trim())
  const canSave = nameAr.trim() !== '' && nameEn.trim() !== '' && orderValid && !saving

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!canSave) return
    setSaving(true)
    setError(null)
    const input: FoodCategoryInput = {
      name_ar: nameAr.trim(),
      name_en: nameEn.trim(),
      image_url: imageUrl.trim() === '' ? null : imageUrl.trim(),
      ...(order.trim() !== '' ? { sort_order: Number(order.trim()) } : {}),
    }
    const failure = await onSave(input)
    setSaving(false)
    if (failure) setError(failure)
    else onClose()
  }

  return (
    <DialogShell label={category ? 'تعديل التصنيف' : 'إضافة تصنيف'} onDismiss={onClose} size="md">
      <form onSubmit={submit} className="space-y-4 font-['Tajawal']" dir="rtl">
        <h2 className="text-lg font-black text-[#7a0d0d]">{category ? 'تعديل التصنيف' : 'إضافة تصنيف'}</h2>

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="flex flex-col gap-1">
            <label htmlFor={arId} className="pr-1 text-xs font-black text-[#6b4f3a]">الاسم بالعربي</label>
            <input id={arId} value={nameAr} onChange={(e) => setNameAr(e.target.value)} placeholder="محاشي" maxLength={100} className={fieldCls} />
          </div>
          <div className="flex flex-col gap-1">
            <label htmlFor={enId} className="pr-1 text-xs font-black text-[#6b4f3a]">الاسم بالإنجليزي</label>
            <input id={enId} dir="ltr" value={nameEn} onChange={(e) => setNameEn(e.target.value)} placeholder="Mahshi" maxLength={100} className={fieldCls} />
          </div>
        </div>

        <ImageUploadField
          label="صورة التصنيف"
          field="image_url"
          value={imageUrl}
          onChange={(_, raw) => setImageUrl(raw)}
        />

        <div className="flex flex-col gap-1">
          <label htmlFor={orderId} className="pr-1 text-xs font-black text-[#6b4f3a]">الترتيب (الأصغر يظهر الأول)</label>
          <input
            id={orderId}
            dir="ltr"
            inputMode="numeric"
            value={order}
            onChange={(e) => setOrder(e.target.value)}
            placeholder="آخر القايمة"
            aria-invalid={!orderValid || undefined}
            className={`${fieldCls} sm:w-40`}
          />
        </div>

        <p aria-live="polite" className="min-h-[1rem] text-xs font-bold text-red-600">{error ?? ''}</p>

        <div className="flex justify-end gap-2">
          <button type="button" onClick={onClose} className="rounded-xl px-4 py-2.5 text-sm font-bold text-gray-600 hover:bg-gray-100">
            إلغاء
          </button>
          <button
            type="submit"
            disabled={!canSave}
            aria-busy={saving}
            className="inline-flex items-center gap-1.5 rounded-xl bg-[#7a0d0d] px-5 py-2.5 text-sm font-black text-white shadow-md shadow-[#7a0d0d]/20 transition hover:bg-[#5a0909] disabled:opacity-50"
          >
            {saving ? <Loader2 size={15} className="animate-spin" aria-hidden="true" /> : <Save size={15} aria-hidden="true" />}
            {saving ? 'جارٍ الحفظ…' : 'حفظ'}
          </button>
        </div>
      </form>
    </DialogShell>
  )
}
