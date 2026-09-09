import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderAtCities } from '../helpers/harness'
import { installFetchMock, type FetchMock } from '../helpers/fetchMock'
import { ok, fail, city, createdCity } from '../helpers/fixtures'
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

const only = [city({ id: 1, name_ar: 'القاهرة', name_en: 'Cairo' })]

/**
 * Register the ordered `GET /admin/cities` replies (call #1 is the mount load;
 * later replies feed the post-mutation re-fetch), render, and open the Add dialog.
 */
async function openAdd(...getReplies: MockReply[]) {
  const user = userEvent.setup()
  fm.reply(
    'GET /admin/cities',
    ...(getReplies.length > 0 ? getReplies : [{ json: ok(only) } satisfies MockReply]),
  )
  renderAtCities(fm)
  await screen.findByText('القاهرة')
  await user.click(screen.getByRole('button', { name: new RegExp(M.addCity) }))
  await screen.findByRole('dialog')
  return user
}

describe('US2 — add a city', () => {
  it('AC2: a blank field disables Save and sends no request', async () => {
    const user = await openAdd()
    await user.type(screen.getByLabelText(M.fieldNameAr), 'الإسكندرية')
    // name_en still empty
    expect(screen.getByRole('button', { name: M.save })).toBeDisabled()
    expect(fm.count('POST /admin/cities')).toBe(0)
  })

  it('AC3: a name longer than 255 chars is blocked with a length message', async () => {
    await openAdd()
    fireEvent.change(screen.getByLabelText(M.fieldNameAr), { target: { value: 'x'.repeat(256) } })
    fireEvent.change(screen.getByLabelText(M.fieldNameEn), { target: { value: 'Alexandria' } })
    expect(await screen.findByText(M.nameTooLong)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: M.save })).toBeDisabled()
    expect(fm.count('POST /admin/cities')).toBe(0)
  })

  it('AC1: valid names POST {name_ar,name_en}, re-fetch shows the active city, success toast', async () => {
    const user = await openAdd(
      { json: ok(only) },
      {
        json: ok([
          ...only,
          city({ id: 9, name_ar: 'الإسكندرية', name_en: 'Alexandria', is_active: true }),
        ]),
      },
    )
    fm.reply('POST /admin/cities', {
      status: 201,
      json: createdCity({ id: 9, name_ar: 'الإسكندرية', name_en: 'Alexandria' }),
    })

    await user.type(screen.getByLabelText(M.fieldNameAr), 'الإسكندرية')
    await user.type(screen.getByLabelText(M.fieldNameEn), 'Alexandria')
    await user.click(screen.getByRole('button', { name: M.save }))

    await waitFor(() => expect(fm.count('POST /admin/cities')).toBe(1))
    expect(fm.lastCall('POST /admin/cities')?.body).toEqual({
      name_ar: 'الإسكندرية',
      name_en: 'Alexandria',
    })
    await screen.findByText('الإسكندرية')
    const row = screen.getByText('الإسكندرية').closest('tr')!
    expect(row.textContent).toContain(M.statusActive)
    await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent(M.createdToast))
    expect(screen.queryByRole('dialog')).toBeNull()
  })

  it('AC4: a duplicate-name 422 shows a field message, keeps the dialog open, preserves values', async () => {
    const user = await openAdd()
    fm.reply('POST /admin/cities', {
      status: 422,
      json: fail('The given data was invalid.', { name_ar: ['اسم المدينة مستخدم بالفعل.'] }),
    })

    await user.type(screen.getByLabelText(M.fieldNameAr), 'القاهرة')
    await user.type(screen.getByLabelText(M.fieldNameEn), 'Cairo2')
    await user.click(screen.getByRole('button', { name: M.save }))

    expect(await screen.findByText('اسم المدينة مستخدم بالفعل.')).toBeInTheDocument()
    expect(screen.getByRole('dialog')).toBeInTheDocument()
    expect(screen.getByLabelText(M.fieldNameAr)).toHaveValue('القاهرة')
    expect(screen.getByLabelText(M.fieldNameEn)).toHaveValue('Cairo2')
    expect(fm.count('GET /admin/cities')).toBe(1) // no re-fetch
  })

  it('AC5: Save is disabled while in flight and a double click sends one POST', async () => {
    const user = await openAdd({ json: ok(only) }, { json: ok([...only, city({ id: 9 })]) })
    fm.reply('POST /admin/cities', { delayMs: 40, status: 201, json: createdCity({ id: 9 }) })

    await user.type(screen.getByLabelText(M.fieldNameAr), 'الإسكندرية')
    await user.type(screen.getByLabelText(M.fieldNameEn), 'Alexandria')
    const save = screen.getByRole('button', { name: M.save })
    await user.click(save)
    await user.click(save)
    await user.click(save)

    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
    expect(fm.count('POST /admin/cities')).toBe(1)
  })

  it('AC6: a 500 adds no city, preserves the form, shows a retryable toast, dialog stays open', async () => {
    const user = await openAdd()
    fm.reply('POST /admin/cities', { status: 500, json: fail('Something went wrong.') })

    await user.type(screen.getByLabelText(M.fieldNameAr), 'الإسكندرية')
    await user.type(screen.getByLabelText(M.fieldNameEn), 'Alexandria')
    await user.click(screen.getByRole('button', { name: M.save }))

    await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent(M.mutationRetryToast))
    expect(screen.getByRole('dialog')).toBeInTheDocument()
    expect(screen.getByLabelText(M.fieldNameAr)).toHaveValue('الإسكندرية')
    expect(fm.count('GET /admin/cities')).toBe(1)
  })

  it('AC7: cancelling the dialog creates nothing', async () => {
    const user = await openAdd()
    await user.click(screen.getByRole('button', { name: M.cancel }))
    expect(screen.queryByRole('dialog')).toBeNull()
    expect(fm.count('POST /admin/cities')).toBe(0)
  })

  it('re-fetches the list after a successful create (directory invalidation path)', async () => {
    const user = await openAdd({ json: ok(only) }, { json: ok([...only, city({ id: 9 })]) })
    fm.reply('POST /admin/cities', { status: 201, json: createdCity({ id: 9 }) })

    await user.type(screen.getByLabelText(M.fieldNameAr), 'الإسكندرية')
    await user.type(screen.getByLabelText(M.fieldNameEn), 'Alexandria')
    await user.click(screen.getByRole('button', { name: M.save }))

    // the post-success refresh re-hits GET /admin/cities
    await waitFor(() => expect(fm.count('GET /admin/cities')).toBe(2))
  })
})
