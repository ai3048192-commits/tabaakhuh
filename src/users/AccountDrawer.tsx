import { useEffect, useRef, useState } from 'react'
import {
  X, Loader2, ShoppingBag, CheckCircle2, XCircle, Coins, Phone, Mail, CalendarDays, Clock, FileText, RefreshCw,
} from 'lucide-react'
import DrawerShell from '../shared/DrawerShell'
import DocumentViewer from '../review/DocumentViewer'
import { cardCls } from '../shared/ui'
import { useCityNames } from '../cities/useCityNames'
import { CookDetails, buildDocs as buildCookDocs, DocTile } from '../cooks/cookDetail'
import { DriverDetails, buildDocs as buildDriverDocs } from '../drivers/driverDetail'
import type { DocumentRef } from '../cooks/types'
import { getAccountOverview } from './usersApi'
import { tenure } from './tenure'
import { userMessages as M } from './messages'
import type { AccountOverview, AdminUser } from './types'

const money = (v: number) => `${v.toLocaleString('en-US', { maximumFractionDigits: 2 })} ج.م`
const count = (v: number) => v.toLocaleString('en-US')

/** What the money figure means depends on whose side of the order this account is. */
const AMOUNT_LABEL: Record<AccountOverview['stats']['party'], string> = {
  customer: 'إجمالي المدفوع',
  cook: 'أرباح الطلبات',
  driver: 'أرباح التوصيل',
}

