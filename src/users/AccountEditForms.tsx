import { useId, useState } from 'react'
import { Loader2, Upload } from 'lucide-react'
import { ApiError } from '../api/envelope'
import { updateUserContact, uploadCookVerification } from './usersApi'

const inputCls =
  'w-full rounded-xl border border-[#e8dcc4] bg-white px-3 py-2 text-sm text-gray-800 shadow-sm outline-none transition focus:border-[#7a0d0d] focus:ring-4 focus:ring-[#7a0d0d]/10'
const labelCls = 'mb-1 block text-[11px] font-black text-[#6b4f3a]'
const primaryBtn =
  'inline-flex items-center justify-center gap-1.5 rounded-xl bg-[#7a0d0d] px-4 py-2 text-xs font-black text-white transition hover:bg-[#5e0a0a] disabled:opacity-50'
const ghostBtn =
  'rounded-xl border border-[#e8dcc4] px-4 py-2 text-xs font-bold text-gray-600 transition hover:bg-[#faf3e7] disabled:opacity-50'

/** A readable Arabic line for a failed save. */
function errorText(err: unknown): string {
  if (err instanceof ApiError) {
    const msg = err.message.toLowerCase()
    if (msg.includes('already exists') && msg.includes('email')) return 'الإيميل ده مستخدم في حساب تاني.'
    if (msg.includes('already exists') && msg.includes('phone')) return 'رقم التليفون ده مستخدم في حساب تاني.'
    if (err.fieldErrors) {
      const keys = Object.keys(err.fieldErrors)
      if (keys.includes('email')) return 'الإيميل مش صحيح.'
      if (keys.includes('phone')) return 'رقم التليفون مش صحيح — اكتبه كده: 01xxxxxxxxx أو ‎+201xxxxxxxxx'
      if (keys.includes('national_id')) return 'الرقم القومي مش صحيح.'
      if (keys.includes('full_name')) return 'اكتب الاسم الرباعي زي ما هو في البطاقة.'
      if (keys.some((k) => k.startsWith('id_'))) return 'صور البطاقة لازم تكون صور (JPG / PNG) وأقل من 8 ميجا.'
      const first = Object.values(err.fieldErrors)[0]?.[0]
      if (first) return first
    }
    if (err.status === 404) return 'الحساب مش موجود.'
    if (err.status === 0) return 'مفيش اتصال بالسيرفر — حاول تاني.'
    if (err.status === 422 && err.message) return err.message
  }
  return 'تعذّر الحفظ — حاول تاني.'
}

/** Change an account's phone number and / or email. */
export function ContactEditForm({
  userId,
  phone,
  email,
  onSaved,
  onCancel,
}: {
  userId: number
  phone: string
  email: string
  onSaved: () => void
  onCancel: () => void
}) {
  const uid = useId()
  const [newPhone, setNewPhone] = useState(phone ?? '')
  const [newEmail, setNewEmail] = useState(email ?? '')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const phoneChanged = newPhone.trim() !== '' && newPhone.trim() !== (phone ?? '')
  const emailChanged = newEmail.trim() !== '' && newEmail.trim().toLowerCase() !== (email ?? '').toLowerCase()

  const save = async () => {
    if (!phoneChanged && !emailChanged) return onCancel()
    setBusy(true)
    setError(null)
    try {
      await updateUserContact(userId, {
        ...(phoneChanged ? { phone: newPhone.trim() } : {}),
        ...(emailChanged ? { email: newEmail.trim() } : {}),
      })
      onSaved()
    } catch (err) {
      setError(errorText(err))
      setBusy(false)
    }
  }

  return (
    <form
      className="space-y-3"
      onSubmit={(e) => {
        e.preventDefault()
        void save()
      }}
    >
      <div>
        <label htmlFor={`${uid}-phone`} className={labelCls}>رقم التليفون</label>
        <input id={`${uid}-phone`} dir="ltr" inputMode="tel" value={newPhone} onChange={(e) => setNewPhone(e.target.value)} placeholder="+201xxxxxxxxx" className={inputCls} />
      </div>
      <div>
        <label htmlFor={`${uid}-email`} className={labelCls}>الإيميل</label>
        <input id={`${uid}-email`} dir="ltr" type="email" value={newEmail} onChange={(e) => setNewEmail(e.target.value)} className={inputCls} />
      </div>
      {error && <p className="text-xs font-bold text-red-600">{error}</p>}
      <div className="flex gap-2">
        <button type="submit" disabled={busy || (!phoneChanged && !emailChanged)} className={primaryBtn}>
          {busy && <Loader2 size={13} className="animate-spin" aria-hidden="true" />}
          حفظ التعديل
        </button>
        <button type="button" onClick={onCancel} disabled={busy} className={ghostBtn}>إلغاء</button>
      </div>
    </form>
  )
}

