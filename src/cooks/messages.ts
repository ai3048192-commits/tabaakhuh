/**
 * User-facing strings for cook applications review (Arabic, RTL).
 * Wording is provisional per spec Assumptions ("descriptive, not final copy").
 *
 * Viewer-chrome strings (close / prev / next / zoom / "document unavailable" /
 * open-in-new-tab / contract label) are shared with driver-review and live in
 * `src/review/messages.ts`; they are spread in here so `cookMessages.*` keeps
 * every key it had before the `src/review/` promotion.
 */
import { reviewMessages } from '../review/messages'

export const cookMessages = {
  ...reviewMessages,

  pageTitle: 'طلبات الطهاة',
  awaitingCount: (n: number) => `${n} طلب في انتظار المراجعة`,
  loading: 'جارٍ تحميل الطلبات…',
  queueError: 'حصل خطأ أثناء تحميل الطلبات.',
  retry: 'إعادة المحاولة',
  refresh: 'تحديث',
  empty: 'لا توجد طلبات في انتظار المراجعة.',

  noContractSigned: 'لم يتم توقيع العقد بعد.',
  contractLine: (version: string, date: string) => `العقد ${version} — تم التوقيع في ${date}`,
  openContract: 'فتح العقد',

  docIdFront: 'صورة البطاقة (الوجه الأمامي)',
  docIdBack: 'صورة البطاقة (الوجه الخلفي)',
  docAvatar: 'الصورة الشخصية',
  docBanner: 'صورة الغلاف',

  fieldName: 'اسم الطاهية',
  fieldStore: 'اسم المتجر',
  fieldCity: 'المدينة',
  fieldArea: 'المنطقة',
  fieldAddress: 'العنوان',
  fieldRadius: 'نطاق التوصيل',
  radiusKm: (n: number) => `${n} كم`,
  fieldBio: 'نبذة',
  fieldDocuments: 'المستندات',
  fieldRating: 'التقييم',
  placeholder: '—',
  open: 'مفتوح الآن',
  closed: 'مغلق',
  rating: (avg: number, count: number) => `${avg} (${count} تقييم)`,

  approve: 'موافقة',
  reject: 'رفض',

  /** Row/overlay heading: the cook's name when the backend sends it, else the store name. */
  cookName: (name: string | null | undefined, storeName: string) =>
    name && name.trim() ? name.trim() : storeName,
  review: 'مراجعة الطلب',
  reviewHeading: 'مراجعة طلب الطاهية',
  closeReview: 'إغلاق شاشة المراجعة',

  approveTitle: (store: string) => `الموافقة على «${store}»؟`,
  approveBody: 'سيتم تفعيل هذا الطاهي ويصبح قادراً على استقبال الطلبات.',
  confirmApprove: 'تأكيد الموافقة',
  cancel: 'إلغاء',

  rejectTitle: (store: string) => `رفض طلب «${store}»`,
  rejectReasonLabel: 'سبب الرفض',
  rejectReasonRequired: 'اكتب سبب الرفض قبل المتابعة.',
  rejectCounter: (n: number) => `${n} / 1000`,
  confirmReject: 'تأكيد الرفض',

  approvedToast: (store: string) => `تمت الموافقة على «${store}».`,
  rejectedToast: (store: string) => `تم رفض طلب «${store}».`,
  noLongerPendingToast: 'لم يعد هذا الطلب في انتظار المراجعة.',
  notFoundToast: 'تعذّر العثور على الطلب.',
  decisionRetryToast: 'تعذّر إتمام العملية. حاول مرة أخرى.',
} as const
