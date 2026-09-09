import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { screen, within, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderAtWithdrawals } from '../helpers/harness'
import { installFetchMock, type FetchMock } from '../helpers/fetchMock'
import { fail, withdrawal, withdrawalPage, decidedWithdrawal } from '../helpers/fixtures'
import { withdrawalMessages as M } from '../../src/withdrawals/messages'

let fm: FetchMock
beforeEach(() => {
  fm = installFetchMock()
})
afterEach(() => {
  vi.unstubAllGlobals()
  localStorage.clear()
})

const APPROVED_LIST = 'GET /admin/withdrawals?status=approved&page=1'
const MARK_PAID = 'POST /admin/withdrawals/45/mark-paid'

async function openApprovedFilter(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByRole('button', { name: M.filterApproved }))
}

describe('US4 — mark an approved withdrawal as paid', () => {
  it('Mark Paid shows only on approved rows', async () => {
    const user = userEvent.setup()
    fm.reply('GET /admin/withdrawals?status=pending&page=1', {
      json: withdrawalPage([withdrawal({ id: 1, status: 'pending' })], { total: 1 }),
    })
    fm.reply(APPROVED_LIST, {
      json: withdrawalPage([withdrawal({ id: 45, status: 'approved' })], { total: 1 }),
    })
    renderAtWithdrawals(fm)
    await screen.findByText('1')
    await openApprovedFilter(user)

    await screen.findByText('45')
    expect(screen.getByRole('button', { name: M.actionMarkPaid })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: M.actionApprove })).toBeNull()
  })

  it('confirm → one no-body POST, re-fetch, row paid, success toast', async () => {
    const user = userEvent.setup()
    fm.reply('GET /admin/withdrawals?status=pending&page=1', {
      json: withdrawalPage([withdrawal({ id: 1 })], { total: 1 }),
    })
    fm.reply(
      APPROVED_LIST,
      { json: withdrawalPage([withdrawal({ id: 45, status: 'approved' })], { total: 1 }) },
      { json: withdrawalPage([withdrawal({ id: 45, status: 'paid' })], { total: 1 }) },
    )
    fm.reply(MARK_PAID, { json: decidedWithdrawal('paid', 'Withdrawal request marked paid.') })
    renderAtWithdrawals(fm)
    await screen.findByText('1')
    await openApprovedFilter(user)
    await screen.findByText('45')

    await user.click(screen.getByRole('button', { name: M.actionMarkPaid }))
    await user.click(screen.getByRole('button', { name: M.confirmMarkPaidCta }))

    await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent(M.markPaidDoneToast))
    expect(fm.count(MARK_PAID)).toBe(1)
    expect(fm.lastCall(MARK_PAID)?.body).toBeUndefined()
    expect(within(screen.getByText('45').closest('tr')!).getByText(M.statusPaid)).toBeInTheDocument()
  })

  it('422 "not in approved status" → envelope message toast + re-fetch', async () => {
    const user = userEvent.setup()
    fm.reply('GET /admin/withdrawals?status=pending&page=1', {
      json: withdrawalPage([withdrawal({ id: 1 })], { total: 1 }),
    })
    fm.reply(
      APPROVED_LIST,
      { json: withdrawalPage([withdrawal({ id: 45, status: 'approved' })], { total: 1 }) },
      { json: withdrawalPage([withdrawal({ id: 45, status: 'paid' })], { total: 1 }) },
    )
    fm.reply(MARK_PAID, { status: 422, json: fail('request is not in approved status') })
    renderAtWithdrawals(fm)
    await screen.findByText('1')
    await openApprovedFilter(user)
    await screen.findByText('45')

    await user.click(screen.getByRole('button', { name: M.actionMarkPaid }))
    await user.click(screen.getByRole('button', { name: M.confirmMarkPaidCta }))

    await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent('request is not in approved status'))
    expect(fm.count(APPROVED_LIST)).toBe(2)
  })
})
