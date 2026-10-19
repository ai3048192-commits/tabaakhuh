import { DEPOSITS_ENABLED } from '../deposits/featureFlag';
import {
  LayoutGrid, Users, ShoppingBag, ChefHat,
  TrendingUp, MessageSquareWarning, Settings,
  Bike, MapPin, Wallet, AlertTriangle, Truck, LayoutTemplate, UserRound, ClipboardList, ClipboardCheck,
  Navigation, HandCoins, Tags, FileSignature, type LucideIcon,
} from 'lucide-react';

/**
 * `drivers`: a page about the platform's own drivers — hidden while they are
 * switched off (specs/070, `driver_delivery_enabled`); the page itself stays.
 */
interface MenuItem { name: string; icon: LucideIcon; path: string; drivers?: true }

// القائمة مقسّمة لمجموعات عشان تبقى أسهل في القراءة
export const menuGroups: { title: string; items: MenuItem[] }[] = [
  {
    title: 'الرئيسية',
    items: [
      { name: 'لوحة التحكم', icon: LayoutGrid, path: '/dashboard' },
      { name: 'مراقبة الطلبات', icon: ShoppingBag, path: '/orders' },
      { name: 'متابعة التوصيل', icon: Navigation, path: '/delivery', drivers: true },
    ],
  },
  {
    title: 'الحسابات',
    items: [
      { name: 'إدارة العملاء', icon: UserRound, path: '/customers' },
      { name: 'إدارة الطباخات', icon: ChefHat, path: '/cooks' },
      { name: 'إدارة الدليفري', icon: Bike, path: '/drivers', drivers: true },
      { name: 'كل الحسابات', icon: Users, path: '/users' },
    ],
  },
  {
    title: 'طلبات الانضمام',
    items: [
      { name: 'طلبات الطباخات', icon: ClipboardList, path: '/cook-applications' },
      { name: 'طلبات الدليفري', icon: ClipboardCheck, path: '/driver-applications', drivers: true },
    ],
  },
  {
    title: 'المالية والدعم',
    items: [
      ...(DEPOSITS_ENABLED ? [{ name: 'العرابين', icon: HandCoins, path: '/deposits' }] : []),
      { name: 'طلبات السحب', icon: Wallet, path: '/withdrawals', drivers: true },
      { name: 'التقارير المالية', icon: TrendingUp, path: '/reports' },
      { name: 'الشكاوى والاقتراحات', icon: MessageSquareWarning, path: '/complaints' },
      { name: 'بلاغات الحوادث', icon: AlertTriangle, path: '/incidents', drivers: true },
    ],
  },
  {
    title: 'الإعدادات',
    items: [
      { name: 'إدارة المدن', icon: MapPin, path: '/cities' },
      { name: 'تصنيفات الأكل', icon: Tags, path: '/food-categories' },
      { name: 'العقد', icon: FileSignature, path: '/contract' },
      { name: 'أسعار التوصيل', icon: Truck, path: '/delivery-pricing', drivers: true },
      { name: 'إعدادات النظام', icon: Settings, path: '/settings' },
      { name: 'محتوى الصفحة الرئيسية', icon: LayoutTemplate, path: '/settings?tab=landing' },
    ],
  },
];

/** The menu as shown: driver pages left out while the platform's drivers are off. */
export function visibleMenuGroups(driversEnabled: boolean) {
  return menuGroups
    .map((g) => ({ ...g, items: g.items.filter((it) => driversEnabled || !it.drivers) }))
    .filter((g) => g.items.length > 0);
}

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
