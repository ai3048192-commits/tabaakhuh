import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { screen } from '@testing-library/react'
import { renderAtOrders } from '../helpers/harness'
import { installFetchMock, type FetchMock } from '../helpers/fetchMock'
import { ok, fail, cityList } from '../helpers/fixtures'
import { daysAgoCairo } from '../../src/orders/cairoDates'

let fm: FetchMock
beforeEach(() => {
  fm = installFetchMock()
  fm.reply('GET /admin/cities', { json: ok(cityList()) })
})
afterEach(() => {
  vi.unstubAllGlobals()
  localStorage.clear()
})

const DEFAULT_KEY = `GET /admin/orders?placed_from=${daysAgoCairo(30)}&page=1`

describe('Orders Oversight — session & access (FR-029 / FR-030)', () => {
  it('a 401 on the list call clears the session and redirects to /login', async () => {
    fm.reply(DEFAULT_KEY, { status: 401, json: fail('Unauthenticated.') })
    renderAtOrders(fm)
    expect(await screen.findByText('صفحة تسجيل الدخول')).toBeInTheDocument()
  })

  it('a non-admin never reaches /orders', async () => {
    fm.reply(DEFAULT_KEY, { json: ok({ items: [], page: 1, per_page: 20, total: 0 }) })
    renderAtOrders(fm, { admin: false })
    expect(await screen.findByText('صفحة تسجيل الدخول')).toBeInTheDocument()
  })
})
