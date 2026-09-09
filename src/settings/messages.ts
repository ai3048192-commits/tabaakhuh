/**
 * User-facing strings for Platform Settings (Arabic, RTL).
 */
import type { FeeError } from './types'

export const settingsMessages = {
  pageTitle: 'إعدادات المنصة',
  subtitle: 'الإعدادات العامة للمنصة',

  loading: 'جارٍ تحميل الإعدادات…',
  loadError: 'حدث خطأ ما. حاول مرة أخرى.',
  retry: 'إعادة المحاولة',

  currentFeeLabel: 'رسوم التوصيل الحالية',
  feeFieldLabel: 'رسوم التوصيل',
  feeUnit: 'ج.م',
  /** Read out to assistive tech via the field's description, since the visual "ج.م" is aria-hidden. */
  feeUnitName: 'بالجنيه المصري',
  feeHint: 'المبلغ بالجنيه المصري، صفر أو أكثر، برقمين عشريين على الأكثر.',

  feeRequired: 'أدخل قيمة رسوم التوصيل.',
  feeNotNumber: 'أدخل رقماً صحيحاً.',
  feeNegative: 'لا يمكن أن تكون الرسوم بالسالب.',
  feeTooManyDecimals: 'استخدم رقمين عشريين على الأكثر.',

  save: 'حفظ',
  saving: 'جارٍ الحفظ…',

  updatedToast: 'تم تحديث رسوم التوصيل.',
  saveRetryToast: 'تعذّر حفظ التغيير. حاول مرة أخرى.',

  // --- Rich layout ---
  liveNote: 'الحفظ في كل بطاقة يرسل الحقول المتغيّرة فقط.',
  pendingBackend: 'بانتظار الباك اند',

  cardFinanceTitle: 'الإعدادات المالية',
  cardStoreTitle: 'بيانات المتجر',
  cardNotifTitle: 'الإشعارات ونطاق التوصيل',
  cardCitiesTitle: 'المدن والمناطق',

  // extra finance
  commissionLabel: 'نسبة عمولة المنصة (%)',
  minOrderLabel: 'الحد الأدنى لقيمة الطلب (ج.م)',
  firstOrderDiscountLabel: 'خصم أول طلب',
  cashbackLabel: 'كاش باك / نقاط',
  financeExtraHeading: 'إعدادات مالية إضافية',

  // store info
  storeNameLabel: 'اسم المتجر',
  supportEmailLabel: 'بريد الدعم',
  supportPhoneLabel: 'هاتف الدعم',
  logoLabel: 'شعار المتجر',
  iconLabel: 'أيقونة المتجر',

  // image upload (logo / icon) — file → Cloudinary → secure_url in the draft
  imageChoose: 'اختيار صورة',
  imageReplace: 'استبدال الصورة',
  imageRemove: 'إزالة',
  imageUploading: 'جارٍ الرفع…',
  imageHint: 'PNG أو JPG أو WEBP أو SVG، حتى 5 ميجابايت. تُرفع على Cloudinary ثم تُحفظ مع الإعدادات.',
  imagePreviewAlt: 'معاينة الصورة',
  imageErrUnconfigured: 'رفع الصور غير مُهيّأ. اضبط إعدادات Cloudinary أولاً.',
  imageErrBadType: 'نوع ملف غير مدعوم. استخدم PNG أو JPG أو WEBP أو SVG.',
  imageErrTooLarge: 'حجم الملف أكبر من 5 ميجابايت.',
  imageErrNetwork: 'تعذّر الاتصال بخدمة الرفع. حاول مرة أخرى.',
  imageErrRejected: 'رفضت خدمة الرفع الملف. حاول مرة أخرى.',

  // notifications + radius
  notifPushLabel: 'إشعارات فورية (Push)',
  notifNewOrdersLabel: 'إشعار الطلبات الجديدة',
  notifSmsCooksLabel: 'رسائل SMS للطهاة',
  notifOrderStatusLabel: 'إشعار تغيّر حالة الطلب',
  deliveryRadiusLabel: 'نطاق التوصيل الافتراضي (كم)',

  // save + toasts for the non-fee cards
  saveSettings: 'حفظ الإعدادات',
  settingsSavedToast: 'تم حفظ الإعدادات.',
  noChanges: 'لا تغييرات لحفظها.',

  // shared validation copy (mirrors backend §6.2)
  vRequired: 'هذا الحقل مطلوب.',
  vNotNumber: 'أدخل رقمًا صحيحًا.',
  vCommissionRange: 'النسبة بين 0 و100.',
  vMinOrderRange: 'لا يمكن أن يكون بالسالب.',
  vRadiusRange: 'النطاق بين 1 و200 كم.',
  vTooLong: 'أطول من الحد المسموح.',
  vEmail: 'بريد إلكتروني غير صالح.',
  vUrl: 'رابط غير صالح (لازم يبدأ بـ http).',

  // cities card
  citiesLoading: 'جارٍ تحميل المدن…',
  citiesEmpty: 'لا توجد مدن.',
  manageCities: 'إدارة المدن ←',
  citiesHint: 'الإضافة والتعديل والتفعيل من شاشة «إدارة المدن».',
} as const

/** Map a non-null `FeeError` tag to its Arabic field message. */
export function feeErrorText(error: Exclude<FeeError, null>): string {
  switch (error) {
    case 'required':
      return settingsMessages.feeRequired
    case 'not_a_number':
      return settingsMessages.feeNotNumber
    case 'negative':
      return settingsMessages.feeNegative
    case 'too_many_decimals':
      return settingsMessages.feeTooManyDecimals
  }
}
