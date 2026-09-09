import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { axe } from 'vitest-axe'
import { renderAtSettings } from '../helpers/harness'
import { installFetchMock, type FetchMock } from '../helpers/fetchMock'
import { fail, settingsResponse, updatedSettings } from '../helpers/fixtures'
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

function describedText(el: HTMLElement): string {
  return (el.getAttribute('aria-describedby') ?? '')
    .split(/\s+/)
    .map((id) => document.getElementById(id)?.textContent ?? '')
    .join(' ')
}

describe('Platform settings — accessibility (FR-026 / FR-027, SC-008 / SC-009)', () => {
  it('the loading state has no AA violations', async () => {
    fm.reply('GET /admin/settings', { delayMs: 40, json: settingsResponse(25) })
    const { container } = renderAtSettings(fm)
    await screen.findByText(M.loading)
    expect(await axe(container, AXE_WCAG)).toHaveNoViolations()
  })

  it('the error + retry state has no AA violations', async () => {
    fm.reply('GET /admin/settings', { status: 500, json: fail('boom') })
    const { container } = renderAtSettings(fm)
    await screen.findByText(M.loadError)
    expect(await axe(container, AXE_WCAG)).toHaveNoViolations()
  })

  it('the pristine form has no AA violations; the field is labelled and its unit is described', async () => {
    fm.reply('GET /admin/settings', { json: settingsResponse(25) })
    const { container } = renderAtSettings(fm)

    const field = await screen.findByLabelText(M.feeFieldLabel)
    expect(field).toHaveAttribute('aria-describedby')
    expect(describedText(field)).toContain(M.feeUnitName)
    expect(container.querySelector('[dir="rtl"]')).toBeTruthy()
    expect(await axe(container, AXE_WCAG)).toHaveNoViolations()
  })

  it('the field-error state has no AA violations and the error is associated with the field', async () => {
    fm.reply('GET /admin/settings', { json: settingsResponse(25) })
    const user = userEvent.setup()
    const { container } = renderAtSettings(fm)

    const field = await screen.findByLabelText(M.feeFieldLabel)
    await user.clear(field)
    await user.type(field, '-5')

    expect(field).toHaveAttribute('aria-invalid', 'true')
    expect(describedText(field)).toContain(M.feeNegative)
    expect(await axe(container, AXE_WCAG)).toHaveNoViolations()
  })

  it('the saving state has no AA violations and Save exposes aria-busy', async () => {
    fm.reply('GET /admin/settings', { json: settingsResponse(25) })
    fm.reply('PUT /admin/settings', { delayMs: 60, json: updatedSettings(30) })
    const user = userEvent.setup()
    const { container } = renderAtSettings(fm)

    const field = await screen.findByLabelText(M.feeFieldLabel)
    await user.clear(field)
    await user.type(field, '30')
    await user.click(screen.getByRole('button', { name: M.save }))

    const busy = screen.getByRole('button', { name: M.saving })
    expect(busy).toHaveAttribute('aria-busy', 'true')
    expect(busy).toBeDisabled()
    expect(await axe(container, AXE_WCAG)).toHaveNoViolations()
  })

  it('keyboard: type a new value, Tab to Save, activate with Enter', async () => {
    fm.reply('GET /admin/settings', { json: settingsResponse(25) })
    fm.reply('PUT /admin/settings', { json: updatedSettings(30) })
    const user = userEvent.setup()
    renderAtSettings(fm)

    const field = await screen.findByLabelText(M.feeFieldLabel)
    await user.click(field)
    await user.clear(field)
    await user.type(field, '30')
    await user.tab()
    expect(screen.getByRole('button', { name: M.save })).toHaveFocus()
    await user.keyboard('{Enter}')

    await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent(M.updatedToast))
    expect(fm.count('PUT /admin/settings')).toBe(1)
  })
})
