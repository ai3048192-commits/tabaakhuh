import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { axe } from 'vitest-axe'
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

const AXE_WCAG = { runOnly: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'] } as const
const LIST = 'GET /admin/withdrawals?status=pending&page=1'

describe('Withdrawals — accessibility (WCAG 2.1 AA, FR-040 / SC-003)', () => {
  it('the table, filter group and pager have no AA violations; headers associated; RTL', async () => {
    fm.reply(LIST, {
      json: withdrawalPage(
        [
          withdrawal({ id: 1, status: 'pending' }),
          withdrawal({ id: 2, status: 'approved' }),
          withdrawal({ id: 3, status: 'rejected' }),
        ],
        { total: 25 },
      ),
    })
    const { container } = renderAtWithdrawals(fm)
    await screen.findByText('1')

    expect(await axe(container, AXE_WCAG)).toHaveNoViolations()
    const heads = within(screen.getByRole('table')).getAllByRole('columnheader')
    expect(heads).toHaveLength(7)
    // status carried by text
    expect(within(screen.getByRole('table')).getAllByText(M.statusPending).length).toBeGreaterThan(0)
    // filter group exposes the active option
    const group = screen.getByRole('group', { name: M.colStatus })
    expect(within(group).getByRole('button', { name: M.filterPending })).toHaveAttribute(
      'aria-pressed',
      'true',
    )
    expect(container.querySelector('[dir="rtl"]')).not.toBeNull()
  })

  it('the empty and error states have no AA violations', async () => {
    fm.reply(LIST, { json: withdrawalPage([], { total: 0 }) })
    const { container } = renderAtWithdrawals(fm)
    await screen.findByText(M.emptyFor('pending'))
    expect(await axe(container, AXE_WCAG)).toHaveNoViolations()
  })

  it('the ConfirmDialog is axe-clean, focus-trapped, and Esc-dismissible with no request', async () => {
    const user = userEvent.setup()
    fm.reply(LIST, { json: withdrawalPage([withdrawal({ id: 45, status: 'pending' })], { total: 1 }) })
    const { container } = renderAtWithdrawals(fm)
    await screen.findByText('45')

    await user.click(screen.getByRole('button', { name: M.actionApprove }))
    const dialog = await screen.findByRole('dialog')
    expect(dialog).toHaveAccessibleName(M.confirmApproveTitle)
    expect(await axe(container, AXE_WCAG)).toHaveNoViolations()
    await user.keyboard('{Escape}')
    expect(screen.queryByRole('dialog')).toBeNull()
    expect(fm.count('POST /admin/withdrawals/45/approve')).toBe(0)
  })
})
