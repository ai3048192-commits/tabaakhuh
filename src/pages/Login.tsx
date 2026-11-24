import { useEffect, useId, useRef, useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowRight,
  ChefHat,
  ClipboardList,
  Eye,
  EyeOff,
  Loader2,
  Lock,
  LogIn,
  ShieldCheck,
  Truck,
  User,
  Wallet,
} from "lucide-react";
import logoIcon from "../assets/logo_icon_trim.png";
import heroFood from "../assets/egyptian-home-food.webp";
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

/** What the admin manages from here — shown on the photo panel (desktop only). */
const HIGHLIGHTS = [
  { icon: ClipboardList, title: "الطلبات", text: "متابعة كل طلب لحظة بلحظة" },
  { icon: ChefHat, title: "الطباخات", text: "مراجعة وتفعيل الحسابات" },
  { icon: Truck, title: "التوصيل", text: "المناديب والمدن والأسعار" },
  { icon: Wallet, title: "السحوبات", text: "تحويل الأرباح أول بأول" },
];

const fieldShell = (invalid: boolean) =>
  `group flex items-center gap-3 rounded-2xl border bg-[#fdfaf5] px-4 transition-all duration-200 ${
    invalid
      ? "border-red-400 bg-red-50/40 ring-4 ring-red-500/10"
      : "border-[#eadfcd] hover:border-[#d8c6a6] focus-within:border-[#7a0d0d] focus-within:bg-white focus-within:ring-4 focus-within:ring-[#7a0d0d]/10"
  }`;

const fieldIcon = (invalid: boolean) =>
  `shrink-0 transition-colors ${invalid ? "text-red-400" : "text-[#b9a48a] group-focus-within:text-[#7a0d0d]"}`;

