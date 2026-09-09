/**
 * User-facing strings for cities management (Arabic, RTL-first).
 * Wording is provisional per spec Assumptions ("descriptive, not final copy").
 */
export const cityMessages = {
  pageTitle: 'إدارة المدن',
  subtitle: (n: number) => `${n} مدينة`,

  loading: 'جارٍ تحميل المدن…',
  listError: 'حصل خطأ أثناء تحميل المدن.',
  retry: 'إعادة المحاولة',
  refresh: 'تحديث',

  emptyNoCities: 'لا توجد مدن بعد.',
  emptyNoMatch: 'لا توجد مدن مطابقة لبحثك.',

  searchLabel: 'ابحث باسم المدينة',
  searchClear: 'مسح البحث',

  colNameAr: 'الاسم بالعربية',
  colNameEn: 'الاسم بالإنجليزية',
  colStatus: 'الحالة',
  colActions: 'إجراءات',

  statusActive: 'مُفعّلة',
  statusInactive: 'معطّلة',

  addCity: 'إضافة مدينة',
  editCity: 'تعديل اسم المدينة',

  fieldNameAr: 'الاسم بالعربية',
  fieldNameEn: 'الاسم بالإنجليزية',
  nameRequired: 'هذا الحقل مطلوب.',
  nameTooLong: 'الحد الأقصى 255 حرفاً.',
  atLeastOneName: 'أدخل الاسم بالعربية أو بالإنجليزية على الأقل.',
  nameDuplicateFallback: 'اسم المدينة مستخدم بالفعل.',

  save: 'حفظ',
  cancel: 'إلغاء',
  close: 'إغلاق',

  editLabel: (nameAr: string) => `تعديل مدينة ${nameAr}`,
  toggleToInactiveTitle: (nameAr: string) => `تعطيل مدينة ${nameAr}؟`,
  toggleToActiveTitle: (nameAr: string) => `تفعيل مدينة ${nameAr}؟`,
  toggleToInactiveBody: 'لن تظهر هذه المدينة للعملاء حتى يُعاد تفعيلها.',
  toggleToActiveBody: 'ستظهر هذه المدينة للعملاء مرة أخرى.',
  confirmToggle: 'تأكيد',
  rowToggleToInactive: (nameAr: string) => `تعطيل ${nameAr}`,
  rowToggleToActive: (nameAr: string) => `تفعيل ${nameAr}`,

  createdToast: 'تمت إضافة المدينة.',
  updatedToast: 'تم تحديث المدينة.',
  statusUpdatedToast: 'تم تحديث حالة المدينة.',
  notFoundToast: 'تعذّر العثور على المدينة.',
  mutationRetryToast: 'تعذّر إتمام العملية. حاول مرة أخرى.',
} as const
