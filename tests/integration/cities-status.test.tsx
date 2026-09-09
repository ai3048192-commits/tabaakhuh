import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderAtCities } from '../helpers/harness'
import { installFetchMock, type FetchMock } from '../helpers/fetchMock'
import { ok, fail, city, cityStatusChanged } from '../helpers/fixtures'
import { cityMessages as M } from '../../src/cities/messages'

let fm: FetchMock

beforeEach(() => {
  fm = installFetchMock()
})
afterEach(() => {
  vi.unstubAllGlobals()
  localStorage.clear()
})

const active = city({ id: 1, name_ar: 'القاهرة', name_en: 'Cairo', is_active: true })
const inactive = city({ id: 2, name_ar: 'الجيزة', name_en: 'Giza', is_active: false })

describe('US4 — activate / deactivate a city', () => {
  it('AC1: deactivating opens a confirm dialog then PATCHes {is_active:false} and re-fetches', async () => {
    const user = userEvent.setup()
    fm.reply(
      'GET /admin/cities',
      { json: ok([active]) },
      { json: ok([city({ id: 1, name_ar: 'القاهرة', name_en: 'Cairo', is_active: false })]) },
    )
    fm.reply('PATCH /admin/cities/1/status', { json: cityStatusChanged({ id: 1, is_active: false }) })
    renderAtCities(fm)

    await screen.findByText('القاهرة')
    await user.click(screen.getByRole('switch', { name: M.rowToggleToInactive('القاهرة') }))
    const dialog = await screen.findByRole('dialog')
    expect(within(dialog).getByText(M.toggleToInactiveTitle('القاهرة'))).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: M.confirmToggle }))

    await waitFor(() => expect(fm.count('PATCH /admin/cities/1/status')).toBe(1))
    expect(fm.lastCall('PATCH /admin/cities/1/status')?.body).toEqual({ is_active: false })
    await waitFor(() =>
      expect(screen.getByRole('switch', { name: M.rowToggleToActive('القاهرة') })).toBeInTheDocument(),
    )
    await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent(M.statusUpdatedToast))
  })

  it('AC2: reactivating an inactive city PATCHes {is_active:true}', async () => {
    const user = userEvent.setup()
    fm.reply(
      'GET /admin/cities',
      { json: ok([inactive]) },
      { json: ok([city({ id: 2, name_ar: 'الجيزة', name_en: 'Giza', is_active: true })]) },
    )
    fm.reply('PATCH /admin/cities/2/status', { json: cityStatusChanged({ id: 2, is_active: true }) })
    renderAtCities(fm)

    await screen.findByText('الجيزة')
    await user.click(screen.getByRole('switch', { name: M.rowToggleToActive('الجيزة') }))
    await user.click(await screen.findByRole('button', { name: M.confirmToggle }))

    await waitFor(() => expect(fm.lastCall('PATCH /admin/cities/2/status')?.body).toEqual({ is_active: true }))
  })

  it('AC3: cancelling the confirmation sends no PATCH', async () => {
    const user = userEvent.setup()
    fm.reply('GET /admin/cities', { json: ok([active]) })
    renderAtCities(fm)

    await screen.findByText('القاهرة')
    await user.click(screen.getByRole('switch', { name: M.rowToggleToInactive('القاهرة') }))
    await user.click(await screen.findByRole('button', { name: M.cancel }))

    expect(screen.queryByRole('dialog')).toBeNull()
    expect(fm.count('PATCH /admin/cities/1/status')).toBe(0)
  })

  it('AC4: only the affected row toggle is disabled in flight and a triple click sends one PATCH', async () => {
    const user = userEvent.setup()
    fm.reply(
      'GET /admin/cities',
      { json: ok([active, inactive]) },
      { json: ok([city({ id: 1, is_active: false }), inactive]) },
    )
    fm.reply('PATCH /admin/cities/1/status', { delayMs: 40, json: cityStatusChanged({ id: 1, is_active: false }) })
    renderAtCities(fm)

    await screen.findByText('القاهرة')
    await user.click(screen.getByRole('switch', { name: M.rowToggleToInactive('القاهرة') }))
    const confirm = await screen.findByRole('button', { name: M.confirmToggle })
    await user.click(confirm)
    await user.click(confirm)
    await user.click(confirm)

    // the other row's toggle stays interactive
    expect(screen.getByRole('switch', { name: M.rowToggleToActive('الجيزة') })).toBeEnabled()

    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
    expect(fm.count('PATCH /admin/cities/1/status')).toBe(1)
  })

  it('AC5: a 404 toasts "not found" and re-fetches', async () => {
    const user = userEvent.setup()
    fm.reply(
      'GET /admin/cities',
      { json: ok([active]) },
      { json: ok([]) },
    )
    fm.reply('PATCH /admin/cities/1/status', { status: 404, json: fail('The requested resource was not found.') })
    renderAtCities(fm)

    await screen.findByText('القاهرة')
    await user.click(screen.getByRole('switch', { name: M.rowToggleToInactive('القاهرة') }))
    await user.click(await screen.findByRole('button', { name: M.confirmToggle }))

    await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent(M.notFoundToast))
    await waitFor(() => expect(fm.count('GET /admin/cities')).toBe(2))
  })

  it('AC6: a 500 leaves the status unchanged and shows a retryable toast, no re-fetch', async () => {
    const user = userEvent.setup()
    fm.reply('GET /admin/cities', { json: ok([active]) })
    fm.reply('PATCH /admin/cities/1/status', { status: 500, json: fail('Something went wrong.') })
    renderAtCities(fm)

    await screen.findByText('القاهرة')
    await user.click(screen.getByRole('switch', { name: M.rowToggleToInactive('القاهرة') }))
    await user.click(await screen.findByRole('button', { name: M.confirmToggle }))

    await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent(M.mutationRetryToast))
    expect(screen.getByRole('switch', { name: M.rowToggleToInactive('القاهرة') })).toBeInTheDocument()
    expect(fm.count('GET /admin/cities')).toBe(1)
  })

  it('FR-026: no delete control is offered anywhere', async () => {
    fm.reply('GET /admin/cities', { json: ok([active]) })
    renderAtCities(fm)

    await screen.findByText('القاهرة')
    expect(screen.queryByRole('button', { name: /حذف|إزالة|delete|remove/i })).toBeNull()
  })
})
