/**
 * User-facing strings for the Dashboard Reports / Overview screen (Arabic, RTL).
 * Wording is provisional per spec Assumptions ("descriptive, not final copy").
 * Numeric values are pre-formatted Western-digit strings from `format.ts`.
 */
import type { OrderStatus, Role } from './types'

export const overviewMessages = {
  pageTitle: 'لوحة التحكم',
  subtitle: 'نظرة عامة على المنصة',

  refresh: 'تحديث',
  refreshing: 'جارٍ التحديث…',
  retry: 'إعادة المحاولة',
  loading: 'جارٍ تحميل الإحصائيات…',
  loadError: 'حدث خطأ ما. حاول مرة أخرى.',

  lastUpdated: (t: string) => `آخر تحديث: ${t}`,
  refreshFailedNotice: 'تعذّر التحديث، تُعرض آخر أرقام معروفة.',

  usersGroupTitle: 'المستخدمون حسب الدور',
  ordersGroupTitle: 'الطلبات حسب الحالة',
  revenueGroupTitle: 'إجمالي المبيعات',
  revenueScopeNote: 'للطلبات المكتملة فقط',
  currencyUnit: 'ج.م',

  roleLabel: {
    customer: 'العملاء',
    cook: 'الطهاة',
    driver: 'السائقون',
    admin: 'المدراء',
  } satisfies Record<Role, string>,

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
  } satisfies Record<OrderStatus, string>,

  unknownStatusLabel: (key: string) => `حالة غير معروفة (${key})`,
  statusCardLinkLabel: (label: string, count: string) => `عرض طلبات ${label} (${count})`,

  // --- Rich home layout ---
  kpiUsers: 'إجمالي المستخدمين',
  kpiCooks: 'إجمالي الطهاة',
  kpiDriversAvailable: 'دليفري متاح الآن',
  kpiDriversBusy: 'دليفري مشغول',
  kpiOrders: 'إجمالي الطلبات',
  kpiRevenue: 'إجمالي الإيرادات',
  na: '—',

  chartTitle: 'إحصائيات الطلبات اليومية (٧ أيام)',
  chartLabel: 'الطلبات',
  chartEmpty: 'لا توجد طلبات في آخر ٧ أيام.',
  chartError: 'تعذّر تحميل بيانات الرسم البياني. حدّث الصفحة وحاول تاني.',

  quickActionsTitle: 'إجراءات سريعة',
  qaAddCook: 'إضافة طباخة جديدة',
  qaBroadcast: 'إرسال إشعار عام',
  qaNewUser: 'مستخدم جديد',
  qaAddDriver: 'إضافة سائق جديد',

  deliveriesTitle: 'حالة عمليات التوصيل الحالية',
  viewAll: 'عرض الكل',
  colDriver: 'اسم الدليفري',
  colOrderAddress: 'عنوان الأوردر',
  colPrice: 'السعر',
  colCommission: 'العمولة',
  colStatus: 'الحالة',
  colDetails: 'تفاصيل',
  noDeliveries: 'لا توجد عمليات توصيل جارية.',
  deliveriesError: 'تعذّر تحميل عمليات التوصيل. حدّث الصفحة وحاول تاني.',

  preparingTitle: 'طلبات بانتظار التحضير',
  noPreparing: 'لا توجد طلبات قيد التحضير.',

  recentCooksTitle: 'أحدث الطهاة المنضمّين',
  noRecentCooks: 'لا يوجد طهاة جدد.',
  recentCooksError: 'تعذّر تحميل قائمة الطهاة. حدّث الصفحة وحاول تاني.',

  detailDeliveryTitle: 'تفاصيل التوصيل',
  detailOrderTitle: 'تفاصيل الطلب',
  close: 'إغلاق',
  fDriver: 'اسم الدليفري',
  fOrderNo: 'رقم الأوردر',
  fAddress: 'العنوان',
  fPrice: 'السعر',
  fCommission: 'العمولة',
  fOrderNumber: 'رقم الطلب',
  fOrderStatus: 'الحالة',
} as const
