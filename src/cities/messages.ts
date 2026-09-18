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
  editCity: 'تعديل',

  // --- Governorate picker (replaces the free-text add/edit form) -----------
  pickerTitle: 'المحافظات المتاحة',
  pickerSubtitle: 'فعّل المحافظات اللي تشتغل فيها المنصة، وألغِ اللي مش عايزها.',
  pickerSearch: 'ابحث عن محافظة',
  pickerEmptyMatch: 'لا توجد محافظة مطابقة لبحثك.',
  pickerCustomTag: 'مضافة يدويًا',
  pickerSelectedCount: (n: number) => `${n} مفعّلة`,
  pickerWillAdd: 'ستُضاف وتُفعّل',
  pickerWillEnable: 'ستُفعّل',
  pickerWillDisable: 'ستُعطّل',
  pickerNoChanges: 'لم تغيّر أي شيء بعد.',
  pickerChangeCount: (n: number) => (n === 1 ? 'تغيير واحد' : `${n} تغييرات`),
  pickerApply: 'حفظ التغييرات',
  pickerApplying: (done: number, total: number) => `جارٍ الحفظ… ${done}/${total}`,
  pickerPartialError: 'بعض التغييرات لم تُحفظ. راجع القائمة وحاول مرة أخرى.',

  fieldNameAr: 'الاسم بالعربية',
  fieldNameEn: 'الاسم بالإنجليزية',
  nameRequired: 'هذا الحقل مطلوب.',
  nameTooLong: 'الحد الأقصى 255 حرفاً.',
  atLeastOneName: 'أدخل الاسم بالعربية أو بالإنجليزية على الأقل.',
  nameDuplicateFallback: 'اسم المدينة مستخدم بالفعل.',

  save: 'حفظ',
  saving: 'جارٍ الحفظ…',
  cancel: 'إلغاء',
  close: 'إغلاق',
  fieldWillUpdate: 'سيتم تحديث هذا الاسم.',
  editHint: 'عدّل اسمًا واحدًا على الأقل بالعربية أو بالإنجليزية لتفعيل الحفظ.',

  editLabel: (nameAr: string) => `تعديل مدينة ${nameAr}`,
  pickerRowLabel: (nameAr: string) => `تفعيل محافظة ${nameAr}`,
  toggleToInactiveTitle: (nameAr: string) => `تعطيل مدينة ${nameAr}؟`,
  toggleToActiveTitle: (nameAr: string) => `تفعيل مدينة ${nameAr}؟`,
  toggleToInactiveBody: 'لن تظهر هذه المدينة للعملاء حتى يُعاد تفعيلها.',
  toggleToActiveBody: 'ستظهر هذه المدينة للعملاء مرة أخرى.',
  confirmToggle: 'تأكيد',
  rowToggleToInactive: (nameAr: string) => `تعطيل ${nameAr}`,
  rowToggleToActive: (nameAr: string) => `تفعيل ${nameAr}`,
  /** Visible text on the row's status control — the aria-label names the city. */
  rowDeactivate: 'تعطيل',
  rowActivate: 'تفعيل',

  createdToast: 'تمت إضافة المدينة.',
  updatedToast: 'تم تحديث المدينة.',
  statusUpdatedToast: 'تم تحديث حالة المدينة.',
  notFoundToast: 'تعذّر العثور على المدينة.',
  mutationRetryToast: 'تعذّر إتمام العملية. حاول مرة أخرى.',
} as const
