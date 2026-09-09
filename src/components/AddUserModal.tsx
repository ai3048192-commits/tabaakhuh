import { useState } from 'react'
import { User, Phone, Mail, Lock } from 'lucide-react'
import { ApiError } from '../api/envelope'
import QuickModalShell from './quickActions/QuickModalShell'
import Field from './quickActions/Field'
import SubmitBar from './quickActions/SubmitBar'
import { createUser, type UserRole } from './quickActions/api'
import { validateUser, mergeServerErrors, type UserValues, type Errors } from './quickActions/validate'

const EMPTY: UserValues = { first_name: '', last_name: '', email: '', phone: '', password: '', role: 'customer' }

const ROLES: { value: UserRole; label: string }[] = [
  { value: 'customer', label: 'عميل' },
  { value: 'cook', label: 'طاهٍ' },
  { value: 'driver', label: 'سائق' },
  { value: 'admin', label: 'أدمن' },
]

/** Quick action: create a user — `POST /admin/users`. */
export default function AddUserModal({ onClose, onCreated }: { onClose: () => void; onCreated?: () => void }) {
  const [v, setV] = useState<UserValues>(EMPTY)
  const [errors, setErrors] = useState<Errors>({})
  const [busy, setBusy] = useState(false)
  const [banner, setBanner] = useState<{ tone: 'ok' | 'err'; text: string } | null>(null)

  const set = (k: keyof UserValues) => (val: string) => {
    setV((s) => ({ ...s, [k]: val }))
    setErrors((e) => { const { [k]: _drop, ...rest } = e; return rest })
  }

  const submit = async () => {
    const e = validateUser(v)
    setErrors(e)
    if (Object.keys(e).length > 0) return
    setBusy(true)
    setBanner(null)
    try {
      await createUser({
        first_name: v.first_name.trim(),
        last_name: v.last_name.trim(),
        email: v.email.trim(),
        phone: v.phone.trim(),
        password: v.password,
        role: v.role as UserRole,
      })
      setBanner({ tone: 'ok', text: 'تم إنشاء الحساب بنجاح.' })
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
    <QuickModalShell title="إضافة مستخدم جديد" onClose={onClose}>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <Field label="الاسم الأول" value={v.first_name} onChange={set('first_name')} error={errors.first_name} icon={<User size={18} />} autoFocus />
        <Field label="اسم العائلة" value={v.last_name} onChange={set('last_name')} error={errors.last_name} icon={<User size={18} />} />
        <Field label="رقم الجوال" value={v.phone} onChange={set('phone')} error={errors.phone} icon={<Phone size={18} />} placeholder="+201001234567" />
        <Field label="البريد الإلكتروني" type="email" name="new-user-email" autoComplete="off" value={v.email} onChange={set('email')} error={errors.email} icon={<Mail size={18} />} />
        <Field label="كلمة المرور" type="password" name="new-user-secret" autoComplete="new-password" value={v.password} onChange={set('password')} error={errors.password} icon={<Lock size={18} />} placeholder="8 أحرف على الأقل" />
        <div className="flex flex-col gap-1">
          <label htmlFor="au-role" className="pr-1 text-[11px] font-bold text-gray-500">الدور</label>
          <select
            id="au-role"
            value={v.role}
            onChange={(e) => set('role')(e.target.value)}
            aria-invalid={errors.role ? true : undefined}
            className={`rounded-2xl border bg-white py-3 px-4 text-sm outline-none ${errors.role ? 'border-red-300' : 'border-[#e8dfc9] focus:ring-2 focus:ring-[#7a0d0d]/20'}`}
          >
            {ROLES.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
          </select>
          {errors.role && <p className="pr-1 text-xs text-red-600">{errors.role}</p>}
        </div>
      </div>

      <SubmitBar banner={banner} busy={busy} saveLabel="إنشاء الحساب" onCancel={onClose} onSave={submit} />
    </QuickModalShell>
  )
}
