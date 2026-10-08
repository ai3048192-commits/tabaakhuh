import type { DepositFilter, DepositMethod, DepositStatus } from './types'

/** Arabic, RTL-first. */
export const depositMessages = {
  pageTitle: 'العرابين',
  subtitle: 'عربون الطلبات الخاصة: اتأكد إن التحويل وصل حساب المنصة، وبعدين حوّله للطباخة عشان تبدأ التحضير.',
  refresh: 'تحديث',
  loading: 'جارٍ تحميل العرابين…',
  queueError: 'حدث خطأ ما. حاول مرة أخرى.',
  retry: 'إعادة المحاولة',

  filters: {
    submitted: 'بانتظار المراجعة',
    verified: 'اتأكد — لسه ماتحوّلش',
    paid_to_cook: 'اتحوّل للطباخة',
    rejected: 'مرفوض',
    all: 'الكل',
  } satisfies Record<DepositFilter, string>,

  status: {
    awaiting_payment: 'العميل لسه مادفعش',
    submitted: 'بانتظار المراجعة',
    rejected: 'مرفوض',
    verified: 'اتأكد — لسه ماتحوّلش',
    paid_to_cook: 'اتحوّل للطباخة',
  } satisfies Record<DepositStatus, string>,

  method: {
    vodafone_cash: 'فودافون كاش',
    instapay: 'إنستاباي',
  } satisfies Record<DepositMethod, string>,

  emptyFor: (f: DepositFilter) =>
    f === 'submitted' ? 'مفيش تحويلات مستنية مراجعة دلوقتي.' : 'مفيش عرابين هنا.',

  order: (n: string | null, id: number) => `طلب ${n ?? `#${id}`}`,
  amount: 'العربون',
  ofSubtotal: (pct: number) => `${pct}% من سعر الأكل`,
  customer: 'العميل',
  cook: 'الطباخة',
  sentVia: 'اتبعت على',
  submittedAt: 'وقت الرفع',
  noProof: 'مفيش صورة',
  openProof: 'افتح صورة التحويل',
  proofAlt: (n: string | null) => `صورة تحويل عربون ${n ?? ''}`.trim(),
  close: 'إغلاق',
  copy: 'نسخ',
  copied: 'اتنسخ',
  rejectionReason: 'سبب الرفض',
  payoutNote: 'ملاحظة التحويل',
  orderCancelled: 'الطلب اتلغى — العربون محتاج يترد للعميل، متحوّلوش للطباخة.',
  sendToCookHint: (phone: string | null) =>
    phone ? `حوّل المبلغ على رقم الطباخة ${phone} وبعدين علّم إنه اتحوّل.` : 'حوّل المبلغ للطباخة وبعدين علّم إنه اتحوّل.',

  actionVerify: 'تأكيد الاستلام',
  actionReject: 'رفض',
  actionMarkPaid: 'تم التحويل للطباخة',

  dialog: {
    verify: {
      title: 'تأكيد استلام العربون',
      body: 'اتأكدت إن المبلغ وصل فعلًا لحساب المنصة؟ العميل والطباخة هيوصلهم إشعار.',
      cta: 'أيوه، وصل',
    },
    reject: {
      title: 'رفض التحويل',
      body: 'العميل هيشوف السبب ويقدر يرفع صورة تانية.',
      cta: 'رفض التحويل',
      field: 'سبب الرفض',
      placeholder: 'مثلًا: المبلغ ناقص، أو الصورة مش واضحة',
    },
    mark_paid: {
      title: 'تحويل العربون للطباخة',
      body: 'علّم إنك حوّلت المبلغ للطباخة؟ هتقدر تبدأ تحضير الطلب على طول.',
      cta: 'اتحوّل',
      field: 'رقم العملية أو ملاحظة (اختياري)',
      placeholder: 'مثلًا: رقم عملية فودافون كاش',
    },
  },
  cancel: 'إلغاء',
  reasonTooShort: 'اكتب السبب (3 حروف على الأقل).',

  doneToast: {
    verify: 'تم تأكيد العربون.',
    reject: 'تم رفض التحويل وإبلاغ العميل.',
    mark_paid: 'تم تسجيل التحويل للطباخة.',
  },
  notFoundToast: 'العربون ده مش موجود. اتحدّثت القائمة.',
  retryToast: 'تعذّر تنفيذ الإجراء. حاول مرة أخرى.',
  refreshFailed: 'تعذّر التحديث. حاول مرة أخرى.',
}
