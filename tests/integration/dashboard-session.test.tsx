import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { screen } from '@testing-library/react'
import { renderAtDashboard } from '../helpers/harness'
import { installFetchMock, type FetchMock } from '../helpers/fetchMock'
import { fail } from '../helpers/fixtures'
import { STORAGE_KEYS } from '../../src/auth/authStorage'
import { overviewMessages as M } from '../../src/overview/messages'

let fm: FetchMock

beforeEach(() => {
  fm = installFetchMock()
})
afterEach(() => {
  vi.unstubAllGlobals()
  localStorage.clear()
})

const KEY = 'GET /admin/reports/overview'

describe('Dashboard overview — session & access (FR-001, SC-007)', () => {
  it('a 401 on the initial load ends the session and redirects to /login', async () => {
    fm.reply(KEY, { status: 401, json: fail('Unauthenticated.') })
    renderAtDashboard(fm)

    expect(await screen.findByText('صفحة تسجيل الدخول')).toBeInTheDocument()
    expect(localStorage.getItem(STORAGE_KEYS.token)).toBeNull()
    expect(localStorage.getItem(STORAGE_KEYS.profile)).toBeNull()
    expect(screen.queryByRole('heading', { name: M.kpiUsers })).toBeNull()
  })

  it('a signed-in non-admin never reaches /dashboard', async () => {
    renderAtDashboard(fm, { admin: false })

    expect(await screen.findByText('صفحة تسجيل الدخول')).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: M.pageTitle })).toBeNull()
    expect(fm.count(KEY)).toBe(0)
  })
})
