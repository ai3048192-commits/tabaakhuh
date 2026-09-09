import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderAtWithdrawals } from '../helpers/harness'
import { installFetchMock, type FetchMock } from '../helpers/fetchMock'
import { withdrawal, withdrawalPage } from '../helpers/fixtures'
import { withdrawalMessages as M } from '../../src/withdrawals/messages'

let fm: FetchMock
beforeEach(() => {
  fm = installFetchMock()
})
afterEach(() => {
  vi.unstubAllGlobals()
  localStorage.clear()
})

const PENDING_P1 = 'GET /admin/withdrawals?status=pending&page=1'

describe('US1 — review the withdrawals queue', () => {
  it('AC1: first load hits ?status=pending&page=1 and renders all columns', async () => {
    fm.reply(PENDING_P1, {
      json: withdrawalPage(
        [withdrawal({ id: 45, amount: 500, payment_details: 'InstaPay: 010', processed_at: null })],
        { total: 3 },
      ),
    })
    renderAtWithdrawals(fm)

    await screen.findByText('45')
    expect(fm.count(PENDING_P1)).toBe(1)
    expect(screen.getByText('InstaPay: 010')).toBeInTheDocument()
    expect(within(screen.getByText('45').closest('tr')!).getByText(M.statusPending)).toBeInTheDocument()
    const row = screen.getByText('45').closest('tr')!
    expect(within(row).getAllByText('—').length).toBeGreaterThan(0) // processed_at null → —
  })

  it('AC2: "all" omits status; other filters send it; changing filter resets to page 1', async () => {
    const user = userEvent.setup()
    fm.reply(PENDING_P1, { json: withdrawalPage([withdrawal({ id: 1 })], { total: 25 }) })
    fm.reply('GET /admin/withdrawals?page=1', {
      json: withdrawalPage([withdrawal({ id: 2, status: 'paid' })], { total: 2 }),
    })
    fm.reply('GET /admin/withdrawals?status=approved&page=1', {
      json: withdrawalPage([withdrawal({ id: 3, status: 'approved' })], { total: 1 }),
    })
    renderAtWithdrawals(fm)
    await screen.findByText('1')

    await user.click(screen.getByRole('button', { name: M.filterAll }))
    await screen.findByText('2')
    expect(fm.count('GET /admin/withdrawals?page=1')).toBe(1)

    await user.click(screen.getByRole('button', { name: M.filterApproved }))
    await screen.findByText('3')
    expect(fm.count('GET /admin/withdrawals?status=approved&page=1')).toBe(1)
  })

  it('AC3: pager pages through the set with position + total, disabled at the ends', async () => {
    const user = userEvent.setup()
    fm.reply(PENDING_P1, { json: withdrawalPage([withdrawal({ id: 1 })], { page: 1, total: 45 }) })
    fm.reply('GET /admin/withdrawals?status=pending&page=2', {
      json: withdrawalPage([withdrawal({ id: 21 })], { page: 2, total: 45 }),
    })
    renderAtWithdrawals(fm)

    await screen.findByText(M.pagerPosition(1, 3))
    expect(screen.getByRole('button', { name: 'الصفحة السابقة' })).toBeDisabled()
    await user.click(screen.getByRole('button', { name: 'الصفحة التالية' }))
    await screen.findByText(M.pagerPosition(2, 3))
    expect(fm.count('GET /admin/withdrawals?status=pending&page=2')).toBe(1)
  })

  it('AC4/AC6: empty filter → empty state; slow reply → loading state', async () => {
    fm.reply(PENDING_P1, { delayMs: 20, json: withdrawalPage([], { total: 0 }) })
    renderAtWithdrawals(fm)
    expect(await screen.findByText(M.loading)).toBeInTheDocument()
    expect(await screen.findByText(M.emptyFor('pending'))).toBeInTheDocument()
  })

  it('FR-006: an offline first load shows a screen error + Retry', async () => {
    const user = userEvent.setup()
    fm.reply(
      PENDING_P1,
      { networkError: true },
      { json: withdrawalPage([withdrawal({ id: 9 })], { total: 1 }) },
    )
    renderAtWithdrawals(fm)
    expect(await screen.findByText(M.queueError)).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: M.retry }))
    expect(await screen.findByText('9')).toBeInTheDocument()
  })

  it('FR-016: a page that goes empty after a refresh shows "back to first page" → reloads page 1', async () => {
    const user = userEvent.setup()
    // page 1 of a 45-row set, then move to page 2, then a refresh where page 2 is now empty
    fm.reply(PENDING_P1, { json: withdrawalPage([withdrawal({ id: 1 })], { page: 1, total: 45 }) })
    fm.reply(
      'GET /admin/withdrawals?status=pending&page=2',
      { json: withdrawalPage([withdrawal({ id: 21 })], { page: 2, total: 45 }) },
      { json: withdrawalPage([], { page: 2, total: 20 }) }, // refresh: page 2 now empty
    )
    renderAtWithdrawals(fm)
    await screen.findByText('1')
    await user.click(screen.getByRole('button', { name: 'الصفحة التالية' }))
    await screen.findByText('21')

    await user.click(screen.getByRole('button', { name: M.refresh }))
    expect(await screen.findByText(M.backToFirstPage)).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: M.backToFirstPage }))
    await screen.findByText('1')
  })
})
