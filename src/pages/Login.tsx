import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Mail, Lock, Eye, EyeOff, LogIn, ArrowRight, ShieldCheck } from "lucide-react";
import logoIcon from "../assets/logo_icon_trim.png";

export default function Login() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [remember, setRemember] = useState(true);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!email.trim() || !password.trim()) {
      setError("من فضلك اكتب الإيميل والباسورد.");
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setError("الإيميل مش مظبوط.");
      return;
    }

    setLoading(true);
    // مفيش باك اند دلوقتي — بندخل على الداشبورد على طول
    setTimeout(() => navigate("/dashboard"), 500);
  };

  return (
    <div
      dir="rtl"
      className="flex min-h-screen items-center justify-center bg-[#f7f1e6] p-4 text-gray-800"
    >
      <div className="grid w-full max-w-4xl overflow-hidden rounded-[2rem] bg-white shadow-[0_40px_90px_-30px_rgba(122,13,13,0.4)] md:grid-cols-2">
        {/* اللوحة الجانبية */}
        <div className="relative hidden flex-col justify-between overflow-hidden bg-gradient-to-br from-[#7a0d0d] to-[#5a0909] p-10 text-white md:flex">
          <div className="pointer-events-none absolute inset-0 opacity-[0.08] [background-image:radial-gradient(circle,#fff_1.5px,transparent_1.5px)] [background-size:24px_24px]" />
          <Link to="/" className="relative flex items-center gap-2">
            <img src={logoIcon} alt="طباخه" className="h-10 w-auto object-contain" />
          </Link>

          <div className="relative">
            <h2 className="text-3xl font-black leading-tight">
              لوحة تحكم طباخه
            </h2>
            <p className="mt-3 leading-relaxed text-white/75">
              سجّل دخولك عشان تدير الطلبات والطباخات والدليفري من مكان واحد.
            </p>
            <div className="mt-6 flex items-center gap-2 text-sm font-bold text-white/70">
              <ShieldCheck size={18} className="text-[#e0b64d]" />
              دخول آمن — للأدمن فقط
            </div>
          </div>

          <Link
            to="/"
            className="relative flex items-center gap-1 text-sm font-bold text-white/70 transition hover:text-white"
          >
            <ArrowRight size={16} />
            رجوع للموقع
          </Link>
        </div>

        {/* الفورم */}
        <div className="p-8 sm:p-10">
          <div className="mb-8 text-center md:text-right">
            <div className="mb-4 flex justify-center md:hidden">
              <div className="grid h-14 w-14 place-items-center rounded-2xl bg-[#7a0d0d]">
                <img src={logoIcon} alt="طباخه" className="h-9 w-auto object-contain" />
              </div>
            </div>
            <h1 className="text-2xl font-black text-[#7a0d0d]">تسجيل الدخول</h1>
            <p className="mt-1 text-sm text-gray-500">
              اكتب بيانات حسابك للدخول على لوحة التحكم.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* الإيميل */}
            <div>
              <label className="mb-1.5 block text-sm font-bold text-gray-700">
                الإيميل
              </label>
              <div className="flex items-center gap-2 rounded-xl border border-[#e8dfc9] bg-[#fcf9f2] px-3 focus-within:border-[#7a0d0d]">
                <Mail size={18} className="text-gray-400" />
                <input
                  type="email"
                  dir="ltr"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@tabakha.app"
                  className="w-full bg-transparent py-3 text-sm text-gray-800 outline-none placeholder:text-gray-400"
                />
              </div>
            </div>

            {/* الباسورد */}
            <div>
              <label className="mb-1.5 block text-sm font-bold text-gray-700">
                الباسورد
              </label>
              <div className="flex items-center gap-2 rounded-xl border border-[#e8dfc9] bg-[#fcf9f2] px-3 focus-within:border-[#7a0d0d]">
                <Lock size={18} className="text-gray-400" />
                <input
                  type={showPass ? "text" : "password"}
                  dir="ltr"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-transparent py-3 text-sm text-gray-800 outline-none placeholder:text-gray-400"
                />
                <button
                  type="button"
                  onClick={() => setShowPass((v) => !v)}
                  className="text-gray-400 transition hover:text-[#7a0d0d]"
                >
                  {showPass ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            {error && (
              <p className="rounded-lg bg-red-50 px-3 py-2 text-sm font-bold text-red-600">
                {error}
              </p>
            )}

            <div className="flex items-center justify-between text-sm">
              <label className="flex cursor-pointer items-center gap-2 font-bold text-gray-600">
                <input
                  type="checkbox"
                  checked={remember}
                  onChange={(e) => setRemember(e.target.checked)}
                  className="h-4 w-4 accent-[#7a0d0d]"
                />
                تذكرني
              </label>
              <a href="#" className="font-bold text-[#b68614] hover:underline">
                نسيت الباسورد؟
              </a>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#7a0d0d] py-3.5 text-sm font-black text-white shadow-lg transition hover:bg-[#5a0909] disabled:opacity-60"
            >
              <LogIn size={18} />
              {loading ? "جاري الدخول..." : "دخول"}
            </button>
          </form>

          <p className="mt-6 text-center text-xs text-gray-400 md:hidden">
            <Link to="/" className="font-bold text-[#7a0d0d] hover:underline">
              رجوع للموقع
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
