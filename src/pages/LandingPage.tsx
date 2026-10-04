import { useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import heroFood from "../assets/egyptian-home-food.webp";
import logoIcon from "../assets/logo_icon_trim.png";
import chickenImg from "../assets/chicken.jpeg";
import kosharyImg from "../assets/koshary.jpeg";
import kronbImg from "../assets/kronb.jpeg";
import {
  Menu,
  X,
  LogIn,
  Sparkles,
  Star,
  ArrowLeft,
  Leaf,
  HeartHandshake,
  Search,
  Bell,
  Play,
  Apple,
  Phone,
  Mail,
  MapPin,
  Home,
  User,
  ShoppingBag,
  Signal,
  Wifi,
  BatteryFull,
  CheckCircle2,
  Clock,
  MessageCircle,
  Send,
  ExternalLink,
} from "lucide-react";
import { useLandingContent } from "../landing/useLandingContent";
import { SOCIAL_PLATFORMS } from "../landing/icons";
import LandingIcon from "../landing/LandingIcon";
import { safeHref, toInternationalPhone } from "../landing/landingApi";
import type { DishItem, LandingContent, StatItem } from "../landing/content";

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

const BUNDLED_DISH_IMAGES = [kosharyImg, kronbImg, chickenImg];

/** A dish's own image, or one of the bundled photos when none was uploaded. */
const dishImage = (d: DishItem, i: number) =>
  safeHref(d.image) ?? BUNDLED_DISH_IMAGES[i % BUNDLED_DISH_IMAGES.length];

/** Opens off-site links in a new tab; page anchors and site paths stay in place. */
function linkProps(href: string | undefined) {
  const external = !!href && /^https?:/i.test(href);
  return external
    ? { href, target: "_blank", rel: "noopener noreferrer" }
    : { href: href ?? "#" };
}

/* ------------------------------------------------------------------ */
/*  Building blocks                                                    */
/* ------------------------------------------------------------------ */

/**
 * Organic wave divider. `color` is the section that comes AFTER it — the wave
 * is a solid shape of that colour rising into the section above, so the edge
 * stays crisp (no gradient haze).
 */
function Wave({ color, flip = false }: { color: string; flip?: boolean }) {
  return (
    <div
      className={`pointer-events-none ${flip ? "rotate-180" : ""}`}
      style={{ color, lineHeight: 0 }}
      aria-hidden
    >
      <svg
        viewBox="0 0 1440 120"
        preserveAspectRatio="none"
        className="block h-[60px] w-full sm:h-[100px] md:h-[140px]"
      >
        <path
          fill="currentColor"
          d="M0,60 C180,120 340,10 540,36 C740,62 900,130 1120,96 C1280,71 1370,44 1440,54 L1440,120 L0,120 Z"
        />
      </svg>
    </div>
  );
}

function SectionHeading({
  kicker,
  title,
  subtitle,
  dark = false,
}: {
  kicker: string;
  title: string;
  subtitle?: string;
  dark?: boolean;
}) {
  return (
    <div className="mx-auto mb-12 max-w-2xl text-center">
      {kicker && (
        <span
          className={`inline-flex items-center gap-2 rounded-full border px-4 py-1.5 text-xs font-black tracking-wide ${
            dark
              ? "border-white/15 bg-white/10 text-[#ffd27a]"
              : "border-[#b68614]/25 bg-[#b68614]/10 text-[#8f680d]"
          }`}
        >
          <span className={`h-1.5 w-1.5 rounded-full ${dark ? "bg-[#ffd27a]" : "bg-[#b68614]"}`} />
          {kicker}
        </span>
      )}
      <h2
        className={`mt-4 text-3xl font-black leading-tight tracking-tight md:text-[2.6rem] ${
          dark ? "text-white" : "text-[#7a0d0d]"
        }`}
      >
        {title}
      </h2>
      {subtitle && (
        <p className={`mt-3 leading-relaxed ${dark ? "text-white/75" : "text-[#6b4f3a]"}`}>
          {subtitle}
        </p>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Phone mockup (used in the app-download band)                       */
/* ------------------------------------------------------------------ */

function PhoneMockup({ c }: { c: LandingContent }) {
  const screenshot = safeHref(c.app.screenshot);
  const dishes = c.why.dishes.slice(0, 4);
  const logo = safeHref(c.brand.logo) ?? logoIcon;

  return (
    <div className="relative flex origin-center scale-[0.82] justify-center sm:scale-90 lg:scale-100 lg:pl-16 xl:pl-24">
      {/* glow blobs */}
      <div className="pointer-events-none absolute -inset-16 -z-10">
        <div className="lp-glow absolute right-6 top-1/3 h-48 w-48 rounded-full bg-[#b68614] opacity-25 blur-3xl" />
        <div className="lp-glow absolute bottom-10 left-0 h-56 w-56 rounded-full bg-[#8f3410] opacity-25 blur-3xl" />
        <div className="absolute left-1/2 top-1/2 h-64 w-64 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#e0a52e] opacity-10 blur-[90px]" />
      </div>

      <div className="lp-phone-tilt relative">
        {/* device body */}
        <div className="lp-float relative h-[610px] w-[300px] rounded-[3rem] bg-gradient-to-br from-[#343434] via-[#1b1b1b] to-[#0a0a0a] p-[14px] shadow-[0_60px_110px_-30px_rgba(0,0,0,0.75),0_25px_50px_-20px_rgba(122,13,13,0.55)] ring-1 ring-white/10">
          {/* side buttons */}
          <div className="absolute -left-[3px] top-28 h-12 w-[3px] rounded-l bg-[#3a3a3a]" />
          <div className="absolute -left-[3px] top-44 h-20 w-[3px] rounded-l bg-[#3a3a3a]" />
          <div className="absolute -right-[3px] top-40 h-24 w-[3px] rounded-r bg-[#3a3a3a]" />

          {/* screen */}
          <div className="relative h-full w-full overflow-hidden rounded-[2.3rem] bg-[#f7f1e6]">
            {/* dynamic island */}
            <div className="absolute left-1/2 top-3 z-30 h-7 w-28 -translate-x-1/2 rounded-full bg-black" />
            {/* screen sheen */}
            <div className="pointer-events-none absolute inset-0 z-20 bg-gradient-to-tr from-transparent via-white/0 to-white/10" />

            {screenshot ? (
              <img src={screenshot} alt={c.brand.name} className="h-full w-full object-cover" />
            ) : (
              <>
                {/* status bar */}
                <div className="flex items-center justify-between px-6 pt-3.5 text-[11px] font-black text-[#7a0d0d]">
                  <span>٩:٤١</span>
                  <div className="flex items-center gap-1">
                    <Signal size={13} /> <Wifi size={13} /> <BatteryFull size={15} />
                  </div>
                </div>

                {/* app header */}
                <div className="mx-3 mt-1.5 rounded-[1.6rem] bg-gradient-to-br from-[#7a0d0d] to-[#9a1212] px-4 pb-5 pt-4 text-white shadow-lg">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <img src={logo} alt="" className="h-7 w-7 object-contain" />
                      <span className="text-lg font-black">{c.brand.name}</span>
                    </div>
                    <div className="flex items-center gap-2 text-[11px] font-bold">
                      <span className="flex items-center gap-1">
                        <MapPin size={12} /> المعادي
                      </span>
                      <Bell size={15} />
                    </div>
                  </div>
                  <div className="mt-3 flex items-center gap-2 rounded-2xl bg-white/15 px-3 py-2 text-[11px] text-white/80">
                    <Search size={14} /> دوّري على أكلة...
                  </div>
                </div>

                {/* categories */}
                <div className="lp-no-scrollbar mt-3 flex gap-2 overflow-x-auto px-3">
                  {["كشري", "محشي", "مشويات", "حلويات", "شوربة"].map((cat, i) => (
                    <span
                      key={cat}
                      className={`shrink-0 rounded-full px-3 py-1 text-[10px] font-black ${
                        i === 0
                          ? "bg-[#b68614] text-white"
                          : "border border-[#efe6d2] bg-white text-[#7a0d0d]"
                      }`}
                    >
                      {cat}
                    </span>
                  ))}
                </div>

                {/* section title */}
                <div className="flex items-center justify-between px-4 pb-2 pt-4">
                  <span className="text-[12px] font-black text-[#7a0d0d]">الأكثر طلباً</span>
                  <span className="text-[10px] font-bold text-[#b68614]">شوف الكل</span>
                </div>

                {/* food grid */}
                <div className="grid grid-cols-2 gap-2.5 px-3">
                  {dishes.map((d, i) => (
                    <div key={d.id} className="rounded-2xl border border-[#efe6d2] bg-white p-2 shadow-sm">
                      <div className="h-14 overflow-hidden rounded-xl">
                        <img src={dishImage(d, i)} alt={d.name} className="h-full w-full object-cover" />
                      </div>
                      <p className="mt-1.5 truncate text-[11px] font-black text-gray-800">{d.name}</p>
                      <div className="mt-0.5 flex items-center justify-between">
                        <span className="flex items-center gap-0.5 text-[9px] font-bold text-[#b68614]">
                          <Star size={9} className="fill-[#b68614]" /> {d.rate}
                        </span>
                        <span className="text-[11px] font-black text-[#7a0d0d]">{d.price}</span>
                      </div>
                    </div>
                  ))}
                </div>

                {/* promo */}
                <div className="mx-3 mt-3 flex items-center gap-2 rounded-2xl bg-[#7a0d0d]/10 px-3 py-2 text-[10px] font-black text-[#7a0d0d]">
                  <Sparkles size={13} className="text-[#b68614]" /> خصم ٢٠٪ على أول أوردر
                </div>

                {/* bottom nav */}
                <div className="absolute inset-x-0 bottom-0 flex items-center justify-around border-t border-[#efe6d2] bg-white/95 px-6 py-3 backdrop-blur">
                  <Home size={20} className="text-[#7a0d0d]" />
                  <Search size={20} className="text-gray-400" />
                  <div className="relative">
                    <ShoppingBag size={20} className="text-gray-400" />
                    <span className="absolute -right-1 -top-1 grid h-3 w-3 place-items-center rounded-full bg-[#b68614] text-[7px] font-black text-white">
                      ٢
                    </span>
                  </div>
                  <User size={20} className="text-gray-400" />
                </div>
              </>
            )}
          </div>
        </div>

        {/* floating card: rating */}
        <div className="lp-float-soft absolute -right-12 top-36 rounded-2xl bg-white px-4 py-3 shadow-2xl ring-1 ring-black/5">
          <div className="flex items-center gap-2">
            <div className="grid h-9 w-9 place-items-center rounded-xl bg-[#b68614]/15 text-[#b68614]">
              <Star size={18} className="fill-[#b68614]" />
            </div>
            <div>
              <p className="text-sm font-black text-gray-800">٤.٩ من ٥</p>
              <p className="text-[10px] font-bold text-gray-400">تقييم العملاء</p>
            </div>
          </div>
        </div>

        {/* floating card: order confirmed */}
        <div className="lp-float-delay absolute -left-8 bottom-28 rounded-2xl bg-white px-4 py-3 shadow-2xl ring-1 ring-black/5">
          <div className="flex items-center gap-2">
            <div className="grid h-9 w-9 place-items-center rounded-xl bg-green-100 text-green-600">
              <CheckCircle2 size={18} />
            </div>
            <div>
              <p className="text-sm font-black text-gray-800">تم تأكيد طلبك</p>
              <p className="text-[10px] font-bold text-gray-400">الدليفري في الطريق</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/** App-store badge. Without a link yet it renders as a muted "قريبًا" tile. */
function StoreButton({
  url,
  label,
  kind,
}: {
  url: string;
  label: string;
  kind: "google" | "apple";
}) {
  const href = safeHref(url);
  const Icon = kind === "google" ? Play : Apple;
  const caption = href ? (kind === "google" ? "متاح على" : "حمّله من") : "قريبًا على";
  const body = (
    <>
      <Icon
        size={26}
        className={`${kind === "google" ? "text-[#e0a52e]" : "text-white"} transition-transform group-hover:scale-110`}
      />
      <span className="text-right leading-tight">
        <span className="block text-[10px] font-bold text-white/60">{caption}</span>
        <span className="block text-base font-black tracking-wide" dir="ltr">
          {label}
        </span>
      </span>
    </>
  );
  const cls =
    "group relative flex items-center gap-3.5 rounded-2xl bg-black/40 px-6 py-3.5 text-white ring-1 ring-white/20 backdrop-blur-md transition-all duration-300";
  return href ? (
    <a
      {...linkProps(href)}
      className={`${cls} hover:-translate-y-1 hover:bg-black/60 hover:shadow-xl hover:shadow-black/40 hover:ring-[#e0a52e]/50`}
    >
      {body}
    </a>
  ) : (
    <span className={`${cls} cursor-default opacity-70`} aria-disabled="true">
      {body}
    </span>
  );
}

function GlassStat({ s }: { s: StatItem }) {
  return (
    <div className="flex items-center justify-center gap-3 rounded-2xl bg-white/5 p-4 shadow-lg backdrop-blur-2xl transition-all hover:bg-white/10 md:justify-start">
      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-white/10 text-[#ffd27a] shadow-inner">
        <LandingIcon name={s.icon} size={18} className={s.icon === "star" ? "fill-[#ffd27a]" : undefined} />
      </span>
      <div className="text-right">
        <div className="text-sm font-black text-white">{s.value}</div>
        <div className="text-[11px] font-bold text-white/70">{s.label}</div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Contact form — composes a WhatsApp or email message, stores nothing */
/* ------------------------------------------------------------------ */

function ContactForm({ c }: { c: LandingContent["contact"] }) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const text = () =>
    [`الاسم: ${name.trim()}`, ...(phone.trim() ? [`الموبايل: ${phone.trim()}`] : []), "", message.trim()].join("\n");

  const valid = () => {
    if (!name.trim() || !message.trim()) {
      setError("اكتب اسمك ورسالتك الأول.");
      return false;
    }
    setError("");
    return true;
  };

  const viaWhatsApp = (e: FormEvent) => {
    e.preventDefault();
    if (!valid()) return;
    const num = toInternationalPhone(c.whatsapp || c.phone).replace("+", "");
    window.open(`https://wa.me/${num}?text=${encodeURIComponent(text())}`, "_blank", "noopener");
  };

  const viaEmail = () => {
    if (!valid()) return;
    window.location.href = `mailto:${c.email}?subject=${encodeURIComponent(
      `رسالة من ${name.trim()}`,
    )}&body=${encodeURIComponent(text())}`;
  };

  const field =
    "w-full rounded-2xl border border-[#ead9bd] bg-white px-4 py-3.5 text-sm font-medium text-[#3a2a1a] outline-none transition placeholder:text-[#b9a48a] focus:border-[#7a0d0d] focus:ring-4 focus:ring-[#7a0d0d]/10";

  return (
    <form
      onSubmit={viaWhatsApp}
      className="rounded-[2rem] bg-white p-6 shadow-[0_25px_60px_-25px_rgba(122,13,13,0.25)] ring-1 ring-black/[0.04] sm:p-8"
      noValidate
    >
      <h3 className="mb-5 text-xl font-black text-[#7a0d0d]">{c.formTitle}</h3>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block">
          <span className="mb-1.5 block text-xs font-black text-[#6b4f3a]">الاسم</span>
          <input className={field} value={name} onChange={(e) => setName(e.target.value)} placeholder="اسمك" autoComplete="name" />
        </label>
        <label className="block">
          <span className="mb-1.5 block text-xs font-black text-[#6b4f3a]">رقم الموبايل (اختياري)</span>
          <input className={field} value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="01xxxxxxxxx" dir="ltr" inputMode="tel" autoComplete="tel" />
        </label>
      </div>
      <label className="mt-4 block">
        <span className="mb-1.5 block text-xs font-black text-[#6b4f3a]">رسالتك</span>
        <textarea className={`${field} min-h-[130px] resize-y`} value={message} onChange={(e) => setMessage(e.target.value)} placeholder="اكتب رسالتك هنا…" />
      </label>
      <p className="mt-2 min-h-[1.25rem] text-xs font-bold text-red-600" aria-live="polite">
        {error}
      </p>
      <div className="mt-2 flex flex-col gap-3 sm:flex-row">
        {(c.whatsapp || c.phone) && (
          <button
            type="submit"
            className="inline-flex flex-1 items-center justify-center gap-2 whitespace-nowrap rounded-2xl bg-[#1fa855] px-6 py-3.5 text-sm font-black text-white shadow-lg shadow-[#1fa855]/25 transition hover:-translate-y-0.5 hover:brightness-110"
          >
            <MessageCircle size={18} /> ابعت على واتساب
          </button>
        )}
        {c.email && (
          <button
            type="button"
            onClick={viaEmail}
            className="inline-flex flex-1 items-center justify-center gap-2 whitespace-nowrap rounded-2xl bg-[#7a0d0d] px-6 py-3.5 text-sm font-black text-white shadow-lg shadow-[#7a0d0d]/25 transition hover:-translate-y-0.5 hover:bg-[#5a0909]"
          >
            <Send size={17} /> ابعت إيميل
          </button>
        )}
      </div>
    </form>
  );
}

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */

export default function LandingPage() {
  const { content: c, ready } = useLandingContent();
  const [menuOpen, setMenuOpen] = useState(false);
  const [tab, setTab] = useState<"client" | "cook">("client");
  const steps = tab === "client" ? c.how.clientSteps : c.how.cookSteps;
  const logo = safeHref(c.brand.logo) ?? logoIcon;
  const heroImage = safeHref(c.hero.image) ?? heroFood;
  const socials = c.social.links.filter((s) => safeHref(s.url));

  if (!ready) {
    return (
      <div className="grid min-h-screen place-items-center bg-[#180204]" role="status" aria-live="polite">
        <img src={logoIcon} alt="" className="h-16 w-16 animate-pulse object-contain" />
        <span className="sr-only">جارٍ التحميل…</span>
      </div>
    );
  }

  return (
    <div dir="rtl" className="min-h-screen overflow-x-hidden bg-[#faf3e7] text-[#3a2a1a]">
      {/* ============ HEADER ============ */}
      <header className="fixed inset-x-0 top-0 z-50 px-4 pt-6 sm:px-8" dir="rtl">
        <div className="mx-auto flex max-w-7xl items-center justify-between rounded-full bg-[#2a0407]/80 px-7 py-4 shadow-[0_25px_60px_rgba(0,0,0,0.8)] ring-1 ring-white/10 backdrop-blur-3xl transition-all duration-300">
          <a href="#home" className="group flex cursor-pointer items-center">
            <div className="relative rounded-full p-1.5 transition-transform duration-500 group-hover:-rotate-6 group-hover:scale-110">
              <img src={logo} alt={c.brand.name} className="h-10 w-auto object-contain drop-shadow-md md:h-11" />
            </div>
          </a>

          <nav className="hidden items-center gap-2 md:flex">
            {c.brand.navLinks.map((l) => (
              <a
                key={l.id}
                {...linkProps(safeHref(l.href))}
                className="rounded-full px-5 py-2 text-sm font-extrabold text-white/90 transition-all duration-300 hover:-translate-x-1 hover:bg-white/15 hover:text-[#ffd27a]"
              >
                {l.label}
              </a>
            ))}
          </nav>

          {c.brand.showLogin ? (
            <div className="hidden items-center gap-3 md:flex">
              <Link
                to="/login"
                className="group relative flex items-center gap-2.5 overflow-hidden rounded-full bg-gradient-to-r from-[#ffd27a] via-[#f4c752] to-[#d89c1e] px-7 py-3 text-sm font-black text-[#1c0204] shadow-[0_8px_30px_rgba(255,210,122,0.4)] transition-all duration-300 hover:scale-105 hover:shadow-[0_12px_40px_rgba(255,210,122,0.7)]"
              >
                <div className="absolute inset-0 translate-y-full bg-white/30 transition-transform duration-300 group-hover:translate-y-0" />
                <LogIn size={17} className="transition-transform duration-300 group-hover:-translate-x-1" />
                <span className="relative z-10 tracking-wide">{c.brand.loginLabel}</span>
              </Link>
            </div>
          ) : (
            <div className="hidden md:block" />
          )}

          <button
            className="relative rounded-full bg-white/10 p-3 text-white shadow-lg transition-all duration-300 hover:bg-white/20 active:scale-95 md:hidden"
            onClick={() => setMenuOpen((v) => !v)}
            aria-label={menuOpen ? "إغلاق القائمة" : "فتح القائمة"}
            aria-expanded={menuOpen}
          >
            <div className={`transition-transform duration-300 ${menuOpen ? "rotate-90 scale-110 text-[#ffd27a]" : "rotate-0"}`}>
              {menuOpen ? <X size={24} /> : <Menu size={24} />}
            </div>
          </button>
        </div>

        {menuOpen && (
          <div className="absolute inset-x-4 top-full z-50 mt-3 duration-300 animate-in fade-in zoom-in-95 slide-in-from-top-4 md:hidden">
            <div className="flex flex-col gap-3 rounded-[2.5rem] bg-gradient-to-b from-[#2a0407]/95 via-[#180204]/95 to-[#0a0102]/95 p-5 shadow-[0_20px_50px_rgba(0,0,0,0.9)] ring-1 ring-white/15 backdrop-blur-3xl">
              <div className="flex items-center justify-between border-b border-white/10 px-2 pb-3">
                <div className="flex items-center gap-2.5">
                  <img src={logo} alt={c.brand.name} className="h-8 w-auto object-contain drop-shadow" />
                  <span className="bg-gradient-to-r from-white via-[#ffd27a] to-white bg-clip-text text-sm font-black tracking-wide text-transparent">
                    قائمة {c.brand.name}
                  </span>
                </div>
                <button
                  className="rounded-full bg-white/10 p-2 text-white transition-all hover:bg-white/20 hover:text-[#ffd27a]"
                  onClick={() => setMenuOpen(false)}
                  aria-label="إغلاق القائمة"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="flex flex-col gap-1.5 py-1">
                {c.brand.navLinks.map((l) => (
                  <a
                    key={l.id}
                    {...linkProps(safeHref(l.href))}
                    onClick={() => setMenuOpen(false)}
                    className="group flex items-center justify-between rounded-2xl bg-white/5 px-4 py-3 text-sm font-bold text-white transition-all duration-300 hover:bg-gradient-to-r hover:from-[#b68614] hover:to-[#ffd27a] hover:text-[#180204]"
                  >
                    <span className="tracking-wide">{l.label}</span>
                    <span className="text-xs font-bold text-[#ffd27a] transition-transform duration-300 group-hover:-translate-x-1 group-hover:text-[#180204]">
                      ←
                    </span>
                  </a>
                ))}
              </div>

              {c.brand.showLogin && (
                <div className="border-t border-white/10 pt-3">
                  <Link
                    to="/login"
                    onClick={() => setMenuOpen(false)}
                    className="flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-[#ffd27a] via-[#f4c752] to-[#d89c1e] py-3 text-center text-sm font-black text-[#180204] shadow-lg transition-transform active:scale-95"
                  >
                    <LogIn size={16} />
                    <span>{c.brand.loginLabel}</span>
                  </Link>
                </div>
              )}
            </div>
          </div>
        )}
      </header>

      {/* ============ HERO ============ */}
      <section
        id="home"
        className="relative overflow-hidden bg-[#180204] bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-[#4a080f] via-[#210205] to-[#120102]"
      >
        <div className="pointer-events-none absolute inset-0 opacity-[0.06] [background-image:radial-gradient(circle,#fff_1.5px,transparent_1.5px)] [background-size:32px_32px]" />
        <div className="lp-glow pointer-events-none absolute -left-32 top-10 h-[35rem] w-[35rem] animate-pulse rounded-full bg-[#f4c752]/15 blur-[150px]" />
        <div className="lp-glow pointer-events-none absolute right-[-10%] top-1/3 h-[30rem] w-[30rem] rounded-full bg-[#e0a52e]/10 blur-[130px]" />

        {c.hero.enabled ? (
          <div className="relative mx-auto grid max-w-7xl items-center gap-12 px-6 pb-28 pt-44 md:grid-cols-2 md:gap-16 md:pb-36 md:pt-48">
            <div className="flex flex-col items-center text-center md:items-start md:text-right">
              {c.hero.badge && (
                <div className="inline-flex items-center gap-2.5 rounded-full bg-white/10 px-5 py-2.5 text-xs font-black text-white/95 shadow-[0_10px_30px_rgba(0,0,0,0.3)] backdrop-blur-2xl">
                  <Sparkles size={16} className="text-[#ffd27a]" />
                  <span className="tracking-wide">{c.hero.badge}</span>
                </div>
              )}

              <h1 className="mt-6 text-[2.6rem] font-black leading-[1.15] tracking-tight text-white drop-shadow-xl sm:text-[3.25rem] md:text-[4.75rem]">
                {c.hero.titleLine1}
                <br />
                <span className="bg-gradient-to-l from-[#fff3d1] via-[#ffd27a] to-[#d89c1e] bg-clip-text text-transparent drop-shadow-md">
                  {c.hero.titleHighlight}
                </span>
              </h1>

              <p className="mt-6 max-w-lg text-center text-lg font-medium leading-[1.8] text-white/90 sm:text-xl md:text-right">
                {c.hero.description}
              </p>

              <div className="mt-9 flex flex-wrap justify-center gap-4 md:justify-start">
                {c.hero.primaryCta.label && (
                  <a
                    {...linkProps(safeHref(c.hero.primaryCta.href))}
                    className="rounded-full bg-gradient-to-r from-[#ffd27a] via-[#f4c752] to-[#d89c1e] px-10 py-4 text-sm font-black text-[#1c0204] shadow-[0_15px_35px_rgba(240,165,46,0.4)] transition-all duration-300 hover:-translate-y-1 hover:brightness-110"
                  >
                    {c.hero.primaryCta.label}
                  </a>
                )}
                {c.hero.secondaryCta.label && (
                  <a
                    {...linkProps(safeHref(c.hero.secondaryCta.href))}
                    className="rounded-full bg-white/10 px-10 py-4 text-sm font-black text-white shadow-xl backdrop-blur-2xl transition-all duration-300 hover:-translate-y-1 hover:bg-white/20"
                  >
                    {c.hero.secondaryCta.label}
                  </a>
                )}
              </div>

              {c.hero.stats.length > 0 && (
                <div className="mt-11 grid w-full max-w-xl grid-cols-1 gap-3.5 sm:grid-cols-3">
                  {c.hero.stats.map((s) => (
                    <GlassStat key={s.id} s={s} />
                  ))}
                </div>
              )}
            </div>

            <div className="relative mx-auto w-full max-w-md">
              <div className="lp-glow absolute inset-4 -z-10 animate-pulse rounded-full bg-[#ffd27a]/25 blur-3xl" />
              <div className="relative overflow-hidden rounded-[3.25rem] bg-gradient-to-b from-white/20 via-white/5 to-transparent p-4 shadow-[0_70px_120px_-25px_rgba(0,0,0,0.9)] ring-1 ring-white/20 backdrop-blur-2xl">
                <img
                  src={heroImage}
                  alt={c.hero.imageAlt}
                  className="lp-float mx-auto aspect-[4/5] w-full rounded-[2.75rem] object-cover shadow-2xl"
                />
              </div>

              <span className="lp-float-soft absolute right-0 top-4 text-4xl drop-shadow-2xl">🌶️</span>
              <span className="lp-float-delay absolute left-0 top-1/3 text-3xl drop-shadow-2xl">🧄</span>
              <span className="lp-float-soft absolute bottom-12 left-2 text-4xl drop-shadow-2xl">🫓</span>
              <span className="lp-float-delay absolute bottom-6 right-4 text-3xl drop-shadow-2xl">🌿</span>

              {c.hero.floatingBadge && (
                // centred by the wrapper: lp-float-soft's transform would override translate-x
                <div className="absolute inset-x-0 -bottom-5 flex justify-center">
                  <div className="lp-float-soft flex items-center gap-2.5 whitespace-nowrap rounded-2xl bg-white/95 px-4 py-3 text-[11px] font-black text-[#180204] shadow-2xl ring-1 ring-black/10 backdrop-blur-3xl sm:px-6 sm:py-3.5 sm:text-xs">
                    <Clock size={17} className="text-[#d89c1e]" /> {c.hero.floatingBadge}
                  </div>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="h-32" />
        )}

        <Wave color={c.why.enabled ? "#f1dcc0" : "#faf3e7"} />
      </section>

      {/* ============ WHY ============ */}
      {c.why.enabled && (
        <section id="why" className="relative overflow-hidden bg-[#f1dcc0]">
          <div className="pointer-events-none absolute right-5 top-1/2 h-72 w-72 rounded-full bg-white/40 blur-[90px] md:right-10 md:h-96 md:w-96 md:blur-[120px]" />

          <div className="relative mx-auto max-w-7xl px-4 py-16 sm:px-6 sm:py-20 md:py-28">
            <div className="grid gap-12 lg:grid-cols-12 lg:items-center">
              <div className="flex flex-col items-center text-center lg:col-span-5 lg:items-start lg:text-right">
                <span className="inline-grid h-14 w-14 place-items-center rounded-2xl bg-gradient-to-tr from-[#7a0d0d] to-[#9c1313] text-[#f4c752] shadow-xl shadow-[#7a0d0d]/20">
                  <Leaf size={26} />
                </span>
                <h2 className="mt-5 text-3xl font-black leading-tight tracking-tight text-[#7a0d0d] drop-shadow-sm sm:text-4xl md:text-[2.75rem]">
                  {c.why.title}
                </h2>
                <p className="mt-4 max-w-md text-center text-base font-medium leading-[1.8] text-[#6b4f3a] lg:text-right">
                  {c.why.description}
                </p>
                {c.why.note && (
                  <p className="mt-5 flex max-w-md items-start gap-3 rounded-3xl bg-white/70 p-4 text-right text-sm font-bold leading-relaxed text-[#6b4f3a] shadow-sm backdrop-blur-xl sm:text-base">
                    <span className="grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-[#faf3e7] text-[#b68614] shadow-inner">
                      <HeartHandshake size={18} />
                    </span>
                    <span>{c.why.note}</span>
                  </p>
                )}
              </div>

              {c.why.dishes.length > 0 && (
                <div className="lg:col-span-7">
                  {c.why.dishesBadge && (
                    <div className="mb-6 flex justify-center lg:justify-start">
                      <div className="inline-flex items-center gap-2.5 rounded-full bg-white/90 px-4 py-2 text-xs font-black text-[#7a0d0d] shadow-sm backdrop-blur-xl">
                        <span className="h-2 w-2 animate-ping rounded-full bg-[#7a0d0d]" />
                        {c.why.dishesBadge}
                      </div>
                    </div>
                  )}

                  <div className="grid grid-cols-3 gap-2 sm:gap-4 md:gap-5">
                    {c.why.dishes.map((d, i) => (
                      <div
                        key={d.id}
                        className={`group relative overflow-hidden rounded-[1.25rem] bg-white p-2 shadow-[0_20px_40px_-15px_rgba(122,13,13,0.25)] transition-all duration-500 hover:-translate-y-2 hover:shadow-[0_35px_70px_-15px_rgba(122,13,13,0.4)] sm:rounded-[2rem] sm:p-3 sm:hover:-translate-y-3 md:rounded-[2.5rem] md:p-3.5 ${
                          i % 3 === 1 ? "lg:-translate-y-8" : "lg:translate-y-6"
                        }`}
                      >
                        <div className="relative aspect-[4/5] overflow-hidden rounded-[1rem] sm:rounded-[1.5rem] md:rounded-[2rem]">
                          <img
                            src={dishImage(d, i)}
                            alt={d.name}
                            className="h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-110"
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-60" />
                          {d.rate && (
                            <div className="absolute right-1.5 top-1.5 flex items-center gap-1 rounded-full bg-black/40 px-2 py-0.5 text-[9px] font-black text-white shadow-lg backdrop-blur-md sm:right-2.5 sm:top-2.5 sm:px-2.5 sm:py-1 sm:text-[10px] md:right-3.5 md:top-3.5 md:text-[11px]">
                              <Star size={10} className="fill-amber-400 text-amber-400" />
                              <span>{d.rate}</span>
                            </div>
                          )}
                        </div>
                        <div className="p-1.5 text-center sm:p-2.5 md:p-3">
                          <p className="truncate text-[10px] font-black tracking-tight text-gray-900 transition-colors group-hover:text-[#7a0d0d] sm:text-xs md:text-sm">
                            {d.name}
                          </p>
                          {(d.tag || d.price) && (
                            <span className="mt-1 inline-block rounded-full bg-[#faf3e7] px-2 py-0.5 text-[8px] font-bold text-[#b68614] shadow-inner sm:mt-1.5 sm:px-2.5 sm:text-[9px] md:text-[10px]">
                              {d.price ? `${d.price}${d.tag ? ` · ${d.tag}` : ""}` : d.tag}
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          <Wave color="#faf3e7" />
        </section>
      )}

      {/* ============ FEATURES ============ */}
      {c.features.enabled && (
        <section className="relative overflow-hidden bg-[#faf3e7]">
          <div className="pointer-events-none absolute -right-20 top-1/4 h-72 w-72 rounded-full bg-[#ffd27a]/20 blur-[100px]" />
          <div className="pointer-events-none absolute -left-20 bottom-10 h-72 w-72 rounded-full bg-[#7a0d0d]/10 blur-[100px]" />

          <div className="relative mx-auto max-w-7xl px-4 py-16 sm:px-6 sm:py-24">
            {c.features.cards.length > 0 && (
              <div className="grid gap-6 sm:gap-8 md:grid-cols-2 md:gap-10">
                {c.features.cards.map((f) => {
                  return (
                    <div
                      key={f.id}
                      className="group relative flex flex-col justify-between rounded-[2.5rem] bg-white/90 p-6 text-center shadow-[0_20px_50px_rgba(122,13,13,0.06)] backdrop-blur-2xl transition-all duration-500 hover:-translate-y-2 hover:bg-white hover:shadow-[0_30px_70px_rgba(122,13,13,0.12)] sm:p-9 sm:text-right"
                    >
                      <div>
                        <div className="mb-5 inline-grid h-14 w-14 place-items-center rounded-2xl bg-[#7a0d0d]/10 text-[#7a0d0d] shadow-inner transition-transform duration-500 group-hover:scale-110 group-hover:bg-[#7a0d0d] group-hover:text-white">
                          <LandingIcon name={f.icon} size={28} />
                        </div>
                        <h3 className="text-2xl font-black tracking-tight text-[#7a0d0d] sm:text-3xl">{f.title}</h3>
                        <p className="mt-3 text-sm font-medium leading-[1.8] text-[#6b4f3a] sm:text-base">{f.text}</p>
                      </div>
                      {f.ctaLabel && (
                        <div className="mt-8 flex justify-center sm:justify-start">
                          <a
                            {...linkProps(safeHref(f.ctaHref))}
                            className="inline-flex items-center gap-2.5 rounded-full bg-gradient-to-r from-[#7a0d0d] to-[#5a0909] px-8 py-3.5 text-sm font-black text-white shadow-xl shadow-[#7a0d0d]/20 transition-all duration-300 hover:-translate-y-1 hover:brightness-110"
                          >
                            <span>{f.ctaLabel}</span>
                            <ArrowLeft size={16} />
                          </a>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {c.features.stats.length > 0 && (
              <div className="mt-12 grid grid-cols-2 gap-3.5 sm:gap-5 md:grid-cols-4">
                {c.features.stats.map((s) => {
                  return (
                    <div
                      key={s.id}
                      className="group rounded-3xl bg-white/95 p-5 text-center shadow-[0_15px_30px_rgba(122,13,13,0.04)] backdrop-blur-2xl transition-all duration-300 hover:-translate-y-1.5 hover:shadow-[0_20px_40px_rgba(122,13,13,0.08)] sm:p-6"
                    >
                      <div className="mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-2xl bg-amber-50 text-[#b68614] shadow-inner">
                        <LandingIcon name={s.icon} size={22} className={s.icon === "star" ? "fill-[#b68614]" : undefined} />
                      </div>
                      <span className="block text-base font-black tracking-tight text-gray-900 sm:text-lg">{s.value}</span>
                      <span className="mt-1 block text-xs font-bold text-[#6b4f3a]/80">{s.label}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </section>
      )}

      {/* ============ HOW ============ */}
      {c.how.enabled && (
        <section id="how" className="relative overflow-hidden bg-[#faf3e7] pb-16 pt-10">
          <div className="pointer-events-none absolute left-1/2 top-1/2 h-[500px] w-[500px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#e0a52e]/5 blur-[100px]" />

          <div className="relative mx-auto max-w-7xl px-5">
            <SectionHeading kicker={c.how.kicker} title={c.how.title} />

            <div className="mb-14 flex justify-center">
              <div className="inline-flex rounded-2xl border border-[#f0e1c7] bg-white p-1.5 shadow-[0_10px_25px_-10px_rgba(122,13,13,0.12)]">
                {(["client", "cook"] as const).map((t) => (
                  <button
                    key={t}
                    onClick={() => setTab(t)}
                    aria-pressed={tab === t}
                    className={`rounded-xl px-5 py-3 text-sm font-black transition-all duration-300 sm:px-8 ${
                      tab === t ? "bg-[#7a0d0d] text-white shadow-md shadow-[#7a0d0d]/30" : "text-gray-500 hover:text-[#7a0d0d]"
                    }`}
                  >
                    {t === "client" ? c.how.clientTab : c.how.cookTab}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {steps.map((s, i) => {
                return (
                  <div
                    key={s.id}
                    className="group relative flex flex-col justify-between rounded-[2rem] border border-[#f2e6d0] bg-white p-7 shadow-[0_10px_30px_-15px_rgba(0,0,0,0.05)] transition-all duration-300 hover:-translate-y-2 hover:border-[#7a0d0d]/30 hover:shadow-[0_20px_45px_-15px_rgba(122,13,13,0.15)]"
                  >
                    <div>
                      <div className="mb-6 flex items-center justify-between">
                        <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-[#f0e1c7] bg-[#faf3e7] text-[#7a0d0d] transition-all duration-300 group-hover:scale-105 group-hover:bg-[#7a0d0d] group-hover:text-white">
                          <LandingIcon name={s.icon} size={24} />
                        </div>
                        <span className="rounded-xl border border-[#f0e1c7] bg-[#faf3e7] px-3.5 py-1 font-mono text-base font-black text-amber-800/60">
                          {String(i + 1).padStart(2, "0")}
                        </span>
                      </div>
                      <h4 className="mb-2 text-lg font-black tracking-tight text-gray-900">{s.title}</h4>
                      <p className="text-sm font-medium leading-relaxed text-gray-500">{s.text}</p>
                    </div>
                    <div className="mt-8 flex items-center justify-between border-t border-gray-100 pt-4">
                      <span className="text-[11px] font-bold text-gray-400 transition-colors group-hover:text-[#7a0d0d]">
                        {c.brand.name}
                      </span>
                      <div className="h-1.5 w-6 rounded-full bg-gray-200 transition-all duration-300 group-hover:bg-[#e0a52e]" />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>
      )}

      {/* ============ BECOME A COOK ============ */}
      {c.joinCook.enabled && (
        <section className="relative overflow-hidden bg-[#faf3e7]">
          <div className="absolute inset-0 opacity-[0.03] [background-image:radial-gradient(circle,#7a0d0d_1.5px,transparent_1.5px)] [background-size:28px_28px]" />

          <div className="relative mx-auto max-w-7xl px-5 pb-20 pt-12">
            <SectionHeading kicker={c.joinCook.kicker} title={c.joinCook.title} subtitle={c.joinCook.subtitle} />

            <div className="mt-10 grid gap-6 md:grid-cols-3">
              {c.joinCook.steps.map((s, i) => {
                return (
                  <div
                    key={s.id}
                    className="group relative flex flex-col justify-between rounded-[2rem] bg-white p-8 text-right shadow-[0_20px_50px_-25px_rgba(122,13,13,0.15)] ring-1 ring-black/[0.04] transition-all duration-300 hover:-translate-y-2 hover:shadow-[0_35px_70px_-25px_rgba(122,13,13,0.3)] hover:ring-[#7a0d0d]/20"
                  >
                    <span className="absolute left-6 top-6 select-none text-5xl font-black text-[#7a0d0d]/5 transition-transform group-hover:scale-110">
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    <div>
                      {s.badge && (
                        <span className="mb-4 inline-block rounded-full bg-[#faf3e7] px-3 py-1 text-[11px] font-bold text-[#b68614]">
                          {s.badge}
                        </span>
                      )}
                      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-[#7a0d0d] to-[#9a1212] text-white shadow-lg shadow-[#7a0d0d]/25 transition-all duration-300 group-hover:rotate-3 group-hover:scale-110">
                        <LandingIcon name={s.icon} size={26} />
                      </div>
                      <h4 className="mt-5 text-xl font-black tracking-tight text-[#7a0d0d]">{s.title}</h4>
                      <p className="mt-2.5 text-sm leading-relaxed text-[#6b4f3a]">{s.text}</p>
                    </div>
                    <div className="mt-6 h-1 w-12 rounded-full bg-[#faf3e7] transition-all duration-300 group-hover:w-full group-hover:bg-[#7a0d0d]" />
                  </div>
                );
              })}
            </div>

            {c.joinCook.ctaLabel && (
              <div className="mt-12 text-center">
                <a
                  {...linkProps(safeHref(c.joinCook.ctaHref))}
                  className="inline-flex items-center gap-2 rounded-full bg-[#7a0d0d] px-8 py-4 text-sm font-black text-white shadow-xl shadow-[#7a0d0d]/20 transition-all duration-300 hover:-translate-y-0.5 hover:bg-[#5a0909] hover:shadow-2xl"
                >
                  <span>{c.joinCook.ctaLabel}</span>
                  <ArrowLeft size={16} />
                </a>
              </div>
            )}
          </div>

          {c.app.enabled && <Wave color="#320808" />}
        </section>
      )}

      {/* ============ APP DOWNLOAD ============ */}
      {c.app.enabled && (
        <section
          id="app"
          className="relative overflow-hidden bg-[radial-gradient(130%_120%_at_50%_100%,#571212_0%,#3d0a0a_55%,#320808_100%)]"
        >
          <div className="pointer-events-none absolute inset-0 opacity-[0.08] [background-image:radial-gradient(circle,#fff_1.5px,transparent_1.5px)] [background-size:26px_26px]" />
          <div className="lp-glow pointer-events-none absolute -left-24 bottom-1/4 h-80 w-80 rounded-full bg-[#e0a52e]/15 blur-[100px]" />
          <div className="lp-glow pointer-events-none absolute -right-20 top-1/2 h-72 w-72 rounded-full bg-[#b68614]/20 blur-[100px]" />

          <div className="relative mx-auto grid max-w-7xl items-center gap-12 px-5 py-20 md:grid-cols-2 md:py-24">
            <div className="text-center md:text-right">
              {c.app.badge && (
                <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-1.5 text-xs font-bold text-[#e0a52e] ring-1 ring-white/10 backdrop-blur-md">
                  <span className="h-2 w-2 animate-pulse rounded-full bg-[#e0a52e]" />
                  {c.app.badge}
                </div>
              )}
              <h2 className="text-3xl font-black leading-tight tracking-tight text-white md:text-[2.6rem]">
                {c.app.titleStart} <span className="text-[#e5b34a]">{c.app.titleHighlight}</span>
                {c.app.titleEnd}
              </h2>
              <p className="mx-auto mt-4 max-w-md text-base leading-relaxed text-white/80 md:mx-0">{c.app.description}</p>

              <div className="mt-8 flex flex-wrap justify-center gap-4 md:justify-start">
                <StoreButton url={c.app.googlePlayUrl} label={c.app.googlePlayLabel} kind="google" />
                <StoreButton url={c.app.appStoreUrl} label={c.app.appStoreLabel} kind="apple" />
              </div>

              {c.app.stats.length > 0 && (
                <div className="mt-10 flex flex-wrap items-center justify-center gap-8 border-t border-white/10 pt-6 text-white/80 md:justify-start">
                  {c.app.stats.map((s) => {
                    return (
                      <div key={s.id} className="flex items-center gap-2.5">
                        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#e0a52e]/15 text-[#e0a52e] ring-1 ring-[#e0a52e]/30">
                          <LandingIcon name={s.icon} size={18} className={s.icon === "star" ? "fill-[#e0a52e]" : undefined} />
                        </div>
                        <div className="text-right">
                          <span className="block text-sm font-black text-white">{s.value}</span>
                          <span className="block text-[11px] text-white/60">{s.label}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="relative flex justify-center">
              <div className="pointer-events-none absolute inset-0 m-auto h-72 w-72 rounded-full bg-gradient-to-tr from-[#e0a52e]/20 to-red-500/20 blur-3xl" />
              <PhoneMockup c={c} />
            </div>
          </div>

          <Wave color="#faf3e7" />
        </section>
      )}

      {/* ============ FAQ ============ */}
      {c.faq.enabled && (
        <section id="faq" className="relative overflow-hidden bg-[#faf3e7] py-16 lg:py-28">
          <div className="pointer-events-none absolute right-1/4 top-1/4 h-[500px] w-[500px] rounded-full bg-[#7a0d0d]/[0.06] blur-[150px]" />
          <div className="pointer-events-none absolute bottom-1/4 left-1/4 h-[500px] w-[500px] rounded-full bg-[#e0a52e]/[0.1] blur-[170px]" />

          <div className="relative mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
            <div className="mb-14 flex flex-col items-center text-center lg:mb-20">
              {c.faq.badge && (
                <div className="mb-8 inline-flex items-center gap-3 rounded-full bg-white/90 px-6 py-3 text-xs font-black text-[#7a0d0d] shadow-[0_15px_35px_rgba(122,13,13,0.1)] ring-1 ring-[#7a0d0d]/15 backdrop-blur-2xl sm:text-sm">
                  <span className="relative flex h-3 w-3">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#7a0d0d] opacity-75" />
                    <span className="relative inline-flex h-3 w-3 rounded-full bg-[#7a0d0d]" />
                  </span>
                  <span className="tracking-wide">{c.faq.badge}</span>
                </div>
              )}
              <h2 className="text-4xl font-black leading-[1.15] tracking-tight text-[#7a0d0d] sm:text-5xl lg:text-6xl">
                {c.faq.title} <br className="hidden sm:block" />
                <span className="bg-gradient-to-r from-[#b68614] via-[#e0a52e] to-[#7a0d0d] bg-clip-text text-transparent">
                  {c.faq.titleHighlight}
                </span>
              </h2>
              {c.faq.subtitle && (
                <p className="mx-auto mt-6 max-w-2xl text-base font-medium leading-relaxed text-[#6b4f3a] sm:text-xl">
                  {c.faq.subtitle}
                </p>
              )}
            </div>

            <div className="flex flex-col gap-5">
              {c.faq.items.map((q, i) => (
                <details
                  key={q.id}
                  className="group rounded-[2rem] border border-black/5 bg-white/95 p-6 shadow-[0_15px_40px_rgba(122,13,13,0.05)] backdrop-blur-2xl transition-all duration-500 hover:-translate-y-1 hover:shadow-[0_25px_60px_rgba(122,13,13,0.1)] open:bg-gradient-to-br open:from-white open:to-[#faf3e7] open:ring-2 open:ring-[#7a0d0d]/20 sm:p-8"
                >
                  <summary className="flex cursor-pointer select-none list-none items-center justify-between text-right marker:content-none [&::-webkit-details-marker]:hidden">
                    <div className="flex items-center gap-4 sm:gap-6">
                      <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-[#faf3e7] text-sm font-black text-[#b68614] shadow-inner transition-all duration-500 group-open:scale-105 group-open:bg-[#7a0d0d] group-open:text-white sm:h-14 sm:w-14 sm:text-base">
                        {String(i + 1).padStart(2, "0")}
                      </span>
                      <div>
                        <h3 className="text-lg font-black text-gray-900 transition-colors group-open:text-[#7a0d0d] sm:text-xl">
                          {q.question}
                        </h3>
                        {q.hint && <p className="mt-1 text-xs font-bold text-[#b68614] sm:text-sm">{q.hint}</p>}
                      </div>
                    </div>
                    <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-[#faf3e7] text-[#7a0d0d] transition-transform duration-500 group-open:rotate-180 group-open:bg-[#7a0d0d] group-open:text-white sm:h-12 sm:w-12">
                      <svg className="h-5 w-5 sm:h-6 sm:w-6" fill="none" stroke="currentColor" strokeWidth="3" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                      </svg>
                    </div>
                  </summary>
                  <p className="mt-5 whitespace-pre-line border-t border-gray-200/60 pt-5 text-right text-base font-medium leading-[1.9] text-[#6b4f3a] sm:text-lg">
                    {q.answer}
                  </p>
                </details>
              ))}
            </div>

            {c.faq.supportTitle && (
              <div className="relative mt-16 overflow-hidden rounded-[3rem] bg-gradient-to-r from-[#7a0d0d] to-[#4a0707] p-10 text-center text-white shadow-2xl sm:p-14">
                <div className="absolute inset-0 opacity-10 [background-image:radial-gradient(circle,#fff_1.5px,transparent_1.5px)] [background-size:24px_24px]" />
                <div className="relative z-10 mx-auto max-w-xl">
                  <h3 className="mb-3 text-2xl font-black tracking-tight sm:text-3xl">{c.faq.supportTitle}</h3>
                  <p className="mb-8 text-sm font-medium text-white/80 sm:text-base">{c.faq.supportText}</p>
                  {c.faq.supportCtaLabel && (
                    <a
                      {...linkProps(safeHref(c.faq.supportCtaHref))}
                      className="inline-flex items-center gap-3 rounded-2xl bg-gradient-to-r from-[#e0a52e] to-[#b68614] px-8 py-4 text-sm font-black text-gray-950 shadow-xl transition-all duration-300 hover:scale-105 active:scale-95 sm:text-base"
                    >
                      <span>{c.faq.supportCtaLabel}</span>
                      <ArrowLeft size={18} />
                    </a>
                  )}
                </div>
              </div>
            )}
          </div>
        </section>
      )}

      {/* ============ CTA BANNER ============ */}
      {c.cta.enabled && (
        <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6">
          <div className="relative flex flex-col items-center justify-between gap-8 overflow-hidden rounded-[2.5rem] bg-[radial-gradient(ellipse_at_top_right,#7a0d0d_0%,#4a0707_60%,#2d0404_100%)] px-6 py-12 text-center shadow-[0_30px_70px_-20px_rgba(122,13,13,0.5)] ring-1 ring-white/10 sm:px-10 sm:py-16 md:flex-row md:text-right">
            <div className="pointer-events-none absolute inset-0 opacity-[0.08] [background-image:radial-gradient(circle,#fff_1.5px,transparent_1.5px)] [background-size:24px_24px]" />
            <div className="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full bg-[#e0a52e]/20 blur-[100px]" />

            <div className="relative z-10 flex max-w-xl flex-col items-center md:items-start">
              {c.cta.badge && (
                <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-1.5 text-xs font-black tracking-wide text-[#e0a52e] shadow-lg ring-1 ring-white/15 backdrop-blur-xl">
                  <span className="h-2 w-2 animate-ping rounded-full bg-[#e0a52e]" />
                  <span>{c.cta.badge}</span>
                </div>
              )}
              <h3 className="text-3xl font-black leading-tight tracking-tight text-white sm:text-4xl">
                {c.cta.titleStart} <span className="text-[#e0a52e]">{c.cta.titleHighlight}</span> {c.cta.titleEnd}
              </h3>
              <p className="mt-3.5 max-w-md text-base font-medium leading-relaxed text-white/80 sm:text-lg">{c.cta.description}</p>
            </div>

            {c.cta.buttonLabel && (
              <div className="relative z-10 shrink-0">
                <a
                  {...linkProps(safeHref(c.cta.buttonHref))}
                  className="group relative inline-flex items-center gap-3.5 overflow-hidden rounded-2xl bg-gradient-to-r from-[#e0a52e] to-[#b68614] px-8 py-4 text-sm font-black text-gray-950 shadow-2xl shadow-[#e0a52e]/20 transition-all duration-300 hover:-translate-y-1.5 hover:brightness-110 active:translate-y-0 sm:px-10 sm:text-base"
                >
                  <span>{c.cta.buttonLabel}</span>
                  <div className="grid h-8 w-8 place-items-center rounded-xl bg-black/10 text-gray-950 transition-transform duration-300 group-hover:-translate-x-1">
                    <ArrowLeft size={16} />
                  </div>
                </a>
              </div>
            )}
          </div>
        </section>
      )}

      {/* ============ SOCIAL MEDIA ============ */}
      {c.social.enabled && socials.length > 0 && (
        <section id="social" className="relative overflow-hidden bg-[#f1dcc0] py-16 sm:py-20">
          <div className="pointer-events-none absolute -left-20 top-0 h-72 w-72 rounded-full bg-white/50 blur-[100px]" />
          <div className="relative mx-auto max-w-6xl px-5">
            <SectionHeading kicker={c.social.kicker} title={c.social.title} subtitle={c.social.subtitle} />
            <div className="grid grid-cols-2 gap-3 sm:flex sm:flex-wrap sm:justify-center sm:gap-4">
              {socials.map((s) => {
                const p = SOCIAL_PLATFORMS[s.platform] ?? SOCIAL_PLATFORMS.facebook;
                return (
                  <a
                    key={s.id}
                    {...linkProps(safeHref(s.url))}
                    className="group flex min-w-0 items-center gap-3 rounded-2xl bg-white px-4 py-4 sm:min-w-[10.5rem] sm:px-5 shadow-[0_15px_35px_-20px_rgba(122,13,13,0.35)] ring-1 ring-black/[0.04] transition-all duration-300 hover:-translate-y-1.5 hover:shadow-[0_25px_45px_-20px_rgba(122,13,13,0.45)]"
                  >
                    <span
                      className="grid h-11 w-11 shrink-0 place-items-center rounded-xl text-white shadow-md transition-transform duration-300 group-hover:scale-110 group-hover:-rotate-6"
                      style={{ backgroundColor: p.color }}
                    >
                      <p.Icon size={20} />
                    </span>
                    <span className="text-right">
                      <span className="block text-sm font-black text-gray-900">{s.label || p.name}</span>
                      <span className="flex items-center gap-1 text-[11px] font-bold text-[#b68614]">
                        تابعنا <ExternalLink size={11} />
                      </span>
                    </span>
                  </a>
                );
              })}
            </div>
          </div>
        </section>
      )}

      {/* ============ CONTACT ============ */}
      {c.contact.enabled && (
        <section id="contact" className="relative overflow-hidden bg-[#faf3e7] py-16 sm:py-24">
          <div className="absolute inset-0 opacity-[0.03] [background-image:radial-gradient(circle,#7a0d0d_1.5px,transparent_1.5px)] [background-size:28px_28px]" />
          <div className="relative mx-auto max-w-7xl px-5">
            <SectionHeading kicker={c.contact.kicker} title={c.contact.title} subtitle={c.contact.subtitle} />

            <div className={`grid gap-8 ${c.contact.showForm ? "lg:grid-cols-5" : ""}`}>
              <div className={`grid gap-4 sm:grid-cols-2 ${c.contact.showForm ? "lg:col-span-2 lg:grid-cols-1" : "lg:grid-cols-4"}`}>
                {c.contact.phone && (
                  <ContactCard icon={Phone} title="اتصل بينا" value={c.contact.phone} href={`tel:${toInternationalPhone(c.contact.phone)}`} ltr />
                )}
                {c.contact.whatsapp && (
                  <ContactCard
                    icon={MessageCircle}
                    title="واتساب"
                    value={c.contact.whatsapp}
                    href={`https://wa.me/${toInternationalPhone(c.contact.whatsapp).replace("+", "")}`}
                    ltr
                    accent="#1fa855"
                  />
                )}
                {c.contact.email && (
                  <ContactCard icon={Mail} title="الإيميل" value={c.contact.email} href={`mailto:${c.contact.email}`} ltr />
                )}
                {c.contact.address && (
                  <ContactCard icon={MapPin} title="العنوان" value={c.contact.address} href={safeHref(c.contact.mapUrl)} />
                )}
                {c.contact.hours && <ContactCard icon={Clock} title="مواعيد العمل" value={c.contact.hours} />}
              </div>
              {c.contact.showForm && (
                <div className="lg:col-span-3">
                  <ContactForm c={c.contact} />
                </div>
              )}
            </div>
          </div>
        </section>
      )}

      {/* ============ FOOTER ============ */}
      <footer className="relative overflow-hidden border-t-2 border-[#b68614]/60 bg-[#1a0101] text-white/70" dir="rtl">
        <div className="h-1.5 w-full bg-gradient-to-r from-[#b68614] via-[#ffd27a] to-[#b68614]" />
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(#b68614_1.5px,transparent_1.5px)] opacity-10 [background-size:24px_24px]" />

        <div className="relative mx-auto grid max-w-7xl gap-x-12 gap-y-12 px-6 py-20 sm:grid-cols-2 lg:grid-cols-4">
          <div className="space-y-6">
            <div className="flex items-center gap-3.5">
              <div className="rounded-2xl border border-white/10 bg-white/5 p-2.5 backdrop-blur-md">
                <img src={logo} alt={c.brand.name} className="h-12 w-12 object-contain" />
              </div>
              <span className="bg-gradient-to-r from-white via-[#ffd27a] to-white bg-clip-text text-3xl font-black text-transparent">
                {c.brand.name}
              </span>
            </div>
            <p className="text-sm leading-relaxed text-white/70">{c.footer.about}</p>
            {socials.length > 0 && (
              <div className="flex flex-wrap items-center gap-3 pt-2">
                {socials.map((s) => {
                  const p = SOCIAL_PLATFORMS[s.platform] ?? SOCIAL_PLATFORMS.facebook;
                  return (
                    <a
                      key={s.id}
                      {...linkProps(safeHref(s.url))}
                      aria-label={s.label || p.name}
                      className="group/icon relative grid h-11 w-11 place-items-center overflow-hidden rounded-2xl border border-white/10 bg-white/5 text-white transition-all duration-500 hover:-translate-y-2 hover:scale-110 hover:border-[#ffd27a] hover:shadow-[0_10px_20px_rgba(182,134,20,0.4)]"
                    >
                      <div className="absolute inset-0 bg-gradient-to-tr from-[#b68614] to-[#ffd27a] opacity-0 transition-opacity duration-500 group-hover/icon:opacity-100" />
                      <p.Icon size={19} className="relative z-10" />
                    </a>
                  );
                })}
              </div>
            )}
          </div>

          <FooterColumn title={c.footer.quickLinksTitle} links={c.brand.navLinks} />
          <FooterColumn title={c.footer.companyTitle} links={c.footer.companyLinks} />

          <div className="space-y-5">
            <h5 className="flex items-center gap-2 text-base font-black tracking-wide text-white">
              <span className="h-2 w-2 rounded-full bg-[#ffd27a]" />
              {c.footer.contactTitle}
            </h5>
            <ul className="space-y-4 text-sm">
              {c.contact.phone && (
                <FooterContact icon={Phone} href={`tel:${toInternationalPhone(c.contact.phone)}`} ltr>
                  {c.contact.phone}
                </FooterContact>
              )}
              {c.contact.email && (
                <FooterContact icon={Mail} href={`mailto:${c.contact.email}`}>
                  {c.contact.email}
                </FooterContact>
              )}
              {c.contact.address && (
                <FooterContact icon={MapPin} href={safeHref(c.contact.mapUrl)}>
                  {c.contact.address}
                </FooterContact>
              )}
            </ul>
          </div>
        </div>

        <div className="relative border-t border-white/10 bg-black/40 py-6 text-center text-xs tracking-wider text-white/50">
          {c.footer.copyright}
        </div>
      </footer>
    </div>
  );
}

function ContactCard({
  icon: Icon,
  title,
  value,
  href,
  ltr,
  accent = "#7a0d0d",
}: {
  icon: typeof Phone;
  title: string;
  value: string;
  href?: string;
  ltr?: boolean;
  accent?: string;
}) {
  const body = (
    <>
      <span
        className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl text-white shadow-lg transition-transform duration-300 group-hover:scale-110 group-hover:-rotate-6"
        style={{ backgroundColor: accent }}
      >
        <Icon size={20} />
      </span>
      <span className="min-w-0 text-right">
        <span className="block text-xs font-black text-[#b68614]">{title}</span>
        <span className="mt-0.5 block break-words text-sm font-black text-gray-900 sm:text-base" dir={ltr ? "ltr" : undefined}>
          {value}
        </span>
      </span>
    </>
  );
  const cls =
    "group flex items-center gap-4 rounded-[1.5rem] bg-white p-5 shadow-[0_15px_35px_-20px_rgba(122,13,13,0.3)] ring-1 ring-black/[0.04] transition-all duration-300";
  return href ? (
    <a {...linkProps(href)} className={`${cls} hover:-translate-y-1 hover:shadow-[0_25px_45px_-20px_rgba(122,13,13,0.4)]`}>
      {body}
    </a>
  ) : (
    <div className={cls}>{body}</div>
  );
}

function FooterColumn({ title, links }: { title: string; links: { id: string; label: string; href: string }[] }) {
  if (links.length === 0) return null;
  return (
    <div className="space-y-5">
      <h5 className="flex items-center gap-2 text-base font-black tracking-wide text-white">
        <span className="h-2 w-2 rounded-full bg-[#ffd27a]" />
        {title}
      </h5>
      <ul className="space-y-3 text-sm">
        {links.map((l) => (
          <li key={l.id}>
            <a
              {...linkProps(safeHref(l.href))}
              className="inline-block font-medium text-white/70 transition-all duration-300 hover:-translate-x-2 hover:text-[#ffd27a]"
            >
              {l.label}
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}

function FooterContact({
  icon: Icon,
  href,
  ltr,
  children,
}: {
  icon: typeof Phone;
  href?: string;
  ltr?: boolean;
  children: string;
}) {
  return (
    <li className="group/item flex items-center gap-3.5">
      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-white/10 bg-white/5 text-[#ffd27a] transition-all duration-500 group-hover/item:bg-[#b68614] group-hover/item:text-white">
        <Icon size={17} />
      </span>
      {href ? (
        <a {...linkProps(href)} dir={ltr ? "ltr" : undefined} className="break-all font-medium text-white/80 transition-colors hover:text-[#ffd27a]">
          {children}
        </a>
      ) : (
        <span className="font-medium text-white/80">{children}</span>
      )}
    </li>
  );
}
