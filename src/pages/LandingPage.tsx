import { useState } from "react";
import { Link } from "react-router-dom";
import heroFood from "../assets/Egyptian Home Food.png";
import logoIcon from "../assets/logo_icon_trim.png";
import {
  ChefHat,
  Menu,
  X,
  ArrowLeft,
  Leaf,
  HeartHandshake,
  ShieldCheck,
  Clock,
  Sparkles,
  Star,
  Search,
  Bell,
  MapPin,
  Home,
  User,
  ShoppingBag,
  ClipboardList,
  Wallet,
  CreditCard,
  PackageCheck,
  BadgeCheck,
  CheckCircle2,
  Play,
  Apple,
  Phone,
  Mail,
  Facebook,
  Instagram,
  Twitter,
  Signal,
  Wifi,
  BatteryFull,
  LogIn,
} from "lucide-react";

/* ------------------------------------------------------------------ */
/*  Small building blocks                                              */
/* ------------------------------------------------------------------ */

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
    <div className="text-center max-w-2xl mx-auto mb-12">
      <span className="inline-flex items-center gap-2 text-[#b68614] font-black text-sm tracking-wide">
        <span className="h-px w-6 bg-[#b68614]" />
        {kicker}
        <span className="h-px w-6 bg-[#b68614]" />
      </span>
      <h2 className="mt-3 text-3xl md:text-4xl font-black text-[#7a0d0d]">
        {title}
      </h2>
      {subtitle && (
        <p className="mt-3 text-gray-600 leading-relaxed">{subtitle}</p>
      )}
    </div>
  );
}

const dishes = [
  { name: "كشري بلدي", emoji: "🍲", rate: "٤.٩", price: "٤٥ ج" },
  { name: "محشي كرنب", emoji: "🥬", rate: "٤.٨", price: "٦٥ ج" },
  { name: "فراخ مشوية", emoji: "🍗", rate: "٥.٠", price: "٩٠ ج" },
  { name: "أرز معمر", emoji: "🍚", rate: "٤.٧", price: "٥٥ ج" },
];

/* ------------------------------------------------------------------ */
/*  The phone mockup (the centre-piece)                                */
/* ------------------------------------------------------------------ */

