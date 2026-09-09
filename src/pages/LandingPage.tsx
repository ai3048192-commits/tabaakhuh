import { useState } from "react";
import { Link } from "react-router-dom";
import heroFood from "../assets/Egyptian Home Food.png";
import logoIcon from "../assets/logo_icon_trim.png";
import chickenImg from "../assets/chicken.jpeg";
import kosharyImg from "../assets/koshary.jpeg";
import kronbImg from "../assets/kronb.jpeg";
import {
  Menu,
  X,
  LogIn,
  Sparkles,
  ChefHat,
  PackageCheck,
  Star,
  ArrowLeft,
  Leaf,
  HeartHandshake,
  ShieldCheck,
  Clock,
  Search,
  ClipboardList,
  CreditCard,
  Bell,
  BadgeCheck,
  Wallet,
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
  Facebook,
  Instagram,
  Twitter,
} from "lucide-react";

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
}: {
  kicker: string;
  title: string;
  subtitle?: string;
}) {
  return (
    <div className="mx-auto mb-12 max-w-2xl text-center">
      <span className="inline-flex items-center gap-2 rounded-full border border-[#b68614]/25 bg-[#b68614]/10 px-4 py-1.5 text-xs font-black tracking-wide text-[#8f680d]">
        <span className="h-1.5 w-1.5 rounded-full bg-[#b68614]" />
        {kicker}
      </span>
      <h2 className="mt-4 text-3xl font-black leading-tight tracking-tight text-[#7a0d0d] md:text-[2.6rem]">
        {title}
      </h2>
      {subtitle && <p className="mt-3 leading-relaxed text-[#6b4f3a]">{subtitle}</p>}
    </div>
  );
}

const dishes = [
  { name: "كشري بلدي", img: kosharyImg, emoji: "🍲", rate: "٤.٩", price: "٤٥ ج" },
  { name: "محشي كرنب", img: kronbImg, emoji: "🥬", rate: "٤.٨", price: "٦٥ ج" },
  { name: "فراخ مشوية", img: chickenImg, emoji: "🍗", rate: "٥.٠", price: "٩٠ ج" },
  { name: "أرز معمر", img: kosharyImg, emoji: "🍚", rate: "٤.٧", price: "٥٥ ج" },
];

/* ------------------------------------------------------------------ */
/*  Phone mockup (used in the app-download band)                       */
/* ------------------------------------------------------------------ */

function PhoneMockup() {
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
                  <img src={logoIcon} alt="" className="h-7 w-7 object-contain" />
                  <span className="text-lg font-black">طباخه</span>
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
              {["كشري", "محشي", "مشويات", "حلويات", "شوربة"].map((c, i) => (
                <span
                  key={c}
                  className={`shrink-0 rounded-full px-3 py-1 text-[10px] font-black ${
                    i === 0
                      ? "bg-[#b68614] text-white"
                      : "border border-[#efe6d2] bg-white text-[#7a0d0d]"
                  }`}
                >
                  {c}
                </span>
              ))}
            </div>

            {/* section title */}
            <div className="flex items-center justify-between px-4 pb-2 pt-4">
              <span className="text-[12px] font-black text-[#7a0d0d]">
                الأكثر طلباً
              </span>
              <span className="text-[10px] font-bold text-[#b68614]">
                شوف الكل
              </span>
            </div>

            {/* food grid */}
            <div className="grid grid-cols-2 gap-2.5 px-3">
              {dishes.map((d) => (
                <div
                  key={d.name}
                  className="rounded-2xl border border-[#efe6d2] bg-white p-2 shadow-sm"
                >
                  <div className="h-14 overflow-hidden rounded-xl">
                    <img
                      src={d.img}
                      alt={d.name}
                      className="h-full w-full object-cover"
                    />
                  </div>
                  <p className="mt-1.5 text-[11px] font-black text-gray-800">
                    {d.name}
                  </p>
                  <div className="mt-0.5 flex items-center justify-between">
                    <span className="flex items-center gap-0.5 text-[9px] font-bold text-[#b68614]">
                      <Star size={9} className="fill-[#b68614]" /> {d.rate}
                    </span>
                    <span className="text-[11px] font-black text-[#7a0d0d]">
                      {d.price}
                    </span>
                  </div>
                </div>
              ))}
            </div>

            {/* promo */}
            <div className="mx-3 mt-3 flex items-center gap-2 rounded-2xl bg-[#7a0d0d]/10 px-3 py-2 text-[10px] font-black text-[#7a0d0d]">
              <Sparkles size={13} className="text-[#b68614]" /> خصم ٢٠٪ على أول
              أوردر
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
              <p className="text-[10px] font-bold text-gray-400">
                الدليفري في الطريق
              </p>
            </div>
          </div>
        </div>

        {/* floating chip: delivery time */}
        <div className="lp-float-soft absolute -left-10 top-16 flex items-center gap-1.5 rounded-full bg-[#7a0d0d] px-3 py-1.5 text-[11px] font-black text-white shadow-xl ring-1 ring-white/10">
          <Clock size={13} className="text-yellow-400" /> يوصل في ٣٠ دقيقة
        </div>
      </div>
    </div>
  );
}

