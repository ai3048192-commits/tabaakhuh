import { Link } from 'react-router-dom'

/**
 * Catch-all for an unknown path. Without it, an unmatched route inside the
 * admin shell renders the chrome around an empty `<Routes>` — an apparently
 * broken page with no explanation and no way back.
 */
export default function NotFound() {
  return (
    <div dir="rtl" className="flex min-h-full items-center justify-center bg-[#f7f1e6] p-6">
      <div className="w-full max-w-md rounded-3xl border border-[#e8dfc9] bg-white p-8 text-center">
        <p className="mb-2 text-4xl font-black text-[#7a0d0d]">٤٠٤</p>
        <h1 className="mb-2 text-lg font-black text-gray-800">الصفحة غير موجودة</h1>
        <p className="mb-6 text-sm font-bold text-gray-500">
          الرابط اللي فتحته مش موجود أو اتغيّر.
        </p>
        <Link
          to="/dashboard"
          className="inline-block rounded-2xl bg-[#7a0d0d] px-6 py-3 text-sm font-black text-white"
        >
          الرجوع للوحة التحكم
        </Link>
      </div>
    </div>
  )
}
