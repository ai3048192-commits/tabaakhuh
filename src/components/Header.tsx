import { Menu, User } from 'lucide-react';
import { useAuth } from '../auth/AuthContext';
import { displayName } from '../auth/types';

const ROLE_LABELS: Record<string, string> = {
  admin: 'مدير النظام',
};

// نستقبل الدالة toggleSidebar كـ prop من الأب (App.tsx)
export default function Header({ toggleSidebar }: { toggleSidebar: () => void }) {
  const { account } = useAuth();

  return (
    <header className="bg-white p-4 flex items-center justify-between shadow-sm sticky top-0 z-40 border-b border-gray-100">

      {/* زر القائمة للموبايل - يظهر فقط في الشاشات الصغيرة */}
      <button
        onClick={toggleSidebar}
        aria-label="فتح القائمة"
        className="lg:hidden p-2 bg-[#7a0d0d] text-white rounded-xl hover:bg-[#5a0909] transition-all"
      >
        <Menu size={22} aria-hidden="true" />
      </button>

      {/* العنوان في المنتصف للموبايل */}
      <h1 className="text-lg font-black text-[#7a0d0d] lg:hidden">لوحة التحكم</h1>

      {/* مباعد فارغ يُبقي الملف الشخصي في أقصى الجهة على الشاشات الكبيرة */}
      <div className="hidden lg:block" aria-hidden="true" />

      {/* الملف الشخصي للمدير */}
      <div className="flex items-center gap-3">
        <div className="text-right hidden sm:block">
          <p className="text-sm font-black text-gray-800">
            {account ? displayName(account) : '—'}
          </p>
          <p className="text-[10px] text-gray-400 font-bold">
            {account ? ROLE_LABELS[account.role] ?? account.role : ''}
          </p>
        </div>
        <div className="w-10 h-10 bg-[#7a0d0d]/10 rounded-full flex items-center justify-center text-[#7a0d0d] overflow-hidden">
          {account?.avatar_url ? (
            <img src={account.avatar_url} alt="" className="h-full w-full object-cover" />
          ) : (
            <User size={20} />
          )}
        </div>
      </div>
    </header>
  );
}
