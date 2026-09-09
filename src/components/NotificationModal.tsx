import { useState } from 'react'
import { ApiError } from '../api/envelope'
import QuickModalShell from './quickActions/QuickModalShell'
import SubmitBar from './quickActions/SubmitBar'
import { createNotification, type NotificationAudience } from './quickActions/api'
import { validateNotification, mergeServerErrors, type Errors } from './quickActions/validate'

const AUDIENCES: { value: NotificationAudience; label: string }[] = [
  { value: 'all', label: 'الكل' },
  { value: 'customers', label: 'العملاء' },
  { value: 'cooks', label: 'الطباخات' },
  { value: 'drivers', label: 'السائقون' },
]

/** Quick action: send a broadcast notification — `POST /admin/notifications`. */
export default function NotificationModal({ onClose }: { onClose: () => void }) {
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [audience, setAudience] = useState<NotificationAudience>('all')
  const [errors, setErrors] = useState<Errors>({})
  const [busy, setBusy] = useState(false)
  const [banner, setBanner] = useState<{ tone: 'ok' | 'err'; text: string } | null>(null)

  const submit = async () => {
    const e = validateNotification({ title, body, audience })
    setErrors(e)
    if (Object.keys(e).length > 0) return
    setBusy(true)
    setBanner(null)
    try {
      await createNotification({ title: title.trim(), body: body.trim(), audience })
      setBanner({ tone: 'ok', text: 'تم إرسال الإشعار.' })
      window.setTimeout(onClose, 900)
    } catch (err) {
      if (err instanceof ApiError && err.status === 422) {
        setErrors((cur) => mergeServerErrors(cur, err.fieldErrors))
        setBanner({ tone: 'err', text: err.message || 'تحقّق من الحقول.' })
      } else {
        setBanner({ tone: 'err', text: 'تعذّر الإرسال. حاول مرة أخرى.' })
      }
    } finally {
      setBusy(false)
    }
  }

  return (
    <QuickModalShell title="إرسال إشعار عام" onClose={onClose} maxWidth="max-w-xl">
      <div className="space-y-4">
        <div className="flex flex-col gap-1">
          <label htmlFor="ntf-title" className="pr-1 text-[11px] font-bold text-gray-500">عنوان الإشعار</label>
          <input
            id="ntf-title"
            value={title}
            autoFocus
            onChange={(e) => { setTitle(e.target.value); setErrors((x) => { const { title: _d, ...r } = x; return r }) }}
            aria-invalid={errors.title ? true : undefined}
            className={`rounded-2xl border bg-white p-4 text-sm outline-none ${errors.title ? 'border-red-300' : 'border-[#e8dfc9] focus:ring-2 focus:ring-[#7a0d0d]/20'}`}
            placeholder="اكتب العنوان هنا…"
          />
          {errors.title && <p className="pr-1 text-xs text-red-600">{errors.title}</p>}
        </div>

        <div className="flex flex-col gap-1">
          <label htmlFor="ntf-body" className="pr-1 text-[11px] font-bold text-gray-500">محتوى الرسالة</label>
          <textarea
            id="ntf-body"
            value={body}
            rows={4}
            onChange={(e) => { setBody(e.target.value); setErrors((x) => { const { body: _d, ...r } = x; return r }) }}
            aria-invalid={errors.body ? true : undefined}
            className={`rounded-2xl border bg-white p-4 text-sm outline-none ${errors.body ? 'border-red-300' : 'border-[#e8dfc9] focus:ring-2 focus:ring-[#7a0d0d]/20'}`}
            placeholder="اكتب تفاصيل الإشعار…"
          />
          <div className="flex justify-between pr-1 text-[10px] text-gray-400">
            <span>{errors.body && <span className="text-red-600">{errors.body}</span>}</span>
            <span dir="ltr">{body.length}/2000</span>
          </div>
        </div>

        <div className="flex flex-col gap-1">
          <span className="pr-1 text-[11px] font-bold text-gray-500">الجمهور المستهدف</span>
          <div role="group" aria-label="الجمهور المستهدف" className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {AUDIENCES.map((a) => (
              <button
                key={a.value}
                type="button"
                aria-pressed={audience === a.value}
                onClick={() => setAudience(a.value)}
                className={`rounded-xl border-2 py-3 text-xs font-black transition ${
                  audience === a.value ? 'border-[#7a0d0d] bg-white text-[#7a0d0d]' : 'border-transparent bg-[#e8dfc9]/30 text-gray-500'
                }`}
              >
                {a.label}
              </button>
            ))}
          </div>
          {errors.audience && <p className="pr-1 text-xs text-red-600">{errors.audience}</p>}
        </div>
      </div>

      <SubmitBar banner={banner} busy={busy} saveLabel="اعتماد وإرسال الإشعار" onCancel={onClose} onSave={submit} />
    </QuickModalShell>
  )
}
