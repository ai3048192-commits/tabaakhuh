import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderAtDeposits } from '../helpers/harness'
import { installFetchMock, type FetchMock } from '../helpers/fetchMock'
import { ok } from '../helpers/fixtures'
import { depositMessages as M } from '../../src/deposits/messages'
import type { Deposit, DepositInfo, DepositPage } from '../../src/deposits/types'

function deposit(over: Partial<DepositInfo> = {}, item: Partial<Deposit> = {}): Deposit {
  return {
    deposit: {
      id: 3,
      order_id: 10,
      amount: 200,
      percentage: 20,
      status: 'submitted',
      method: 'vodafone_cash',
      rejection_reason: null,
      reject_count: 0,
      proof_image_url: 'https://res.cloudinary.com/x/proof.jpg',
      submitted_at: '2026-10-08T10:00:00+00:00',
      confirmed_at: null,
      cook_name: 'مطبخ سوسن',
      pay_to: { vodafone_cash: '01022222222', instapay: 'sosan@instapay' },
      ...over,
    },
    order_number: 'TBK-2026-000010',
    order_status: 'accepted',
    order_subtotal: 1000,
    order_total: 1050,
    customer_name: 'منى',
    customer_phone: '01011111111',
    cook_name: 'مطبخ سوسن',
    cook_phone: '01033333333',
    ...item,
  }
}

function page(items: Deposit[], counts: DepositPage['counts'] = {}, confirmed_total = 0) {
  return ok<DepositPage>({ items, page: 1, per_page: 20, total: items.length, counts, confirmed_total })
}

let fm: FetchMock
beforeEach(() => {
  fm = installFetchMock()
})
afterEach(() => {
  vi.unstubAllGlobals()
  localStorage.clear()
})

const LIST = 'GET /admin/deposits?page=1'

describe('deposits monitoring', () => {
  it('lists each deposit as one compact row, and opens the full details on tap — no tabs, no actions', async () => {
    fm.reply(LIST, { json: page([deposit()], { submitted: 1 }) })
    renderAtDeposits(fm)

    // Closed: order, amount, who → whom, method and status only.
    const row = await screen.findByRole('button', { name: /طلب TBK-2026-000010/ })
    expect(row).toHaveAttribute('aria-expanded', 'false')
    expect(within(row).getByText('طلب TBK-2026-000010')).toBeInTheDocument()
    expect(within(row).getByText(/منى/)).toBeInTheDocument()
    expect(within(row).getByText(M.method.vodafone_cash)).toBeInTheDocument()
    expect(screen.queryByText('01022222222')).toBeNull()
    expect(screen.queryByRole('img', { name: M.proofAlt('TBK-2026-000010') })).toBeNull()

    // Open: the proof, both phones, the account it was sent to, and the share of the price.
    await userEvent.setup().click(row)
    expect(row).toHaveAttribute('aria-expanded', 'true')
    expect(screen.getByText('01022222222')).toBeInTheDocument()
    expect(screen.getByText('sosan@instapay')).toBeInTheDocument()
    expect(screen.getByRole('img', { name: M.proofAlt('TBK-2026-000010') })).toBeInTheDocument()
    expect(screen.getByText(M.ofSubtotal(20))).toBeInTheDocument()
    expect(screen.queryByText(/undefined/)).toBeNull()

    expect(screen.queryByRole('button', { name: /تأكيد الاستلام|رفض|تم التحويل/ })).toBeNull()
    // No filter categories: one list, asked for without a status.
    expect(screen.queryByRole('group', { name: M.pageTitle })).toBeNull()
    expect(fm.count(LIST)).toBe(1)
  })

  it('shows deposits in every state together, each with its own status, and flags a dispute while closed', async () => {
    fm.reply(LIST, {
      json: page([
        deposit({ id: 1, status: 'submitted' }, { order_number: 'TBK-2026-000001' }),
        deposit({ id: 2, status: 'confirmed', confirmed_at: '2026-10-08T12:00:00+00:00' }, { order_number: 'TBK-2026-000002' }),
        deposit({ id: 3, status: 'rejected', reject_count: 2, rejection_reason: 'المبلغ مش واصل' }, { order_number: 'TBK-2026-000003' }),
      ]),
    })
    renderAtDeposits(fm)

    expect(await screen.findByText('طلب TBK-2026-000001')).toBeInTheDocument()
    expect(screen.getByText('طلب TBK-2026-000002')).toBeInTheDocument()
    expect(screen.getByText('طلب TBK-2026-000003')).toBeInTheDocument()
    // The dispute is visible without opening the row.
    expect(screen.getByText(M.disputed)).toBeInTheDocument()
    expect(screen.queryByText('المبلغ مش واصل')).toBeNull()

    const user = userEvent.setup()
    await user.click(screen.getByRole('button', { name: /طلب TBK-2026-000002/ }))
    expect(screen.getByText(new RegExp(M.confirmedAt))).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: /طلب TBK-2026-000003/ }))
    expect(screen.getByText('المبلغ مش واصل')).toBeInTheDocument()
    expect(screen.getByText(M.rejectCount(2))).toBeInTheDocument()
  })

  it('shows the confirmed total and count', async () => {
    fm.reply(LIST, { json: page([deposit()], { submitted: 1, confirmed: 4 }, 800) })
    renderAtDeposits(fm)

    expect(await screen.findByText(M.summaryCount(4))).toBeInTheDocument()
    expect(screen.getByRole('region', { name: M.summaryTitle })).toHaveTextContent('800')
  })

  it('says so when no customer has sent a deposit yet', async () => {
    fm.reply(LIST, { json: page([]) })
    renderAtDeposits(fm)

    expect(await screen.findByText(M.empty)).toBeInTheDocument()
  })
})
