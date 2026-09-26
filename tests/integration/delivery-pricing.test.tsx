import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderAtDeliveryPricing } from '../helpers/harness'
import { installFetchMock, type FetchMock } from '../helpers/fetchMock'
import { fail, ok } from '../helpers/fixtures'
import { areaMessages as M } from '../../src/areas/messages'
import type { Area } from '../../src/areas/types'

let fm: FetchMock
beforeEach(() => {
  fm = installFetchMock()
})
afterEach(() => {
  vi.unstubAllGlobals()
  localStorage.clear()
})

const cities = [
  { id: 1, name_ar: 'القاهرة', name_en: 'Cairo', is_active: true },
  { id: 2, name_ar: 'الجيزة', name_en: 'Giza', is_active: true },
]
const nasr: Area = { id: 10, city_id: 1, name_ar: 'مدينة نصر', name_en: 'Nasr City', delivery_fee: 50, is_active: true }
const maadi: Area = { id: 11, city_id: 1, name_ar: 'المعادي', name_en: 'Maadi', delivery_fee: 60, is_active: true }

describe('Delivery pricing — per-area delivery fees', () => {
  it('lists the first city\'s areas with their fees and switches city on selection', async () => {
    const user = userEvent.setup()
    fm.reply('GET /admin/cities', { json: ok(cities) })
    fm.reply('GET /admin/areas?city_id=1', { json: ok([nasr, maadi]) })
    fm.reply('GET /admin/areas?city_id=2', { json: ok([]) })
    renderAtDeliveryPricing(fm)

    const row = (await screen.findByText('مدينة نصر')).closest('tr')!
    expect(within(row).getByText(M.fee(50))).toBeInTheDocument()
    expect(screen.getByText(M.fee(60))).toBeInTheDocument()

    await user.selectOptions(screen.getByLabelText(M.cityLabel), '2')
    expect(await screen.findByText(M.empty)).toBeInTheDocument()
    expect(fm.count('GET /admin/areas?city_id=2')).toBe(1)
  })

  it('adds an area with its fee to the selected city and re-reads the list', async () => {
    const user = userEvent.setup()
    fm.reply('GET /admin/cities', { json: ok(cities) })
    fm.reply('GET /admin/areas?city_id=1', { json: ok([]) }, { json: ok([nasr]) })
    fm.reply('POST /admin/areas', { status: 201, json: ok(nasr) })
    renderAtDeliveryPricing(fm)

    await screen.findByText(M.empty)
    await user.click(screen.getByRole('button', { name: M.addArea }))
    const dialog = await screen.findByRole('dialog')
    await user.type(within(dialog).getByLabelText(M.fieldNameAr), 'مدينة نصر')
    await user.type(within(dialog).getByLabelText(M.fieldNameEn), 'Nasr City')
    await user.type(within(dialog).getByLabelText(M.fieldFee), '50')
    await user.click(within(dialog).getByRole('button', { name: M.save }))

    await waitFor(() => expect(fm.count('POST /admin/areas')).toBe(1))
    expect(fm.lastCall('POST /admin/areas')?.body).toEqual({
      city_id: 1,
      name_ar: 'مدينة نصر',
      name_en: 'Nasr City',
      delivery_fee: 50,
    })
    expect(await screen.findByText('مدينة نصر')).toBeInTheDocument()
    expect(screen.queryByRole('dialog')).toBeNull()
  })

  it('blocks an invalid fee client-side and sends nothing', async () => {
    const user = userEvent.setup()
    fm.reply('GET /admin/cities', { json: ok(cities) })
    fm.reply('GET /admin/areas?city_id=1', { json: ok([]) })
    renderAtDeliveryPricing(fm)

    await screen.findByText(M.empty)
    await user.click(screen.getByRole('button', { name: M.addArea }))
    const dialog = await screen.findByRole('dialog')
    await user.type(within(dialog).getByLabelText(M.fieldNameAr), 'مدينة نصر')
    await user.type(within(dialog).getByLabelText(M.fieldNameEn), 'Nasr City')
    await user.type(within(dialog).getByLabelText(M.fieldFee), '-5')
    await user.click(within(dialog).getByRole('button', { name: M.save }))

    expect(within(dialog).getByText(M.errFee)).toBeInTheDocument()
    expect(fm.count('POST /admin/areas')).toBe(0)
  })

  it('shows a server duplicate-name 422 inside the dialog', async () => {
    const user = userEvent.setup()
    fm.reply('GET /admin/cities', { json: ok(cities) })
    fm.reply('GET /admin/areas?city_id=1', { json: ok([nasr]) })
    fm.reply('POST /admin/areas', { status: 422, json: fail('An area with that name already exists in this city.') })
    renderAtDeliveryPricing(fm)

    await screen.findByText('مدينة نصر')
    await user.click(screen.getByRole('button', { name: M.addArea }))
    const dialog = await screen.findByRole('dialog')
    await user.type(within(dialog).getByLabelText(M.fieldNameAr), 'مدينة نصر')
    await user.type(within(dialog).getByLabelText(M.fieldNameEn), 'Nasr City')
    await user.type(within(dialog).getByLabelText(M.fieldFee), '50')
    await user.click(within(dialog).getByRole('button', { name: M.save }))

    expect(await within(dialog).findByRole('alert')).toHaveTextContent('already exists')
  })

  it('reprices an area', async () => {
    const user = userEvent.setup()
    fm.reply('GET /admin/cities', { json: ok(cities) })
    fm.reply('GET /admin/areas?city_id=1', { json: ok([nasr]) }, { json: ok([{ ...nasr, delivery_fee: 65 }]) })
    fm.reply('PUT /admin/areas/10', { json: ok({ ...nasr, delivery_fee: 65 }) })
    renderAtDeliveryPricing(fm)

    await user.click(await screen.findByRole('button', { name: M.editLabel('مدينة نصر') }))
    const dialog = await screen.findByRole('dialog')
    const fee = within(dialog).getByLabelText(M.fieldFee)
    expect(fee).toHaveValue('50')
    await user.clear(fee)
    await user.type(fee, '65')
    await user.click(within(dialog).getByRole('button', { name: M.save }))

    await waitFor(() => expect(fm.count('PUT /admin/areas/10')).toBe(1))
    expect(fm.lastCall('PUT /admin/areas/10')?.body).toMatchObject({ delivery_fee: 65 })
    expect(await screen.findByText(M.fee(65))).toBeInTheDocument()
  })

  it('stops delivery to an area after an explicit confirmation', async () => {
    const user = userEvent.setup()
    fm.reply('GET /admin/cities', { json: ok(cities) })
    fm.reply('GET /admin/areas?city_id=1', { json: ok([nasr]) }, { json: ok([{ ...nasr, is_active: false }]) })
    fm.reply('PATCH /admin/areas/10/status', { json: ok({ ...nasr, is_active: false }) })
    renderAtDeliveryPricing(fm)

    await user.click(await screen.findByRole('button', { name: M.toggleLabel('مدينة نصر', true) }))
    const dialog = await screen.findByRole('dialog')
    expect(within(dialog).getByText(M.toggleOffTitle('مدينة نصر'))).toBeInTheDocument()
    await user.click(within(dialog).getByRole('button', { name: M.confirm }))

    await waitFor(() => expect(fm.count('PATCH /admin/areas/10/status')).toBe(1))
    expect(fm.lastCall('PATCH /admin/areas/10/status')?.body).toEqual({ is_active: false })
    expect(await screen.findByText(M.statusInactive)).toBeInTheDocument()
  })

  it('shows a retryable error when the areas fail to load', async () => {
    const user = userEvent.setup()
    fm.reply('GET /admin/cities', { json: ok(cities) })
    fm.reply('GET /admin/areas?city_id=1', { status: 500, json: fail('boom') }, { json: ok([nasr]) })
    renderAtDeliveryPricing(fm)

    await user.click(await screen.findByRole('button', { name: M.retry }))
    expect(await screen.findByText('مدينة نصر')).toBeInTheDocument()
  })

  it('keeps a signed-in non-admin out', async () => {
    fm.reply('GET /admin/cities', { json: ok(cities) })
    renderAtDeliveryPricing(fm, { admin: false })

    expect(await screen.findByText('صفحة تسجيل الدخول')).toBeInTheDocument()
    expect(screen.queryByText(M.pageTitle)).toBeNull()
  })
})
