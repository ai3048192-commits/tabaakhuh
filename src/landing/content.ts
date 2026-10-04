/**
 * The public landing page's editable content.
 *
 * Everything a visitor reads on `/` — headlines, images, steps, FAQ, store
 * links, social links, contact details — lives in one JSON document that the
 * admin edits from Settings → "محتوى الصفحة الرئيسية" and the backend stores
 * as-is (`GET /landing-content`, `PUT /admin/landing-content`).
 *
 * `DEFAULT_LANDING_CONTENT` is what the page shows before anything is saved,
 * and fills any field a stored document is missing (see `mergeWithDefaults`),
 * so adding a field here never breaks a page that was saved before it existed.
 */
import type { IconKey } from './icons'

/** Empty string = use the bundled image that ships with the site. */
export type ImageUrl = string

export interface LinkItem { id: string; label: string; href: string }
export interface StatItem { id: string; icon: IconKey; value: string; label: string }
export interface StepItem { id: string; icon: IconKey; title: string; text: string }
export interface DishItem { id: string; name: string; image: ImageUrl; rate: string; price: string; tag: string }
export interface FeatureItem { id: string; icon: IconKey; title: string; text: string; ctaLabel: string; ctaHref: string }
export interface JoinStepItem { id: string; icon: IconKey; badge: string; title: string; text: string }
export interface FaqItem { id: string; question: string; hint: string; answer: string }

export type SocialPlatform =
  | 'facebook' | 'instagram' | 'x' | 'tiktok' | 'youtube'
  | 'whatsapp' | 'snapchat' | 'linkedin' | 'telegram'

export interface SocialItem { id: string; platform: SocialPlatform; label: string; url: string }

/** Every section can be hidden without losing its content. */
interface Section { enabled: boolean }

export interface LandingContent {
  brand: {
    name: string
    logo: ImageUrl
    loginLabel: string
    showLogin: boolean
    navLinks: LinkItem[]
  }
  hero: Section & {
    badge: string
    titleLine1: string
    titleHighlight: string
    description: string
    primaryCta: { label: string; href: string }
    secondaryCta: { label: string; href: string }
    image: ImageUrl
    imageAlt: string
    floatingBadge: string
    stats: StatItem[]
  }
  why: Section & {
    title: string
    description: string
    note: string
    dishesBadge: string
    dishes: DishItem[]
  }
  features: Section & {
    cards: FeatureItem[]
    stats: StatItem[]
  }
  how: Section & {
    kicker: string
    title: string
    clientTab: string
    cookTab: string
    clientSteps: StepItem[]
    cookSteps: StepItem[]
  }
  joinCook: Section & {
    kicker: string
    title: string
    subtitle: string
    steps: JoinStepItem[]
    ctaLabel: string
    ctaHref: string
  }
  app: Section & {
    badge: string
    titleStart: string
    titleHighlight: string
    titleEnd: string
    description: string
    googlePlayUrl: string
    googlePlayLabel: string
    appStoreUrl: string
    appStoreLabel: string
    /** Optional screenshot shown instead of the built-in phone mockup. */
    screenshot: ImageUrl
    stats: StatItem[]
  }
  faq: Section & {
    badge: string
    title: string
    titleHighlight: string
    subtitle: string
    items: FaqItem[]
    supportTitle: string
    supportText: string
    supportCtaLabel: string
    supportCtaHref: string
  }
  cta: Section & {
    badge: string
    titleStart: string
    titleHighlight: string
    titleEnd: string
    description: string
    buttonLabel: string
    buttonHref: string
  }
  social: Section & {
    kicker: string
    title: string
    subtitle: string
    links: SocialItem[]
  }
  contact: Section & {
    kicker: string
    title: string
    subtitle: string
    phone: string
    whatsapp: string
    email: string
    address: string
    mapUrl: string
    hours: string
    /** The form composes an email / WhatsApp message — nothing is stored. */
    showForm: boolean
    formTitle: string
  }
  footer: {
    about: string
    quickLinksTitle: string
    companyTitle: string
    companyLinks: LinkItem[]
    contactTitle: string
    copyright: string
  }
}

