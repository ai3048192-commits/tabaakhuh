/** User-facing strings for delivery pricing (Arabic, RTL-first). */
export const areaMessages = {
  pageTitle: 'أسعار التوصيل',
  subtitle:
    'حدد سعر التوصيل لكل منطقة. السعر ده هو اللي بيدفعه العميل وبيظهر للطباخة وللمندوب قبل ما يقبل الطلب.',
  unservedNote:
    'العنوان اللي مش في منطقة مفعّلة هنا مفيش له توصيل — العميل يقدر يستلم الطلب بنفسه بس.',

  cityLabel: 'المحافظة',
  cityInactiveTag: '(معطّلة)',
  citiesLoading: 'جارٍ تحميل المحافظات…',
  citiesError: 'حصل خطأ أثناء تحميل المحافظات.',
  noCities: 'لا توجد محافظات بعد — أضفها أولًا من صفحة إدارة المدن.',

  loading: 'جارٍ تحميل المناطق…',
  listError: 'حصل خطأ أثناء تحميل المناطق.',
  retry: 'إعادة المحاولة',
  empty: 'لا توجد مناطق في هذه المحافظة بعد. أضف أول منطقة وحدد سعر التوصيل لها.',
  count: (n: number) => `${n} منطقة`,

  colNameAr: 'المنطقة',
  colNameEn: 'الاسم بالإنجليزية',
  colFee: 'سعر التوصيل',
  colStatus: 'الحالة',
  colActions: 'إجراءات',
  statusActive: 'التوصيل متاح',
  statusInactive: 'التوصيل موقوف',
  currency: 'ج.م',
  fee: (n: number) => `${n.toLocaleString('en-US', { maximumFractionDigits: 2 })} ج.م`,

  addArea: 'إضافة منطقة',
  edit: 'تعديل',
  editLabel: (name: string) => `تعديل ${name}`,
  deactivate: 'إيقاف التوصيل',
  activate: 'تفعيل التوصيل',
  toggleLabel: (name: string, active: boolean) =>
    active ? `إيقاف التوصيل إلى ${name}` : `تفعيل التوصيل إلى ${name}`,

  formAddTitle: (city: string) => `إضافة منطقة في ${city}`,
  formEditTitle: (name: string) => `تعديل ${name}`,
  fieldNameAr: 'اسم المنطقة بالعربية',
  fieldNameEn: 'اسم المنطقة بالإنجليزية',
  fieldFee: 'سعر التوصيل (ج.م)',
  feeHint: 'السعر المتفق عليه مع المناديب للمنطقة دي. يطبَّق على الطلبات الجديدة فقط.',
  errRequired: 'مطلوب',
  errFee: 'اكتب رقمًا صحيحًا أكبر من أو يساوي صفر (حتى رقمين عشريين).',
  save: 'حفظ',
  saving: 'جارٍ الحفظ…',
  cancel: 'إلغاء',

  toggleOffTitle: (name: string) => `إيقاف التوصيل إلى ${name}؟`,
  toggleOffBody:
    'العملاء في المنطقة دي مش هيقدروا يطلبوا توصيل لحد ما تفعّلها تاني. الطلبات الحالية مش هتتأثر.',
  toggleOnTitle: (name: string) => `تفعيل التوصيل إلى ${name}؟`,
  toggleOnBody: 'العملاء في المنطقة دي هيقدروا يطلبوا توصيل بالسعر المحدد.',
  confirm: 'تأكيد',

  createdToast: 'تمت إضافة المنطقة.',
  updatedToast: 'تم حفظ التعديلات.',
  statusToast: 'تم تحديث حالة التوصيل.',
  notFoundToast: 'المنطقة دي مبقتش موجودة — تم تحديث القائمة.',
  retryToast: 'تعذّر الحفظ. حاول تاني.',
} as const
