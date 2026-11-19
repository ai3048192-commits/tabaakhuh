import { useCallback, useEffect, useRef, useState } from 'react'
import { Copy, Check, RefreshCw, Search, KeyRound, MailCheck } from 'lucide-react'
import PageHeader from '../shared/PageHeader'
import { bannerBtnLight } from '../shared/ui'
import { listEmailCodes, type EmailCode, type EmailCodeState } from './emailCodesApi'

const M = {
  title: 'أكواد الإيميل',
  subtitle: 'نسخة من كل كود اتبعت على الإيميل (تفعيل الحساب واستعادة كلمة المرور) — لو الإيميل ماوصلش، اقرا الكود للمستخدم من هنا.',
  search: 'ابحث بالإيميل',
  refresh: 'تحديث',
  loading: 'جارٍ تحميل الأكواد…',
  error: 'تعذّر تحميل الأكواد. حاول مرة أخرى.',
  retry: 'إعادة المحاولة',
  empty: 'مفيش أكواد اتبعتت.',
  emptyFiltered: 'مفيش أكواد للإيميل ده.',
  colUser: 'المستخدم',
  colKind: 'النوع',
  colCode: 'الكود',
  colState: 'الحالة',
  colSent: 'اتبعت',
  kind: { verification: 'تفعيل الحساب', password_reset: 'استعادة كلمة المرور' },
  state: { active: 'صالح', consumed: 'اتستخدم / اتلغى', expired: 'انتهت صلاحيته' } as Record<EmailCodeState, string>,
  noCopy: 'غير متاح',
  noCopyHint: 'اتبعت قبل ما الداشبورد يبدأ يحتفظ بنسخة',
  copy: 'نسخ الكود',
  copied: 'اتنسخ',
  expiresIn: (m: number) => `باقي ${m} دقيقة`,
  hint: 'الكود صالح 10 دقايق، وكل كود جديد بيلغي اللي قبله. لو انتهى، خلّي المستخدم يطلب كود جديد من التطبيق.',
  roles: { customer: 'عميل', cook: 'طباخة', driver: 'سائق', admin: 'أدمن' } as Record<string, string>,
}

const stateTone: Record<EmailCodeState, string> = {
  active: 'border-emerald-300 bg-emerald-50 text-emerald-800',
  consumed: 'border-gray-200 bg-gray-50 text-gray-500',
  expired: 'border-amber-300 bg-amber-50 text-amber-800',
}

