import { useEffect, useId, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { Lock, Eye, EyeOff, LogIn, ArrowRight, ShieldCheck, User } from "lucide-react";
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
  // Synchronous single-flight lock so rapid repeated clicks / held Enter send
  // exactly one request (FR-009, SC-007), independent of React re-render timing.
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
    // On success, <LoginRoute> redirects to /dashboard.
  };

  return (
    <div
      dir="rtl"
      className="flex min-h-screen items-center justify-center bg-[#f7f1e6] p-4 text-gray-800"
    >
      <div className="grid w-full max-w-4xl overflow-hidden rounded-[2rem] bg-white shadow-[0_40px_90px_-30px_rgba(122,13,13,0.4)] md:grid-cols-2">
        {/* Brand panel */}
        <div className="relative hidden flex-col justify-between overflow-hidden bg-gradient-to-br from-[#7a0d0d] to-[#5a0909] p-10 text-white md:flex">
          <div className="pointer-events-none absolute inset-0 opacity-[0.08] [background-image:radial-gradient(circle,#fff_1.5px,transparent_1.5px)] [background-size:24px_24px]" />
          <Link to="/" className="relative flex items-center gap-2">
            <img src={logoIcon} alt="طباخه" className="h-10 w-auto object-contain" />
          </Link>

          <div className="relative">
            <h2 className="text-3xl font-black leading-tight">لوحة تحكم طباخه</h2>
            <p className="mt-3 leading-relaxed text-white/75">
              سجّل دخولك عشان تدير الطلبات والطباخات والدليفري من مكان واحد.
            </p>
            <div className="mt-6 flex items-center gap-2 text-sm font-bold text-white/70">
              <ShieldCheck size={18} className="text-[#e0b64d]" aria-hidden="true" />
              دخول آمن — للأدمن فقط
            </div>
          </div>

          <Link
            to="/"
            className="relative flex items-center gap-1 text-sm font-bold text-white/70 transition hover:text-white"
          >
            <ArrowRight size={16} aria-hidden="true" />
            رجوع للموقع
          </Link>
        </div>

        {/* Form panel */}
        <div className="p-8 sm:p-10">
          <div className="mb-8 text-center md:text-right">
            <div className="mb-4 flex justify-center md:hidden">
              <div className="grid h-14 w-14 place-items-center rounded-2xl bg-[#7a0d0d]">
                <img src={logoIcon} alt="طباخه" className="h-9 w-auto object-contain" />
              </div>
            </div>
            <h1 className="text-2xl font-black text-[#7a0d0d]">تسجيل الدخول</h1>
            <p className="mt-1 text-sm text-gray-500">اكتب بيانات حسابك للدخول على لوحة التحكم.</p>
          </div>

          <form onSubmit={handleSubmit} noValidate aria-busy={submitting} className="space-y-5">
            {formError && (
              <div
                ref={errorRef}
                role="alert"
                aria-live="assertive"
                tabIndex={-1}
                className="rounded-lg bg-red-50 px-3 py-2 text-sm font-bold text-red-700 outline-none"
              >
                {formError}
              </div>
            )}

            {/* Identifier */}
            <div>
              <label htmlFor={idField} className="mb-1.5 block text-sm font-bold text-gray-700">
                البريد الإلكتروني أو رقم الهاتف
              </label>
              <div className="flex items-center gap-2 rounded-xl border border-[#e8dfc9] bg-[#fcf9f2] px-3 focus-within:border-[#7a0d0d]">
                <User size={18} className="text-gray-400" aria-hidden="true" />
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
                  className="w-full bg-transparent py-3 text-sm text-gray-800 outline-none placeholder:text-gray-400"
                />
              </div>
              {fieldErrors.identifier && (
                <p id={idErr} className="mt-1.5 text-xs font-bold text-red-700">
                  {fieldErrors.identifier}
                </p>
              )}
            </div>

            {/* Password */}
            <div>
              <label htmlFor={pwField} className="mb-1.5 block text-sm font-bold text-gray-700">
                كلمة المرور
              </label>
              <div className="flex items-center gap-2 rounded-xl border border-[#e8dfc9] bg-[#fcf9f2] px-3 focus-within:border-[#7a0d0d]">
                <Lock size={18} className="text-gray-400" aria-hidden="true" />
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
                  className="w-full bg-transparent py-3 text-sm text-gray-800 outline-none placeholder:text-gray-400"
                />
                <button
                  type="button"
                  onClick={() => setShowPass((v) => !v)}
                  aria-label={showPass ? "إخفاء كلمة المرور" : "إظهار كلمة المرور"}
                  aria-pressed={showPass}
                  className="text-gray-400 transition hover:text-[#7a0d0d]"
                >
                  {showPass ? <EyeOff size={18} aria-hidden="true" /> : <Eye size={18} aria-hidden="true" />}
                </button>
              </div>
              {fieldErrors.password && (
                <p id={pwErr} className="mt-1.5 text-xs font-bold text-red-700">
                  {fieldErrors.password}
                </p>
              )}
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#7a0d0d] py-3.5 text-sm font-black text-white shadow-lg transition hover:bg-[#5a0909] disabled:opacity-60"
            >
              <LogIn size={18} aria-hidden="true" />
              {submitting ? "جاري الدخول..." : "دخول"}
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
