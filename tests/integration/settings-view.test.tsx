import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderAtSettings } from '../helpers/harness'
import { installFetchMock, type FetchMock, openGate } from '../helpers/fetchMock'
import { fail, settingsResponse } from '../helpers/fixtures'
import { settingsMessages as M } from '../../src/settings/messages'

let fm: FetchMock

beforeEach(() => {
  fm = installFetchMock()
})
afterEach(() => {
  vi.unstubAllGlobals()
  localStorage.clear()
})

describe('Platform settings — view (US1)', () => {
  it('AC1: loads once; delivery fees are no longer a flat setting here but link to per-area pricing', async () => {
    fm.reply('GET /admin/settings', { json: settingsResponse(25) })
    renderAtSettings(fm)

    await screen.findByLabelText(M.commissionLabel)
    expect(screen.queryByLabelText(M.feeFieldLabel)).toBeNull()
    expect(screen.getByText(M.deliveryPricingMoved)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: M.deliveryPricingLink })).toHaveAttribute('href', '/delivery-pricing')
    expect(fm.count('GET /admin/settings')).toBe(1)
    expect(fm.lastCall('GET /admin/settings')?.authorization).toBe('Bearer tok-admin')
  })

  it('AC2: a pending load shows a loading state and no Save control', async () => {
    const g = openGate()
    fm.reply('GET /admin/settings', { gate: g.gate, json: settingsResponse(25) })
    renderAtSettings(fm)

    expect(await screen.findByText(M.loading)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: M.saveSettings })).toBeNull()
    g.land()
    await screen.findByLabelText(M.commissionLabel)
  })

  it('AC3: a failed load shows a retryable error and no editable value', async () => {
    fm.reply('GET /admin/settings', { status: 500, json: fail('boom') })
    renderAtSettings(fm)

    expect(await screen.findByText(M.loadError)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: M.retry })).toBeInTheDocument()
    expect(screen.queryByLabelText(M.commissionLabel)).toBeNull()
  })

  it('AC3: a transport failure is also the error state', async () => {
    fm.reply('GET /admin/settings', { networkError: true })
    renderAtSettings(fm)

    expect(await screen.findByText(M.loadError)).toBeInTheDocument()
  })

  it('AC4: Retry re-fetches and shows the form on success', async () => {
    fm.reply(
      'GET /admin/settings',
      { status: 500, json: fail('boom') },
      { json: settingsResponse(40) },
    )
    const user = userEvent.setup()
    renderAtSettings(fm)

    await user.click(await screen.findByRole('button', { name: M.retry }))

    await screen.findByLabelText(M.commissionLabel)
    expect(fm.count('GET /admin/settings')).toBe(2)
  })

  it('FR-022: a signed-in non-admin never reaches the area', async () => {
    fm.reply('GET /admin/settings', { json: settingsResponse(25) })
    renderAtSettings(fm, { admin: false })

    expect(await screen.findByText('صفحة تسجيل الدخول')).toBeInTheDocument()
    expect(screen.queryByText(M.pageTitle)).toBeNull()
  })
})
