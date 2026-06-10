import { Bar } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from "chart.js";
import {
  ChefHat, TrendingUp, ShoppingCart, Coins, PlusCircle,
  Send, UserPlus, Bike, MapPin, CheckCircle, TableProperties, Eye, Users, X
} from "lucide-react";
import { useState } from "react";

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

const chartData = {
  labels: ["سبت", "أحد", "اثنين", "ثلاثاء", "أربعاء", "خميس", "جمعة"],
  datasets: [{
    label: "الطلبات",
    data: [65, 59, 80, 95, 56, 85, 40],
    backgroundColor: "#7a0d0d",
    hoverBackgroundColor: "#9a1212",
    borderRadius: 8,
    barThickness: 25,
    maxBarThickness: 35,
  }],
};

const chartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: { display: false },
    tooltip: { backgroundColor: "#7a0d0d", titleColor: "#fff", padding: 10, cornerRadius: 6 },
  },
  scales: {
    y: { display: false },
    x: { grid: { display: false }, ticks: { color: "#7a0d0d", font: { size: 11, weight: "bold" as const } } },
  },
};

interface DashboardProps {
  setModalType: (type: string | null) => void;
}

const Dashboard = ({ setModalType }: DashboardProps) => {
  const [detailModal, setDetailModal] = useState<any>(null);

  const statsData = [
    { title: "إجمالي المستخدمين", value: "١,٢٣٤", icon: Users, color: "text-gray-800", bgColor: "bg-gray-50" },
    { title: "إجمالي الطباخات", value: "٤٨", icon: ChefHat, color: "text-gray-800", bgColor: "bg-red-50" },
    { title: "دليفري متاح الآن", value: "١٢", icon: Bike, color: "text-blue-600", bgColor: "bg-blue-50" },
    { title: "دليفري مشغول", value: "٨", icon: MapPin, color: "text-orange-600", bgColor: "bg-orange-50" },
    { title: "إجمالي الطلبات", value: "٥٦٧", icon: ShoppingCart, color: "text-green-600", bgColor: "bg-green-50" },
    { title: "إجمالي الإيرادات", value: "٤٥,١٧٨ ج", icon: Coins, color: "text-red-800", bgColor: "bg-red-50" },
  ];

  const openDetail = (type: string, data: any) => {
    setDetailModal({ type, data });
  };

  return (
    <div className="p-6">
      {/* الإحصائيات */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
        {statsData.map((stat, i) => (
          <div key={i} className="bg-white p-6 rounded-xl shadow-sm flex items-center justify-between border border-gray-100">
            <div>
              <p className="text-[10px] text-gray-400 font-bold mb-1">{stat.title}</p>
              <h3 className={`text-2xl font-black ${stat.color}`}>{stat.value}</h3>
            </div>
            <div className={`${stat.bgColor} p-3 rounded-xl ${stat.color}`}>
              <stat.icon size={24} />
            </div>
          </div>
        ))}
      </div>

      {/* الرسم + إجراءات */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        <div className="lg:col-span-2 bg-[#fcf9f2] p-6 rounded-[2rem] border border-[#e8dfc9]">
          <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">إحصائيات الطلبات اليومية (٧ أيام)</span>
          <div className="h-48 mt-4"><Bar data={chartData} options={chartOptions} /></div>
        </div>

        <div className="bg-[#fcf9f2] p-4 rounded-[2rem] border border-[#e8dfc9] flex flex-col gap-4">
          <p className="text-center text-[10px] font-black text-gray-400 uppercase">إجراءات سريعة</p>
          <button onClick={() => setModalType("إضافة طباخة")} className="w-full py-4 bg-[#7a0d0d] text-white rounded-xl font-black text-sm flex items-center justify-center gap-3">
            <PlusCircle size={20} /> إضافة طباخة جديدة
          </button>
          <button onClick={() => setModalType("إشعار عام")} className="w-full py-4 bg-[#7a0d0d] text-white rounded-xl font-black text-sm flex items-center justify-center gap-3">
            <Send size={20} /> إرسال إشعار عام
          </button>
          <button onClick={() => setModalType("مستخدم جديد")} className="w-full py-4 bg-[#7a0d0d] text-white rounded-xl font-black text-sm flex items-center justify-center gap-3">
            <UserPlus size={20} /> مستخدم جديد
          </button>
        </div>
      </div>

      {/* جدول الدليفري */}
      <div className="bg-[#fcf9f2] p-6 rounded-[1rem] border border-[#e8dfc9] mb-8">
        <div className="flex justify-between mb-6">
          <h3 className="font-black text-gray-800">حالة عمليات التوصيل الحالية</h3>
          <button className="flex items-center gap-2 text-[#b68614] text-xs font-bold hover:underline">
            <TableProperties size={16} /> عرض الكل
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-right">
            <thead className="text-gray-400 border-b border-[#e8dfc9]">
              <tr>
                <th className="pb-3">اسم الدليفري</th>
                <th className="pb-3">عنوان الأوردر</th>
                <th className="pb-3">السعر</th>
                <th className="pb-3">العمولة</th>
                <th className="pb-3">الحالة</th>
                <th className="pb-3">تفاصيل</th>
              </tr>
            </thead>
            <tbody>
              {[1,2,3].map((_, i) => (
                <tr key={i} className="border-b border-[#e8dfc9] last:border-0 hover:bg-white/50">
                  <td className="py-4 font-bold text-[#7a0d0d]">أحمد محمد</td>
                  <td className="py-4 text-gray-600">المعادي، شارع ٩</td>
                  <td className="py-4 text-gray-600">١٥٠ ج</td>
                  <td className="py-4 text-green-600 font-bold">١٥ ج</td>
                  <td className="py-4"><span className="bg-green-100 text-green-700 px-3 py-1 rounded-full text-[10px]">في الطريق</span></td>
                  <td className="py-4">
                    <button onClick={() => openDetail("delivery", { id: 1234 + i, name: "أحمد محمد", address: "المعادي، شارع ٩", price: "١٥٠ ج", commission: "١٥ ج" })}>
                      <Eye size={20} className="text-[#7a0d0d] hover:text-red-700" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* الأقسام القديمة */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-[#fcf9f2] p-6 rounded-[1rem] border border-[#e8dfc9]">
          <div className="flex justify-between mb-6">
            <h3 className="font-black text-gray-800">طلبات بانتظار التحضير</h3>
            <span className="text-[#b68614] text-xs cursor-pointer">عرض الكل</span>
          </div>
          <div className="space-y-4">
            {[1,2,3].map((_, i) => (
              <div key={i} className="flex justify-between border-b pb-3 text-sm items-center">
                <span className="text-[#7a0d0d] font-bold">#1234{i}</span>
                <span className="text-gray-500">450 ج</span>
                <span className="bg-yellow-100 text-[#b68614] px-2 rounded-full text-[10px]">قيد المراجعة</span>
                <button onClick={() => openDetail("order", { id: 1234 + i, status: "قيد المراجعة" })}>
                  <Eye size={18} className="text-[#7a0d0d]" />
                </button>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-[#fcf9f2] p-6 rounded-[1rem] border border-[#e8dfc9]">
          <div className="flex justify-between mb-6">
            <h3 className="font-black text-gray-800">أحدث الطباخات المنضمات</h3>
            <span className="text-[#b68614] text-xs cursor-pointer">عرض الكل</span>
          </div>
          <div className="space-y-4">
            {[1,2,3].map((_, i) => (
              <div key={i} className="flex justify-between border-b pb-3 text-sm items-center">
                <span>زينب المصراوي</span>
                <span className="text-gray-400">المعادي</span>
                <span className="text-gray-400">2024/10/01</span>
                <button onClick={() => openDetail("cook", { name: "زينب المصراوي", area: "المعادي", joinDate: "2024/10/01" })}>
                  <Eye size={18} className="text-[#7a0d0d]" />
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>

    {/* ضع ده في نهاية return داخل <div className="p-6"> */}
{detailModal && (
  <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
    <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden">
      
      {/* Header */}
      <div className="bg-gradient-to-r from-[#7a0d0d] to-[#9a1212] px-6 py-5 text-white flex items-center justify-between">
        <h3 className="font-black text-xl">
          {detailModal.type === "delivery" && "تفاصيل التوصيل"}
          {detailModal.type === "order" && "تفاصيل الطلب"}
          {detailModal.type === "cook" && "بيانات الطباخة"}
        </h3>
        <button 
          onClick={() => setDetailModal(null)}
          className="hover:bg-white/20 p-2 rounded-xl transition"
        >
          <X size={26} />
        </button>
      </div>

      {/* Body */}
      <div className="p-8 space-y-6">
        {detailModal.type === "delivery" && (
          <div className="space-y-5">
            <div className="flex justify-between py-3 border-b">
              <span className="text-gray-500">اسم الدليفري</span>
              <span className="font-bold text-[#7a0d0d]">{detailModal.data.name}</span>
            </div>
            <div className="flex justify-between py-3 border-b">
              <span className="text-gray-500">رقم الأوردر</span>
              <span className="font-bold">#{detailModal.data.id}</span>
            </div>
            <div className="flex justify-between py-3 border-b">
              <span className="text-gray-500">العنوان</span>
              <span className="font-medium text-right">{detailModal.data.address}</span>
            </div>
            <div className="flex justify-between py-3 border-b">
              <span className="text-gray-500">السعر</span>
              <span className="font-black text-xl text-[#7a0d0d]">{detailModal.data.price}</span>
            </div>
            <div className="flex justify-between py-3">
              <span className="text-gray-500">العمولة</span>
              <span className="font-bold text-green-600">{detailModal.data.commission}</span>
            </div>
          </div>
        )}

        {detailModal.type === "order" && (
          <div className="space-y-5">
            <div className="flex justify-between py-3 border-b">
              <span className="text-gray-500">رقم الطلب</span>
              <span className="font-bold">#{detailModal.data.id}</span>
            </div>
            <div className="flex justify-between py-3">
              <span className="text-gray-500">الحالة</span>
              <span className="bg-yellow-100 text-[#b68614] px-4 py-1 rounded-full font-bold">{detailModal.data.status}</span>
            </div>
          </div>
        )}

        {detailModal.type === "cook" && (
          <div className="space-y-5">
            <div className="flex justify-between py-3 border-b">
              <span className="text-gray-500">الاسم</span>
              <span className="font-bold">{detailModal.data.name}</span>
            </div>
            <div className="flex justify-between py-3 border-b">
              <span className="text-gray-500">المنطقة</span>
              <span className="font-medium">{detailModal.data.area}</span>
            </div>
            <div className="flex justify-between py-3">
              <span className="text-gray-500">تاريخ الانضمام</span>
              <span className="font-medium">{detailModal.data.joinDate}</span>
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="px-8 py-6 bg-gray-50 border-t flex justify-end">
        <button 
          onClick={() => setDetailModal(null)}
          className="px-8 py-3 bg-[#7a0d0d] text-white rounded-2xl font-black hover:bg-[#9a1212] transition"
        >
          إغلاق
        </button>
      </div>
    </div>
  </div>
)}
    </div>
  );
};

export default Dashboard;