export type SectionKey = {
  [K in keyof LandingContent]: LandingContent[K] extends Section ? K : never
}[keyof LandingContent]

let seq = 0
/** A short unique id for a new list item (React keys, editor reordering). */
export function newId(prefix = 'i'): string {
  seq += 1
  return `${prefix}${Date.now().toString(36)}${seq.toString(36)}`
}

export const DEFAULT_LANDING_CONTENT: LandingContent = {
  brand: {
    name: 'طباخه',
    logo: '',
    loginLabel: 'تسجيل دخول',
    showLogin: true,
    navLinks: [
      { id: 'n1', label: 'الرئيسية', href: '#home' },
      { id: 'n2', label: 'ليه طباخه؟', href: '#why' },
      { id: 'n3', label: 'بتشتغل إزاي؟', href: '#how' },
      { id: 'n4', label: 'حمّل التطبيق', href: '#app' },
      { id: 'n5', label: 'تواصل معنا', href: '#contact' },
    ],
  },
  hero: {
    enabled: true,
    badge: 'منصة أكل بيتي رقم ١ في مصر',
    titleLine1: 'أكل بيتي،',
    titleHighlight: 'من إيدين أمينة',
    description: 'اطلبي أكل بيتي طازة من أحسن ستّات بيوت في منطقتك، متحضّر بحب ووصله لحد باب بيتك.',
    primaryCta: { label: 'اطلب دلوقتي 🔥', href: '#app' },
    secondaryCta: { label: 'اعرف أكتر', href: '#how' },
    image: '',
    imageAlt: 'سفرة أكل بيتي مصري',
    floatingBadge: 'يوصل في ٣٠ دقيقة بضمان الجودة',
    stats: [
      { id: 'hs1', icon: 'chef', value: '+٥٠٠', label: 'طباخة موثّقة' },
      { id: 'hs2', icon: 'package', value: '+٢٠ ألف', label: 'طلب ناجح' },
      { id: 'hs3', icon: 'star', value: '٤.٩', label: 'تقييم العملاء' },
    ],
  },
  why: {
    enabled: true,
    title: 'أكل صحي وطازة، بضمير',
    description: 'كل الأصناف بتتحضّر يوم الطلب من مكوّنات طازة، من غير مواد حافظة ولا تلوين.',
    note: 'وكل طلب بيوصل دخل لأسرة مصرية، وبيدّي فرصة لستّ بيت شاطرة إنها تكسب من شغل إيدها.',
    dishesBadge: 'أشهر الأطباق البيتي اليومية 🔥',
    dishes: [
      { id: 'd1', name: 'كشري بلدي', image: '', rate: '٤.٩', price: '٤٥ ج', tag: 'طازة وحالاً' },
      { id: 'd2', name: 'محشي كرنب', image: '', rate: '٤.٨', price: '٦٥ ج', tag: 'طازة وحالاً' },
      { id: 'd3', name: 'فراخ مشوية', image: '', rate: '٥.٠', price: '٩٠ ج', tag: 'طازة وحالاً' },
    ],
  },
  features: {
    enabled: true,
    cards: [
      {
        id: 'f1', icon: 'shield', title: 'طباخات موثّقة',
        text: 'بنراجع بيانات ومطبخ كل طباخة بدقة قبل التفعيل، عشان تطمّني على مصدر أكلك ونضافته بجودة عالية.',
        ctaLabel: '', ctaHref: '',
      },
      {
        id: 'f2', icon: 'sparkles', title: 'نقاط ومكافآت',
        text: 'اكسبي نقاط مع كل أوردر واستبدليها بخصومات حقيقية على طلباتك الجاية.',
        ctaLabel: 'اعرف أكتر', ctaHref: '#app',
      },
    ],
    stats: [
      { id: 'fs1', icon: 'clock', value: '٣٠ – ٤٥ دقيقة', label: 'سرعة التوصيل' },
      { id: 'fs2', icon: 'chef', value: '+٥٠٠ طباخة', label: 'ست بيت حريفة' },
      { id: 'fs3', icon: 'package', value: '+٢٠ ألف', label: 'طلب ناجح' },
      { id: 'fs4', icon: 'star', value: '٤.٩ / ٥', label: 'تقييم العملاء' },
    ],
  },
  how: {
    enabled: true,
    kicker: 'بتشتغل إزاي؟',
    title: '٤ خطوات وبس وتاكل أحلى أكل بيتي',
    clientTab: 'طلب الأكل (كعميل) 🍽️',
    cookTab: 'تقديم الأكل (كطباخة) 👩‍🍳',
    clientSteps: [
      { id: 'c1', icon: 'search', title: 'اتصفّحي', text: 'اختاري منطقتك وشوفي الطباخات والمنيو المتاح دلوقتي.' },
      { id: 'c2', icon: 'clipboard', title: 'اطلبي', text: 'ضيفي الأصناف للسلة وأكّدي الطلب في ثواني.' },
      { id: 'c3', icon: 'card', title: 'ادفعي', text: 'كاش عند الاستلام أو أونلاين، زي ما يريّحك.' },
      { id: 'c4', icon: 'package', title: 'استلمي', text: 'الدليفري بيجيبهولك سخن لحد باب البيت.' },
    ],
    cookSteps: [
      { id: 'k1', icon: 'badge', title: 'سجّلي', text: 'اعملي حساب وارفعي بياناتك وصور مطبخك.' },
      { id: 'k2', icon: 'chef', title: 'ضيفي أكلك', text: 'صوّري أصنافك وحطّي الأسعار والمواعيد.' },
      { id: 'k3', icon: 'bell', title: 'استقبلي الطلبات', text: 'يوصلك إشعار بكل طلب جديد على طول.' },
      { id: 'k4', icon: 'wallet', title: 'حصّلي فلوسك', text: 'أرباحك بتتحوّل لك أول بأول من غير تعقيد.' },
    ],
  },
  joinCook: {
    enabled: true,
    kicker: 'اشتغلي معانا',
    title: 'ابدئي رحلتك كطباخة ودخلي ربح حلال من بيتك',
    subtitle: 'حوّلي شطارتك وموهبتك في المطبخ لدخل ثابت ومستمر. الانضمام سهل وبيتم في دقايق من خلال تطبيق طباخه.',
    steps: [
      { id: 'j1', icon: 'badge', badge: 'أول خطوة', title: 'سجّلي من التطبيق', text: 'نزّلي تطبيق طباخه، قدّمي كطباخة بسهولة، وارفعي صور مطبخك وأطباقك المميزة.' },
      { id: 'j2', icon: 'chef', badge: 'جهزي الأكل', title: 'ضيفي أكلك للمنيو', text: 'حطّي أحلى أكلاتك في المنيو، حددّي أسعارك بنفسك، ومواعيد استلام الطلبات.' },
      { id: 'j3', icon: 'wallet', badge: 'احسبي أرباحك', title: 'اكسبي ووسّعي شغلك', text: 'استقبلي طلبات الزباين، حضّري الأكل بحب، وحصّلي أرباحك أول بأول وبكل أمان.' },
    ],
    ctaLabel: 'سجّلي كطباخة دلوقتي',
    ctaHref: '#app',
  },
  app: {
    enabled: true,
    badge: 'تطبيق طباخه وصل رسمياً',
    titleStart: 'اطلب أكل بيتي',
    titleHighlight: 'على أصوله',
    titleEnd: '، ودلع بطنك!',
    description: 'اكتشف أطعم الأكلات المصرية البيتي من أيد ستات حريفة جمبك، تابع طلبك لحظة بلحظة، واكسب نقاط وهدايا مع كل أوردر.',
    googlePlayUrl: '',
    googlePlayLabel: 'Google Play',
    appStoreUrl: '',
    appStoreLabel: 'App Store',
    screenshot: '',
    stats: [
      { id: 'as1', icon: 'star', value: '٤.٩ / ٥', label: 'تقييم المتاجر' },
      { id: 'as2', icon: 'package', value: '+٢٠ ألف', label: 'عملية تحميل' },
    ],
  },
  faq: {
    enabled: true,
    badge: 'المطبخ المفتوح للإجابات والفضول 🍳',
    title: 'كل اللي بيدور في بالك',
    titleHighlight: 'جبنالك إجابته على الفرازة',
    subtitle: 'مش مجرد أسئلة تقليدية، دي كبسولات سريعة تفهمك إحنا بنعمل الأكل إزاي، وبنحافظ على طزاجته لحد باب بيتك بإيه.',
    items: [
      { id: 'q1', question: 'هو الأكل بيتعمل إمتى وهل هو طازة بجد؟', hint: 'سؤال المحطة الأولى والأساس في طباخه', answer: 'أكيد طبعاً! مفيش أي أكل بايت أو متخزن في ثلاجات. كل طلب بيتحضّر "فوري وحصري" يوم الطلب بالظبط من أيد ست البيت، وبمكونات طازة وبلدي 100% من غير أي مواد حافظة أو ألوان صناعية. ريحة الأكل لوحدها هتشهد لك!' },
      { id: 'q2', question: 'إزاي بتضمنوا نضافة مطابخ الطباخات؟', hint: '', answer: 'الأمان والنضافة عندنا خط أحمر! بنعمل معاينة دقيقة ومراجعة كاملة لبيانات ومطبخ كل ست بيت قبل انضمامها للتطبيق، وبنتابع الجودة بصفة دورية لضمان أعلى معايير النضافة والتعقيم.' },
      { id: 'q3', question: 'أوقات التوصيل بتاخد وقت قد إيه؟', hint: '', answer: 'عشان الأكل بيتعمل فريش خصيصاً ليك، بياخد وقت التحضير المعتاد، وبعدها يوصلك ساخن وطازة خلال من 30 إلى 45 دقيقة حسب منطقتك وقرب الطباخة منك، مع تتبع لحظي من التطبيق.' },
      { id: 'q4', question: 'إزاي أستفيد من نظام النقاط والمكافآت؟', hint: '', answer: 'كل أوردر بتطلبه من التطبيق بيكسبك نقاط حقيقية. اجمعها واستبدلها بخصومات وهدايا على طلباتك الجاية، وكل ما طلبت أكتر كل ما زادت مكافآتك!' },
      { id: 'q5', question: 'لو أنا ست بيت وشاطرة في الطبخ، أقدر أنضم إزاي؟', hint: 'ابدئي مشروعك الخاص من مطبخك بكل أمان', answer: 'تنورينا طبعا! كل اللي عليكِ تحمّلي تطبيق "طباخه" وتختاري "تسجيل كطباخة"، وهنبسط لك كل الخطوات عشان تبدئي تكسبي من شطارتك وشغل إيدك بكل راحة وأمان وأنتِ في بيتك.' },
    ],
    supportTitle: 'عندك سؤال تاني لسه ماجاوبناش عليه؟ 💡',
    supportText: 'فريق الدعم الفني معاك لحظة بلحظة جوه التطبيق لأي استفسار أو طلب خاص.',
    supportCtaLabel: 'تواصل مع خدمة العملاء',
    supportCtaHref: '#contact',
  },
  cta: {
    enabled: true,
    badge: 'طازة وساخن لحد باب بيتك 🍲',
    titleStart: 'جرّب',
    titleHighlight: 'طباخه',
    titleEnd: 'النهاردة',
    description: 'اطلب أكل بيتي طازة من أقرب طباخة ليك، ووصله لحد باب البيت بجودة مطاعم 5 نجوم وبنَفَس البيت الأصيل.',
    buttonLabel: 'حمّل التطبيق دلوقتي',
    buttonHref: '#app',
  },
  social: {
    enabled: true,
    kicker: 'تابعنا',
    title: 'خليك قريب من مطبخ طباخه',
    subtitle: 'عروض يومية، أكلات جديدة، وحكايات الستّات الشاطرات — كله على صفحاتنا.',
    links: [
      { id: 's1', platform: 'facebook', label: 'فيسبوك', url: '' },
      { id: 's2', platform: 'instagram', label: 'إنستجرام', url: '' },
      { id: 's3', platform: 'tiktok', label: 'تيك توك', url: '' },
      { id: 's4', platform: 'whatsapp', label: 'واتساب', url: '' },
    ],
  },
  contact: {
    enabled: true,
    kicker: 'تواصل معانا',
    title: 'إحنا هنا عشانك',
    subtitle: 'عندك سؤال أو اقتراح أو عايزة تنضمي كطباخة؟ ابعتيلنا وهنرد عليكي في أسرع وقت.',
    phone: '01555641619',
    whatsapp: '01555641619',
    email: 'tabbakha.info@gmail.com',
    address: 'القاهرة، مصر',
    mapUrl: '',
    hours: 'يوميًا من ١٠ الصبح لـ ١٢ بالليل',
    showForm: true,
    formTitle: 'ابعتلنا رسالة',
  },
  footer: {
    about: 'منصة أكل بيتي بتوصّل طبخ الستّات الشاطرات لكل بيت في مصر.',
    quickLinksTitle: 'روابط سريعة',
    companyTitle: 'الشركة',
    companyLinks: [
      { id: 'fl1', label: 'عن طباخه', href: '#why' },
      // Static pages served next to this SPA from the backend repo's site/
      { id: 'fl2', label: 'الشروط والأحكام', href: '/terms/' },
      { id: 'fl3', label: 'سياسة الخصوصية', href: '/privacy/' },
    ],
    contactTitle: 'تواصل معنا',
    copyright: '© ٢٠٢٦ طباخه. كل الحقوق محفوظة.',
  },
}

