import { useEffect, useRef, useState, type FormEvent, type ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import heroFood from "../assets/egyptian-home-food.webp";
import logoIcon from "../assets/logo_icon_trim.png";
import chickenImg from "../assets/chicken.jpeg";
import kosharyImg from "../assets/koshary.jpeg";
import kronbImg from "../assets/kronb.jpeg";
import {
  Apple,
  ArrowLeft,
  ArrowUp,
  Bell,
  CheckCircle2,
  Clock,
  ExternalLink,
  Gift,
  HeartHandshake,
  Home,
  Mail,
  MapPin,
  Menu,
  MessageCircle,
  Phone,
  Play,
  Plus,
  Search,
  Send,
  ShoppingBag,
  Sparkles,
  Star,
  User,
  X,
  type LucideIcon,
} from "lucide-react";
import { useLandingContent } from "../landing/useLandingContent";
import { SOCIAL_PLATFORMS } from "../landing/icons";
import LandingIcon from "../landing/LandingIcon";
import { safeHref, toInternationalPhone } from "../landing/landingApi";
import type { DishItem, LandingContent, LinkItem } from "../landing/content";

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

const BUNDLED_DISH_IMAGES = [kosharyImg, kronbImg, chickenImg];

/** A dish's own image, or one of the bundled photos when none was uploaded. */
const dishImage = (d: DishItem, i: number) =>
  safeHref(d.image) ?? BUNDLED_DISH_IMAGES[i % BUNDLED_DISH_IMAGES.length];

/**
 * Opens off-site links in a new tab; page anchors and site paths stay in place.
 * "تواصل معنا" lives on its own page, so `#contact` (the old in-page anchor,
 * possibly still in saved content) goes to `/contact`; and on that page the
 * home-page anchors (`#app`, `#faq`…) point back to `/`.
 */
function linkProps(href: string | undefined, onContactPage = false) {
  if (href === "#contact") href = "/contact";
  else if (onContactPage && href?.startsWith("#")) href = `/${href}`;
  const external = !!href && /^https?:/i.test(href);
  return external
    ? { href, target: "_blank", rel: "noopener noreferrer" }
    : { href: href ?? "#" };
}

const arabicNumber = (n: number) => n.toLocaleString("ar-EG");

/* ------------------------------------------------------------------ */
/*  Building blocks                                                    */
/* ------------------------------------------------------------------ */

function Kicker({ children, dark = false }: { children: ReactNode; dark?: boolean }) {
  if (!children) return null;
  return (
    <span
      className={`inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-[13px] font-extrabold ${
        dark
          ? "border border-white/15 bg-white/[0.06] text-[#f3c766]"
          : "border border-[#ecd9b3] bg-[#fdf3dc] text-[#8a5c06]"
      }`}
    >
      <Sparkles size={14} />
      {children}
    </span>
  );
}

function SectionHeading({
  kicker,
  title,
  subtitle,
  dark = false,
  center = true,
}: {
  kicker: string;
  title: string;
  subtitle?: string;
  dark?: boolean;
  center?: boolean;
}) {
  return (
    <div className={`mb-12 max-w-2xl md:mb-14 ${center ? "mx-auto text-center" : "text-right"}`}>
      <Kicker dark={dark}>{kicker}</Kicker>
      <h2
        className={`mt-5 text-[2rem] font-black leading-[1.25] tracking-tight md:text-[2.75rem] ${
          dark ? "text-white" : "text-[#2b1a12]"
        }`}
      >
        {title}
      </h2>
      {subtitle && (
        <p className={`mt-4 text-base leading-[1.9] md:text-lg ${dark ? "text-white/70" : "text-[#75604f]"}`}>
          {subtitle}
        </p>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Phone mockup (used in the app-download band)                       */
/* ------------------------------------------------------------------ */

/**
 * The app's home screen, drawn in HTML — or the uploaded screenshot when the
 * admin set one. Its dish tiles come from the «ليه طباخه؟» dishes.
 */
function PhoneMockup({ c }: { c: LandingContent }) {
  const screenshot = safeHref(c.app.screenshot);
  const dishes = c.why.dishes.slice(0, 4);
  const logo = safeHref(c.brand.logo) ?? logoIcon;

  return (
    <div className="relative mx-auto w-fit">
      <div className="pointer-events-none absolute -inset-10 rounded-full bg-[#e0a52e]/25 blur-3xl" aria-hidden />
      <div className="relative h-[560px] w-[280px] rounded-[2.8rem] bg-[#140b09] p-3 shadow-[0_60px_100px_-30px_rgba(0,0,0,0.7)] ring-1 ring-white/10">
        <div className="relative h-full w-full overflow-hidden rounded-[2.2rem] bg-[#fbf6ee]">
          <div className="absolute left-1/2 top-2.5 z-30 h-6 w-24 -translate-x-1/2 rounded-full bg-black" />
          {screenshot ? (
            <img src={screenshot} alt={c.brand.name} className="h-full w-full object-cover" />
          ) : (
            <>
              <div className="bg-[#7a0d0d] px-4 pb-5 pt-12 text-white">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <img src={logo} alt="" className="h-7 w-7 object-contain" />
                    <span className="text-base font-black">{c.brand.name}</span>
                  </div>
                  <Bell size={16} className="text-white/80" />
                </div>
                <div className="mt-3 flex items-center gap-2 rounded-xl bg-white/15 px-3 py-2 text-[11px] text-white/80">
                  <Search size={13} /> دوّر على أكلة أو طباخة…
                </div>
              </div>

              <div className="flex items-center justify-between px-4 pb-2 pt-4">
                <span className="text-[12px] font-black text-[#2b1a12]">قريب منك</span>
                <span className="text-[10px] font-bold text-[#b0790f]">الكل</span>
              </div>
              <div className="grid grid-cols-2 gap-2.5 px-3">
                {dishes.map((d, i) => (
                  <div key={d.id} className="rounded-2xl border border-[#eadfcd] bg-white p-1.5">
                    <div className="h-16 overflow-hidden rounded-xl">
                      <img src={dishImage(d, i)} alt="" className="h-full w-full object-cover" />
                    </div>
                    <p className="mt-1.5 truncate px-0.5 text-[11px] font-black text-[#2b1a12]">{d.name}</p>
                    <div className="flex items-center justify-between px-0.5 pb-0.5">
                      <span className="truncate text-[9px] font-bold text-[#75604f]">{d.tag || d.price}</span>
                      <span className="grid h-5 w-5 place-items-center rounded-full bg-[#7a0d0d] text-white">
                        <Plus size={11} />
                      </span>
                    </div>
                  </div>
                ))}
              </div>

              <div className="mx-3 mt-3 flex items-center gap-2 rounded-xl bg-[#e0a52e]/15 px-3 py-2 text-[10px] font-black text-[#7a0d0d]">
                <Gift size={13} className="text-[#b0790f]" /> نقاط مع كل أوردر
              </div>

              <div className="absolute inset-x-0 bottom-0 flex items-center justify-around border-t border-[#eadfcd] bg-white px-6 py-3">
                <Home size={19} className="text-[#7a0d0d]" />
                <Search size={19} className="text-[#b9a48a]" />
                <ShoppingBag size={19} className="text-[#b9a48a]" />
                <User size={19} className="text-[#b9a48a]" />
              </div>
            </>
          )}
        </div>
      </div>

      <div className="lp-float-soft absolute -left-12 bottom-24 hidden rounded-2xl bg-white px-4 py-3 shadow-[0_20px_40px_-15px_rgba(0,0,0,0.45)] sm:block">
        <div className="flex items-center gap-2.5">
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-green-50 text-green-600">
            <CheckCircle2 size={18} />
          </span>
          <span>
            <span className="block text-sm font-black text-[#2b1a12]">تم تأكيد طلبك</span>
            <span className="block text-[11px] font-bold text-[#75604f]">تابعه من التطبيق</span>
          </span>
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
      <Icon size={26} className={kind === "google" ? "fill-current" : ""} />
      <span className="text-right leading-tight">
        <span className="block text-[10px] font-bold opacity-70">{caption}</span>
        <span className="block text-base font-black" dir="ltr">
          {label}
        </span>
      </span>
    </>
  );
  const cls = "flex min-w-[11rem] items-center gap-3 rounded-2xl px-5 py-3.5 transition-all duration-300";
  return href ? (
    <a
      {...linkProps(href)}
      className={`${cls} bg-white text-[#2b1a12] shadow-[0_14px_30px_-14px_rgba(0,0,0,0.6)] hover:-translate-y-1 hover:bg-[#f3c766]`}
    >
      {body}
    </a>
  ) : (
    <span className={`${cls} cursor-default border border-dashed border-white/30 text-white/70`} aria-disabled="true">
      {body}
    </span>
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
    "w-full rounded-2xl border border-[#eadfcd] bg-[#fbf6ee] px-4 py-3.5 text-sm font-medium text-[#2b1a12] outline-none transition placeholder:text-[#b9a48a] focus:border-[#7a0d0d] focus:bg-white focus:ring-4 focus:ring-[#7a0d0d]/10";

  return (
    <form
      onSubmit={viaWhatsApp}
      className="rounded-[2rem] border border-[#eadfcd] bg-white p-6 shadow-[0_30px_60px_-40px_rgba(43,26,18,0.45)] sm:p-9"
      noValidate
    >
      <h3 className="mb-6 text-2xl font-black text-[#2b1a12]">{c.formTitle}</h3>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block">
          <span className="mb-1.5 block text-xs font-extrabold text-[#75604f]">الاسم</span>
          <input className={field} value={name} onChange={(e) => setName(e.target.value)} placeholder="اسمك" autoComplete="name" />
        </label>
        <label className="block">
          <span className="mb-1.5 block text-xs font-extrabold text-[#75604f]">رقم الموبايل (اختياري)</span>
          <input className={field} value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="01xxxxxxxxx" dir="ltr" inputMode="tel" autoComplete="tel" />
        </label>
      </div>
      <label className="mt-4 block">
        <span className="mb-1.5 block text-xs font-extrabold text-[#75604f]">رسالتك</span>
        <textarea className={`${field} min-h-[150px] resize-y`} value={message} onChange={(e) => setMessage(e.target.value)} placeholder="اكتب رسالتك هنا…" />
      </label>
      <p className="mt-2 min-h-[1.25rem] text-xs font-bold text-red-600" aria-live="polite">
        {error}
      </p>
      <div className="mt-2 flex flex-col gap-3 sm:flex-row">
        {(c.whatsapp || c.phone) && (
          <button
            type="submit"
            className="inline-flex flex-1 items-center justify-center gap-2 whitespace-nowrap rounded-2xl bg-[#1fa855] px-6 py-4 text-sm font-black text-white transition hover:-translate-y-0.5 hover:brightness-110"
          >
            <MessageCircle size={18} /> ابعت على واتساب
          </button>
        )}
        {c.email && (
          <button
            type="button"
            onClick={viaEmail}
            className="inline-flex flex-1 items-center justify-center gap-2 whitespace-nowrap rounded-2xl bg-[#7a0d0d] px-6 py-4 text-sm font-black text-white transition hover:-translate-y-0.5 hover:bg-[#5a0909]"
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

export default function LandingPage({ view = "home" }: { view?: "home" | "contact" }) {
  const { content: c, ready } = useLandingContent();
  const isContact = view === "contact";
  const lp = (href: string | undefined) => linkProps(href, isContact);

  // The page renders only once its content is in, so the browser's own jump
  // to a `/#app`-style anchor (e.g. a link from the contact page) happens
  // before the target exists — do it here instead.
  useEffect(() => {
    if (!ready) return;
    const id = decodeURIComponent(window.location.hash.slice(1));
    if (id) document.getElementById(id)?.scrollIntoView();
  }, [ready]);

  // The header is transparent over the dark hero and turns solid once scrolled.
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Highlights the nav pill of the section in view (home page only).
  const [active, setActive] = useState("home");
  const navLinks = c.brand.navLinks;
  useEffect(() => {
    if (!ready || isContact || typeof IntersectionObserver === "undefined") return;
    const sections = navLinks
      .map((l) => (l.href?.startsWith("#") ? document.getElementById(l.href.slice(1)) : null))
      .filter((el): el is HTMLElement => !!el);
    const io = new IntersectionObserver(
      (entries) => entries.forEach((e) => e.isIntersecting && setActive(e.target.id)),
      { rootMargin: "-45% 0px -50% 0px" },
    );
    sections.forEach((s) => io.observe(s));
    return () => io.disconnect();
  }, [ready, isContact, navLinks]);

  // The mobile menu covers the page, so the page behind it must not scroll.
  const [menuOpen, setMenuOpen] = useState(false);
  useEffect(() => {
    document.body.style.overflow = menuOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [menuOpen]);

  // The admin's hidden way in: five taps on the header logo within two
  // seconds opens /login. There is no visible sign-in button for visitors.
  const navigate = useNavigate();
  const logoTaps = useRef<number[]>([]);
  const onLogoTap = () => {
    const now = Date.now();
    logoTaps.current = [...logoTaps.current.filter((t) => now - t < 2000), now];
    if (logoTaps.current.length >= 5) {
      logoTaps.current = [];
      navigate("/login");
    }
  };

  const [tab, setTab] = useState<"client" | "cook">("client");
  const steps = tab === "client" ? c.how.clientSteps : c.how.cookSteps;
  const logo = safeHref(c.brand.logo) ?? logoIcon;
  const heroImage = safeHref(c.hero.image) ?? heroFood;
  const socials = c.social.links.filter((s) => safeHref(s.url));
  const heroDishes = c.why.dishes.slice(0, 2);
  // The gold ticker under the hero repeats the page's own words.
  const tickerWords = [
    ...c.why.dishes.map((d) => d.name),
    ...c.features.cards.map((f) => f.title),
    ...c.features.stats.map((s) => s.label),
  ].filter(Boolean);

  if (!ready) {
    return (
      <div className="grid min-h-screen place-items-center bg-[#1c110d]" role="status" aria-live="polite">
        <img src={logoIcon} alt="" className="h-16 w-16 animate-pulse object-contain" />
        <span className="sr-only">جارٍ التحميل…</span>
      </div>
    );
  }

  return (
    <div dir="rtl" className="lp-root min-h-screen overflow-x-hidden bg-[#fbf6ee] text-[#2b1a12]">
      {/* ============ HEADER ============ */}
      <header
        className={`sticky top-0 z-50 transition-all duration-300 ${
          scrolled || menuOpen
            ? "bg-[#1c110d]/95 shadow-[0_12px_40px_-20px_rgba(0,0,0,0.7)] backdrop-blur-xl"
            : "bg-transparent"
        }`}
      >
        <div className="mx-auto grid h-20 max-w-7xl grid-cols-[1fr_auto] items-center gap-4 px-5 lg:grid-cols-[1fr_auto_1fr]">
          <a href={isContact ? "/" : "#home"} onClick={onLogoTap} className="flex w-fit shrink-0 items-center gap-3">
            <span className="grid h-11 w-11 place-items-center rounded-2xl bg-white shadow-[0_8px_20px_-8px_rgba(0,0,0,0.5)]">
              <img src={logo} alt={c.brand.name} className="h-8 w-8 object-contain" />
            </span>
            <span className="text-2xl font-black text-white">{c.brand.name}</span>
          </a>

          <nav className="hidden items-center gap-1 rounded-full border border-white/10 bg-white/[0.06] p-1.5 backdrop-blur-md lg:flex">
            {navLinks.map((l) => {
              const current = isContact ? l.href === "/contact" || l.href === "#contact" : l.href === `#${active}`;
              return (
                <a
                  key={l.id}
                  {...lp(safeHref(l.href))}
                  aria-current={current ? "true" : undefined}
                  className={`rounded-full px-4 py-2 text-[14px] font-bold transition-all ${
                    current
                      ? "bg-[#e0a52e] text-[#1c110d] shadow-[0_8px_18px_-8px_rgba(224,165,46,0.8)]"
                      : "text-white/75 hover:bg-white/10 hover:text-white"
                  }`}
                >
                  {l.label}
                </a>
              );
            })}
          </nav>

          <div className="flex items-center justify-end gap-2">
            {socials.slice(0, 3).map((s) => {
              const p = SOCIAL_PLATFORMS[s.platform] ?? SOCIAL_PLATFORMS.facebook;
              return (
                <a
                  key={s.id}
                  {...lp(safeHref(s.url))}
                  aria-label={s.label || p.name}
                  className="hidden h-10 w-10 place-items-center rounded-full border border-white/15 text-white/80 transition hover:border-[#e0a52e] hover:bg-[#e0a52e] hover:text-[#1c110d] lg:grid"
                >
                  <p.Icon size={17} />
                </a>
              );
            })}
            <button
              className="grid h-11 w-11 place-items-center rounded-2xl border border-white/15 bg-white/10 text-white lg:hidden"
              onClick={() => setMenuOpen((v) => !v)}
              aria-label={menuOpen ? "إغلاق القائمة" : "فتح القائمة"}
              aria-expanded={menuOpen}
            >
              {menuOpen ? <X size={22} /> : <Menu size={22} />}
            </button>
          </div>
        </div>

        {menuOpen && (
          <div className="fixed inset-x-0 bottom-0 top-20 overflow-y-auto bg-[#1c110d] px-5 pb-10 pt-4 duration-200 animate-in fade-in slide-in-from-top-2 lg:hidden">
            <nav className="flex flex-col gap-2">
              {navLinks.map((l, i) => (
                <a
                  key={l.id}
                  {...lp(safeHref(l.href))}
                  onClick={() => setMenuOpen(false)}
                  className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/[0.04] px-5 py-4 text-lg font-black text-white transition hover:bg-white/10"
                >
                  <span className="flex items-center gap-4">
                    <span className="text-sm font-black text-[#e0a52e]">{arabicNumber(i + 1)}</span>
                    {l.label}
                  </span>
                  <ArrowLeft size={18} className="text-[#e0a52e]" />
                </a>
              ))}
            </nav>
            {socials.length > 0 && (
              <div className="mt-8 flex flex-wrap justify-center gap-3">
                {socials.map((s) => {
                  const p = SOCIAL_PLATFORMS[s.platform] ?? SOCIAL_PLATFORMS.facebook;
                  return (
                    <a
                      key={s.id}
                      {...lp(safeHref(s.url))}
                      aria-label={s.label || p.name}
                      className="grid h-12 w-12 place-items-center rounded-2xl border border-white/15 text-white"
                    >
                      <p.Icon size={19} />
                    </a>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </header>

      {!isContact && (
        <>
          {/* ============ HERO ============ */}
          <section id="home" className="relative -mt-20 overflow-hidden bg-[#1c110d] pt-20 text-white">
            <div
              className="lp-orb pointer-events-none absolute -right-40 -top-40 h-[42rem] w-[42rem] rounded-full bg-[#7a0d0d]/70 blur-[140px]"
              aria-hidden
            />
            <div
              className="lp-orb lp-glow pointer-events-none absolute -bottom-40 -left-32 h-[32rem] w-[32rem] rounded-full bg-[#e0a52e]/25 blur-[130px]"
              aria-hidden
            />
            <div
              className="pointer-events-none absolute inset-0 opacity-[0.07] [background-image:radial-gradient(#ffffff_1px,transparent_1px)] [background-size:26px_26px]"
              aria-hidden
            />

            {c.hero.enabled ? (
              <div className="relative mx-auto grid max-w-7xl items-center gap-16 px-5 pb-24 pt-10 lg:grid-cols-12 lg:pb-32 lg:pt-16">
                <div className="text-center lg:col-span-7 lg:text-right">
                  {c.hero.badge && (
                    <span className="inline-flex items-center gap-2.5 rounded-full border border-white/15 bg-white/[0.07] px-4 py-2 text-xs font-extrabold text-[#f3c766] backdrop-blur-md sm:text-sm">
                      <span className="relative flex h-2 w-2">
                        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#1fa855] opacity-70 motion-reduce:hidden" />
                        <span className="relative inline-flex h-2 w-2 rounded-full bg-[#1fa855]" />
                      </span>
                      {c.hero.badge}
                    </span>
                  )}
                  <h1 className="mt-8 text-[2.9rem] font-black leading-[1.18] tracking-tight sm:text-[4rem] lg:text-[5rem]">
                    <span className="block text-white">{c.hero.titleLine1}</span>
                    <span className="block bg-gradient-to-l from-[#f7d58b] via-[#e0a52e] to-[#f3c766] bg-clip-text pb-2 text-transparent">
                      {c.hero.titleHighlight}
                    </span>
                  </h1>
                  <p className="mx-auto mt-6 max-w-xl text-lg leading-[1.95] text-white/70 lg:mx-0">{c.hero.description}</p>

                  <div className="mt-10 flex flex-wrap justify-center gap-3 lg:justify-start">
                    {c.hero.primaryCta.label && (
                      <a
                        {...lp(safeHref(c.hero.primaryCta.href))}
                        className="group inline-flex items-center gap-2.5 rounded-full bg-[#e0a52e] px-8 py-4 text-base font-black text-[#1c110d] shadow-[0_18px_40px_-14px_rgba(224,165,46,0.8)] transition-all hover:-translate-y-0.5 hover:bg-[#f3c766]"
                      >
                        {c.hero.primaryCta.label}
                        <ArrowLeft size={18} className="transition-transform group-hover:-translate-x-1" />
                      </a>
                    )}
                    {c.hero.secondaryCta.label && (
                      <a
                        {...lp(safeHref(c.hero.secondaryCta.href))}
                        className="inline-flex items-center rounded-full border border-white/20 bg-white/[0.06] px-8 py-4 text-base font-black text-white backdrop-blur-md transition-all hover:-translate-y-0.5 hover:border-white/40 hover:bg-white/10"
                      >
                        {c.hero.secondaryCta.label}
                      </a>
                    )}
                  </div>

                  {c.hero.stats.length > 0 && (
                    <ul className="mx-auto mt-14 grid max-w-xl grid-cols-3 gap-3 lg:mx-0">
                      {c.hero.stats.map((s) => (
                        <li
                          key={s.id}
                          className="rounded-2xl border border-white/10 bg-white/[0.05] p-4 text-center backdrop-blur-md lg:text-right"
                        >
                          <LandingIcon name={s.icon} size={18} className="mx-auto text-[#e0a52e] lg:mx-0" />
                          <span className="mt-3 block whitespace-nowrap text-xl font-black text-white sm:text-[1.7rem]">
                            {s.value}
                          </span>
                          <span className="mt-1 block text-xs font-bold leading-relaxed text-white/55">{s.label}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                <div className="relative mx-auto w-full max-w-[24rem] lg:col-span-5 lg:max-w-none">
                  <div className="absolute -inset-3 rounded-[3rem] border border-[#e0a52e]/30 sm:-inset-5" aria-hidden />
                  <div
                    className="absolute inset-0 rotate-[-4deg] rounded-[2.75rem] bg-gradient-to-br from-[#e0a52e] to-[#7a0d0d] opacity-80"
                    aria-hidden
                  />
                  <div className="relative overflow-hidden rounded-[2.75rem] border-[6px] border-[#2b1a12] bg-[#2b1a12] shadow-[0_50px_100px_-30px_rgba(0,0,0,0.8)]">
                    <img src={heroImage} alt={c.hero.imageAlt} className="aspect-[4/5] w-full object-cover object-top" />
                    <div
                      className="pointer-events-none absolute inset-x-0 bottom-0 h-2/5 bg-gradient-to-t from-[#1c110d]/80 to-transparent"
                      aria-hidden
                    />
                  </div>

                  {heroDishes.map((d, i) => (
                    <div
                      key={d.id}
                      className={`absolute hidden items-center gap-3 rounded-2xl bg-white p-2.5 pl-4 text-[#2b1a12] shadow-[0_24px_50px_-18px_rgba(0,0,0,0.6)] sm:flex ${
                        i === 0 ? "lp-float-soft -left-6 top-[12%] xl:-left-14" : "lp-float-delay -right-6 top-[46%] xl:-right-12"
                      }`}
                    >
                      <img src={dishImage(d, i)} alt="" className="h-12 w-12 rounded-xl object-cover" />
                      <span>
                        <span className="block text-sm font-black">{d.name}</span>
                        <span className="mt-0.5 flex items-center gap-2 text-[11px] font-bold text-[#75604f]">
                          {d.price && <span className="text-[#7a0d0d]">{d.price}</span>}
                          {d.rate && (
                            <span className="inline-flex items-center gap-0.5">
                              <Star size={11} className="fill-[#e0a52e] text-[#e0a52e]" /> {d.rate}
                            </span>
                          )}
                        </span>
                      </span>
                    </div>
                  ))}

                  {c.hero.floatingBadge && (
                    <div className="absolute inset-x-0 -bottom-7 flex justify-center">
                      <div className="flex items-center gap-2.5 whitespace-nowrap rounded-full bg-white px-5 py-3.5 text-xs font-black text-[#2b1a12] shadow-[0_20px_40px_-15px_rgba(0,0,0,0.6)] sm:text-sm">
                        <span className="grid h-7 w-7 place-items-center rounded-full bg-[#7a0d0d] text-white">
                          <Clock size={14} />
                        </span>
                        {c.hero.floatingBadge}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="h-16" />
            )}
          </section>

          {/* ============ TICKER ============ */}
          {tickerWords.length > 0 && (
            <div className="relative overflow-hidden bg-[#e0a52e] py-4 text-[#1c110d]" aria-hidden>
              <div className="lp-marquee flex w-max">
                {[0, 1].map((copy) => (
                  <div key={copy} className="flex shrink-0 items-center gap-8 pe-8">
                    {[...tickerWords, ...tickerWords].map((w, i) => (
                      <span key={`${copy}-${i}`} className="flex items-center gap-8 whitespace-nowrap text-lg font-black">
                        {w}
                        <Sparkles size={18} className="text-[#7a0d0d]" />
                      </span>
                    ))}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ============ WHY ============ */}
          {c.why.enabled && (
            <section id="why" className="relative scroll-mt-20 overflow-hidden">
              <div
                className="pointer-events-none absolute inset-0 opacity-50 [background-image:radial-gradient(#e7d8bd_1px,transparent_1px)] [background-size:24px_24px]"
                aria-hidden
              />
              <div className="relative mx-auto grid max-w-7xl gap-14 px-5 py-24 md:py-32 lg:grid-cols-12 lg:items-center">
                <div className="text-center lg:col-span-5 lg:text-right">
                  <Kicker>{c.why.dishesBadge || c.brand.name}</Kicker>
                  <h2 className="mt-5 text-[2rem] font-black leading-[1.25] tracking-tight md:text-[2.75rem]">{c.why.title}</h2>
                  <p className="mx-auto mt-5 max-w-md text-lg leading-[1.9] text-[#75604f] lg:mx-0">{c.why.description}</p>
                  {c.why.note && (
                    <div className="mx-auto mt-8 flex max-w-md items-start gap-4 rounded-3xl bg-[#2b1a12] p-5 text-right text-white shadow-[0_24px_50px_-30px_rgba(43,26,18,0.8)] lg:mx-0">
                      <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-[#e0a52e] text-[#2b1a12]">
                        <HeartHandshake size={20} />
                      </span>
                      <span className="text-[15px] font-bold leading-relaxed text-white/85">{c.why.note}</span>
                    </div>
                  )}
                </div>

                {c.why.dishes.length > 0 && (
                  <div className="lg:col-span-7">
                    <div className="grid grid-cols-3 gap-3 sm:gap-5">
                      {c.why.dishes.map((d, i) => (
                        <figure
                          key={d.id}
                          className={`group relative overflow-hidden rounded-[1.75rem] bg-[#2b1a12] shadow-[0_30px_60px_-35px_rgba(43,26,18,0.8)] ${
                            i % 2 === 1 ? "lg:translate-y-12" : ""
                          }`}
                        >
                          <img
                            src={dishImage(d, i)}
                            alt={d.name}
                            className="aspect-[3/4.4] w-full object-cover transition-transform duration-700 group-hover:scale-110"
                          />
                          <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#1c110d]/95 via-[#1c110d]/20 to-transparent" />
                          {d.rate && (
                            <span className="absolute left-2.5 top-2.5 inline-flex items-center gap-1 rounded-full bg-white/95 px-2 py-1 text-[10px] font-black text-[#2b1a12] sm:left-3 sm:top-3 sm:text-xs">
                              <Star size={11} className="fill-[#e0a52e] text-[#e0a52e]" /> {d.rate}
                            </span>
                          )}
                          <figcaption className="absolute inset-x-0 bottom-0 p-3 text-right text-white sm:p-5">
                            <span className="block truncate text-sm font-black sm:text-lg">{d.name}</span>
                            <span className="mt-1 flex flex-wrap items-center gap-1.5">
                              {d.price && (
                                <span className="rounded-full bg-[#e0a52e] px-2 py-0.5 text-[10px] font-black text-[#1c110d] sm:text-xs">
                                  {d.price}
                                </span>
                              )}
                              {d.tag && (
                                <span className="hidden truncate text-[11px] font-bold text-white/70 sm:inline">{d.tag}</span>
                              )}
                            </span>
                          </figcaption>
                        </figure>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </section>
          )}

          {/* ============ FEATURES ============ */}
          {c.features.enabled && (c.features.cards.length > 0 || c.features.stats.length > 0) && (
            <section className="mx-auto max-w-7xl px-5 pb-24 md:pb-28">
              {c.features.cards.length > 0 && (
                <div className="grid gap-5 md:grid-cols-2">
                  {c.features.cards.map((f, i) => {
                    const dark = i % 2 === 0;
                    return (
                      <div
                        key={f.id}
                        className={`group relative flex flex-col justify-between overflow-hidden rounded-[2.25rem] p-8 transition-all duration-300 hover:-translate-y-1 sm:p-11 ${
                          dark
                            ? "bg-gradient-to-br from-[#8f1414] via-[#7a0d0d] to-[#4f0808] text-white shadow-[0_40px_70px_-40px_rgba(122,13,13,0.9)]"
                            : "border border-[#eadfcd] bg-white shadow-[0_30px_60px_-45px_rgba(43,26,18,0.6)]"
                        }`}
                      >
                        <div
                          className={`pointer-events-none absolute -bottom-20 -left-20 h-64 w-64 rounded-full border-[2.5rem] transition-transform duration-700 group-hover:scale-110 ${
                            dark ? "border-white/[0.06]" : "border-[#e0a52e]/[0.12]"
                          }`}
                          aria-hidden
                        />
                        <div className="relative">
                          <span
                            className={`inline-grid h-16 w-16 place-items-center rounded-[1.25rem] ${
                              dark ? "bg-white/10 text-[#f3c766]" : "bg-[#fdf3dc] text-[#b0790f]"
                            }`}
                          >
                            <LandingIcon name={f.icon} size={28} />
                          </span>
                          <h3 className={`mt-7 text-2xl font-black sm:text-[2rem] ${dark ? "text-white" : "text-[#2b1a12]"}`}>
                            {f.title}
                          </h3>
                          <p className={`mt-3 max-w-md text-base leading-[1.95] ${dark ? "text-white/75" : "text-[#75604f]"}`}>
                            {f.text}
                          </p>
                        </div>
                        {f.ctaLabel && (
                          <a
                            {...lp(safeHref(f.ctaHref))}
                            className={`relative mt-9 inline-flex w-fit items-center gap-2 rounded-full px-6 py-3 text-sm font-black transition ${
                              dark ? "bg-white text-[#7a0d0d] hover:bg-[#f3c766]" : "bg-[#2b1a12] text-white hover:bg-[#7a0d0d]"
                            }`}
                          >
                            {f.ctaLabel} <ArrowLeft size={16} />
                          </a>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}

              {c.features.stats.length > 0 && (
                <div className="relative mt-5 overflow-hidden rounded-[2.25rem] bg-[#1c110d] p-2 text-white">
                  <div className="pointer-events-none absolute -right-20 -top-20 h-60 w-60 rounded-full bg-[#7a0d0d]/60 blur-3xl" aria-hidden />
                  <div className="relative grid grid-cols-2 md:grid-cols-4">
                    {c.features.stats.map((s, i) => (
                      <div
                        key={s.id}
                        className={`p-6 text-center sm:p-8 ${i % 2 === 1 ? "border-r border-white/10" : ""} ${
                          i > 0 ? "md:border-r md:border-white/10" : ""
                        } ${i > 1 ? "border-t border-white/10 md:border-t-0" : ""}`}
                      >
                        <span className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-[#e0a52e]/15 text-[#f3c766]">
                          <LandingIcon name={s.icon} size={22} />
                        </span>
                        <span className="mt-4 block text-xl font-black sm:text-2xl">{s.value}</span>
                        <span className="mt-1 block text-xs font-bold text-white/55 sm:text-sm">{s.label}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </section>
          )}

          {/* ============ HOW IT WORKS ============ */}
          {c.how.enabled && (
            <section id="how" className="relative scroll-mt-20 overflow-hidden bg-white py-24 md:py-32">
              <div className="mx-auto max-w-7xl px-5">
                <SectionHeading kicker={c.how.kicker} title={c.how.title} />

                <div className="mb-14 flex justify-center">
                  <div
                    className="inline-flex flex-wrap justify-center gap-1 rounded-[1.5rem] border border-[#eadfcd] bg-[#fbf6ee] p-1.5"
                    role="group"
                  >
                    {(["client", "cook"] as const).map((t) => (
                      <button
                        key={t}
                        onClick={() => setTab(t)}
                        aria-pressed={tab === t}
                        className={`rounded-[1.1rem] px-5 py-3 text-sm font-black transition-all sm:px-8 ${
                          tab === t
                            ? "bg-[#2b1a12] text-white shadow-[0_10px_22px_-10px_rgba(43,26,18,0.8)]"
                            : "text-[#75604f] hover:text-[#2b1a12]"
                        }`}
                      >
                        {t === "client" ? c.how.clientTab : c.how.cookTab}
                      </button>
                    ))}
                  </div>
                </div>

                <ol
                  key={tab}
                  className="grid gap-5 duration-500 animate-in fade-in slide-in-from-bottom-2 sm:grid-cols-2 lg:grid-cols-4"
                >
                  {steps.map((s, i) => (
                    <li
                      key={s.id}
                      className="group relative overflow-hidden rounded-[2rem] border border-[#eadfcd] bg-[#fbf6ee] p-7 transition-all duration-300 hover:-translate-y-1.5 hover:border-transparent hover:bg-[#2b1a12] hover:shadow-[0_30px_60px_-30px_rgba(43,26,18,0.8)]"
                    >
                      <span
                        className="pointer-events-none absolute -left-2 -top-6 text-[7rem] font-black leading-none text-[#2b1a12]/[0.05] transition-colors group-hover:text-white/[0.07]"
                        aria-hidden
                      >
                        {arabicNumber(i + 1)}
                      </span>
                      <div className="relative flex items-center justify-between">
                        <span className="grid h-14 w-14 place-items-center rounded-2xl bg-[#7a0d0d] text-white shadow-[0_12px_24px_-10px_rgba(122,13,13,0.7)] transition-colors group-hover:bg-[#e0a52e] group-hover:text-[#2b1a12]">
                          <LandingIcon name={s.icon} size={24} />
                        </span>
                        <span className="rounded-full bg-white px-3 py-1 text-xs font-black text-[#b0790f] transition-colors group-hover:bg-white/10 group-hover:text-[#f3c766]">
                          خطوة {arabicNumber(i + 1)}
                        </span>
                      </div>
                      <h3 className="relative mt-7 text-xl font-black text-[#2b1a12] transition-colors group-hover:text-white">
                        {s.title}
                      </h3>
                      <p className="relative mt-2 text-sm leading-[1.9] text-[#75604f] transition-colors group-hover:text-white/70">
                        {s.text}
                      </p>
                    </li>
                  ))}
                </ol>
              </div>
            </section>
          )}

          {/* ============ JOIN AS A COOK ============ */}
          {c.joinCook.enabled && (
            <section className="px-3 py-3 sm:px-5 sm:py-5">
              <div className="relative mx-auto grid max-w-[90rem] overflow-hidden rounded-[2.5rem] bg-[#1c110d] text-white lg:grid-cols-2">
                <div className="pointer-events-none absolute -left-32 -top-32 h-96 w-96 rounded-full bg-[#7a0d0d]/60 blur-[120px]" aria-hidden />
                <div className="relative order-2 p-8 sm:p-12 lg:order-1 lg:p-16 xl:p-20">
                  <SectionHeading
                    kicker={c.joinCook.kicker}
                    title={c.joinCook.title}
                    subtitle={c.joinCook.subtitle}
                    dark
                    center={false}
                  />
                  <ol className="relative space-y-3">
                    {c.joinCook.steps.map((s, i) => (
                      <li
                        key={s.id}
                        className="flex gap-4 rounded-3xl border border-white/10 bg-white/[0.04] p-5 transition hover:border-[#e0a52e]/40 hover:bg-white/[0.07]"
                      >
                        <span className="relative grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-[#e0a52e] text-[#1c110d]">
                          <LandingIcon name={s.icon} size={22} />
                          <span className="absolute -left-1.5 -top-1.5 grid h-5 w-5 place-items-center rounded-full bg-white text-[10px] font-black text-[#7a0d0d]">
                            {arabicNumber(i + 1)}
                          </span>
                        </span>
                        <span>
                          {s.badge && <span className="block text-xs font-extrabold text-[#f3c766]">{s.badge}</span>}
                          <span className="mt-0.5 block text-lg font-black">{s.title}</span>
                          <span className="mt-1 block text-sm leading-relaxed text-white/65">{s.text}</span>
                        </span>
                      </li>
                    ))}
                  </ol>
                  {c.joinCook.ctaLabel && (
                    <a
                      {...lp(safeHref(c.joinCook.ctaHref))}
                      className="mt-10 inline-flex items-center gap-2 rounded-full bg-[#e0a52e] px-8 py-4 text-sm font-black text-[#1c110d] shadow-[0_18px_40px_-14px_rgba(224,165,46,0.7)] transition-all hover:-translate-y-0.5 hover:bg-[#f3c766]"
                    >
                      {c.joinCook.ctaLabel} <ArrowLeft size={16} />
                    </a>
                  )}
                </div>
                <div className="relative order-1 min-h-[280px] lg:order-2 lg:min-h-[560px]">
                  <img src={kronbImg} alt="" className="absolute inset-0 h-full w-full object-cover" />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#1c110d] via-[#1c110d]/20 to-transparent lg:bg-gradient-to-l lg:from-[#1c110d] lg:via-[#1c110d]/10" />
                </div>
              </div>
            </section>
          )}

          {/* ============ APP DOWNLOAD ============ */}
          {c.app.enabled && (
            <section id="app" className="relative scroll-mt-20 px-3 py-3 sm:px-5 sm:py-5">
              <div className="relative mx-auto max-w-[90rem] overflow-hidden rounded-[2.5rem] bg-gradient-to-br from-[#8f1414] via-[#7a0d0d] to-[#3d0606] text-white">
                <div
                  className="pointer-events-none absolute inset-0 opacity-[0.1] [background-image:radial-gradient(#ffffff_1px,transparent_1px)] [background-size:22px_22px]"
                  aria-hidden
                />
                <div
                  className="pointer-events-none absolute -left-40 top-1/2 h-[32rem] w-[32rem] -translate-y-1/2 rounded-full border-[3.5rem] border-white/[0.05]"
                  aria-hidden
                />
                <div className="relative mx-auto grid max-w-7xl items-center gap-14 px-6 py-20 sm:px-10 md:grid-cols-2 md:py-24">
                  <div className="text-center md:text-right">
                    {c.app.badge && <Kicker dark>{c.app.badge}</Kicker>}
                    <h2 className="mt-5 text-[2rem] font-black leading-[1.25] tracking-tight md:text-[3rem]">
                      {c.app.titleStart} <span className="text-[#f3c766]">{c.app.titleHighlight}</span>
                      {c.app.titleEnd}
                    </h2>
                    <p className="mx-auto mt-5 max-w-lg text-lg leading-[1.9] text-white/75 md:mx-0">{c.app.description}</p>
                    <div className="mt-9 flex flex-wrap justify-center gap-3 md:justify-start">
                      <StoreButton url={c.app.googlePlayUrl} label={c.app.googlePlayLabel} kind="google" />
                      <StoreButton url={c.app.appStoreUrl} label={c.app.appStoreLabel} kind="apple" />
                    </div>
                    {c.app.stats.length > 0 && (
                      <div className="mt-10 flex flex-wrap justify-center gap-3 md:justify-start">
                        {c.app.stats.map((s) => (
                          <div
                            key={s.id}
                            className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.07] py-2.5 pl-5 pr-2.5"
                          >
                            <span className="grid h-10 w-10 place-items-center rounded-xl bg-[#e0a52e] text-[#1c110d]">
                              <LandingIcon name={s.icon} size={18} />
                            </span>
                            <span className="text-right">
                              <span className="block text-sm font-black">{s.value}</span>
                              <span className="block text-xs font-bold text-white/60">{s.label}</span>
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="flex justify-center">
                    <div className="origin-top scale-[0.9] sm:scale-100">
                      <PhoneMockup c={c} />
                    </div>
                  </div>
                </div>
              </div>
            </section>
          )}

          {/* ============ FAQ ============ */}
          {c.faq.enabled && (
            <section id="faq" className="mx-auto max-w-7xl scroll-mt-20 px-5 py-24 md:py-32">
              <div className="grid gap-12 lg:grid-cols-12">
                <div className="lg:col-span-5">
                  <div className="lg:sticky lg:top-28">
                    <div className="text-center lg:text-right">
                      <Kicker>{c.faq.badge}</Kicker>
                      <h2 className="mt-5 text-[2rem] font-black leading-[1.3] tracking-tight md:text-[2.6rem]">
                        {c.faq.title} <span className="block text-[#7a0d0d]">{c.faq.titleHighlight}</span>
                      </h2>
                      {c.faq.subtitle && <p className="mt-4 leading-[1.9] text-[#75604f]">{c.faq.subtitle}</p>}
                    </div>
                    {c.faq.supportTitle && (
                      <div className="relative mt-8 overflow-hidden rounded-[2rem] bg-[#1c110d] p-7 text-white">
                        <div className="pointer-events-none absolute -bottom-16 -left-16 h-48 w-48 rounded-full bg-[#7a0d0d]/70 blur-3xl" aria-hidden />
                        <span className="relative grid h-12 w-12 place-items-center rounded-2xl bg-[#e0a52e] text-[#1c110d]">
                          <MessageCircle size={22} />
                        </span>
                        <h3 className="relative mt-5 text-xl font-black">{c.faq.supportTitle}</h3>
                        <p className="relative mt-2 text-sm leading-relaxed text-white/70">{c.faq.supportText}</p>
                        {c.faq.supportCtaLabel && (
                          <a
                            {...lp(safeHref(c.faq.supportCtaHref))}
                            className="relative mt-6 inline-flex items-center gap-2 rounded-full bg-white px-6 py-3 text-sm font-black text-[#1c110d] transition hover:bg-[#f3c766]"
                          >
                            {c.faq.supportCtaLabel} <ArrowLeft size={16} />
                          </a>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                <div className="space-y-3 lg:col-span-7">
                  {c.faq.items.map((q, i) => (
                    <details
                      key={q.id}
                      className="group rounded-[1.75rem] border border-[#eadfcd] bg-white px-5 transition-all open:border-transparent open:shadow-[0_30px_60px_-35px_rgba(43,26,18,0.5)] open:ring-2 open:ring-[#e0a52e]/40 sm:px-7"
                    >
                      <summary className="flex cursor-pointer list-none items-center gap-4 py-5 text-right marker:content-none [&::-webkit-details-marker]:hidden">
                        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[#fbf6ee] text-sm font-black text-[#b0790f] transition-colors group-open:bg-[#e0a52e] group-open:text-[#1c110d]">
                          {arabicNumber(i + 1)}
                        </span>
                        <span className="flex-1">
                          <span className="block text-base font-black text-[#2b1a12] transition-colors group-open:text-[#7a0d0d] sm:text-lg">
                            {q.question}
                          </span>
                          {q.hint && <span className="mt-1 block text-xs font-bold text-[#b0790f]">{q.hint}</span>}
                        </span>
                        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-[#eadfcd] text-[#7a0d0d] transition-all duration-300 group-open:rotate-45 group-open:border-[#7a0d0d] group-open:bg-[#7a0d0d] group-open:text-white">
                          <Plus size={18} />
                        </span>
                      </summary>
                      <p className="whitespace-pre-line pb-6 text-right text-[15px] leading-[2] text-[#75604f] sm:pr-14 sm:text-base">
                        {q.answer}
                      </p>
                    </details>
                  ))}
                </div>
              </div>
            </section>
          )}

          {/* ============ CTA ============ */}
          {c.cta.enabled && (
            <section className="mx-auto max-w-7xl px-5 pb-24">
              <div className="relative overflow-hidden rounded-[2.5rem] bg-gradient-to-br from-[#f3c766] via-[#e0a52e] to-[#c98a14] px-6 py-16 text-center text-[#1c110d] shadow-[0_40px_80px_-40px_rgba(224,165,46,0.9)] sm:px-12 md:py-20">
                <div
                  className="pointer-events-none absolute inset-0 opacity-[0.15] [background-image:radial-gradient(#1c110d_1px,transparent_1px)] [background-size:20px_20px]"
                  aria-hidden
                />
                <div className="pointer-events-none absolute -right-16 -top-16 h-60 w-60 rounded-full border-[2.5rem] border-white/25" aria-hidden />
                <div className="pointer-events-none absolute -bottom-24 -left-12 h-72 w-72 rounded-full border-[2.5rem] border-[#7a0d0d]/15" aria-hidden />
                <div className="relative mx-auto max-w-2xl">
                  {c.cta.badge && (
                    <span className="inline-flex items-center gap-2 rounded-full bg-[#1c110d] px-4 py-1.5 text-[13px] font-extrabold text-[#f3c766]">
                      <Sparkles size={14} />
                      {c.cta.badge}
                    </span>
                  )}
                  <h2 className="mt-5 text-[2.2rem] font-black leading-tight sm:text-[3.5rem]">
                    {c.cta.titleStart} <span className="text-[#7a0d0d]">{c.cta.titleHighlight}</span> {c.cta.titleEnd}
                  </h2>
                  <p className="mx-auto mt-4 max-w-lg text-base font-medium leading-relaxed text-[#1c110d]/75 sm:text-lg">
                    {c.cta.description}
                  </p>
                  {c.cta.buttonLabel && (
                    <a
                      {...lp(safeHref(c.cta.buttonHref))}
                      className="group mt-9 inline-flex items-center gap-2.5 rounded-full bg-[#1c110d] px-9 py-4 text-base font-black text-white shadow-[0_18px_40px_-14px_rgba(28,17,13,0.8)] transition-all hover:-translate-y-0.5 hover:bg-[#7a0d0d]"
                    >
                      <span>{c.cta.buttonLabel}</span>
                      <ArrowLeft size={18} className="transition-transform group-hover:-translate-x-1" />
                    </a>
                  )}
                </div>
              </div>
            </section>
          )}

          {/* ============ SOCIAL ============ */}
          {c.social.enabled && socials.length > 0 && (
            <section id="social" className="scroll-mt-20 border-t border-[#eadfcd] bg-white py-20 sm:py-24">
              <div className="mx-auto max-w-5xl px-5">
                <SectionHeading kicker={c.social.kicker} title={c.social.title} subtitle={c.social.subtitle} />
                <div className="flex flex-wrap justify-center gap-4">
                  {socials.map((s) => {
                    const p = SOCIAL_PLATFORMS[s.platform] ?? SOCIAL_PLATFORMS.facebook;
                    return (
                      <a
                        key={s.id}
                        {...lp(safeHref(s.url))}
                        className="group flex min-w-[13rem] items-center gap-4 rounded-3xl border border-[#eadfcd] bg-[#fbf6ee] p-3 pl-6 transition-all hover:-translate-y-1 hover:bg-white hover:shadow-[0_24px_50px_-30px_rgba(43,26,18,0.6)]"
                      >
                        <span className="grid h-12 w-12 place-items-center rounded-2xl text-white" style={{ backgroundColor: p.color }}>
                          <p.Icon size={20} />
                        </span>
                        <span className="flex-1 text-base font-black text-[#2b1a12]">{s.label || p.name}</span>
                        <ExternalLink size={15} className="text-[#b0790f]" />
                      </a>
                    );
                  })}
                </div>
              </div>
            </section>
          )}
        </>
      )}

      {isContact && (
        <>
          {/* ============ CONTACT PAGE ============ */}
          <section className="relative -mt-20 overflow-hidden bg-[#1c110d] pt-20 text-white">
            <div
              className="lp-orb pointer-events-none absolute -right-40 -top-40 h-[36rem] w-[36rem] rounded-full bg-[#7a0d0d]/70 blur-[140px]"
              aria-hidden
            />
            <div
              className="pointer-events-none absolute inset-0 opacity-[0.07] [background-image:radial-gradient(#ffffff_1px,transparent_1px)] [background-size:26px_26px]"
              aria-hidden
            />
            <div className="relative mx-auto max-w-3xl px-5 pb-28 pt-14 text-center md:pb-36 md:pt-20">
              <Kicker dark>{c.contact.kicker}</Kicker>
              <h1 className="mt-6 text-[2.75rem] font-black leading-tight tracking-tight sm:text-6xl md:text-7xl">
                {c.contact.title}
              </h1>
              {c.contact.subtitle && (
                <p className="mx-auto mt-6 max-w-xl text-lg leading-[1.9] text-white/70">{c.contact.subtitle}</p>
              )}
            </div>
          </section>

          <section id="contact" className="relative mx-auto -mt-16 max-w-7xl px-5 pb-24 md:-mt-20">
            <div className={`grid gap-6 ${c.contact.showForm ? "lg:grid-cols-5" : ""}`}>
              <div
                className={`grid content-start gap-4 sm:grid-cols-2 ${
                  c.contact.showForm ? "lg:col-span-2 lg:grid-cols-1" : "lg:grid-cols-3"
                }`}
              >
                {c.contact.phone && (
                  <ContactCard
                    icon={Phone}
                    title="اتصل بينا"
                    value={c.contact.phone}
                    href={`tel:${toInternationalPhone(c.contact.phone)}`}
                    ltr
                  />
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
          </section>
        </>
      )}

      {/* ============ FOOTER ============ */}
      <footer className="relative overflow-hidden bg-[#1c110d] text-white/65">
        <div className="pointer-events-none absolute -left-32 -top-32 h-80 w-80 rounded-full bg-[#7a0d0d]/40 blur-[110px]" aria-hidden />
        <div className="relative mx-auto max-w-7xl px-5">
          <div className="flex flex-col items-center justify-between gap-6 border-b border-white/10 py-12 text-center md:flex-row md:text-right">
            <div className="flex flex-col items-center gap-4 md:flex-row">
              <span className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-white">
                <img src={logo} alt={c.brand.name} className="h-10 w-10 object-contain" />
              </span>
              <span>
                <span className="block text-3xl font-black text-white">{c.brand.name}</span>
                <span className="mt-1 block max-w-sm text-sm leading-relaxed">{c.footer.about}</span>
              </span>
            </div>
            {socials.length > 0 && (
              <div className="flex flex-wrap justify-center gap-2.5">
                {socials.map((s) => {
                  const p = SOCIAL_PLATFORMS[s.platform] ?? SOCIAL_PLATFORMS.facebook;
                  return (
                    <a
                      key={s.id}
                      {...lp(safeHref(s.url))}
                      aria-label={s.label || p.name}
                      className="grid h-11 w-11 place-items-center rounded-2xl border border-white/15 text-white transition hover:border-[#e0a52e] hover:bg-[#e0a52e] hover:text-[#1c110d]"
                    >
                      <p.Icon size={18} />
                    </a>
                  );
                })}
              </div>
            )}
          </div>

          <div className="grid gap-10 py-12 text-center sm:grid-cols-3 sm:text-right">
            <FooterLinks title={c.footer.quickLinksTitle} links={c.brand.navLinks} onContactPage={isContact} />
            <FooterLinks title={c.footer.companyTitle} links={c.footer.companyLinks} onContactPage={isContact} />
            <div className="space-y-4">
              <h5 className="text-sm font-black text-[#f3c766]">{c.footer.contactTitle}</h5>
              <ul className="space-y-3 text-sm">
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

          <div className="flex flex-col items-center justify-between gap-3 border-t border-white/10 py-6 text-xs text-white/45 sm:flex-row">
            <span>{c.footer.copyright}</span>
            <a
              href={isContact ? "/" : "#home"}
              aria-label="لأعلى الصفحة"
              className="grid h-10 w-10 place-items-center rounded-full border border-white/15 text-white/70 transition hover:border-[#e0a52e] hover:bg-[#e0a52e] hover:text-[#1c110d]"
            >
              <ArrowUp size={16} />
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Contact & footer pieces                                            */
/* ------------------------------------------------------------------ */

function ContactCard({
  icon: Icon,
  title,
  value,
  href,
  ltr,
  accent = "#7a0d0d",
}: {
  icon: LucideIcon;
  title: string;
  value: string;
  href?: string;
  ltr?: boolean;
  accent?: string;
}) {
  const body = (
    <>
      <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl text-white" style={{ backgroundColor: accent }}>
        <Icon size={20} />
      </span>
      <span className="min-w-0 text-right">
        <span className="block text-xs font-extrabold text-[#b0790f]">{title}</span>
        <span className="mt-0.5 block break-words text-sm font-black text-[#2b1a12] sm:text-base" dir={ltr ? "ltr" : undefined}>
          {value}
        </span>
      </span>
    </>
  );
  const cls =
    "flex items-center gap-4 rounded-[1.5rem] border border-[#eadfcd] bg-white p-5 shadow-[0_20px_40px_-35px_rgba(43,26,18,0.6)] transition-all";
  return href ? (
    <a {...linkProps(href)} className={`${cls} hover:-translate-y-0.5 hover:border-[#cdbb9d]`}>
      {body}
    </a>
  ) : (
    <div className={cls}>{body}</div>
  );
}

function FooterLinks({ title, links, onContactPage }: { title: string; links: LinkItem[]; onContactPage: boolean }) {
  if (links.length === 0) return null;
  return (
    <div className="space-y-4">
      <h5 className="text-sm font-black text-[#f3c766]">{title}</h5>
      <ul className="space-y-2.5 text-sm">
        {links.map((l) => (
          <li key={l.id}>
            <a {...linkProps(safeHref(l.href), onContactPage)} className="transition-colors hover:text-white">
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
  icon: LucideIcon;
  href?: string;
  ltr?: boolean;
  children: ReactNode;
}) {
  return (
    <li className="flex items-center justify-center gap-3 sm:justify-start">
      <Icon size={16} className="shrink-0 text-[#e0a52e]" />
      {href ? (
        <a {...linkProps(href)} dir={ltr ? "ltr" : undefined} className="break-all transition-colors hover:text-white">
          {children}
        </a>
      ) : (
        <span>{children}</span>
      )}
    </li>
  );
}
