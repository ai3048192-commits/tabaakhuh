/**
 * User-facing strings for Orders Oversight (Arabic, RTL-first).
 * Wording is provisional per spec Assumptions ("descriptive, not final copy").
 */
export const orderMessages = {
  pageTitle: 'مراقبة الطلبات',
  refresh: 'تحديث',
  autoRefresh: 'تحديث تلقائي',

  loading: 'جارٍ تحميل الطلبات…',
  listError: 'حدث خطأ ما. حاول مرة أخرى.',
  retry: 'إعادة المحاولة',
  refreshFailed: 'تعذّر التحديث. حاول مرة أخرى.',

  emptyNoOrders: 'لا توجد طلبات.',
  emptyNoMatch: 'لا توجد طلبات مطابقة لهذه الفلاتر.',
  emptyBeyondRange: 'لا توجد طلبات في هذه الصفحة.',
  backToFirst: 'العودة إلى الصفحة الأولى',
  resetFilters: 'إعادة ضبط الفلاتر',

  filterStatus: 'الحالة',
  filterCity: 'المدينة',
  allStatuses: 'كل الحالات',
  allCities: 'كل المدن',
  filterFrom: 'من تاريخ',
  filterTo: 'إلى تاريخ',
  apply: 'تطبيق',
  fromAfterTo: 'تاريخ البداية يجب ألا يكون بعد تاريخ النهاية.',

  colOrderNumber: 'رقم الطلب',
  colCook: 'الطاهي',
  colType: 'النوع',
  colStatus: 'الحالة',
  colRequestedDelivery: 'موعد التوصيل المطلوب',
  colSubtotal: 'المجموع',
  colDeliveryFee: 'رسوم التوصيل',
  colTotal: 'الإجمالي',
  colActions: 'تفاصيل',
  viewDetails: 'عرض التفاصيل',

  unknownCook: 'طاهٍ غير معروف',

  typeRegular: 'عادي',
  typeCustom: 'مخصّص',

  pageIndicator: (n: number, m: number) => `صفحة ${n} من ${m}`,
  totalInRange: (t: number) => `${t} طلب ضمن النطاق المحدد`,
  resultSummary: (shown: number, total: number) => `عرض ${shown} من ${total} طلب`,

  detailTitle: (orderNumber: string) => `تفاصيل الطلب ${orderNumber}`,
  close: 'إغلاق',
  customerLabel: 'رقم العميل',
  addressLabel: 'رقم العنوان',
  lineItems: 'البنود',
  noLineItems: 'لا توجد بنود بعد.',
  colItemName: 'الصنف',
  colUnitPrice: 'سعر الوحدة',
  colQty: 'الكمية',
  colLineTotal: 'الإجمالي',
  customerNote: 'ملاحظة العميل',
  cancelReason: 'سبب الإلغاء',
  customDetails: 'تفاصيل الطلب المخصّص',
  occasionType: 'المناسبة',
  guestCount: 'عدد الضيوف',
  requestedDishes: 'الأصناف المطلوبة',
  budgetRange: 'نطاق الميزانية',
  requestedDeliveryDateTime: 'موعد التوصيل المطلوب',

  currency: (n: number) =>
    `${new Intl.NumberFormat('en-US', { maximumFractionDigits: 2 }).format(n)} ج.م`,

  statusLabels: {
    pending: 'قيد الانتظار',
    accepted: 'مقبول',
    preparing: 'قيد التحضير',
    ready_for_pickup: 'جاهز للاستلام',
    assigned_to_driver: 'مُسند لسائق',
    picked_up: 'تم الاستلام',
    on_the_way: 'في الطريق',
    delivered: 'تم التوصيل',
    completed: 'مكتمل',
    cancelled: 'ملغي',
    pending_review: 'بانتظار المراجعة',
    quoted: 'تم التسعير',
  },
} as const
