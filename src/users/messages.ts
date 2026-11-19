import type { UserRole, UserStatus } from './types'

/** Arabic, RTL-first. */
export const userMessages = {
  pageTitle: 'إدارة المستخدمين',
  subtitle: 'كل حسابات المنصة: ابحث، راجع، وعلّق أو فعّل الحسابات.',

  /** Per-screen titles: `/users` (all), `/customers`, `/cooks`, `/drivers`. */
  scope: {
    all: { title: 'كل الحسابات', subtitle: 'كل حسابات المنصة: عملاء وطباخات وسائقين ومديرين.', unit: 'حساب' },
    customer: { title: 'إدارة العملاء', subtitle: 'كل العملاء: بياناتهم، بقالهم قد إيه، وطلباتهم وفلوسهم.', unit: 'عميل' },
    cook: { title: 'إدارة الطباخات', subtitle: 'الطباخات المعتمدات: بيانات التسجيل، الطلبات، والأرباح.', unit: 'طباخة' },
    driver: { title: 'إدارة الدليفري', subtitle: 'السائقين المعتمدين: بيانات التسجيل، التوصيلات، والأرباح.', unit: 'سائق' },
  },
  viewProfile: 'عرض الملف',
  refresh: 'تحديث',
  loading: 'جارٍ تحميل المستخدمين…',
  listError: 'حدث خطأ ما. حاول مرة أخرى.',
  retry: 'إعادة المحاولة',
  empty: 'لا يوجد مستخدمون.',
  emptyFiltered: 'لا يوجد مستخدمون مطابقون لهذه الفلاتر.',

  searchLabel: 'بحث بالاسم أو الإيميل أو التليفون',
  filterRole: 'الدور',
  filterStatus: 'الحالة',
  allRoles: 'كل الأدوار',
  allStatuses: 'كل الحالات',
  filterVerified: 'التفعيل',
  allVerified: 'الكل',

  colId: '#',
  colName: 'المستخدم',
  colContact: 'التواصل',
  colRole: 'الدور',
  colStatus: 'الحالة',
  verified: 'مفعّل',
  unverified: 'لم يفعّل',
  verifiedHint: 'أكّد إيميله وفعّل حسابه',
  unverifiedHint: 'لسه ما أكّدش إيميله',
  colJoined: 'على التطبيق من',
  colActions: 'إجراءات',

  view: 'عرض',
  suspend: 'إيقاف',
  reactivate: 'إعادة التفعيل',
  selfRow: 'حسابك',

  detailTitle: (name: string) => `تفاصيل ${name}`,
  close: 'إغلاق',
  fieldEmail: 'الإيميل',
  fieldPhone: 'التليفون',
  fieldRole: 'الدور',
  fieldStatus: 'الحالة',
  fieldJoined: 'تاريخ الانضمام',

  confirmTitle: (name: string, next: UserStatus) =>
    next === 'suspended' ? `إيقاف ${name}؟` : `إعادة تفعيل ${name}؟`,
  confirmBody: (next: UserStatus) =>
    next === 'suspended'
      ? 'لن يستطيع هذا المستخدم الدخول، وستُلغى جلساته الحالية فورًا.'
      : 'سيستعيد هذا المستخدم صلاحية الدخول.',
  confirmCta: 'تأكيد',
  cancel: 'إلغاء',

  reasonLabel: 'سبب الإيقاف',
  reasonPlaceholder: 'اكتب سبب إيقاف الحساب…',
  reasonRequired: 'سبب الإيقاف إلزامي.',

  delete: 'حذف الحساب نهائيًا',
  deleteTitle: (name: string) => `حذف ${name} نهائيًا؟`,
  deleteBody: (role: string) => `هيتمسح الحساب ده (${role}) وكل بياناته من قاعدة البيانات:`,
  deleteWhat: [
    'بيانات الحساب والملف الشخصي والصور والمستندات',
    'كل الطلبات المرتبطة بيه (وطلبات المطبخ لو طباخة) والتقييمات',
    'الأطباق والعقد والمحفظة وطلبات السحب',
    'العناوين والسلة والشكاوى والإشعارات',
  ],
  deleteIrreversible: 'الحذف ده مالوش رجوع — مش هتقدر تسترجع أي حاجة بعده.',
  deleteConfirmWord: 'حذف',
  deleteTypeLabel: (word: string) => `للتأكيد اكتب «${word}»`,
  deleteCta: 'احذف نهائيًا',
  deleting: 'جارٍ الحذف…',
  deletedToast: (name: string) => `تم حذف ${name} نهائيًا.`,
  deleteBlockedToast: 'الحساب عليه طلب مفتوح — الغِ الطلب الأول من «مراقبة الطلبات» وبعدين احذف.',
  deleteForbiddenToast: 'حسابات الأدمن ماينفعش تتحذف من هنا.',

  statusDoneToast: 'تم تحديث حالة المستخدم.',
  notFoundToast: 'تعذّر العثور على المستخدم.',
  retryToast: 'تعذّر إتمام العملية. حاول مرة أخرى.',
  refreshFailedToast: 'تعذّر التحديث. حاول مرة أخرى.',

  exportExcel: 'تصدير Excel',
  exportPdf: 'تصدير PDF',
  exporting: 'جارٍ التصدير…',
  exportFailed: 'تعذّر تصدير الحسابات. حاول مرة أخرى.',

  roleLabels: {
    customer: 'عميل',
    cook: 'طاهٍ',
    driver: 'سائق',
    admin: 'أدمن',
  } as Record<UserRole, string>,

  statusLabels: {
    active: 'نشط',
    suspended: 'موقوف',
  } as Record<UserStatus, string>,
} as const
