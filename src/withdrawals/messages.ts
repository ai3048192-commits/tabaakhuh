import type { StatusFilter } from './types'

/** Arabic, RTL-first. Provisional copy per spec Assumptions. */
export const withdrawalMessages = {
  pageTitle: 'طلبات السحب',
  refresh: 'تحديث',
  loading: 'جارٍ تحميل الطلبات…',
  queueError: 'حدث خطأ ما. حاول مرة أخرى.',
  retry: 'إعادة المحاولة',
  backToFirstPage: 'العودة إلى الصفحة الأولى',

  colId: '#',
  colAmount: 'المبلغ',
  colPaymentDetails: 'بيانات التحويل',
  colStatus: 'الحالة',
  colRequestedAt: 'تاريخ الطلب',
  colProcessedAt: 'تاريخ المعالجة',
  colActions: 'إجراءات',

  filterAll: 'الكل',
  filterPending: 'قيد المراجعة',
  filterApproved: 'تمت الموافقة',
  filterRejected: 'مرفوض',
  filterPaid: 'مدفوع',

  statusPending: 'قيد المراجعة',
  statusApproved: 'تمت الموافقة',
  statusRejected: 'مرفوض',
  statusPaid: 'مدفوع',

  actionApprove: 'موافقة',
  actionReject: 'رفض',
  actionMarkPaid: 'تعليم كمدفوع',

  confirmApproveTitle: 'الموافقة على طلب السحب',
  confirmApproveBody: 'سيتم اعتماد هذا الطلب للتحويل. متابعة؟',
  confirmApproveCta: 'تأكيد الموافقة',
  confirmRejectTitle: 'رفض طلب السحب',
  confirmRejectBody: 'سيتم رفض هذا الطلب نهائيًا. متابعة؟',
  confirmRejectCta: 'تأكيد الرفض',
  confirmMarkPaidTitle: 'تعليم الطلب كمدفوع',
  confirmMarkPaidBody: 'أكّد أن المبلغ حُوِّل فعليًا خارج الداشبورد. متابعة؟',
  confirmMarkPaidCta: 'تأكيد الدفع',
  cancel: 'إلغاء',

  emptyFor: (filter: StatusFilter): string => {
    switch (filter) {
      case 'pending':
        return 'لا توجد طلبات قيد المراجعة.'
      case 'approved':
        return 'لا توجد طلبات تمت الموافقة عليها.'
      case 'rejected':
        return 'لا توجد طلبات مرفوضة.'
      case 'paid':
        return 'لا توجد طلبات مدفوعة.'
      default:
        return 'لا توجد طلبات سحب.'
    }
  },

  pagerPosition: (page: number, pages: number) => `صفحة ${page} من ${pages}`,
  pagerTotal: (n: number) => `${n} طلب`,

  notFoundToast: 'تعذّر العثور على الطلب.',
  actionRetryToast: 'تعذّر إتمام العملية. حاول مرة أخرى.',
  refreshFailedToast: 'تعذّر التحديث. حاول مرة أخرى.',

  approveDoneToast: 'تمت الموافقة على طلب السحب.',
  rejectDoneToast: 'تم رفض طلب السحب.',
  markPaidDoneToast: 'تم تعليم الطلب كمدفوع.',
} as const
