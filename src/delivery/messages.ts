/** Arabic, RTL-first. Provisional copy. */
export const deliveryMessages = {
  pageTitle: 'إدارة الدليفري',
  provisionalNote:
    'ملاحظة: عقد هذه الشاشة مبدئي وبانتظار مواصفة عمليات نهائية؛ التحديث يدوي مؤقتًا.',
  refresh: 'تحديث',
  loading: 'جارٍ التحميل…',
  listError: 'حدث خطأ ما. حاول مرة أخرى.',
  retry: 'إعادة المحاولة',

  activeTitle: 'التوصيلات الجارية',
  driversTitle: 'السائقون',
  addDriver: 'إضافة سائق جديد',
  noActive: 'لا توجد توصيلات جارية.',
  noDrivers: 'لا يوجد سائقون على الشيفت.',

  colOrder: 'الطلب',
  colStatus: 'الحالة',
  colCook: 'الطاهي',
  colArea: 'المنطقة',
  colDriver: 'السائق',
  colActions: 'إجراءات',
  unassigned: 'غير مُسنَد',
  assign: 'إسناد سائق',
  reassign: 'تغيير السائق',

  /** Backend `OrderStatus` enum → Arabic. */
  statusLabel: {
    pending: 'قيد الانتظار',
    accepted: 'مقبول',
    preparing: 'قيد التحضير',
    ready_for_pickup: 'جاهز للاستلام',
    assigned_to_driver: 'مُسند إلى سائق',
    picked_up: 'تم الاستلام',
    on_the_way: 'في الطريق',
    delivered: 'تم التوصيل',
    completed: 'مكتمل',
    cancelled: 'ملغى',
    pending_review: 'قيد المراجعة',
    quoted: 'تم التسعير',
  } as Record<string, string>,

  colName: 'الاسم',
  colPhone: 'التليفون',
  colAvailability: 'التوفّر',
  colLoad: 'توصيلات نشطة',
  available: 'متاح',
  busy: 'مشغول',

  assignTitle: (orderNumber: string) => `إسناد سائق للطلب ${orderNumber}`,
  pickDriver: 'اختر السائق',
  confirm: 'تأكيد الإسناد',
  cancel: 'إلغاء',
  close: 'إغلاق',

  assignedToast: 'تم إسناد السائق.',
  notFoundToast: 'تعذّر العثور على الطلب أو السائق.',
  retryToast: 'تعذّر إتمام العملية. حاول مرة أخرى.',
  refreshFailedToast: 'تعذّر التحديث. حاول مرة أخرى.',
} as const
