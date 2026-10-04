import type { ReactNode } from 'react'
import {
  BadgeHelp, ChefHat, LayoutPanelTop, ListOrdered, Megaphone, MessageCircle, PanelBottom, Palette,
  Share2, Smartphone, Sparkles, UtensilsCrossed, type LucideIcon,
} from 'lucide-react'
import heroFood from '../../assets/egyptian-home-food.webp'
import logoIcon from '../../assets/logo_icon_trim.png'
import chickenImg from '../../assets/chicken.jpeg'
import kosharyImg from '../../assets/koshary.jpeg'
import kronbImg from '../../assets/kronb.jpeg'
import type { DishItem, FaqItem, FeatureItem, JoinStepItem, LandingContent, SocialItem } from '../content'
import { SOCIAL_KEYS, SOCIAL_PLATFORMS } from '../icons'
import { Group, IconPicker, ImageInput, ListEditor, Row, Switch, Text } from './fields'
import { LinksList, StatsList, StepsList } from './lists'

type Set = <K extends keyof LandingContent>(key: K, value: LandingContent[K]) => void

interface SectionDef {
  key: keyof LandingContent
  title: string
  description: string
  icon: LucideIcon
  /** Sections without `enabled` (brand, footer) are always shown. */
  toggleable: boolean
  render: (c: LandingContent, set: Set) => ReactNode
}

const BUNDLED_DISHES = [kosharyImg, kronbImg, chickenImg]

const HREF_HINT = 'قسم في الصفحة (#app، #contact، #faq…) أو رابط كامل يبدأ بـ https://'

/* ---------- sections ---------- */