const navLinks = [
  { label: "الرئيسية", href: "#home" },
  { label: "ليه طباخه؟", href: "#why" },
  { label: "بتشتغل إزاي؟", href: "#how" },
  { label: "حمّل التطبيق", href: "#app" },
  { label: "تواصل معنا", href: "#contact" },
];

const clientSteps = [
  {
    icon: Search,
    title: "اتصفّحي",
    text: "اختاري منطقتك وشوفي الطباخات والمنيو المتاح دلوقتي.",
  },
  {
    icon: ClipboardList,
    title: "اطلبي",
    text: "ضيفي الأصناف للسلة وأكّدي الطلب في ثواني.",
  },
  {
    icon: CreditCard,
    title: "ادفعي",
    text: "كاش عند الاستلام أو أونلاين، زي ما يريّحك.",
  },
  {
    icon: PackageCheck,
    title: "استلمي",
    text: "الدليفري بيجيبهولك سخن لحد باب البيت.",
  },
];

const cookSteps = [
  {
    icon: BadgeCheck,
    title: "سجّلي",
    text: "اعملي حساب وارفعي بياناتك وصور مطبخك.",
  },
  {
    icon: ChefHat,
    title: "ضيفي أكلك",
    text: "صوّري أصنافك وحطّي الأسعار والمواعيد.",
  },
  {
    icon: Bell,
    title: "استقبلي الطلبات",
    text: "يوصلك إشعار بكل طلب جديد على طول.",
  },
  {
    icon: Wallet,
    title: "حصّلي فلوسك",
    text: "أرباحك بتتحوّل لك أول بأول من غير تعقيد.",
  },
];

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */

