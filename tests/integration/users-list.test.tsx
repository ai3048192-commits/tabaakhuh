import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { screen, within, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderAtUsers } from '../helpers/harness'
import { installFetchMock, type FetchMock } from '../helpers/fetchMock'
import { fail, adminUserRow, usersPage } from '../helpers/fixtures'
import { userMessages as M } from '../../src/users/messages'

let fm: FetchMock
beforeEach(() => {
  fm = installFetchMock()
})
afterEach(() => {
  vi.unstubAllGlobals()
  localStorage.clear()
})

const LIST_P1 = 'GET /admin/users?page=1'

describe('Users Management (provisional /admin/users*)', () => {
  it('loads page 1 with no filters and renders the columns', async () => {
    fm.reply(LIST_P1, {
      json: usersPage(
        [adminUserRow({ id: 501, first_name: 'أحمد', last_name: 'محمود', role: 'cook' })],
        { total: 3 },
      ),
    })
    renderAtUsers(fm)
    await screen.findByText('أحمد محمود')
    expect(fm.count(LIST_P1)).toBe(1)
    expect(screen.getByText('user501@test.com')).toBeInTheDocument()
    expect(within(screen.getByText('أحمد محمود').closest('tr')!).getByText(M.roleLabels.cook)).toBeInTheDocument()
  })

  it('role and status filters go into the query and reset to page 1', async () => {
    const user = userEvent.setup()
    fm.reply(LIST_P1, { json: usersPage([adminUserRow({ id: 1 })], { total: 25 }) })
    fm.reply('GET /admin/users?role=driver&page=1', {
      json: usersPage([adminUserRow({ id: 2, role: 'driver' })], { total: 1 }),
    })
    fm.reply('GET /admin/users?role=driver&status=suspended&page=1', {
      json: usersPage([adminUserRow({ id: 3, role: 'driver', status: 'suspended' })], { total: 1 }),
    })
    renderAtUsers(fm)
    await screen.findByText('مستخدم 1')

    await user.selectOptions(screen.getByLabelText(M.filterRole), 'driver')
    await screen.findByText('مستخدم 2')
    await user.selectOptions(screen.getByLabelText(M.filterStatus), 'suspended')
    await screen.findByText('مستخدم 3')
    expect(fm.count('GET /admin/users?role=driver&status=suspended&page=1')).toBe(1)
  })

  it('a text search is debounced into ?q= and one request goes out', async () => {
    const user = userEvent.setup()
    fm.reply(LIST_P1, { json: usersPage([adminUserRow({ id: 1 })], { total: 5 }) })
    fm.reply('GET /admin/users?q=sara&page=1', {
      json: usersPage([adminUserRow({ id: 9, first_name: 'سارة' })], { total: 1 }),
    })
    renderAtUsers(fm)
    await screen.findByText('مستخدم 1')

    await user.type(screen.getByLabelText(M.searchLabel), 'sara')
    await screen.findByText('سارة 9')
    expect(fm.count('GET /admin/users?q=sara&page=1')).toBe(1)
  })

  it('suspending a user needs a reason, then confirms and re-fetches with a success toast', async () => {
    const user = userEvent.setup()
    fm.reply(
      LIST_P1,
      { json: usersPage([adminUserRow({ id: 7, first_name: 'خالد', status: 'active' })], { total: 1 }) },
      { json: usersPage([adminUserRow({ id: 7, first_name: 'خالد', status: 'suspended' })], { total: 1 }) },
    )
    fm.reply('PATCH /admin/users/7/status', {
      json: { success: true, data: { user: adminUserRow({ id: 7, status: 'suspended' }) }, message: 'User status updated.', errors: null },
    })
    renderAtUsers(fm)
    await screen.findByText('خالد 7')

    await user.click(within(screen.getByText('خالد 7').closest('tr')!).getByRole('button', { name: M.suspend }))

    // confirm is disabled until a reason is entered
    const confirm = screen.getByRole('button', { name: M.confirmCta })
    expect(confirm).toBeDisabled()
    await user.type(screen.getByLabelText(M.reasonLabel), 'نشاط مشبوه')
    await user.click(confirm)

    await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent(M.statusDoneToast))
    expect(fm.lastCall('PATCH /admin/users/7/status')?.body).toEqual({ status: 'suspended', reason: 'نشاط مشبوه' })
    expect(fm.count(LIST_P1)).toBe(2)
  })

  it('an offline first load shows a screen error + Retry', async () => {
    const user = userEvent.setup()
    fm.reply(LIST_P1, { networkError: true }, { json: usersPage([adminUserRow({ id: 1 })], { total: 1 }) })
    renderAtUsers(fm)
    expect(await screen.findByText(M.listError)).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: M.retry }))
    expect(await screen.findByText('مستخدم 1')).toBeInTheDocument()
  })

  it('a non-admin never reaches /users', async () => {
    fm.reply(LIST_P1, { status: 401, json: fail('Unauthenticated.') })
    renderAtUsers(fm, { admin: false })
    expect(await screen.findByText('صفحة تسجيل الدخول')).toBeInTheDocument()
  })
})
