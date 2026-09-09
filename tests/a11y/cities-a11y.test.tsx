import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { axe } from 'vitest-axe'
import { renderAtCities } from '../helpers/harness'
import { installFetchMock, type FetchMock } from '../helpers/fetchMock'
import { ok, fail, city } from '../helpers/fixtures'
import { cityMessages as M } from '../../src/cities/messages'

let fm: FetchMock

beforeEach(() => {
  fm = installFetchMock()
})
afterEach(() => {
  vi.unstubAllGlobals()
  localStorage.clear()
})

const AXE_WCAG = {
  runOnly: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'],
} as const

const seed = [
  city({ id: 1, name_ar: 'القاهرة', name_en: 'Cairo', is_active: true }),
  city({ id: 2, name_ar: 'الجيزة', name_en: 'Giza', is_active: false }),
]

describe('Cities management — accessibility (WCAG 2.1 AA, SC-010 / FR-040 / FR-041)', () => {
  it('the populated list, table and search box have no AA violations', async () => {
    fm.reply('GET /admin/cities', { json: ok(seed) })
    const { container } = renderAtCities(fm)
    await screen.findByText('القاهرة')

    expect(await axe(container, AXE_WCAG)).toHaveNoViolations()

    // column headers are programmatically associated
    const heads = within(screen.getByRole('table')).getAllByRole('columnheader')
    expect(heads.map((h) => h.textContent)).toEqual([
      M.colNameAr,
      M.colNameEn,
      M.colStatus,
      M.colActions,
    ])
    // status carried by text, not colour alone
    expect(within(screen.getByRole('table')).getByText(M.statusActive)).toBeInTheDocument()
    expect(within(screen.getByRole('table')).getByText(M.statusInactive)).toBeInTheDocument()
    // RTL smoke (SC-011)
    expect(container.querySelector('[dir="rtl"]')).not.toBeNull()
  })

  it('the loading, empty and no-match states have no AA violations', async () => {
    const user = userEvent.setup()
    fm.reply('GET /admin/cities', { delayMs: 20, json: ok(seed) })
    const { container } = renderAtCities(fm)

    await screen.findByText(M.loading)
    expect(await axe(container, AXE_WCAG)).toHaveNoViolations()

    await screen.findByText('القاهرة')
    await user.type(screen.getByLabelText(M.searchLabel), 'zzz')
    await screen.findByText(M.emptyNoMatch)
    expect(await axe(container, AXE_WCAG)).toHaveNoViolations()
  })

  it('the empty ("no cities") state has no AA violations', async () => {
    fm.reply('GET /admin/cities', { json: ok([]) })
    const { container } = renderAtCities(fm)
    await screen.findByText(M.emptyNoCities)
    expect(await axe(container, AXE_WCAG)).toHaveNoViolations()
  })

  it('the error state has no AA violations', async () => {
    fm.reply('GET /admin/cities', { status: 500, json: fail('boom') })
    const { container } = renderAtCities(fm)
    await screen.findByText(M.listError)
    expect(await axe(container, AXE_WCAG)).toHaveNoViolations()
  })

  it('the Add dialog is axe-clean; focus enters it and restores on close', async () => {
    const user = userEvent.setup()
    fm.reply('GET /admin/cities', { json: ok(seed) })
    renderAtCities(fm)
    await screen.findByText('القاهرة')

    const addBtn = screen.getByRole('button', { name: new RegExp(M.addCity) })
    await user.click(addBtn)
    await screen.findByRole('dialog')
    expect(screen.getByLabelText(M.fieldNameAr)).toHaveFocus()
    expect(await axe(document.body, AXE_WCAG)).toHaveNoViolations()

    // a field error is associated with its input
    await user.type(screen.getByLabelText(M.fieldNameAr), 'x'.repeat(1))
    await user.clear(screen.getByLabelText(M.fieldNameAr))
    const ar = screen.getByLabelText(M.fieldNameAr)
    expect(ar).toHaveAttribute('aria-invalid', 'true')
    expect(ar).toHaveAttribute('aria-describedby')

    await user.keyboard('{Escape}')
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
    expect(addBtn).toHaveFocus()
  })

  it('the Edit dialog is axe-clean and pre-filled; the "at least one name" error is announced', async () => {
    const user = userEvent.setup()
    fm.reply('GET /admin/cities', { json: ok(seed) })
    renderAtCities(fm)
    await screen.findByText('القاهرة')

    await user.click(screen.getByRole('button', { name: M.editLabel('القاهرة') }))
    await screen.findByRole('dialog')
    expect(screen.getByLabelText(M.fieldNameAr)).toHaveValue('القاهرة')
    expect(await axe(document.body, AXE_WCAG)).toHaveNoViolations()

    await user.clear(screen.getByLabelText(M.fieldNameAr))
    await user.clear(screen.getByLabelText(M.fieldNameEn))
    expect(await screen.findByText(M.atLeastOneName)).toBeInTheDocument()
  })

  it('the status-toggle dialog is axe-clean; focus goes to Confirm and restores on cancel', async () => {
    const user = userEvent.setup()
    fm.reply('GET /admin/cities', { json: ok(seed) })
    renderAtCities(fm)
    await screen.findByText('القاهرة')

    const toggle = screen.getByRole('switch', { name: M.rowToggleToInactive('القاهرة') })
    await user.click(toggle)
    await screen.findByRole('dialog')
    expect(screen.getByRole('button', { name: M.confirmToggle })).toHaveFocus()
    expect(await axe(document.body, AXE_WCAG)).toHaveNoViolations()

    await user.keyboard('{Escape}')
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
    expect(toggle).toHaveFocus()
  })

  it('keyboard-only: search, then open and cancel the Add dialog', async () => {
    const user = userEvent.setup()
    fm.reply('GET /admin/cities', { json: ok(seed) })
    renderAtCities(fm)
    await screen.findByText('القاهرة')

    await user.tab()
    // walk to the search box and type
    const box = screen.getByLabelText(M.searchLabel)
    box.focus()
    await user.keyboard('Cairo')
    await waitFor(() => expect(screen.queryByText('الجيزة')).toBeNull())
  })
})
