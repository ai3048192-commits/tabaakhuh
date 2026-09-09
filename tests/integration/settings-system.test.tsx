import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderAtSettings } from '../helpers/harness'
import { installFetchMock, type FetchMock } from '../helpers/fetchMock'
import { fail, ok, settingsResponse, updatedSystemSettings } from '../helpers/fixtures'
import { settingsMessages as M } from '../../src/settings/messages'

let fm: FetchMock
beforeEach(() => {
  fm = installFetchMock()
})
afterEach(() => {
  vi.unstubAllGlobals()
  localStorage.clear()
})

const saveBar = () => screen.getByRole('button', { name: M.saveSettings })

async function open(overrides: Record<string, unknown> = {}) {
  fm.reply('GET /admin/settings', { json: settingsResponse(25, overrides) })
  fm.reply('GET /admin/cities', { json: ok([]) })
  const user = userEvent.setup()
  renderAtSettings(fm)
  await screen.findByLabelText(M.feeFieldLabel)
  return { user }
}

describe('Platform settings — the §6 system settings cards', () => {
  it('a valid numeric change enables the shared save and PUTs only that key', async () => {
    const { user } = await open()
    fm.reply('PUT /admin/settings', { json: updatedSystemSettings({ commission_percent: 12 }) })

    expect(saveBar()).toBeDisabled()
    await user.clear(screen.getByLabelText(M.commissionLabel))
    await user.type(screen.getByLabelText(M.commissionLabel), '12')
    expect(saveBar()).toBeEnabled()
    await user.click(saveBar())

    await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent(M.settingsSavedToast))
    expect(fm.count('PUT /admin/settings')).toBe(1)
    expect(fm.lastCall('PUT /admin/settings')?.body).toEqual({ commission_percent: 12 })
    expect(saveBar()).toBeDisabled()
  })

  it('an out-of-range value shows an inline error and sends no request', async () => {
    const { user } = await open()
    await user.clear(screen.getByLabelText(M.commissionLabel))
    await user.type(screen.getByLabelText(M.commissionLabel), '150')

    expect(screen.getByText(M.vCommissionRange)).toBeInTheDocument()
    expect(saveBar()).toBeDisabled()
    expect(fm.count('PUT /admin/settings')).toBe(0)
  })

  it('toggling a notification switch is saved as a boolean', async () => {
    const { user } = await open()
    fm.reply('PUT /admin/settings', { json: updatedSystemSettings({ notif_push_enabled: false }) })

    await user.click(screen.getByLabelText(M.notifPushLabel)) // was true → false
    await user.click(saveBar())

    await waitFor(() => expect(fm.count('PUT /admin/settings')).toBe(1))
    expect(fm.lastCall('PUT /admin/settings')?.body).toEqual({ notif_push_enabled: false })
  })

  it('clearing a text field that had a value sends null', async () => {
    const { user } = await open({ store_name: 'طباخة' })
    fm.reply('PUT /admin/settings', { json: updatedSystemSettings({ store_name: null }) })

    await user.clear(screen.getByLabelText(M.storeNameLabel))
    await user.click(saveBar())

    await waitFor(() => expect(fm.count('PUT /admin/settings')).toBe(1))
    expect(fm.lastCall('PUT /admin/settings')?.body).toEqual({ store_name: null })
  })

  it('a multi-field change PUTs every dirty key in one request', async () => {
    const { user } = await open()
    fm.reply('PUT /admin/settings', {
      json: updatedSystemSettings({ min_order_total: 50, cashback_enabled: true }),
    })

    await user.clear(screen.getByLabelText(M.minOrderLabel))
    await user.type(screen.getByLabelText(M.minOrderLabel), '50')
    await user.click(screen.getByLabelText(M.cashbackLabel))
    await user.click(saveBar())

    await waitFor(() => expect(fm.count('PUT /admin/settings')).toBe(1))
    expect(fm.lastCall('PUT /admin/settings')?.body).toEqual({ min_order_total: 50, cashback_enabled: true })
  })

  it('a keyed 422 from the server lands under the matching field', async () => {
    const { user } = await open()
    fm.reply('PUT /admin/settings', {
      status: 422,
      json: fail('The given data was invalid.', {
        support_email: ['بريد إلكتروني غير صالح.'],
      }),
    })

    await user.type(screen.getByLabelText(M.supportEmailLabel), 'not-an-email@x')
    // client rule already flags it — fix locally to a plausible value, let the server reject
    await user.clear(screen.getByLabelText(M.supportEmailLabel))
    await user.type(screen.getByLabelText(M.supportEmailLabel), 'ops@tabakha.app')
    await user.click(saveBar())

    expect(await screen.findByText('بريد إلكتروني غير صالح.')).toBeInTheDocument()
  })

  it('a transient failure keeps the draft and shows a retryable toast', async () => {
    const { user } = await open()
    fm.reply('PUT /admin/settings', { networkError: true })

    await user.clear(screen.getByLabelText(M.commissionLabel))
    await user.type(screen.getByLabelText(M.commissionLabel), '20')
    await user.click(saveBar())

    await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent(M.saveRetryToast))
    expect(screen.getByLabelText(M.commissionLabel)).toHaveValue('20')
  })

  it('logo upload: file → Cloudinary → secure_url PUT with the settings save', async () => {
    fm.reply('GET /admin/settings', { json: settingsResponse(25) })
    fm.reply('GET /admin/cities', { json: ok([]) })
    const user = userEvent.setup()
    const { container } = renderAtSettings(fm)
    await screen.findByLabelText(M.feeFieldLabel)

    const secureUrl = 'https://res.cloudinary.com/test-cloud/image/upload/v1/tabaakhuh/settings/logo.png'
    fm.reply('POST /v1_1/test-cloud/image/upload', { json: { secure_url: secureUrl, width: 240, height: 240, bytes: 900 } })
    fm.reply('PUT /admin/settings', { json: updatedSystemSettings({ logo_url: secureUrl }) })

    const fileInput = container.querySelector<HTMLInputElement>('input[type="file"]')!
    await user.upload(fileInput, new File([new Uint8Array(64)], 'logo.png', { type: 'image/png' }))

    // Cloudinary was hit once; the preview now shows the uploaded image.
    await waitFor(() => expect(fm.count('POST /v1_1/test-cloud/image/upload')).toBe(1))
    expect(await screen.findByAltText(M.imagePreviewAlt)).toHaveAttribute('src', secureUrl)

    await user.click(saveBar())

    await waitFor(() => expect(fm.count('PUT /admin/settings')).toBe(1))
    expect(fm.lastCall('PUT /admin/settings')?.body).toEqual({ logo_url: secureUrl })
  })

  it('logo upload: a rejected Cloudinary upload shows an error and PUTs nothing', async () => {
    fm.reply('GET /admin/settings', { json: settingsResponse(25) })
    fm.reply('GET /admin/cities', { json: ok([]) })
    const user = userEvent.setup()
    const { container } = renderAtSettings(fm)
    await screen.findByLabelText(M.feeFieldLabel)

    fm.reply('POST /v1_1/test-cloud/image/upload', {
      status: 400,
      json: { error: { message: 'Invalid upload preset' } },
    })

    const fileInput = container.querySelector<HTMLInputElement>('input[type="file"]')!
    await user.upload(fileInput, new File([new Uint8Array(64)], 'logo.png', { type: 'image/png' }))

    expect(await screen.findByText(M.imageErrRejected)).toBeInTheDocument()
    expect(saveBar()).toBeDisabled()
    expect(fm.count('PUT /admin/settings')).toBe(0)
  })
})
