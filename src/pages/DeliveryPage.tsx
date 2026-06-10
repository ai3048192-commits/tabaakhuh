import { useState, useEffect } from "react";
import { Search, Bike, Eye, X, User, DollarSign, Clock, PlusCircle, RefreshCw, Phone, AlertTriangle } from "lucide-react";

const Delivery = () => {
  const [filter, setFilter] = useState("الكل");
  const [searchTerm, setSearchTerm] = useState("");
  const [detailModal, setDetailModal] = useState<any>(null);
  const [complaintModal, setComplaintModal] = useState<any>(null);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [lastRefresh, setLastRefresh] = useState(new Date());

  const deliveries = [
    { 
      id: 1, 
      name: "أحمد محمد", 
      phone: "٠١٠١٢٣٤٥٦٧٨", 
      orderId: "#1234", 
      address: "المعادي، شارع ٩", 
      price: "١٥٠ ج", 
      commission: "١٥ ج", 
      status: "في الطريق", 
      time: "منذ ١٢ دقيقة",
      lat: 29.96,
      lng: 31.27 
    },
    { 
      id: 2, 
      name: "علي حسن", 
      phone: "٠١١١٢٣٤٥٦٧٩", 
      orderId: "#1235", 
      address: "مدينة نصر، حي السفارات", 
      price: "٢٠٠ ج", 
      commission: "٢٠ ج", 
      status: "تم التوصيل", 
      time: "منذ ساعة",
      lat: 30.05,
      lng: 31.35 
    },
    { 
      id: 3, 
      name: "مصطفى محمود", 
      phone: "٠١٢٣٤٥٦٧٨٩٠", 
      orderId: "#1236", 
      address: "التجمع الخامس، شارع ٣٠", 
      price: "١٨٠ ج", 
      commission: "١٨ ج", 
      status: "بانتظار الاستلام", 
      time: "منذ ٢٥ دقيقة",
      lat: 30.02,
      lng: 31.48 
    },
  ];

  const complaints = [
    { 
      id: 1, 
      driver: "أحمد محمد", 
      orderId: "#1234", 
      customer: "محمد علي", 
      reason: "العميل رفض الطلب بعد التوصيل", 
      time: "منذ ٤٥ دقيقة", 
      status: "جديد" 
    },
    { 
      id: 2, 
      driver: "علي حسن", 
      orderId: "#1237", 
      customer: "سارة أحمد", 
      reason: "عنوان خاطئ ومشاجرة مع العميل", 
      time: "منذ ساعتين", 
      status: "تحت المراجعة" 
    },
  ];

  const stats = [
    { title: "دليفري متاح", value: "١٢", icon: User, color: "text-green-600", bg: "bg-green-50" },
    { title: "في الطريق", value: "٨", icon: Bike, color: "text-blue-600", bg: "bg-blue-50" },
    { title: "عمولات اليوم", value: "٦٧٥ ج", icon: DollarSign, color: "text-[#b68614]", bg: "bg-yellow-50" },
    { title: "طلبات معلقة", value: "٣", icon: Clock, color: "text-red-800", bg: "bg-red-50" },
  ];

  const filteredDeliveries = deliveries.filter(d => 
    (filter === "الكل" || d.status === filter) &&
    (d.name.includes(searchTerm) || d.orderId.includes(searchTerm) || d.address.includes(searchTerm))
  );

  // Auto Refresh
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (autoRefresh) {
      interval = setInterval(() => {
        setLastRefresh(new Date());
      }, 15000);
    }
    return () => clearInterval(interval);
  }, [autoRefresh]);

  return (
    <div className="p-4 md:p-6">
  

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {stats.map((stat, i) => (
          <div key={i} className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex items-center justify-between">
            <div>
              <p className="text-[10px] text-gray-400 font-bold mb-1">{stat.title}</p>
              <h3 className={`text-2xl md:text-3xl font-black ${stat.color}`}>{stat.value}</h3>
            </div>
            <div className={`p-3 rounded-xl ${stat.bg} ${stat.color}`}>
              <stat.icon size={26} />
            </div>
          </div>
        ))}
      </div>

      {/* Search & Filter */}
      <div className="flex flex-col md:flex-row gap-4 mb-6">
        <div className="flex-1 bg-[#fcf9f2] p-4 rounded-2xl border border-[#e8dfc9] flex items-center gap-3">
          <Search size={20} className="text-gray-400" />
          <input 
            type="text" 
            placeholder="ابحث عن دليفري أو رقم طلب..." 
            className="w-full bg-transparent outline-none text-sm font-bold"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <div className="flex flex-wrap gap-2">
          {["الكل", "في الطريق", "بانتظار الاستلام", "تم التوصيل"].map((f) => (
            <button 
              key={f} 
              onClick={() => setFilter(f)} 
              className={`px-5 py-2.5 rounded-2xl text-xs md:text-sm font-black transition whitespace-nowrap
                ${filter === f ? "bg-[#7a0d0d] text-white" : "bg-[#fcf9f2] border border-[#e8dfc9] text-gray-600 hover:bg-white"}`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {/* Main Table */}
      <div className="bg-[#fcf9f2] p-4 md:p-6 rounded-[1rem] border border-[#e8dfc9] overflow-x-auto mb-10">
        <table className="w-full text-right min-w-[850px]">
          <thead className="text-gray-400 text-[10px] uppercase font-black border-b border-[#e8dfc9]">
            <tr>
              <th className="pb-4">الدليفري</th>
              <th className="pb-4">رقم التليفون</th>
              <th className="pb-4">رقم الطلب</th>
              <th className="pb-4">العنوان</th>
              <th className="pb-4">السعر</th>
              <th className="pb-4">الحالة</th>
              <th className="pb-4">الوقت</th>
              <th className="pb-4">تفاصيل</th>
            </tr>
          </thead>
          <tbody>
            {filteredDeliveries.map((d) => (
              <tr key={d.id} className="border-b border-[#e8dfc9] last:border-0 text-sm hover:bg-white/50">
                <td className="py-5 font-bold text-[#7a0d0d]">{d.name}</td>
                <td className="py-5 font-medium">{d.phone}</td>
                <td className="py-5 font-bold text-gray-600">{d.orderId}</td>
                <td className="py-5 text-gray-500">{d.address}</td>
                <td className="py-5 font-bold">{d.price}</td>
                <td className="py-5">
                  <span className={`px-3 py-1 rounded-full text-[10px] font-bold ${d.status === "تم التوصيل" ? "bg-green-100 text-green-700" : "bg-yellow-100 text-[#b68614]"}`}>
                    {d.status}
                  </span>
                </td>
                <td className="py-5 text-gray-500 text-xs">{d.time}</td>
                <td className="py-5">
                  <button onClick={() => setDetailModal(d)} className="text-gray-400 hover:text-[#7a0d0d]">
                    <Eye size={20} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* قسم الشكاوى */}
   {/* قسم الشكاوى (مُحسّن) */}
<div className="bg-[#fcf9f2] p-6 rounded-[1rem] border border-[#e8dfc9] mt-10">
  <div className="flex justify-between items-center mb-6">
    <div className="flex items-center gap-3">
      <AlertTriangle className="text-red-600" size={26} />
      <h2 className="font-black text-xl text-gray-800">
        الشكاوى من الدليفري ضد العملاء
      </h2>
    </div>

    <span className="bg-red-100 text-red-700 px-4 py-1 rounded-full text-sm font-bold">
      {complaints.length} شكوى
    </span>
  </div>

  <div className="grid md:grid-cols-2 gap-5">
    {complaints.map((c) => (
      <div
        key={c.id}
        className="bg-white p-5 rounded-2xl border border-red-100 shadow-sm hover:shadow-md transition"
      >
        {/* Header */}
        <div className="flex justify-between items-start mb-3">
          <div>
            <div className="font-bold text-[#7a0d0d]">
              {c.driver}
              <span className="text-gray-400 text-xs"> ({c.orderId})</span>
            </div>
            <div className="text-xs text-gray-500 mt-1">
              العميل: {c.customer}
            </div>
          </div>

          <span className="text-[10px] font-bold px-3 py-1 rounded-full bg-red-50 text-red-600">
            {c.status}
          </span>
        </div>

        {/* Reason */}
        <p className="text-sm text-gray-700 bg-gray-50 p-3 rounded-xl border border-gray-100">
          {c.reason}
        </p>

        {/* Footer */}
        <div className="flex justify-between items-center mt-4 pt-3 border-t border-gray-100">
          <span className="text-xs text-gray-500">{c.time}</span>

          <button
            onClick={() => setComplaintModal(c)}
            className="bg-red-600 hover:bg-red-700 text-white text-xs font-bold px-4 py-2 rounded-xl transition"
          >
            الرد على الشكوى
          </button>
        </div>
      </div>
    ))}
  </div>
</div>

      {/* Delivery Detail Modal */}
      {detailModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden">
            <div className="bg-gradient-to-r from-[#7a0d0d] to-[#9a1212] px-6 py-5 text-white flex justify-between items-center">
              <h3 className="font-black text-xl">تفاصيل التوصيل</h3>
              <button onClick={() => setDetailModal(null)} className="hover:bg-white/20 p-2 rounded-xl">
                <X size={26} />
              </button>
            </div>

            <div className="p-6 space-y-5">
              <div className="flex justify-between border-b pb-3">
                <span className="text-gray-500">اسم الدليفري</span>
                <span className="font-bold">{detailModal.name}</span>
              </div>
              <div className="flex justify-between border-b pb-3">
                <span className="text-gray-500">رقم التليفون</span>
                <span className="font-bold">{detailModal.phone}</span>
              </div>
              <div className="flex justify-between border-b pb-3">
                <span className="text-gray-500">رقم الطلب</span>
                <span className="font-bold">{detailModal.orderId}</span>
              </div>
              <div className="flex justify-between border-b pb-3">
                <span className="text-gray-500">العنوان</span>
                <span className="font-medium text-right">{detailModal.address}</span>
              </div>
              <div className="flex justify-between border-b pb-3">
                <span className="text-gray-500">السعر</span>
                <span className="font-black text-xl text-[#7a0d0d]">{detailModal.price}</span>
              </div>

              {/* خريطة صغيرة */}
              <div>
                <p className="text-gray-500 mb-2 text-xs font-bold">موقع الدليفري الحالي</p>
                <div className="bg-gray-200 h-48 rounded-2xl flex items-center justify-center border border-gray-300 relative">
                  <div className="text-center">
                    <Bike size={48} className="mx-auto text-[#7a0d0d] mb-2" />
                    <p className="text-sm font-bold text-[#7a0d0d]">موقع الدليفري</p>
                    <p className="text-[10px] text-gray-500 mt-1">{detailModal.address}</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="p-5 bg-gray-50 border-t flex justify-end">
              <button onClick={() => setDetailModal(null)} className="px-8 py-3 bg-[#7a0d0d] text-white rounded-2xl font-black hover:bg-[#9a1212]">
                إغلاق
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Complaint Modal */}
      {complaintModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden">
            <div className="bg-red-600 px-6 py-5 text-white flex justify-between items-center">
              <h3 className="font-black text-xl">رد على الشكوى</h3>
              <button onClick={() => setComplaintModal(null)} className="hover:bg-white/20 p-2 rounded-xl">
                <X size={26} />
              </button>
            </div>

            <div className="p-6 space-y-5">
              <div className="bg-red-50 p-4 rounded-2xl">
                <p className="font-bold">الشكوى من: {complaintModal.driver}</p>
                <p className="text-sm text-red-700 mt-2">{complaintModal.reason}</p>
              </div>

              <textarea 
                className="w-full h-32 p-4 border border-gray-200 rounded-2xl resize-y focus:outline-none focus:border-red-300"
                placeholder="اكتب ردك هنا..."
              />

              <div className="flex gap-3">
                <button className="flex-1 py-3 bg-gray-100 rounded-2xl font-bold">تجاهل</button>
                <button className="flex-1 py-3 bg-red-600 text-white rounded-2xl font-black">إرسال الرد</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Delivery;