const isPlainObject = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v)

/**
 * Overlay a stored document on the defaults: objects merge key by key, lists
 * and scalars from the stored side win when their type matches the default's,
 * and anything of the wrong type falls back to the default. The result always
 * has every field the page reads.
 */
export function mergeWithDefaults<T>(defaults: T, stored: unknown): T {
  if (isPlainObject(defaults)) {
    if (!isPlainObject(stored)) return defaults
    const out: Record<string, unknown> = { ...defaults }
    for (const key of Object.keys(defaults)) {
      out[key] = mergeWithDefaults((defaults as Record<string, unknown>)[key], stored[key])
    }
    return out as T
  }
  if (Array.isArray(defaults)) {
    if (!Array.isArray(stored)) return defaults
    const template = defaults[0]
    // List items get their own default-fill so an old item missing a newer
    // field still renders; items without an id get one.
    return stored
      .filter((item) => template === undefined || isPlainObject(item))
      .map((item) => {
        const merged = template === undefined ? item : mergeWithDefaults(blank(template), item)
        if (isPlainObject(merged) && typeof merged.id !== 'string') merged.id = newId()
        return merged
      }) as T
  }
  if (typeof stored === typeof defaults) return stored as T
  return defaults
}

/** An empty copy of a list item: same keys, empty strings / false / first enum value. */
function blank<T>(template: T): T {
  if (!isPlainObject(template)) return template
  const out: Record<string, unknown> = {}
  for (const [k, v] of Object.entries(template)) {
    if (k === 'icon' || k === 'platform') out[k] = v
    else if (typeof v === 'string') out[k] = ''
    else if (typeof v === 'boolean') out[k] = false
    else out[k] = v
  }
  return out as T
}
