import type { DepositMethod, DepositStatus } from './types'

/** Arabic, RTL-first. */
export const depositMessages = {
  pageTitle: 'العرابين',
  subtitle: 'العرابين اللي العملاء بعتوها للطباخات في الطلبات الخاصة: العميل بيحوّل للطباخة مباشرة والطباخة هي اللي بتأكد الوصول. الصفحة دي للمتابعة بس.',
  refresh: 'تحديث',
  loading: 'جارٍ تحميل العرابين…',
  queueError: 'حدث خطأ ما. حاول مرة أخرى.',
  retry: 'إعادة المحاولة',

  status: {
    awaiting_payment: 'العميل لسه مادفعش',
    submitted: 'بانتظار تأكيد الطباخة',
    rejected: 'مرفوض من الطباخة',
    confirmed: 'اتأكد',
  } satisfies Record<DepositStatus, string>,

  method: {
    vodafone_cash: 'فودافون كاش',
    instapay: 'إنستاباي',
  } satisfies Record<DepositMethod, string>,

  empty: 'مفيش عرابين اتبعتت من العملاء لسه.',

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
  rejectCount: (n: number) => `اترفض ${n} ${n === 1 ? 'مرة' : 'مرات'}`,
  disputed: 'خلاف',
  payTo: 'اتحوّل على حساب الطباخة',
  vodafoneCash: 'فودافون كاش',
  instapay: 'إنستاباي',
  noAccount: 'مفيش حساب مسجّل',
  confirmedAt: 'وقت التأكيد',
  orderCancelled: 'الطلب اتلغى بعد التحويل — العربون عند الطباخة، تابع الرد مع العميل.',
  summaryTitle: 'العرابين المؤكدة',
  summaryTotal: 'إجمالي المبالغ المؤكدة',
  summaryCount: (n: number) => `${n} عربون مؤكد`,

  refreshFailed: 'تعذّر التحديث. حاول مرة أخرى.',
}
