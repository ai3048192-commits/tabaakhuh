import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { screen } from '@testing-library/react'
import { axe } from 'vitest-axe'
import { renderAtSettings } from '../helpers/harness'
import { installFetchMock, type FetchMock, openGate } from '../helpers/fetchMock'
import { fail, settingsResponse } from '../helpers/fixtures'
import { settingsMessages as M } from '../../src/settings/messages'

const AXE_WCAG = {
  runOnly: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'],
} as const

let fm: FetchMock

beforeEach(() => {
  fm = installFetchMock()
})
afterEach(() => {
  vi.unstubAllGlobals()
  localStorage.clear()
})

describe('Platform settings — accessibility (FR-026 / FR-027, SC-008 / SC-009)', () => {
  it('the loading state has no AA violations', async () => {
    const g = openGate()
    fm.reply('GET /admin/settings', { gate: g.gate, json: settingsResponse(25) })
    const { container } = renderAtSettings(fm)
    await screen.findByText(M.loading)
    expect(await axe(container, AXE_WCAG)).toHaveNoViolations()
    g.land()
  })

  it('the error + retry state has no AA violations', async () => {
    fm.reply('GET /admin/settings', { status: 500, json: fail('boom') })
    const { container } = renderAtSettings(fm)
    await screen.findByText(M.loadError)
    expect(await axe(container, AXE_WCAG)).toHaveNoViolations()
  })

  it('the loaded page has no AA violations and is RTL', async () => {
    fm.reply('GET /admin/settings', { json: settingsResponse(25) })
    const { container } = renderAtSettings(fm)

    await screen.findByLabelText(M.commissionLabel)
    expect(container.querySelector('[dir="rtl"]')).toBeTruthy()
    expect(await axe(container, AXE_WCAG)).toHaveNoViolations()
  })
})
