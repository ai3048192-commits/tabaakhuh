import { userMessages as M } from './messages'
import type { AccountExportRow } from './types'

/**
 * The all-accounts export. Excel is built here from `GET /admin/users/export`
 * (every column); the PDF is rendered by the backend and only saved here.
 */

const APPROVAL: Record<NonNullable<AccountExportRow['approval_status']>, string> = {
  pending: 'قيد المراجعة',
  approved: 'مقبول',
  rejected: 'مرفوض',
}

const yesNo = (v: boolean | null) => (v === null ? null : v ? 'نعم' : 'لا')

/** `2026-10-17 00:30` on Cairo's clock — a raw Date would land in Excel as UTC. */
function cairoDateTime(iso: string | null): string | null {
  if (!iso) return null
  const d = new Date(iso)
  return Number.isNaN(d.getTime())
    ? iso
    : d.toLocaleString('sv-SE', { timeZone: 'Africa/Cairo', hour12: false }).slice(0, 16)
}

/** `tabbakha-accounts-2026-10-17.xlsx` — the date is Cairo's, like the PDF's. */
export function exportFileName(ext: 'xlsx' | 'pdf', now = new Date()): string {
  const day = now.toLocaleDateString('en-CA', { timeZone: 'Africa/Cairo' })
  return `tabbakha-accounts-${day}.${ext}`
}

type Column = { header: string; width: number; value: (r: AccountExportRow) => string | number | null }

const COLUMNS: Column[] = [
  { header: 'رقم الحساب', width: 10, value: (r) => r.id },
  { header: 'الاسم الأول', width: 16, value: (r) => r.first_name },
  { header: 'الاسم الأخير', width: 16, value: (r) => r.last_name },
  { header: 'البريد الإلكتروني', width: 32, value: (r) => r.email },
  { header: 'الهاتف', width: 16, value: (r) => r.phone },
  { header: 'الدور', width: 9, value: (r) => M.roleLabels[r.role] ?? r.role },
  { header: 'الحالة', width: 9, value: (r) => M.statusLabels[r.status] ?? r.status },
  { header: 'البريد مفعّل', width: 11, value: (r) => yesNo(r.email_verified) },
  { header: 'تاريخ التسجيل', width: 18, value: (r) => cairoDateTime(r.created_at) },
  { header: 'المدينة', width: 14, value: (r) => r.city },
  { header: 'حالة الطلب (طاهٍ / سائق)', width: 18, value: (r) => (r.approval_status ? APPROVAL[r.approval_status] : null) },
  { header: 'اسم المطبخ', width: 20, value: (r) => r.store_name },
  { header: 'المنطقة', width: 14, value: (r) => r.area },
  { header: 'العنوان', width: 28, value: (r) => r.address },
  { header: 'نطاق التوصيل (كم)', width: 14, value: (r) => r.delivery_radius_km },
  { header: 'المطبخ مفتوح', width: 12, value: (r) => yesNo(r.is_open) },
  { header: 'فودافون كاش', width: 16, value: (r) => r.vodafone_cash },
  { header: 'إنستاباي', width: 22, value: (r) => r.instapay },
  { header: 'نوع المركبة', width: 12, value: (r) => r.vehicle_type },
  { header: 'موديل المركبة', width: 14, value: (r) => r.vehicle_model },
  { header: 'لون المركبة', width: 10, value: (r) => r.vehicle_color },
  { header: 'رقم اللوحة', width: 14, value: (r) => r.vehicle_plate },
  { header: 'سنة الصنع', width: 10, value: (r) => r.vehicle_year },
  { header: 'متوسط التقييم', width: 12, value: (r) => r.rating_avg },
  { header: 'عدد التقييمات', width: 12, value: (r) => r.rating_count },
  { header: 'إجمالي الطلبات', width: 13, value: (r) => r.total_orders },
  { header: 'طلبات مكتملة', width: 12, value: (r) => r.completed_orders },
  { header: 'طلبات ملغية', width: 12, value: (r) => r.cancelled_orders },
  { header: 'المبلغ (ج.م) — مدفوع للعميل / أرباح للطاهي والسائق', width: 22, value: (r) => r.amount_egp },
]

/** The sheet's cells: a styled header row, then one row per account. Exported for tests. */
export function accountsSheetData(rows: AccountExportRow[]) {
  const header = COLUMNS.map((c) => ({
    value: c.header,
    fontWeight: 'bold' as const,
    textColor: '#FFFFFF',
    backgroundColor: '#6B1010',
    wrap: true,
  }))
  const body = rows.map((r) =>
    COLUMNS.map((c) => {
      const value = c.value(r)
      if (value === null || value === '') return null
      if (typeof value === 'number') return { value, type: Number }
      return { value, type: String }
    }),
  )
  return [header, ...body]
}

/** Builds the .xlsx (right-to-left sheet, frozen header) and hands it to the browser. */
export async function saveAccountsXlsx(rows: AccountExportRow[]): Promise<void> {
  const { default: writeXlsxFile } = await import('write-excel-file/browser')
  const blob = await writeXlsxFile(accountsSheetData(rows), {
    sheet: 'الحسابات',
    rightToLeft: true,
    stickyRowsCount: 1,
    columns: COLUMNS.map((c) => ({ width: c.width })),
  }).toBlob()
  saveBlob(blob, exportFileName('xlsx'))
}

export function saveBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  // Revoke on the next tick — some browsers read the URL after click() returns.
  window.setTimeout(() => URL.revokeObjectURL(url), 0)
}
