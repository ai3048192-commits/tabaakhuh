import {
  LayoutGrid, Users, ShoppingBag, ChefHat,
  TrendingUp, MessageSquareWarning, Settings,
  Bike, MapPin, Wallet, AlertTriangle, Truck, LayoutTemplate, type LucideIcon,
} from 'lucide-react';

interface MenuItem { name: string; icon: LucideIcon; path: string }

// القائمة مقسّمة لمجموعات عشان تبقى أسهل في القراءة
export const menuGroups: { title: string; items: MenuItem[] }[] = [
  {
    title: 'الرئيسية',
    items: [
      { name: 'لوحة التحكم', icon: LayoutGrid, path: '/dashboard' },
      { name: 'مراقبة الطلبات', icon: ShoppingBag, path: '/orders' },
      { name: 'إدارة الدليفري', icon: Truck, path: '/delivery' },
    ],
  },
  {
    title: 'الحسابات',
    items: [
      { name: 'إدارة المستخدمين', icon: Users, path: '/users' },
      { name: 'إدارة الطباخات', icon: ChefHat, path: '/cooks' },
      { name: 'طلبات السائقين', icon: Bike, path: '/drivers' },
    ],
  },
  {
    title: 'المالية والدعم',
    items: [
      { name: 'طلبات السحب', icon: Wallet, path: '/withdrawals' },
      { name: 'التقارير المالية', icon: TrendingUp, path: '/reports' },
      { name: 'الشكاوى والاقتراحات', icon: MessageSquareWarning, path: '/complaints' },
      { name: 'بلاغات الحوادث', icon: AlertTriangle, path: '/incidents' },
    ],
  },
  {
    title: 'الإعدادات',
    items: [
      { name: 'إدارة المدن', icon: MapPin, path: '/cities' },
      { name: 'أسعار التوصيل', icon: Truck, path: '/delivery-pricing' },
      { name: 'إعدادات النظام', icon: Settings, path: '/settings' },
      { name: 'محتوى الصفحة الرئيسية', icon: LayoutTemplate, path: '/settings?tab=landing' },
    ],
  },
];

/** A menu path matches on its pathname and, when it has one, its query string. */
export function isActivePath(path: string, pathname: string, search: string): boolean {
  const [p, q] = path.split('?');
  if (p !== pathname) return false;
  const want = new URLSearchParams(q ?? '').get('tab');
  return want === new URLSearchParams(search).get('tab');
}


/** The menu entry for the current route — the Header's page title. */
export function currentPageName(pathname: string, search: string): string | null {
  for (const g of menuGroups) {
    for (const it of g.items) if (isActivePath(it.path, pathname, search)) return it.name;
  }
  return null;
}
