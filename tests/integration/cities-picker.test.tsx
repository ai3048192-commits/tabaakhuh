import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderAtCities } from '../helpers/harness'
import { installFetchMock, type FetchMock } from '../helpers/fetchMock'
import { ok, fail, city, createdCity, cityStatusChanged } from '../helpers/fixtures'
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

const cairo = city({ id: 1, name_ar: 'القاهرة', name_en: 'Cairo', is_active: true })
const giza = city({ id: 2, name_ar: 'الجيزة', name_en: 'Giza', is_active: false })
const seed = [cairo, giza]

/** Register the ordered `GET /admin/cities` replies, render, and open the picker. */
async function openPicker(...getReplies: MockReply[]) {
  const user = userEvent.setup()
  fm.reply(
    'GET /admin/cities',
    ...(getReplies.length > 0 ? getReplies : [{ json: ok(seed) } satisfies MockReply]),
  )
  renderAtCities(fm)
  await screen.findByText('القاهرة')
  await user.click(screen.getByRole('button', { name: new RegExp(M.addCity) }))
  await screen.findByRole('dialog')
  return user
}

const tick = (nameAr: string) =>
  screen.getByRole('checkbox', { name: M.pickerRowLabel(nameAr) })

const applyBtn = () => screen.getByRole('button', { name: M.pickerApply })

