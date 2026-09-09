import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { screen, within, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderAtWithdrawals } from '../helpers/harness'
import { installFetchMock, type FetchMock } from '../helpers/fetchMock'
import { withdrawal, withdrawalPage, decidedWithdrawal } from '../helpers/fixtures'
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
const REJECT = 'POST /admin/withdrawals/45/reject'

describe('US3 — reject a pending withdrawal (no reason field)', () => {
  it('the confirm dialog has no text input; cancel sends nothing', async () => {
    const user = userEvent.setup()
    fm.reply(LIST, { json: withdrawalPage([withdrawal({ id: 45, status: 'pending' })], { total: 1 }) })
    renderAtWithdrawals(fm)
    await screen.findByText('45')

    await user.click(screen.getByRole('button', { name: M.actionReject }))
    const dialog = await screen.findByRole('dialog')
    expect(within(dialog).queryByRole('textbox')).toBeNull()
    expect(dialog.querySelector('textarea, input')).toBeNull()

    await user.keyboard('{Escape}')
    expect(fm.count(REJECT)).toBe(0)
  })

  it('confirm → one no-body POST, re-fetch, row rejected, success toast', async () => {
    const user = userEvent.setup()
    fm.reply(
      LIST,
      { json: withdrawalPage([withdrawal({ id: 45, status: 'pending' })], { total: 1 }) },
      { json: withdrawalPage([withdrawal({ id: 45, status: 'rejected', processed_at: '2026-09-06T10:00:00+00:00' })], { total: 1 }) },
    )
    fm.reply(REJECT, { json: decidedWithdrawal('rejected', 'Withdrawal request rejected.') })
    renderAtWithdrawals(fm)
    await screen.findByText('45')

    await user.click(screen.getByRole('button', { name: M.actionReject }))
    await user.click(screen.getByRole('button', { name: M.confirmRejectCta }))

    await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent(M.rejectDoneToast))
    expect(fm.count(REJECT)).toBe(1)
    expect(fm.lastCall(REJECT)?.body).toBeUndefined()
    expect(within(screen.getByText('45').closest('tr')!).getByText(M.statusRejected)).toBeInTheDocument()
  })

  it('rejected and paid rows render no action buttons', async () => {
    fm.reply(LIST, {
      json: withdrawalPage(
        [withdrawal({ id: 1, status: 'rejected' }), withdrawal({ id: 2, status: 'paid' })],
        { total: 2 },
      ),
    })
    renderAtWithdrawals(fm)
    await screen.findByText('1')
    expect(screen.queryByRole('button', { name: M.actionApprove })).toBeNull()
    expect(screen.queryByRole('button', { name: M.actionReject })).toBeNull()
    expect(screen.queryByRole('button', { name: M.actionMarkPaid })).toBeNull()
  })

  it('500 → row unchanged + retry toast, no re-fetch', async () => {
    const user = userEvent.setup()
    fm.reply(LIST, { json: withdrawalPage([withdrawal({ id: 45, status: 'pending' })], { total: 1 }) })
    fm.reply(REJECT, { networkError: true })
    renderAtWithdrawals(fm)
    await screen.findByText('45')

    await user.click(screen.getByRole('button', { name: M.actionReject }))
    await user.click(screen.getByRole('button', { name: M.confirmRejectCta }))

    await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent(M.actionRetryToast))
    expect(fm.count(LIST)).toBe(1)
  })
})
