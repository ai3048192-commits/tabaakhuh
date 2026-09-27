/**
 * Everything the warning letter *says*, kept in one file so the wording can be
 * reviewed (and revised by the business or legal team) without touching layout
 * or logic. Nothing here is fetched: the backend has no warnings or policies
 * endpoint, so this is the single source of the text.
 */

export type WarnableRole = 'cook' | 'driver'
export type WarningLevel = 'first' | 'second' | 'final'

export const COMPANY = {
  name: 'طباخه',
  tagline: 'منصة الأكل البيتي المصري',
  phone: '01555641619',
  email: 'tabbakha.info@gmail.com',
} as const

export const LEVEL_LABELS: Record<WarningLevel, string> = {
  first: 'إنذار أول',
  second: 'إنذار ثانٍ',
  final: 'إنذار نهائي',
}

export const ROLE_TITLES: Record<WarnableRole, string> = {
  cook: 'طباخة / طباخ معتمد على المنصة',
  driver: 'سائق توصيل معتمد على المنصة',
}

export const OTHER_VIOLATION = 'other'

/** Preset violations per role; the admin picks one, or "other" and describes it. */
export const VIOLATIONS: Record<WarnableRole, { id: string; label: string }[]> = {
  cook: [
    { id: 'late_prep', label: 'التأخير في تجهيز الطلبات عن المواعيد المحددة' },
    { id: 'hygiene', label: 'مخالفة معايير النظافة وسلامة الغذاء' },
    { id: 'mismatch', label: 'عدم مطابقة الطلب للوصف أو الصور أو الكمية المعلنة' },
    { id: 'cancellations', label: 'إلغاء طلبات مقبولة دون عذر مقبول' },
    { id: 'complaints', label: 'تكرار شكاوى العملاء' },
    { id: 'conduct', label: 'سوء التعامل مع العملاء أو السائقين أو فريق العمل' },
    { id: 'off_platform', label: 'التعامل مع العملاء خارج المنصة' },
  ],
  driver: [
    { id: 'late_delivery', label: 'التأخير في توصيل الطلبات' },
    { id: 'conduct', label: 'سوء التعامل مع العملاء أو الطباخات أو فريق العمل' },
    { id: 'tampering', label: 'العبث بالطلبات أو إتلافها أثناء التوصيل' },
    { id: 'cancellations', label: 'رفض أو إلغاء طلبات مقبولة دون عذر مقبول' },
    { id: 'traffic', label: 'مخالفة قواعد المرور والسلامة' },
    { id: 'cash', label: 'مخالفات في تحصيل المبالغ أو تسليمها' },
    { id: 'off_platform', label: 'التعامل مع العملاء خارج المنصة' },
  ],
}

/** Binding on every partner, whatever their role. */
export const GENERAL_POLICIES: string[] = [
  'الالتزام الكامل بشروط وأحكام استخدام منصة طباخه وسياسة الخصوصية المعمول بها.',
  'التعامل باحترام ومهنية مع العملاء وفريق العمل وسائر الشركاء، ويُحظر أي إساءة لفظية أو سلوكية.',
  'يُحظر التواصل مع العملاء أو التعامل معهم ماليًا خارج المنصة، أو استخدام بياناتهم لأي غرض آخر.',
  'صحة جميع البيانات والمستندات المقدّمة للمنصة، وتحديثها فور حدوث أي تغيير فيها.',
  'الالتزام بالمواعيد، وعدم رفض أو إلغاء الطلبات المقبولة إلا لعذر مقبول يُبلَّغ به فريق الدعم.',
]

export const ROLE_POLICIES: Record<WarnableRole, string[]> = {
  cook: [
    'تطبيق معايير النظافة وسلامة الغذاء في كل مراحل التحضير والتخزين والتغليف.',
    'مطابقة الأطباق للوصف والصور والكميات المعلنة، واستخدام مكونات طازجة وصالحة للاستهلاك.',
    'الإفصاح عن مسببات الحساسية الأساسية في مكونات الأطباق.',
    'تجهيز الطلب في الوقت المحدد وتسليمه للسائق مغلفًا بإحكام.',
    'عدم تعديل الأسعار أو طلب أي مبالغ إضافية خارج ما هو معلن على المنصة.',
  ],
  driver: [
    'استلام الطلبات وتوصيلها في المواعيد المحددة دون تأخير غير مبرر.',
    'الحفاظ على سلامة الطلب مغلقًا كما استُلم، وعدم فتحه أو العبث به بأي شكل.',
    'الالتزام بقواعد المرور، وحمل رخصة قيادة ورخصة مركبة ساريتين طوال فترة العمل.',
    'تحصيل المبلغ المستحق فقط، وتوريد المبالغ المحصلة في مواعيدها المحددة.',
    'المظهر اللائق والتعامل المهذب مع العميل عند التسليم.',
  ],
}

export const CONSEQUENCES: string[] = [
  'تكرار المخالفة بعد الإنذار الأول يترتب عليه إنذار ثانٍ، وقد يصاحبه إيقاف مؤقت للحساب.',
  'أي مخالفة بعد الإنذار النهائي تؤدي إلى إيقاف الحساب نهائيًا وإنهاء التعاقد مع المنصة.',
  'المخالفات الجسيمة — كالاحتيال أو الإساءة أو تعريض سلامة العملاء للخطر — قد تؤدي إلى الإيقاف النهائي فورًا دون إنذار مسبق، مع احتفاظ الشركة بحقها في اتخاذ الإجراءات القانونية.',
]

export const LEVEL_CLOSING: Record<WarningLevel, string> = {
  first:
    'ونأمل ألا تتكرر هذه المخالفة، علمًا بأن تكرارها سيترتب عليه اتخاذ إجراءات أشد وفقًا لسياسات المنصة.',
  second:
    'ونلفت انتباهكم إلى أن هذا هو الإنذار الثاني، وأن أي مخالفة لاحقة ستؤدي إلى إصدار إنذار نهائي وقد يصاحبها إيقاف مؤقت للحساب.',
  final:
    'ونؤكد أن هذا هو الإنذار الأخير، وأن أي مخالفة لاحقة ستؤدي إلى إيقاف الحساب نهائيًا وإنهاء التعاقد دون إشعار آخر.',
}
