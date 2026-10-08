import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { screen, within, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderAtDeposits } from '../helpers/harness'
import { installFetchMock, type FetchMock } from '../helpers/fetchMock'
import { fail, ok } from '../helpers/fixtures'
import { depositMessages as M } from '../../src/deposits/messages'
import type { Deposit, DepositPage } from '../../src/deposits/types'

function deposit(over: Partial<Deposit> = {}): Deposit {
  return {
    id: 3,
    order_id: 10,
    order_number: 'TBK-2026-000010',
    order_status: 'accepted',
    order_subtotal: 1000,
    order_total: 1050,
    amount: 200,
    percentage: 20,
    status: 'submitted',
    method: 'vodafone_cash',
    rejection_reason: null,
    proof_image_url: 'https://res.cloudinary.com/x/proof.jpg',
    payout_note: null,
    submitted_at: '2026-10-08T10:00:00+00:00',
    verified_at: null,
    paid_to_cook_at: null,
    customer: { name: 'منى', phone: '01011111111' },
    cook: { name: 'مطبخ سوسن', phone: '01022222222' },
    ...over,
  }
}

function page(items: Deposit[], counts: DepositPage['counts'] = {}) {
  return ok<DepositPage>({ items, page: 1, per_page: 20, total: items.length, counts })
}

let fm: FetchMock
beforeEach(() => {
  fm = installFetchMock()
})
afterEach(() => {
  vi.unstubAllGlobals()
  localStorage.clear()
})

const LIST = 'GET /admin/deposits?status=submitted&page=1'

describe('deposits queue', () => {
  it('opens on the transfers awaiting review, with the proof and both parties', async () => {
    fm.reply(LIST, { json: page([deposit()], { submitted: 1 }) })
    renderAtDeposits(fm)

    expect(await screen.findByText('طلب TBK-2026-000010')).toBeInTheDocument()
    expect(screen.getByText('منى')).toBeInTheDocument()
    expect(screen.getByText('مطبخ سوسن')).toBeInTheDocument()
    expect(screen.getByText(M.method.vodafone_cash)).toBeInTheDocument()
    expect(screen.getByRole('img', { name: M.proofAlt('TBK-2026-000010') })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: M.actionVerify })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: M.actionMarkPaid })).toBeNull()
  })

  it('verify → one POST, the list reloads', async () => {
    const user = userEvent.setup()
    fm.reply(LIST, { json: page([deposit()]) }, { json: page([]) })
    fm.reply('POST /admin/deposits/3/verify', { json: ok(deposit({ status: 'verified' })) })
    renderAtDeposits(fm)
    await screen.findByText('طلب TBK-2026-000010')

    await user.click(screen.getByRole('button', { name: M.actionVerify }))
    await user.click(within(await screen.findByRole('dialog')).getByRole('button', { name: M.dialog.verify.cta }))

    await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent(M.doneToast.verify))
    expect(fm.count('POST /admin/deposits/3/verify')).toBe(1)
    expect(await screen.findByText(M.emptyFor('submitted'))).toBeInTheDocument()
  })

  it('reject needs a reason, and sends it', async () => {
    const user = userEvent.setup()
    fm.reply(LIST, { json: page([deposit()]) })
    fm.reply('POST /admin/deposits/3/reject', { json: ok(deposit({ status: 'rejected' })) })
    renderAtDeposits(fm)
    await screen.findByText('طلب TBK-2026-000010')

    await user.click(screen.getByRole('button', { name: M.actionReject }))
    const dialog = await screen.findByRole('dialog')
    await user.click(within(dialog).getByRole('button', { name: M.dialog.reject.cta }))
    expect(within(dialog).getByText(M.reasonTooShort)).toBeInTheDocument()
    expect(fm.count('POST /admin/deposits/3/reject')).toBe(0)

    await user.type(within(dialog).getByRole('textbox'), 'المبلغ ناقص')
    await user.click(within(dialog).getByRole('button', { name: M.dialog.reject.cta }))

    await waitFor(() => expect(fm.count('POST /admin/deposits/3/reject')).toBe(1))
    expect(fm.lastCall('POST /admin/deposits/3/reject')?.body).toEqual({ reason: 'المبلغ ناقص' })
  })

  it('a verified deposit offers the payout, with the note sent along', async () => {
    const user = userEvent.setup()
    fm.reply('GET /admin/deposits?status=verified&page=1', { json: page([deposit({ status: 'verified' })]) })
    fm.reply(LIST, { json: page([]) })
    fm.reply('POST /admin/deposits/3/mark-paid', { json: ok(deposit({ status: 'paid_to_cook' })) })
    renderAtDeposits(fm)
    await screen.findByText(M.emptyFor('submitted'))

    await user.click(screen.getByRole('button', { name: M.filters.verified }))
    await user.click(await screen.findByRole('button', { name: M.actionMarkPaid }))
    const dialog = await screen.findByRole('dialog')
    expect(within(dialog).getByText(/01022222222/)).toBeInTheDocument()
    await user.type(within(dialog).getByRole('textbox'), 'ref 991')
    await user.click(within(dialog).getByRole('button', { name: M.dialog.mark_paid.cta }))

    await waitFor(() => expect(fm.count('POST /admin/deposits/3/mark-paid')).toBe(1))
    expect(fm.lastCall('POST /admin/deposits/3/mark-paid')?.body).toEqual({ note: 'ref 991' })
  })

  it('a cancelled order is flagged for refund and never offers the payout', async () => {
    const user = userEvent.setup()
    fm.reply('GET /admin/deposits?status=verified&page=1', {
      json: page([deposit({ status: 'verified', order_status: 'cancelled' })]),
    })
    fm.reply(LIST, { json: page([]) })
    renderAtDeposits(fm)
    await screen.findByText(M.emptyFor('submitted'))

    await user.click(screen.getByRole('button', { name: M.filters.verified }))
    expect(await screen.findByText(M.orderCancelled)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: M.actionMarkPaid })).toBeNull()
  })

  it('a 409 shows the server message and reloads', async () => {
    const user = userEvent.setup()
    fm.reply(LIST, { json: page([deposit()]) })
    fm.reply('POST /admin/deposits/3/verify', { status: 409, json: fail('العربون ده اتحدّث حالًا، حدّث الصفحة.') })
    renderAtDeposits(fm)
    await screen.findByText('طلب TBK-2026-000010')

    await user.click(screen.getByRole('button', { name: M.actionVerify }))
    await user.click(within(await screen.findByRole('dialog')).getByRole('button', { name: M.dialog.verify.cta }))

    await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent('العربون ده اتحدّث حالًا'))
    expect(fm.count(LIST)).toBe(2)
  })
})
