import { useState } from "react";
import { X, Camera, Eye, EyeOff, User, Store, Phone, Mail, MapPin, Map, Lock } from "lucide-react";

export default function AddCookModal({ onClose }: { onClose: () => void }) {
  const [activeStatus, setActiveStatus] = useState("تفعيل");
  const [image, setImage] = useState<string | null>(null);
  const [range, setRange] = useState(10);
  const [showPass, setShowPass] = useState(false);

  const fields = [
    { icon: User, label: "الاسم بالكامل" },
    { icon: Store, label: "اسم المتجر" },
    { icon: Phone, label: "رقم الهاتف" },
    { icon: Mail, label: "البريد الإلكتروني" },
    { icon: MapPin, label: "المنطقة" },
    { icon: Map, label: "العنوان بالتفاصيل" },
  ];

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto" dir="rtl">
      {/* عرض المودال يتغير حسب الجهاز */}
      <div className="bg-[#fcf9f2] w-full max-w-2xl rounded-[2rem] p-6 md:p-8 relative border border-[#e8dfc9] shadow-2xl">
        
        <button onClick={onClose} className="absolute left-6 top-6 p-2 hover:bg-gray-200 rounded-full transition"><X size={20} className="text-gray-500"/></button>
        
        <h2 className="text-2xl font-black text-[#7a0d0d] mb-8 text-center">إضافة طباخة جديدة</h2>

        {/* الصورة */}
        <div className="flex justify-center mb-8">
          <label className="relative w-28 h-28 bg-white rounded-full flex items-center justify-center border-4 border-[#e8dfc9] cursor-pointer group shadow-lg overflow-hidden">
            {image ? <img src={image} className="w-full h-full object-cover" /> : <User size={40} className="text-gray-300"/>}
            <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 flex items-center justify-center transition">
              <Camera className="text-white" />
            </div>
            <input type="file" className="hidden" accept="image/*" onChange={(e) => e.target.files && setImage(URL.createObjectURL(e.target.files[0]))} />
          </label>
        </div>

        {/* الحقول: عمود واحد للموبايل (grid-cols-1)، وعمودان للابتوب (md:grid-cols-2) */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {fields.map((f, i) => (
            <div key={i} className="relative">
              <label className="text-[10px] font-black text-gray-400 uppercase mb-1 block pr-2">{f.label}</label>
              <div className="relative flex items-center">
                <div className="absolute right-4 text-[#7a0d0d]/50">
                  <f.icon size={18} />
                </div>
                <input className="w-full py-4 pl-4 pr-12 rounded-2xl border border-[#e8dfc9] bg-white outline-none focus:ring-2 focus:ring-[#7a0d0d]/20 transition shadow-sm" placeholder={f.label} />
              </div>
            </div>
          ))}

          {/* حقل كلمة المرور - يأخذ العرض كاملاً في كل الأحوال */}
          <div className="md:col-span-2 relative">
            <label className="text-[10px] font-black text-gray-400 uppercase mb-1 block pr-2">كلمة المرور</label>
            <div className="relative flex items-center">
              <div className="absolute right-4 text-[#7a0d0d]/50">
                <Lock size={18} />
              </div>
              <input type={showPass ? "text" : "password"} className="w-full py-4 pl-12 pr-12 rounded-2xl border border-[#e8dfc9] bg-white outline-none focus:ring-2 focus:ring-[#7a0d0d]/20 transition shadow-sm" placeholder="********" />
              <button type="button" onClick={() => setShowPass(!showPass)} className="absolute left-4 text-gray-400 hover:text-[#7a0d0d] transition">
                {showPass ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>
        </div>

        {/* حالة الحساب ونطاق التوصيل */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
          <div className="bg-white p-4 rounded-2xl border border-[#e8dfc9]">
            <label className="text-[10px] font-black text-gray-400 uppercase mb-3 block">حالة الحساب</label>
            <div className="flex gap-2">
              {["تفعيل", "إجازة", "موقوف"].map((s) => (
                <button key={s} onClick={() => setActiveStatus(s)}
                  className={`flex-1 py-2 rounded-lg text-[10px] font-bold transition-all ${activeStatus === s ? 'bg-[#7a0d0d] text-white shadow-md' : 'bg-gray-100 text-gray-500'}`}>
                  {s}
                </button>
              ))}
            </div>
          </div>
          
          <div className="bg-white p-4 rounded-2xl border border-[#e8dfc9]">
             <div className="flex justify-between mb-3">
                <label className="text-[10px] font-black text-gray-400 uppercase">نطاق التوصيل</label>
                <span className="text-[10px] font-black text-[#7a0d0d]">{range} كم</span>
             </div>
             <input type="range" min="1" max="50" value={range} onChange={(e) => setRange(Number(e.target.value))} className="w-full accent-[#7a0d0d] cursor-pointer" />
          </div>
        </div>

        {/* الأزرار */}
        <div className="flex gap-4 mt-8">
          <button onClick={onClose} className="flex-1 py-4 rounded-2xl border border-[#e8dfc9] font-bold text-gray-600 hover:bg-gray-50 transition">إلغاء</button>
          <button className="flex-1 py-4 bg-[#7a0d0d] text-white rounded-2xl font-black shadow-lg shadow-[#7a0d0d]/30 hover:bg-[#9a1212] transition">حفظ البيانات</button>
        </div>
      </div>
    </div>
  );
}