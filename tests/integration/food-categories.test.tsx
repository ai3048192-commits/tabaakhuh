import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { AuthProvider } from '../../src/auth/AuthContext'
import RequireAdmin from '../../src/auth/RequireAdmin'
import { STORAGE_KEYS } from '../../src/auth/authStorage'
import FoodCategoriesPage from '../../src/foodCategories/FoodCategoriesPage'
import type { FoodCategory } from '../../src/foodCategories/types'
import { installFetchMock, type FetchMock } from '../helpers/fetchMock'
import { adminUser, fail, ok } from '../helpers/fixtures'

let fm: FetchMock
beforeEach(() => {
  fm = installFetchMock()
})
afterEach(() => {
  vi.unstubAllGlobals()
  localStorage.clear()
})

function renderPage() {
  localStorage.setItem(STORAGE_KEYS.token, 'tok-admin')
  localStorage.setItem(STORAGE_KEYS.profile, JSON.stringify(adminUser))
  fm.reply('GET /auth/me', { json: ok({ user: adminUser }) })
  return render(
    <MemoryRouter initialEntries={['/food-categories']}>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<div>صفحة تسجيل الدخول</div>} />
          <Route path="/*" element={<RequireAdmin><FoodCategoriesPage /></RequireAdmin>} />
        </Routes>
      </AuthProvider>
    </MemoryRouter>,
  )
}

const mahshi: FoodCategory = { id: 1, name_ar: 'محاشي', name_en: 'Mahshi', image_url: null, sort_order: 20, is_active: true, dishes_count: 4 }
const grills: FoodCategory = { id: 2, name_ar: 'مشويات', name_en: 'Grills', image_url: 'https://cdn.test/g.jpg', sort_order: 10, is_active: true, dishes_count: 0 }

describe('Food categories', () => {
  it('lists categories in display order with their dish counts', async () => {
    fm.reply('GET /admin/food-categories', { json: ok([mahshi, grills]) })
    renderPage()

    const names = await screen.findAllByText(/^(محاشي|مشويات)$/)
    expect(names.map((n) => n.textContent)).toEqual(['مشويات', 'محاشي'])
    expect(screen.getByText('4 أكلة')).toBeInTheDocument()
  })

  it('adds a category and shows it without a reload', async () => {
    const user = userEvent.setup()
    fm.reply('GET /admin/food-categories', { json: ok([grills]) })
    fm.reply('POST /admin/food-categories', { status: 201, json: ok({ ...mahshi, dishes_count: undefined }) })
    renderPage()

    await screen.findByText('مشويات')
    await user.click(screen.getByRole('button', { name: 'إضافة تصنيف' }))
    const dialog = await screen.findByRole('dialog')
    await user.type(within(dialog).getByLabelText('الاسم بالعربي'), 'محاشي')
    await user.type(within(dialog).getByLabelText('الاسم بالإنجليزي'), 'Mahshi')
    await user.click(within(dialog).getByRole('button', { name: 'حفظ' }))

    await waitFor(() => expect(fm.count('POST /admin/food-categories')).toBe(1))
    expect(fm.lastCall('POST /admin/food-categories')?.body).toEqual({ name_ar: 'محاشي', name_en: 'Mahshi', image_url: null })
    expect(await screen.findByText('محاشي')).toBeInTheDocument()
    expect(screen.queryByRole('dialog')).toBeNull()
    expect(fm.count('GET /admin/food-categories')).toBe(1)
  })

  it('keeps the dialog open with the server message on a duplicate name', async () => {
    const user = userEvent.setup()
    fm.reply('GET /admin/food-categories', { json: ok([grills]) })
    fm.reply('POST /admin/food-categories', { status: 422, json: fail('في تصنيف بنفس الاسم.') })
    renderPage()

    await screen.findByText('مشويات')
    await user.click(screen.getByRole('button', { name: 'إضافة تصنيف' }))
    const dialog = await screen.findByRole('dialog')
    await user.type(within(dialog).getByLabelText('الاسم بالعربي'), 'مشويات')
    await user.type(within(dialog).getByLabelText('الاسم بالإنجليزي'), 'Grills')
    await user.click(within(dialog).getByRole('button', { name: 'حفظ' }))

    expect(await within(dialog).findByText('في تصنيف بنفس الاسم.')).toBeInTheDocument()
  })

  it('hides a category from the app', async () => {
    const user = userEvent.setup()
    fm.reply('GET /admin/food-categories', { json: ok([mahshi]) })
    fm.reply('PATCH /admin/food-categories/1/status', { json: ok({ ...mahshi, is_active: false }) })
    renderPage()

    await user.click(await screen.findByRole('button', { name: 'إخفاء محاشي' }))

    await waitFor(() => expect(fm.lastCall('PATCH /admin/food-categories/1/status')?.body).toEqual({ is_active: false }))
    expect(await screen.findByText('مخفي')).toBeInTheDocument()
    expect(screen.getByText('4 أكلة')).toBeInTheDocument() // count kept
  })

  it('warns how many dishes a delete leaves uncategorized, then deletes', async () => {
    const user = userEvent.setup()
    fm.reply('GET /admin/food-categories', { json: ok([mahshi, grills]) })
    fm.reply('DELETE /admin/food-categories/1', { json: ok(null) })
    renderPage()

    await user.click(await screen.findByRole('button', { name: 'مسح محاشي' }))
    const dialog = await screen.findByRole('dialog')
    expect(within(dialog).getByText(/4 أكلة هترجع من غير تصنيف/)).toBeInTheDocument()
    await user.click(within(dialog).getByRole('button', { name: 'مسح' }))

    await waitFor(() => expect(fm.count('DELETE /admin/food-categories/1')).toBe(1))
    await waitFor(() => expect(screen.queryByText('محاشي')).toBeNull())
    expect(screen.getByText('مشويات')).toBeInTheDocument()
  })
})