function Stat({ label, value, icon: Icon, tone }: { label: string; value: string; icon: typeof Coins; tone: string }) {
  return (
    <div className={`flex items-center gap-3 ${cardCls} p-4`}>
      <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl ${tone}`}>
        <Icon size={18} aria-hidden="true" />
      </span>
      <div className="min-w-0">
        <p className="whitespace-nowrap text-lg font-black text-gray-900" dir="ltr">{value}</p>
        <p className="text-[11px] font-bold text-gray-500">{label}</p>
      </div>
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className={`${cardCls} p-5`}>
      <h3 className="mb-4 text-sm font-black text-[#7a0d0d]">{title}</h3>
      {children}
    </section>
  )
}

/**
 * The account page, as a side panel: who they are, how long they've been on
 * the app, their orders and money, and the registration data (with ID photos,
 * licence, contract) they submitted.
 */
export default function AccountDrawer({ user, onClose }: { user: AdminUser; onClose: () => void }) {
  const [data, setData] = useState<AccountOverview | null>(null)
  const [state, setState] = useState<'loading' | 'ready' | 'error'>('loading')
  const [attempt, setAttempt] = useState(0)
  const [docIndex, setDocIndex] = useState<number | null>(null)
  const [avatarBroken, setAvatarBroken] = useState(false)
  const closeRef = useRef<HTMLButtonElement>(null)
  const cityNames = useCityNames()

  useEffect(() => { closeRef.current?.focus() }, [])
  useEffect(() => {
    const ctrl = new AbortController()
    setState('loading')
    getAccountOverview(user.id, ctrl.signal)
      .then((d) => { setData(d); setState('ready') })
      .catch((err) => { if ((err as Error)?.name !== 'AbortError') setState('error') })
    return () => ctrl.abort()
  }, [user.id, attempt])

  const u = data?.user ?? user
  const name = `${u.first_name} ${u.last_name}`.trim()
  const since = tenure(u.created_at)

  let docs: DocumentRef[] = []
  if (data?.cook_profile) docs = buildCookDocs({ profile: data.cook_profile, contract: data.contract })
  else if (data?.driver_profile) docs = buildDriverDocs(data.driver_profile) as DocumentRef[]

  return (
    <DrawerShell label={M.detailTitle(name)} onDismiss={onClose} width="lg">
      <div className="flex h-full flex-col bg-[#f7f1e6]">
        {/* Header */}
        <div className="relative shrink-0 overflow-hidden bg-gradient-to-l from-[#7a0d0d] via-[#5e0a0a] to-[#2e0404] px-6 pb-6 pt-5 text-white">
          <div className="pointer-events-none absolute inset-0 opacity-[0.07] [background-image:radial-gradient(circle,#fff_1.5px,transparent_1.5px)] [background-size:22px_22px]" aria-hidden="true" />
          <div className="relative flex items-start justify-between gap-3">
            <div className="flex items-center gap-4">
              <span className="grid h-16 w-16 shrink-0 place-items-center overflow-hidden rounded-2xl bg-white/10 text-2xl font-black text-[#ffd27a] ring-2 ring-white/20">
                {(data?.user.avatar_url || data?.cook_profile?.avatar_url) && !avatarBroken ? (
                  <img
                    src={(data?.user.avatar_url || data?.cook_profile?.avatar_url) ?? undefined}
                    alt=""
                    referrerPolicy="no-referrer"
                    onError={() => setAvatarBroken(true)}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  name.charAt(0) || '؟'
                )}
              </span>
              <div>
                <p className="text-xl font-black">{name || '—'}</p>
                {data?.cook_profile?.store_name && <p className="text-sm font-bold text-[#ffd27a]">{data.cook_profile.store_name}</p>}
                <div className="mt-1.5 flex flex-wrap items-center gap-2 text-[11px] font-bold">
                  <span className="rounded-full bg-white/15 px-2.5 py-0.5">{M.roleLabels[u.role]}</span>
                  <span className={`rounded-full px-2.5 py-0.5 ${u.status === 'active' ? 'bg-emerald-400/20 text-emerald-100' : 'bg-red-400/25 text-red-100'}`}>
                    {M.statusLabels[u.status]}
                  </span>
                </div>
              </div>
            </div>
            <button ref={closeRef} type="button" onClick={onClose} aria-label={M.close} className="grid h-9 w-9 place-items-center rounded-xl bg-white/10 transition hover:bg-white/20">
              <X size={18} aria-hidden="true" />
            </button>
          </div>
          {since && (
            <p className="relative mt-4 inline-flex items-center gap-2 rounded-xl bg-black/20 px-3 py-2 text-xs font-bold ring-1 ring-white/10">
              <Clock size={13} className="text-[#ffd27a]" aria-hidden="true" />
              {since === 'انضم النهارده' ? since : `على التطبيق من ${since}`}
              <span className="text-white/50">· انضم <span dir="ltr">{u.created_at?.slice(0, 10)}</span></span>
            </p>
          )}
        </div>

        {/* Body */}
        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-5">
          {state === 'loading' && (
            <p className="flex items-center gap-2 text-sm text-gray-500">
              <Loader2 size={15} className="animate-spin" aria-hidden="true" /> جارٍ تحميل بيانات الحساب…
            </p>
          )}
          {state === 'error' && (
            <div className="rounded-3xl border border-red-100 bg-red-50 p-5 text-center">
              <p className="mb-3 text-sm text-red-700">تعذّر تحميل بيانات الحساب.</p>
              <button type="button" onClick={() => setAttempt((a) => a + 1)} className="inline-flex items-center gap-1.5 rounded-xl bg-[#7a0d0d] px-4 py-2 text-xs font-black text-white">
                <RefreshCw size={13} aria-hidden="true" /> إعادة المحاولة
              </button>
            </div>
          )}

          {state === 'ready' && data && (
            <>
              {u.role !== 'admin' && (
                <div className="grid grid-cols-2 gap-3">
                  <Stat label="إجمالي الطلبات" value={count(data.stats.total_orders)} icon={ShoppingBag} tone="bg-sky-100 text-sky-700" />
                  <Stat label={AMOUNT_LABEL[data.stats.party]} value={money(data.stats.amount_egp)} icon={Coins} tone="bg-[#b68614]/15 text-[#8f680d]" />
                  <Stat label="طلبات مكتملة" value={count(data.stats.completed_orders)} icon={CheckCircle2} tone="bg-emerald-100 text-emerald-700" />
                  <Stat label="طلبات ملغية" value={count(data.stats.cancelled_orders)} icon={XCircle} tone="bg-red-100 text-red-700" />
                </div>
              )}

              <Section title="بيانات التواصل">
                <dl className="space-y-2.5 text-sm">
                  <div className="flex items-center gap-2.5">
                    <Phone size={14} className="text-[#b68614]" aria-hidden="true" />
                    <dt className="sr-only">{M.fieldPhone}</dt>
                    <dd dir="ltr" className="font-bold text-gray-800">{u.phone || '—'}</dd>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <Mail size={14} className="text-[#b68614]" aria-hidden="true" />
                    <dt className="sr-only">{M.fieldEmail}</dt>
                    <dd className="break-all font-bold text-gray-800">{u.email || '—'}</dd>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <CalendarDays size={14} className="text-[#b68614]" aria-hidden="true" />
                    <dt className="sr-only">{M.fieldJoined}</dt>
                    <dd className="text-gray-600">تاريخ التسجيل: <span dir="ltr">{u.created_at?.slice(0, 10) ?? '—'}</span></dd>
                  </div>
                </dl>
              </Section>

              {data.cook_profile && (
                <Section title="بيانات التسجيل كطباخة">
                  <CookDetails
                    entry={{ profile: { ...data.cook_profile, phone: u.phone, email: u.email }, contract: data.contract }}
                    cityName={cityNames.resolve(data.cook_profile.city_id)}
                  />
                </Section>
              )}
              {data.driver_profile && (
                <Section title="بيانات التسجيل كسائق">
                  <DriverDetails
                    entry={{ ...data.driver_profile, phone: u.phone, email: u.email }}
                    cityName={cityNames.resolve(data.driver_profile.city_id)}
                  />
                </Section>
              )}
              {(u.role === 'cook' || u.role === 'driver') && !data.cook_profile && !data.driver_profile && (
                <p className="rounded-2xl border border-dashed border-[#e8dcc4] bg-white/60 p-5 text-center text-xs font-bold text-gray-400">
                  لسه مكمّلش بيانات التسجيل.
                </p>
              )}

              {docs.length > 0 && (
                <Section title="المستندات والصور">
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                    {docs.map((doc, i) => (
                      <div key={doc.kind}>
                        <DocTile doc={doc} onOpen={() => setDocIndex(i)} />
                        <p className="mt-1.5 flex items-center gap-1 text-[11px] font-bold text-gray-500">
                          <FileText size={11} aria-hidden="true" /> {doc.label}
                        </p>
                      </div>
                    ))}
                  </div>
                </Section>
              )}
            </>
          )}
        </div>
      </div>

      {docIndex !== null && (
        <DocumentViewer docs={docs} index={docIndex} onIndexChange={setDocIndex} onClose={() => setDocIndex(null)} />
      )}
    </DrawerShell>
  )
}
