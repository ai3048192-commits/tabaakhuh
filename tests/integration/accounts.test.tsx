import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderAtUsers } from '../helpers/harness'
import { installFetchMock, type FetchMock } from '../helpers/fetchMock'
import { ok, adminUserRow, usersPage, cookProfile } from '../helpers/fixtures'
import { userMessages as M } from '../../src/users/messages'

let fm: FetchMock
beforeEach(() => {
  fm = installFetchMock()
  fm.reply('GET /admin/cities', { json: ok([{ id: 3, name_ar: 'القاهرة', name_en: 'Cairo', is_active: true }]) })
})
afterEach(() => {
  vi.unstubAllGlobals()
  localStorage.clear()
})

describe('Per-role account management', () => {
  it('the cooks screen lists approved cooks only, without a role filter', async () => {
    fm.reply('GET /admin/users?role=cook&approval=approved&page=1', {
      json: usersPage([adminUserRow({ id: 31, role: 'cook', first_name: 'زينب', last_name: 'علي' })], { total: 1 }),
    })
    renderAtUsers(fm, { scope: 'cook' })

    expect(await screen.findByRole('heading', { name: M.scope.cook.title })).toBeInTheDocument()
    expect(await screen.findByText('زينب علي')).toBeInTheDocument()
    expect(screen.queryByLabelText(M.filterRole)).toBeNull()
  })

  it('the customers screen asks for customers (no approval filter)', async () => {
    fm.reply('GET /admin/users?role=customer&page=1', {
      json: usersPage([adminUserRow({ id: 5, role: 'customer', first_name: 'منى', last_name: 'حسن' })], { total: 1 }),
    })
    renderAtUsers(fm, { scope: 'customer' })
    expect(await screen.findByRole('heading', { name: M.scope.customer.title })).toBeInTheDocument()
    expect(await screen.findByText('منى حسن')).toBeInTheDocument()
    expect(fm.count('GET /admin/users?role=customer&page=1')).toBe(1)
  })

  it('opening a cook shows how long they have been on the app, their orders, earnings and registration data', async () => {
    const user = userEvent.setup()
    const joined = new Date(Date.now() - 65 * 86_400_000).toISOString()
    const row = adminUserRow({ id: 31, role: 'cook', first_name: 'زينب', last_name: 'علي', created_at: joined })
    fm.reply('GET /admin/users?role=cook&approval=approved&page=1', { json: usersPage([row], { total: 1 }) })
    fm.reply('GET /admin/users/31/overview', {
      json: ok({
        user: row,
        cook_profile: { ...cookProfile({ city_id: 3 }), store_name: 'مطبخ زينب' },
        contract: null,
        driver_profile: null,
        stats: { party: 'cook', total_orders: 12, completed_orders: 9, cancelled_orders: 1, amount_egp: 2450 },
      }),
    })
    renderAtUsers(fm, { scope: 'cook' })

    await user.click(within((await screen.findByText('زينب علي')).closest('tr')!).getByRole('button', { name: M.view }))
    const panel = await screen.findByRole('dialog', { name: M.detailTitle('زينب علي') })
    expect(await within(panel).findByText('مطبخ زينب')).toBeInTheDocument()
    expect(within(panel).getByText(/على التطبيق من شهرين/)).toBeInTheDocument()
    expect(within(panel).getByText('12')).toBeInTheDocument()
    expect(within(panel).getByText('2,450 ج.م')).toBeInTheDocument()
    expect(within(panel).getByText('أرباح الطلبات')).toBeInTheDocument()
    expect(within(panel).getByText('بيانات التسجيل كطباخة')).toBeInTheDocument()
    expect(within(panel).getByText('القاهرة')).toBeInTheDocument()
  })
})
