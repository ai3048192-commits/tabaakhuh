import type { UserRole, UserStatus } from './types'

/** Arabic, RTL-first. */
export const userMessages = {
  pageTitle: 'إدارة المستخدمين',
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

  colId: '#',
  colName: 'المستخدم',
  colContact: 'التواصل',
  colRole: 'الدور',
  colStatus: 'الحالة',
  colJoined: 'تاريخ الانضمام',
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

  statusDoneToast: 'تم تحديث حالة المستخدم.',
  notFoundToast: 'تعذّر العثور على المستخدم.',
  retryToast: 'تعذّر إتمام العملية. حاول مرة أخرى.',
  refreshFailedToast: 'تعذّر التحديث. حاول مرة أخرى.',

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
