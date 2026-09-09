import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { screen, fireEvent, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderAtCities } from '../helpers/harness'
import { installFetchMock, type FetchMock } from '../helpers/fetchMock'
import { ok, fail, city, updatedCity } from '../helpers/fixtures'
import type { MockReply } from '../helpers/fetchMock'
import { cityMessages as M } from '../../src/cities/messages'

let fm: FetchMock

beforeEach(() => {
  fm = installFetchMock()
})
afterEach(() => {
  vi.unstubAllGlobals()
  localStorage.clear()
})

const initial = city({ id: 1, name_ar: 'القاهرة', name_en: 'Cairo', is_active: true })

/** Register the ordered `GET /admin/cities` replies, render, and open the Edit dialog. */
async function openEdit(...getReplies: MockReply[]) {
  const user = userEvent.setup()
  fm.reply(
    'GET /admin/cities',
    ...(getReplies.length > 0 ? getReplies : [{ json: ok([initial]) } satisfies MockReply]),
  )
  renderAtCities(fm)
  await screen.findByText('القاهرة')
  await user.click(screen.getByRole('button', { name: M.editLabel('القاهرة') }))
  await screen.findByRole('dialog')
  return user
}

describe('US3 — edit a city name', () => {
  it('AC1: the dialog opens pre-filled with the current names', async () => {
    await openEdit()
    expect(screen.getByLabelText(M.fieldNameAr)).toHaveValue('القاهرة')
    expect(screen.getByLabelText(M.fieldNameEn)).toHaveValue('Cairo')
  })

  it('AC2/SC-005: changing only the Arabic name PUTs {name_ar} and leaves English untouched', async () => {
    const user = await openEdit(
      { json: ok([initial]) },
      { json: ok([city({ id: 1, name_ar: 'القاهره', name_en: 'Cairo', is_active: true })]) },
    )
    fm.reply('PUT /admin/cities/1', {
      json: updatedCity({ id: 1, name_ar: 'القاهره', name_en: 'Cairo' }),
    })

    const ar = screen.getByLabelText(M.fieldNameAr)
    await user.clear(ar)
    await user.type(ar, 'القاهره')
    await user.click(screen.getByRole('button', { name: M.save }))

    await waitFor(() => expect(fm.count('PUT /admin/cities/1')).toBe(1))
    expect(fm.lastCall('PUT /admin/cities/1')?.body).toEqual({ name_ar: 'القاهره' })
    await screen.findByText('القاهره')
    expect(screen.getByText('Cairo')).toBeInTheDocument()
    await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent(M.updatedToast))
  })

  it('AC3: clearing both names blocks Save with an "at least one name" message; no request', async () => {
    const user = await openEdit()
    await user.clear(screen.getByLabelText(M.fieldNameAr))
    await user.clear(screen.getByLabelText(M.fieldNameEn))
    expect(await screen.findByText(M.atLeastOneName)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: M.save })).toBeDisabled()
    expect(fm.count('PUT /admin/cities/1')).toBe(0)
  })

  it('AC4: a > 255-char name is blocked with a length message', async () => {
    await openEdit()
    fireEvent.change(screen.getByLabelText(M.fieldNameEn), { target: { value: 'y'.repeat(256) } })
    expect(await screen.findByText(M.nameTooLong)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: M.save })).toBeDisabled()
  })

  it('AC5: a duplicate 422 shows a field message under English and keeps the dialog open', async () => {
    const user = await openEdit()
    fm.reply('PUT /admin/cities/1', {
      status: 422,
      json: fail('The given data was invalid.', { name_en: ['already in use'] }),
    })

    const en = screen.getByLabelText(M.fieldNameEn)
    await user.clear(en)
    await user.type(en, 'Giza')
    await user.click(screen.getByRole('button', { name: M.save }))

    expect(await screen.findByText('already in use')).toBeInTheDocument()
    expect(screen.getByRole('dialog')).toBeInTheDocument()
    expect(screen.getByLabelText(M.fieldNameEn)).toHaveValue('Giza')
    expect(fm.count('GET /admin/cities')).toBe(1)
  })

  it('AC6: a 404 closes the dialog, toasts "not found", and re-fetches', async () => {
    const user = await openEdit({ json: ok([initial]) }, { json: ok([]) })
    fm.reply('PUT /admin/cities/1', {
      status: 404,
      json: fail('The requested resource was not found.'),
    })

    const ar = screen.getByLabelText(M.fieldNameAr)
    await user.clear(ar)
    await user.type(ar, 'القاهره')
    await user.click(screen.getByRole('button', { name: M.save }))

    await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent(M.notFoundToast))
    expect(screen.queryByRole('dialog')).toBeNull()
    await waitFor(() => expect(fm.count('GET /admin/cities')).toBe(2))
  })

  it('AC8: a 500 leaves the name unchanged, keeps the dialog, shows a retryable toast', async () => {
    const user = await openEdit()
    fm.reply('PUT /admin/cities/1', { status: 500, json: fail('Something went wrong.') })

    const ar = screen.getByLabelText(M.fieldNameAr)
    await user.clear(ar)
    await user.type(ar, 'القاهره')
    await user.click(screen.getByRole('button', { name: M.save }))

    await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent(M.mutationRetryToast))
    expect(screen.getByRole('dialog')).toBeInTheDocument()
    const table = screen.getByRole('table')
    expect(within(table).getByText('القاهرة')).toBeInTheDocument()
    expect(fm.count('GET /admin/cities')).toBe(1)
  })

  it('AC9: cancelling changes nothing', async () => {
    const user = await openEdit()
    await user.click(screen.getByRole('button', { name: M.cancel }))
    expect(screen.queryByRole('dialog')).toBeNull()
    expect(fm.count('PUT /admin/cities/1')).toBe(0)
  })

  it('SC-012: two saves for the same city both succeed; the list shows the later name', async () => {
    const user = await openEdit(
      { json: ok([initial]) },
      { json: ok([city({ id: 1, name_ar: 'أ', name_en: 'Cairo', is_active: true })]) },
      { json: ok([city({ id: 1, name_ar: 'ب', name_en: 'Cairo', is_active: true })]) },
    )
    fm.reply(
      'PUT /admin/cities/1',
      { json: updatedCity({ id: 1, name_ar: 'أ', name_en: 'Cairo' }) },
      { json: updatedCity({ id: 1, name_ar: 'ب', name_en: 'Cairo' }) },
    )

    const ar = screen.getByLabelText(M.fieldNameAr)
    await user.clear(ar)
    await user.type(ar, 'أ')
    await user.click(screen.getByRole('button', { name: M.save }))
    await screen.findByText('أ')

    await user.click(screen.getByRole('button', { name: M.editLabel('أ') }))
    await screen.findByRole('dialog')
    const ar2 = screen.getByLabelText(M.fieldNameAr)
    await user.clear(ar2)
    await user.type(ar2, 'ب')
    await user.click(screen.getByRole('button', { name: M.save }))

    await screen.findByText('ب')
    expect(fm.count('PUT /admin/cities/1')).toBe(2)
  })
})
