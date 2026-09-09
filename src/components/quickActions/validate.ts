/** Pure client-side validation mirroring the server FormRequest rules. */

/** Server rule: `regex:/^\+?[1-9]\d{7,14}$/`. */
export const PHONE_RE = /^\+?[1-9]\d{7,14}$/
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export type Errors = Record<string, string>

const M = {
  required: 'هذا الحقل مطلوب.',
  max: (n: number) => `الحد الأقصى ${n} حرفًا.`,
  email: 'صيغة البريد الإلكتروني غير صحيحة.',
  phone: 'رقم هاتف غير صالح — استخدم الصيغة الدولية (مثال: +201001234567).',
  password: 'كلمة المرور 8 أحرف على الأقل.',
} as const

function txt(v: string): string {
  return (v ?? '').trim()
}

export interface CookValues {
  first_name: string
  last_name: string
  email: string
  phone: string
  password: string
  store_name: string
  city_id: string // '' when unset
  area: string
}

export function validateCook(v: CookValues): Errors {
  const e: Errors = {}
  if (!txt(v.first_name)) e.first_name = M.required
  else if (v.first_name.length > 255) e.first_name = M.max(255)
  if (!txt(v.last_name)) e.last_name = M.required
  else if (v.last_name.length > 255) e.last_name = M.max(255)
  if (!txt(v.email)) e.email = M.required
  else if (!EMAIL_RE.test(txt(v.email)) || v.email.length > 255) e.email = M.email
  if (!txt(v.phone)) e.phone = M.required
  else if (!PHONE_RE.test(txt(v.phone))) e.phone = M.phone
  if (!v.password) e.password = M.required
  else if (v.password.length < 8) e.password = M.password
  if (!txt(v.store_name)) e.store_name = M.required
  else if (v.store_name.length > 255) e.store_name = M.max(255)
  if (txt(v.area) && v.area.length > 255) e.area = M.max(255)
  return e
}

export interface UserValues {
  first_name: string
  last_name: string
  email: string
  phone: string
  password: string
  role: string
}

export function validateUser(v: UserValues): Errors {
  const e: Errors = {}
  if (!txt(v.first_name)) e.first_name = M.required
  else if (v.first_name.length > 255) e.first_name = M.max(255)
  if (!txt(v.last_name)) e.last_name = M.required
  else if (v.last_name.length > 255) e.last_name = M.max(255)
  if (!txt(v.email)) e.email = M.required
  else if (!EMAIL_RE.test(txt(v.email)) || v.email.length > 255) e.email = M.email
  if (!txt(v.phone)) e.phone = M.required
  else if (!PHONE_RE.test(txt(v.phone))) e.phone = M.phone
  if (!v.password) e.password = M.required
  else if (v.password.length < 8) e.password = M.password
  if (!['customer', 'cook', 'driver', 'admin'].includes(v.role)) e.role = M.required
  return e
}

export interface NotificationValues {
  title: string
  body: string
  audience: string
}

export function validateNotification(v: NotificationValues): Errors {
  const e: Errors = {}
  if (!txt(v.title)) e.title = M.required
  else if (v.title.length > 255) e.title = M.max(255)
  if (!txt(v.body)) e.body = M.required
  else if (v.body.length > 2000) e.body = M.max(2000)
  if (!['all', 'customers', 'cooks', 'drivers'].includes(v.audience)) e.audience = M.required
  return e
}

/** Merge a 422 `errors` map (server field → [messages]) onto the current errors. */
export function mergeServerErrors(current: Errors, serverErrors: Record<string, string[]> | null): Errors {
  if (!serverErrors) return current
  const next = { ...current }
  for (const [k, msgs] of Object.entries(serverErrors)) {
    if (msgs?.length) next[k] = msgs[0]
  }
  return next
}
