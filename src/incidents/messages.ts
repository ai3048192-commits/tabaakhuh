import type { IncidentStatus } from './types'

/** Arabic, RTL-first. */
export const incidentMessages = {
  pageTitle: 'بلاغات الحوادث',
  refresh: 'تحديث',
  loading: 'جارٍ التحميل…',
  listError: 'حدث خطأ ما. حاول مرة أخرى.',
  retry: 'إعادة المحاولة',
  empty: 'لا توجد بلاغات حوادث.',
  emptyFiltered: 'لا توجد بلاغات مطابقة لهذه الفلاتر.',

  filterStatus: 'الحالة',
  allStatuses: 'الكل',

  colId: '#',
  colDriver: 'السائق',
  colSubject: 'الموضوع',
  colStatus: 'الحالة',
  colCreated: 'التاريخ',
  colActions: 'إجراءات',
  open: 'فتح',

  statusLabels: {
    open: 'مفتوح',
    pending: 'قيد المعالجة',
    resolved: 'تم الحل',
    closed: 'مغلق',
  } as Record<IncidentStatus, string>,

  detailTitle: (subject: string) => `البلاغ: ${subject}`,
  close: 'إغلاق النافذة',
  fromDriver: (name: string | null, id: number) => (name ? `السائق: ${name}` : `السائق رقم ${id}`),
  relatedOrder: (id: number) => `الطلب رقم ${id}`,
  attachment: 'الصورة المرفقة',
  thread: 'المحادثة',
  authorCustomer: 'السائق',
  authorAdmin: 'الإدارة',
  replyLabel: 'اكتب ردًّا',
  replyPlaceholder: 'ردّك على السائق…',
  send: 'إرسال',
  markPending: 'قيد المعالجة',
  markResolved: 'تعليم كمحلول',
  markClosed: 'إغلاق البلاغ',
  reopen: 'إعادة فتح',

  replySentToast: 'تم إرسال الرد.',
  statusDoneToast: 'تم تحديث حالة البلاغ.',
  notFoundToast: 'تعذّر العثور على البلاغ.',
  retryToast: 'تعذّر إتمام العملية. حاول مرة أخرى.',
  refreshFailedToast: 'تعذّر التحديث. حاول مرة أخرى.',
} as const
