import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { screen, fireEvent, waitFor } from '@testing-library/react'
// Toast text renders in both the visually-hidden role="status" live region and
// the visible bubble, so assert against the status node (matches the Phase 3 pattern).
import userEvent from '@testing-library/user-event'
import { renderAtSettings } from '../helpers/harness'
import { installFetchMock, type FetchMock } from '../helpers/fetchMock'
import { fail, settingsResponse, updatedSettings } from '../helpers/fixtures'
import { settingsMessages as M } from '../../src/settings/messages'

let fm: FetchMock

beforeEach(() => {
  fm = installFetchMock()
})
afterEach(() => {
  vi.unstubAllGlobals()
  localStorage.clear()
})

const saveBtn = () => screen.getByRole('button', { name: M.save })

async function open(fee = 25) {
  fm.reply('GET /admin/settings', { json: settingsResponse(fee) })
  const user = userEvent.setup()
  renderAtSettings(fm)
  const field = await screen.findByLabelText(M.feeFieldLabel)
  return { user, field }
}

describe('Platform settings — update (US2)', () => {
  it('AC1: Save is disabled while the value is unchanged', async () => {
    await open(25)
    expect(saveBtn()).toBeDisabled()
  })

  it('AC2: a different valid amount enables Save', async () => {
    const { user, field } = await open(25)
    await user.clear(field)
    await user.type(field, '30')
    expect(saveBtn()).toBeEnabled()
  })

  it('AC9: reverting to the saved value disables Save and clears the field error', async () => {
    const { user, field } = await open(25)
    await user.clear(field)
    await user.type(field, '-5')
    expect(screen.getByText(M.feeNegative)).toBeInTheDocument()

    await user.clear(field)
    await user.type(field, '25.0')
    expect(saveBtn()).toBeDisabled()
    expect(screen.queryByText(M.feeNegative)).toBeNull()
  })

  it('AC4: a negative value is blocked with a field message and sends no request', async () => {
    const { user, field } = await open(25)
    await user.clear(field)
    await user.type(field, '-5')

    expect(screen.getByText(M.feeNegative)).toBeInTheDocument()
    expect(saveBtn()).toBeDisabled()
    expect(fm.count('PUT /admin/settings')).toBe(0)
  })

  it('AC5: empty / non-numeric are blocked with a field message and send no request', async () => {
    const { user, field } = await open(25)
    await user.clear(field)
    expect(screen.getByText(M.feeRequired)).toBeInTheDocument()

    await user.type(field, 'abc')
    expect(screen.getByText(M.feeNotNumber)).toBeInTheDocument()
    expect(saveBtn()).toBeDisabled()
    expect(fm.count('PUT /admin/settings')).toBe(0)
  })

  it('FR-010: more than two decimals is blocked, no rounding, no request', async () => {
    const { user, field } = await open(25)
    await user.clear(field)
    await user.type(field, '30.005')

    expect(screen.getByText(M.feeTooManyDecimals)).toBeInTheDocument()
    expect(saveBtn()).toBeDisabled()
    expect(fm.count('PUT /admin/settings')).toBe(0)
  })

  it('FR-011: zero is valid and is sent as a number', async () => {
    const { user, field } = await open(25)
    fm.reply('PUT /admin/settings', { json: updatedSettings(0) })
    await user.clear(field)
    await user.type(field, '0')
    await user.click(saveBtn())

    await waitFor(() => expect(fm.count('PUT /admin/settings')).toBe(1))
    expect(fm.lastCall('PUT /admin/settings')?.body).toEqual({ delivery_fee: 0 })
  })

  it('AC3: a valid change → one PUT, displayed fee updates, success toast, no confirm dialog', async () => {
    const { user, field } = await open(25)
    fm.reply('PUT /admin/settings', { json: updatedSettings(30) })
    await user.clear(field)
    await user.type(field, '30')
    await user.click(saveBtn())

    await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent(M.updatedToast))
    expect(fm.count('PUT /admin/settings')).toBe(1)
    expect(fm.lastCall('PUT /admin/settings')?.body).toEqual({ delivery_fee: 30 })
    expect(fm.lastCall('PUT /admin/settings')?.authorization).toBe('Bearer tok-admin')
    expect(screen.getByText('30.00')).toBeInTheDocument()
    expect(field).toHaveValue('30.00')
    expect(saveBtn()).toBeDisabled()
    expect(screen.queryByRole('dialog')).toBeNull()
  })

  it('AC6: a 422 shows the response message under the field; fee unchanged; value kept', async () => {
    const { user, field } = await open(25)
    fm.reply('PUT /admin/settings', {
      status: 422,
      json: fail('The given data was invalid.', { delivery_fee: ['قيمة غير مقبولة.'] }),
    })
    await user.clear(field)
    await user.type(field, '30')
    await user.click(saveBtn())

    expect(await screen.findByText('قيمة غير مقبولة.')).toBeInTheDocument()
    expect(screen.getByText('25.00')).toBeInTheDocument()
    expect(field).toHaveValue('30')
    expect(screen.queryByText(M.updatedToast)).toBeNull()
  })

  it('AC7: Save shows the saving state while in flight; rapid clicks send exactly one PUT', async () => {
    const { user, field } = await open(25)
    fm.reply('PUT /admin/settings', { delayMs: 40, json: updatedSettings(30) })
    await user.clear(field)
    await user.type(field, '30')

    const btn = saveBtn()
    fireEvent.click(btn)
    fireEvent.click(btn)
    fireEvent.click(btn)

    expect(screen.getByRole('button', { name: M.saving })).toBeDisabled()
    await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent(M.updatedToast))
    expect(fm.count('PUT /admin/settings')).toBe(1)
  })

  it('AC8: a transient failure leaves the fee unchanged with a retryable toast, value kept', async () => {
    const { user, field } = await open(25)
    fm.reply('PUT /admin/settings', { networkError: true })
    await user.clear(field)
    await user.type(field, '30')
    await user.click(saveBtn())

    await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent(M.saveRetryToast))
    expect(screen.getByText('25.00')).toBeInTheDocument()
    expect(field).toHaveValue('30')
  })

  it('FR-018 / FR-019: a 200 that is not a valid success envelope is treated as transient (no false success)', async () => {
    const { user, field } = await open(25)
    fm.reply('PUT /admin/settings', { status: 200, json: null })
    await user.clear(field)
    await user.type(field, '30')
    await user.click(saveBtn())

    await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent(M.saveRetryToast))
    expect(screen.getByRole('status')).not.toHaveTextContent(M.updatedToast)
    expect(screen.getByText('25.00')).toBeInTheDocument()
  })
})
