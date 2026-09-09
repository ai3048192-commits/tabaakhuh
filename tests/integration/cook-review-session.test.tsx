import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { screen } from '@testing-library/react'
import { renderAtCooks } from '../helpers/harness'
import { installFetchMock, type FetchMock } from '../helpers/fetchMock'
import { ok, fail, cityList } from '../helpers/fixtures'
import { STORAGE_KEYS } from '../../src/auth/authStorage'

let fm: FetchMock

beforeEach(() => {
  fm = installFetchMock()
})
afterEach(() => {
  vi.unstubAllGlobals()
  localStorage.clear()
})

describe('Cook review — session loss (FR-026)', () => {
  it('a 401 on the queue request ends the session and redirects to /login', async () => {
    fm.reply('GET /admin/cities', { json: ok(cityList()) })
    fm.reply('GET /admin/cooks/pending', { status: 401, json: fail('Unauthenticated.') })

    renderAtCooks(fm)

    expect(await screen.findByText('صفحة تسجيل الدخول')).toBeInTheDocument()
    expect(localStorage.getItem(STORAGE_KEYS.token)).toBeNull()
    expect(localStorage.getItem(STORAGE_KEYS.profile)).toBeNull()
  })
})
