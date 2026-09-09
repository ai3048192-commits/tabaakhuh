import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { AuthProvider } from '../../src/auth/AuthContext'
import { STORAGE_KEYS } from '../../src/auth/authStorage'
import { __resetCityDirectory } from '../../src/cities/citiesApi'
import { installFetchMock, type FetchMock } from '../helpers/fetchMock'
import { ok, fail, adminUser, cityList } from '../helpers/fixtures'
import AddCookModal from '../../src/components/AddCookModal'
import AddUserModal from '../../src/components/AddUserModal'
import NotificationModal from '../../src/components/NotificationModal'
import type { ReactNode } from 'react'

let fm: FetchMock
beforeEach(() => {
  fm = installFetchMock()
  __resetCityDirectory()
  localStorage.setItem(STORAGE_KEYS.token, 'tok-admin')
  localStorage.setItem(STORAGE_KEYS.profile, JSON.stringify(adminUser))
  fm.reply('GET /auth/me', { json: ok({ user: adminUser }) })
  fm.reply('GET /admin/cities', { json: ok(cityList()) })
})
afterEach(() => {
  vi.unstubAllGlobals()
  localStorage.clear()
})

function mount(node: ReactNode) {
  return render(
    <MemoryRouter>
      <AuthProvider>{node}</AuthProvider>
    </MemoryRouter>,
  )
}

describe('Quick action — AddCookModal → POST /admin/cooks', () => {
  it('blocks submit and shows field errors when required fields are empty', async () => {
    const user = userEvent.setup()
    mount(<AddCookModal onClose={vi.fn()} />)

    await user.click(screen.getByRole('button', { name: 'حفظ البيانات' }))
    expect(screen.getAllByText('هذا الحقل مطلوب.').length).toBeGreaterThan(0)
    expect(fm.count('POST /admin/cooks')).toBe(0)
  })

  it('rejects a bad phone before sending', async () => {
    const user = userEvent.setup()
    mount(<AddCookModal onClose={vi.fn()} />)

    await user.type(screen.getByLabelText('الاسم الأول'), 'أحمد')
    await user.type(screen.getByLabelText('اسم العائلة'), 'محمد')
    await user.type(screen.getByLabelText('اسم المتجر'), 'مطبخ أحمد')
    await user.type(screen.getByLabelText('رقم الهاتف'), '12')
    await user.type(screen.getByLabelText('البريد الإلكتروني'), 'a@b.com')
    await user.type(screen.getByLabelText('كلمة المرور'), 'secret12')
    await user.click(screen.getByRole('button', { name: 'حفظ البيانات' }))

    expect(screen.getByText(/رقم هاتف غير صالح/)).toBeInTheDocument()
    expect(fm.count('POST /admin/cooks')).toBe(0)
  })

  it('sends the snake_case payload on a valid form and closes on success', async () => {
    const user = userEvent.setup()
    const onClose = vi.fn()
    vi.useFakeTimers({ shouldAdvanceTime: true })
    fm.reply('POST /admin/cooks', { status: 201, json: ok({ id: 12 }, 'Cook created.') })
    mount(<AddCookModal onClose={onClose} />)

    await user.type(screen.getByLabelText('الاسم الأول'), 'أحمد')
    await user.type(screen.getByLabelText('اسم العائلة'), 'محمد')
    await user.type(screen.getByLabelText('اسم المتجر'), 'مطبخ أحمد')
    await user.type(screen.getByLabelText('رقم الهاتف'), '+201001234567')
    await user.type(screen.getByLabelText('البريد الإلكتروني'), 'a@b.com')
    await user.type(screen.getByLabelText('كلمة المرور'), 'secret12')
    await user.click(screen.getByRole('button', { name: 'حفظ البيانات' }))

    await waitFor(() => expect(fm.count('POST /admin/cooks')).toBe(1))
    expect(fm.lastCall('POST /admin/cooks')?.body).toEqual({
      first_name: 'أحمد', last_name: 'محمد', email: 'a@b.com',
      phone: '+201001234567', password: 'secret12', store_name: 'مطبخ أحمد',
    })
    expect((await screen.findAllByText('تمت إضافة الطباخة بنجاح.')).length).toBeGreaterThan(0)
    await vi.advanceTimersByTimeAsync(1000)
    expect(onClose).toHaveBeenCalled()
    vi.useRealTimers()
  })

  it('maps a 422 errors map onto the fields and keeps the modal open', async () => {
    const user = userEvent.setup()
    fm.reply('POST /admin/cooks', {
      status: 422,
      json: fail('The given data was invalid.', { email: ['البريد مستخدم بالفعل.'] }),
    })
    mount(<AddCookModal onClose={vi.fn()} />)

    await user.type(screen.getByLabelText('الاسم الأول'), 'أحمد')
    await user.type(screen.getByLabelText('اسم العائلة'), 'محمد')
    await user.type(screen.getByLabelText('اسم المتجر'), 'مطبخ أحمد')
    await user.type(screen.getByLabelText('رقم الهاتف'), '+201001234567')
    await user.type(screen.getByLabelText('البريد الإلكتروني'), 'a@b.com')
    await user.type(screen.getByLabelText('كلمة المرور'), 'secret12')
    await user.click(screen.getByRole('button', { name: 'حفظ البيانات' }))

    expect(await screen.findByText('البريد مستخدم بالفعل.')).toBeInTheDocument()
    expect(screen.getByRole('dialog')).toBeInTheDocument()
  })
})

