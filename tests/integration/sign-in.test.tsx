import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { screen, waitFor, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderApp } from '../helpers/harness'
import { installFetchMock, type FetchMock } from '../helpers/fetchMock'
import { adminUser, customerUser, ok, fail } from '../helpers/fixtures'
import { messages } from '../../src/auth/messages'
import { STORAGE_KEYS } from '../../src/auth/authStorage'

let fm: FetchMock

beforeEach(() => {
  fm = installFetchMock()
})
afterEach(() => {
  vi.unstubAllGlobals()
  localStorage.clear()
})

async function fillAndSubmit(identifier = 'admin@tabbakha.com', password = 'secret123') {
  const user = userEvent.setup()
  await user.type(screen.getByLabelText('البريد الإلكتروني أو رقم الهاتف'), identifier)
  await user.type(screen.getByLabelText('كلمة المرور'), password)
  await user.click(screen.getByRole('button', { name: 'دخول' }))
}

describe('US1 — administrator sign-in', () => {
  it('AC1: valid admin credentials reach the dashboard and persist the token', async () => {
    fm.reply('POST /auth/login', { json: ok({ user: adminUser, token: 'tok-abc' }) })
    renderApp()

    await fillAndSubmit()

    expect(await screen.findByText('لوحة التحكم — الرئيسية')).toBeInTheDocument()
    expect(localStorage.getItem(STORAGE_KEYS.token)).toBe('tok-abc')
    expect(screen.getByText('Site Admin')).toBeInTheDocument()
  })

  it('AC2: valid non-admin credentials are refused, nothing persisted, token revoked (SC-003)', async () => {
    fm.reply('POST /auth/login', { json: ok({ user: customerUser, token: 'tok-cust' }) })
    fm.reply('POST /auth/logout', { json: ok(null) })
    renderApp()

    await fillAndSubmit('reda@x.com', 'secret123')

    expect(await screen.findByText(messages.notPermitted)).toBeInTheDocument()
    expect(localStorage.getItem(STORAGE_KEYS.token)).toBeNull()
    expect(localStorage.getItem(STORAGE_KEYS.profile)).toBeNull()
    await waitFor(() => expect(fm.count('POST /auth/logout')).toBe(1))
    expect(fm.lastCall('POST /auth/logout')?.authorization).toBe('Bearer tok-cust')
  })

  it('AC3: wrong credentials show one generic error, no per-field blame (SC-006)', async () => {
    fm.reply('POST /auth/login', { status: 401, json: fail('Unauthenticated.') })
    renderApp()

    await fillAndSubmit('admin@tabbakha.com', 'wrong')

    expect(await screen.findByRole('alert')).toHaveTextContent(messages.credentialError)
    expect(screen.getByLabelText('البريد الإلكتروني أو رقم الهاتف')).not.toHaveAttribute('aria-invalid')
    expect(screen.getByLabelText('كلمة المرور')).not.toHaveAttribute('aria-invalid')
    expect(localStorage.getItem(STORAGE_KEYS.token)).toBeNull()
  })

  it('AC4: empty fields are blocked client-side with per-field messages and no request', async () => {
    renderApp()
    const user = userEvent.setup()

    await user.click(screen.getByRole('button', { name: 'دخول' }))

    expect(await screen.findByText(messages.identifierRequired)).toBeInTheDocument()
    expect(screen.getByText(messages.passwordRequired)).toBeInTheDocument()
    expect(screen.getByLabelText('البريد الإلكتروني أو رقم الهاتف')).toHaveAttribute('aria-invalid', 'true')
    expect(fm.count('POST /auth/login')).toBe(0)
  })

  it('AC5: a 429 shows the rate-limit message with no counters', async () => {
    fm.reply('POST /auth/login', { status: 429, json: fail('Too many requests.') })
    renderApp()

    await fillAndSubmit()

    expect(await screen.findByRole('alert')).toHaveTextContent(messages.rateLimited)
    expect(screen.getByRole('alert').textContent).not.toMatch(/\d/)
  })

  it('AC6: rapid repeated submits send exactly one login request (SC-007)', async () => {
    fm.reply('POST /auth/login', { json: ok({ user: adminUser, token: 'tok-abc' }) })
    renderApp()

    const user = userEvent.setup()
    await user.type(screen.getByLabelText('البريد الإلكتروني أو رقم الهاتف'), 'admin@tabbakha.com')
    await user.type(screen.getByLabelText('كلمة المرور'), 'secret123')

    const submit = screen.getByRole('button', { name: 'دخول' })
    fireEvent.click(submit)
    fireEvent.click(submit)
    fireEvent.click(submit)

    await screen.findByText('لوحة التحكم — الرئيسية')
    expect(fm.count('POST /auth/login')).toBe(1)
  })

  it('submit control is disabled while the request is in flight (FR-009)', async () => {
    fm.reply('POST /auth/login', { json: ok({ user: adminUser, token: 'tok-abc' }) })
    renderApp()

    const user = userEvent.setup()
    await user.type(screen.getByLabelText('البريد الإلكتروني أو رقم الهاتف'), 'admin@tabbakha.com')
    await user.type(screen.getByLabelText('كلمة المرور'), 'secret123')

    fireEvent.click(screen.getByRole('button', { name: /دخول|جاري الدخول/ }))
    await waitFor(() =>
      expect(screen.getByRole('button', { name: /دخول|جاري الدخول/ })).toBeDisabled(),
    )
  })

  it('a 500 shows a generic retryable message and stores nothing (FR-010)', async () => {
    fm.reply('POST /auth/login', { status: 500, json: fail('Something went wrong. Please try again.') })
    renderApp()

    await fillAndSubmit()

    expect(await screen.findByRole('alert')).toHaveTextContent(messages.serverError)
    expect(localStorage.getItem(STORAGE_KEYS.token)).toBeNull()
  })

  it('a network failure shows a connection message and stores nothing (FR-010)', async () => {
    fm.reply('POST /auth/login', { networkError: true })
    renderApp()

    await fillAndSubmit()

    expect(await screen.findByRole('alert')).toHaveTextContent(messages.networkError)
    expect(localStorage.getItem(STORAGE_KEYS.token)).toBeNull()
  })
})
