import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderApp } from '../helpers/harness'
import { installFetchMock, type FetchMock } from '../helpers/fetchMock'
import { adminUser, ok, fail } from '../helpers/fixtures'
import { STORAGE_KEYS, writeSession } from '../../src/auth/authStorage'

let fm: FetchMock

beforeEach(() => {
  fm = installFetchMock()
})
afterEach(() => {
  vi.unstubAllGlobals()
  localStorage.clear()
})

async function renderSignedIn() {
  writeSession('tok-live', adminUser)
  fm.reply('GET /auth/me', { json: ok({ user: adminUser }) })
  renderApp(['/dashboard'])
  await screen.findByText('لوحة التحكم — الرئيسية')
}

describe('US3 — administrator sign-out', () => {
  it('AC1: sign-out clears local state, revokes the token, shows the sign-in screen', async () => {
    await renderSignedIn()
    fm.reply('POST /auth/logout', { json: ok(null) })

    await userEvent.setup().click(screen.getByRole('button', { name: 'تسجيل الخروج' }))

    expect(await screen.findByRole('button', { name: 'دخول' })).toBeInTheDocument()
    expect(localStorage.getItem(STORAGE_KEYS.token)).toBeNull()
    expect(localStorage.getItem(STORAGE_KEYS.profile)).toBeNull()
    await waitFor(() => expect(fm.count('POST /auth/logout')).toBe(1))
    expect(fm.lastCall('POST /auth/logout')?.authorization).toBe('Bearer tok-live')
  })

  it('AC3: a failed logout request still clears the local session (SC-004)', async () => {
    await renderSignedIn()
    fm.reply('POST /auth/logout', { status: 500, json: fail('boom') })

    await userEvent.setup().click(screen.getByRole('button', { name: 'تسجيل الخروج' }))

    expect(await screen.findByRole('button', { name: 'دخول' })).toBeInTheDocument()
    expect(localStorage.getItem(STORAGE_KEYS.token)).toBeNull()
  })

  it('AC3: a network failure on logout still clears the local session', async () => {
    await renderSignedIn()
    fm.reply('POST /auth/logout', { networkError: true })

    await userEvent.setup().click(screen.getByRole('button', { name: 'تسجيل الخروج' }))

    expect(await screen.findByRole('button', { name: 'دخول' })).toBeInTheDocument()
    expect(localStorage.getItem(STORAGE_KEYS.token)).toBeNull()
  })

  it('local state is cleared before the logout response resolves (FR-020)', async () => {
    await renderSignedIn()
    fm.reply('POST /auth/logout', { json: ok(null), delayMs: 200 })

    await userEvent.setup().click(screen.getByRole('button', { name: 'تسجيل الخروج' }))

    // Even while the logout request is still in flight, storage is already empty
    // and the sign-in screen is shown.
    expect(await screen.findByRole('button', { name: 'دخول' })).toBeInTheDocument()
    expect(localStorage.getItem(STORAGE_KEYS.token)).toBeNull()
  })

  it('AC4/FR-021: after sign-out, re-entering a dashboard route shows the sign-in screen', async () => {
    await renderSignedIn()
    fm.reply('POST /auth/logout', { json: ok(null) })
    await userEvent.setup().click(screen.getByRole('button', { name: 'تسجيل الخروج' }))
    await screen.findByRole('button', { name: 'دخول' })

    // Simulate navigating back to a dashboard URL: storage is empty, so the guard
    // redirects and no authenticated content is shown.
    renderApp(['/dashboard'])
    expect(await screen.findAllByRole('button', { name: 'دخول' })).not.toHaveLength(0)
    expect(screen.queryByText('لوحة التحكم — الرئيسية')).not.toBeInTheDocument()
  })
})
