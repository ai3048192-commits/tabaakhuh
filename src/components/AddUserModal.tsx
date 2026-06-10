import { useState, useRef } from "react";
import { X, Camera, CheckSquare, Square, Eye, EyeOff, User, Phone, MapPin, Map, Lock } from "lucide-react";

export default function AddUserModal({ onClose }: { onClose: () => void }) {
  const [activeStatus, setActiveStatus] = useState("نشط الآن");
  const [sendData, setSendData] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const InputField = ({ label, placeholder, icon: Icon, type = "text", className = "" }: any) => (
    <div className={`flex flex-col gap-1.5 ${className}`}>
      <label className="text-[11px] font-bold text-gray-500 pr-1">{label}</label>
      <div className="relative flex items-center">
        <div className="absolute right-4 text-[#7a0d0d]/60">
          <Icon size={18} />
        </div>
        <input 
          type={type}
          className="w-full py-3 pr-11 pl-4 rounded-2xl border border-[#e8dfc9] bg-white outline-none focus:border-[#7a0d0d] transition text-sm" 
          placeholder={placeholder} 
        />
      </div>
    </div>
  );

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-50 flex items-center justify-center p-4 overflow-y-auto" dir="rtl">
      {/* تم تحديد عرض أقصى ليكون متناسباً مع الشاشات */}
      <div className="bg-[#fcf9f2] w-full max-w-2xl rounded-[2.5rem] p-6 md:p-10 border border-[#e8dfc9] shadow-2xl relative my-auto">
        <button onClick={onClose} className="absolute left-6 top-6 p-2 hover:bg-black/5 rounded-full transition"><X size={20} className="text-gray-500"/></button>
        
        <h2 className="text-2xl font-black text-[#7a0d0d] mb-6 text-center">إضافة مستخدم جديد</h2>

        <div className="flex flex-col items-center mb-8">
          <div className="relative cursor-pointer group" onClick={() => fileInputRef.current?.click()}>
            <div className="w-28 h-28 rounded-3xl bg-white border border-[#e8dfc9] shadow-sm flex items-center justify-center overflow-hidden">
              {imagePreview ? <img src={imagePreview} className="w-full h-full object-cover" alt="Preview" /> : <User size={48} className="text-gray-300" />}
            </div>
            <div className="absolute -bottom-2 -right-2 w-9 h-9 rounded-xl bg-[#7a0d0d] flex items-center justify-center border-4 border-[#fcf9f2] text-white">
              <Camera size={16} />
            </div>
            <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={(e) => e.target.files && setImagePreview(URL.createObjectURL(e.target.files[0]))} />
          </div>
        </div>

        {/* الحقول: تعتمد grid-cols-1 للهاتف و grid-cols-2 للكمبيوتر */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <InputField label="الاسم بالكامل" placeholder="أحمد محمد..." icon={User} className="md:col-span-2" />
          <InputField label="رقم الجوال" placeholder="05xxxxxxxx" icon={Phone} />
          <InputField label="الحي / المنطقة" placeholder="حي الياسمين" icon={Map} />
          <InputField label="العنوان بالتفصيل" placeholder="اسم الشارع، رقم المبنى..." icon={MapPin} className="md:col-span-2" />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] font-bold text-gray-500 pr-1">حالة الحساب</label>
            <div className="flex bg-white p-1 rounded-2xl border border-[#e8dfc9] h-[50px]">
              {["نشط الآن", "إجازة", "موقوف"].map((status) => (
                <button key={status} onClick={() => setActiveStatus(status)} className={`flex-1 rounded-xl text-[10px] font-bold transition-all ${activeStatus === status ? 'bg-[#7a0d0d] text-white' : 'text-gray-400'}`}>
                  {status}
                </button>
              ))}
            </div>
          </div>
          
          <div className="relative">
            <label className="text-[11px] font-bold text-gray-500 mb-2 block pr-1">كلمة المرور</label>
            <div className="relative flex items-center">
                <div className="absolute right-4 text-[#7a0d0d]/60"><Lock size={18}/></div>
                <input type={showPassword ? "text" : "password"} className="w-full py-3 pr-11 pl-10 rounded-2xl border border-[#e8dfc9] bg-white outline-none text-sm" placeholder="******" />
                <button onClick={() => setShowPassword(!showPassword)} className="absolute left-4 text-gray-400">{showPassword ? <EyeOff size={18} /> : <Eye size={18} />}</button>
            </div>
          </div>
        </div>

        <div onClick={() => setSendData(!sendData)} className="flex items-center gap-3 mb-8 cursor-pointer select-none">
          <div className={sendData ? 'text-[#7a0d0d]' : 'text-gray-400'}>{sendData ? <CheckSquare size={24} /> : <Square size={24} />}</div>
          <span className={`text-sm font-bold ${sendData ? 'text-[#7a0d0d]' : 'text-gray-500'}`}>إرسال بيانات الدخول عبر الرسائل</span>
        </div>

        <button className="w-full py-4 bg-[#7a0d0d] text-white rounded-2xl font-black text-lg shadow-lg hover:bg-[#9a1212] transition">إنشاء الحساب</button>
      </div>
    </div>
  );
}