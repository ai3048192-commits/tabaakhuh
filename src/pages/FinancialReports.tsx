import { useState } from "react";
import { Wallet, ShoppingBag, Percent, TrendingUp } from "lucide-react";

// بيانات الرسوم البيانية المتغيرة
const CHARTS_DATA = {
  "هذا الأسبوع": { rev: [80, 60, 45, 90, 50, 75, 100], ord: [30, 50, 40, 60, 45, 70, 85] },
  "هذا الشهر": { rev: [40, 90, 30, 100, 60, 80, 50], ord: [20, 70, 50, 90, 40, 60, 30] },
  "هذا الربع": { rev: [100, 100, 80, 90, 100, 95, 100], ord: [80, 85, 90, 80, 95, 90, 100] },
  "هذا العام": { rev: [50, 70, 60, 85, 40, 90, 60], ord: [40, 60, 50, 70, 30, 80, 50] },
};

export default function FinancialReports() {
  const [filter, setFilter] = useState("هذا الأسبوع");
  const currentData = CHARTS_DATA[filter as keyof typeof CHARTS_DATA] || CHARTS_DATA["هذا الأسبوع"];

  const stats = [
    { title: "إجمالي دخل المنصة", value: "١٢٣,٤٥٦", unit: "ج.م", icon: Wallet, color: "text-orange-600", bg: "bg-orange-100" },
    { title: "إجمالي الطلبات", value: "٥١٧", unit: "طلب", icon: ShoppingBag, color: "text-red-600", bg: "bg-red-100" },
    { title: "عمولة المنصة (١٠٪)", value: "١٢,٣٤٥", unit: "ج.م", icon: Percent, color: "text-emerald-600", bg: "bg-emerald-100" },
    { title: "صافي الأرباح", value: "١١١,١١١", unit: "ج.م", icon: TrendingUp, color: "text-orange-600", bg: "bg-orange-100" },
  ];

  return (
    <div className="p-4 lg:p-8 bg-[#f7f1e6] min-h-screen font-['Tajawal']" dir="rtl">
      {/* 1. البطاقات (الأيقونات جانب الرقم) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {stats.map((s, i) => (
          <div key={i} className="bg-[#fffcf7] p-5 rounded-2xl border border-orange-100 flex items-center gap-4 hover:shadow-md transition-all">
            <div className={`p-3 rounded-xl ${s.bg} ${s.color}`}><s.icon size={24} /></div>
            <div>
              <p className="text-[10px] text-gray-400 font-bold">{s.title}</p>
              <h3 className={`text-lg font-black ${s.color}`}>{s.value} <span className="text-[10px]">{s.unit}</span></h3>
            </div>
          </div>
        ))}
      </div>

      {/* 2. أزرار الفلتر التفاعلية */}
      <div className="flex gap-2 mb-8 overflow-x-auto pb-2">
        {["هذا الأسبوع", "هذا الشهر", "هذا الربع", "هذا العام"].map((f) => (
          <button key={f} onClick={() => setFilter(f)} className={`px-6 py-2 rounded-xl text-xs font-bold whitespace-nowrap ${filter === f ? 'bg-[#7a0d0d] text-white' : 'bg-white border'}`}>
            {f}
          </button>
        ))}
      </div>

      {/* 3. الرسوم البيانية التفاعلية */}
  {/* الرسوم البيانية - تصميم ثابت وواضح */}
<div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-10">
  {[ 
    { 
      title: "إيرادات الـ ٧ أيام الماضية", 
      data: currentData.rev, 
      gradient: "from-[#7a0d0d] to-[#d4a3a3]" 
    }, 
    { 
      title: "عدد الطلبات اليومية", 
      data: currentData.ord, 
      gradient: "from-[#e6a836] to-[#fce0a8]" 
    } 
  ].map((chart, i) => (
    <div key={i} className="bg-[#fffcf7] p-8 rounded-[2rem] border border-orange-100 shadow-sm">
      <h4 className="font-black text-[#7a0d0d] mb-10 text-sm">{chart.title}</h4>
      
      {/* الحاوية الأساسية للرسم البياني مع ارتفاع ثابت 200px */}
      <div className="h-[200px] flex items-end justify-between gap-3 border-b-2 border-gray-200 pb-2">
        {chart.data.map((h, j) => (
          <div key={j} className="w-full flex flex-col items-center relative h-full justify-end">
            {/* الرقم ظاهر فوق العمود مباشرة */}
            <span className="text-[10px] font-bold text-gray-700 mb-2">{h}</span>
            
            {/* العمود بتنسيق مضمون الظهور */}
            <div 
              style={{ height: `${h}%`, minHeight: '10px' }} 
              className={`w-full rounded-t-xl bg-gradient-to-t ${chart.gradient}`}
            ></div>
          </div>
        ))}
      </div>
      
      {/* أيام الأسبوع */}
      <div className="flex justify-between mt-4 text-[10px] font-bold text-gray-400">
        {['الجمعة', 'الخميس', 'الأربعاء', 'الثلاثاء', 'الإثنين', 'الأحد', 'السبت'].map((day, d) => (
          <span key={d}>{day}</span>
        ))}
      </div>
    </div>
  ))}
</div>
      {/* 4. الجداول الموسعة (بيانات الطباخين والمدفوعات) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-[#fffcf7] rounded-[1rem] border p-6 overflow-x-auto">
          <h4 className="font-black text-[#7a0d0d] mb-6">العمولات والمستحقات</h4>
          <table className="w-full text-right text-xs">
            <thead><tr className="text-gray-400 border-b"><th className="pb-3">الطباخ</th><th className="pb-3">المبيعات</th><th className="pb-3">الحالة</th></tr></thead>
            <tbody>
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <tr key={i} className="border-b border-orange-50 hover:bg-orange-50/50">
                  <td className="py-4 font-bold">مطبخ أمينة حسن {i}</td>
                  <td className="py-4 font-bold">١٢,٤٥٠ ج.م</td>
                  <td className="py-4 text-emerald-600 font-bold">مدفوع</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="bg-[#fffcf7] rounded-[1rem] border p-6 overflow-x-auto">
          <h4 className="font-black text-[#7a0d0d] mb-6">سجل المدفوعات الأخير</h4>
          <table className="w-full text-right text-xs">
            <thead><tr className="text-gray-400 border-b"><th className="pb-3">الطباخ</th><th className="pb-3">المبلغ</th><th className="pb-3">الحالة</th></tr></thead>
            <tbody>
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <tr key={i} className="border-b border-orange-50 hover:bg-orange-50/50">
                  <td className="py-4 font-bold">طباخة سارة {i}</td>
                  <td className="py-4 font-bold">٤,٢٠٠ ج.م</td>
                  <td className="py-4 text-orange-600 font-bold">قيد المراجعة</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}