/**
 * How long an account has been on the platform, in everyday Arabic:
 * "انضم النهارده", "٥ أيام", "شهرين", "سنة و٣ شهور".
 */
const n = (v: number) => v.toLocaleString('ar-EG')

function days(d: number): string {
  if (d === 1) return 'يوم'
  if (d === 2) return 'يومين'
  return d <= 10 ? `${n(d)} أيام` : `${n(d)} يوم`
}
function months(m: number): string {
  if (m === 1) return 'شهر'
  if (m === 2) return 'شهرين'
  return m <= 10 ? `${n(m)} شهور` : `${n(m)} شهر`
}
function years(y: number): string {
  if (y === 1) return 'سنة'
  if (y === 2) return 'سنتين'
  return y <= 10 ? `${n(y)} سنين` : `${n(y)} سنة`
}

export function tenure(createdAt: string | null | undefined, now: Date = new Date()): string | null {
  if (!createdAt) return null
  const start = new Date(createdAt)
  if (Number.isNaN(start.getTime())) return null
  const d = Math.floor((now.getTime() - start.getTime()) / 86_400_000)
  if (d < 1) return 'انضم النهارده'
  if (d < 30) return days(d)
  const totalMonths = Math.floor(d / 30.44)
  if (totalMonths < 12) return months(totalMonths)
  const y = Math.floor(totalMonths / 12)
  const m = totalMonths % 12
  return m === 0 ? years(y) : `${years(y)} و${months(m)}`
}