describe('the governorate picker drawer replaces the add/edit name form', () => {
  it('lists every governorate, pre-ticking only the ones that are live and active', async () => {
    await openPicker()
    const dialog = screen.getByRole('dialog')
    expect(within(dialog).getAllByRole('checkbox').length).toBeGreaterThan(20)
    expect(tick('القاهرة')).toBeChecked() // live + active
    expect(tick('الجيزة')).not.toBeChecked() // live but deactivated
    expect(tick('أسوان')).not.toBeChecked() // never added
  })

  it('shows a city that is not a catalogue governorate, tagged as hand-added', async () => {
    const user = userEvent.setup()
    fm.reply('GET /admin/cities', {
      json: ok([cairo, city({ id: 5, name_ar: 'طنطا', name_en: 'Tanta', is_active: true })]),
    })
    renderAtCities(fm)
    await screen.findByText('طنطا')
    await user.click(screen.getByRole('button', { name: new RegExp(M.addCity) }))

    const dialog = await screen.findByRole('dialog')
    expect(tick('طنطا')).toBeChecked()
    expect(within(dialog).getByText(M.pickerCustomTag)).toBeInTheDocument()
  })

  it('opens with nothing to save and enables Apply only once something is ticked', async () => {
    const user = await openPicker()
    expect(applyBtn()).toBeDisabled()
    expect(screen.getByText(M.pickerNoChanges)).toBeInTheDocument()

    await user.click(tick('أسوان'))
    expect(applyBtn()).toBeEnabled()
    expect(screen.getByText(M.pickerChangeCount(1))).toBeInTheDocument()

    // ticking it back off returns to "no changes" — no request is queued
    await user.click(tick('أسوان'))
    expect(applyBtn()).toBeDisabled()
  })

  it('POSTs a newly ticked governorate with both names, then re-fetches and toasts', async () => {
    const user = await openPicker(
      { json: ok(seed) },
      { json: ok([...seed, city({ id: 9, name_ar: 'أسوان', name_en: 'Aswan', is_active: true })]) },
    )
    fm.reply('POST /admin/cities', {
      status: 201,
      json: createdCity({ id: 9, name_ar: 'أسوان', name_en: 'Aswan' }),
    })

    await user.click(tick('أسوان'))
    await user.click(applyBtn())

    await waitFor(() => expect(fm.count('POST /admin/cities')).toBe(1))
    expect(fm.lastCall('POST /admin/cities')?.body).toEqual({
      name_ar: 'أسوان',
      name_en: 'Aswan',
    })
    const row = (await screen.findByText('أسوان')).closest('tr')!
    expect(row.textContent).toContain(M.statusActive)
    await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent(M.updatedToast))
    expect(screen.queryByRole('dialog')).toBeNull()
  })

  it('re-activates a deactivated governorate with a status PATCH instead of creating it again', async () => {
    const user = await openPicker(
      { json: ok(seed) },
      { json: ok([cairo, city({ id: 2, name_ar: 'الجيزة', name_en: 'Giza', is_active: true })]) },
    )
    fm.reply('PATCH /admin/cities/2/status', {
      json: cityStatusChanged({ id: 2, name_ar: 'الجيزة', name_en: 'Giza', is_active: true }),
    })

    await user.click(tick('الجيزة'))
    await user.click(applyBtn())

    await waitFor(() => expect(fm.count('PATCH /admin/cities/2/status')).toBe(1))
    expect(fm.lastCall('PATCH /admin/cities/2/status')?.body).toEqual({ is_active: true })
    expect(fm.count('POST /admin/cities')).toBe(0)
  })

  it('un-ticking deactivates the governorate and never deletes it', async () => {
    const user = await openPicker(
      { json: ok(seed) },
      { json: ok([city({ id: 1, name_ar: 'القاهرة', name_en: 'Cairo', is_active: false }), giza]) },
    )
    fm.reply('PATCH /admin/cities/1/status', {
      json: cityStatusChanged({ id: 1, name_ar: 'القاهرة', name_en: 'Cairo', is_active: false }),
    })

    await user.click(tick('القاهرة'))
    await user.click(applyBtn())

    await waitFor(() => expect(fm.count('PATCH /admin/cities/1/status')).toBe(1))
    expect(fm.lastCall('PATCH /admin/cities/1/status')?.body).toEqual({ is_active: false })
    expect(fm.count('DELETE /admin/cities/1')).toBe(0)
    // still listed, now deactivated
    const row = (await screen.findByText('القاهرة')).closest('tr')!
    await waitFor(() => expect(row.textContent).toContain(M.statusInactive))
  })

  it('applies several ticks in one save', async () => {
    const user = await openPicker(
      { json: ok(seed) },
      {
        json: ok([
          city({ id: 1, name_ar: 'القاهرة', name_en: 'Cairo', is_active: false }),
          city({ id: 2, name_ar: 'الجيزة', name_en: 'Giza', is_active: true }),
          city({ id: 9, name_ar: 'أسوان', name_en: 'Aswan', is_active: true }),
        ]),
      },
    )
    fm.reply('PATCH /admin/cities/1/status', { json: cityStatusChanged({ id: 1 }) })
    fm.reply('PATCH /admin/cities/2/status', { json: cityStatusChanged({ id: 2 }) })
    fm.reply('POST /admin/cities', { status: 201, json: createdCity({ id: 9 }) })

    await user.click(tick('القاهرة')) // disable
    await user.click(tick('الجيزة')) // enable
    await user.click(tick('أسوان')) // create
    expect(screen.getByText(M.pickerChangeCount(3))).toBeInTheDocument()
    await user.click(applyBtn())

    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
    expect(fm.count('PATCH /admin/cities/1/status')).toBe(1)
    expect(fm.count('PATCH /admin/cities/2/status')).toBe(1)
    expect(fm.count('POST /admin/cities')).toBe(1)
  })

  it('a failing action stops the run, keeps the picker open and reports the partial save', async () => {
    const user = await openPicker(
      { json: ok(seed) },
      { json: ok([...seed, city({ id: 9, name_ar: 'أسوان', name_en: 'Aswan', is_active: true })]) },
    )
    fm.reply('POST /admin/cities', { status: 201, json: createdCity({ id: 9 }) })
    fm.reply('PATCH /admin/cities/1/status', { status: 500, json: fail('Something went wrong.') })

    await user.click(tick('القاهرة')) // disable — planned after the create below? no: row order
    await user.click(tick('أسوان'))
    await user.click(applyBtn())

    expect(await screen.findByText(M.pickerPartialError)).toBeInTheDocument()
    expect(screen.getByRole('dialog')).toBeInTheDocument()
    await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent(M.mutationRetryToast))
    // the failure came first (Cairo is row 1), so nothing after it ran
    expect(fm.count('POST /admin/cities')).toBe(0)
  })

  it('the search box narrows the list without losing ticks made before searching', async () => {
    const user = await openPicker()
    await user.click(tick('أسوان'))

    await user.type(screen.getByLabelText(M.pickerSearch), 'Giza')
    await waitFor(() => expect(screen.queryByLabelText(M.pickerRowLabel('أسوان'))).toBeNull())
    expect(tick('الجيزة')).toBeInTheDocument()
    // the earlier tick is still counted
    expect(screen.getByText(M.pickerChangeCount(1))).toBeInTheDocument()

    await user.clear(screen.getByLabelText(M.pickerSearch))
    expect(await screen.findByLabelText(M.pickerRowLabel('أسوان'))).toBeChecked()
  })

  it('shows an empty-state when nothing matches the search', async () => {
    const user = await openPicker()
    await user.type(screen.getByLabelText(M.pickerSearch), 'zzzz')
    expect(await screen.findByText(M.pickerEmptyMatch)).toBeInTheDocument()
  })

  it("a row's edit control opens the same picker, focused on that governorate", async () => {
    const user = userEvent.setup()
    fm.reply('GET /admin/cities', { json: ok(seed) })
    renderAtCities(fm)
    await screen.findByText('القاهرة')

    await user.click(screen.getByRole('button', { name: M.editLabel('القاهرة') }))
    await screen.findByRole('dialog')
    expect(tick('القاهرة')).toHaveFocus()
    expect(tick('الجيزة')).toBeInTheDocument()
  })

  it('clicking the backdrop closes the drawer and sends nothing', async () => {
    const user = await openPicker()
    await user.click(tick('أسوان'))

    // The backdrop sits immediately before the panel inside the drawer portal.
    const backdrop = screen.getByRole('dialog').previousElementSibling as HTMLElement
    expect(backdrop).toHaveAttribute('aria-hidden', 'true')
    await user.click(backdrop)

    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
    expect(fm.count('POST /admin/cities')).toBe(0)
  })

  it('Escape closes the drawer and sends nothing', async () => {
    const user = await openPicker()
    await user.click(tick('أسوان'))
    await user.keyboard('{Escape}')

    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
    expect(fm.count('POST /admin/cities')).toBe(0)
  })

  it('cancelling sends nothing', async () => {
    const user = await openPicker()
    await user.click(tick('أسوان'))
    await user.click(screen.getByRole('button', { name: M.cancel }))

    expect(screen.queryByRole('dialog')).toBeNull()
    expect(fm.count('POST /admin/cities')).toBe(0)
    expect(fm.count('GET /admin/cities')).toBe(1)
  })

  it('Apply is inert while a save is in flight, so a double click sends one request', async () => {
    const user = await openPicker(
      { json: ok(seed) },
      { json: ok([...seed, city({ id: 9 })]) },
    )
    fm.reply('POST /admin/cities', { delayMs: 40, status: 201, json: createdCity({ id: 9 }) })

    await user.click(tick('أسوان'))
    const apply = applyBtn()
    await user.click(apply)
    await user.click(apply)
    await user.click(apply)

    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
    expect(fm.count('POST /admin/cities')).toBe(1)
  })
})
