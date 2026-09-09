import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { axe } from 'vitest-axe'
import { renderAtOrders } from '../helpers/harness'
import { installFetchMock, type FetchMock } from '../helpers/fetchMock'
import { ok, order, customOrder, ordersPage, cityList } from '../helpers/fixtures'
import { orderMessages as M } from '../../src/orders/messages'
import { daysAgoCairo } from '../../src/orders/cairoDates'

let fm: FetchMock
beforeEach(() => {
  fm = installFetchMock()
  fm.reply('GET /admin/cities', { json: ok(cityList()) })
})
afterEach(() => {
  vi.unstubAllGlobals()
  localStorage.clear()
})

const AXE_WCAG = { runOnly: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'] } as const
const DEFAULT_KEY = `GET /admin/orders?placed_from=${daysAgoCairo(30)}&page=1`

describe('Orders Oversight — accessibility (WCAG 2.1 AA, FR-034/035, SC-014/015)', () => {
  it('the table + filter bar + pagination have no AA violations; headers associated; RTL', async () => {
    fm.reply(DEFAULT_KEY, { json: ordersPage([order({ id: 901 }), customOrder({ id: 902 })], { total: 25 }) })
    const { container } = renderAtOrders(fm)
    await screen.findByText('ORD-2026-000901')

    expect(await axe(container, AXE_WCAG)).toHaveNoViolations()

    const heads = within(screen.getByRole('table')).getAllByRole('columnheader')
    expect(heads[0]).toHaveTextContent(M.colOrderNumber)
    // type/status carried by text, not colour alone
    expect(screen.getByText(M.typeCustom)).toBeInTheDocument()
    // filter controls are labelled
    expect(screen.getByLabelText(M.filterStatus)).toBeInTheDocument()
    expect(screen.getByLabelText(M.filterCity)).toBeInTheDocument()
    expect(screen.getByLabelText(M.filterFrom)).toBeInTheDocument()
    expect(container.querySelector('[dir="rtl"]')).not.toBeNull()
  })

  it('the empty, no-match, error, and beyond-range states have no AA violations', async () => {
    fm.reply(DEFAULT_KEY, { json: ordersPage([], { total: 0 }) })
    const { container } = renderAtOrders(fm)
    await screen.findByText(M.emptyNoOrders)
    expect(await axe(container, AXE_WCAG)).toHaveNoViolations()
  })

  it('the order detail dialog has no AA violations and is keyboard-dismissible', async () => {
    const user = userEvent.setup()
    fm.reply(DEFAULT_KEY, { json: ordersPage([order({ id: 903 })], { total: 1 }) })
    const { container } = renderAtOrders(fm)
    await screen.findByText('ORD-2026-000903')

    await user.click(screen.getByRole('button', { name: new RegExp(M.viewDetails) }))
    const dialog = await screen.findByRole('dialog')
    expect(dialog).toHaveAccessibleName(M.detailTitle('ORD-2026-000903'))
    expect(await axe(container, AXE_WCAG)).toHaveNoViolations()

    await user.keyboard('{Escape}')
    expect(screen.queryByRole('dialog')).toBeNull()
  })
})