function fmt(iso: string): string {
  try {
    return new Intl.DateTimeFormat('ar-EG', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Africa/Cairo' }).format(new Date(iso))
  } catch {
    return iso
  }
}

function CopyButton({ code }: { code: string }) {
  const [done, setDone] = useState(false)
  return (
    <button
      type="button"
      aria-label={M.copy}
      title={M.copy}
      onClick={() => {
        void navigator.clipboard?.writeText(code).then(() => {
          setDone(true)
          window.setTimeout(() => setDone(false), 1500)
        })
      }}
      className="grid h-8 w-8 place-items-center rounded-lg border border-[#e8dcc4] bg-white text-gray-500 transition hover:bg-[#faf3e7] hover:text-[#7a0d0d]"
    >
      {done ? <Check size={15} aria-hidden="true" /> : <Copy size={15} aria-hidden="true" />}
    </button>
  )
}

export default function EmailCodesPage() {
  const [q, setQ] = useState('')
  const [items, setItems] = useState<EmailCode[] | null>(null)
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading')
  const abortRef = useRef<AbortController | null>(null)
  const [now, setNow] = useState(() => Date.now())

  const load = useCallback(async (query: string) => {
    abortRef.current?.abort()
    const ctrl = new AbortController()
    abortRef.current = ctrl
    try {
      const data = await listEmailCodes(query, ctrl.signal)
      setItems(data)
      setNow(Date.now())
      setStatus('ready')
    } catch (err) {
      if (ctrl.signal.aborted || (err instanceof DOMException && err.name === 'AbortError')) return
      setStatus((s) => (s === 'ready' ? 'ready' : 'error'))
    }
  }, [])

  // Debounced search.
  useEffect(() => {
    const t = window.setTimeout(() => void load(q), q ? 300 : 0)
    return () => window.clearTimeout(t)
  }, [q, load])

  // Keep "time left" and active → expired honest without a reload.
  useEffect(() => {
    const t = window.setInterval(() => setNow(Date.now()), 30_000)
    return () => window.clearInterval(t)
  }, [])

  useEffect(() => () => abortRef.current?.abort(), [])

  const th = 'px-4 py-3 text-right text-xs font-bold text-gray-400'
  const td = 'px-4 py-3.5 align-middle text-sm text-gray-700'
  return (
    <div className="min-h-full bg-[#f7f1e6] p-4 font-['Tajawal'] md:p-8" dir="rtl">
      <PageHeader
        title={M.title}
        subtitle={M.subtitle}
        actions={
          <button type="button" onClick={() => void load(q)} className={bannerBtnLight}>
            <RefreshCw size={14} aria-hidden="true" />
            {M.refresh}
          </button>
        }
      />

      <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <label className="relative block w-full md:max-w-sm">
          <span className="sr-only">{M.search}</span>
          <Search size={15} className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400" aria-hidden="true" />
          <input
            type="search"
            dir="ltr"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={M.search}
            className="w-full rounded-xl border border-[#e8dcc4] bg-white py-2.5 pl-3.5 pr-10 text-right text-sm text-gray-800 shadow-sm outline-none transition focus:border-[#7a0d0d] focus:ring-4 focus:ring-[#7a0d0d]/10"
          />
        </label>
        <p className="text-xs font-bold text-gray-500">{M.hint}</p>
      </div>

      {status === 'loading' && <p className="text-sm text-gray-500">{M.loading}</p>}

      {status === 'error' && (
        <div className="max-w-md rounded-3xl border border-red-100 bg-red-50 p-6 text-center">
          <p className="mb-3 text-sm text-red-700">{M.error}</p>
          <button type="button" onClick={() => void load(q)} className="rounded-xl bg-[#7a0d0d] px-4 py-2.5 text-sm font-black text-white shadow-sm transition hover:bg-[#5a0909]">{M.retry}</button>
        </div>
      )}

      {status === 'ready' && items && items.length === 0 && (
        <p className="rounded-3xl bg-white p-10 text-center text-sm font-bold text-gray-400 shadow-[0_18px_40px_-30px_rgba(122,13,13,0.45)] ring-1 ring-[#efe3cc]">
          {q.trim() ? M.emptyFiltered : M.empty}
        </p>
      )}

      {status === 'ready' && items && items.length > 0 && (
        <div className="overflow-x-auto rounded-3xl bg-white shadow-[0_18px_40px_-30px_rgba(122,13,13,0.45)] ring-1 ring-[#efe3cc]">
          <table className="w-full min-w-[760px] border-collapse">
            <thead className="bg-[#fffaf1]">
              <tr>
                <th scope="col" className={th}>{M.colUser}</th>
                <th scope="col" className={th}>{M.colKind}</th>
                <th scope="col" className={th}>{M.colCode}</th>
                <th scope="col" className={th}>{M.colState}</th>
                <th scope="col" className={th}>{M.colSent}</th>
              </tr>
            </thead>
            <tbody>
              {items.map((c) => {
                const expiresMs = new Date(c.expires_at).getTime()
                const state: EmailCodeState = c.state === 'active' && expiresMs <= now ? 'expired' : c.state
                const minsLeft = Math.max(1, Math.ceil((expiresMs - now) / 60_000))
                const KindIcon = c.kind === 'verification' ? MailCheck : KeyRound
                return (
                  <tr key={c.id} className="border-t border-[#f3ead9] transition hover:bg-[#fffaf1]">
                    <td className={td}>
                      <span className="block font-bold text-gray-900">
                        {c.user_name ?? '—'}
                        {c.user_role && <span className="mr-1.5 text-xs font-bold text-gray-400">({M.roles[c.user_role] ?? c.user_role})</span>}
                      </span>
                      <span dir="ltr" className="block text-xs text-gray-500">{c.email}</span>
                    </td>
                    <td className={td}>
                      <span className="inline-flex items-center gap-1.5 text-xs font-bold text-gray-700">
                        <KindIcon size={14} aria-hidden="true" />
                        {M.kind[c.kind]}
                      </span>
                    </td>
                    <td className={td}>
                      {c.code ? (
                        <div className="flex items-center gap-2">
                          <span dir="ltr" className={`font-mono text-lg font-black tracking-[0.3em] ${state === 'active' ? 'text-[#7a0d0d]' : 'text-gray-400 line-through decoration-1'}`}>
                            {c.code}
                          </span>
                          {state === 'active' && <CopyButton code={c.code} />}
                        </div>
                      ) : (
                        <span className="text-xs font-bold text-gray-400" title={M.noCopyHint}>{M.noCopy}</span>
                      )}
                    </td>
                    <td className={td}>
                      <span className={`inline-flex rounded-full border px-2.5 py-1 text-[11px] font-black ${stateTone[state]}`}>{M.state[state]}</span>
                      {state === 'active' && <span className="block pt-1 text-[11px] font-bold text-emerald-700">{M.expiresIn(minsLeft)}</span>}
                    </td>
                    <td className={`${td} text-xs`}>{fmt(c.created_at)}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
