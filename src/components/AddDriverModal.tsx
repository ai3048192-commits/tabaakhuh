import { useEffect, useState } from 'react'
import { User, Phone, Mail, Lock, Calendar, Car, Palette, Hash } from 'lucide-react'
import { ApiError } from '../api/envelope'
import { fetchCityDirectory } from '../cities/citiesApi'
import QuickModalShell from './quickActions/QuickModalShell'
import Field from './quickActions/Field'
import ImageField from './quickActions/ImageField'
import SubmitBar from './quickActions/SubmitBar'
import { createDriver } from './quickActions/api'
import { validateUser, mergeServerErrors, type Errors } from './quickActions/validate'

type Values = { first_name: string; last_name: string; email: string; phone: string; password: string }
const EMPTY: Values = { first_name: '', last_name: '', email: '', phone: '', password: '' }

/** Extra driver-application fields (all optional at the client). */
interface Profile {
  city_id: string
  birth_date: string
  vehicle_type: string
  vehicle_model: string
  vehicle_year: string
  vehicle_color: string
  vehicle_plate_no: string
  vehicle_plate_letters: string
  national_id_front_url: string
  national_id_back_url: string
  license_url: string
}
const EMPTY_PROFILE: Profile = {
  city_id: '', birth_date: '', vehicle_type: '', vehicle_model: '', vehicle_year: '',
  vehicle_color: '', vehicle_plate_no: '', vehicle_plate_letters: '',
  national_id_front_url: '', national_id_back_url: '', license_url: '',
}

const VEHICLE_TYPES: { value: string; label: string }[] = [
  { value: 'motorcycle', label: 'دراجة نارية' },
  { value: 'car', label: 'سيارة' },
  { value: 'bicycle', label: 'دراجة هوائية' },
]

const num = (s: string): number | undefined => {
  const n = Number(s.trim())
  return s.trim() !== '' && Number.isFinite(n) ? n : undefined
}
const str = (s: string): string | undefined => (s.trim() !== '' ? s.trim() : undefined)

/**
 * Quick action: create a driver — `POST /admin/drivers`. Collects the account
 * plus the full application (vehicle profile + verification documents); on
 * success the parent routes to `/drivers`, where the review queue reloads and
 * the new pending entry appears.
 */
