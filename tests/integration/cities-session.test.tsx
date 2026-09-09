import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { screen } from '@testing-library/react'
import { renderAtCities } from '../helpers/harness'
import { installFetchMock, type FetchMock } from '../helpers/fetchMock'
import { ok, fail, city } from '../helpers/fixtures'
import { cityMessages as M } from '../../src/cities/messages'

let fm: FetchMock

beforeEach(() => {
  fm = installFetchMock()
})
afterEach(() => {
  vi.unstubAllGlobals()
  localStorage.clear()
})

describe('Cities — session & access (FR-035 / FR-036)', () => {
  it('FR-035: a 401 on the list ends the session and redirects to /login', async () => {
    fm.reply('GET /admin/cities', { status: 401, json: fail('Unauthenticated.') })
    renderAtCities(fm)

    expect(await screen.findByText('صفحة تسجيل الدخول')).toBeInTheDocument()
    expect(screen.queryByText(M.pageTitle)).toBeNull()
  })

  it('FR-036: a signed-in non-admin never reaches /cities', async () => {
    fm.reply('GET /admin/cities', { json: ok([city({ id: 1 })]) })
    renderAtCities(fm, { admin: false })

    expect(await screen.findByText('صفحة تسجيل الدخول')).toBeInTheDocument()
    expect(screen.queryByText(M.pageTitle)).toBeNull()
  })
})
