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

        {/* الشعار + الخروج (+ زر الإغلاق على الموبايل) */}
        <div className="relative flex shrink-0 items-center justify-between gap-2 px-5 pb-4 pt-5 short:pb-2 short:pt-3">
          <div className="flex items-center gap-2.5">
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-white/10 ring-1 ring-white/15 short:h-9 short:w-9">
              <img src={logoIcon} alt="" className="h-7 w-7 object-contain" />
            </span>
            <div>
              <h1 className="text-lg font-black leading-tight tracking-wide">طباخة</h1>
              <p className="text-[10px] font-bold text-[#ffd27a]/80">لوحة الإدارة</p>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => { onClose(); void signOut(); }}
              aria-label="تسجيل الخروج"
              title="تسجيل الخروج"
              className="grid h-9 w-9 place-items-center rounded-xl bg-white/10 text-white/75 transition-all hover:bg-white/20 hover:text-white"
            >
              <LogOut size={17} aria-hidden="true" />
            </button>
            <button
              onClick={onClose}
              aria-label="إغلاق القائمة"
              className="grid h-9 w-9 place-items-center rounded-xl bg-white/10 transition-all hover:bg-white/20 lg:hidden"
            >
              <X size={20} aria-hidden="true" />
            </button>
          </div>
        </div>

        {/* القائمة — مضغوطة بحيث تكفي الشاشة من غير اسكرول (والاسكرول احتياطي للشاشات القصيرة جدًا) */}
        <nav className="sidebar-scroll relative min-h-0 flex-1 space-y-3 overflow-y-auto px-3 pb-3 short:space-y-1 tiny:space-y-0.5">
          {menuGroups.map((group, gi) => (
            <div key={group.title}>
              <p className="mb-1 px-3 text-[10px] font-black tracking-wider text-white/35 short:hidden">{group.title}</p>
              {gi > 0 && <div className="mx-3 mb-1 hidden h-px bg-white/10 short:block tiny:hidden" aria-hidden="true" />}
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
                      className={`group relative flex items-center gap-2.5 rounded-xl px-2.5 py-1.5 text-[13px] font-bold transition-all duration-200 short:py-[3px] tiny:py-0.5 ${
                        isActive
                          ? 'bg-white text-[#7a0d0d] shadow-lg shadow-black/20'
                          : 'text-white/70 hover:bg-white/10 hover:text-white'
                      }`}
                    >
                      <span
                        className={`grid h-7 w-7 shrink-0 place-items-center rounded-lg transition tiny:h-6 tiny:w-6 ${
                          isActive ? 'bg-[#7a0d0d] text-[#ffd27a]' : 'bg-white/5 text-white/60 group-hover:text-[#ffd27a]'
                        }`}
                      >
                        <Icon size={15} aria-hidden="true" />
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
      </aside>
    </>
  );
}
