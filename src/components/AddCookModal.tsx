import { useEffect, useState } from 'react'
import { User, Store, Phone, Mail, MapPin, Lock } from 'lucide-react'
import { ApiError } from '../api/envelope'
import { fetchCityDirectory } from '../cities/citiesApi'
import QuickModalShell from './quickActions/QuickModalShell'
import Field from './quickActions/Field'
import SubmitBar from './quickActions/SubmitBar'
import { createCook } from './quickActions/api'
import { validateCook, mergeServerErrors, type CookValues, type Errors } from './quickActions/validate'

const EMPTY: CookValues = {
  first_name: '', last_name: '', email: '', phone: '', password: '', store_name: '', city_id: '', area: '',
}

/** Quick action: create a cook — `POST /admin/cooks`. */
export default function AddCookModal({ onClose, onCreated }: { onClose: () => void; onCreated?: () => void }) {
  const [v, setV] = useState<CookValues>(EMPTY)
  const [errors, setErrors] = useState<Errors>({})
  const [busy, setBusy] = useState(false)
  const [banner, setBanner] = useState<{ tone: 'ok' | 'err'; text: string } | null>(null)
  const [cities, setCities] = useState<{ id: number; name: string }[]>([])

  useEffect(() => {
    let live = true
    fetchCityDirectory()
      .then((dir) => { if (live) setCities([...dir.entries()].map(([id, x]) => ({ id, name: x.name_ar }))) })
      .catch(() => { if (live) setCities([]) })
    return () => { live = false }
  }, [])

  const set = (k: keyof CookValues) => (val: string) => {
    setV((s) => ({ ...s, [k]: val }))
    setErrors((e) => { const { [k]: _drop, ...rest } = e; return rest })
  }

  const submit = async () => {
    const e = validateCook(v)
    setErrors(e)
    if (Object.keys(e).length > 0) return
    setBusy(true)
    setBanner(null)
    try {
      await createCook({
        first_name: v.first_name.trim(),
        last_name: v.last_name.trim(),
        email: v.email.trim(),
        phone: v.phone.trim(),
        password: v.password,
        store_name: v.store_name.trim(),
        ...(v.city_id ? { city_id: Number(v.city_id) } : {}),
        ...(v.area.trim() ? { area: v.area.trim() } : {}),
      })
      setBanner({ tone: 'ok', text: 'تمت إضافة الطباخة بنجاح.' })
      onCreated?.()
      window.setTimeout(onClose, 900)
    } catch (err) {
      if (err instanceof ApiError && err.status === 422) {
        setErrors((cur) => mergeServerErrors(cur, err.fieldErrors))
        setBanner({ tone: 'err', text: err.message || 'تحقّق من الحقول المميّزة.' })
      } else {
        setBanner({ tone: 'err', text: 'تعذّر الحفظ. حاول مرة أخرى.' })
      }
    } finally {
      setBusy(false)
    }
  }

  return (
    <QuickModalShell title="إضافة طباخة جديدة" onClose={onClose}>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <Field label="الاسم الأول" value={v.first_name} onChange={set('first_name')} error={errors.first_name} icon={<User size={18} />} autoFocus />
        <Field label="اسم العائلة" value={v.last_name} onChange={set('last_name')} error={errors.last_name} icon={<User size={18} />} />
        <Field label="اسم المتجر" value={v.store_name} onChange={set('store_name')} error={errors.store_name} icon={<Store size={18} />} />
        <Field label="رقم الهاتف" value={v.phone} onChange={set('phone')} error={errors.phone} icon={<Phone size={18} />} placeholder="+201001234567" />
        <Field label="البريد الإلكتروني" type="email" name="new-cook-email" autoComplete="off" value={v.email} onChange={set('email')} error={errors.email} icon={<Mail size={18} />} />
        <Field label="كلمة المرور" type="password" name="new-cook-secret" autoComplete="new-password" value={v.password} onChange={set('password')} error={errors.password} icon={<Lock size={18} />} placeholder="8 أحرف على الأقل" />
        <div className="flex flex-col gap-1">
          <label htmlFor="ac-city" className="pr-1 text-[11px] font-bold text-gray-500">المدينة (اختياري)</label>
          <select
            id="ac-city"
            value={v.city_id}
            onChange={(e) => set('city_id')(e.target.value)}
            className="rounded-2xl border border-[#e8dfc9] bg-white py-3 px-4 text-sm outline-none focus:ring-2 focus:ring-[#7a0d0d]/20"
          >
            <option value="">—</option>
            {cities.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
        <Field label="المنطقة (اختياري)" value={v.area} onChange={set('area')} error={errors.area} icon={<MapPin size={18} />} />
      </div>

      <SubmitBar banner={banner} busy={busy} saveLabel="حفظ البيانات" onCancel={onClose} onSave={submit} />
    </QuickModalShell>
  )
}