export const SECTIONS: SectionDef[] = [
  {
    key: 'brand',
    title: 'الهوية والقائمة',
    description: 'اسم المنصة، اللوجو، وروابط القائمة العلوية',
    icon: Palette,
    toggleable: false,
    render: (c, set) => {
      const b = c.brand
      const up = (p: Partial<typeof b>) => set('brand', { ...b, ...p })
      return (
        <>
          <Group title="الهوية">
            <Row>
              <Text label="اسم المنصة" value={b.name} onChange={(v) => up({ name: v })} />
              <Text label="نص زر الدخول" value={b.loginLabel} onChange={(v) => up({ loginLabel: v })} />
            </Row>
            <ImageInput label="اللوجو" value={b.logo} onChange={(v) => up({ logo: v })} fallback={logoIcon} hint="PNG بخلفية شفافة بيظهر أحسن." />
            <Switch label="إظهار زر تسجيل الدخول" checked={b.showLogin} onChange={(v) => up({ showLogin: v })} />
          </Group>
          <LinksList title="روابط القائمة" items={b.navLinks} onChange={(v) => up({ navLinks: v })} />
        </>
      )
    },
  },
  {
    key: 'hero',
    title: 'الواجهة الرئيسية',
    description: 'أول حاجة الزائر بيشوفها: العنوان والصورة والأزرار',
    icon: LayoutPanelTop,
    toggleable: true,
    render: (c, set) => {
      const h = c.hero
      const up = (p: Partial<typeof h>) => set('hero', { ...h, ...p })
      return (
        <>
          <Group title="النصوص">
            <Text label="الشارة الصغيرة" value={h.badge} onChange={(v) => up({ badge: v })} />
            <Row>
              <Text label="العنوان — السطر الأول" value={h.titleLine1} onChange={(v) => up({ titleLine1: v })} />
              <Text label="العنوان — الجزء الملوّن" value={h.titleHighlight} onChange={(v) => up({ titleHighlight: v })} />
            </Row>
            <Text label="الوصف" value={h.description} onChange={(v) => up({ description: v })} multiline />
          </Group>
          <Group title="الأزرار">
            <Row>
              <Text label="الزر الأساسي — النص" value={h.primaryCta.label} onChange={(v) => up({ primaryCta: { ...h.primaryCta, label: v } })} hint="اتركه فاضي لإخفاء الزر." />
              <Text label="الزر الأساسي — الرابط" value={h.primaryCta.href} onChange={(v) => up({ primaryCta: { ...h.primaryCta, href: v } })} ltr hint={HREF_HINT} />
            </Row>
            <Row>
              <Text label="الزر الثانوي — النص" value={h.secondaryCta.label} onChange={(v) => up({ secondaryCta: { ...h.secondaryCta, label: v } })} />
              <Text label="الزر الثانوي — الرابط" value={h.secondaryCta.href} onChange={(v) => up({ secondaryCta: { ...h.secondaryCta, href: v } })} ltr />
            </Row>
          </Group>
          <Group title="الصورة">
            <ImageInput label="صورة الواجهة" value={h.image} onChange={(v) => up({ image: v })} fallback={heroFood} hint="صورة طولية (٤:٥) بتظهر أحسن." />
            <Row>
              <Text label="وصف الصورة (لقارئ الشاشة)" value={h.imageAlt} onChange={(v) => up({ imageAlt: v })} />
              <Text label="الشارة تحت الصورة" value={h.floatingBadge} onChange={(v) => up({ floatingBadge: v })} />
            </Row>
          </Group>
          <StatsList title="الأرقام تحت العنوان" items={h.stats} onChange={(v) => up({ stats: v })} />
        </>
      )
    },
  },
  {
    key: 'why',
    title: 'ليه طباخه + الأطباق',
    description: 'رسالة المنصة وكروت الأطباق بالصور',
    icon: UtensilsCrossed,
    toggleable: true,
    render: (c, set) => {
      const w = c.why
      const up = (p: Partial<typeof w>) => set('why', { ...w, ...p })
      return (
        <>
          <Group>
            <Text label="العنوان" value={w.title} onChange={(v) => up({ title: v })} />
            <Text label="الوصف" value={w.description} onChange={(v) => up({ description: v })} multiline />
            <Text label="الملاحظة المميّزة" value={w.note} onChange={(v) => up({ note: v })} multiline rows={2} />
            <Text label="شارة الأطباق" value={w.dishesBadge} onChange={(v) => up({ dishesBadge: v })} />
          </Group>
          <ListEditor<DishItem>
            title="الأطباق"
            items={w.dishes}
            onChange={(v) => up({ dishes: v })}
            addLabel="إضافة طبق"
            max={9}
            makeItem={() => ({ name: '', image: '', rate: '', price: '', tag: '' })}
            itemTitle={(d) => d.name}
            renderItem={(d, u) => (
              <>
                <Row>
                  <Text label="اسم الطبق" value={d.name} onChange={(v) => u({ name: v })} />
                  <Text label="السعر" value={d.price} onChange={(v) => u({ price: v })} placeholder="٤٥ ج" />
                </Row>
                <Row>
                  <Text label="التقييم" value={d.rate} onChange={(v) => u({ rate: v })} placeholder="٤.٩" />
                  <Text label="وسم صغير" value={d.tag} onChange={(v) => u({ tag: v })} placeholder="طازة وحالاً" />
                </Row>
                <ImageInput label="صورة الطبق" value={d.image} onChange={(v) => u({ image: v })} fallback={BUNDLED_DISHES[w.dishes.indexOf(d) % 3]} />
              </>
            )}
          />
        </>
      )
    },
  },
  {
    key: 'features',
    title: 'المميزات والأرقام',
    description: 'كروت المميزات وشريط الإحصائيات',
    icon: Sparkles,
    toggleable: true,
    render: (c, set) => {
      const f = c.features
      const up = (p: Partial<typeof f>) => set('features', { ...f, ...p })
      return (
        <>
          <ListEditor<FeatureItem>
            title="كروت المميزات"
            items={f.cards}
            onChange={(v) => up({ cards: v })}
            addLabel="إضافة ميزة"
            makeItem={() => ({ icon: 'sparkles', title: '', text: '', ctaLabel: '', ctaHref: '' })}
            itemTitle={(x) => x.title}
            renderItem={(x, u) => (
              <>
                <Row>
                  <Text label="العنوان" value={x.title} onChange={(v) => u({ title: v })} />
                  <IconPicker value={x.icon} onChange={(v) => u({ icon: v })} />
                </Row>
                <Text label="الوصف" value={x.text} onChange={(v) => u({ text: v })} multiline rows={2} />
                <Row>
                  <Text label="نص الزر (اختياري)" value={x.ctaLabel} onChange={(v) => u({ ctaLabel: v })} />
                  <Text label="رابط الزر" value={x.ctaHref} onChange={(v) => u({ ctaHref: v })} ltr />
                </Row>
              </>
            )}
          />
          <StatsList title="شريط الأرقام" items={f.stats} onChange={(v) => up({ stats: v })} />
        </>
      )
    },
  },
  {
    key: 'how',
    title: 'بتشتغل إزاي؟',
    description: 'خطوات العميل وخطوات الطباخة',
    icon: ListOrdered,
    toggleable: true,
    render: (c, set) => {
      const h = c.how
      const up = (p: Partial<typeof h>) => set('how', { ...h, ...p })
      return (
        <>
          <Group>
            <Row>
              <Text label="الشارة" value={h.kicker} onChange={(v) => up({ kicker: v })} />
              <Text label="العنوان" value={h.title} onChange={(v) => up({ title: v })} />
            </Row>
            <Row>
              <Text label="اسم تبويب العميل" value={h.clientTab} onChange={(v) => up({ clientTab: v })} />
              <Text label="اسم تبويب الطباخة" value={h.cookTab} onChange={(v) => up({ cookTab: v })} />
            </Row>
          </Group>
          <StepsList title="خطوات العميل" items={h.clientSteps} onChange={(v) => up({ clientSteps: v })} />
          <StepsList title="خطوات الطباخة" items={h.cookSteps} onChange={(v) => up({ cookSteps: v })} />
        </>
      )
    },
  },
  {
    key: 'joinCook',
    title: 'انضمي كطباخة',
    description: 'دعوة الطباخات للتسجيل',
    icon: ChefHat,
    toggleable: true,
    render: (c, set) => {
      const j = c.joinCook
      const up = (p: Partial<typeof j>) => set('joinCook', { ...j, ...p })
      return (
        <>
          <Group>
            <Row>
              <Text label="الشارة" value={j.kicker} onChange={(v) => up({ kicker: v })} />
              <Text label="العنوان" value={j.title} onChange={(v) => up({ title: v })} />
            </Row>
            <Text label="الوصف" value={j.subtitle} onChange={(v) => up({ subtitle: v })} multiline rows={2} />
          </Group>
          <ListEditor<JoinStepItem>
            title="الخطوات"
            items={j.steps}
            onChange={(v) => up({ steps: v })}
            addLabel="إضافة خطوة"
            makeItem={() => ({ icon: 'chef', badge: '', title: '', text: '' })}
            itemTitle={(s) => s.title}
            renderItem={(s, u) => (
              <>
                <Row>
                  <Text label="العنوان" value={s.title} onChange={(v) => u({ title: v })} />
                  <Text label="الشارة" value={s.badge} onChange={(v) => u({ badge: v })} />
                </Row>
                <Text label="الوصف" value={s.text} onChange={(v) => u({ text: v })} multiline rows={2} />
                <IconPicker value={s.icon} onChange={(v) => u({ icon: v })} />
              </>
            )}
          />
          <Row>
            <Text label="نص الزر" value={j.ctaLabel} onChange={(v) => up({ ctaLabel: v })} hint="اتركه فاضي لإخفاء الزر." />
            <Text label="رابط الزر" value={j.ctaHref} onChange={(v) => up({ ctaHref: v })} ltr />
          </Row>
        </>
      )
    },
  },
  {
    key: 'app',
    title: 'تحميل التطبيق',
    description: 'روابط Google Play و App Store وصورة التطبيق',
    icon: Smartphone,
    toggleable: true,
    render: (c, set) => {
      const a = c.app
      const up = (p: Partial<typeof a>) => set('app', { ...a, ...p })
      return (
        <>
          <Group title="روابط المتاجر">
            <p className="rounded-xl bg-amber-50 px-3 py-2 text-[11px] font-bold text-amber-800">
              لو الرابط فاضي، الزر بيظهر بكلمة «قريبًا» ومش بيفتح حاجة.
            </p>
            <Row>
              <Text label="رابط Google Play" value={a.googlePlayUrl} onChange={(v) => up({ googlePlayUrl: v })} ltr placeholder="https://play.google.com/store/apps/details?id=…" />
              <Text label="اسم الزر" value={a.googlePlayLabel} onChange={(v) => up({ googlePlayLabel: v })} ltr />
            </Row>
            <Row>
              <Text label="رابط App Store" value={a.appStoreUrl} onChange={(v) => up({ appStoreUrl: v })} ltr placeholder="https://apps.apple.com/app/…" />
              <Text label="اسم الزر" value={a.appStoreLabel} onChange={(v) => up({ appStoreLabel: v })} ltr />
            </Row>
          </Group>
          <Group title="النصوص">
            <Text label="الشارة" value={a.badge} onChange={(v) => up({ badge: v })} />
            <Row>
              <Text label="العنوان — البداية" value={a.titleStart} onChange={(v) => up({ titleStart: v })} />
              <Text label="العنوان — الجزء الملوّن" value={a.titleHighlight} onChange={(v) => up({ titleHighlight: v })} />
            </Row>
            <Text label="العنوان — النهاية" value={a.titleEnd} onChange={(v) => up({ titleEnd: v })} />
            <Text label="الوصف" value={a.description} onChange={(v) => up({ description: v })} multiline />
          </Group>
          <ImageInput
            label="صورة شاشة التطبيق (اختياري)"
            value={a.screenshot}
            onChange={(v) => up({ screenshot: v })}
            hint="لو فاضية، بيظهر شكل الموبايل الافتراضي بالأطباق. المقاس المناسب ٩:١٩."
          />
          <StatsList title="الأرقام" items={a.stats} onChange={(v) => up({ stats: v })} />
        </>
      )
    },
  },
  {
    key: 'faq',
    title: 'الأسئلة الشائعة',
    description: 'الأسئلة والإجابات وصندوق الدعم',
    icon: BadgeHelp,
    toggleable: true,
    render: (c, set) => {
      const f = c.faq
      const up = (p: Partial<typeof f>) => set('faq', { ...f, ...p })
      return (
        <>
          <Group>
            <Text label="الشارة" value={f.badge} onChange={(v) => up({ badge: v })} />
            <Row>
              <Text label="العنوان" value={f.title} onChange={(v) => up({ title: v })} />
              <Text label="العنوان — الجزء الملوّن" value={f.titleHighlight} onChange={(v) => up({ titleHighlight: v })} />
            </Row>
            <Text label="الوصف" value={f.subtitle} onChange={(v) => up({ subtitle: v })} multiline rows={2} />
          </Group>
          <ListEditor<FaqItem>
            title="الأسئلة"
            items={f.items}
            onChange={(v) => up({ items: v })}
            addLabel="إضافة سؤال"
            makeItem={() => ({ question: '', hint: '', answer: '' })}
            itemTitle={(q) => q.question}
            renderItem={(q, u) => (
              <>
                <Text label="السؤال" value={q.question} onChange={(v) => u({ question: v })} />
                <Text label="سطر توضيحي (اختياري)" value={q.hint} onChange={(v) => u({ hint: v })} />
                <Text label="الإجابة" value={q.answer} onChange={(v) => u({ answer: v })} multiline rows={4} />
              </>
            )}
          />
          <Group title="صندوق الدعم">
            <Text label="العنوان" value={f.supportTitle} onChange={(v) => up({ supportTitle: v })} hint="اتركه فاضي لإخفاء الصندوق." />
            <Text label="الوصف" value={f.supportText} onChange={(v) => up({ supportText: v })} multiline rows={2} />
            <Row>
              <Text label="نص الزر" value={f.supportCtaLabel} onChange={(v) => up({ supportCtaLabel: v })} />
              <Text label="رابط الزر" value={f.supportCtaHref} onChange={(v) => up({ supportCtaHref: v })} ltr />
            </Row>
          </Group>
        </>
      )
    },
  },
  {
    key: 'cta',
    title: 'بانر الدعوة',
    description: 'البانر الأحمر قبل نهاية الصفحة',
    icon: Megaphone,
    toggleable: true,
    render: (c, set) => {
      const x = c.cta
      const up = (p: Partial<typeof x>) => set('cta', { ...x, ...p })
      return (
        <Group>
          <Text label="الشارة" value={x.badge} onChange={(v) => up({ badge: v })} />
          <Row>
            <Text label="العنوان — البداية" value={x.titleStart} onChange={(v) => up({ titleStart: v })} />
            <Text label="العنوان — الجزء الملوّن" value={x.titleHighlight} onChange={(v) => up({ titleHighlight: v })} />
          </Row>
          <Text label="العنوان — النهاية" value={x.titleEnd} onChange={(v) => up({ titleEnd: v })} />
          <Text label="الوصف" value={x.description} onChange={(v) => up({ description: v })} multiline rows={2} />
          <Row>
            <Text label="نص الزر" value={x.buttonLabel} onChange={(v) => up({ buttonLabel: v })} />
            <Text label="رابط الزر" value={x.buttonHref} onChange={(v) => up({ buttonHref: v })} ltr />
          </Row>
        </Group>
      )
    },
  },
  {
    key: 'social',
    title: 'السوشيال ميديا',
    description: 'صفحاتكم على فيسبوك وإنستجرام وتيك توك…',
    icon: Share2,
    toggleable: true,
    render: (c, set) => {
      const s = c.social
      const up = (p: Partial<typeof s>) => set('social', { ...s, ...p })
      return (
        <>
          <Group>
            <Row>
              <Text label="الشارة" value={s.kicker} onChange={(v) => up({ kicker: v })} />
              <Text label="العنوان" value={s.title} onChange={(v) => up({ title: v })} />
            </Row>
            <Text label="الوصف" value={s.subtitle} onChange={(v) => up({ subtitle: v })} multiline rows={2} />
            <p className="rounded-xl bg-amber-50 px-3 py-2 text-[11px] font-bold text-amber-800">
              الحسابات اللي من غير رابط مش بتظهر في الصفحة. نفس الروابط بتظهر كمان في الفوتر.
            </p>
          </Group>
          <ListEditor<SocialItem>
            title="الحسابات"
            items={s.links}
            onChange={(v) => up({ links: v })}
            addLabel="إضافة حساب"
            max={12}
            makeItem={() => ({ platform: 'facebook', label: '', url: '' })}
            itemTitle={(l) => `${SOCIAL_PLATFORMS[l.platform]?.name ?? l.platform}${l.url ? '' : ' (بدون رابط)'}`}
            renderItem={(l, u) => (
              <>
                <div className="flex flex-col gap-1.5">
                  <span className="text-xs font-black text-[#6b4f3a]">المنصة</span>
                  <div className="flex flex-wrap gap-2">
                    {SOCIAL_KEYS.map((k) => {
                      const P = SOCIAL_PLATFORMS[k]
                      const active = l.platform === k
                      return (
                        <button
                          key={k}
                          type="button"
                          aria-pressed={active}
                          onClick={() => u({ platform: k })}
                          className={`inline-flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-bold transition ${
                            active ? 'border-transparent text-white shadow' : 'border-[#e8dcc4] bg-white text-gray-600 hover:bg-[#faf3e7]'
                          }`}
                          style={active ? { backgroundColor: P.color } : undefined}
                        >
                          <P.Icon size={14} aria-hidden="true" /> {P.name}
                        </button>
                      )
                    })}
                  </div>
                </div>
                <Row>
                  <Text label="الرابط" value={l.url} onChange={(v) => u({ url: v })} ltr placeholder="https://facebook.com/…" />
                  <Text label="الاسم الظاهر" value={l.label} onChange={(v) => u({ label: v })} placeholder={SOCIAL_PLATFORMS[l.platform]?.name} />
                </Row>
              </>
            )}
          />
        </>
      )
    },
  },
  {
    key: 'contact',
    title: 'تواصل معانا',
    description: 'التليفون، الواتساب، الإيميل، العنوان، والفورم',
    icon: MessageCircle,
    toggleable: true,
    render: (c, set) => {
      const x = c.contact
      const up = (p: Partial<typeof x>) => set('contact', { ...x, ...p })
      return (
        <>
          <Group>
            <Row>
              <Text label="الشارة" value={x.kicker} onChange={(v) => up({ kicker: v })} />
              <Text label="العنوان" value={x.title} onChange={(v) => up({ title: v })} />
            </Row>
            <Text label="الوصف" value={x.subtitle} onChange={(v) => up({ subtitle: v })} multiline rows={2} />
          </Group>
          <Group title="بيانات التواصل">
            <p className="text-[11px] text-gray-400">أي خانة فاضية مش بتظهر. البيانات دي بتظهر كمان في الفوتر.</p>
            <Row>
              <Text label="رقم التليفون" value={x.phone} onChange={(v) => up({ phone: v })} ltr placeholder="01xxxxxxxxx" />
              <Text label="رقم الواتساب" value={x.whatsapp} onChange={(v) => up({ whatsapp: v })} ltr placeholder="01xxxxxxxxx" />
            </Row>
            <Row>
              <Text label="الإيميل" value={x.email} onChange={(v) => up({ email: v })} ltr />
              <Text label="مواعيد العمل" value={x.hours} onChange={(v) => up({ hours: v })} />
            </Row>
            <Row>
              <Text label="العنوان" value={x.address} onChange={(v) => up({ address: v })} />
              <Text label="رابط الموقع على الخريطة" value={x.mapUrl} onChange={(v) => up({ mapUrl: v })} ltr placeholder="https://maps.google.com/…" />
            </Row>
          </Group>
          <Group title="فورم الرسائل">
            <Switch
              label="إظهار فورم «ابعتلنا رسالة»"
              description="الزائر بيكتب رسالته وبتتبعت لكم على الواتساب أو الإيميل."
              checked={x.showForm}
              onChange={(v) => up({ showForm: v })}
            />
            <Text label="عنوان الفورم" value={x.formTitle} onChange={(v) => up({ formTitle: v })} />
          </Group>
        </>
      )
    },
  },
  {
    key: 'footer',
    title: 'الفوتر',
    description: 'نبذة، روابط الشركة، وحقوق النشر',
    icon: PanelBottom,
    toggleable: false,
    render: (c, set) => {
      const f = c.footer
      const up = (p: Partial<typeof f>) => set('footer', { ...f, ...p })
      return (
        <>
          <Group>
            <Text label="نبذة عن المنصة" value={f.about} onChange={(v) => up({ about: v })} multiline rows={2} />
            <Row>
              <Text label="عنوان الروابط السريعة" value={f.quickLinksTitle} onChange={(v) => up({ quickLinksTitle: v })} />
              <Text label="عنوان عمود الشركة" value={f.companyTitle} onChange={(v) => up({ companyTitle: v })} />
            </Row>
            <Row>
              <Text label="عنوان عمود التواصل" value={f.contactTitle} onChange={(v) => up({ contactTitle: v })} />
              <Text label="حقوق النشر" value={f.copyright} onChange={(v) => up({ copyright: v })} />
            </Row>
          </Group>
          <LinksList title="روابط الشركة" items={f.companyLinks} onChange={(v) => up({ companyLinks: v })} />
        </>
      )
    },
  },
]

