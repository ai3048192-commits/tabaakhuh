import { Menu, User } from 'lucide-react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { displayName } from '../auth/types';
import { currentPageName } from './navItems';

const ROLE_LABELS: Record<string, string> = {
  admin: 'مدير النظام',
};

// نستقبل الدالة toggleSidebar كـ prop من الأب (App.tsx)
export default function Header({ toggleSidebar }: { toggleSidebar: () => void }) {
  const { account } = useAuth();
  const location = useLocation();
  const title = currentPageName(location.pathname, location.search) ?? 'لوحة التحكم';

  return (
    <header className="sticky top-0 z-40 flex items-center justify-between gap-3 border-b border-[#efe3cc] bg-white/85 px-4 py-3 backdrop-blur-xl md:px-8">
      <div className="flex items-center gap-3">
        {/* زر القائمة للموبايل - يظهر فقط في الشاشات الصغيرة */}
        <button
          onClick={toggleSidebar}
          aria-label="فتح القائمة"
          className="rounded-xl bg-[#7a0d0d] p-2 text-white transition-all hover:bg-[#5a0909] lg:hidden"
        >
          <Menu size={22} aria-hidden="true" />
        </button>
        <p className="text-base font-black text-[#7a0d0d] md:text-lg">{title}</p>
      </div>

      {/* الملف الشخصي للمدير */}
      <div className="flex items-center gap-3 rounded-2xl bg-[#faf3e7] py-1.5 pl-1.5 pr-3 ring-1 ring-[#efe3cc]">
        <div className="hidden text-right sm:block">
          <p className="text-sm font-black text-gray-800">
            {account ? displayName(account) : '—'}
          </p>
          <p className="text-[10px] font-bold text-[#b68614]">
            {account ? ROLE_LABELS[account.role] ?? account.role : ''}
          </p>
        </div>
        <div className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-xl bg-[#7a0d0d] text-[#ffd27a]">
          {account?.avatar_url ? (
            <img src={account.avatar_url} alt="" className="h-full w-full object-cover" />
          ) : (
            <User size={18} />
          )}
        </div>
      </div>
    </header>
  );
}
