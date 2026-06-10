import { useState } from "react";
import { 
  Mail, AlertTriangle, Lightbulb, Clock, Search, 
  SlidersHorizontal, Trash2, Download, 
  ChevronRight, ChevronLeft, Eye, Send, Paperclip, X, ShieldAlert
} from "lucide-react";

export default function ComplaintsDashboard() {
  // 1. البيانات الكاملة والدقيقة للمنصة
const [messages, setMessages] = useState<Message[]>([  
  
  id: number;
  user: string;
  avatar: string;
  type: string;
  tagLabel: string;
  target: string;
  time: string;
  text: string;
  attachments: string;
  status: string;
  statusColor: string;
  borderColor: string;
  isAnswered: boolean;
}
    { 
      id: 2, 
      user: "محمد إبراهيم", 
      avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150",
      type: "suggestions", 
      tagLabel: "اقتراح ميزة",
      target: "اقتراح عام",
      time: "منذ ٥ ساعات",
      text: "أقترح إضافة خاصية 'الاشتراكات الشهرية' للوجبات المنزلية لتسهيل الطلب المتكرر وتوفير الوقت للمستخدمين.",
      attachments: null,
      status: "جديد",
      statusColor: "text-emerald-600 bg-emerald-50",
      borderColor: "border-r-orange-500",
      isAnswered: false
    }
  ]);

  // التبويب النشط والتحكم بالردود
  const [activeTab, setActiveTab] = useState("all");
  const [replyBoxId, setReplyBoxId] = useState(null);
  const [replyText, setReplyText] = useState("");

  // حالة الفورم المنبثق لإجراءات الطباخات
  const [selectedCook, setSelectedCook] = useState(null);
  const [cookAction, setCookAction] = useState("warning");
  const [cookNote, setCookNote] = useState("");

  // حساب الأعداد للداتا ديناميكياً
  const countAll = messages.length;
  const countComplaints = messages.filter(m => m.type === "complaints").length;
  const countSuggestions = messages.filter(m => m.type === "suggestions").length;
  const countAnswered = messages.filter(m => m.isAnswered).length;
  const countEscalated = messages.filter(m => m.status === "تم التحويل لميزة").length;

  // فلترة الداتا
  const filteredMessages = messages.filter(m => {
    if (activeTab === "all") return true;
    if (activeTab === "complaints") return m.type === "complaints";
    if (activeTab === "suggestions") return m.type === "suggestions";
    if (activeTab === "answered") return m.isAnswered;
    if (activeTab === "escalated") return m.status === "تم التحويل لميزة";
    return true;
  });

  // تغيير الحالة إلى "تم الحل" فوراً
  const handleResolve = (id) => {
    setMessages(prev => prev.map(m => {
      if (m.id === id) {
        return { 
          ...m, 
          status: "تم الحل", 
          statusColor: "text-emerald-600 bg-emerald-50 border border-emerald-100" 
        };
      }
      return m;
    }));
  };

  // تغيير الحالة إلى "تحويل لميزة" فوراً
  const handleEscalate = (id) => {
    setMessages(prev => prev.map(m => {
      if (m.id === id) {
        return { 
          ...m, 
          status: "تم التحويل لميزة", 
          statusColor: "text-purple-600 bg-purple-50 border border-purple-100" 
        };
      }
      return m;
    }));
  };

  // إرسال الرد
  const submitReply = (id) => {
    if (!replyText.trim()) return;
    setMessages(prev => prev.map(m => {
      if (m.id === id) return { ...m, isAnswered: true };
      return m;
    }));
    setReplyText("");
    setReplyBoxId(null);
  };

  // تنفيذ الإجراء على الطباخة من الفورم
  const handleCookActionSubmit = (e) => {
    e.preventDefault();
    if (!selectedCook) return;
    alert(`تم اتخاذ إجراء (${cookAction === 'warning' ? 'إرسال تحذير رسمي' : cookAction === 'suspend' ? 'إيقاف الحساب مؤقتاً' : 'حظر كامل'}) ضد الطباخة: ${selectedCook.name}\nملاحظة الإدارة: ${cookNote || 'لا يوجد'}`);
    setSelectedCook(null);
    setCookNote("");
  };

  const complaintTypes = [
    { name: "تأخير التوصيل", percentage: 45, color: "bg-[#7a0d0d]" },
    { name: "جودة الطعام", percentage: 30, color: "bg-orange-500" },
    { name: "خطأ في الطلب", percentage: 15, color: "bg-emerald-600" },
    { name: "أخرى", percentage: 10, color: "bg-red-300" },
  ];

  const flaggedCooks = [
    { name: "أم أحمد (القاهرة)", complaints: "٨ شكاوى نشطة", rank: "#١" },
    { name: "مطبخ ست الحبايب", complaints: "٥ شكاوى نشطة", rank: "#٢" },
    { name: "أكلات بورسعيدية", complaints: "٣ شكاوى نشطة", rank: "#٣" },
  ];

  return (
    <div className="p-4 lg:p-6 bg-[#f7f1e6] min-h-screen font-['Tajawal'] text-right select-none text-sm" dir="rtl">
      
      {/* 1. الإحصائيات العلوية */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {[
          { title: "إجمالي الرسائل", value: "٨٩", icon: Mail, color: "text-[#7a0d0d]", bg: "bg-red-50" },
          { title: "شكاوى لم تحل", value: "١٢", icon: AlertTriangle, color: "text-red-500", bg: "bg-red-50" },
          { title: "اقتراحات جديدة", value: "٢٣", icon: Lightbulb, color: "text-orange-500", bg: "bg-orange-50" },
          { title: "متوسط الرد", value: "٤ ساعات", icon: Clock, color: "text-emerald-600", bg: "bg-emerald-50" },
        ].map((stat, i) => (
          <div key={i} className="bg-[#fffcf7] p-4 rounded-xl border border-orange-100 flex items-center justify-between shadow-sm hover:shadow-md transition-all">
            <div>
              <p className="text-xs text-gray-400 font-bold mb-0.5">{stat.title}</p>
              <h3 className={`text-xl font-black ${stat.color}`}>{stat.value}</h3>
            </div>
            <div className={`p-2.5 rounded-lg ${stat.bg} ${stat.color}`}>
              <stat.icon size={20} />
            </div>
          </div>
        ))}
      </div>

      {/* 2. شريط البحث والأدوات */}
      <div className="flex flex-col md:flex-row gap-3 justify-between items-center mb-6">
        <div className="flex items-center gap-2 w-full md:w-auto flex-1 max-w-md">
          <div className="relative w-full">
            <Search className="absolute right-3 top-3 text-gray-400" size={16} />
            <input 
              type="text" 
              placeholder="ابحث في الرسائل، المستخدمين..." 
              className="w-full bg-[#fffcf7] pr-9 pl-3 py-2 rounded-xl border border-orange-100 text-xs font-bold focus:outline-none focus:border-[#7a0d0d]" 
            />
          </div>
          <button className="flex items-center gap-1.5 bg-[#fffcf7] px-4 py-2 rounded-xl border border-orange-100 text-xs font-bold text-gray-600 hover:bg-orange-50/50 whitespace-nowrap">
            <SlidersHorizontal size={14} />
            <span>تصفية</span>
          </button>
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto justify-end">
          <button className="text-xs font-bold text-red-600 bg-red-50 hover:bg-red-100/70 px-4 py-2 rounded-xl transition-colors">
            تحديد الكل
          </button>
          <button className="flex items-center gap-1.5 bg-[#7a0d0d] text-white px-4 py-2 rounded-xl text-xs font-bold hover:bg-[#630a0a] transition-colors">
            <Download size={14} /> تصدير
          </button>
          <button className="p-2 bg-[#fffcf7] border border-orange-100 text-gray-400 hover:text-red-600 rounded-xl transition-colors">
            <Trash2 size={14} />
          </button>
        </div>
      </div>

      {/* 3. التبويبات */}
      <div className="flex gap-1 border-b border-orange-100 mb-6 overflow-x-auto pb-px scrollbar-none">
        {[
          { id: "all", label: "كل الرسائل", count: countAll },
          { id: "complaints", label: "شكاوى", count: countComplaints },
          { id: "suggestions", label: "اقتراحات", count: countSuggestions },
          { id: "answered", label: "تم الرد عليها", count: countAnswered },
          { id: "escalated", label: "تحولت لميزات", count: countEscalated },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`pb-3 px-4 text-xs font-black transition-all relative whitespace-nowrap flex items-center gap-1 ${
              activeTab === tab.id 
                ? "text-[#7a0d0d] after:absolute after:bottom-[-1px] after:left-0 after:right-0 after:h-[2px] after:bg-[#7a0d0d]" 
                : "text-gray-400 hover:text-gray-600"
            }`}
          >
            <span>{tab.label}</span>
            <span className={`text-[10px] px-1 rounded font-bold ${activeTab === tab.id ? 'bg-red-50 text-[#7a0d0d]' : 'bg-stone-100 text-gray-400'}`}>
              ({tab.count})
            </span>
          </button>
        ))}
      </div>

      {/* 4. كروت العرض */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {filteredMessages.map((msg) => (
          <div key={msg.id} className={`bg-[#fffcf7] rounded-2xl border border-orange-100 shadow-sm p-5 flex flex-col justify-between border-r-4 ${msg.borderColor} hover:shadow-md transition-all`}>
            <div>
              <div className="flex justify-between items-start mb-3">
                <div className="flex gap-3">
                  <div className="w-10 h-10 rounded-full bg-orange-100 overflow-hidden shadow-sm">
                    <img src={msg.avatar} alt="avatar" className="w-full h-full object-cover" />
                  </div>
                  <div>
                    <h4 className="text-xs font-black text-gray-800">{msg.user}</h4>
                    <p className="text-[10px] text-gray-400 font-bold mt-0.5">{msg.time} • <span className="text-[#7a0d0d]">{msg.target}</span></p>
                  </div>
                </div>
                <span className={`font-bold text-[10px] px-2 py-0.5 rounded ${msg.type === 'complaints' ? 'bg-red-50 text-red-500' : 'bg-orange-50 text-orange-500'}`}>
                  {msg.tagLabel}
                </span>
              </div>
              
              <p className="text-xs font-bold text-gray-600 leading-relaxed mb-4">
                {msg.text}
              </p>

              {msg.attachments && (
                <div className="flex items-center gap-1 text-[10px] text-gray-400 font-bold mb-4 bg-stone-100 inline-flex px-2 py-1 rounded">
                  <Paperclip size={12} />
                  <span>{msg.attachments}</span>
                </div>
              )}
            </div>
            
            <div className="flex justify-between items-center pt-3 border-t border-orange-50 flex-wrap gap-2">
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${msg.statusColor}`}>
                الحالة: {msg.status}
              </span>
              
              <div className="flex gap-2">
                {msg.type === "complaints" ? (
                  <button 
                    onClick={() => handleResolve(msg.id)}
                    className="bg-white border border-orange-100 text-gray-600 px-3 py-1 rounded-xl text-[11px] font-bold hover:bg-emerald-50 hover:text-emerald-600 transition-colors"
                  >
                    تم الحل
                  </button>
                ) : (
                  <button 
                    onClick={() => handleEscalate(msg.id)}
                    className="bg-white border border-orange-100 text-gray-600 px-3 py-1 rounded-xl text-[11px] font-bold hover:bg-purple-50 hover:text-purple-600 transition-colors"
                  >
                    تحويل لميزة
                  </button>
                )}

                <button 
                  onClick={() => setReplyBoxId(replyBoxId === msg.id ? null : msg.id)}
                  className={`px-3 py-1 rounded-xl text-[11px] font-bold transition-colors text-white ${
                    msg.isAnswered ? "bg-emerald-600 hover:bg-emerald-700" : "bg-[#7a0d0d] hover:bg-[#630a0a]"
                  }`}
                >
                  {msg.isAnswered ? "تعديل الرد" : msg.type === "complaints" ? "عرض الرد" : "رد وتواصل"}
                </button>
              </div>
            </div>

            {replyBoxId === msg.id && (
              <div className="mt-3 pt-3 border-t border-dashed border-orange-200 bg-orange-50/20 p-3 rounded-xl transition-all">
                <label className="block text-[11px] font-black text-gray-700 mb-2">إرسال رد رسمي إلى {msg.user}:</label>
                <div className="flex gap-2">
                  <input 
                    type="text"
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    placeholder="اكتب ردك هنا..."
                    className="flex-1 bg-white border border-orange-100 rounded-lg px-3 py-1.5 text-xs font-bold focus:outline-none focus:border-[#7a0d0d]"
                  />
                  <button 
                    onClick={() => submitReply(msg.id)}
                    className="bg-[#7a0d0d] text-white px-3 rounded-lg hover:bg-[#630a0a] transition-colors flex items-center justify-center"
                  >
                    <Send size={12} className="transform rotate-180" />
                  </button>
                </div>
              </div>
            )}

          </div>
        ))}
      </div>

      {/* 5. الجداول والإحصائيات السفلية */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-[#fffcf7] rounded-xl border border-orange-100 p-4 shadow-sm">
          <h4 className="text-xs font-black text-[#7a0d0d] mb-4">توزيع أنواع الشكاوى</h4>
          <div className="space-y-4">
            {complaintTypes.map((type, i) => (
              <div key={i}>
                <div className="flex justify-between text-[11px] font-bold text-gray-600 mb-1">
                  <span>{type.name}</span>
                  <span>%{type.percentage}</span>
                </div>
                <div className="w-full bg-orange-50 h-1.5 rounded-full overflow-hidden">
                  <div className={`${type.color} h-full rounded-full`} style={{ width: `${type.percentage}%` }}></div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-[#fffcf7] rounded-xl border border-orange-100 p-4 shadow-sm">
          <h4 className="text-xs font-black text-[#7a0d0d] mb-4">طباخات تحت الملاحظة الحالية</h4>
          <table className="w-full text-right text-xs">
            <thead>
              <tr className="text-gray-400 border-b border-orange-50">
                <th className="pb-2">الترتيب</th>
                <th className="pb-2">اسم الطباخة</th>
                <th className="pb-2 text-left pl-2">الإجراءات</th>
              </tr>
            </thead>
            <tbody>
              {flaggedCooks.map((cook, i) => (
                <tr key={i} className="border-b border-orange-50/50 hover:bg-orange-50/20">
                  <td className="py-3 font-bold text-red-600">{cook.rank}</td>
                  <td className="py-3">
                    <div className="font-bold text-gray-800">{cook.name}</div>
                    <div className="text-[10px] text-gray-400 mt-0.5">{cook.complaints}</div>
                  </td>
                  <td className="py-3 text-left pl-2">
                    <button 
                      onClick={() => setSelectedCook(cook)}
                      className="p-1.5 text-gray-400 hover:text-[#7a0d0d] hover:bg-orange-50 rounded-lg transition-colors inline-flex items-center gap-1 bg-white border border-orange-100 text-[11px] font-bold"
                    >
                      <Eye size={12} /> الإجراء
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* 6. الفورم المنبثق المعدل والمحمي من الـ Crash */}
      {selectedCook && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-[#fffcf7] rounded-2xl border border-orange-100 max-w-sm w-full p-5 shadow-2xl relative">
            <button 
              onClick={() => setSelectedCook(null)} 
              className="absolute top-4 left-4 text-gray-400 hover:text-red-500 transition-colors"
            >
              <X size={18} />
            </button>
            
            <div className="flex items-center gap-2 text-[#7a0d0d] mb-4">
              <ShieldAlert size={20} />
              <h4 className="font-black text-sm">إجراء إداري: {selectedCook?.name}</h4>
            </div>

            <form onSubmit={handleCookActionSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-600 mb-1.5">نوع الإجراء الحاسم:</label>
                <select 
                  value={cookAction} 
                  onChange={(e) => setCookAction(e.target.value)}
                  className="w-full bg-white border border-orange-100 rounded-xl px-3 py-2 text-xs font-bold focus:outline-none focus:border-[#7a0d0d]"
                >
                  <option value="warning">إرسال تنبيه وتحذير رسمي للمطبخ</option>
                  <option value="suspend">إيقاف الحساب مؤقتاً (٢٤ ساعة)</option>
                  <option value="ban">حظر كامل وحجب من المنصة</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-600 mb-1.5">ملاحظات وسبب الإجراء:</label>
                <textarea 
                  rows={3}
                  value={cookNote}
                  onChange={(e) => setCookNote(e.target.value)}
                  placeholder="اكتب الأسباب والتقرير الإداري هنا للطباخة..."
                  className="w-full bg-white border border-orange-100 rounded-xl p-3 text-xs font-bold focus:outline-none focus:border-[#7a0d0d] resize-none"
                ></textarea>
              </div>

              <div className="flex gap-2 pt-2">
                <button 
                  type="submit" 
                  className="flex-1 bg-[#7a0d0d] text-white py-2 rounded-xl text-xs font-bold hover:bg-[#630a0a] transition-colors"
                >
                  تنفيذ القرار فوراً
                </button>
                <button 
                  type="button" 
                  onClick={() => setSelectedCook(null)}
                  className="px-4 bg-stone-100 text-gray-600 py-2 rounded-xl text-xs font-bold hover:bg-stone-200 transition-colors"
                >
                  إلغاء
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* الترقيم السفلي */}
      <div className="flex justify-center items-center gap-1.5 mt-8">
        <button className="p-1 bg-[#fffcf7] border border-orange-100 rounded-lg text-gray-400 hover:bg-orange-50/50"><ChevronRight size={12}/></button>
        <button className="w-6 h-6 flex items-center justify-center rounded-lg text-xs font-bold bg-[#7a0d0d] text-white shadow-sm">١</button>
        <button className="w-6 h-6 flex items-center justify-center rounded-lg text-xs font-bold text-gray-600 bg-[#fffcf7] border border-orange-100 hover:bg-orange-50/50">٢</button>
        <button className="p-1 bg-[#fffcf7] border border-orange-100 rounded-lg text-gray-400 hover:bg-orange-50/50"><ChevronLeft size={12}/></button>
      </div>

    </div>
  );
}
