import { useState } from 'react'
import { User, Phone, Mail, Lock } from 'lucide-react'
import { ApiError } from '../api/envelope'
import QuickModalShell from './quickActions/QuickModalShell'
import Field from './quickActions/Field'
import SubmitBar from './quickActions/SubmitBar'
import { createUser } from './quickActions/api'
import { validateUser, mergeServerErrors, type Errors } from './quickActions/validate'

type Values = { first_name: string; last_name: string; email: string; phone: string; password: string }
const EMPTY: Values = { first_name: '', last_name: '', email: '', phone: '', password: '' }

/**
 * Quick action: create a driver account — `POST /admin/users` with a fixed
 * `role: 'driver'` (there is no dedicated `POST /admin/drivers`). The driver
 * completes their vehicle profile from the driver app; the admin just seeds the
 * account here.
 */
export default function AddDriverModal({
  onClose,
  onCreated,
}: {
  onClose: () => void
  onCreated?: () => void
}) {
  const [v, setV] = useState<Values>(EMPTY)
  const [errors, setErrors] = useState<Errors>({})
  const [busy, setBusy] = useState(false)
  const [banner, setBanner] = useState<{ tone: 'ok' | 'err'; text: string } | null>(null)

  const set = (k: keyof Values) => (val: string) => {
    setV((s) => ({ ...s, [k]: val }))
    setErrors((e) => {
      const { [k]: _drop, ...rest } = e
      return rest
    })
  }

  const submit = async () => {
    const e = validateUser({ ...v, role: 'driver' })
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
        role: 'driver',
      })
      setBanner({ tone: 'ok', text: 'تم إنشاء حساب السائق بنجاح.' })
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
      </div>

      <SubmitBar banner={banner} busy={busy} saveLabel="إنشاء حساب السائق" onCancel={onClose} onSave={submit} />
    </QuickModalShell>
  )
}
