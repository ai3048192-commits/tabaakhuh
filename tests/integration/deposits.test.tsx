import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { screen } from '@testing-library/react'
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
      percent: 20,
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

const LIST = 'GET /admin/deposits?status=submitted&page=1'

describe('deposits monitoring', () => {
  it('opens on deposits awaiting the cook, with proof, parties and the account paid to — and no actions', async () => {
    fm.reply(LIST, { json: page([deposit()], { submitted: 1 }) })
    renderAtDeposits(fm)

    expect(await screen.findByText('طلب TBK-2026-000010')).toBeInTheDocument()
    expect(screen.getByText('منى')).toBeInTheDocument()
    expect(screen.getAllByText('مطبخ سوسن').length).toBeGreaterThan(0)
    expect(screen.getByText(M.method.vodafone_cash)).toBeInTheDocument()
    expect(screen.getByText('01022222222')).toBeInTheDocument()
    expect(screen.getByText('sosan@instapay')).toBeInTheDocument()
    expect(screen.getByRole('img', { name: M.proofAlt('TBK-2026-000010') })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /تأكيد الاستلام|رفض|تم التحويل/ })).toBeNull()
  })

  it('shows the confirmed total and count, and tab badges from counts', async () => {
    fm.reply(LIST, { json: page([deposit()], { submitted: 1, confirmed: 4, disputed: 2 }, 800) })
    renderAtDeposits(fm)

    expect(await screen.findByText(M.summaryCount(4))).toBeInTheDocument()
    expect(screen.getByRole('region', { name: M.summaryTitle })).toHaveTextContent('800')
    expect(screen.getByRole('button', { name: new RegExp(`${M.filters.disputed}\\s*2`) })).toBeInTheDocument()
  })

  it('the disputed tab queries disputed=1 and shows reject count and reason', async () => {
    const user = userEvent.setup()
    fm.reply(LIST, { json: page([]) })
    fm.reply('GET /admin/deposits?disputed=1&page=1', {
      json: page([deposit({ status: 'rejected', reject_count: 2, rejection_reason: 'المبلغ مش واصل' })]),
    })
    renderAtDeposits(fm)
    await screen.findByText(M.emptyFor('submitted'))

    await user.click(screen.getByRole('button', { name: M.filters.disputed }))
    expect(await screen.findByText('المبلغ مش واصل')).toBeInTheDocument()
    expect(screen.getByText(M.rejectCount(2))).toBeInTheDocument()
    expect(fm.count('GET /admin/deposits?disputed=1&page=1')).toBe(1)
  })

  it('a confirmed deposit shows when it was confirmed', async () => {
    const user = userEvent.setup()
    fm.reply(LIST, { json: page([]) })
    fm.reply('GET /admin/deposits?status=confirmed&page=1', {
      json: page([deposit({ status: 'confirmed', confirmed_at: '2026-10-08T12:00:00+00:00' })]),
    })
    renderAtDeposits(fm)
    await screen.findByText(M.emptyFor('submitted'))

    await user.click(screen.getByRole('button', { name: M.filters.confirmed }))
    expect(await screen.findByText(new RegExp(M.confirmedAt))).toBeInTheDocument()
  })
})
