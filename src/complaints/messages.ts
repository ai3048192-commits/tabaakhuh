import type { ComplaintStatus, ComplaintType, SenderRole } from './types'

/** Arabic, RTL-first. */
export const complaintMessages = {
  pageTitle: 'الشكاوى والاقتراحات',
  subtitle: 'رسائل العملاء والطبّاخات والمناديب: افتح أي حد وشوف كل رسايله، ردّ عليها أو امسحها.',
  totalCount: (n: number) => `${n} مرسل`,
  refresh: 'تحديث',
  loading: 'جارٍ التحميل…',
  listError: 'حدث خطأ ما. حاول مرة أخرى.',
  retry: 'إعادة المحاولة',
  empty: 'لا توجد رسائل.',
  emptyFiltered: 'لا توجد رسائل مطابقة لهذه الفلاتر.',

  filterType: 'النوع',
  filterStatus: 'الحالة',
  filterRole: 'المرسل',
  allTypes: 'الكل',
  allStatuses: 'الكل',
  allRoles: 'الكل',

  typeLabels: { complaint: 'شكوى', suggestion: 'اقتراح' } as Record<ComplaintType, string>,
  statusLabels: { open: 'مفتوحة', resolved: 'محلولة' } as Record<ComplaintStatus, string>,
  roleLabels: { customer: 'عميل', cook: 'طبّاخة', driver: 'مندوب' } as Record<SenderRole, string>,

  unknownSender: (id: number) => `مستخدم رقم ${id}`,
  messagesCount: (n: number) => (n === 1 ? 'رسالة واحدة' : `${n} رسائل`),
  openCount: (n: number) => `${n} مفتوحة`,
  complaintsCount: (n: number) => `${n} شكوى`,
  suggestionsCount: (n: number) => `${n} اقتراح`,
  lastAt: 'آخر رسالة',
  viewMessages: 'عرض الرسائل',

  senderMessages: 'كل رسائله',
  close: 'إغلاق',
  loadMore: 'عرض المزيد',
  relatedOrder: (id: number) => `الطلب رقم ${id}`,
  thread: 'المحادثة',
  authorSender: 'المرسل',
  authorAdmin: 'الإدارة',
  replyLabel: 'اكتب ردًّا',
  replyPlaceholder: 'ردّك…',
  send: 'إرسال',
  markResolved: 'تعليم كمحلولة',
  reopen: 'إعادة فتح',
  remove: 'حذف',
  confirmRemove: 'تمسح الرسالة دي ومحادثتها نهائيًا؟',
  confirmRemoveYes: 'أيوه، احذف',
  cancel: 'إلغاء',
  expand: 'فتح الرسالة',
  collapse: 'إخفاء',

  replySentToast: 'تم إرسال الرد.',
  statusDoneToast: 'تم تحديث حالة الرسالة.',
  removedToast: 'تم حذف الرسالة.',
  notFoundToast: 'تعذّر العثور على الرسالة.',
  retryToast: 'تعذّر إتمام العملية. حاول مرة أخرى.',
  refreshFailedToast: 'تعذّر التحديث. حاول مرة أخرى.',
} as const

/** The sender's name, or "مستخدم رقم N" when the account has none. */
export function senderName(name: string | null, userId: number): string {
  return name && name.trim() !== '' ? name : complaintMessages.unknownSender(userId)
}
