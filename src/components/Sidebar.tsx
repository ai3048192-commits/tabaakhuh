import {
  LayoutGrid, Users, ShoppingBag, ChefHat,
  TrendingUp, MessageSquareWarning, Settings, LogOut, X,
  Bike, MapPin, Wallet
} from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';

// مصفوفة الروابط المحدثة
const menuItems = [
  { name: 'لوحة التحكم', icon: LayoutGrid, path: '/dashboard' },
  { name: 'إدارة المستخدمين', icon: Users, path: '/users' },
  { name: 'مراقبة الطلبات', icon: ShoppingBag, path: '/orders' },
  { name: 'إدارة الطباخات', icon: ChefHat, path: '/cooks' },
  { name: 'طلبات السائقين', icon: Bike, path: '/drivers' },
  { name: 'إدارة الدليفري', icon: Bike, path: '/delivery' },
  { name: 'طلبات السحب', icon: Wallet, path: '/withdrawals' },
  { name: 'التقارير المالية', icon: TrendingUp, path: '/reports' },
  { name: 'الشكاوى والاقتراحات', icon: MessageSquareWarning, path: '/complaints' },
  { name: 'إدارة المدن', icon: MapPin, path: '/cities' },
  { name: 'إعدادات النظام', icon: Settings, path: '/settings' },
];





export default function Sidebar({ isOpen, onClose }: { isOpen: boolean, onClose: () => void }) {
  const location = useLocation();
  const { signOut } = useAuth();

  return (
    <>
      {/* طبقة التعتيم للموبايل */}
      {isOpen && <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40 lg:hidden" onClick={onClose}></div>}

      <aside className={`fixed top-0 right-0 flex h-screen w-72 flex-col bg-[#7a0d0d] text-white z-50 shadow-2xl transform transition-transform duration-500 ease-in-out lg:translate-x-0 lg:static ${isOpen ? 'translate-x-0' : 'translate-x-full'}`}>
        <div className="h-1 w-full shrink-0 bg-[#b68614]"></div>

        {/* الشعار وزر الإغلاق */}
        <div className="flex shrink-0 items-center justify-between px-8 pb-8 pt-8">
          <div className="flex items-center gap-3">
             <ChefHat className="text-yellow-400" size={32} />
             <h1 className="text-2xl font-black tracking-widest">طباخة</h1>
          </div>
          <button
            onClick={onClose}
            className="lg:hidden p-2 bg-[#9a1212] rounded-xl hover:bg-[#b68614] transition-all"
          >
            <X size={24} />
          </button>
        </div>

        {/* القائمة المحدثة */}
        <nav className="min-h-0 flex-1 space-y-1 overflow-y-auto px-8 pb-4">
          {menuItems.map((item, index) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path;
              
              return (
                <Link 
                  key={index} 
                  to={item.path} 
                  onClick={onClose}
                  className={`relative flex items-center gap-4 p-4 rounded-xl transition-all duration-300 font-bold text-sm ${
                    isActive 
                      ? 'bg-[#9a1212] text-white border-r-4 border-[#b68614] shadow-lg' 
                      : 'text-red-200 hover:text-white hover:bg-[#8b1a1a]'
                  }`}
                >
                  <Icon size={20} className={isActive ? "text-yellow-400" : "text-red-300"} />
                  {item.name}
                  {isActive && <div className="absolute left-4 w-2 h-2 bg-yellow-400 rounded-full shadow-[0_0_8px_#facc15]"></div>}
                </Link>
              );
            })}
        </nav>

        <div className="shrink-0 border-t border-[#9a1212] px-8 py-6">
          <button
            type="button"
            onClick={() => { onClose(); void signOut(); }}
            className="flex items-center gap-4 text-red-200 hover:text-white transition-all font-bold"
          >
            <LogOut size={20} aria-hidden="true" />
            تسجيل الخروج
          </button>
        </div>
      </aside>
    </>
  );
}