import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { screen } from '@testing-library/react'
import { renderAtWithdrawals } from '../helpers/harness'
import { installFetchMock, type FetchMock } from '../helpers/fetchMock'
import { fail, withdrawalPage } from '../helpers/fixtures'

let fm: FetchMock
beforeEach(() => {
  fm = installFetchMock()
})
afterEach(() => {
  vi.unstubAllGlobals()
  localStorage.clear()
})

describe('Withdrawals — session & access (FR-034 / FR-035)', () => {
  it('a 401 on the list call clears the session and redirects to /login', async () => {
    fm.reply('GET /admin/withdrawals?status=pending&page=1', {
      status: 401,
      json: fail('Unauthenticated.'),
    })
    renderAtWithdrawals(fm)
    expect(await screen.findByText('صفحة تسجيل الدخول')).toBeInTheDocument()
  })

  it('a non-admin never reaches /withdrawals', async () => {
    fm.reply('GET /admin/withdrawals?status=pending&page=1', { json: withdrawalPage([]) })
    renderAtWithdrawals(fm, { admin: false })
    expect(await screen.findByText('صفحة تسجيل الدخول')).toBeInTheDocument()
  })
})
