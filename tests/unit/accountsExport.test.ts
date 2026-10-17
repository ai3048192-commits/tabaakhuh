import { describe, it, expect, vi } from 'vitest'
import { accountsSheetData, exportFileName } from '../../src/users/accountsExport'
import type { AccountExportRow } from '../../src/users/types'

const cook: AccountExportRow = {
  id: 9, first_name: 'سوسن', last_name: 'أحمد', email: 's@example.com', phone: '+201001234567',
  role: 'cook', status: 'active', email_verified: true, created_at: '2026-10-16T21:30:00Z',
  city: 'الإسماعيلية', approval_status: 'approved', store_name: 'مطبخ سوسن', area: 'Downtown',
  address: 'شارع المعاهدة', delivery_radius_km: 5, rating_avg: 4.5, rating_count: 2, is_open: false,
  vodafone_cash: '01011613195', instapay: null, vehicle_type: null, vehicle_model: null,
  vehicle_color: null, vehicle_plate: null, vehicle_year: null, total_orders: 12,
  completed_orders: 10, cancelled_orders: 1, amount_egp: 1450.5,
}

describe('accountsSheetData', () => {
  it('puts a header row first, then one row per account in Arabic labels', () => {
    const [header, first] = accountsSheetData([cook])
    const value = (label: string) => first[header.findIndex((h) => h.value === label)]

    expect(header[0]).toMatchObject({ value: 'رقم الحساب', fontWeight: 'bold' })
    expect(value('الدور')).toEqual({ value: 'طاهٍ', type: String })
    expect(value('حالة الطلب (طاهٍ / سائق)')).toEqual({ value: 'مقبول', type: String })
    expect(value('المطبخ مفتوح')).toEqual({ value: 'لا', type: String })
    expect(value('إجمالي الطلبات')).toEqual({ value: 12, type: Number })
    // 21:30 UTC is 00:30 the next day in Cairo (UTC+3 in October).
    expect(value('تاريخ التسجيل')).toEqual({ value: '2026-10-17 00:30', type: String })
    // Missing fields stay empty rather than printing "null".
    expect(value('إنستاباي')).toBeNull()
  })
})

describe('exportFileName', () => {
  it("dates the file on Cairo's calendar", () => {
    expect(exportFileName('xlsx', new Date('2026-10-16T22:30:00Z'))).toBe('tabbakha-accounts-2026-10-17.xlsx')
  })
})

describe('saveAccountsXlsx', () => {
  it('writes a real .xlsx (a zip) and hands it to the browser under the dated name', async () => {
    const { saveAccountsXlsx } = await import('../../src/users/accountsExport')
    let saved: Blob | null = null
    const create = vi.fn((b: Blob) => { saved = b; return 'blob:x' })
    vi.stubGlobal('URL', Object.assign(URL, { createObjectURL: create, revokeObjectURL: vi.fn() }))
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {})

    await saveAccountsXlsx([cook])

    expect(click).toHaveBeenCalledTimes(1)
    const bytes = new Uint8Array(await (saved as unknown as Blob).arrayBuffer())
    expect(String.fromCharCode(bytes[0], bytes[1])).toBe('PK')
    click.mockRestore()
    vi.unstubAllGlobals()
  })
})
