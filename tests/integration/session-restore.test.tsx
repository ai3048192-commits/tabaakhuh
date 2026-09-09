import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import { renderApp } from '../helpers/harness'
import { installFetchMock, type FetchMock } from '../helpers/fetchMock'
import { adminUser, customerUser, ok, fail } from '../helpers/fixtures'
import { messages } from '../../src/auth/messages'
import { STORAGE_KEYS, writeSession } from '../../src/auth/authStorage'
import { apiRequest } from '../../src/api/httpClient'

let fm: FetchMock

beforeEach(() => {
  fm = installFetchMock()
})
afterEach(() => {
  vi.unstubAllGlobals()
  localStorage.clear()
})

describe('US2 — session restoration on startup', () => {
  it('AC1: a valid stored session restores to the dashboard with no prompt (SC-002)', async () => {
    writeSession('tok-live', adminUser)
    fm.reply('GET /auth/me', { json: ok({ user: adminUser }) })

    renderApp(['/dashboard'])

    expect(await screen.findByText('لوحة التحكم — الرئيسية')).toBeInTheDocument()
    expect(screen.queryByLabelText('كلمة المرور')).not.toBeInTheDocument()
    expect(fm.count('GET /auth/me')).toBe(1)
    expect(fm.lastCall('GET /auth/me')?.authorization).toBe('Bearer tok-live')
  })

  it('AC3: with no stored token the sign-in screen shows immediately and no /auth/me is called', async () => {
    renderApp(['/dashboard'])

    expect(await screen.findByRole('button', { name: 'دخول' })).toBeInTheDocument()
    expect(fm.count('GET /auth/me')).toBe(0)
  })

  it('AC2: a rejected (401) stored credential is discarded, sign-in shown, no toast (FR-014)', async () => {
    writeSession('tok-bad', adminUser)
    fm.reply('GET /auth/me', { status: 401, json: fail('Unauthenticated.') })

    renderApp(['/dashboard'])

    expect(await screen.findByRole('button', { name: 'دخول' })).toBeInTheDocument()
    expect(localStorage.getItem(STORAGE_KEYS.token)).toBeNull()
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('FR-014a: a 5xx during startup keeps the token, shows sign-in, no toast', async () => {
    writeSession('tok-keep', adminUser)
    fm.reply('GET /auth/me', { status: 500, json: fail('Something went wrong.') })

    renderApp(['/dashboard'])

    expect(await screen.findByRole('button', { name: 'دخول' })).toBeInTheDocument()
    expect(localStorage.getItem(STORAGE_KEYS.token)).toBe('tok-keep')
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('FR-014a: a network failure during startup keeps the token, shows sign-in, no toast', async () => {
    writeSession('tok-keep2', adminUser)
    fm.reply('GET /auth/me', { networkError: true })

    renderApp(['/dashboard'])

    expect(await screen.findByRole('button', { name: 'دخول' })).toBeInTheDocument()
    expect(localStorage.getItem(STORAGE_KEYS.token)).toBe('tok-keep2')
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('AC4: a restored non-admin role clears storage, revokes, shows not-permitted (FR-015)', async () => {
    writeSession('tok-cust', customerUser)
    fm.reply('GET /auth/me', { json: ok({ user: customerUser }) })
    fm.reply('POST /auth/logout', { json: ok(null) })

    renderApp(['/dashboard'])

    expect(await screen.findByText(messages.notPermitted)).toBeInTheDocument()
    expect(localStorage.getItem(STORAGE_KEYS.token)).toBeNull()
    await waitFor(() => expect(fm.count('POST /auth/logout')).toBe(1))
    expect(fm.lastCall('POST /auth/logout')?.authorization).toBe('Bearer tok-cust')
  })

  it('AC5: a mid-session 401 ends the session and returns to sign-in (SC-005)', async () => {
    writeSession('tok-live', adminUser)
    fm.reply('GET /auth/me', { json: ok({ user: adminUser }) })
    renderApp(['/dashboard'])
    await screen.findByText('لوحة التحكم — الرئيسية')

    fm.reply('GET /admin/orders', { status: 401, json: fail('Unauthenticated.') })
    await apiRequest('/admin/orders', { token: 'tok-live' }).catch(() => {})

    expect(await screen.findByRole('button', { name: 'دخول' })).toBeInTheDocument()
    expect(localStorage.getItem(STORAGE_KEYS.token)).toBeNull()
  })

  it('FR-017/SC-008: no sign-in form and no dashboard content render while /auth/me is pending', async () => {
    writeSession('tok-live', adminUser)
    fm.reply('GET /auth/me', { json: ok({ user: adminUser }), delayMs: 150 })

    renderApp(['/dashboard'])

    expect(screen.getByRole('status')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'دخول' })).not.toBeInTheDocument()
    expect(screen.queryByText('لوحة التحكم — الرئيسية')).not.toBeInTheDocument()

    expect(await screen.findByText('لوحة التحكم — الرئيسية')).toBeInTheDocument()
  })
})
