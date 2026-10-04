import { LogOut, X } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import logoIcon from '../assets/logo_icon_trim.png';
import { isActivePath, menuGroups } from './navItems';


export default function Sidebar({ isOpen, onClose }: { isOpen: boolean, onClose: () => void }) {
  const location = useLocation();
  const { signOut } = useAuth();

  return (
    <>
      {/* طبقة التعتيم للموبايل */}
      {isOpen && <div className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm lg:hidden" onClick={onClose}></div>}

      <aside
        className={`fixed right-0 top-0 z-50 flex h-screen w-72 transform flex-col overflow-hidden bg-gradient-to-b from-[#6e0b0b] via-[#560808] to-[#2e0404] text-white shadow-2xl transition-transform duration-500 ease-in-out lg:static lg:translate-x-0 ${isOpen ? 'translate-x-0' : 'translate-x-full'}`}
      >
        <div className="pointer-events-none absolute inset-0 opacity-[0.05] [background-image:radial-gradient(circle,#fff_1.5px,transparent_1.5px)] [background-size:20px_20px]" aria-hidden="true" />
        <div className="pointer-events-none absolute -left-16 top-1/3 h-48 w-48 rounded-full bg-[#e0a52e]/15 blur-3xl" aria-hidden="true" />

        {/* الشعار وزر الإغلاق */}
        <div className="relative flex shrink-0 items-center justify-between px-6 pb-6 pt-7">
          <div className="flex items-center gap-3">
            <span className="grid h-12 w-12 place-items-center rounded-2xl bg-white/10 ring-1 ring-white/15">
              <img src={logoIcon} alt="" className="h-8 w-8 object-contain" />
            </span>
            <div>
              <h1 className="text-xl font-black tracking-wide">طباخة</h1>
              <p className="text-[11px] font-bold text-[#ffd27a]/80">لوحة الإدارة</p>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="إغلاق القائمة"
            className="rounded-xl bg-white/10 p-2 transition-all hover:bg-white/20 lg:hidden"
          >
            <X size={22} aria-hidden="true" />
          </button>
        </div>

        <nav className="relative min-h-0 flex-1 space-y-5 overflow-y-auto px-4 pb-4">
          {menuGroups.map((group) => (
            <div key={group.title}>
              <p className="mb-1.5 px-3 text-[10px] font-black tracking-wider text-white/35">{group.title}</p>
              <div className="space-y-0.5">
                {group.items.map((item) => {
                  const Icon = item.icon;
                  const isActive = isActivePath(item.path, location.pathname, location.search);
                  return (
                    <Link
                      key={item.path}
                      to={item.path}
                      onClick={onClose}
                      aria-current={isActive ? 'page' : undefined}
                      className={`group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-bold transition-all duration-200 ${
                        isActive
                          ? 'bg-white text-[#7a0d0d] shadow-lg shadow-black/20'
                          : 'text-white/70 hover:bg-white/10 hover:text-white'
                      }`}
                    >
                      <span
                        className={`grid h-8 w-8 shrink-0 place-items-center rounded-lg transition ${
                          isActive ? 'bg-[#7a0d0d] text-[#ffd27a]' : 'bg-white/5 text-white/60 group-hover:text-[#ffd27a]'
                        }`}
                      >
                        <Icon size={16} aria-hidden="true" />
                      </span>
                      {item.name}
                      {isActive && <span className="absolute left-3 h-1.5 w-1.5 rounded-full bg-[#b68614]" aria-hidden="true" />}
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        <div className="relative shrink-0 border-t border-white/10 p-4">
          <button
            type="button"
            onClick={() => { onClose(); void signOut(); }}
            className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-bold text-white/70 transition-all hover:bg-white/10 hover:text-white"
          >
            <span className="grid h-8 w-8 place-items-center rounded-lg bg-white/5">
              <LogOut size={16} aria-hidden="true" />
            </span>
            تسجيل الخروج
          </button>
        </div>
      </aside>
    </>
  );
}
