import { useEffect, useId, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { Lock, Eye, EyeOff, LogIn, ArrowRight, ShieldCheck, User, Sparkles } from "lucide-react";
import logoIcon from "../assets/logo_icon_trim.png";
import { useAuth, type SignInResult } from "../auth/AuthContext";
import { messages } from "../auth/messages";

type FailReason = Extract<SignInResult, { ok: false }>["reason"];

const REASON_MESSAGE: Record<FailReason, string> = {
  bad_credentials: messages.credentialError,
  rate_limited: messages.rateLimited,
  not_permitted: messages.notPermitted,
  server_error: messages.serverError,
  network_error: messages.networkError,
};

export default function Login() {
  const { signIn, notice, clearNotice } = useAuth();

  const idField = useId();
  const pwField = useId();
  const idErr = `${idField}-err`;
  const pwErr = `${pwField}-err`;

  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<{ identifier?: string; password?: string }>({});
  const [formError, setFormError] = useState<string | null>(
    notice === "not_permitted" ? messages.notPermitted : null,
  );

  const identifierRef = useRef<HTMLInputElement>(null);
  const passwordRef = useRef<HTMLInputElement>(null);
  const errorRef = useRef<HTMLDivElement>(null);
  const inFlightRef = useRef(false);

  useEffect(() => {
    identifierRef.current?.focus();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (inFlightRef.current) return;

    clearNotice();
    setFormError(null);

    const nextErrors: { identifier?: string; password?: string } = {};
    if (!identifier.trim()) nextErrors.identifier = messages.identifierRequired;
    if (!password) nextErrors.password = messages.passwordRequired;
    setFieldErrors(nextErrors);
    if (nextErrors.identifier || nextErrors.password) {
      (nextErrors.identifier ? identifierRef : passwordRef).current?.focus();
      return;
    }

    inFlightRef.current = true;
    setSubmitting(true);
    const result = await signIn(identifier.trim(), password);
    inFlightRef.current = false;
    setSubmitting(false);

    if (!result.ok) {
      setFormError(REASON_MESSAGE[result.reason]);
      errorRef.current?.focus();
    }
  };

  return (
    <div
      dir="rtl"
      className="relative flex min-h-screen items-center justify-center bg-gradient-to-br from-[#fcf8f2] via-[#f4ebd0]/30 to-[#e8dfc9]/50 p-4 text-gray-800 overflow-hidden"
    >
      {/* Decorative background ambient blobs */}
      <div className="absolute -top-32 -right-32 w-96 h-96 rounded-full bg-[#7a0d0d]/10 blur-3xl pointer-events-none" />
      <div className="absolute -bottom-32 -left-32 w-96 h-96 rounded-full bg-[#e0b64d]/20 blur-3xl pointer-events-none" />

      <div className="relative grid w-full max-w-4xl overflow-hidden rounded-[2.55rem] bg-white/80 backdrop-blur-xl shadow-[0_30px_100px_-20px_rgba(122,13,13,0.15)] border border-white/60 md:grid-cols-2">
        
        {/* Brand panel */}
        <div className="relative hidden flex-col justify-between overflow-hidden bg-gradient-to-br from-[#7a0d0d] via-[#660b0b] to-[#450505] p-10 text-white md:flex">
          <div className="absolute inset-0 opacity-10 bg-[radial-gradient(#fff_1px,transparent_1px)] [background-size:20px_20px]" />
          
          <Link to="/" className="relative flex items-center gap-3 group">
            <div className="grid h-12 w-12 place-items-center rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 shadow-inner group-hover:scale-105 transition-transform">
              <img src={logoIcon} alt="طباخه" className="h-7 w-auto object-contain" />
            </div>
            <span className="font-black text-lg tracking-wide text-white/90">طباخه | Tabakha</span>
          </Link>

          <div className="relative my-auto py-6">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 border border-white/15 text-xs font-semibold text-[#e0b64d] mb-4 backdrop-blur-md">
              <Sparkles size={14} />
              بوابة الإدارة المركزية
            </div>
            <h2 className="text-3xl font-black leading-tight tracking-tight">مرحباً بك مجدداً، يا قائد النظام</h2>
            <p className="mt-3 text-sm leading-relaxed text-white/75">
              سجّل دخولك الآن لإدارة الطلبات، متابعة الطباخات، وشبكة التوصيل بكل كفاءة وسهولة.
            </p>
            <div className="mt-6 flex items-center gap-2.5 text-xs font-bold text-white/80 bg-black/20 p-3 rounded-xl border border-white/10">
              <ShieldCheck size={18} className="text-[#e0b64d]" aria-hidden="true" />
              منطقة آمنة ومشفّرة مخصصة للمشرفين والأدمن فقط
            </div>
          </div>

          <Link
            to="/"
            className="relative inline-flex items-center gap-2 text-xs font-bold text-white/70 transition hover:text-white group w-fit"
          >
            <ArrowRight size={15} aria-hidden="true" className="group-hover:translate-x-1 transition-transform" />
            الرجوع إلى الصفحة الرئيسية للموقع
          </Link>
        </div>

        {/* Form panel */}
        <div className="p-8 sm:p-12 flex flex-col justify-center">
          <div className="mb-8 text-center md:text-right">
            <div className="mb-4 flex justify-center md:hidden">
              <div className="grid h-16 w-16 place-items-center rounded-2xl bg-[#7a0d0d] shadow-lg shadow-[#7a0d0d]/30">
                <img src={logoIcon} alt="طباخه" className="h-10 w-auto object-contain" />
              </div>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-[#7a0d0d] tracking-tight">تسجيل الدخول</h1>
            <p className="mt-1.5 text-sm text-gray-500">أدخل بيانات الاعتماد الخاصة بحسابك للمتابعة.</p>
          </div>

          <form onSubmit={handleSubmit} noValidate aria-busy={submitting} className="space-y-4">
            {formError && (
              <div
                ref={errorRef}
                role="alert"
                aria-live="assertive"
                tabIndex={-1}
                className="rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm font-bold text-red-700 outline-none animate-shake"
              >
                {formError}
              </div>
            )}

            {/* Identifier */}
            <div>
              <label htmlFor={idField} className="mb-1.5 block text-xs font-bold text-gray-700">
                البريد الإلكتروني أو رقم الهاتف
              </label>
              <div className={`flex items-center gap-2.5 rounded-xl border bg-gray-50/50 px-3.5 transition-all duration-200 ${fieldErrors.identifier ? 'border-red-500 bg-red-50/20' : 'border-gray-200 hover:border-gray-300 focus-within:border-[#7a0d0d] focus-within:bg-white focus-within:ring-4 focus-within:ring-[#7a0d0d]/10'}`}>
                <User size={18} className="text-gray-400 shrink-0" aria-hidden="true" />
                <input
                  id={idField}
                  ref={identifierRef}
                  type="text"
                  dir="ltr"
                  autoComplete="username"
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  aria-invalid={fieldErrors.identifier ? true : undefined}
                  aria-describedby={fieldErrors.identifier ? idErr : undefined}
                  placeholder="admin@tabakha.app"
                  className="w-full bg-transparent py-3 text-sm text-gray-800 outline-none placeholder:text-gray-400 text-right"
                />
              </div>
              {fieldErrors.identifier && (
                <p id={idErr} className="mt-1.5 text-xs font-bold text-red-600">
                  {fieldErrors.identifier}
                </p>
              )}
            </div>

            {/* Password */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label htmlFor={pwField} className="block text-xs font-bold text-gray-700">
                  كلمة المرور
                </label>
              </div>
              <div className={`flex items-center gap-2.5 rounded-xl border bg-gray-50/50 px-3.5 transition-all duration-200 ${fieldErrors.password ? 'border-red-500 bg-red-50/20' : 'border-gray-200 hover:border-gray-300 focus-within:border-[#7a0d0d] focus-within:bg-white focus-within:ring-4 focus-within:ring-[#7a0d0d]/10'}`}>
                <Lock size={18} className="text-gray-400 shrink-0" aria-hidden="true" />
                <input
                  id={pwField}
                  ref={passwordRef}
                  type={showPass ? "text" : "password"}
                  dir="ltr"
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  aria-invalid={fieldErrors.password ? true : undefined}
                  aria-describedby={fieldErrors.password ? pwErr : undefined}
                  placeholder="••••••••"
                  className="w-full bg-transparent py-3 text-sm text-gray-800 outline-none placeholder:text-gray-400 text-right"
                />
                <button
                  type="button"
                  onClick={() => setShowPass((v) => !v)}
                  aria-label={showPass ? "إخفاء كلمة المرور" : "إظهار كلمة المرور"}
                  aria-pressed={showPass}
                  className="text-gray-400 transition hover:text-[#7a0d0d] p-1"
                >
                  {showPass ? <EyeOff size={18} aria-hidden="true" /> : <Eye size={18} aria-hidden="true" />}
                </button>
              </div>
              {fieldErrors.password && (
                <p id={pwErr} className="mt-1.5 text-xs font-bold text-red-600">
                  {fieldErrors.password}
                </p>
              )}
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#7a0d0d] to-[#5a0909] py-3.5 text-sm font-black text-white shadow-lg shadow-[#7a0d0d]/25 transition-all hover:from-[#660b0b] hover:to-[#450505] hover:shadow-xl hover:shadow-[#7a0d0d]/35 active:scale-[0.99] disabled:opacity-60 cursor-pointer"
            >
              <LogIn size={18} aria-hidden="true" />
              {submitting ? "جاري التحقق والدخول..." : "تسجيل الدخول"}
            </button>
          </form>

          <p className="mt-8 text-center text-xs text-gray-500 md:hidden">
            <Link to="/" className="font-bold text-[#7a0d0d] hover:underline">
              الرجوع إلى الصفحة الرئيسية
            </Link>
          </p>
        </div>

      </div>
    </div>
  );
}
