import { useState, useRef } from "react";
import { X, Bell, Upload, Send, Trash2, ImageIcon } from "lucide-react";

export default function NotificationModal({
  onClose,
}: {
  onClose: () => void;
}) {
  const [audience, setAudience] = useState("الكل");
  const [schedule, setSchedule] = useState("إرسال الآن");
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setImagePreview(URL.createObjectURL(e.target.files[0]));
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto"
      dir="rtl"
    >
      {/* المودال: العرض يتكيف تلقائياً */}
      <div className="bg-[#fcf9f2] w-full max-w-xl rounded-[2.5rem] p-6 md:p-8 border border-[#e8dfc9] shadow-2xl relative">
        <button
          onClick={onClose}
          className="absolute left-6 top-6 p-2 hover:bg-gray-200 rounded-full transition"
        >
          <X size={20} className="text-gray-500" />
        </button>

        <h2 className="text-2xl font-black text-[#7a0d0d] mb-6 text-center">
          إرسال إشعار عام
        </h2>

        {/* حقول العنوان والرسالة */}
        <div className="space-y-4 mb-6">
          <div>
            <label className="text-[10px] font-black text-gray-400 uppercase mb-2 block pr-2">
              عنوان الإشعار
            </label>
            <input
              className="w-full p-4 rounded-2xl border border-[#e8dfc9] bg-white outline-none focus:ring-2 focus:ring-[#7a0d0d]/20 transition"
              placeholder="اكتب العنوان هنا..."
            />
          </div>
          <div>
            <label className="text-[10px] font-black text-gray-400 uppercase mb-2 block pr-2">
              محتوى الرسالة
            </label>
            <textarea
              className="w-full p-4 rounded-2xl border border-[#e8dfc9] bg-white outline-none focus:ring-2 focus:ring-[#7a0d0d]/20 transition h-24 md:h-32"
              placeholder="اكتب تفاصيل الإشعار..."
            />
          </div>
        </div>

        {/* الجمهور المستهدف */}
        <label className="text-[10px] font-black text-gray-400 uppercase mb-3 block pr-2">
          الجمهور المستهدف
        </label>
        <div className="grid grid-cols-3 gap-2 mb-6">
          {["الكل", "الطباخات", "العملاء"].map((item) => (
            <button
              key={item}
              onClick={() => setAudience(item)}
              className={`py-3 rounded-xl text-xs font-black transition-all border-2 ${audience === item ? "border-[#7a0d0d] bg-white text-[#7a0d0d]" : "border-transparent bg-[#e8dfc9]/30 text-gray-500"}`}
            >
              {item}
            </button>
          ))}
        </div>

        {/* منطقة تحميل الصورة */}
        <div className="border border-[#e8dfc9] rounded-2xl p-3 flex items-center justify-between mb-6 bg-white shadow-sm">
          <div className="flex items-center gap-3">
            <input
              type="file"
              ref={fileInputRef}
              className="hidden"
              accept="image/*"
              onChange={handleImageChange}
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              className="bg-[#fcf9f2] p-3 rounded-xl border border-[#e8dfc9] text-[#7a0d0d] hover:bg-gray-100 transition"
            >
              <Upload size={20} />
            </button>
            <div className="hidden sm:block">
              <p className="text-sm font-black">صورة العرض</p>
              <p className="text-[10px] text-gray-400">PNG, JPG UP TO 5MB</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-12 h-12 rounded-lg border border-[#e8dfc9] overflow-hidden flex items-center justify-center bg-gray-50">
              {imagePreview ? (
                <img
                  src={imagePreview}
                  className="w-full h-full object-cover"
                  alt="preview"
                />
              ) : (
                <ImageIcon className="text-gray-300" size={20} />
              )}
            </div>
            <button
              onClick={() => setImagePreview(null)}
              className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition"
            >
              <Trash2 size={18} />
            </button>
          </div>
        </div>

        {/* تنبيه المستخدمين */}
        <div className="bg-[#fff3bf]/50 p-4 rounded-2xl flex items-center gap-3 mb-6 border border-[#f5e08b]">
          <Bell className="text-[#b68614] shrink-0" size={20} />
          <p className="text-xs font-bold text-[#7a0d0d]">
            سوف يستلم هذا الإشعار{" "}
            <span className="font-black underline">١٢٣٤</span> مستخدم نشط حالياً
          </p>
        </div>

        {/* خيارات الإرسال (Grid لترتيب أفضل على اللابتوب والموبايل) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
          <div
            onClick={() => setSchedule("إرسال الآن")}
            className={`p-4 rounded-2xl border-2 cursor-pointer transition-all ${schedule === "إرسال الآن" ? "border-[#7a0d0d] bg-white" : "border-[#e8dfc9] bg-transparent"}`}
          >
            <p className="text-sm font-black text-[#7a0d0d]">إرسال الآن</p>
            <p className="text-[10px] text-gray-400">
              إرسال فوري لجميع المشتركين
            </p>
          </div>
          <div
            onClick={() => setSchedule("جدولة")}
            className={`p-4 rounded-2xl border-2 cursor-pointer transition-all ${schedule === "جدولة" ? "border-[#7a0d0d] bg-white" : "border-[#e8dfc9] bg-transparent"}`}
          >
            <p className="text-sm font-black text-[#7a0d0d]">جدولة الإرسال</p>
            <p className="text-[10px] text-gray-400">تحديد وقت وتاريخ لاحق</p>
          </div>
        </div>

        <button className="w-full py-4 bg-[#7a0d0d] text-white rounded-2xl font-black shadow-lg shadow-[#7a0d0d]/30 flex items-center justify-center gap-2 hover:bg-[#9a1212] transition">
          <Send size={18} /> اعتماد وإرسال الإشعار
        </button>
      </div>
    </div>
  );
}
