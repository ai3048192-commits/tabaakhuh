import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderAtReports } from '../helpers/harness'
import { installFetchMock, type FetchMock } from '../helpers/fetchMock'
import { fail, financialReportResponse } from '../helpers/fixtures'
import { reportMessages as M } from '../../src/reports/messages'

let fm: FetchMock
beforeEach(() => {
  fm = installFetchMock()
})
afterEach(() => {
  vi.unstubAllGlobals()
  localStorage.clear()
})

function cairoYmd(offsetDays = 0): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Africa/Cairo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date(Date.now() + offsetDays * 86_400_000))
}

const DEFAULT_KEY = `GET /admin/reports/financial?from=${cairoYmd(-30)}&to=${cairoYmd(0)}&group_by=day`

describe('Financial Reports (/admin/reports/financial)', () => {
  it('loads a report with the default 30-day range and renders KPIs + tables', async () => {
    fm.reply(DEFAULT_KEY, { json: financialReportResponse() })
    renderAtReports(fm)

    expect(await screen.findByText(M.kpiRevenue)).toBeInTheDocument()
    expect(screen.getByText(M.money(154300))).toBeInTheDocument()
    expect(screen.getByText('2026-08-10')).toBeInTheDocument()
    expect(screen.getByText('القاهرة')).toBeInTheDocument()
    expect(fm.count(DEFAULT_KEY)).toBe(1)
  })

  it('Apply with from later than to shows an inline error and sends no request', async () => {
    const user = userEvent.setup()
    fm.reply(DEFAULT_KEY, { json: financialReportResponse() })
    renderAtReports(fm)
    await screen.findByText(M.kpiRevenue)
    const before = fm.calls.length

    await user.clear(screen.getByLabelText(M.filterFrom))
    await user.type(screen.getByLabelText(M.filterFrom), '2026-09-20')
    await user.clear(screen.getByLabelText(M.filterTo))
    await user.type(screen.getByLabelText(M.filterTo), '2026-09-01')
    await user.click(screen.getByRole('button', { name: M.apply }))

    expect(await screen.findByText(M.fromAfterTo)).toBeInTheDocument()
    expect(fm.calls.length).toBe(before)
  })

  it('changing the grouping to monthly re-queries with group_by=month', async () => {
    const user = userEvent.setup()
    fm.reply(DEFAULT_KEY, { json: financialReportResponse() })
    const MONTH_KEY = `GET /admin/reports/financial?from=${cairoYmd(-30)}&to=${cairoYmd(0)}&group_by=month`
    fm.reply(MONTH_KEY, { json: financialReportResponse() })
    renderAtReports(fm)
    await screen.findByText(M.kpiRevenue)

    await user.selectOptions(screen.getByLabelText(M.groupBy), 'month')
    await user.click(screen.getByRole('button', { name: M.apply }))
    await vi.waitFor(() => expect(fm.count(MONTH_KEY)).toBe(1))
  })

  it('an offline first load shows a screen error + Retry', async () => {
    const user = userEvent.setup()
    fm.reply(DEFAULT_KEY, { networkError: true }, { json: financialReportResponse() })
    renderAtReports(fm)
    expect(await screen.findByText(M.listError)).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: M.retry }))
    expect(await screen.findByText(M.kpiRevenue)).toBeInTheDocument()
  })

  it('a non-admin never reaches /reports', async () => {
    fm.reply(DEFAULT_KEY, { status: 401, json: fail('Unauthenticated.') })
    renderAtReports(fm, { admin: false })
    expect(await screen.findByText('صفحة تسجيل الدخول')).toBeInTheDocument()
  })
})
