import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { screen } from '@testing-library/react'
import { renderAtSettings } from '../helpers/harness'
import { installFetchMock, type FetchMock } from '../helpers/fetchMock'
import { fail } from '../helpers/fixtures'
import { STORAGE_KEYS } from '../../src/auth/authStorage'
import { settingsMessages as M } from '../../src/settings/messages'

let fm: FetchMock

beforeEach(() => {
  fm = installFetchMock()
})
afterEach(() => {
  vi.unstubAllGlobals()
  localStorage.clear()
})

describe('Platform settings — session & access (FR-021)', () => {
  it('a 401 on the settings load ends the session and redirects to /login', async () => {
    fm.reply('GET /admin/settings', { status: 401, json: fail('Unauthenticated.') })
    renderAtSettings(fm)

    expect(await screen.findByText('صفحة تسجيل الدخول')).toBeInTheDocument()
    expect(localStorage.getItem(STORAGE_KEYS.token)).toBeNull()
    expect(localStorage.getItem(STORAGE_KEYS.profile)).toBeNull()
    expect(screen.queryByText(M.pageTitle)).toBeNull()
  })
})
