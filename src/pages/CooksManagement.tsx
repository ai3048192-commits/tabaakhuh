import { useState } from "react";
import { Eye, Edit2, Users, CheckCircle, Clock, UserX, X } from "lucide-react";

export default function ChefsManagementFinal() {
  const [activeChef, setActiveChef] = useState<any>(null);

  const chefs = Array.from({ length: 10 }, (_, i) => ({
    id: i + 1,
    name: `طباخة رقم ${i + 1}`,
    kitchen: "مطبخ البيت السعيد",
    area: "القاهرة الجديدة",
    status: i % 3 === 0 ? "نشط" : i % 3 === 1 ? "في الإجازة" : "محظور",
    sales: "١٢،٤٥٠ ج.م"
  }));

  // الألوان متطابقة بين الأيقونة والرقم
  const stats = [
    { label: "إجمالي الطباخات", value: "٤٨", icon: <Users size={22} />, color: "text-gray-600", bg: "bg-gray-100" },
    { label: "طباخات نشطة", value: "٣٢", icon: <CheckCircle size={22} />, color: "text-green-600", bg: "bg-green-50" },
    { label: "طباخات في الإجازة", value: "١٢", icon: <Clock size={22} />, color: "text-orange-500", bg: "bg-orange-50" },
    { label: "حسابات محظورة", value: "٤", icon: <UserX size={22} />, color: "text-red-600", bg: "bg-red-50" },
  ];

  return (
    <div className="p-4 md:p-6 bg-[#fcf9f2] min-h-screen font-['Tajawal']" dir="rtl">
      
      {/* 1. الإحصائيات (متجاوبة + ألوان متطابقة) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {stats.map((item, i) => (
          <div key={i} className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm flex items-center justify-between">
            <div className={`p-3 rounded-xl ${item.bg} ${item.color}`}>{item.icon}</div>
            <div className="text-left">
              <p className="text-[10px] font-bold text-gray-400">{item.label}</p>
              <h3 className={`text-xl font-black ${item.color}`}>{item.value}</h3>
            </div>
          </div>
        ))}
      </div>

      {/* 2. الجدول (يدعم السكرول الأفقي في الموبايل) */}
      <div className="bg-white rounded-[2rem] shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-right min-w-[700px]">
            <thead className="bg-[#fcf8f0] text-gray-500 font-bold text-[13px]">
              <tr>
                <th className="p-6">#</th><th className="p-6">الاسم الكامل</th>
                <th className="p-6">اسم المطبخ</th><th className="p-6">الحي</th>
                <th className="p-6">الحالة</th><th className="p-6">المبيعات</th><th className="p-6">الإجراءات</th>
              </tr>
            </thead>
            <tbody className="text-[13px]">
              {chefs.map((chef) => (
                <tr key={chef.id} className="border-b border-gray-50 hover:bg-orange-50/30 transition-colors">
                  <td className="p-6 font-bold">{chef.id}</td>
                  <td className="p-6 font-black text-gray-800">{chef.name}</td>
                  <td className="p-6 text-gray-600">{chef.kitchen}</td>
                  <td className="p-6 text-gray-600">{chef.area}</td>
                  <td className="p-6 font-bold text-[11px]">{chef.status}</td>
                  <td className="p-6 font-black text-[#7a0d0d]">{chef.sales}</td>
                  <td className="p-6 flex gap-4 text-gray-400">
                    <Edit2 onClick={() => setActiveChef(chef)} size={18} className="cursor-pointer hover:text-[#7a0d0d]" />
                    <Eye onClick={() => setActiveChef(chef)} size={18} className="cursor-pointer hover:text-blue-600" />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* 3. المودال (الفورم) */}
      {activeChef && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-sm rounded-[2rem] p-8 shadow-2xl relative">
            <button onClick={() => setActiveChef(null)} className="absolute left-6 top-6"><X size={20} /></button>
            <h2 className="text-lg font-black text-[#7a0d0d] mb-6">تعديل بيانات: {activeChef.name}</h2>
            <div className="space-y-4">
              <input className="w-full p-3 bg-gray-50 rounded-xl border text-sm" defaultValue={activeChef.name} />
              <input className="w-full p-3 bg-gray-50 rounded-xl border text-sm" defaultValue={activeChef.kitchen} />
              <button onClick={() => setActiveChef(null)} className="w-full bg-[#7a0d0d] text-white py-3 rounded-xl font-black text-sm">حفظ التغييرات</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}