/**
 * Upload a cook's identity verification on her behalf (e.g. she sent the card
 * photos on WhatsApp): full name as on the card, national id, both sides.
 */
export function VerificationUploadForm({
  userId,
  defaultName,
  onSaved,
  onCancel,
}: {
  userId: number
  defaultName: string
  onSaved: () => void
  onCancel: () => void
}) {
  const uid = useId()
  const [fullName, setFullName] = useState(defaultName)
  const [nationalId, setNationalId] = useState('')
  const [front, setFront] = useState<File | null>(null)
  const [back, setBack] = useState<File | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const nationalIdOk = /^\d{14}$/.test(nationalId.trim())
  const ready = fullName.trim().split(/\s+/).length >= 3 && nationalIdOk && front && back

  const save = async () => {
    if (!ready || !front || !back) return
    setBusy(true)
    setError(null)
    try {
      await uploadCookVerification(userId, { fullName: fullName.trim(), nationalId: nationalId.trim(), idFront: front, idBack: back })
      onSaved()
    } catch (err) {
      setError(errorText(err))
      setBusy(false)
    }
  }

  const fileInput = (id: string, label: string, file: File | null, set: (f: File | null) => void) => (
    <div>
      <label htmlFor={id} className={labelCls}>{label}</label>
      <label
        htmlFor={id}
        className="flex cursor-pointer items-center gap-2 rounded-xl border border-dashed border-[#d9c7a4] bg-white px-3 py-2.5 text-xs font-bold text-gray-600 transition hover:bg-[#faf3e7]"
      >
        <Upload size={14} className="shrink-0 text-[#b68614]" aria-hidden="true" />
        <span className="truncate">{file ? file.name : 'اختار صورة'}</span>
      </label>
      <input id={id} type="file" accept="image/*" className="sr-only" onChange={(e) => set(e.target.files?.[0] ?? null)} />
    </div>
  )

  return (
    <form
      className="mt-4 space-y-3 rounded-2xl border border-[#e8dcc4] bg-[#fffaf1] p-4"
      onSubmit={(e) => {
        e.preventDefault()
        void save()
      }}
    >
      <p className="text-xs font-black text-[#7a0d0d]">رفع بيانات التوثيق بدل الطباخة</p>
      <div>
        <label htmlFor={`${uid}-name`} className={labelCls}>الاسم الرباعي زي البطاقة</label>
        <input id={`${uid}-name`} value={fullName} onChange={(e) => setFullName(e.target.value)} className={inputCls} />
      </div>
      <div>
        <label htmlFor={`${uid}-nid`} className={labelCls}>الرقم القومي (14 رقم)</label>
        <input
          id={`${uid}-nid`}
          dir="ltr"
          inputMode="numeric"
          maxLength={14}
          value={nationalId}
          onChange={(e) => setNationalId(e.target.value.replace(/\D/g, ''))}
          className={inputCls}
        />
      </div>
      <div className="grid grid-cols-2 gap-3">
        {fileInput(`${uid}-front`, 'وش البطاقة', front, setFront)}
        {fileInput(`${uid}-back`, 'ضهر البطاقة', back, setBack)}
      </div>
      {error && <p className="text-xs font-bold text-red-600">{error}</p>}
      <div className="flex gap-2">
        <button type="submit" disabled={busy || !ready} className={primaryBtn}>
          {busy && <Loader2 size={13} className="animate-spin" aria-hidden="true" />}
          رفع وحفظ
        </button>
        <button type="button" onClick={onCancel} disabled={busy} className={ghostBtn}>إلغاء</button>
      </div>
    </form>
  )
}
