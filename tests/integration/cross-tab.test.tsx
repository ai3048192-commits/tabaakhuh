import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { act, screen } from '@testing-library/react'
import { renderApp } from '../helpers/harness'
import { installFetchMock, type FetchMock } from '../helpers/fetchMock'
import { adminUser, ok } from '../helpers/fixtures'
import { STORAGE_KEYS, writeSession } from '../../src/auth/authStorage'

let fm: FetchMock

beforeEach(() => {
  fm = installFetchMock()
})
afterEach(() => {
  vi.unstubAllGlobals()
  localStorage.clear()
})

function fireStorage(key: string | null, newValue: string | null) {
  act(() => {
    window.dispatchEvent(new StorageEvent('storage', { key, newValue }))
  })
}

describe('US2 — cross-tab credential changes (FR-026)', () => {
  it('clearing the token in another tab returns this tab to the sign-in screen', async () => {
    writeSession('tok-live', adminUser)
    fm.reply('GET /auth/me', { json: ok({ user: adminUser }) })
    renderApp(['/dashboard'])
    await screen.findByText('لوحة التحكم — الرئيسية')

    // Another tab signed out: token key removed.
    localStorage.removeItem(STORAGE_KEYS.token)
    fireStorage(STORAGE_KEYS.token, null)

    expect(await screen.findByRole('button', { name: 'دخول' })).toBeInTheDocument()
  })

  it('a full storage.clear() in another tab (key === null) also drops to sign-in', async () => {
    writeSession('tok-live', adminUser)
    fm.reply('GET /auth/me', { json: ok({ user: adminUser }) })
    renderApp(['/dashboard'])
    await screen.findByText('لوحة التحكم — الرئيسية')

    localStorage.clear()
    fireStorage(null, null)

    expect(await screen.findByRole('button', { name: 'دخول' })).toBeInTheDocument()
  })

  it('a token replaced with a new value re-verifies the session', async () => {
    writeSession('tok-1', adminUser)
    fm.reply('GET /auth/me', { json: ok({ user: adminUser }) })
    renderApp(['/dashboard'])
    await screen.findByText('لوحة التحكم — الرئيسية')
    expect(fm.count('GET /auth/me')).toBe(1)

    // Another tab signed in as a (possibly different) admin.
    localStorage.setItem(STORAGE_KEYS.token, 'tok-2')
    fireStorage(STORAGE_KEYS.token, 'tok-2')

    // Re-enters "checking" and calls /auth/me again with the new token.
    expect(await screen.findByText('لوحة التحكم — الرئيسية')).toBeInTheDocument()
    expect(fm.count('GET /auth/me')).toBe(2)
    expect(fm.lastCall('GET /auth/me')?.authorization).toBe('Bearer tok-2')
  })
})