export default function AddDriverModal({
  onClose,
  onCreated,
}: {
  onClose: () => void
  onCreated?: () => void
}) {
  const [v, setV] = useState<Values>(EMPTY)
  const [p, setP] = useState<Profile>(EMPTY_PROFILE)
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

  const dropError = (k: string) =>
    setErrors((e) => {
      if (!(k in e)) return e
      const next = { ...e }
      delete next[k]
      return next
    })
  const set = (k: keyof Values) => (val: string) => {
    setV((s) => ({ ...s, [k]: val }))
    dropError(k)
  }
  const setProfile = (k: keyof Profile) => (val: string) => {
    setP((s) => ({ ...s, [k]: val }))
    dropError(k)
  }

  const submit = async () => {
    const e = validateUser({ ...v, role: 'driver' })
    setErrors(e)
    if (Object.keys(e).length > 0) return
    setBusy(true)
    setBanner(null)
    try {
      await createDriver({
        first_name: v.first_name.trim(),
        last_name: v.last_name.trim(),
        email: v.email.trim(),
        phone: v.phone.trim(),
        password: v.password,
        ...(p.city_id ? { city_id: Number(p.city_id) } : {}),
        ...(str(p.birth_date) ? { birth_date: str(p.birth_date) } : {}),
        ...(str(p.vehicle_type) ? { vehicle_type: str(p.vehicle_type) } : {}),
        ...(str(p.vehicle_model) ? { vehicle_model: str(p.vehicle_model) } : {}),
        ...(num(p.vehicle_year) != null ? { vehicle_year: num(p.vehicle_year) } : {}),
        ...(str(p.vehicle_color) ? { vehicle_color: str(p.vehicle_color) } : {}),
        ...(str(p.vehicle_plate_no) ? { vehicle_plate_no: str(p.vehicle_plate_no) } : {}),
        ...(str(p.vehicle_plate_letters) ? { vehicle_plate_letters: str(p.vehicle_plate_letters) } : {}),
        ...(str(p.national_id_front_url) ? { national_id_front_url: str(p.national_id_front_url) } : {}),
        ...(str(p.national_id_back_url) ? { national_id_back_url: str(p.national_id_back_url) } : {}),
        ...(str(p.license_url) ? { license_url: str(p.license_url) } : {}),
      })
      setBanner({ tone: 'ok', text: 'تم إنشاء الطلب — سيظهر في طابور مراجعة السائقين.' })
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
    <QuickModalShell title="إضافة سائق جديد" onClose={onClose}>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <Field label="الاسم الأول" value={v.first_name} onChange={set('first_name')} error={errors.first_name} icon={<User size={18} />} autoFocus />
        <Field label="اسم العائلة" value={v.last_name} onChange={set('last_name')} error={errors.last_name} icon={<User size={18} />} />
        <Field label="رقم الجوال" value={v.phone} onChange={set('phone')} error={errors.phone} icon={<Phone size={18} />} placeholder="+201001234567" />
        <Field label="البريد الإلكتروني" type="email" name="new-driver-email" autoComplete="off" value={v.email} onChange={set('email')} error={errors.email} icon={<Mail size={18} />} />
        <Field label="كلمة المرور" type="password" name="new-driver-secret" autoComplete="new-password" value={v.password} onChange={set('password')} error={errors.password} icon={<Lock size={18} />} placeholder="8 أحرف على الأقل" />
        <div className="flex flex-col gap-1">
          <label htmlFor="ad-city" className="pr-1 text-[11px] font-bold text-gray-500">المدينة (اختياري)</label>
          <select
            id="ad-city"
            value={p.city_id}
            onChange={(e) => setProfile('city_id')(e.target.value)}
            className="rounded-2xl border border-[#e8dfc9] bg-white py-3 px-4 text-sm outline-none focus:ring-2 focus:ring-[#7a0d0d]/20"
          >
            <option value="">—</option>
            {cities.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
      </div>

      <p className="mt-6 mb-3 text-[11px] font-black uppercase tracking-widest text-gray-400">بيانات المركبة والطلب (اختيارية)</p>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <Field label="تاريخ الميلاد" type="date" value={p.birth_date} onChange={setProfile('birth_date')} error={errors.birth_date} icon={<Calendar size={18} />} />
        <div className="flex flex-col gap-1">
          <label htmlFor="ad-vtype" className="pr-1 text-[11px] font-bold text-gray-500">نوع المركبة</label>
          <select
            id="ad-vtype"
            value={p.vehicle_type}
            onChange={(e) => setProfile('vehicle_type')(e.target.value)}
            className="rounded-2xl border border-[#e8dfc9] bg-white py-3 px-4 text-sm outline-none focus:ring-2 focus:ring-[#7a0d0d]/20"
          >
            <option value="">—</option>
            {VEHICLE_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
          </select>
        </div>
        <Field label="موديل المركبة" value={p.vehicle_model} onChange={setProfile('vehicle_model')} error={errors.vehicle_model} icon={<Car size={18} />} />
        <Field label="سنة الصنع" type="number" value={p.vehicle_year} onChange={setProfile('vehicle_year')} error={errors.vehicle_year} icon={<Calendar size={18} />} />
        <Field label="لون المركبة" value={p.vehicle_color} onChange={setProfile('vehicle_color')} error={errors.vehicle_color} icon={<Palette size={18} />} />
        <Field label="أرقام اللوحة" value={p.vehicle_plate_no} onChange={setProfile('vehicle_plate_no')} error={errors.vehicle_plate_no} icon={<Hash size={18} />} />
        <Field label="حروف اللوحة" value={p.vehicle_plate_letters} onChange={setProfile('vehicle_plate_letters')} error={errors.vehicle_plate_letters} icon={<Hash size={18} />} />
        <ImageField label="البطاقة — الوجه" value={p.national_id_front_url} onChange={setProfile('national_id_front_url')} />
        <ImageField label="البطاقة — الظهر" value={p.national_id_back_url} onChange={setProfile('national_id_back_url')} />
        <ImageField label="رخصة القيادة" value={p.license_url} onChange={setProfile('license_url')} />
      </div>

      <SubmitBar banner={banner} busy={busy} saveLabel="إنشاء حساب السائق" onCancel={onClose} onSave={submit} />
    </QuickModalShell>
  )
}
