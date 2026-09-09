/**
 * User-facing strings for driver applications review (Arabic, RTL).
 * Wording is provisional per spec Assumptions ("descriptive, not final copy").
 * Viewer-chrome strings ("document unavailable", zoom, nav) come from
 * `src/review/messages.ts`.
 */
import { reviewMessages } from '../review/messages'

export const driverMessages = {
  ...reviewMessages,

  pageTitle: 'طلبات السائقين',
  awaitingCount: (n: number) => `${n} طلب في انتظار المراجعة`,
  loading: 'جارٍ تحميل الطلبات…',
  queueError: 'حصل خطأ أثناء تحميل الطلبات.',
  retry: 'إعادة المحاولة',
  refresh: 'تحديث',
  empty: 'لا توجد طلبات في انتظار المراجعة.',

  docIdFront: 'صورة البطاقة (الوجه الأمامي)',
  docIdBack: 'صورة البطاقة (الوجه الخلفي)',
  docLicense: 'رخصة القيادة',

  fieldDriver: 'رقم السائق',
  fieldName: 'الاسم',
  fieldVehicle: 'المركبة',
  fieldPlate: 'رقم اللوحة',
  fieldCity: 'المدينة',
  fieldBirthDate: 'تاريخ الميلاد',
  fieldSubmittedAt: 'تاريخ التقديم',
  fieldRating: 'التقييم',
  fieldDocuments: 'المستندات',
  vehicleLine: (type: string, model: string, year: string, color: string) =>
    [type, model, year, color].filter((s) => s && s !== '—').join(' · ') || '—',
  plateLine: (no: string, letters: string) =>
    [letters, no].filter((s) => s && s !== '—').join(' ') || '—',
  available: 'متاح',
  unavailable: 'غير متاح',
  rating: (avg: number, count: number) => `${avg} (${count} تقييم)`,
  placeholder: '—',

  approve: 'موافقة',
  reject: 'رفض',

  driverLabel: (id: number) => `طلب السائق رقم ${id}`,
  /** Row/overlay heading: the applicant's name when the backend sends it, else the `#id` label. */
  driverName: (name: string | null | undefined, id: number) =>
    name && name.trim() ? name.trim() : `طلب السائق رقم ${id}`,
  review: 'مراجعة الطلب',
  reviewHeading: 'مراجعة طلب السائق',
  closeReview: 'إغلاق شاشة المراجعة',
  approveTitle: (label: string) => `الموافقة على ${label}؟`,
  approveBody: 'سيتم تفعيل هذا السائق ويصبح قادراً على استقبال مهام التوصيل.',
  confirmApprove: 'تأكيد الموافقة',
  cancel: 'إلغاء',

  rejectTitle: (label: string) => `رفض ${label}`,
  rejectReasonLabel: 'سبب الرفض',
  rejectReasonRequired: 'اكتب سبب الرفض قبل المتابعة.',
  rejectCounter: (n: number) => `${n} / 1000`,
  confirmReject: 'تأكيد الرفض',

  approvedToast: 'تمت الموافقة على الطلب.',
  rejectedToast: 'تم رفض الطلب.',
  noLongerPendingToast: 'لم يعد هذا الطلب في انتظار المراجعة.',
  notFoundToast: 'تعذّر العثور على الطلب.',
  decisionRetryToast: 'تعذّر إتمام العملية. حاول مرة أخرى.',
} as const
