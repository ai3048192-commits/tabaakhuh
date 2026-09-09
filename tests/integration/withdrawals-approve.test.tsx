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

const LIST = 'GET /admin/withdrawals?status=pending&page=1'
const APPROVE = 'POST /admin/withdrawals/45/approve'

describe('US2 — approve a pending withdrawal', () => {
  it('Approve shows only on pending rows', async () => {
    fm.reply(LIST, {
      json: withdrawalPage([withdrawal({ id: 45, status: 'pending' })], { total: 1 }),
    })
    renderAtWithdrawals(fm)
    await screen.findByText('45')
    expect(screen.getByRole('button', { name: M.actionApprove })).toBeInTheDocument()
  })

  it('cancelling the confirm dialog sends zero requests', async () => {
    const user = userEvent.setup()
    fm.reply(LIST, { json: withdrawalPage([withdrawal({ id: 45 })], { total: 1 }) })
    renderAtWithdrawals(fm)
    await screen.findByText('45')

    await user.click(screen.getByRole('button', { name: M.actionApprove }))
    await screen.findByRole('dialog')
    await user.click(screen.getByRole('button', { name: M.cancel }))
    expect(screen.queryByRole('dialog')).toBeNull()
    expect(fm.count(APPROVE)).toBe(0)
  })

  it('confirm → one no-body POST, re-fetch, row approved, success toast', async () => {
    const user = userEvent.setup()
    fm.reply(
      LIST,
      { json: withdrawalPage([withdrawal({ id: 45, status: 'pending' })], { total: 1 }) },
      { json: withdrawalPage([withdrawal({ id: 45, status: 'approved', processed_at: '2026-09-06T10:00:00+00:00' })], { total: 1 }) },
    )
    fm.reply(APPROVE, { json: decidedWithdrawal('approved', 'Withdrawal request approved.') })
    renderAtWithdrawals(fm)
    await screen.findByText('45')

    await user.click(screen.getByRole('button', { name: M.actionApprove }))
    await user.click(screen.getByRole('button', { name: M.confirmApproveCta }))

    await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent(M.approveDoneToast))
    expect(fm.count(APPROVE)).toBe(1)
    expect(fm.lastCall(APPROVE)?.body).toBeUndefined()
    expect(fm.lastCall(APPROVE)?.authorization).toBeTruthy()
    expect(fm.count(LIST)).toBe(2) // initial + post-action re-fetch
    expect(within(screen.getByText('45').closest('tr')!).getByText(M.statusApproved)).toBeInTheDocument()
  })

  it('422 → toast = envelope message + re-fetch, no false success', async () => {
    const user = userEvent.setup()
    fm.reply(
      LIST,
      { json: withdrawalPage([withdrawal({ id: 45, status: 'pending' })], { total: 1 }) },
      { json: withdrawalPage([withdrawal({ id: 45, status: 'approved' })], { total: 1 }) },
    )
    fm.reply(APPROVE, { status: 422, json: fail('current status does not allow this transition') })
    renderAtWithdrawals(fm)
    await screen.findByText('45')

    await user.click(screen.getByRole('button', { name: M.actionApprove }))
    await user.click(screen.getByRole('button', { name: M.confirmApproveCta }))

    await waitFor(() =>
      expect(screen.getByRole('status')).toHaveTextContent('current status does not allow this transition'),
    )
    expect(fm.count(LIST)).toBe(2)
  })

  it('404 → notFoundToast + re-fetch; 500 → row unchanged + retry toast, no re-fetch', async () => {
    const user = userEvent.setup()
    fm.reply(LIST, { json: withdrawalPage([withdrawal({ id: 45, status: 'pending' })], { total: 1 }) })
    fm.reply(APPROVE, { status: 500, json: fail('Something went wrong. Please try again.') })
    renderAtWithdrawals(fm)
    await screen.findByText('45')

    await user.click(screen.getByRole('button', { name: M.actionApprove }))
    await user.click(screen.getByRole('button', { name: M.confirmApproveCta }))

    await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent(M.actionRetryToast))
    expect(fm.count(LIST)).toBe(1) // no re-fetch on transient
    expect(
      within(screen.getByText('45').closest('tr')!).getByText(M.statusPending),
    ).toBeInTheDocument()
  })
})
