import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { axe } from 'vitest-axe'
import { renderApp } from '../helpers/harness'
import { installFetchMock, type FetchMock } from '../helpers/fetchMock'
import { fail, ok, adminUser } from '../helpers/fixtures'
import { messages } from '../../src/auth/messages'

let fm: FetchMock

beforeEach(() => {
  fm = installFetchMock()
})
afterEach(() => {
  vi.unstubAllGlobals()
  localStorage.clear()
})

describe('US1 — sign-in screen accessibility (WCAG 2.1 AA, SC-009)', () => {
  it('default state has no axe violations', async () => {
    const { container } = renderApp()
    expect(await axe(container)).toHaveNoViolations()
  })

  it('validation-error state has no axe violations', async () => {
    const { container } = renderApp()
    const user = userEvent.setup()
    await user.click(screen.getByRole('button', { name: 'دخول' }))
    await screen.findByText(messages.identifierRequired)
    expect(await axe(container)).toHaveNoViolations()
  })

  it('server-error state has no axe violations and announces via role=alert', async () => {
    fm.reply('POST /auth/login', { status: 500, json: fail('boom') })
    const { container } = renderApp()
    const user = userEvent.setup()
    await user.type(screen.getByLabelText('البريد الإلكتروني أو رقم الهاتف'), 'admin@tabbakha.com')
    await user.type(screen.getByLabelText('كلمة المرور'), 'secret123')
    await user.click(screen.getByRole('button', { name: 'دخول' }))
    await screen.findByRole('alert')
    expect(await axe(container)).toHaveNoViolations()
  })

  it('in-flight/loading state has no axe violations', async () => {
    fm.reply('POST /auth/login', { json: ok({ user: adminUser, token: 't' }), delayMs: 200 })
    renderApp()
    const user = userEvent.setup()
    await user.type(screen.getByLabelText('البريد الإلكتروني أو رقم الهاتف'), 'admin@tabbakha.com')
    await user.type(screen.getByLabelText('كلمة المرور'), 'secret123')
    fireEvent.click(screen.getByRole('button', { name: /دخول|جاري الدخول/ }))

    const form = await screen.findByRole('button', { name: /جاري الدخول/ }).then((b) => b.closest('form')!)
    await waitFor(() => expect(screen.getByRole('button', { name: /جاري الدخول/ })).toBeDisabled())
    expect(await axe(form)).toHaveNoViolations()
  })

  it('the identifier field receives focus on mount', () => {
    renderApp()
    expect(screen.getByLabelText('البريد الإلكتروني أو رقم الهاتف')).toHaveFocus()
  })
})
