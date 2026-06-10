import { Menu, Bell, User, Search } from 'lucide-react';

// نستقبل الدالة toggleSidebar كـ prop من الأب (App.tsx)
export default function Header({ toggleSidebar }: { toggleSidebar: () => void }) {
  return (
    <header className="bg-white p-4 flex items-center justify-between shadow-sm sticky top-0 z-40 border-b border-gray-100">
      
      {/* زر القائمة للموبايل - يظهر فقط في الشاشات الصغيرة */}
      <button 
        onClick={toggleSidebar} 
        className="lg:hidden p-2 bg-[#7a0d0d] text-white rounded-xl hover:bg-[#5a0909] transition-all"
      >
        <Menu size={22} />
      </button>

      {/* شريط البحث - يظهر في الشاشات المتوسطة والكبيرة */}
      <div className="hidden md:flex items-center bg-gray-50 px-4 py-2 rounded-xl border border-gray-100">
        <Search size={18} className="text-gray-400" />
        <input 
          type="text" 
          placeholder="بحث في الطلبات..." 
          className="bg-transparent border-none outline-none mr-2 text-sm text-gray-700"
        />
      </div>

      {/* العنوان في المنتصف للموبايل */}
      <h1 className="text-lg font-black text-[#7a0d0d] lg:hidden">لوحة التحكم</h1>

      {/* الجانب الأيمن: الإشعارات والملف الشخصي */}
      <div className="flex items-center gap-4">
        
        {/* أيقونة الإشعارات */}
        <button className="relative p-2 text-gray-600 hover:bg-gray-100 rounded-full transition-all">
          <Bell size={22} />
          {/* النقطة الحمراء للتنبيه */}
          <span className="absolute top-2 right-2 w-2 h-2 bg-red-600 rounded-full border-2 border-white"></span>
        </button>
        
        {/* الملف الشخصي للمدير */}
        <div className="flex items-center gap-3 border-r pr-4">
          <div className="text-right hidden sm:block">
            <p className="text-sm font-black text-gray-800">أحمد إسماعيل</p>
            <p className="text-[10px] text-gray-400 font-bold">مدير النظام</p>
          </div>
          <div className="w-10 h-10 bg-[#7a0d0d]/10 rounded-full flex items-center justify-center text-[#7a0d0d]">
            <User size={20} />
          </div>
        </div>
      </div>
    </header>
  );
}