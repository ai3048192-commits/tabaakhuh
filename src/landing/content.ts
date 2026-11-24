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
  /** Its own page, `/contact` — linked from the menu as «تواصل معنا». */
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
    navLinks: [
      { id: 'n1', label: 'الرئيسية', href: '#home' },
      { id: 'n2', label: 'ليه طباخه؟', href: '#why' },
      { id: 'n3', label: 'بتشتغل إزاي؟', href: '#how' },
      { id: 'n4', label: 'حمّل التطبيق', href: '#app' },
      { id: 'n5', label: 'تواصل معنا', href: '/contact' },
    ],
  },
  hero: {
    enabled: true,
    badge: 'أكل بيتي من مطابخ حقيقية قريبة منك',
    titleLine1: 'أكل بيتي،',
    titleHighlight: 'من إيدين أمينة',
    description: 'اطلب أكل بيتي متحضّر يوم الطلب من ستّات بيوت في منطقتك، بنراجع مطبخ كل واحدة فيهم قبل ما تبدأ، والدليفري يوصّله لحد باب بيتك.',
    primaryCta: { label: 'حمّل التطبيق', href: '#app' },
    secondaryCta: { label: 'بتشتغل إزاي؟', href: '#how' },
    image: '',
    imageAlt: 'سفرة أكل بيتي مصري',
    floatingBadge: 'بيتحضّر طازة ويوصلك سخن',
    stats: [
      { id: 'hs1', icon: 'shield', value: 'طباخات متراجَعات', label: 'بنراجع البيانات والمطبخ قبل التفعيل' },
      { id: 'hs2', icon: 'leaf', value: 'يتطبخ يوم الطلب', label: 'من غير مواد حافظة' },
      { id: 'hs3', icon: 'card', value: 'كاش أو أونلاين', label: 'ادفع زي ما يريّحك' },
    ],
  },
  why: {
    enabled: true,
    title: 'أكل صحي وطازة، بضمير',
    description: 'كل صنف بيتحضّر يوم الطلب من مكوّنات طازة، من غير مواد حافظة ولا ألوان صناعية — زي أكل البيت بالظبط.',
    note: 'وكل طلب بيوصل دخل لأسرة مصرية، وبيدّي فرصة لستّ بيت شاطرة إنها تكسب من شغل إيدها.',
    dishesBadge: 'أمثلة من الأكل البيتي اللي بتقدّمه الطباخات',
    dishes: [
      { id: 'd1', name: 'كشري بلدي', image: '', rate: '', price: '', tag: 'أكل شعبي' },
      { id: 'd2', name: 'محشي كرنب', image: '', rate: '', price: '', tag: 'محاشي' },
      { id: 'd3', name: 'فراخ مشوية', image: '', rate: '', price: '', tag: 'مشويات' },
    ],
  },
  features: {
    enabled: true,
    cards: [
      { id: 'f1', icon: 'shield', title: 'طباخات موثّقة', text: 'بنراجع بيانات وصور مطبخ كل طباخة قبل ما حسابها يتفعّل، عشان تبقى مطمّن على مصدر أكلك ونضافته.', ctaLabel: '', ctaHref: '' },
      { id: 'f2', icon: 'gift', title: 'نقاط ومكافآت', text: 'كل أوردر بيكسّبك نقاط تقدر تستبدلها بخصومات على طلباتك الجاية.', ctaLabel: 'حمّل التطبيق', ctaHref: '#app' },
    ],
    stats: [
      { id: 'fs1', icon: 'clock', value: '٣٠ – ٤٥ دقيقة', label: 'توصيل بعد التحضير' },
      { id: 'fs2', icon: 'truck', value: 'تتبّع لحظي', label: 'لحد ما الأوردر يوصل' },
      { id: 'fs3', icon: 'card', value: 'كاش أو أونلاين', label: 'طرق دفع مرنة' },
      { id: 'fs4', icon: 'handshake', value: 'دعم جوه التطبيق', label: 'لأي استفسار أو مشكلة' },
    ],
  },
  how: {
    enabled: true,
    kicker: 'بتشتغل إزاي؟',
    title: '٤ خطوات بسيطة',
    clientTab: 'لو هتطلب أكل',
    cookTab: 'لو هتطبخي معانا',
    clientSteps: [
      { id: 'c1', icon: 'search', title: 'اختار', text: 'حدّد منطقتك وشوف الطباخات القريبة منك والمنيو المتاح.' },
      { id: 'c2', icon: 'clipboard', title: 'اطلب', text: 'ضيف الأصناف للسلة وأكّد الطلب في ثواني.' },
      { id: 'c3', icon: 'card', title: 'ادفع', text: 'كاش عند الاستلام أو أونلاين، زي ما يريّحك.' },
      { id: 'c4', icon: 'package', title: 'استلم', text: 'تابع طلبك من التطبيق لحد ما الدليفري يوصّله لباب البيت.' },
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
    title: 'مطبخك يقدر يبقى مصدر دخل',
    subtitle: 'لو شاطرة في الطبخ، حوّلي شغل إيدك لدخل من بيتك. التقديم من تطبيق طباخه، وبعد مراجعة بياناتك ومطبخك تقدري تبدئي تستقبلي طلبات.',
    steps: [
      { id: 'j1', icon: 'badge', badge: 'الخطوة ١', title: 'قدّمي من التطبيق', text: 'نزّلي تطبيق طباخه، اختاري «تسجيل كطباخة»، وارفعي بياناتك وصور مطبخك.' },
      { id: 'j2', icon: 'chef', badge: 'الخطوة ٢', title: 'جهّزي المنيو', text: 'بعد التفعيل، ضيفي أصنافك بالصور، وحدّدي أسعارك ومواعيد استقبال الطلبات بنفسك.' },
      { id: 'j3', icon: 'wallet', badge: 'الخطوة ٣', title: 'اطبخي واكسبي', text: 'استقبلي الطلبات، حضّري الأكل، والدليفري يستلمه منك. أرباحك بتتحوّل لك أول بأول.' },
    ],
    ctaLabel: 'سجّلي كطباخة دلوقتي',
    ctaHref: '#app',
  },
  app: {
    enabled: true,
    badge: 'تطبيق واحد للعميل والطباخة',
    titleStart: 'كل اللي محتاجه',
    titleHighlight: 'في تطبيق واحد',
    titleEnd: '',
    description: 'اختار من طباخات منطقتك، اطلب في ثواني، تابع الأوردر لحظة بلحظة، واجمع نقاط مع كل طلب. ولو بتطبخي، قدّمي كطباخة من نفس التطبيق.',
    googlePlayUrl: '',
    googlePlayLabel: 'Google Play',
    appStoreUrl: '',
    appStoreLabel: 'App Store',
    screenshot: '',
    stats: [
      { id: 'as1', icon: 'truck', value: 'تتبّع الطلب', label: 'لحظة بلحظة' },
      { id: 'as2', icon: 'gift', value: 'نقاط ومكافآت', label: 'مع كل أوردر' },
    ],
  },
  faq: {
    enabled: true,
    badge: 'أسئلة شائعة',
    title: 'عندك سؤال؟',
    titleHighlight: 'غالبًا إجابته هنا',
    subtitle: 'أكتر الأسئلة اللي بتوصلنا عن الأكل، النضافة، التوصيل، والانضمام كطباخة.',
    items: [
      { id: 'q1', question: 'الأكل بيتعمل إمتى؟ وهل هو طازة فعلًا؟', hint: '', answer: 'كل طلب بيتحضّر يوم الطلب في مطبخ الطباخة، من مكوّنات طازة ومن غير مواد حافظة أو ألوان صناعية. مفيش مخزن أو مطبخ مركزي — الأكل بيطلع من البيت لبيتك.' },
      { id: 'q2', question: 'إزاي بتتأكدوا من نضافة مطابخ الطباخات؟', hint: '', answer: 'قبل ما حساب أي طباخة يتفعّل، بنراجع بياناتها وصور مطبخها. وبعد كده تقييمات وشكاوى العملاء بتتابَع باستمرار، وأي مشكلة في الجودة أو النضافة بنتعامل معاها فورًا.' },
      { id: 'q3', question: 'التوصيل بياخد وقت قد إيه؟', hint: '', answer: 'الأكل بيتعمل مخصوص ليك، فبياخد وقت التحضير الأول، وبعدها التوصيل بياخد في المتوسط من ٣٠ لـ ٤٥ دقيقة حسب منطقتك وبُعد الطباخة عنك. وتقدر تتابع الطلب لحظة بلحظة من التطبيق.' },
      { id: 'q4', question: 'إزاي أدفع؟', hint: '', answer: 'تقدر تدفع كاش عند الاستلام أو أونلاين من التطبيق، اختار اللي يريّحك وقت تأكيد الطلب.' },
      { id: 'q5', question: 'نظام النقاط بيشتغل إزاي؟', hint: '', answer: 'كل أوردر بتطلبه من التطبيق بيكسّبك نقاط، وتقدر تستبدلها بخصومات على طلباتك الجاية.' },
      { id: 'q6', question: 'أنا شاطرة في الطبخ، أنضم إزاي؟', hint: '', answer: 'حمّلي تطبيق طباخه واختاري «تسجيل كطباخة»، وارفعي بياناتك وصور مطبخك. بعد المراجعة والتفعيل تقدري تضيفي أصنافك وتحدّدي أسعارك ومواعيدك وتبدئي تستقبلي طلبات.' },
    ],
    supportTitle: 'لسه عندك سؤال؟',
    supportText: 'فريق خدمة العملاء موجود يوميًا يرد على أي استفسار أو مشكلة في طلبك.',
    supportCtaLabel: 'تواصل معانا',
    supportCtaHref: '/contact',
  },
  cta: {
    enabled: true,
    badge: 'طازة وسخن لحد باب بيتك',
    titleStart: 'جرّب',
    titleHighlight: 'طباخه',
    titleEnd: 'النهاردة',
    description: 'أكل بيتي من مطبخ قريب منك، متحضّر يوم الطلب، وبيوصلك لحد الباب.',
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
    subtitle: 'عندك سؤال عن طلب، اقتراح، أو عايز تعرف أكتر عن الانضمام كطباخة؟ ابعتلنا وهنرد عليك في أسرع وقت.',
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