function PhoneMockup() {
  return (
    <div className="relative flex justify-center scale-[0.82] sm:scale-90 lg:scale-100 origin-center lg:pl-16 xl:pl-24">
      {/* glow blobs */}
      <div className="pointer-events-none absolute -inset-16 -z-10">
        <div className="lp-glow absolute right-2 top-8 h-56 w-56 rounded-full bg-[#b68614] blur-3xl opacity-50" />
        <div className="lp-glow absolute left-0 bottom-10 h-64 w-64 rounded-full bg-[#ff6b6b] blur-3xl opacity-30" />
        <div className="absolute left-1/2 top-1/2 h-72 w-72 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#ffd27a] blur-[100px] opacity-20" />
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
                <Signal size={13} /> <Wifi size={13} />{" "}
                <BatteryFull size={15} />
              </div>
            </div>

            {/* app header */}
            <div className="mx-3 mt-1.5 rounded-[1.6rem] bg-gradient-to-br from-[#7a0d0d] to-[#9a1212] px-4 pt-4 pb-5 text-white shadow-lg">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <img
                    src={logoIcon}
                    alt=""
                    className="h-7 w-7 object-contain"
                  />
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
                      : "bg-white text-[#7a0d0d] border border-[#efe6d2]"
                  }`}
                >
                  {c}
                </span>
              ))}
            </div>

            {/* section title */}
            <div className="flex items-center justify-between px-4 pt-4 pb-2">
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
                  <div className="flex h-14 items-center justify-center rounded-xl bg-gradient-to-br from-[#fbeede] to-[#f3d9b8] text-2xl">
                    {d.emoji}
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
                <span className="absolute -right-1 -top-1 h-3 w-3 rounded-full bg-[#b68614] text-[7px] font-black text-white grid place-items-center">
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
              <p className="text-[10px] font-bold text-gray-400">
                تقييم العملاء
              </p>
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

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */

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

export default function LandingPage() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [tab, setTab] = useState<"client" | "cook">("client");
  const steps = tab === "client" ? clientSteps : cookSteps;

  return (
    <div
      dir="rtl"
      className="min-h-screen overflow-x-hidden bg-[#f7f1e6] text-gray-800"
    >
      {/* ============ NAVBAR ============ */}
      <header className="sticky top-0 z-50 border-b border-[#b68614]/30 bg-[#7a0d0d]/95 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-2.5">
          <a href="#home" className="flex items-center">
            <img
              src={logoIcon}
              alt="طباخه"
              className="h-10 w-auto object-contain md:h-12"
            />
          </a>

          <nav className="hidden items-center gap-7 md:flex">
            {navLinks.map((l) => (
              <a
                key={l.href}
                href={l.href}
                className="text-sm font-bold text-white/80 transition hover:text-white"
              >
                {l.label}
              </a>
            ))}
          </nav>

          <Link
            to="/login"
            className="hidden items-center gap-2 rounded-xl bg-[#b68614] px-5 py-2.5 text-sm font-black text-white shadow-sm transition hover:bg-[#a2760f] md:flex"
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
          <div className="border-t border-[#b68614]/30 bg-[#7a0d0d] px-5 py-4 md:hidden">
            <div className="flex flex-col gap-3">
              {navLinks.map((l) => (
                <a
                  key={l.href}
                  href={l.href}
                  onClick={() => setMenuOpen(false)}
                  className="text-sm font-bold text-white/85"
                >
                  {l.label}
                </a>
              ))}
              <Link
                to="/login"
                className="mt-2 flex items-center justify-center gap-2 rounded-xl bg-[#b68614] px-5 py-2.5 text-center text-sm font-black text-white"
              >
                <LogIn size={16} />
                تسجيل دخول
              </Link>
            </div>
          </div>
        )}
      </header>

      {/* ============ HERO ============ */}
      <section id="home" className="mx-auto max-w-6xl px-5 pt-10 pb-16">
        <div className="overflow-hidden rounded-[2.5rem] bg-gradient-to-bl from-[#7a0d0d] to-[#5a0909] px-7 py-12 md:px-14 md:py-16">
          <div className="flex flex-col items-center gap-10 md:flex-row-reverse md:items-center md:gap-14">
            {/* food circle */}
            <div className="relative shrink-0">
              <div className="lp-glow absolute -inset-4 rounded-full border-4 border-dashed border-[#b68614]/50" />
              <div className="relative h-64 w-64 overflow-hidden rounded-full shadow-2xl ring-8 ring-[#f7f1e6]/10 md:h-80 md:w-80">
                <img
                  src={heroFood}
                  alt="سفرة أكل بيتي مصري"
                  className="h-full w-full object-cover"
                />
                <div className="pointer-events-none absolute inset-0 rounded-full ring-1 ring-inset ring-black/10" />
              </div>
              <span className="lp-float-soft absolute -right-3 top-6 text-3xl drop-shadow-lg">
                🌶️
              </span>
              <span className="lp-float-delay absolute -left-2 bottom-10 text-3xl drop-shadow-lg">
                🫓
              </span>
            </div>

            {/* copy */}
            <div className="text-center md:text-right">
              <h1 className="text-4xl font-black leading-tight text-white md:text-5xl">
                أكل بيتي،
                <br />
                من إيدين أمينة
              </h1>
              <p className="mx-auto mt-5 max-w-md text-base leading-relaxed text-white/80 md:mx-0">
                اطلبي أكل بيتي طازة من أحسن ستّات بيوت في منطقتك، متحضّر بحب
                ووصله لحد باب بيتك.
              </p>
              <div className="mt-7 flex flex-wrap justify-center gap-3 md:justify-start">
                <a
                  href="#app"
                  className="rounded-xl bg-[#b68614] px-7 py-3.5 text-sm font-black text-white shadow-lg transition hover:bg-[#a2760f]"
                >
                  اطلب دلوقتي
                </a>
                <a
                  href="#how"
                  className="rounded-xl border border-white/40 px-7 py-3.5 text-sm font-black text-white transition hover:bg-white/10"
                >
                  اعرف أكتر
                </a>
              </div>
              <p className="mt-6 flex items-center justify-center gap-2 text-xs font-bold text-white/60 md:justify-start">
                <Sparkles size={14} className="text-[#b68614]" />
                أكتر من ٥٠٠ طباخة · ٢٠ ألف طلب ناجح
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ============ WHY ============ */}
      <section id="why" className="mx-auto max-w-6xl px-5 py-14">
        <SectionHeading kicker="ليه طباخه؟" title="أكل بضمير، وتجربة مريحة" />
        <div className="grid gap-5 md:grid-cols-2">
          <div className="rounded-[1.75rem] bg-gradient-to-br from-[#7a0d0d] to-[#9a1212] p-8 text-white shadow-lg">
            <div className="mb-4 grid h-12 w-12 place-items-center rounded-2xl bg-white/15">
              <Leaf size={24} className="text-yellow-400" />
            </div>
            <h3 className="text-xl font-black">أكل صحي وطازة</h3>
            <p className="mt-2 leading-relaxed text-white/80">
              كل الأصناف بتتحضّر يوم الطلب من مكوّنات طازة، من غير مواد حافظة
              ولا تلوين.
            </p>
          </div>
          <div className="rounded-[1.75rem] border border-[#e8dfc9] bg-white p-8 shadow-sm">
            <div className="mb-4 grid h-12 w-12 place-items-center rounded-2xl bg-[#7a0d0d]/10">
              <HeartHandshake size={24} className="text-[#7a0d0d]" />
            </div>
            <h3 className="text-xl font-black text-[#7a0d0d]">
              بتدعمي ستّ بيت
            </h3>
            <p className="mt-2 leading-relaxed text-gray-600">
              كل طلب بيوصل دخل لأسرة مصرية، وبيدّي فرصة لستّات شاطرة في المطبخ
              إنها تكسب من شغل إيدها.
            </p>
          </div>
        </div>

        <div className="mt-5 grid gap-4 sm:grid-cols-3">
          {[
            {
              icon: ShieldCheck,
              t: "طباخات موثّقة",
              d: "مراجعة بيانات ومطبخ كل طباخة قبل التفعيل.",
            },
            {
              icon: Clock,
              t: "توصيل سريع",
              d: "متوسط وقت التوصيل ٣٠ – ٤٥ دقيقة.",
            },
            {
              icon: Sparkles,
              t: "نقاط ومكافآت",
              d: "اكسبي نقاط مع كل أوردر واستبدليها خصومات.",
            },
          ].map((f) => (
            <div
              key={f.t}
              className="rounded-2xl border border-[#e8dfc9] bg-[#fcf9f2] p-5"
            >
              <f.icon size={22} className="text-[#b68614]" />
              <h4 className="mt-3 font-black text-gray-800">{f.t}</h4>
              <p className="mt-1 text-sm text-gray-500">{f.d}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ============ BRAND BAND ============ */}
      <section className="bg-[#fcf9f2] py-16">
        <div className="mx-auto max-w-3xl px-5 text-center">
          <div className="mx-auto mb-6 h-px w-24 bg-[#b68614]" />
          <p className="text-3xl font-black text-[#7a0d0d] md:text-4xl">
            «أكل بيتي… من إيدين أمينة»
          </p>
          <p className="mt-4 text-gray-600">
            من مطبخ البيت لباب بيتك، بنفس الطعم اللي اتربّينا عليه.
          </p>
          <div className="mx-auto mt-6 h-px w-24 bg-[#b68614]" />
        </div>
      </section>

      {/* ============ HOW ============ */}
      <section id="how" className="mx-auto max-w-6xl px-5 py-16">
        <SectionHeading kicker="بتشتغل إزاي؟" title="٤ خطوات وبس" />

        <div className="mb-10 flex justify-center">
          <div className="inline-flex rounded-2xl border border-[#e8dfc9] bg-white p-1">
            <button
              onClick={() => setTab("client")}
              className={`rounded-xl px-6 py-2.5 text-sm font-black transition ${
                tab === "client" ? "bg-[#7a0d0d] text-white" : "text-gray-500"
              }`}
            >
              كعميل
            </button>
            <button
              onClick={() => setTab("cook")}
              className={`rounded-xl px-6 py-2.5 text-sm font-black transition ${
                tab === "cook" ? "bg-[#7a0d0d] text-white" : "text-gray-500"
              }`}
            >
              كطباخة
            </button>
          </div>
        </div>

        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {steps.map((s, i) => (
            <div
              key={s.title}
              className="relative rounded-2xl border border-[#e8dfc9] bg-white p-6 shadow-sm"
            >
              <span className="absolute left-5 top-5 text-4xl font-black text-[#f0e6cf]">
                {["١", "٢", "٣", "٤"][i]}
              </span>
              <div className="relative grid h-12 w-12 place-items-center rounded-2xl bg-[#7a0d0d]/10 text-[#7a0d0d]">
                <s.icon size={24} />
              </div>
              <h4 className="relative mt-4 font-black text-gray-800">
                {s.title}
              </h4>
              <p className="relative mt-1 text-sm leading-relaxed text-gray-500">
                {s.text}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* ============ APP DOWNLOAD ============ */}
      <section
        id="app"
        className="relative overflow-hidden bg-gradient-to-bl from-[#7a0d0d] to-[#5a0909]"
      >
        <div className="pointer-events-none absolute inset-0 opacity-[0.07] [background-image:radial-gradient(circle,#fff_1.5px,transparent_1.5px)] [background-size:26px_26px]" />
        <div className="relative mx-auto flex max-w-6xl flex-col items-center gap-16 px-5 py-20 lg:flex-row lg:justify-between">
          {/* copy + badges */}
          <div className="max-w-lg text-center lg:text-right">
            <h2 className="text-3xl font-black text-white md:text-4xl">
              حمّل تطبيق طباخه
            </h2>
            <p className="mt-4 leading-relaxed text-white/80">
              اطلب، تابع طلبك لحظة بلحظة، واكسب نقاط مع كل أوردر. التطبيق متاح
              على أندرويد و iOS، خفيف وسريع.
            </p>

            <div className="mt-8 flex flex-wrap justify-center gap-4 lg:justify-start">
              <a
                href="#"
                className="flex items-center gap-3 rounded-2xl bg-black px-5 py-3 text-white ring-1 ring-white/15 transition hover:bg-black/80"
              >
                <Play size={26} className="text-[#b68614]" />
                <span className="text-right leading-tight">
                  <span className="block text-[10px] font-bold text-white/60">
                    متاح على
                  </span>
                  <span className="block text-base font-black">
                    Google Play
                  </span>
                </span>
              </a>
              <a
                href="#"
                className="flex items-center gap-3 rounded-2xl bg-black px-5 py-3 text-white ring-1 ring-white/15 transition hover:bg-black/80"
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

            <div className="mt-8 flex items-center justify-center gap-6 text-white/70 lg:justify-start">
              <span className="flex items-center gap-2 text-sm font-bold">
                <Star size={16} className="fill-[#b68614] text-[#b68614]" /> ٤.٩
                تقييم المتجر
              </span>
              <span className="flex items-center gap-2 text-sm font-bold">
                <PackageCheck size={16} className="text-[#b68614]" /> +٢٠ ألف
                تحميل
              </span>
            </div>
          </div>

          {/* phone */}
          <PhoneMockup />
        </div>
      </section>

      {/* ============ BECOME A COOK ============ */}
      <section className="mx-auto max-w-6xl px-5 py-16">
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
              className="rounded-2xl border border-[#e8dfc9] bg-[#fcf9f2] p-7 text-center"
            >
              <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-[#7a0d0d] text-white">
                <c.icon size={26} />
              </div>
              <h4 className="mt-4 text-lg font-black text-[#7a0d0d]">{c.t}</h4>
              <p className="mt-2 text-sm text-gray-600">{c.d}</p>
            </div>
          ))}
        </div>
        <div className="mt-8 text-center">
          <a
            href="#app"
            className="inline-flex items-center gap-2 rounded-xl bg-[#b68614] px-8 py-3.5 text-sm font-black text-white shadow-lg transition hover:bg-[#a2760f]"
          >
            حمّلي تطبيق طباخه وابدئي <ArrowLeft size={18} />
          </a>
        </div>
      </section>

      {/* ============ CTA BANNER ============ */}
      <section className="mx-auto max-w-6xl px-5 pb-16">
        <div className="flex flex-col items-center justify-between gap-6 rounded-[2rem] bg-gradient-to-l from-[#b68614] to-[#9a6f10] px-8 py-10 text-center md:flex-row md:text-right">
          <div>
            <h3 className="text-2xl font-black text-white md:text-3xl">
              جرّب طباخه النهارده
            </h3>
            <p className="mt-2 text-white/85">
              اطلب أكل بيتي طازة من أقرب طباخة ليك، ووصله لحد باب البيت.
            </p>
          </div>
          <a
            href="#app"
            className="shrink-0 rounded-xl bg-[#7a0d0d] px-8 py-4 text-sm font-black text-white shadow-lg transition hover:bg-[#5a0909]"
          >
            حمّل التطبيق دلوقتي
          </a>
        </div>
      </section>

      {/* ============ FOOTER ============ */}
      <footer id="contact" className="bg-[#3f0707] text-white/70">
        <div className="mx-auto grid max-w-6xl gap-10 px-5 py-14 sm:grid-cols-2 lg:grid-cols-4">
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
                  className="grid h-9 w-9 place-items-center rounded-xl bg-white/10 text-white transition hover:bg-[#b68614]"
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
                <Phone size={15} className="text-[#b68614]" /> ٠١٠٠ ٠٠٠ ٠٠٠٠
              </li>
              <li className="flex items-center gap-2">
                <Mail size={15} className="text-[#b68614]" /> hello@tabkha.app
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
