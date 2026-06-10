import { useState } from "react";
import { Info, Wallet, Bell, MapPin, Plus, X, Upload } from "lucide-react";

export default function Settings() {
  const [cities, setCities] = useState(["القاهرة", "الإسكندرية"]);
  const [city, setCity] = useState("");
  const [logo, setLogo] = useState<string | null>(null);
  const [icon, setIcon] = useState<string | null>(null);

  const addCity = () => {
    if (!city.trim()) return;
    setCities([...cities, city]);
    setCity("");
  };

  const upload = (e: any, setImg: any) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setImg(reader.result as string);
    reader.readAsDataURL(file);
  };

  // ⭐ CARD STYLE مختلف (Premium look)
  const Card = ({ children }: any) => (
    <div className="relative bg-white p-6 rounded-3xl border border-orange-100 shadow-sm hover:shadow-xl transition overflow-hidden">

      {/* decorative line */}
      <div className="absolute top-0 right-0 w-full h-1 bg-gradient-to-l from-[#7a0d0d] to-orange-300"></div>

      {children}
    </div>
  );

  const Title = ({ icon: Icon, text }: any) => (
    <div className="flex items-center gap-3 mb-6">
      <div className="p-2 rounded-xl bg-orange-50 text-[#7a0d0d]">
        <Icon className="w-5 h-5" />
      </div>
      <h2 className="font-black text-[#7a0d0d] text-lg">{text}</h2>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#f7f1e6] p-6 font-['Tajawal']" dir="rtl">

      <div className="max-w-6xl mx-auto space-y-6">
        <div className="grid lg:grid-cols-2 gap-6">

          {/* ===== بيانات ===== */}
          <Card>
            <Title icon={Info} text="بيانات المتجر" />

            <div className="space-y-4">

              <input className="w-full p-3 rounded-xl border focus:ring-2 focus:ring-orange-200"
                defaultValue="طباخة" />

              <input className="w-full p-3 rounded-xl border text-left"
                dir="ltr"
                defaultValue="support@site.com" />

              <input className="w-full p-3 rounded-xl border text-left font-bold"
                defaultValue="01000000000" />

            </div>

            {/* uploads */}
            <div className="grid grid-cols-2 gap-4 mt-6">

              {[{ v: logo, s: setLogo }, { v: icon, s: setIcon }].map((x, i) => (
                <label key={i}
                  className="h-36 border rounded-2xl flex flex-col items-center justify-center cursor-pointer hover:bg-orange-50 transition">

                  <input hidden type="file" onChange={(e) => upload(e, x.s)} />

                  {x.v ? (
                    <img src={x.v} className="h-20 w-20 object-cover rounded-xl" />
                  ) : (
                    <>
                      <Upload className="text-orange-400 w-6 h-6 mb-2" />
                      <span className="text-xs text-gray-500">
                        رفع صورة
                      </span>
                    </>
                  )}

                </label>
              ))}

            </div>
          </Card>

          {/* ===== المالية ===== */}
          <Card>
            <Title icon={Wallet} text="الإعدادات المالية" />

            <div className="space-y-4">

              <div className="grid grid-cols-3 gap-3">
                <input className="p-3 border rounded-xl text-center font-bold" defaultValue={10} />
                <input className="p-3 border rounded-xl text-center font-bold" defaultValue={100} />
                <input className="p-3 border rounded-xl text-center font-bold" defaultValue={5} />
              </div>

              <div className="space-y-3">

                <label className="flex justify-between p-3 rounded-xl border hover:bg-orange-50">
                  خصم أول طلب
                  <input type="checkbox" defaultChecked />
                </label>

                <label className="flex justify-between p-3 rounded-xl border hover:bg-orange-50">
                  كاش باك / نقاط
                  <input type="checkbox" />
                </label>

              </div>

            </div>
          </Card>

          {/* ===== إشعارات ===== */}
          <Card>
            <Title icon={Bell} text="الإشعارات + التوصيل" />

            <div className="space-y-3">

              {[
                "Push Notifications",
                "طلبات جديدة",
                "SMS للطباخين",
                "تغيير حالة الطلب"
              ].map((t) => (
                <label key={t}
                  className="flex justify-between p-3 rounded-xl border hover:bg-orange-50 transition">

                  {t}
                  <input type="checkbox" defaultChecked />
                </label>
              ))}

              <div className="p-4 rounded-2xl border bg-orange-50/40">
                <p className="font-bold mb-2">📍 نطاق التوصيل</p>
                <input
                  type="number"
                  defaultValue={10}
                  className="w-full p-3 border rounded-xl text-center font-bold"
                />
              </div>

            </div>
          </Card>

          {/* ===== المدن ===== */}
          <Card>
            <Title icon={MapPin} text="المدن والمناطق" />

            <div className="flex gap-2 mb-4">

              <input
                value={city}
                onChange={(e) => setCity(e.target.value)}
                className="flex-1 p-3 border rounded-xl"
                placeholder="مدينة"
              />

              <button
                onClick={addCity}
                className="bg-[#7a0d0d] text-white px-4 rounded-xl flex items-center gap-1"
              >
                <Plus size={16} /> إضافة
              </button>

            </div>

            <div className="flex flex-wrap gap-2">

              {cities.map((c) => (
                <span key={c}
                  className="bg-white border px-3 py-1 rounded-full flex items-center gap-2 shadow-sm hover:scale-105 transition">

                  {c}
                  <X size={14}
                    className="cursor-pointer"
                    onClick={() => setCities(cities.filter(x => x !== c))}
                  />
                </span>
              ))}

            </div>
          </Card>

        </div>

        
      </div>
    </div>
  );
}