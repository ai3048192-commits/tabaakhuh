/** Arabic, RTL-first. */
const money = new Intl.NumberFormat('en-US', { maximumFractionDigits: 2 })

export const reportMessages = {
  pageTitle: 'التقارير المالية',
  metricsNote:
    'الإيراد وعدد الطلبات محسوبان من الطلبات المكتملة، والعمولة نسبةً من الإيراد، والمدفوعات من طلبات السحب المدفوعة خلال الفترة.',
  refresh: 'تحديث',
  apply: 'تطبيق',
  loading: 'جارٍ تحميل التقرير…',
  listError: 'حدث خطأ ما. حاول مرة أخرى.',
  retry: 'إعادة المحاولة',
  empty: 'لا توجد بيانات في هذه الفترة.',
  fromAfterTo: 'تاريخ البداية يجب ألا يكون بعد تاريخ النهاية.',

  filterFrom: 'من تاريخ',
  filterTo: 'إلى تاريخ',
  groupBy: 'التجميع',
  groupByDay: 'يومي',
  groupByMonth: 'شهري',

  kpiRevenue: 'إجمالي الإيراد',
  kpiCommission: 'عمولة المنصة',
  kpiPayouts: 'المدفوعات للطهاة/السائقين',
  kpiOrders: 'عدد الطلبات',

  seriesTitle: 'التطوّر الزمني',
  colPeriod: 'الفترة',
  colRevenue: 'الإيراد',
  colCommission: 'العمولة',
  colPayouts: 'المدفوعات',

  breakdownTitle: 'التوزيع حسب المدينة',
  colCity: 'المدينة',
  colOrders: 'الطلبات',

  money: (n: number) => `${money.format(Number.isFinite(n) ? n : 0)} ج.م`,
  count: (n: number) => money.format(Number.isFinite(n) ? n : 0),
} as const
