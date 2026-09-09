import type { ComplaintStatus, ComplaintType } from './types'

/** Arabic, RTL-first. Provisional copy. */
export const complaintMessages = {
  pageTitle: 'الشكاوى والاقتراحات',
  refresh: 'تحديث',
  loading: 'جارٍ التحميل…',
  listError: 'حدث خطأ ما. حاول مرة أخرى.',
  retry: 'إعادة المحاولة',
  empty: 'لا توجد رسائل.',
  emptyFiltered: 'لا توجد رسائل مطابقة لهذه الفلاتر.',

  filterType: 'النوع',
  filterStatus: 'الحالة',
  allTypes: 'الكل',
  allStatuses: 'الكل',

  colId: '#',
  colType: 'النوع',
  colSubject: 'الموضوع',
  colStatus: 'الحالة',
  colCreated: 'التاريخ',
  colActions: 'إجراءات',
  open: 'فتح',

  typeLabels: { complaint: 'شكوى', suggestion: 'اقتراح' } as Record<ComplaintType, string>,
  statusLabels: { open: 'مفتوحة', resolved: 'محلولة' } as Record<ComplaintStatus, string>,

  detailTitle: (subject: string) => `الرسالة: ${subject}`,
  close: 'إغلاق',
  fromCustomer: (id: number) => `العميل رقم ${id}`,
  relatedOrder: (id: number) => `الطلب رقم ${id}`,
  thread: 'المحادثة',
  authorCustomer: 'العميل',
  authorAdmin: 'الإدارة',
  replyLabel: 'اكتب ردًّا',
  replyPlaceholder: 'ردّك على العميل…',
  send: 'إرسال',
  markResolved: 'تعليم كمحلولة',
  reopen: 'إعادة فتح',

  replySentToast: 'تم إرسال الرد.',
  statusDoneToast: 'تم تحديث حالة الرسالة.',
  notFoundToast: 'تعذّر العثور على الرسالة.',
  retryToast: 'تعذّر إتمام العملية. حاول مرة أخرى.',
  refreshFailedToast: 'تعذّر التحديث. حاول مرة أخرى.',
} as const
