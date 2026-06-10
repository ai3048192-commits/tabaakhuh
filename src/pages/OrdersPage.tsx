import { useState } from "react";
import { Eye, FileText, Sun, ChefHat, Truck, CheckCheck, X, XCircle } from "lucide-react";

export default function OrdersManagementFull() {
  const [activeTab, setActiveTab] = useState("الكل");
  const [activeOrder, setActiveOrder] = useState<any>(null);

  const toArabic = (num: string) => num.replace(/\d/g, d => "٠١٢٣٤٥٦٧٨٩"[parseInt(d)]);

  // ١٠ طلبات متنوعة
  const [orders] = useState([
    { id: 1, orderNum: "#١٢٣٥١٢", customer: "أحمد محمود", chef: "مطبخ أميرة", total: "٨٥٠ ج.م", status: "جديد", type: "جديد", sColor: "bg-[#fff9e6] text-[#b48c36] border-[#f5e6c4]" },
    { id: 2, orderNum: "#١٢٣٥١٧", customer: "سارة علي", chef: "أكل بيتي هبة", total: "١٤٠٠ ج.م", status: "قيد التحضير", type: "قيد التحضير", sColor: "bg-orange-50 text-orange-400 border-orange-100" },
    { id: 3, orderNum: "#١٢٣٥٢٢", customer: "محمد حسن", chef: "مشويات الشيف عادل", total: "٣٢٠ ج.م", status: "في الطريق", type: "في الطريق", sColor: "bg-blue-50 text-blue-400 border-blue-100" },
    { id: 4, orderNum: "#١٢٣٥٤١", customer: "فاطمة الزهراء", chef: "مطبخ ست الكل", total: "٣١٠ ج.م", status: "مكتمل", type: "مكتمل", sColor: "bg-emerald-50 text-emerald-600 border-emerald-100" },
    { id: 5, orderNum: "#١٢٣٥٥٥", customer: "ياسين إبراهيم", chef: "معجنات زيزي", total: "٩٥ ج.م", status: "ملغية", type: "ملغية", sColor: "bg-red-50 text-red-500 border-red-100" },
    { id: 6, orderNum: "#١٢٣٥٦٠", customer: "نادية حسين", chef: "مطبخ أميرة", total: "١١٠ ج.م", status: "مكتمل", type: "مكتمل", sColor: "bg-emerald-50 text-emerald-600 border-emerald-100" },
    { id: 7, orderNum: "#١٢٣٥٦٨", customer: "خالد سعيد", chef: "مشويات الشيف عادل", total: "٥٥٠ ج.م", status: "جديد", type: "جديد", sColor: "bg-[#fff9e6] text-[#b48c36] border-[#f5e6c4]" },
    { id: 8, orderNum: "#١٢٣٥٧٢", customer: "ليلى يوسف", chef: "أكل بيتي هبة", total: "٢١٠ ج.م", status: "قيد التحضير", type: "قيد التحضير", sColor: "bg-orange-50 text-orange-400 border-orange-100" },
    { id: 9, orderNum: "#١٢٣٥٨٠", customer: "عمر فاروق", chef: "معجنات زيزي", total: "١٣٠ ج.م", status: "في الطريق", type: "في الطريق", sColor: "bg-blue-50 text-blue-400 border-blue-100" },
    { id: 10, orderNum: "#١٢٣٥٩٥", customer: "مريم إيهاب", chef: "مطبخ ست الكل", total: "٤٠٠ ج.م", status: "ملغية", type: "ملغية", sColor: "bg-red-50 text-red-500 border-red-100" },
  ]);

  const stats = [
    { label: "إجمالي الطلبات", value: "١,١٢٤", color: "text-[#7a0d0d]", bg: "bg-pink-50", icon: <FileText size={20} /> },
    { label: "جديدة", value: "١,١٠٠", color: "text-orange-400", bg: "bg-green-50", icon: <Sun size={20} /> },
    { label: "قيد التحضير", value: "١٥", color: "text-[#1a4d2e]", bg: "bg-orange-50", icon: <ChefHat size={20} /> },
    { label: "في الطريق", value: "٩", color: "text-blue-500", bg: "bg-red-50", icon: <Truck size={20} /> },
    { label: "مكتملة", value: "٩", color: "text-teal-400", bg: "bg-red-50", icon: <CheckCheck size={20} /> },
    { label: "ملغية", value: "٥", color: "text-red-500", bg: "bg-red-50", icon: <XCircle size={20} /> },
  ];

  const filteredOrders = activeTab === "الكل" ? orders : orders.filter(o => o.type === activeTab);

  return (
    <div className="p-4 md:p-6 bg-[#fcf9f2] min-h-screen font-['Tajawal']" dir="rtl">
      
      {/* 1. الإحصائيات (خلفية بيضاء) */}
<div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
  {stats.map((item, i) => (
    <div key={i} className="bg-white p-4 rounded-[1rem] border border-[#ede3d0] flex justify-between items-center shadow-sm">
      <div>
        <p className="text-[10px] font-black text-gray-400 uppercase">{item.label}</p>
        {/* تم تغيير لون الرقم هنا ليأخذ لون الأيقونة الموجود في item.color */}
        <h3 className={`text-xl font-black ${item.color}`}>{item.value}</h3>
      </div>
      <div className={`p-3 rounded-[1rem] ${item.bg} ${item.color}`}>
        {item.icon}
      </div>
    </div>
  ))}
</div>

      {/* 2. الجدول */}
      <div className="bg-white rounded-[1rem] shadow-sm border border-orange-100 p-6 overflow-x-auto">
        <div className="flex gap-2 mb-6">
          {['الكل', 'جديد', 'قيد التحضير', 'في الطريق', 'مكتمل', 'ملغية'].map((tab) => (
            <button key={tab} onClick={() => setActiveTab(tab)}
              className={`px-5 py-2 rounded-full text-[11px] font-black whitespace-nowrap transition-all ${activeTab === tab ? 'bg-[#7a0d0d] text-white shadow-lg' : 'bg-gray-50 text-gray-500 hover:bg-orange-50'}`}>
              {tab}
            </button>
          ))}
        </div>

        <table className="w-full text-right min-w-[600px]">
          <thead className="bg-[#fcf8f0] text-[#7a0d0d] text-[12px] font-black">
            <tr>
              <th className="p-4">رقم الطلب</th><th className="p-4">العميل</th>
              <th className="p-4">الطباخ</th><th className="p-4">الحالة</th><th className="p-4 text-center">إجراء</th>
            </tr>
          </thead>
          <tbody className="text-[12px]">
            {filteredOrders.map((order) => (
              <tr key={order.id} className="border-b hover:bg-orange-50/20">
                <td className="p-4 font-black">{toArabic(order.orderNum.replace("#",""))}</td>
                <td className="p-4 font-bold">{order.customer}</td>
                <td className="p-4 text-gray-600">{order.chef}</td>
                <td className="p-4"><span className={`px-3 py-1 rounded-full border text-[10px] font-black ${order.sColor}`}>{order.status}</span></td>
                <td className="p-4 text-center">
                  <button onClick={() => setActiveOrder(order)} className="text-blue-500 hover:scale-110 transition-transform"><Eye size={18} /></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* 3. المودال (الفورم) */}
      {activeOrder && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-sm rounded-[2rem] p-8 shadow-2xl relative">
            <button onClick={() => setActiveOrder(null)} className="absolute left-6 top-6"><X size={20} /></button>
            <h2 className="text-xl font-black text-[#7a0d0d] mb-6 text-center">تفاصيل الطلب {activeOrder.orderNum}</h2>
            <div className="space-y-3">
              <div className="p-3 bg-gray-50 rounded-xl flex justify-between"><span className="text-gray-400">العميل:</span><span className="font-bold">{activeOrder.customer}</span></div>
              <div className="p-3 bg-gray-50 rounded-xl flex justify-between"><span className="text-gray-400">الطباخ:</span><span className="font-bold">{activeOrder.chef}</span></div>
              <div className="p-3 bg-gray-50 rounded-xl flex justify-between"><span className="text-gray-400">الحالة:</span><span className="font-bold">{activeOrder.status}</span></div>
              <div className="p-3 bg-gray-50 rounded-xl flex justify-between"><span className="text-gray-400">الإجمالي:</span><span className="font-bold text-[#7a0d0d]">{activeOrder.total}</span></div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}