export default function LandingPage() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [tab, setTab] = useState<"client" | "cook">("client");
  const steps = tab === "client" ? clientSteps : cookSteps;

  return (
    <div
      dir="rtl"
      className="min-h-screen overflow-x-hidden bg-[#faf3e7] text-[#3a2a1a]"
    >
      {/* ============ HERO (nav lives inside it) ============ */}
      <section
        id="home"
        className="relative bg-[radial-gradient(120%_90%_at_72%_8%,#7d1520_0%,#5c0f16_45%,#3d080c_100%)]"
      >
        {/* ---- navbar, merged into the hero ---- */}
        <header className="absolute inset-x-0 top-0 z-50 px-5 pt-5">
          <div className="mx-auto flex max-w-6xl items-center justify-between">
            <a href="#home" className="flex items-center">
              <img
                src={logoIcon}
                alt="طباخه"
                className="h-10 w-auto object-contain md:h-12"
              />
            </a>

            <nav className="hidden items-center gap-1 md:flex">
              {navLinks.map((l) => (
                <a
                  key={l.href}
                  href={l.href}
                  className="rounded-full px-3.5 py-2 text-sm font-bold text-white/80 transition hover:bg-white/10 hover:text-white"
                >
                  {l.label}
                </a>
              ))}
            </nav>

            <Link
              to="/login"
              className="hidden items-center gap-2 rounded-full border border-white/20 bg-white/10 px-5 py-2.5 text-sm font-black text-white backdrop-blur transition hover:bg-white/20 md:flex"
            >
              <LogIn size={16} />
              تسجيل دخول
            </Link>

            <button
              className="text-white md:hidden"
              onClick={() => setMenuOpen((v) => !v)}
            >
              {menuOpen ? <X size={26} /> : <Menu size={26} />}
            </button>
          </div>

          {menuOpen && (
            <div className="mx-auto mt-3 max-w-6xl rounded-3xl border border-white/10 bg-[#5c0f16]/95 p-4 backdrop-blur-xl md:hidden">
              <div className="flex flex-col gap-1">
                {navLinks.map((l) => (
                  <a
                    key={l.href}
                    href={l.href}
                    onClick={() => setMenuOpen(false)}
                    className="rounded-xl px-3 py-2 text-sm font-bold text-white/85 transition hover:bg-white/10"
                  >
                    {l.label}
                  </a>
                ))}
                <Link
                  to="/login"
                  className="mt-2 flex items-center justify-center gap-2 rounded-full bg-[#b68614] px-5 py-2.5 text-center text-sm font-black text-white"
                >
                  <LogIn size={16} />
                  تسجيل دخول
                </Link>
              </div>
            </div>
          )}
        </header>

        <div className="pointer-events-none absolute inset-0 opacity-[0.06] [background-image:radial-gradient(circle,#fff_1.5px,transparent_1.5px)] [background-size:30px_30px]" />
        <div className="lp-glow pointer-events-none absolute -left-24 top-24 h-72 w-72 rounded-full bg-[#f4c752]/25 blur-3xl" />
        <div className="lp-glow pointer-events-none absolute right-1/4 top-1/3 h-64 w-64 rounded-full bg-[#e0a52e]/12 blur-3xl" />

        <div className="relative mx-auto grid max-w-6xl items-center gap-6 px-5 pb-24 pt-28 md:grid-cols-2 md:gap-4 md:pb-32 md:pt-32">
          {/* copy */}
          <div className="text-center md:text-right">
            <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-4 py-1.5 text-xs font-black text-white/85 backdrop-blur">
              <Sparkles size={13} className="text-[#f4c752]" />
              منصة أكل بيتي رقم ١ في مصر
            </span>
            <h1 className="mt-5 text-[2.9rem] font-black leading-[1.05] tracking-tight text-white md:text-[4rem]">
              أكل بيتي،
              <br />
              <span className="bg-gradient-to-l from-[#f8d778] to-[#e0a52e] bg-clip-text text-transparent">
                من إيدين أمينة
              </span>
            </h1>
            <p className="mx-auto mt-5 max-w-md text-base leading-relaxed text-white/80 md:mx-0">
              اطلبي أكل بيتي طازة من أحسن ستّات بيوت في منطقتك، متحضّر بحب
              ووصله لحد باب بيتك.
            </p>
            <div className="mt-8 flex flex-wrap justify-center gap-3 md:justify-start">
              <a
                href="#app"
                className="rounded-full bg-[#e0a52e] px-8 py-3.5 text-sm font-black text-[#4a1500] shadow-xl shadow-black/20 transition hover:-translate-y-0.5 hover:bg-[#d0971f]"
              >
                اطلب دلوقتي
              </a>
              <a
                href="#how"
                className="rounded-full border border-white/25 bg-white/5 px-8 py-3.5 text-sm font-black text-white backdrop-blur transition hover:bg-white/15"
              >
                اعرف أكتر
              </a>
            </div>
            <div className="mt-9 flex flex-wrap items-center justify-center gap-x-7 gap-y-3 text-xs font-bold text-white/70 md:justify-start">
              <span className="flex items-center gap-1.5">
                <span className="grid h-7 w-7 place-items-center rounded-full bg-white/10 text-[#f4c752]">
                  <ChefHat size={14} />
                </span>
                +٥٠٠ طباخة موثّقة
              </span>
              <span className="flex items-center gap-1.5">
                <span className="grid h-7 w-7 place-items-center rounded-full bg-white/10 text-[#f4c752]">
                  <PackageCheck size={14} />
                </span>
                +٢٠ ألف طلب ناجح
              </span>
              <span className="flex items-center gap-1.5">
                <span className="grid h-7 w-7 place-items-center rounded-full bg-white/10 text-[#f4c752]">
                  <Star size={14} className="fill-[#f4c752]" />
                </span>
                ٤.٩ تقييم العملاء
              </span>
            </div>
          </div>

          {/* hero image */}
          <div className="relative mx-auto w-full max-w-md">
            <div className="lp-glow absolute inset-6 -z-10 rounded-full bg-[#f4c752]/25 blur-3xl" />
            {/* swap this <img> for a transparent-PNG food shot when you have one */}
            <img
              src={heroFood}
              alt="سفرة أكل بيتي مصري"
              className="lp-float mx-auto w-[min(420px,88%)] rounded-[2.5rem] object-cover shadow-[0_50px_80px_-25px_rgba(0,0,0,0.55)] ring-1 ring-white/15"
            />
            <span className="lp-float-soft absolute right-2 top-4 text-3xl drop-shadow-lg">
              🌶️
            </span>
            <span className="lp-float-delay absolute left-3 top-1/3 text-2xl drop-shadow-lg">
              🧄
            </span>
            <span className="lp-float-soft absolute bottom-8 left-6 text-3xl drop-shadow-lg">
              🫓
            </span>
            <span className="lp-float-delay absolute bottom-2 right-10 text-2xl drop-shadow-lg">
              🌿
            </span>
            <div className="lp-float-soft absolute -bottom-3 right-1/2 flex translate-x-1/2 items-center gap-1.5 rounded-full bg-white px-3.5 py-2 text-[11px] font-black text-[#7a0d0d] shadow-xl ring-1 ring-black/5">
              <Clock size={13} className="text-[#e0a52e]" /> يوصل في ٣٠ دقيقة
            </div>
          </div>
        </div>

        <Wave color="#f1dcc0" />
      </section>

      {/* ============ WHY (peach) ============ */}
      <section id="why" className="bg-[#f1dcc0]">
        <div className="mx-auto max-w-6xl px-5 py-14 md:py-20">
          <div className="grid gap-10 md:grid-cols-2 md:items-center">
            <div className="text-center md:text-right">
              <span className="inline-grid h-12 w-12 place-items-center rounded-2xl bg-[#7a0d0d] text-[#f4c752] shadow-lg shadow-[#7a0d0d]/25">
                <Leaf size={24} />
              </span>
              <h2 className="mt-5 text-3xl font-black leading-tight tracking-tight text-[#7a0d0d] md:text-[2.5rem]">
                أكل صحي وطازة، بضمير
              </h2>
              <p className="mx-auto mt-4 max-w-md leading-relaxed text-[#6b4f3a] md:mx-0">
                كل الأصناف بتتحضّر يوم الطلب من مكوّنات طازة، من غير مواد حافظة
                ولا تلوين.
              </p>
              <p className="mx-auto mt-3 flex max-w-md items-start gap-2 leading-relaxed text-[#6b4f3a] md:mx-0">
                <HeartHandshake
                  size={18}
                  className="mt-1 shrink-0 text-[#b68614]"
                />
                وكل طلب بيوصل دخل لأسرة مصرية، وبيدّي فرصة لستّ بيت شاطرة إنها
                تكسب من شغل إيدها.
              </p>
            </div>

            {/* dish photo cards */}
            <div className="grid grid-cols-3 gap-3 sm:gap-4">
              {dishes.slice(0, 3).map((d, i) => (
                <div
                  key={d.name}
                  className={`overflow-hidden rounded-[1.6rem] bg-white shadow-[0_25px_45px_-25px_rgba(122,13,13,0.4)] ring-1 ring-black/[0.04] transition duration-300 hover:-translate-y-1.5 ${
                    i === 1 ? "sm:mt-6" : ""
                  }`}
                >
                  <div className="aspect-[3/4] overflow-hidden">
                    <img
                      src={d.img}
                      alt={d.name}
                      className="h-full w-full object-cover transition duration-500 hover:scale-105"
                    />
                  </div>
                  <div className="p-2.5 text-center">
                    <p className="text-[11px] font-black text-gray-800">
                      {d.name}
                    </p>
                    <p className="mt-0.5 flex items-center justify-center gap-0.5 text-[10px] font-bold text-[#b68614]">
                      <Star size={9} className="fill-[#b68614]" /> {d.rate}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <Wave color="#faf3e7" />
      </section>

      {/* ============ FEATURES (cream + ornament) ============ */}
      <section className="relative bg-[#faf3e7]">
        <svg
          className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-[#7a0d0d] opacity-[0.06]"
          width="360"
          height="480"
          viewBox="0 0 360 480"
          fill="none"
          aria-hidden
        >
          <path
            d="M180,10 C120,90 250,140 180,230 C110,320 250,360 180,470"
            stroke="currentColor"
            strokeWidth="3"
          />
          <path
            d="M180,70 C230,90 250,50 300,70 M180,150 C130,170 110,130 60,150 M180,260 C230,280 250,240 300,260 M180,360 C130,380 110,340 60,360"
            stroke="currentColor"
            strokeWidth="3"
          />
          {[70, 150, 260, 360].map((y, i) => (
            <circle key={y} cx={i % 2 ? 60 : 300} cy={y} r="6" fill="currentColor" />
          ))}
        </svg>

        <div className="relative mx-auto max-w-5xl px-5 py-16 md:py-24">
          <div className="grid gap-12 sm:grid-cols-2 md:gap-16">
            <div className="text-center sm:text-right">
              <span className="inline-grid h-12 w-12 place-items-center rounded-2xl bg-[#7a0d0d]/[0.08] text-[#7a0d0d]">
                <ShieldCheck size={24} />
              </span>
              <h3 className="mt-4 text-2xl font-black tracking-tight text-[#7a0d0d]">
                طباخات موثّقة
              </h3>
              <p className="mt-2 leading-relaxed text-[#6b4f3a]">
                بنراجع بيانات ومطبخ كل طباخة قبل التفعيل، عشان تطمّني على مصدر
                أكلك وجودته.
              </p>
            </div>
            <div className="text-center sm:text-right">
              <span className="inline-grid h-12 w-12 place-items-center rounded-2xl bg-[#7a0d0d]/[0.08] text-[#7a0d0d]">
                <Sparkles size={24} />
              </span>
              <h3 className="mt-4 text-2xl font-black tracking-tight text-[#7a0d0d]">
                نقاط ومكافآت
              </h3>
              <p className="mt-2 leading-relaxed text-[#6b4f3a]">
                اكسبي نقاط مع كل أوردر واستبدليها خصومات على طلباتك الجاية.
              </p>
              <a
                href="#app"
                className="mt-5 inline-flex items-center gap-2 rounded-full bg-[#7a0d0d] px-6 py-3 text-sm font-black text-white shadow-lg shadow-[#7a0d0d]/25 transition hover:-translate-y-0.5 hover:bg-[#5a0909]"
              >
                اعرف أكتر <ArrowLeft size={16} />
              </a>
            </div>
          </div>

          <div className="mx-auto mt-14 flex max-w-3xl flex-wrap items-center justify-center gap-x-10 gap-y-4 rounded-[1.75rem] bg-white/70 px-6 py-5 text-sm font-bold text-[#6b4f3a] ring-1 ring-black/[0.04]">
            <span className="flex items-center gap-2">
              <Clock size={16} className="text-[#b68614]" /> توصيل ٣٠ – ٤٥ دقيقة
            </span>
            <span className="flex items-center gap-2">
              <ChefHat size={16} className="text-[#b68614]" /> +٥٠٠ طباخة
            </span>
            <span className="flex items-center gap-2">
              <PackageCheck size={16} className="text-[#b68614]" /> +٢٠ ألف طلب
            </span>
            <span className="flex items-center gap-2">
              <Star size={16} className="fill-[#b68614] text-[#b68614]" /> ٤.٩ تقييم
            </span>
          </div>
        </div>
      </section>

      {/* ============ HOW (cream) ============ */}
      <section id="how" className="bg-[#faf3e7] pb-8">
        <div className="mx-auto max-w-6xl px-5 pt-6 pb-16">
          <SectionHeading kicker="بتشتغل إزاي؟" title="٤ خطوات وبس" />

          <div className="mb-12 flex justify-center">
            <div className="inline-flex rounded-full bg-white p-1 shadow-[0_15px_35px_-20px_rgba(122,13,13,0.3)] ring-1 ring-black/[0.04]">
              <button
                onClick={() => setTab("client")}
                className={`rounded-full px-7 py-2.5 text-sm font-black transition ${
                  tab === "client"
                    ? "bg-[#7a0d0d] text-white shadow-lg shadow-[#7a0d0d]/25"
                    : "text-gray-500 hover:text-[#7a0d0d]"
                }`}
              >
                كعميل
              </button>
              <button
                onClick={() => setTab("cook")}
                className={`rounded-full px-7 py-2.5 text-sm font-black transition ${
                  tab === "cook"
                    ? "bg-[#7a0d0d] text-white shadow-lg shadow-[#7a0d0d]/25"
                    : "text-gray-500 hover:text-[#7a0d0d]"
                }`}
              >
                كطباخة
              </button>
            </div>
          </div>

          <div className="grid gap-5 pt-4 sm:grid-cols-2 lg:grid-cols-4">
            {steps.map((s, i) => (
              <div
                key={s.title}
                className="group relative rounded-[1.5rem] bg-white p-6 shadow-[0_16px_38px_-25px_rgba(122,13,13,0.35)] ring-1 ring-black/[0.04] transition duration-300 hover:-translate-y-1.5 hover:shadow-[0_30px_55px_-25px_rgba(122,13,13,0.45)]"
              >
                <span className="absolute -top-4 right-6 grid h-10 w-10 place-items-center rounded-full bg-gradient-to-br from-[#e0a52e] to-[#b68614] text-sm font-black text-white shadow-lg ring-4 ring-[#faf3e7] transition group-hover:scale-110">
                  {["١", "٢", "٣", "٤"][i]}
                </span>
                <div className="grid h-12 w-12 place-items-center rounded-2xl bg-[#7a0d0d]/10 text-[#7a0d0d] transition group-hover:bg-[#7a0d0d] group-hover:text-white">
                  <s.icon size={24} />
                </div>
                <h4 className="mt-4 font-black text-gray-800">{s.title}</h4>
                <p className="mt-1 text-sm leading-relaxed text-gray-500">
                  {s.text}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ============ BECOME A COOK (cream) ============ */}
      <section className="bg-[#faf3e7]">
        <div className="mx-auto max-w-6xl px-5 pb-20 pt-8">
          <SectionHeading
            kicker="اشتغلي معانا"
            title="ابدئي رحلتك كطباخة"
            subtitle="حوّلي شطارتك في المطبخ لدخل ثابت. الانضمام بيتم من خلال تطبيق طباخه."
          />
          <div className="grid gap-5 md:grid-cols-3">
            {[
              {
                icon: BadgeCheck,
                t: "سجّلي من التطبيق",
                d: "نزّلي تطبيق طباخه وقدّمي كطباخة وارفعي صور مطبخك.",
              },
              {
                icon: ChefHat,
                t: "ضيفي أكلك",
                d: "حدّدي المنيو والأسعار ومواعيد استلام الطلبات.",
              },
              {
                icon: Wallet,
                t: "اكسبي دخلك",
                d: "استقبلي الطلبات وحصّلي أرباحك أول بأول.",
              },
            ].map((c) => (
              <div
                key={c.t}
                className="group rounded-[1.5rem] bg-white p-7 text-center shadow-[0_18px_40px_-25px_rgba(122,13,13,0.3)] ring-1 ring-black/[0.04] transition duration-300 hover:-translate-y-1.5 hover:shadow-[0_30px_55px_-25px_rgba(122,13,13,0.4)]"
              >
                <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-gradient-to-br from-[#7a0d0d] to-[#9a1212] text-white shadow-lg shadow-[#7a0d0d]/25 transition group-hover:scale-110">
                  <c.icon size={26} />
                </div>
                <h4 className="mt-4 text-lg font-black text-[#7a0d0d]">{c.t}</h4>
                <p className="mt-2 text-sm text-[#6b4f3a]">{c.d}</p>
              </div>
            ))}
          </div>
        </div>

        <Wave color="#320808" />
      </section>

      {/* ============ APP DOWNLOAD (dark band) ============ */}
      <section
        id="app"
        className="relative overflow-hidden bg-[radial-gradient(130%_120%_at_50%_100%,#571212_0%,#3d0a0a_55%,#320808_100%)]"
      >
        <div className="pointer-events-none absolute inset-0 opacity-[0.07] [background-image:radial-gradient(circle,#fff_1.5px,transparent_1.5px)] [background-size:26px_26px]" />
        <div className="lp-glow pointer-events-none absolute -left-24 bottom-1/4 h-72 w-72 rounded-full bg-[#e0a52e]/12 blur-3xl" />
        <div className="lp-glow pointer-events-none absolute -right-20 top-1/2 h-64 w-64 rounded-full bg-[#9a1212]/25 blur-3xl" />

        <div className="relative mx-auto grid max-w-6xl items-center gap-12 px-5 py-20 md:grid-cols-2 md:py-24">
          <div className="text-center md:text-right">
            <h2 className="text-3xl font-black tracking-tight text-white md:text-[2.6rem]">
              حمّل تطبيق طباخه
            </h2>
            <p className="mx-auto mt-4 max-w-md leading-relaxed text-white/75 md:mx-0">
              اطلب، تابع طلبك لحظة بلحظة، واكسب نقاط مع كل أوردر. التطبيق متاح
              على أندرويد و iOS، خفيف وسريع.
            </p>

            <div className="mt-8 flex flex-wrap justify-center gap-4 md:justify-start">
              <a
                href="#"
                className="flex items-center gap-3 rounded-2xl bg-black px-5 py-3 text-white ring-1 ring-white/15 transition hover:-translate-y-0.5 hover:bg-black/80"
              >
                <Play size={26} className="text-[#e0a52e]" />
                <span className="text-right leading-tight">
                  <span className="block text-[10px] font-bold text-white/60">
                    متاح على
                  </span>
                  <span className="block text-base font-black">Google Play</span>
                </span>
              </a>
              <a
                href="#"
                className="flex items-center gap-3 rounded-2xl bg-black px-5 py-3 text-white ring-1 ring-white/15 transition hover:-translate-y-0.5 hover:bg-black/80"
              >
                <Apple size={26} />
                <span className="text-right leading-tight">
                  <span className="block text-[10px] font-bold text-white/60">
                    حمّله من
                  </span>
                  <span className="block text-base font-black">App Store</span>
                </span>
              </a>
            </div>

            <div className="mt-8 flex items-center justify-center gap-6 text-white/70 md:justify-start">
              <span className="flex items-center gap-2 text-sm font-bold">
                <Star size={16} className="fill-[#e0a52e] text-[#e0a52e]" /> ٤.٩
                تقييم المتجر
              </span>
              <span className="flex items-center gap-2 text-sm font-bold">
                <PackageCheck size={16} className="text-[#e0a52e]" /> +٢٠ ألف
                تحميل
              </span>
            </div>
          </div>

          {/* phone */}
          <PhoneMockup />
        </div>

        <Wave color="#faf3e7" />
      </section>

      {/* ============ CTA BANNER ============ */}
      <section className="mx-auto max-w-6xl px-5 py-16">
        <div className="relative flex flex-col items-center justify-between gap-6 overflow-hidden rounded-[2.25rem] bg-gradient-to-l from-[#e0a52e] to-[#b68614] px-8 py-11 text-center shadow-[0_35px_70px_-30px_rgba(182,134,20,0.6)] ring-1 ring-white/10 md:flex-row md:text-right">
          <div className="pointer-events-none absolute inset-0 opacity-[0.12] [background-image:radial-gradient(circle,#fff_1.4px,transparent_1.4px)] [background-size:24px_24px]" />
          <div className="relative">
            <h3 className="text-2xl font-black text-white md:text-3xl">
              جرّب طباخه النهارده
            </h3>
            <p className="mt-2 text-white/85">
              اطلب أكل بيتي طازة من أقرب طباخة ليك، ووصله لحد باب البيت.
            </p>
          </div>
          <a
            href="#app"
            className="relative shrink-0 rounded-full bg-[#7a0d0d] px-9 py-4 text-sm font-black text-white shadow-xl shadow-[#7a0d0d]/30 transition hover:-translate-y-0.5 hover:bg-[#5a0909]"
          >
            حمّل التطبيق دلوقتي
          </a>
        </div>
      </section>

      {/* ============ FOOTER ============ */}
      <footer id="contact" className="bg-[#3f0707] text-white/70">
        <div className="h-1 w-full bg-gradient-to-l from-[#b68614] via-[#ffd27a] to-[#b68614]" />
        <div className="mx-auto grid max-w-6xl gap-x-14 gap-y-12 px-5 py-16 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <div className="flex items-center gap-2.5 text-white">
              <img
                src={logoIcon}
                alt="طباخه"
                className="h-12 w-12 object-contain"
              />
              <span className="text-xl font-black">طباخه</span>
            </div>
            <p className="mt-4 text-sm leading-relaxed">
              منصة أكل بيتي بتوصّل طبخ الستّات الشاطرات لكل بيت في مصر.
            </p>
            <div className="mt-5 flex gap-3">
              {[Facebook, Instagram, Twitter].map((Icon, i) => (
                <a
                  key={i}
                  href="#"
                  className="grid h-9 w-9 place-items-center rounded-full bg-white/10 text-white transition hover:-translate-y-0.5 hover:bg-[#b68614]"
                >
                  <Icon size={16} />
                </a>
              ))}
            </div>
          </div>

          <div>
            <h5 className="mb-4 font-black text-white">روابط سريعة</h5>
            <ul className="space-y-2 text-sm">
              {navLinks.map((l) => (
                <li key={l.href}>
                  <a href={l.href} className="transition hover:text-white">
                    {l.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h5 className="mb-4 font-black text-white">الشركة</h5>
            <ul className="space-y-2 text-sm">
              {["عن طباخه", "الشروط والأحكام", "سياسة الخصوصية", "الوظائف"].map(
                (t) => (
                  <li key={t}>
                    <a href="#" className="transition hover:text-white">
                      {t}
                    </a>
                  </li>
                ),
              )}
            </ul>
          </div>

          <div>
            <h5 className="mb-4 font-black text-white">تواصل معنا</h5>
            <ul className="space-y-3 text-sm">
              <li className="flex items-center gap-2">
                <Phone size={15} className="text-[#b68614]" />
                <a href="tel:+201555641619" dir="ltr" className="transition hover:text-white">
                  01555641619
                </a>
              </li>
              <li className="flex items-center gap-2">
                <Mail size={15} className="text-[#b68614]" />
                <a
                  href="mailto:tabbakha.info@gmail.com"
                  className="transition hover:text-white"
                >
                  tabbakha.info@gmail.com
                </a>
              </li>
              <li className="flex items-center gap-2">
                <MapPin size={15} className="text-[#b68614]" /> القاهرة، مصر
              </li>
            </ul>
          </div>
        </div>
        <div className="border-t border-white/10 py-5 text-center text-xs">
          © ٢٠٢٦ طباخه. كل الحقوق محفوظة.
        </div>
      </footer>
    </div>
  );
}