const inputClass =
  "w-full bg-transparent py-4 text-right text-[15px] font-medium text-[#2b1a12] outline-none placeholder:text-[#c4b199]";

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

  // The admin sign-in is reached only by a hidden gesture — keep it out of search results too.
  useEffect(() => {
    const meta = document.createElement("meta");
    meta.name = "robots";
    meta.content = "noindex, nofollow";
    document.head.appendChild(meta);
    return () => meta.remove();
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
      className="grid min-h-screen bg-[#fbf6ee] text-[#2b1a12] lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)]"
    >
      {/* Form side */}
      <div className="relative flex flex-col overflow-hidden px-5 py-6 sm:px-10 sm:py-8">
        <div
          className="pointer-events-none absolute inset-0 opacity-40 [background-image:radial-gradient(#e7d8bd_1px,transparent_1px)] [background-size:22px_22px]"
          aria-hidden="true"
        />
        <div
          className="pointer-events-none absolute -left-32 -top-32 h-80 w-80 rounded-full bg-[#e0a52e]/15 blur-3xl"
          aria-hidden="true"
        />
        <div
          className="pointer-events-none absolute -bottom-40 -right-24 h-96 w-96 rounded-full bg-[#7a0d0d]/10 blur-3xl"
          aria-hidden="true"
        />

        <div className="relative flex items-center justify-between gap-4">
          <Link to="/" className="flex w-fit items-center gap-2.5">
            <img src={logoIcon} alt="" className="h-10 w-auto object-contain" />
            <span className="text-xl font-black text-[#7a0d0d]">طباخه</span>
          </Link>
          <Link
            to="/"
            className="group inline-flex items-center gap-1.5 rounded-full border border-[#eadfcd] bg-white/80 px-4 py-2 text-xs font-extrabold text-[#5c4636] transition hover:border-[#7a0d0d]/30 hover:text-[#7a0d0d]"
          >
            <ArrowRight
              size={15}
              aria-hidden="true"
              className="transition-transform group-hover:translate-x-0.5"
            />
            الرجوع للصفحة الرئيسية
          </Link>
        </div>

        <div className="relative mx-auto my-auto w-full max-w-[27rem] py-10">
          <div className="rounded-[2rem] border border-[#eadfcd] bg-white/95 p-7 shadow-[0_30px_70px_-35px_rgba(43,26,18,0.35)] sm:p-9">
            <div className="flex items-center gap-3">
              <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-[#8f1414] to-[#5a0909] text-white shadow-[0_12px_24px_-10px_rgba(122,13,13,0.7)]">
                <ShieldCheck size={22} aria-hidden="true" />
              </span>
              <span className="rounded-full bg-[#e0a52e]/15 px-3 py-1 text-xs font-extrabold text-[#8a5c06]">
                لوحة تحكم الإدارة
              </span>
            </div>
            <h1 className="mt-6 text-3xl font-black tracking-tight sm:text-[2.1rem]">تسجيل الدخول</h1>
            <p className="mt-2 text-sm leading-relaxed text-[#75604f]">
              ادخل ببيانات حساب الإدارة عشان تتابع الطلبات والطباخات والتوصيل.
            </p>

            <form onSubmit={handleSubmit} noValidate aria-busy={submitting} className="mt-8 space-y-5">
              {formError && (
                <div
                  ref={errorRef}
                  role="alert"
                  aria-live="assertive"
                  tabIndex={-1}
                  className="animate-shake flex items-start gap-2.5 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold leading-relaxed text-red-700 outline-none"
                >
                  <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-red-500" aria-hidden="true" />
                  {formError}
                </div>
              )}

              {/* Identifier */}
              <div>
                <label htmlFor={idField} className="mb-2 block text-sm font-extrabold text-[#5c4636]">
                  البريد الإلكتروني أو رقم الهاتف
                </label>
                <div className={fieldShell(!!fieldErrors.identifier)}>
                  <User size={18} className={fieldIcon(!!fieldErrors.identifier)} aria-hidden="true" />
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
                    placeholder="name@example.com"
                    className={inputClass}
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
                <label htmlFor={pwField} className="mb-2 block text-sm font-extrabold text-[#5c4636]">
                  كلمة المرور
                </label>
                <div className={fieldShell(!!fieldErrors.password)}>
                  <Lock size={18} className={fieldIcon(!!fieldErrors.password)} aria-hidden="true" />
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
                    className={inputClass}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPass((v) => !v)}
                    aria-label={showPass ? "إخفاء كلمة المرور" : "إظهار كلمة المرور"}
                    aria-pressed={showPass}
                    className="-ml-1 grid h-9 w-9 shrink-0 place-items-center rounded-xl text-[#b9a48a] transition hover:bg-[#7a0d0d]/[0.06] hover:text-[#7a0d0d]"
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
                className="group relative !mt-7 flex w-full cursor-pointer items-center justify-center gap-2 overflow-hidden rounded-2xl bg-gradient-to-l from-[#8f1414] to-[#6a0b0b] py-4 text-[15px] font-black text-white shadow-[0_16px_32px_-14px_rgba(122,13,13,0.75)] transition-all hover:-translate-y-0.5 hover:shadow-[0_20px_36px_-14px_rgba(122,13,13,0.85)] active:translate-y-0 active:scale-[0.99] disabled:translate-y-0 disabled:cursor-wait disabled:opacity-70"
              >
                {submitting ? (
                  <Loader2 size={18} className="animate-spin" aria-hidden="true" />
                ) : (
                  <LogIn size={18} aria-hidden="true" />
                )}
                {submitting ? "جاري التحقق والدخول..." : "تسجيل الدخول"}
              </button>
            </form>

            <div className="mt-7 flex items-start gap-2.5 rounded-2xl bg-[#fbf6ee] px-4 py-3 text-xs leading-relaxed text-[#75604f]">
              <ShieldCheck size={16} className="mt-px shrink-0 text-[#b0790f]" aria-hidden="true" />
              الدخول متاح لحسابات الإدارة بس. لو نسيت بياناتك، كلّم مسؤول النظام.
            </div>
          </div>
        </div>

        <p className="relative text-center text-xs font-bold text-[#a08b75]">© طباخه | Tabakha</p>
      </div>

      {/* Photo side (desktop) */}
      <div className="relative hidden overflow-hidden lg:block">
        <img src={heroFood} alt="" className="absolute inset-0 h-full w-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-br from-[#7a0d0d]/90 via-[#3a120c]/80 to-[#1d1210]/95" />
        <div
          className="pointer-events-none absolute -left-24 -top-24 h-96 w-96 rounded-full border-[3rem] border-[#e0a52e]/15"
          aria-hidden="true"
        />
        <div
          className="pointer-events-none absolute -bottom-32 right-10 h-80 w-80 rounded-full border-[2.5rem] border-white/[0.05]"
          aria-hidden="true"
        />

        <div className="relative flex h-full flex-col justify-between p-12 text-white xl:p-16">
          <span className="inline-flex w-fit items-center gap-2 rounded-full border border-white/15 bg-white/10 px-4 py-2 text-xs font-extrabold text-[#f3c766] backdrop-blur-sm">
            <span className="h-2 w-2 rounded-full bg-[#1fa855]" aria-hidden="true" />
            طباخه | Tabakha
          </span>

          <div>
            <p className="max-w-lg text-4xl font-black leading-[1.3] xl:text-[2.9rem]">
              أكل بيتي،
              <span className="block text-[#f3c766]">من إيدين أمينة.</span>
            </p>
            <p className="mt-4 max-w-md text-[15px] leading-[1.9] text-white/75">
              من هنا بتدير الطلبات، مراجعة الطباخات والمناديب، المدن وأسعار التوصيل، والسحوبات.
            </p>
            <ul className="mt-10 grid max-w-xl grid-cols-2 gap-3">
              {HIGHLIGHTS.map(({ icon: Icon, title, text }) => (
                <li
                  key={title}
                  className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.07] p-4 backdrop-blur-sm"
                >
                  <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-[#e0a52e]/20 text-[#f3c766]">
                    <Icon size={20} aria-hidden="true" />
                  </span>
                  <span className="min-w-0">
                    <span className="block text-sm font-black">{title}</span>
                    <span className="mt-0.5 block text-xs leading-relaxed text-white/65">{text}</span>
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
