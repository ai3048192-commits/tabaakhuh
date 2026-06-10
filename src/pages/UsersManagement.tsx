import { useState } from "react";
import AddUserModal from "../components/AddUserModal";
import { Eye, Pencil, Ban, User, Calendar, Search, X, Check, Users, UserCheck, UserMinus, UserX } from "lucide-react";

export default function UsersManagement() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [users, setUsers] = useState([
    { id: 1, name: "أحمد محمود", email: "ahmed@example.com", phone: "012345678", date: "13 مارس 2024", status: "نشط" },
    { id: 2, name: "سارة علي", email: "sara@test.com", phone: "010998877", date: "10 مارس 2024", status: "معطل" },
    { id: 3, name: "محمد إبراهيم", email: "mo@work.com", phone: "010443322", date: "08 مارس 2024", status: "محظور" },
  ]);

  const [activeAction, setActiveAction] = useState<{ type: string, user: any } | null>(null);

  // تحديث الحالة
  const handleConfirmAction = (userId: number, newStatus?: string) => {
    if (activeAction?.type === 'ban') {
      setUsers(users.map(u => u.id === userId ? { ...u, status: "محظور" } : u));
    }
    setActiveAction(null);
  };

  const getStatusStyle = (status: string) => {
    switch(status) {
      case "نشط": return "bg-green-100 text-green-700";
      case "معطل": return "bg-yellow-100 text-yellow-700";
      case "محظور": return "bg-red-100 text-red-700";
      default: return "bg-gray-100 text-gray-700";
    }
  };

  return (
    <div className="p-6 bg-[#fcf9f2] min-h-screen" dir="rtl">
      {/* 1. الإحصائيات */}
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8" dir="rtl">
  {[
    { label: "إجمالي الإيرادات", val: 45178, color: "text-[#7a0d0d]", bg: "bg-pink-50", icon: <Users size={24} /> },
    { label: "إيرادات اليوم", val: 2500, color: "text-green-600", bg: "bg-green-50", icon: <UserCheck size={24} /> },
    { label: "إجمالي الطلبات", val: 567, color: "text-orange-500", bg: "bg-orange-50", icon: <UserMinus size={24} /> },
    { label: "إجمالي الطباخات", val: 48, color: "text-red-500", bg: "bg-red-50", icon: <UserX size={24} /> },
  ].map((item, i) => (
    <div key={i} className="bg-white p-5 rounded-[1rem] border border-[#e8dfc9] shadow-sm flex items-center justify-between">
      {/* جهة اليمين: النصوص */}
      <div className="text-right">
        <p className="text-[11px] text-gray-400 font-bold mb-1">{item.label}</p>
        
        {/* هنا تم التأكد من استخدام item.color للرقم */}
        <p className={`font-black text-xl ${item.color}`}>
          {item.val.toLocaleString('ar-EG')} {i < 2 ? "ج.م" : ""}
        </p>
      </div>

      {/* جهة اليسار: الأيقونة */}
      {/* الأيقونة والخلفية يأخذان نفس الـ color والـ bg */}
      <div className={`w-14 h-14 rounded-[1rem] flex items-center justify-center ${item.bg} ${item.color}`}>
        {item.icon}
      </div>
    </div>
  ))}
</div>

      {/* 2. البحث */}
      <div className="flex gap-4 mb-8 bg-white p-4 rounded-[1rem] border border-[#e8dfc9] shadow-sm">
        <div className="flex items-center gap-2 border rounded-[1rem] px-4 py-2 w-full"><Calendar size={18} className="text-gray-400"/><input placeholder="التاريخ..." className="outline-none w-full"/></div>
        <div className="flex items-center gap-2 border rounded-[1rem] px-4 py-2 w-full"><Search size={18} className="text-gray-400"/><input placeholder="بحث بالاسم أو الإيميل..." className="outline-none w-full"/></div>
      </div>

      {/* 3. الجدول */}
      <div className="bg-white rounded-[1rem] p-6 border border-[#e8dfc9] shadow-sm overflow-x-auto">
        <table className="w-full text-right border-separate border-spacing-y-3">
          <thead>
            <tr className="text-gray-400 text-sm">
              <th className="pr-4">#</th>
              <th>المستخدم</th>
              <th>التواصل</th>
              <th>الحالة</th>
              <th className="text-left pl-4">الإجراءات</th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => (
              <tr key={user.id} className="bg-gray-50/50 hover:bg-gray-100/50 transition">
                <td className="py-4 pr-4 font-bold text-gray-400 rounded-r-2xl">{user.id}</td>
                <td className="py-4 font-bold text-gray-800">{user.name}</td>
                <td className="py-4 text-sm text-gray-600">{user.email}</td>
                <td className="py-4"><span className={`px-3 py-1 rounded-full text-[10px] font-bold ${getStatusStyle(user.status)}`}>{user.status}</span></td>
                <td className="py-4 text-left pl-4 rounded-l-2xl">
                  <div className="flex gap-2 justify-end">
                    <button onClick={() => setActiveAction({ type: 'view', user })} className="p-2 bg-white border border-[#e8dfc9] rounded-[1rem] hover:text-[#7a0d0d]"><Eye size={16} /></button>
                    <button onClick={() => setActiveAction({ type: 'edit', user })} className="p-2 bg-white border border-[#e8dfc9] rounded-[1rem] hover:text-[#7a0d0d]"><Pencil size={16} /></button>
                    <button onClick={() => setActiveAction({ type: 'ban', user })} className="p-2 bg-white border border-red-100 rounded-[1rem] text-red-500 hover:bg-red-50"><Ban size={16} /></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* نافذة الإجراءات (النموذج) */}
      {activeAction && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#fcf9f2] w-full max-w-sm rounded-[2rem] p-6 border border-[#e8dfc9] shadow-2xl relative">
            <button onClick={() => setActiveAction(null)} className="absolute left-4 top-4 p-2 hover:bg-black/5 rounded-full"><X size={18} /></button>
            <h3 className="text-lg font-black text-[#7a0d0d] mb-4 text-center">
              {activeAction.type === 'ban' ? `حظر ${activeAction.user.name}` : 'تفاصيل المستخدم'}
            </h3>
            {activeAction.type === 'ban' ? (
              <div className="space-y-4">
                <textarea className="w-full p-4 rounded-2xl border border-red-200 bg-white" placeholder="سبب الحظر..." />
                <button onClick={() => handleConfirmAction(activeAction.user.id)} className="w-full py-3 bg-red-600 text-white rounded-2xl font-bold flex justify-center gap-2">
                  <Check size={18} /> تأكيد الحظر
                </button>
              </div>
            ) : (
              <div className="space-y-3 text-center text-gray-600">
                <p>الاسم: {activeAction.user.name}</p>
                <p>الإيميل: {activeAction.user.email}</p>
              </div>
            )}
          </div>
        </div>
      )}

      {isModalOpen && <AddUserModal onClose={() => setIsModalOpen(false)} />}
    </div>
  );
}