describe('Quick action — AddUserModal → POST /admin/users', () => {
  it('sends first_name/last_name/email/phone/password/role', async () => {
    const user = userEvent.setup()
    fm.reply('POST /admin/users', { status: 201, json: ok({ id: 99 }, 'User created.') })
    mount(<AddUserModal onClose={vi.fn()} />)

    await user.type(screen.getByLabelText('الاسم الأول'), 'سارة')
    await user.type(screen.getByLabelText('اسم العائلة'), 'علي')
    await user.type(screen.getByLabelText('رقم الجوال'), '+201001234567')
    await user.type(screen.getByLabelText('البريد الإلكتروني'), 's@x.com')
    await user.type(screen.getByLabelText('كلمة المرور'), 'password1')
    await user.selectOptions(screen.getByLabelText('الدور'), 'driver')
    await user.click(screen.getByRole('button', { name: 'إنشاء الحساب' }))

    await waitFor(() => expect(fm.count('POST /admin/users')).toBe(1))
    expect(fm.lastCall('POST /admin/users')?.body).toEqual({
      first_name: 'سارة', last_name: 'علي', email: 's@x.com',
      phone: '+201001234567', password: 'password1', role: 'driver',
    })
  })
})

describe('Quick action — NotificationModal → POST /admin/notifications', () => {
  it('sends title/body/audience (English audience value)', async () => {
    const user = userEvent.setup()
    fm.reply('POST /admin/notifications', { status: 201, json: ok({ id: 1 }, 'Sent.') })
    mount(<NotificationModal onClose={vi.fn()} />)

    await user.type(screen.getByLabelText('عنوان الإشعار'), 'تحديث')
    await user.type(screen.getByLabelText('محتوى الرسالة'), 'عيد سعيد')
    await user.click(screen.getByRole('button', { name: 'الطباخات' })) // audience = cooks
    await user.click(screen.getByRole('button', { name: 'اعتماد وإرسال الإشعار' }))

    await waitFor(() => expect(fm.count('POST /admin/notifications')).toBe(1))
    expect(fm.lastCall('POST /admin/notifications')?.body).toEqual({
      title: 'تحديث', body: 'عيد سعيد', audience: 'cooks',
    })
  })

  it('blocks an over-long body before sending', async () => {
    const user = userEvent.setup()
    mount(<NotificationModal onClose={vi.fn()} />)
    await user.type(screen.getByLabelText('عنوان الإشعار'), 'x')
    // paste a >2000 char body
    const ta = screen.getByLabelText('محتوى الرسالة')
    await user.click(ta)
    await user.paste('y'.repeat(2001))
    await user.click(screen.getByRole('button', { name: 'اعتماد وإرسال الإشعار' }))

    expect(screen.getByText(/الحد الأقصى 2000/)).toBeInTheDocument()
    expect(fm.count('POST /admin/notifications')).toBe(0)
  })
})
